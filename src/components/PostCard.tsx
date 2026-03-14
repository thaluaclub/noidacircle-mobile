import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import AutoPlayVideo from './AutoPlayVideo';
import { colors } from '../theme/colors';
import { timeAgo, formatCount } from '../utils/formatters';
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
}

interface EventData {
  type: 'event';
  date: string;
  location: string;
}

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onLike?: () => void;
  onBookmark?: () => void;
  onComment?: () => void;
  onUserPress?: (userId: string) => void;
  onReelPress?: (post: Post) => void;
  dark?: boolean;
  isVisible?: boolean;
}

function PostCard({
  post,
  onPress,
  onLike,
  onBookmark,
  onComment,
  onUserPress,
  onReelPress,
  dark = false,
  isVisible = false,
}: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [imageAspect, setImageAspect] = useState(4 / 3);
  const [votedIndex, setVotedIndex] = useState<number | null>(null);
  const isLong = post.content.length > MAX_CONTENT_LENGTH;

  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const cardBg = dark ? colors.dark.card : '#ffffff';

  // Parse poll/event data from description
  const parsedData = useMemo(() => {
    if (!post.description) return null;
    try {
      const parsed = JSON.parse(post.description);
      if (parsed.type === 'poll' || parsed.type === 'event') return parsed;
    } catch {}
    return null;
  }, [post.description]);

  const isPoll = post.category === 'poll' && parsedData?.type === 'poll';
  const isEvent = (post.category === 'events' || post.category === 'event') && parsedData?.type === 'event';
  const isReel = post.media_url && post.media_type === 'video';

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${post.content.substring(0, 100)}... — NoidaCircle`,
      });
    } catch {}
  }, [post.content]);

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

  const handleVote = useCallback((index: number) => {
    if (votedIndex !== null) return;
    setVotedIndex(index);
  }, [votedIndex]);

  // Render poll UI
  const renderPoll = () => {
    if (!isPoll) return null;
    const pollData = parsedData as PollData;
    const options = pollData.options || [];
    const totalVotes = votedIndex !== null ? options.length : 0;

    return (
      <View style={styles.pollContainer}>
        {options.map((option, index) => {
          const isVoted = votedIndex === index;
          const hasVoted = votedIndex !== null;
          const percentage = hasVoted ? Math.round((1 / options.length) * 100) : 0;

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
            {votedIndex !== null ? 'You voted' : 'Tap to vote'} · {pollData.duration_hours}h poll
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

        {!post.is_own && post.is_following === false && (
          <TouchableOpacity style={styles.followBtn}>
            <Text style={styles.followBtnText}>Follow</Text>
          </TouchableOpacity>
        )}
      </View>

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

      {/* Media - Image */}
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

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          onPress={onLike}
          style={styles.actionBtn}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={post.is_liked ? 'heart' : 'heart-outline'}
            size={22}
            color={post.is_liked ? colors.error : mutedColor}
          />
          {post.likes_count > 0 && (
            <Text
              style={[
                styles.actionCount,
                { color: post.is_liked ? colors.error : mutedColor },
              ]}
            >
              {formatCount(post.likes_count)}
            </Text>
          )}
        </TouchableOpacity>

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
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingRight: 16,
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
});
