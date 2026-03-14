import React, { useState, useCallback, memo } from 'react';
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

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onLike?: () => void;
  onBookmark?: () => void;
  onComment?: () => void;
  onUserPress?: (userId: string) => void;
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
  dark = false,
  isVisible = false,
}: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [imageAspect, setImageAspect] = useState(4 / 3);
  const isLong = post.content.length > MAX_CONTENT_LENGTH;

  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const cardBg = dark ? colors.dark.card : '#ffffff';

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

  // Calculate image height from actual image dimensions
  const onImageLoad = useCallback((e: any) => {
    const { width, height } = e.source || {};
    if (width && height && width > 0) {
      setImageAspect(width / height);
    }
  }, []);

  const imageHeight = Math.min(MEDIA_WIDTH / imageAspect, 500);

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
        {post.title && (
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

      {/* Media - Video with autoplay */}
      {post.media_url && post.media_type === 'video' && (
        <View style={{ marginTop: 10 }}>
          <AutoPlayVideo
            uri={post.media_url}
            isVisible={isVisible}
            dark={dark}
            height={300}
          />
        </View>
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
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59,130,246,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  videoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 8,
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
