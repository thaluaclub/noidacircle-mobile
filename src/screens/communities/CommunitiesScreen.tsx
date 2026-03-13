import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import EmptyState from '../../components/EmptyState';
import useThemeStore from '../../store/themeStore';
import { communitiesAPI } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { colors } from '../../theme/colors';

interface Community {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  type: string;
  member_count: number;
  is_member?: boolean;
  status?: string;
}

const TYPES = ['all', 'tech', 'social', 'business', 'education', 'sports', 'other'];

export default function CommunitiesScreen() {
  const dark = useThemeStore((s) => s.dark);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [joinLoadingId, setJoinLoadingId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchText, 400);
  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const cardBg = dark ? colors.dark.card : '#f8f9fa';

  const fetchCommunities = useCallback(async (p: number = 1, refresh = false) => {
    try {
      if (p === 1) refresh ? setRefreshing(true) : setLoading(true);
      const res = await communitiesAPI.getAll(p, 20, selectedType, debouncedSearch || undefined);
      const data = res.data;
      const list: Community[] = data.communities || data;
      setCommunities(prev => p === 1 ? list : [...prev, ...list]);
      setPage(p);
      if (data.pagination) setHasMore(p < data.pagination.totalPages);
      else setHasMore(false);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedType, debouncedSearch]);

  useEffect(() => { fetchCommunities(1); }, [fetchCommunities]);

  const handleJoin = useCallback(async (community: Community) => {
    setJoinLoadingId(community.id);
    try {
      if (community.is_member) {
        await communitiesAPI.leave(community.id);
        setCommunities(prev => prev.map(c => c.id === community.id ? { ...c, is_member: false, member_count: Math.max(0, c.member_count - 1) } : c));
      } else {
        await communitiesAPI.join(community.id);
        setCommunities(prev => prev.map(c => c.id === community.id ? { ...c, is_member: true, member_count: c.member_count + 1 } : c));
      }
    } catch {} finally {
      setJoinLoadingId(null);
    }
  }, []);

  const renderItem = useCallback(({ item }: { item: Community }) => (
    <View style={[styles.communityCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.cardRow}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.communityImage} contentFit="cover" />
        ) : (
          <View style={[styles.communityImagePlaceholder, { backgroundColor: colors.primary[500] + '20' }]}>
            <Ionicons name="people" size={24} color={colors.primary[500]} />
          </View>
        )}
        <View style={styles.communityInfo}>
          <Text style={[styles.communityName, { color: textColor }]}>{item.name}</Text>
          <Text style={[styles.communityMeta, { color: mutedColor }]}>
            {item.member_count} members · {item.type}
          </Text>
          {item.description && (
            <Text style={[styles.communityDesc, { color: mutedColor }]} numberOfLines={2}>{item.description}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={() => handleJoin(item)}
        disabled={joinLoadingId === item.id}
        style={[styles.joinBtn, item.is_member ? styles.joinedBtn : styles.notJoinedBtn]}
      >
        {joinLoadingId === item.id ? (
          <ActivityIndicator size="small" color={item.is_member ? mutedColor : '#fff'} />
        ) : (
          <Text style={[styles.joinBtnText, { color: item.is_member ? mutedColor : '#fff' }]}>
            {item.is_member ? 'Joined' : 'Join'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  ), [textColor, mutedColor, borderColor, cardBg, joinLoadingId, handleJoin]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>Communities</Text>
      </View>

      <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor }]}>
        <Ionicons name="search" size={16} color={mutedColor} />
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Search communities..."
          placeholderTextColor={mutedColor}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={16} color={mutedColor} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.typesRow}>
        {TYPES.map(t => (
          <TouchableOpacity key={t} onPress={() => setSelectedType(t)} style={[styles.typeChip, { backgroundColor: selectedType === t ? colors.primary[500] : cardBg }]}>
            <Text style={[styles.typeText, { color: selectedType === t ? '#fff' : textColor }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : (
        <FlatList
          data={communities}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No communities" subtitle="No communities found" dark={dark} />}
          onEndReached={() => { if (hasMore && !loading) fetchCommunities(page + 1); }}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchCommunities(1, true)} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 0.5, gap: 6 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  typesRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 6, flexWrap: 'wrap' },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  typeText: { fontSize: 12, fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  communityCard: { borderRadius: 12, borderWidth: 0.5, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row' },
  communityImage: { width: 56, height: 56, borderRadius: 12 },
  communityImagePlaceholder: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  communityInfo: { flex: 1, marginLeft: 12 },
  communityName: { fontSize: 16, fontWeight: '600' },
  communityMeta: { fontSize: 12, marginTop: 2 },
  communityDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  joinBtn: { marginTop: 10, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  notJoinedBtn: { backgroundColor: colors.primary[500] },
  joinedBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#9ca3af' },
  joinBtnText: { fontSize: 14, fontWeight: '600' },
});
