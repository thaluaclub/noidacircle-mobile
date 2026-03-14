import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import PostCard from '../../components/PostCard';
import Avatar from '../../components/Avatar';
import usePostsStore from '../../store/postsStore';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { commentsAPI, likesAPI, postsAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { timeAgo } from '../../utils/formatters';
import type { Comment, Post } from '../../types';
import useKeyboardHeight from '../../hooks/useKeyboardHeight';
import type { FeedStackParamList } from '../../navigation/FeedStack';

type DetailRoute = RouteProp<FeedStackParamList, 'PostDetail'>;
type DetailNav = NativeStackNavigationProp<FeedStackParamList, 'PostDetail'>;

export default function PostDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<DetailNav>();
  const { postId, post: initialPost } = route.params;
  const dark = useThemeStore((s) => s.dark);
  const user = useAuthStore((s) => s.user);
  const { toggleLike, toggleBookmark } = usePostsStore();

  const [post, setPost] = useState<Post | null>(initialPost || null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const inputRef = useRef<TextInput>(null);
  const keyboardHeight = useKeyboardHeight();

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const cardBg = dark ? colors.dark.card : '#f8f9fa';

  // Fetch post if not passed
  useEffect(() => {
    if (!post) {
      postsAPI.getById(postId).then((res) => setPost(res.data.post || res.data));
    }
  }, [postId]);

  // Fetch comments
  const fetchComments = useCallback(
    async (p: number = 1) => {
      try {
        setLoadingComments(p === 1);
        const res = await commentsAPI.getByPost(postId, p);
        const { comments: newComments, pagination } = res.data;
        setComments((prev) =>
          p === 1 ? newComments : [...prev, ...newComments]
        );
        setPage(p);
        setHasMore(p < pagination.totalPages);
      } catch {
        // silent
      } finally {
        setLoadingComments(false);
      }
    },
    [postId]
  );

  useEffect(() => {
    fetchComments(1);
  }, [fetchComments]);

  // Submit comment
  const handleSubmit = useCallback(async () => {
    const text = commentText.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    try {
      const payload: any = { content: text };
      if (replyTo) payload.parent_comment_id = replyTo.id;

      const res = await commentsAPI.create(postId, payload);
      const newComment: Comment = res.data.comment || res.data;

      if (replyTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTo.id
              ? {
                  ...c,
                  reply_count: c.reply_count + 1,
                  replies: [...(c.replies || []), newComment],
                  showReplies: true,
                }
              : c
          )
        );
      } else {
        setComments((prev) => [newComment, ...prev]);
      }

      if (post) {
        setPost({ ...post, comments_count: post.comments_count + 1 });
      }

      setCommentText('');
      setReplyTo(null);
    } catch {
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }, [commentText, submitting, replyTo, postId, post]);

  // Like comment
  const handleLikeComment = useCallback(
    async (comment: Comment) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id
            ? {
                ...c,
                is_liked: !c.is_liked,
                likes_count: c.is_liked
                  ? Math.max(0, c.likes_count - 1)
                  : c.likes_count + 1,
              }
            : c
        )
      );
      try {
        if (comment.is_liked) {
          await likesAPI.unlikeComment(comment.id);
        } else {
          await likesAPI.likeComment(comment.id);
        }
      } catch {
        setComments((prev) =>
          prev.map((c) =>
            c.id === comment.id
              ? {
                  ...c,
                  is_liked: comment.is_liked,
                  likes_count: comment.likes_count,
                }
              : c
          )
        );
      }
    },
    []
  );

  // Load replies
  const handleLoadReplies = useCallback(async (comment: Comment) => {
    if (comment.showReplies) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id ? { ...c, showReplies: false } : c
        )
      );
      return;
    }
    try {
      const res = await commentsAPI.replies(comment.id);
      const replies: Comment[] = res.data.replies || res.data;
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id
            ? { ...c, replies, showReplies: true }
            : c
        )
      );
    } catch {}
  }, []);

  // Reply to comment
  const handleReply = useCallback((comment: Comment) => {
    setReplyTo(comment);
    inputRef.current?.focus();
  }, []);

  const renderComment = useCallback(
    ({ item }: { item: Comment }) => (
      <View style={styles.commentItem}>
        <Avatar
          uri={item.user.profile_image_url}
          name={item.user.full_name || item.user.username}
          size={32}
        />
        <View style={[styles.commentBody, { backgroundColor: cardBg }]}>
          <View style={styles.commentHeader}>
            <Text style={[styles.commentUser, { color: textColor }]}>
              {item.user.full_name || item.user.username}
            </Text>
            {item.user.is_verified && (
              <Ionicons
                name="checkmark-circle"
                size={13}
                color={colors.primary[500]}
                style={{ marginLeft: 3 }}
              />
            )}
            <Text style={[styles.commentTime, { color: mutedColor }]}>
              {' '}
              · {timeAgo(item.created_at)}
            </Text>
          </View>
          <Text style={[styles.commentText, { color: textColor }]}>
            {item.content}
          </Text>
          <View style={styles.commentActions}>
            <TouchableOpacity
              onPress={() => handleLikeComment(item)}
              style={styles.commentAction}
            >
              <Ionicons
                name={item.is_liked ? 'heart' : 'heart-outline'}
                size={16}
                color={item.is_liked ? colors.error : mutedColor}
              />
              {item.likes_count > 0 && (
                <Text
                  style={[
                    styles.commentActionText,
                    { color: item.is_liked ? colors.error : mutedColor },
                  ]}
                >
                  {item.likes_count}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleReply(item)}
              style={styles.commentAction}
            >
              <Text style={[styles.commentActionText, { color: mutedColor }]}>
                Reply
              </Text>
            </TouchableOpacity>
          </View>

          {/* Replies */}
          {item.reply_count > 0 && !item.showReplies && (
            <TouchableOpacity onPress={() => handleLoadReplies(item)}>
              <Text style={styles.viewReplies}>
                View {item.reply_count} {item.reply_count === 1 ? 'reply' : 'replies'}
              </Text>
            </TouchableOpacity>
          )}
          {item.showReplies && item.replies && (
            <View style={styles.repliesContainer}>
              {item.replies.map((reply) => (
                <View key={reply.id} style={styles.replyItem}>
                  <Avatar
                    uri={reply.user.profile_image_url}
                    name={reply.user.full_name || reply.user.username}
                    size={24}
                  />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <View style={styles.commentHeader}>
                      <Text
                        style={[styles.commentUser, { color: textColor, fontSize: 13 }]}
                      >
                        {reply.user.full_name || reply.user.username}
                      </Text>
                      <Text style={[styles.commentTime, { color: mutedColor }]}>
                        {' '}· {timeAgo(reply.created_at)}
                      </Text>
                    </View>
                    <Text style={[styles.commentText, { color: textColor, fontSize: 13 }]}>
                      {reply.content}
                    </Text>
                  </View>
                </View>
              ))}
              {item.showReplies && (
                <TouchableOpacity onPress={() => handleLoadReplies(item)}>
                  <Text style={styles.viewReplies}>Hide replies</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    ),
    [textColor, mutedColor, cardBg, handleLikeComment, handleReply, handleLoadReplies]
  );

  const renderHeader = useCallback(() => {
    if (!post) {
      return (
        <View style={styles.loadingPost}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      );
    }
    return (
      <View>
        <PostCard
          post={post}
          dark={dark}
          onLike={() => {
            toggleLike(post.id);
            setPost((p) =>
              p
                ? {
                    ...p,
                    is_liked: !p.is_liked,
                    likes_count: p.is_liked
                      ? Math.max(0, p.likes_count - 1)
                      : p.likes_count + 1,
                  }
                : p
            );
          }}
          onBookmark={() => {
            toggleBookmark(post.id);
            setPost((p) =>
              p ? { ...p, is_bookmarked: !p.is_bookmarked } : p
            );
          }}
        />
        <View
          style={[styles.commentsHeader, { borderTopColor: borderColor }]}
        >
          <Text style={[styles.commentsTitle, { color: textColor }]}>
            Comments ({post.comments_count})
          </Text>
        </View>
        {loadingComments && (
          <ActivityIndicator
            size="small"
            color={colors.primary[500]}
            style={{ marginVertical: 16 }}
          />
        )}
      </View>
    );
  }, [post, dark, toggleLike, toggleBookmark, borderColor, textColor, loadingComments]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      {/* Nav bar */}
      <View style={[styles.navBar, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: textColor }]}>Post</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ flex: 1 }}>
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          onEndReached={() => {
            if (hasMore) fetchComments(page + 1);
          }}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* Comment Input - stays above keyboard */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: bg,
              borderTopColor: borderColor,
              marginBottom: keyboardHeight > 0 ? keyboardHeight : 0,
            },
          ]}
        >
          {replyTo && (
            <View style={styles.replyBanner}>
              <Text style={[styles.replyBannerText, { color: mutedColor }]}>
                Replying to {replyTo.user.full_name || replyTo.user.username}
              </Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Ionicons name="close" size={16} color={mutedColor} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <Avatar
              uri={user?.avatar_url || null}
              name={user?.display_name || user?.username || 'U'}
              size={32}
            />
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                {
                  color: textColor,
                  backgroundColor: cardBg,
                },
              ]}
              placeholder={replyTo ? 'Write a reply...' : 'Add a comment...'}
              placeholderTextColor={mutedColor}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!commentText.trim() || submitting}
              style={[
                styles.sendBtn,
                {
                  opacity: commentText.trim() && !submitting ? 1 : 0.4,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.primary[500]} />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={colors.primary[500]}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 8,
  },
  loadingPost: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  commentsHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    borderTopWidth: 0.5,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  commentBody: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 12,
    padding: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentUser: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentTime: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 16,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  viewReplies: {
    color: colors.primary[500],
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
  },
  repliesContainer: {
    marginTop: 8,
    paddingLeft: 4,
  },
  replyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  inputBar: {
    borderTopWidth: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  replyBannerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    minHeight: 36,
  },
  sendBtn: {
    paddingBottom: 6,
  },
});
