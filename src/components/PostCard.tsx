import React, { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Share,
  Modal,
  Alert,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import AutoPlayVideo from './AutoPlayVideo';
import { colors } from '../theme/colors';
import { timeAgo, formatCount } from '../utils/formatters';
import { postsAPI } from '../services/api';
import type { Post } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MEDIA_WIDTH = SCREEN_WIDTH - 32;
const MAX_CONTENT_LENGTH = 200;
const REEL_HEIGHT = Math.round(MEDIA_WIDTH * (16 / 9));

interface PollData {
  type: 'poll';
  options: string[];
  duration_hours: number;
  votes?: number[];
  total_votes?: number;
  voters?: Record<string, number>;
}

interface EventData {
  type: 'event';
  date: string;
  location: string;
}

interface QuoteData {
  type: 'quote';
  original_post_id: string;
}

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onLike?: () => void;
  onDownvote?: () => void;
  onBookmark?: () => void;
  onComment?: () => void;
  onUserPress?: (userId: string) => void;
  onReelPress?: (post: Post) => void;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
  onQuote?: (post: Post) => void;
  dark?: boolean;
  isVisible?: boolean;
}

// Image Carousel Component
function ImageCarousel({ urls, dark }: { urls: string[]; dark: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / MEDIA_WIDTH);
    setActiveIndex(index);
  }, []);

  const renderImage = useCallback(({ item }: { item: string }) => (
    <Image
      source={{ uri: item }}
      style={{ width: MEDIA_WIDTH, height: MEDIA_WIDTH * 0.75, borderRadius: 12 }}
      contentFit="cover"
      transition={200}
    />
  ), []);

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={flatListRef}
        data={urls}
        renderItem={renderImage}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, i) => i.toString()}
        snapToInterval={MEDIA_WIDTH}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: MEDIA_WIDTH,
          offset: MEDIA_WIDTH * index,
          index,
        })}
      />
      {/* Counter badge */}
      {urls.length > 1 && (
        <View style={styles.carouselCounter}>
          <Text style={styles.carouselCounterText}>{activeIndex + 1}/{urls.length}</Text>
        </View>
      )}
      {/* Dots */}
      {urls.length > 1 && urls.length <= 10 && (
        <View style={styles.carouselDots}>
          {urls.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === activeIndex ? colors.primary[500] : 'rgba(255,255,255,0.5)' },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// Quoted Post Embed Component
function QuotedPostEmbed({ post, dark, onPress }: { post: Post; dark: boolean; onPress?: () => void }) {
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;

  return (
    <TouchableOpacity
      style={[styles.quotedPost, { borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.quotedHeader}>
        <Avatar
          uri={post.user?.profile_image_url}
          name={post.user?.full_name || post.user?.username || '?'}
          size={20}
        />
        <Text style={[styles.quotedName, { color: textColor }]} numberOfLines={1}>
          {post.user?.full_name || post.user?.username}
        </Text>
        {post.user?.is_verified && (
          <Ionicons name="checkmark-circle" size={12} color={colors.primary[500]} />
        )}
        <Text style={[styles.quotedTime, { color: mutedColor }]}>· {timeAgo(post.created_at)}</Text>
      </View>
      {post.content ? (
        <Text style={[styles.quotedContent, { color: textColor }]} numberOfLines={3}>
          {post.content}
        </Text>
      ) : null}
      {post.media_url && post.media_type === 'image' && (
        <Image
          source={{ uri: post.media_url }}
          style={styles.quotedMedia}
          contentFit="cover"
          transition={200}
        />
      )}
    </TouchableOpacity>
  );
}

function PostCard({
  post,
  onPress,
  onLike,
  onDownvote,
  onBookmark,
  onComment,
  onUserPress,
  onReelPress,
  onEdit,
  onDelete,
  onQuote,
  dark = false,
  isVisible = false,
}: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [imageAspect, setImageAspect] = useState(4 / 3);
  const [votedIndex, setVotedIndex] = useState<number | null>(null);
  const [pollData, setPollData] = useState<PollData | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [viewRecorded, setViewRecorded] = useState(false);
  const isLong = post.content.length > MAX_CONTENT_LENGTH;

  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const cardBg = dark ? colors.dark.card : '#ffffff';

  // Record view when visible
  useEffect(() => {
    if (isVisible && !viewRecorded) {
      setViewRecorded(true);
      postsAPI.recordView(post.id).catch(() => {});
    }
  }, [isVisible, viewRecorded, post.id]);

  // Parse description data
  const parsedData = useMemo(() => {
    if (!post.description) return null;
    try {
      const parsed = JSON.parse(post.description);
      if (parsed.type === 'poll' || parsed.type === 'event' || parsed.type === 'quote') return parsed;
    } catch {}
    return null;
  }, [post.description]);

  const isPoll = post.category === 'poll' && parsedData?.type === 'poll';
  const isEvent = (post.category === 'events' || post.category === 'event') && parsedData?.type === 'event';
  const isQuote = parsedData?.type === 'quote';
  const isReel = post.media_url && post.media_type === 'video';
  const isCarousel = post.media_type === 'carousel' && post.media_url;

  // Parse carousel URLs
  const carouselUrls = useMemo(() => {
    if (!isCarousel || !post.media_url) return [];
    try {
      return JSON.parse(post.media_url) as string[];
    } catch {
      return [];
    }
  }, [isCarousel, post.media_url]);

  // Format views count
  const formatViews = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleShare = useCallback(async () => {
    try {
      const shareUrl = `https://noidacircle-api-backend.vercel.app/og/post/${post.id}`;
      const caption = post.content
        ? `${post.content.substring(0, 200)}${post.content.length > 200 ? '...' : ''}`
        : (post.title || 'Check out this post on NoidaCircle!');
      const userName = post.user?.full_name || post.user?.username || '';
      const message = `${caption}\n\n${userName ? `— ${userName}\n` : ''}Via NoidaCircle.com\n${shareUrl}`;

      await Share.share({
        message,
        url: post.media_url || shareUrl,
        title: userName ? `${userName} on NoidaCircle` : 'NoidaCircle',
      });
    } catch {}
  }, [post.id, post.content, post.title, post.media_url, post.user]);

  const displayContent =
    isLong && !expanded
      ? post.content.substring(0, MAX_CONTENT_LENGTH).trim() + '...'
      : post.content;

  const onImageLoad = useCallback((e: any) => {
    const { width, height } = e.source || {};
    if (width && height && width > 0) {
      setImageAspect(width / height);
    }
  }, []);

  const imageHeight = Math.min(MEDIA_WIDTH / imageAspect, 500);

  // Poll voting with real API
  const handleVote = useCallback(async (index: number) => {
    if (votedIndex !== null) return;
    setVotedIndex(index);
    try {
      const res = await postsAPI.vote(post.id, index);
      if (res.data?.poll) {
        setPollData(res.data.poll);
      }
    } catch {
      // Still show local vote even if API fails
    }
  }, [votedIndex, post.id]);

  // Load poll data on mount if poll
  useEffect(() => {
    if (isPoll) {
      postsAPI.getPoll(post.id).then(res => {
        const data = res.data;
        if (data) {
          setPollData(data);
          if (data.user_vote !== undefined && data.user_vote !== null) {
            setVotedIndex(data.user_vote);
          }
        }
      }).catch(() => {});
    }
  }, [isPoll, post.id]);

  // Render poll UI
  const renderPoll = () => {
    if (!isPoll) return null;
    const pd = pollData || parsedData as PollData;
    const options = pd?.options || [];
    const totalVotes = pd?.total_votes || 0;
    const votes = pd?.votes || [];

    return (
      <View style={styles.pollContainer}>
        {options.map((option, index) => {
          const isVoted = votedIndex === index;
          const hasVoted = votedIndex !== null;
          const voteCount = votes[index] || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.pollOption,
                { borderColor: isVoted ? colors.primary[500] : borderColor },
                hasVoted && { backgroundColor: dark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)' },
              ]}
              onPress={() => handleVote(index)}
              disabled={hasVoted}
              activeOpacity={0.7}
            >
              {hasVoted && (
                <View
                  style={[
                    styles.pollBar,
                    {
                      width: `${percentage}%`,
                      backgroundColor: isVoted ? 'rgba(59,130,246,0.15)' : 'rgba(150,150,150,0.1)',
                    },
                  ]}
                />
              )}
              <Text style={[styles.pollOptionText, { color: textColor }, isVoted && { fontWeight: '600' }]}>
                {option}
              </Text>
              {hasVoted && (
                <Text style={[styles.pollPercent, { color: mutedColor }]}>{percentage}%</Text>
              )}
              {isVoted && (
                <Ionicons name="checkmark-circle" size={16} color={colors.primary[500]} style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
          );
        })}
        <View style={styles.pollFooter}>
          <Ionicons name="bar-chart-outline" size={14} color={mutedColor} />
          <Text style={[styles.pollFooterText, { color: mutedColor }]}>
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''} · {votedIndex !== null ? 'You voted' : 'Tap to vote'}
          </Text>
        </View>
      </View>
    );
  };

  // Render event UI
  const renderEvent = () => {
    if (!isEvent) return null;
    const eventData = parsedData as EventData;

    return (
      <View style={[styles.eventContainer, { borderColor, backgroundColor: dark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)' }]}>
        <View style={styles.eventHeader}>
          <View style={[styles.eventIconBg, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
            <Ionicons name="calendar" size={20} color="#10b981" />
          </View>
          <Text style={[styles.eventLabel, { color: '#10b981' }]}>EVENT</Text>
        </View>
        {post.title && (
          <Text style={[styles.eventTitle, { color: textColor }]}>{post.title}</Text>
        )}
        {eventData.date ? (
          <View style={styles.eventDetailRow}>
            <Ionicons name="time-outline" size={16} color={mutedColor} />
            <Text style={[styles.eventDetailText, { color: textColor }]}>{eventData.date}</Text>
          </View>
        ) : null}
        {eventData.location ? (
          <View style={styles.eventDetailRow}>
            <Ionicons name="location-outline" size={16} color={mutedColor} />
            <Text style={[styles.eventDetailText, { color: textColor }]}>{eventData.location}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.container, { borderBottomColor: borderColor, backgroundColor: cardBg }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onUserPress?.(post.user_id)}
          style={styles.headerLeft}
          activeOpacity={0.7}
        >
          <Avatar
            uri={post.user.profile_image_url}
            name={post.user.full_name || post.user.username}
            size={40}
          />
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.username, { color: textColor }]} numberOfLines={1}>
                {post.user.full_name || post.user.username}
              </Text>
              {post.user.is_verified && (
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color={colors.primary[500]}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
            <Text style={[styles.handle, { color: mutedColor }]}>
              @{post.user.username} · {timeAgo(post.created_at)}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {!post.is_own && post.is_following === false && (
            <TouchableOpacity style={styles.followBtn}>
              <Text style={styles.followBtnText}>Follow</Text>
            </TouchableOpacity>
          )}
          {post.is_own && (
            <TouchableOpacity onPress={() => setShowMenu(true)} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="ellipsis-horizontal" size={20} color={mutedColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Post Options Menu */}
      {showMenu && (
        <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
            <View style={[styles.menuContent, { backgroundColor: dark ? colors.dark.card : '#fff' }]}>
              <TouchableOpacity style={[styles.menuItem, { borderBottomColor: borderColor }]} onPress={() => { setShowMenu(false); onEdit?.(post); }}>
                <Ionicons name="create-outline" size={20} color={colors.primary[500]} />
                <Text style={[styles.menuItemText, { color: textColor }]}>Edit Post</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, { borderBottomColor: borderColor }]} onPress={() => { setShowMenu(false); onBookmark?.(); }}>
                <Ionicons name={post.is_bookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color="#f59e0b" />
                <Text style={[styles.menuItemText, { color: textColor }]}>{post.is_bookmarked ? 'Remove Bookmark' : 'Bookmark'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, { borderBottomColor: borderColor }]} onPress={() => { setShowMenu(false); onQuote?.(post); }}>
                <Ionicons name="chatbox-outline" size={20} color="#8b5cf6" />
                <Text style={[styles.menuItemText, { color: textColor }]}>Quote Post</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => {
                setShowMenu(false);
                Alert.alert('Delete Post', 'Are you sure you want to delete this post? This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(post.id) },
                ]);
              }}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
                <Text style={[styles.menuItemText, { color: colors.error }]}>Delete Post</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuCancel, { borderTopColor: borderColor }]} onPress={() => setShowMenu(false)}>
                <Text style={[styles.menuCancelText, { color: mutedColor }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Content */}
      <View style={styles.contentSection}>
        {post.title && !isEvent && (
          <Text style={[styles.title, { color: textColor }]}>{post.title}</Text>
        )}
        <Text style={[styles.content, { color: textColor }]}>
          {displayContent}
        </Text>
        {isLong && !expanded && (
          <TouchableOpacity onPress={() => setExpanded(true)}>
            <Text style={styles.readMore}>Read more</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Poll UI */}
      {renderPoll()}

      {/* Event UI */}
      {renderEvent()}

      {/* Quoted Post */}
      {isQuote && post.quoted_post && (
        <View style={{ marginTop: 10, paddingHorizontal: 0 }}>
          <QuotedPostEmbed
            post={post.quoted_post}
            dark={dark}
            onPress={onPress}
          />
        </View>
      )}

      {/* Media - Single Image */}
      {post.media_url && post.media_type === 'image' && (
        <Image
          source={{ uri: post.media_url }}
          style={[styles.media, { height: imageHeight }]}
          contentFit="contain"
          transition={300}
          recyclingKey={post.id}
          onLoad={onImageLoad}
        />
      )}

      {/* Media - Image Carousel */}
      {isCarousel && carouselUrls.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <ImageCarousel urls={carouselUrls} dark={dark} />
        </View>
      )}

      {/* Media - Video/Reel with portrait aspect ratio */}
      {isReel && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onReelPress?.(post)}
          style={{ marginTop: 10 }}
        >
          <AutoPlayVideo
            uri={post.media_url!}
            isVisible={isVisible}
            dark={dark}
            height={REEL_HEIGHT}
          />
          {/* Reel badge */}
          <View style={styles.reelBadge}>
            <Ionicons name="videocam" size={12} color="#fff" />
            <Text style={styles.reelBadgeText}>Reel</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Views count */}
      {post.shares_count > 0 && (
        <View style={styles.viewsRow}>
          <Ionicons name="eye-outline" size={14} color={mutedColor} />
          <Text style={[styles.viewsText, { color: mutedColor }]}>{formatViews(post.shares_count)} views</Text>
        </View>
      )}

      {/* Action Bar - Upvote/Downvote + Comment + Share + Bookmark */}
      <View style={styles.actionBar}>
        {/* Upvote/Downvote pill */}
        <View style={[styles.votePill, { backgroundColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
          <TouchableOpacity
            onPress={onLike}
            style={styles.voteBtn}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={post.is_liked ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
              size={22}
              color={post.is_liked ? colors.primary[500] : mutedColor}
            />
          </TouchableOpacity>
          <Text style={[styles.voteCount, { color: textColor }]}>
            {formatCount(Math.max(0, post.likes_count - (post.downvotes_count || 0)))}
          </Text>
          <TouchableOpacity
            onPress={onDownvote}
            style={styles.voteBtn}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={post.is_downvoted ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
              size={22}
              color={post.is_downvoted ? '#ef4444' : mutedColor}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={onComment}
          style={styles.actionBtn}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chatbubble-outline" size={20} color={mutedColor} />
          {post.comments_count > 0 && (
            <Text style={[styles.actionCount, { color: mutedColor }]}>
              {formatCount(post.comments_count)}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShare}
          style={styles.actionBtn}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="share-outline" size={20} color={mutedColor} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onBookmark}
          style={styles.actionBtn}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={post.is_bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={post.is_bookmarked ? colors.primary[500] : mutedColor}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default memo(PostCard);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerInfo: {
    marginLeft: 10,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
    maxWidth: 180,
  },
  handle: {
    fontSize: 13,
    marginTop: 1,
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
    marginLeft: 8,
  },
  followBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  contentSection: {
    marginTop: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
  },
  readMore: {
    color: colors.primary[500],
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  media: {
    width: MEDIA_WIDTH,
    borderRadius: 12,
    marginTop: 10,
    backgroundColor: colors.light.border,
    overflow: 'hidden',
  },
  // Carousel styles
  carouselContainer: {
    position: 'relative',
  },
  carouselCounter: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  carouselCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Views row
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingLeft: 2,
  },
  viewsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Quoted post styles
  quotedPost: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  quotedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  quotedName: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 120,
  },
  quotedTime: {
    fontSize: 12,
  },
  quotedContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  quotedMedia: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
  // Poll styles
  pollContainer: {
    marginTop: 12,
  },
  pollOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  pollBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 10,
  },
  pollOptionText: {
    fontSize: 15,
    flex: 1,
  },
  pollPercent: {
    fontSize: 13,
    fontWeight: '600',
  },
  pollFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  pollFooterText: {
    fontSize: 12,
  },
  // Event styles
  eventContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  eventIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  eventDetailText: {
    fontSize: 14,
  },
  // Reel badge
  reelBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  reelBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  // Action bar with vote pill
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingRight: 16,
  },
  votePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  voteBtn: {
    padding: 4,
  },
  voteCount: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Menu styles
  menuOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    gap: 14,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuCancel: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 0.5,
    marginTop: 4,
  },
  menuCancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
