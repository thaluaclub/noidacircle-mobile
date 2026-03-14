import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
  ActivityIndicator,
  ViewToken,
  Share,
  Modal,
  TextInput,
  Platform,
  ScrollView,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../../components/Avatar';
import { colors } from '../../theme/colors';
import { postsAPI, likesAPI, commentsAPI } from '../../services/api';
import { timeAgo, formatCount } from '../../utils/formatters';
import type { Post, Comment } from '../../types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Global mute state — persists across all reels
let globalMuted = false;

interface ReelItemProps {
  post: Post;
  isVisible: boolean;
  onCommentPress: (post: Post) => void;
  onSharePress: (post: Post) => void;
}

function ReelItem({ post, isVisible, onCommentPress, onSharePress }: ReelItemProps) {
  const [isMuted, setIsMuted] = useState(globalMuted);
  const [isPaused, setIsPaused] = useState(false);
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const [commentCount, setCommentCount] = useState(post.comments_count || 0);

  const player = useVideoPlayer(post.media_url || '', (p) => {
    p.loop = true;
    p.muted = globalMuted;
    if (isVisible) p.play();
  });

  useEffect(() => {
    if (isVisible) {
      setIsPaused(false);
      player.muted = globalMuted;
      setIsMuted(globalMuted);
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
    globalMuted = newMuted;
  }, [isMuted, player]);

  const handleVideoTap = useCallback(() => {
    if (isPaused) {
      player.play();
      setIsPaused(false);
    } else {
      player.pause();
      setIsPaused(true);
    }
  }, [isPaused, player]);

  return (
    <View style={[styles.reelContainer, { width: SCREEN_W, height: SCREEN_H }]}>
      <TouchableWithoutFeedback onPress={handleVideoTap}>
        <View style={styles.videoWrapper}>
          <VideoView
            style={styles.video}
            player={player}
            contentFit="cover"
            nativeControls={false}
          />
          {isPaused && (
            <View style={styles.pauseOverlay}>
              <Ionicons name="play" size={60} color="rgba(255,255,255,0.7)" />
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

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
        <TouchableOpacity style={styles.actionBtn} onPress={handleMuteToggle} activeOpacity={0.7}>
          <View style={styles.muteCircle}>
            <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.8}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={28}
            color={isLiked ? colors.error : '#fff'}
          />
          <Text style={styles.actionCount}>{formatCount(likeCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onCommentPress(post)} activeOpacity={0.8}>
          <Ionicons name="chatbubble-outline" size={26} color="#fff" />
          <Text style={styles.actionCount}>{formatCount(commentCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onSharePress(post)} activeOpacity={0.8}>
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

  // Comment modal state
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  // Keyboard tracking for comment modal
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => setKeyboardHeight(e.endCoordinates.height);
    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

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

  // Comment handlers
  const handleCommentPress = useCallback(async (post: Post) => {
    setCommentPost(post);
    setCommentModalVisible(true);
    setLoadingComments(true);
    try {
      const res = await commentsAPI.getByPost(post.id, 1);
      const commentsList = res.data?.comments || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setComments(commentsList);
    } catch (err) {
      console.error('Error loading comments:', err);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  const handlePostComment = useCallback(async () => {
    if (!commentText.trim() || !commentPost || postingComment) return;
    setPostingComment(true);
    try {
      const res = await commentsAPI.create(commentPost.id, { content: commentText.trim() });
      const newComment = res.data?.comment || res.data;
      setComments((prev) => [newComment, ...prev]);
      setCommentText('');
      setReels((prev) =>
        prev.map((r) =>
          r.id === commentPost.id
            ? { ...r, comments_count: (r.comments_count || 0) + 1 }
            : r
        )
      );
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setPostingComment(false);
    }
  }, [commentText, commentPost, postingComment]);

  // Share handler — rich share with media URL + caption + branding
  const handleSharePress = useCallback(async (post: Post) => {
    try {
      const shareUrl = `https://noidacircle.com/post/${post.id}`;
      const caption = post.content
        ? `${post.content.slice(0, 200)}${post.content.length > 200 ? '...' : ''}`
        : 'Check out this reel on NoidaCircle!';
      const message = `${caption}\n\nVia NoidaCircle.com\n${shareUrl}`;

      await Share.share({
        message,
        url: post.media_url || shareUrl,
        title: post.user?.full_name ? `${post.user.full_name} on NoidaCircle` : 'NoidaCircle',
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  }, []);

  const renderReel = useCallback(
    ({ item, index }: { item: Post; index: number }) => (
      <MemoReelItem
        post={item}
        isVisible={index === currentIndex}
        onCommentPress={handleCommentPress}
        onSharePress={handleSharePress}
      />
    ),
    [currentIndex, handleCommentPress, handleSharePress]
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

      {/* Comment Modal — keyboard-aware */}
      <Modal
        visible={commentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.commentModalOverlay}
          activeOpacity={1}
          onPress={() => setCommentModalVisible(false)}
        >
          <View
            style={[
              styles.commentModalContent,
              { marginBottom: keyboardHeight > 0 ? keyboardHeight : 0 },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* Modal handle */}
            <View style={styles.commentModalHandle} />
            <Text style={styles.commentModalTitle}>
              Comments {commentPost ? `(${commentPost.comments_count || 0})` : ''}
            </Text>

            {/* Comments list */}
            {loadingComments ? (
              <View style={styles.commentLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary[500]} />
              </View>
            ) : (
              <ScrollView
                style={styles.commentsList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {comments.length === 0 ? (
                  <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
                ) : (
                  comments.map((comment) => (
                    <View key={comment.id} style={styles.commentItem}>
                      <Avatar
                        uri={comment.user?.profile_image_url}
                        name={comment.user?.full_name || comment.user?.username || ''}
                        size={32}
                      />
                      <View style={styles.commentBody}>
                        <Text style={styles.commentUsername}>
                          {comment.user?.full_name || comment.user?.username || 'User'}
                        </Text>
                        <Text style={styles.commentContent}>{comment.content}</Text>
                        <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            {/* Comment input */}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#999"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={handlePostComment}
                disabled={!commentText.trim() || postingComment}
                style={[styles.commentSendBtn, { opacity: commentText.trim() ? 1 : 0.4 }]}
              >
                {postingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  videoWrapper: {
    flex: 1,
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
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
    marginVertical: 10,
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  muteCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Comment Modal
  commentModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  commentModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_H * 0.6,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  commentModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  commentModalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  commentLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  commentsList: {
    maxHeight: SCREEN_H * 0.35,
    paddingHorizontal: 16,
  },
  noCommentsText: {
    color: '#888',
    textAlign: 'center',
    paddingVertical: 30,
    fontSize: 14,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  commentBody: {
    flex: 1,
  },
  commentUsername: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  commentContent: {
    color: '#ddd',
    fontSize: 14,
    marginTop: 2,
    lineHeight: 20,
  },
  commentTime: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#333',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 80,
  },
  commentSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
});
