import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  ViewToken,
  Alert,
  ScrollView,
  FlatList,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import PostCard from '../../components/PostCard';
import Avatar from '../../components/Avatar';
import { FeedSkeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import usePostsStore from '../../store/postsStore';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import { postsAPI, notificationsAPI, recommendationsAPI, followAPI, communitiesAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import type { Post, SearchUser } from '../../types';
import type { FeedStackParamList } from '../../navigation/FeedStack';

type FeedNav = NativeStackNavigationProp<FeedStackParamList, 'Feed'>;

const SCREEN_WIDTH = Dimensions.get('window').width;

// Feed tab definitions — matching web
const FEED_TABS = [
  { key: 'for_you', label: 'For You', icon: 'sparkles' },
  { key: 'following', label: 'Following', icon: 'people' },
  { key: 'reels', label: 'Reels', icon: 'play-circle' },
  { key: 'events', label: 'Events', icon: 'calendar' },
  { key: 'news', label: 'News', icon: 'newspaper' },
  { key: 'polls', label: 'Polls', icon: 'bar-chart' },
];

// Types for recommendation cards
type RecommendedUser = {
  id: string;
  username: string;
  full_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
  is_verified: boolean;
  account_type?: string | null;
};

type RecommendedCommunity = {
  id: string;
  name: string;
  description?: string;
  cover_image_url?: string | null;
  members_count?: number;
};

// Union type for FlashList items
type FeedItem =
  | { type: 'post'; data: Post }
  | { type: 'recommended_people'; data: RecommendedUser[] }
  | { type: 'recommended_communities'; data: RecommendedCommunity[] }
  | { type: 'recommended_brands'; data: RecommendedUser[] };

export default function FeedScreen() {
  const dark = useThemeStore((s) => s.dark);
  const user = useAuthStore((s) => s.user);
  const {
    posts,
    loading,
    refreshing,
    hasMore,
    error,
    feedType,
    fetchFeed,
    refreshFeed,
    loadMore,
    setFeedType,
    toggleLike,
    toggleDownvote,
    toggleBookmark,
    removePost,
  } = usePostsStore();
  const navigation = useNavigation<FeedNav>();
  const listRef = useRef<FlashList<FeedItem>>(null);

  // Badge counts
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Quote modal
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [quoteTarget, setQuoteTarget] = useState<Post | null>(null);
  const [quoteContent, setQuoteContent] = useState('');
  const [quotePublishing, setQuotePublishing] = useState(false);

  // Recommendations
  const [suggestedPeople, setSuggestedPeople] = useState<RecommendedUser[]>([]);
  const [suggestedCommunities, setSuggestedCommunities] = useState<RecommendedCommunity[]>([]);
  const [suggestedBrands, setSuggestedBrands] = useState<RecommendedUser[]>([]);

  // Scroll to top when Home tab is pressed while already on Feed
  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;
    const unsubscribe = parent.addListener('tabPress' as any, (e: any) => {
      const isFocused = navigation.isFocused();
      if (isFocused && listRef.current) {
        listRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    });
    return unsubscribe;
  }, [navigation]);

  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(new Set());

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const ids = new Set(
      viewableItems
        .map((v) => (v.item as FeedItem)?.type === 'post' ? (v.item as any).data?.id : null)
        .filter(Boolean) as string[]
    );
    setVisiblePostIds(ids);
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const cardBg = dark ? colors.dark.card : '#f9fafb';

  useEffect(() => {
    fetchFeed(1);
  }, []);

  // Fetch unread notification count periodically
  useFocusEffect(
    useCallback(() => {
      const fetchCounts = async () => {
        try {
          const res = await notificationsAPI.unreadCount();
          setUnreadNotifCount(res.data.count || res.data.unread_count || 0);
        } catch {}
      };
      fetchCounts();
      const interval = setInterval(fetchCounts, 30000);
      return () => clearInterval(interval);
    }, [])
  );

  // Fetch recommendations once
  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const [peopleRes, commRes, brandRes] = await Promise.allSettled([
          recommendationsAPI.suggestedUsers(6),
          recommendationsAPI.suggestedCommunities(4),
          recommendationsAPI.suggestedBrands(6),
        ]);
        if (peopleRes.status === 'fulfilled') {
          setSuggestedPeople(peopleRes.value.data.users || peopleRes.value.data || []);
        }
        if (commRes.status === 'fulfilled') {
          setSuggestedCommunities(commRes.value.data.communities || commRes.value.data || []);
        }
        if (brandRes.status === 'fulfilled') {
          setSuggestedBrands(brandRes.value.data.users || brandRes.value.data || []);
        }
      } catch {}
    };
    fetchRecs();
  }, []);

  // Build feed items with recommendation cards interspersed
  const feedItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    posts.forEach((post, index) => {
      items.push({ type: 'post', data: post });

      // After every 4th post, insert a recommendation card
      const position = index + 1;
      if (position === 4 && suggestedPeople.length > 0) {
        items.push({ type: 'recommended_people', data: suggestedPeople });
      }
      if (position === 8 && suggestedCommunities.length > 0) {
        items.push({ type: 'recommended_communities', data: suggestedCommunities });
      }
      if (position === 12 && suggestedBrands.length > 0) {
        items.push({ type: 'recommended_brands', data: suggestedBrands });
      }
    });
    return items;
  }, [posts, suggestedPeople, suggestedCommunities, suggestedBrands]);

  const handlePostPress = useCallback(
    (post: Post) => {
      navigation.navigate('PostDetail', { postId: post.id, post });
    },
    [navigation]
  );

  const handleUserPress = useCallback(
    (userId: string) => {
      navigation.navigate('UserProfile', { userId });
    },
    [navigation]
  );

  const handleReelPress = useCallback(
    (post: Post) => {
      navigation.navigate('ReelViewer', { post });
    },
    [navigation]
  );

  const handleEdit = useCallback(
    (post: Post) => {
      navigation.navigate('EditPost', { post });
    },
    [navigation]
  );

  const handleDelete = useCallback(
    async (postId: string) => {
      try {
        await postsAPI.delete(postId);
        removePost(postId);
      } catch (err: any) {
        Alert.alert('Error', err.response?.data?.error || 'Failed to delete post');
      }
    },
    [removePost]
  );

  // Quote post handler
  const handleQuote = useCallback((post: Post) => {
    setQuoteTarget(post);
    setQuoteContent('');
    setQuoteModalVisible(true);
  }, []);

  const handleQuoteSubmit = useCallback(async () => {
    if (!quoteTarget || quotePublishing) return;
    setQuotePublishing(true);
    try {
      await postsAPI.create({
        content: quoteContent.trim() || ' ',
        description: JSON.stringify({ type: 'quote', original_post_id: quoteTarget.id }),
      });
      setQuoteModalVisible(false);
      setQuoteTarget(null);
      setQuoteContent('');
      Alert.alert('Quoted!', 'Your quote post has been published.');
      refreshFeed();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to quote post');
    } finally {
      setQuotePublishing(false);
    }
  }, [quoteTarget, quoteContent, quotePublishing, refreshFeed]);

  // Follow a recommended user
  const handleFollowUser = useCallback(async (userId: string) => {
    try {
      await followAPI.follow(userId);
      setSuggestedPeople((prev) => prev.filter((u) => u.id !== userId));
      setSuggestedBrands((prev) => prev.filter((u) => u.id !== userId));
    } catch {}
  }, []);

  // Join a recommended community
  const handleJoinCommunity = useCallback(async (communityId: string) => {
    try {
      await communitiesAPI.join(communityId);
      setSuggestedCommunities((prev) => prev.filter((c) => c.id !== communityId));
    } catch {}
  }, []);

  // Render recommendation: Suggested People
  const renderSuggestedPeople = useCallback(
    (users: RecommendedUser[], title: string) => (
      <View style={[styles.recSection, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.recHeader}>
          <Text style={[styles.recTitle, { color: textColor }]}>{title}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Explore' as any)}>
            <Text style={{ color: colors.primary[500], fontSize: 13, fontWeight: '600' }}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recScroll}>
          {users.map((u) => (
            <TouchableOpacity
              key={u.id}
              style={[styles.userCard, { borderColor, backgroundColor: dark ? colors.dark.bg : '#fff' }]}
              onPress={() => handleUserPress(u.id)}
              activeOpacity={0.7}
            >
              <Avatar uri={u.profile_image_url} name={u.full_name || u.username} size={56} />
              <View style={styles.userCardNameRow}>
                <Text style={[styles.userCardName, { color: textColor }]} numberOfLines={1}>
                  {u.full_name || u.username}
                </Text>
                {u.is_verified && (
                  <Ionicons name="checkmark-circle" size={12} color={colors.primary[500]} />
                )}
              </View>
              <Text style={[styles.userCardHandle, { color: mutedColor }]} numberOfLines={1}>
                @{u.username}
              </Text>
              {u.account_type && u.account_type !== 'individual' && (
                <View style={styles.userCardTypeBadge}>
                  <Text style={styles.userCardTypeText}>
                    {u.account_type.charAt(0).toUpperCase() + u.account_type.slice(1)}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.followButton}
                onPress={() => handleFollowUser(u.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.followButtonText}>Follow</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    ),
    [dark, textColor, mutedColor, borderColor, cardBg, handleUserPress, handleFollowUser, navigation]
  );

  // Render recommendation: Suggested Communities
  const renderSuggestedCommunities = useCallback(
    (communities: RecommendedCommunity[]) => (
      <View style={[styles.recSection, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.recHeader}>
          <Text style={[styles.recTitle, { color: textColor }]}>Recommended Communities</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Communities' as any)}>
            <Text style={{ color: colors.primary[500], fontSize: 13, fontWeight: '600' }}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recScroll}>
          {communities.map((comm) => (
            <TouchableOpacity
              key={comm.id}
              style={[styles.communityCard, { borderColor, backgroundColor: dark ? colors.dark.bg : '#fff' }]}
              activeOpacity={0.7}
            >
              <View style={styles.communityIconBg}>
                <Ionicons name="people" size={24} color={colors.primary[500]} />
              </View>
              <Text style={[styles.communityName, { color: textColor }]} numberOfLines={1}>
                {comm.name}
              </Text>
              {comm.description && (
                <Text style={[styles.communityDesc, { color: mutedColor }]} numberOfLines={2}>
                  {comm.description}
                </Text>
              )}
              {comm.members_count !== undefined && (
                <Text style={[styles.communityMembers, { color: mutedColor }]}>
                  {comm.members_count} members
                </Text>
              )}
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => handleJoinCommunity(comm.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    ),
    [dark, textColor, mutedColor, borderColor, cardBg, handleJoinCommunity, navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      switch (item.type) {
        case 'post':
          return (
            <PostCard
              post={item.data}
              dark={dark}
              isVisible={visiblePostIds.has(item.data.id)}
              onPress={() => handlePostPress(item.data)}
              onLike={() => toggleLike(item.data.id)}
              onDownvote={() => toggleDownvote(item.data.id)}
              onBookmark={() => toggleBookmark(item.data.id)}
              onComment={() => handlePostPress(item.data)}
              onUserPress={handleUserPress}
              onReelPress={handleReelPress}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onQuote={handleQuote}
            />
          );
        case 'recommended_people':
          return renderSuggestedPeople(item.data, 'Suggested for You');
        case 'recommended_communities':
          return renderSuggestedCommunities(item.data);
        case 'recommended_brands':
          return renderSuggestedPeople(item.data, 'Recommended Brands & Business');
        default:
          return null;
      }
    },
    [dark, visiblePostIds, toggleLike, toggleDownvote, toggleBookmark, handlePostPress, handleUserPress, handleReelPress, handleEdit, handleDelete, handleQuote, renderSuggestedPeople, renderSuggestedCommunities]
  );

  const renderFooter = useCallback(() => {
    if (!hasMore || posts.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </View>
    );
  }, [hasMore, posts.length]);

  const emptyMessages: Record<string, { title: string; sub: string }> = {
    for_you: { title: 'No posts yet', sub: 'Follow people in Noida to see their posts here' },
    following: { title: 'No posts from people you follow', sub: 'Follow interesting people to see their posts here' },
    news: { title: 'No news posts yet', sub: 'News posts will appear here when available' },
    polls: { title: 'No polls yet', sub: 'Polls will appear here when someone creates one' },
  };

  const renderEmpty = useCallback(() => {
    if (loading) return <FeedSkeleton />;
    const msg = emptyMessages[feedType] || emptyMessages.for_you;
    return (
      <EmptyState
        icon="newspaper-outline"
        title={msg.title}
        subtitle={msg.sub}
        actionTitle="Explore"
        dark={dark}
      />
    );
  }, [loading, dark, feedType]);

  const keyExtractor = useCallback((item: FeedItem, index: number) => {
    if (item.type === 'post') return item.data.id;
    return `${item.type}_${index}`;
  }, []);

  const getItemType = useCallback((item: FeedItem) => item.type, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Text style={[styles.logo, { color: textColor }]}>NoidaCircle</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => navigation.navigate('Nearby')} style={styles.headerIconBtn}>
            <Ionicons name="location-outline" size={23} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Explore' as any)} style={styles.headerIconBtn}>
            <Ionicons name="search-outline" size={24} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.headerIconBtn}>
            <Ionicons name="notifications-outline" size={24} color={textColor} />
            {unreadNotifCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifCount > 99 ? '99+' : unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed Tabs — matching web (For You, Following, News, Polls) */}
      <View style={[styles.tabsContainer, { borderBottomColor: borderColor }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {FEED_TABS.map((tab) => {
            const isActive = feedType === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabItem,
                  isActive && styles.tabItemActive,
                ]}
                onPress={() => setFeedType(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={isActive ? '#fff' : mutedColor}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Error Banner */}
      {error && !loading && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Feed List */}
      <FlashList
        ref={listRef}
        data={feedItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        estimatedItemSize={300}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshFeed}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {/* Quote Modal */}
      <Modal visible={quoteModalVisible} transparent animationType="slide" onRequestClose={() => setQuoteModalVisible(false)}>
        <TouchableOpacity style={styles.quoteOverlay} activeOpacity={1} onPress={() => setQuoteModalVisible(false)}>
          <View style={[styles.quoteContent, { backgroundColor: dark ? colors.dark.card : '#fff' }]}>
            <View style={styles.quoteHandle} />
            <Text style={[styles.quoteTitle, { color: textColor }]}>Quote Post</Text>
            <TextInput
              style={[styles.quoteInput, { color: textColor, borderColor }]}
              placeholder="Add your thoughts..."
              placeholderTextColor={mutedColor}
              value={quoteContent}
              onChangeText={setQuoteContent}
              multiline
              autoFocus
            />
            {quoteTarget && (
              <View style={[styles.quotePreview, { borderColor }]}>
                <Text style={[{ color: mutedColor, fontSize: 12 }]}>
                  @{quoteTarget.user?.username}: {quoteTarget.content?.substring(0, 100)}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.quoteSubmitBtn, { opacity: quotePublishing ? 0.5 : 1 }]}
              onPress={handleQuoteSubmit}
              disabled={quotePublishing}
            >
              {quotePublishing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.quoteSubmitText}>Quote</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  logo: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    padding: 6,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  // Feed tabs
  tabsContainer: {
    borderBottomWidth: 0.5,
    paddingVertical: 8,
  },
  tabsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  tabItemActive: {
    backgroundColor: colors.primary[500],
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  tabTextActive: {
    color: '#fff',
  },
  errorBanner: {
    backgroundColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: Platform.OS === 'ios' ? 88 : 64,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  // Recommendation sections
  recSection: {
    marginVertical: 8,
    paddingVertical: 16,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  recTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  recScroll: {
    paddingHorizontal: 12,
    gap: 10,
  },
  // User card
  userCard: {
    width: 140,
    borderRadius: 14,
    borderWidth: 0.5,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  userCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 8,
  },
  userCardName: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 100,
  },
  userCardHandle: {
    fontSize: 11,
    marginTop: 2,
  },
  userCardTypeBadge: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  userCardTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary[500],
  },
  followButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 16,
    marginTop: 10,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  // Community card
  communityCard: {
    width: 160,
    borderRadius: 14,
    borderWidth: 0.5,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  communityIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59,130,246,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  communityName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  communityDesc: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  communityMembers: {
    fontSize: 11,
    marginTop: 4,
  },
  joinButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 22,
    paddingVertical: 7,
    borderRadius: 16,
    marginTop: 10,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  // Quote modal
  quoteOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  quoteContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  quoteHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  quoteTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  quoteInput: {
    fontSize: 16,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  quotePreview: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  quoteSubmitBtn: {
    backgroundColor: colors.primary[500],
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  quoteSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
