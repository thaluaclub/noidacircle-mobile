import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert, Linking, Platform,
  ScrollView,
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
type ViewMode = 'list' | 'map';

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

// Business category filters
const BUSINESS_CATEGORIES = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'food', label: 'Food', icon: 'restaurant-outline' },
  { key: 'cafes', label: 'Cafes', icon: 'cafe-outline' },
  { key: 'shopping', label: 'Shopping', icon: 'cart-outline' },
  { key: 'health', label: 'Health', icon: 'fitness-outline' },
  { key: 'education', label: 'Education', icon: 'school-outline' },
  { key: 'services', label: 'Services', icon: 'construct-outline' },
];

export default function NearbyScreen() {
  const dark = useThemeStore((s) => s.dark);
  const navigation = useNavigation();
  const [tab, setTab] = useState<TabKey>('people');
  const [radius, setRadius] = useState(10);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [businessCategory, setBusinessCategory] = useState('all');
  const [resultCounts, setResultCounts] = useState<Record<TabKey, number>>({ people: 0, businesses: 0, communities: 0 });

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
          locationAPI.updateLocation(loc.coords.latitude, loc.coords.longitude).catch(() => {});
        } catch {
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

  // Fetch all tab counts when location changes
  useEffect(() => {
    if (!location) return;
    fetchAllCounts();
  }, [location, radius]);

  const fetchAllCounts = useCallback(async () => {
    if (!location) return;
    try {
      const [pRes, bRes, cRes] = await Promise.allSettled([
        locationAPI.nearbyUsers(location.lat, location.lng, radius),
        locationAPI.nearbyBusinesses(location.lat, location.lng, radius),
        locationAPI.nearbyCommunities(location.lat, location.lng, radius),
      ]);
      setResultCounts({
        people: pRes.status === 'fulfilled' ? (pRes.value.data?.users || pRes.value.data || []).length : 0,
        businesses: bRes.status === 'fulfilled' ? (bRes.value.data?.users || bRes.value.data || []).length : 0,
        communities: cRes.status === 'fulfilled' ? (cRes.value.data?.communities || cRes.value.data || []).length : 0,
      });
    } catch {}
  }, [location, radius]);

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
      const items = res.data?.users || res.data?.communities || res.data || [];
      setData(items);
      setResultCounts(prev => ({ ...prev, [tab]: items.length }));
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

  // Filter businesses by category
  const filteredData = tab === 'businesses' && businessCategory !== 'all'
    ? data.filter((item: any) => {
        const cat = (item.account_category || item.business_category || '').toLowerCase();
        return cat.includes(businessCategory.toLowerCase());
      })
    : data;

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
        <View style={styles.headerRight}>
          {/* List/Map toggle */}
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            style={styles.viewToggle}
          >
            <Ionicons name={viewMode === 'list' ? 'map-outline' : 'list-outline'} size={22} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity onPress={fetchNearby} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="refresh" size={22} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs with result count badges */}
      <View style={[styles.tabBar, { borderBottomColor: borderColor }]}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Ionicons name={t.icon} size={18} color={tab === t.key ? colors.primary[500] : mutedColor} />
            <Text style={[styles.tabText, { color: tab === t.key ? colors.primary[500] : mutedColor }]}>{t.label}</Text>
            {resultCounts[t.key] > 0 && (
              <View style={[styles.countBadge, { backgroundColor: tab === t.key ? colors.primary[500] : 'rgba(0,0,0,0.08)' }]}>
                <Text style={[styles.countBadgeText, { color: tab === t.key ? '#fff' : mutedColor }]}>{resultCounts[t.key]}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Business category filters */}
      {tab === 'businesses' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.categoryBar, { borderBottomColor: borderColor }]}
          contentContainerStyle={styles.categoryScroll}
        >
          {BUSINESS_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryChip, businessCategory === cat.key && styles.categoryChipActive]}
              onPress={() => setBusinessCategory(cat.key)}
            >
              <Ionicons
                name={cat.icon as any}
                size={14}
                color={businessCategory === cat.key ? '#fff' : mutedColor}
              />
              <Text style={[styles.categoryChipText, businessCategory === cat.key && styles.categoryChipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

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

      {viewMode === 'map' ? (
        // Map placeholder — native map requires react-native-maps which needs native build
        <View style={styles.mapPlaceholder}>
          <View style={[styles.mapPlaceholderInner, { backgroundColor: dark ? colors.dark.card : '#f0f4f8' }]}>
            <Ionicons name="map" size={64} color={colors.primary[500]} style={{ opacity: 0.3 }} />
            <Text style={[styles.mapPlaceholderTitle, { color: textColor }]}>Map View</Text>
            <Text style={[styles.mapPlaceholderText, { color: mutedColor }]}>
              {filteredData.length} {tab} found within {radius}km
            </Text>
            <Text style={[styles.mapPlaceholderSubtext, { color: mutedColor }]}>
              {location ? `Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Getting location...'}
            </Text>
            {/* Show list of results with distance */}
            <FlatList
              data={filteredData.slice(0, 5)}
              keyExtractor={item => item.id}
              style={{ width: '100%', marginTop: 16 }}
              renderItem={({ item }) => (
                <View style={[styles.mapListItem, { borderColor }]}>
                  <Ionicons name="location" size={16} color={colors.primary[500]} />
                  <Text style={[{ color: textColor, fontSize: 14, flex: 1, marginLeft: 8 }]} numberOfLines={1}>
                    {item.full_name || item.username || item.name}
                  </Text>
                  <Text style={[{ color: mutedColor, fontSize: 12 }]}>
                    {formatDistance(item.distance)}
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : (
        <FlatList
          data={filteredData}
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  viewToggle: { padding: 4 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary[500] },
  tabText: { fontSize: 13, fontWeight: '600' },
  countBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, marginLeft: 4 },
  countBadgeText: { fontSize: 10, fontWeight: '700' },
  // Business categories
  categoryBar: { borderBottomWidth: 0.5, maxHeight: 48 },
  categoryScroll: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.04)', gap: 4 },
  categoryChipActive: { backgroundColor: colors.primary[500] },
  categoryChipText: { fontSize: 12, fontWeight: '600', color: '#888' },
  categoryChipTextActive: { color: '#fff' },
  // Radius
  radiusBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 0.5 },
  radiusLabel: { fontSize: 13, fontWeight: '500' },
  radiusChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: 'rgba(59,130,246,0.08)' },
  radiusChipActive: { backgroundColor: colors.primary[500] },
  radiusChipText: { fontSize: 12, fontWeight: '600', color: colors.primary[500] },
  radiusChipTextActive: { color: '#fff' },
  // Map placeholder
  mapPlaceholder: { flex: 1, padding: 16 },
  mapPlaceholderInner: { flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 24 },
  mapPlaceholderTitle: { fontSize: 20, fontWeight: '700', marginTop: 12 },
  mapPlaceholderText: { fontSize: 14, marginTop: 4 },
  mapPlaceholderSubtext: { fontSize: 12, marginTop: 4 },
  mapListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, paddingHorizontal: 4 },
  // Cards
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
