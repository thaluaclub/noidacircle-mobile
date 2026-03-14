import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  ViewToken,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Avatar from '../../components/Avatar';
import { colors } from '../../theme/colors';
import { postsAPI, likesAPI } from '../../services/api';
import { timeAgo, formatCount } from '../../utils/formatters';
import type { Post } from '../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ReelViewerParams = {
  ReelViewer: { post: Post; startIndex?: number };
};

function ReelItem({ item, isVisible }: { item: Post; isVisible: boolean }) {
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(item.is_liked);
  const [likesCount, setLikesCount] = useState(item.likes_count);

  const player = useVideoPlayer(item.media_url || '', (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    if (!player) return;
    if (isVisible) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, player]);

  useEffect(() => {
    if (player) player.muted = muted;
  }, [muted, player]);

  const handleLike = useCallback(async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((c) => c + (wasLiked ? -1 : 1));
    try {
      if (wasLiked) {
        await likesAPI.unlikePost(item.id);
      } else {
        await likesAPI.likePost(item.id);
      }
    } catch {
      setLiked(wasLiked);
      setLikesCount((c) => c + (wasLiked ? 1 : -1));
    }
  }, [liked, item.id]);

  return (
    <View style={styles.reelContainer}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setMuted((m) => !m)}
        style={StyleSheet.absoluteFill}
      >
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      </TouchableOpacity>

      {/* Mute indicator */}
      <View style={styles.muteIndicator}>
        <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={16} color="#fff" />
      </View>

      {/* Right side actions */}
      <View style={styles.sideActions}>
        <TouchableOpacity style={styles.sideBtn} onPress={handleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={28} color={liked ? colors.error : '#fff'} />
          <Text style={styles.sideBtnText}>{formatCount(likesCount)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sideBtn}>
          <Ionicons name="chatbubble-outline" size={26} color="#fff" />
          <Text style={styles.sideBtnText}>{formatCount(item.comments_count)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sideBtn}>
          <Ionicons name="share-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Bottom info */}
      <View style={styles.bottomInfo}>
        <View style={styles.userRow}>
          <Avatar uri={item.user.profile_image_url} name={item.user.full_name || item.user.username} size={36} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.reelUsername}>{item.user.full_name || item.user.username}</Text>
              {item.user.is_verified && (
                <Ionicons name="checkmark-circle" size={14} color={colors.primary[500]} style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.reelHandle}>@{item.user.username}</Text>
          </View>
        </View>
        {item.content ? (
          <Text style={styles.reelContent} numberOfLines={2}>{item.content}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function ReelViewerScreen() {
  const route = useRoute<RouteProp<ReelViewerParams, 'ReelViewer'>>();
  const navigation = useNavigation();
  const { post } = route.params;

  const [reels, setReels] = useState<Post[]>([post]);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Load more reels
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await postsAPI.getReels(1, 20);
        const fetched: Post[] = res.data.posts || res.data || [];
        // Merge: put current post first, then others (deduplicated)
        const others = fetched.filter((r) => r.id !== post.id);
        setReels([post, ...others]);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [post.id]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setVisibleIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await postsAPI.getReels(nextPage, 20);
      const fetched: Post[] = res.data.posts || res.data || [];
      if (fetched.length > 0) {
        const existingIds = new Set(reels.map((r) => r.id));
        const newReels = fetched.filter((r) => !existingIds.has(r.id));
        if (newReels.length > 0) {
          setReels((prev) => [...prev, ...newReels]);
          setPage(nextPage);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [page, loading, reels]);

  const renderItem = useCallback(
    ({ item, index }: { item: Post; index: number }) => (
      <ReelItem item={item} isVisible={index === visibleIndex} />
    ),
    [visibleIndex]
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={reels}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={loadMore}
        onEndReachedThreshold={2}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />

      {/* Back button */}
      <SafeAreaView style={styles.backBtnContainer} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.reelsTitle}>Reels</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  reelContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  backBtnContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  muteIndicator: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideActions: {
    position: 'absolute',
    right: 12,
    bottom: 160,
    alignItems: 'center',
    gap: 20,
  },
  sideBtn: {
    alignItems: 'center',
  },
  sideBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 70,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reelUsername: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  reelHandle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  reelContent: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
});
