import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import useThemeStore from '../../store/themeStore';
import { locationAPI, followAPI } from '../../services/api';
import { colors } from '../../theme/colors';

type TabKey = 'people' | 'businesses' | 'communities';

interface NearbyUser {
  id: string; username: string; full_name: string | null;
  profile_image_url: string | null; is_verified: boolean;
  account_type?: string; distance?: number; bio?: string | null;
  is_following?: boolean;
}

interface NearbyCommunity {
  id: string; name: string; description?: string | null;
  cover_image_url?: string | null; members_count?: number; distance?: number;
}

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'people', label: 'People', icon: 'people-outline' },
  { key: 'businesses', label: 'Businesses', icon: 'storefront-outline' },
  { key: 'communities', label: 'Communities', icon: 'globe-outline' },
];

const RADIUS_OPTIONS = [5, 10, 25, 50];

export default function NearbyScreen() {
  const dark = useThemeStore((s) => s.dark);
  const navigation = useNavigation();
  const [tab, setTab] = useState<TabKey>('people');
  const [radius, setRadius] = useState(10);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const cardBg = dark ? colors.dark.card : '#f8f9fa';

  // Request location permission
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setPermissionStatus('granted');
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          // Update user location on server
          locationAPI.updateLocation(loc.coords.latitude, loc.coords.longitude).catch(() => {});
        } catch {
          // Use Noida center as fallback
          setLocation({ lat: 28.5355, lng: 77.3910 });
        }
      } else {
        setPermissionStatus('denied');
        setLoading(false);
      }
    })();
  }, []);

  // Fetch nearby data when location/tab/radius changes
  useEffect(() => {
    if (!location) return;
    fetchNearby();
  }, [location, tab, radius]);

  const fetchNearby = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    try {
      let res;
      if (tab === 'people') {
        res = await locationAPI.nearbyUsers(location.lat, location.lng, radius);
      } else if (tab === 'businesses') {
        res = await locationAPI.nearbyBusinesses(location.lat, location.lng, radius);
      } else {
        res = await locationAPI.nearbyCommunities(location.lat, location.lng, radius);
      }
      setData(res.data?.users || res.data?.communities || res.data || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [location, tab, radius]);

  const formatDistance = (km?: number) => {
    if (!km) return '';
    if (km < 1) return `${Math.round(km * 1000)}m away`;
    return `${km.toFixed(1)}km away`;
  };

  const renderUserItem = useCallback(({ item }: { item: NearbyUser }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderColor }]}
      onPress={() => (navigation as any).navigate('UserProfile', { userId: item.id })}
      activeOpacity={0.7}
    >
      <Avatar uri={item.profile_image_url} name={item.full_name || item.username} size={52} />
      <View style={styles.cardInfo}>
        <View style={styles.cardNameRow}>
          <Text style={[styles.cardName, { color: textColor }]}>{item.full_name || item.username}</Text>
          {item.is_verified && <Ionicons name="checkmark-circle" size={14} color={colors.primary[500]} style={{ marginLeft: 3 }} />}
        </View>
        <Text style={[styles.cardHandle, { color: mutedColor }]}>@{item.username}</Text>
        {item.bio ? <Text style={[styles.cardBio, { color: mutedColor }]} numberOfLines={1}>{item.bio}</Text> : null}
        {item.distance !== undefined && (
          <View style={styles.distanceRow}>
            <Ionicons name="location" size={12} color={colors.primary[500]} />
            <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
          </View>
        )}
      </View>
      {item.account_type && item.account_type !== 'individual' && (
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{item.account_type}</Text>
        </View>
      )}
    </TouchableOpacity>
  ), [textColor, mutedColor, borderColor, cardBg, navigation]);

  const renderCommunityItem = useCallback(({ item }: { item: NearbyCommunity }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderColor }]}
      activeOpacity={0.7}
    >
      <View style={[styles.communityIcon, { backgroundColor: colors.primary[500] + '15' }]}>
        <Ionicons name="people" size={24} color={colors.primary[500]} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: textColor }]}>{item.name}</Text>
        {item.description ? <Text style={[styles.cardBio, { color: mutedColor }]} numberOfLines={1}>{item.description}</Text> : null}
        <View style={styles.communityMeta}>
          {item.members_count !== undefined && <Text style={[styles.cardHandle, { color: mutedColor }]}>{item.members_count} members</Text>}
          {item.distance !== undefined && (
            <View style={styles.distanceRow}>
              <Ionicons name="location" size={12} color={colors.primary[500]} />
              <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  ), [textColor, mutedColor, borderColor, cardBg]);

  if (permissionStatus === 'denied') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Nearby</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.permissionContainer}>
          <View style={[styles.permissionIcon, { backgroundColor: colors.primary[500] + '15' }]}>
            <Ionicons name="location" size={48} color={colors.primary[500]} />
          </View>
          <Text style={[styles.permissionTitle, { color: textColor }]}>Enable Location</Text>
          <Text style={[styles.permissionText, { color: mutedColor }]}>
            Allow NoidaCircle to access your location to discover nearby people, businesses, and communities in Noida.
          </Text>
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          >
            <Ionicons name="settings-outline" size={18} color="#fff" />
            <Text style={styles.permissionBtnText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={[styles.skipText, { color: mutedColor }]}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Nearby</Text>
        <TouchableOpacity onPress={fetchNearby} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="refresh" size={22} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: borderColor }]}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Ionicons name={t.icon} size={18} color={tab === t.key ? colors.primary[500] : mutedColor} />
            <Text style={[styles.tabText, { color: tab === t.key ? colors.primary[500] : mutedColor }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Radius selector */}
      <View style={[styles.radiusBar, { borderBottomColor: borderColor }]}>
        <Ionicons name="resize-outline" size={16} color={mutedColor} />
        <Text style={[styles.radiusLabel, { color: mutedColor }]}>Radius:</Text>
        {RADIUS_OPTIONS.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.radiusChip, radius === r && styles.radiusChipActive]}
            onPress={() => setRadius(r)}
          >
            <Text style={[styles.radiusChipText, radius === r && styles.radiusChipTextActive]}>{r} km</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : (
        <FlatList
          data={data}
          renderItem={tab === 'communities' ? renderCommunityItem : renderUserItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <EmptyState
              icon="location-outline"
              title={`No ${tab} nearby`}
              subtitle={`Try increasing your search radius or check back later`}
              dark={dark}
            />
          }
          contentContainerStyle={{ paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary[500] },
  tabText: { fontSize: 13, fontWeight: '600' },
  radiusBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 0.5 },
  radiusLabel: { fontSize: 13, fontWeight: '500' },
  radiusChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: 'rgba(59,130,246,0.08)' },
  radiusChipActive: { backgroundColor: colors.primary[500] },
  radiusChipText: { fontSize: 12, fontWeight: '600', color: colors.primary[500] },
  radiusChipTextActive: { color: '#fff' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginVertical: 4, padding: 14, borderRadius: 14, borderWidth: 0.5 },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center' },
  cardName: { fontSize: 15, fontWeight: '600' },
  cardHandle: { fontSize: 13, marginTop: 1 },
  cardBio: { fontSize: 13, marginTop: 3 },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  distanceText: { fontSize: 12, fontWeight: '500', color: colors.primary[500] },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(59,130,246,0.08)' },
  typeBadgeText: { fontSize: 10, fontWeight: '600', color: colors.primary[500], textTransform: 'capitalize' },
  communityIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  communityMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  permissionIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  permissionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  permissionText: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  permissionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary[500], paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  permissionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  skipText: { fontSize: 14, fontWeight: '500' },
});
