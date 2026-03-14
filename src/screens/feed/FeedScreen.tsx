import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  ViewToken,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import PostCard from '../../components/PostCard';
import { FeedSkeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import usePostsStore from '../../store/postsStore';
import useThemeStore from '../../store/themeStore';
import { colors } from '../../theme/colors';
import type { Post } from '../../types';
import type { FeedStackParamList } from '../../navigation/FeedStack';

type FeedNav = NativeStackNavigationProp<FeedStackParamList, 'Feed'>;

export default function FeedScreen() {
  const dark = useThemeStore((s) => s.dark);
  const {
    posts,
    loading,
    refreshing,
    hasMore,
    error,
    fetchFeed,
    refreshFeed,
    loadMore,
    toggleLike,
    toggleBookmark,
  } = usePostsStore();
  const navigation = useNavigation<FeedNav>();
  const listRef = useRef<FlashList<Post>>(null);

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
    const ids = new Set(viewableItems.map((v) => v.item?.id).filter(Boolean) as string[]);
    setVisiblePostIds(ids);
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const borderColor = dark ? colors.dark.border : colors.light.border;

  useEffect(() => {
    fetchFeed(1);
  }, []);

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

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        post={item}
        dark={dark}
        isVisible={visiblePostIds.has(item.id)}
        onPress={() => handlePostPress(item)}
        onLike={() => toggleLike(item.id)}
        onBookmark={() => toggleBookmark(item.id)}
        onComment={() => handlePostPress(item)}
        onUserPress={handleUserPress}
      />
    ),
    [dark, visiblePostIds, toggleLike, toggleBookmark, handlePostPress, handleUserPress]
  );

  const renderFooter = useCallback(() => {
    if (!hasMore || posts.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </View>
    );
  }, [hasMore, posts.length]);

  const renderEmpty = useCallback(() => {
    if (loading) return <FeedSkeleton />;
    return (
      <EmptyState
        icon="newspaper-outline"
        title="No posts yet"
        subtitle="Follow people in Noida to see their posts here"
        actionTitle="Explore"
        dark={dark}
      />
    );
  }, [loading, dark]);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Text style={[styles.logo, { color: textColor }]}>NoidaCircle</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => navigation.navigate('Communities' as any)} style={styles.headerIconBtn}>
            <Ionicons name="people-outline" size={24} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.headerIconBtn}>
            <Ionicons name="notifications-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
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
        data={posts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
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
    paddingVertical: 12,
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
});