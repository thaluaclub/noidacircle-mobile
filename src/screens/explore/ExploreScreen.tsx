import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import useThemeStore from '../../store/themeStore';
import { postsAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import EmptyState from '../../components/EmptyState';
import type { Post } from '../../types';
import type { ExploreStackParamList } from '../../navigation/ExploreStack';

type ExploreNav = NativeStackNavigationProp<ExploreStackParamList, 'Explore'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const GAP = 2;
const COLS = 3;
const TILE_SIZE = (SCREEN_WIDTH - GAP * (COLS - 1)) / COLS;

const CATEGORIES = ['All', 'Trending', 'Tech', 'Food', 'Events', 'Business', 'Culture'];

export default function ExploreScreen() {
  const dark = useThemeStore((s) => s.dark);
  const navigation = useNavigation<ExploreNav>();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const cardBg = dark ? colors.dark.card : '#f1f3f5';

  const fetchExplorePosts = useCallback(
    async (p: number = 1, refresh = false) => {
      try {
        if (p === 1) {
          refresh ? setRefreshing(true) : setLoading(true);
        }
        const res = await postsAPI.getAll(p, 30);
        const { posts: newPosts, pagination } = res.data;
        setPosts((prev) => (p === 1 ? newPosts : [...prev, ...newPosts]));
        setPage(p);
        setHasMore(p < pagination.totalPages);
      } catch {
        // silent
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchExplorePosts(1);
  }, [fetchExplorePosts]);

  const handleRefresh = useCallback(() => {
    fetchExplorePosts(1, true);
  }, [fetchExplorePosts]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchExplorePosts(page + 1);
    }
  }, [hasMore, loading, page, fetchExplorePosts]);

  const handleSearchFocus = useCallback(() => {
    navigation.navigate('SearchResults', { query: '' });
  }, [navigation]);

  const handlePostPress = useCallback(
    (post: Post) => {
      navigation.navigate('PostDetail', { postId: post.id, post });
    },
    [navigation]
  );

  // Filter posts by category (client-side for now)
  const filteredPosts =
    selectedCategory === 'All'
      ? posts
      : posts.filter(
          (p) =>
            p.category?.toLowerCase() === selectedCategory.toLowerCase()
        );

  const renderGridItem = useCallback(
    ({ item }: { item: Post }) => {
      if (item.media_url) {
        return (
          <TouchableOpacity
            onPress={() => handlePostPress(item)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: item.media_url }}
              style={styles.gridImage}
              contentFit="cover"
              transition={200}
              recyclingKey={item.id}
            />
            {item.media_type === 'video' && (
              <View style={styles.videoIcon}>
                <Ionicons name="play" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        );
      }

      // Text-only post tile
      return (
        <TouchableOpacity
          onPress={() => handlePostPress(item)}
          activeOpacity={0.8}
          style={[styles.textTile, { backgroundColor: cardBg }]}
        >
          <Text
            style={[styles.textTileContent, { color: textColor }]}
            numberOfLines={4}
          >
            {item.content}
          </Text>
          <View style={styles.textTileMeta}>
            <Ionicons name="heart" size={12} color={mutedColor} />
            <Text style={[styles.textTileCount, { color: mutedColor }]}>
              {item.likes_count}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [handlePostPress, cardBg, textColor, mutedColor]
  );

  const renderHeader = useCallback(
    () => (
      <View>
        {/* Category chips */}
        <View style={styles.categoriesRow}>
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isActive
                      ? colors.primary[500]
                      : cardBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: isActive ? '#fff' : textColor },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    ),
    [selectedCategory, cardBg, textColor]
  );

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      );
    }
    return (
      <EmptyState
        icon="compass-outline"
        title="Nothing to explore"
        subtitle="Posts will appear here as people share content"
        dark={dark}
      />
    );
  }, [loading, dark]);

  const renderFooter = useCallback(() => {
    if (!hasMore || filteredPosts.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </View>
    );
  }, [hasMore, filteredPosts.length]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      {/* Search Bar */}
      <TouchableOpacity
        onPress={handleSearchFocus}
        activeOpacity={0.8}
        style={[styles.searchBar, { backgroundColor: cardBg, borderColor }]}
      >
        <Ionicons name="search" size={18} color={mutedColor} />
        <Text style={[styles.searchPlaceholder, { color: mutedColor }]}>
          Search people, posts...
        </Text>
      </TouchableOpacity>

      {/* Grid */}
      <FlashList
        data={filteredPosts}
        renderItem={renderGridItem}
        keyExtractor={(item) => item.id}
        numColumns={COLS}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    gap: 8,
  },
  searchPlaceholder: {
    fontSize: 15,
    fontWeight: '400',
  },
  categoriesRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  gridImage: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    margin: GAP / 2,
  },
  videoIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 3,
  },
  textTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    margin: GAP / 2,
    padding: 8,
    justifyContent: 'space-between',
  },
  textTileContent: {
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  textTileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  textTileCount: {
    fontSize: 10,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
