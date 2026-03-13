import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import useThemeStore from '../../store/themeStore';
import { followAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import type { ProfileStackParamList } from '../../navigation/ProfileStack';

type Route = RouteProp<ProfileStackParamList, 'FollowList'>;

interface FollowUser {
  id: string;
  username: string;
  full_name: string | null;
  profile_image_url: string | null;
  is_verified: boolean;
}

export default function FollowListScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { userId, tab, username } = route.params;
  const dark = useThemeStore((s) => s.dark);

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(tab);
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;

  const fetchList = useCallback(async (t: string, p: number = 1) => {
    try {
      if (p === 1) setLoading(true);
      const fn = t === 'followers' ? followAPI.followers : followAPI.following;
      const res = await fn(userId, p);
      const data = res.data;
      const list: FollowUser[] = data.followers || data.following || data.users || data;
      setUsers(prev => p === 1 ? list : [...prev, ...list]);
      setPage(p);
      if (data.pagination) {
        setHasMore(p < data.pagination.totalPages);
      } else {
        setHasMore(false);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setUsers([]);
    fetchList(activeTab, 1);
  }, [activeTab, fetchList]);

  const renderItem = useCallback(({ item }: { item: FollowUser }) => (
    <View style={[styles.userItem, { borderBottomColor: borderColor }]}>
      <Avatar uri={item.profile_image_url} name={item.full_name || item.username} size={44} />
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: textColor }]}>{item.full_name || item.username}</Text>
          {item.is_verified && <Ionicons name="checkmark-circle" size={14} color={colors.primary[500]} style={{ marginLeft: 4 }} />}
        </View>
        <Text style={[styles.handle, { color: mutedColor }]}>@{item.username}</Text>
      </View>
    </View>
  ), [textColor, mutedColor, borderColor]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>@{username}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.tabs, { borderBottomColor: borderColor }]}>
        {(['followers', 'following'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && styles.activeTab]}>
            <Text style={[styles.tabText, { color: activeTab === t ? colors.primary[500] : mutedColor, fontWeight: activeTab === t ? '600' : '400' }]}>
              {t === 'followers' ? 'Followers' : 'Following'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={<EmptyState icon="people-outline" title={`No ${activeTab}`} subtitle={`${username} has no ${activeTab} yet`} dark={dark} />}
          onEndReached={() => { if (hasMore && !loading) fetchList(activeTab, page + 1); }}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  tabs: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: colors.primary[500] },
  tabText: { fontSize: 14 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  userItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  userInfo: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '600' },
  handle: { fontSize: 13, marginTop: 1 },
});
