import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewToken,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../../components/Avatar';
import { colors } from '../../theme/colors';
import { postsAPI, likesAPI } from '../../services/api';
import { timeAgo, formatCount } from '../../utils/formatters';
import type { Post } from '../../types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface ReelItemProps {
  post: Post;
  isVisible: boolean;
}

function ReelItem({ post, isVisible }: ReelItemProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);

  const player = useVideoPlayer(post.media_url || '', (p) => {
    p.loop = true;
    p.muted = false;
    if (isVisible) p.play();
  });

  useEffect(() => {
    if (isVisible) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, player]);

  const handleLike = useCallback(async () => {
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((prev) => (wasLiked ? Math.max(0, prev - 1) : prev + 1));
    try {
      if (wasLiked) {
        await likesAPI.unlikePost(post.id);
      } else {
        await likesAPI.likePost(post.id);
      }
    } catch {
      setIsLiked(wasLiked);
      setLikeCount(post.likes_count || 0);
    }
  }, [isLiked, post.id, post.likes_count]);

  const handleMuteToggle = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    player.muted = newMuted;
  }, [isMuted, player]);

  return (
    <View style={[styles.reelContainer, { width: SCREEN_W, height: SCREEN_H }]}>
      <VideoView
        style={styles.video}
        player={player}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Mute button */}
      <TouchableOpacity style={styles.muteButton} onPress={handleMuteToggle} activeOpacity={0.7}>
        <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={22} color="#fff" />
      </TouchableOpacity>

      {/* User info + caption (bottom left) */}
      <View style={styles.bottomLeft}>
        <View style={styles.userRow}>
          <Avatar
            uri={post.user.profile_image_url}
            name={post.user.full_name || post.user.username}
            size={36}
          />
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {post.user.full_name || post.user.username}
              </Text>
              {post.user.is_verified && (
                <Ionicons name="checkmark-circle" size={14} color={colors.primary[500]} style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.timestamp}>@{post.user.username} · {timeAgo(post.created_at)}</Text>
          </View>
        </View>
        {post.content ? (
          <Text style={styles.caption} numberOfLines={2}>
            {post.content}
          </Text>
        ) : null}
      </View>

      {/* Action buttons (right side) */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.8}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={28}
            color={isLiked ? colors.error : '#fff'}
          />
          <Text style={styles.actionCount}>{formatCount(likeCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
          <Ionicons name="chatbubble-outline" size={26} color="#fff" />
          <Text style={styles.actionCount}>{formatCount(post.comments_count || 0)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
          <Ionicons name="share-outline" size={26} color="#fff" />
          <Text style={styles.actionCount}>{formatCount(post.shares_count || 0)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const MemoReelItem = React.memo(ReelItem);

export default function ReelsScreen() {
  const insets = useSafeAreaInsets();
  const [reels, setReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const loadingMore = useRef(false);

  const loadReels = useCallback(async (pageNum: number, append = false) => {
    if (loadingMore.current && append) return;
    loadingMore.current = true;
    try {
      const res = await postsAPI.getReels(pageNum, 10);
      const newReels = res.data.posts || res.data || [];
      const pagination = res.data.pagination;

      if (append) {
        setReels((prev) => [...prev, ...newReels]);
      } else {
        setReels(newReels);
      }
      setPage(pageNum);
      setHasMore(pagination ? pageNum < pagination.totalPages : newReels.length >= 10);
    } catch (err) {
      console.error('Error loading reels:', err);
    } finally {
      setLoading(false);
      loadingMore.current = false;
    }
  }, []);

  useEffect(() => {
    loadReels(1, false);
  }, [loadReels]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !loadingMore.current) {
      loadReels(page + 1, true);
    }
  }, [hasMore, page, loadReels]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 50 }), []);

  const renderReel = useCallback(
    ({ item, index }: { item: Post; index: number }) => (
      <MemoReelItem post={item} isVisible={index === currentIndex} />
    ),
    [currentIndex]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header label */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Reels</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={reels}
        renderItem={renderReel}
        keyExtractor={(item) => item.id}
        pagingEnabled
        scrollEventThrottle={16}
        snapToInterval={SCREEN_H}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.container, styles.center]}>
            <Ionicons name="videocam-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No reels yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
  },
  reelContainer: {
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
  muteButton: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomLeft: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 70,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    marginLeft: 10,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    maxWidth: '80%',
  },
  timestamp: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    position: 'absolute',
    right: 10,
    bottom: 120,
    alignItems: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    marginVertical: 14,
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});
