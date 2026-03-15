import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet,
  Dimensions, StatusBar, Animated, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '../../components/Avatar';
import useStoriesStore, { Story, StoryGroup } from '../../store/storiesStore';
import useAuthStore from '../../store/authStore';
import { timeAgo } from '../../utils/formatters';
import { colors } from '../../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds for image/text

export default function StoryViewerScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { groupIndex: initialGroupIndex = 0, storyIndex: initialStoryIndex = 0 } = route.params || {};

  const { groups, markViewed } = useStoriesStore();
  const currentUser = useAuthStore((s) => s.user);

  const [currentGroupIdx, setCurrentGroupIdx] = useState(initialGroupIndex);
  const [currentStoryIdx, setCurrentStoryIdx] = useState(initialStoryIndex);
  const [paused, setPaused] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<any>(null);

  const currentGroup = groups[currentGroupIdx];
  const currentStory = currentGroup?.stories[currentStoryIdx];

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && !currentStory.is_viewed) {
      markViewed(currentStory.id);
    }
  }, [currentStory?.id]);

  // Progress bar animation
  useEffect(() => {
    if (!currentStory || paused) return;

    progressAnim.setValue(0);
    const animation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        goNext();
      }
    });

    return () => {
      animation.stop();
    };
  }, [currentGroupIdx, currentStoryIdx, paused]);

  const goNext = useCallback(() => {
    if (!currentGroup) return;

    if (currentStoryIdx < currentGroup.stories.length - 1) {
      // Next story in same group
      setCurrentStoryIdx(prev => prev + 1);
    } else if (currentGroupIdx < groups.length - 1) {
      // Next group
      setCurrentGroupIdx(prev => prev + 1);
      setCurrentStoryIdx(0);
    } else {
      // End of all stories
      navigation.goBack();
    }
  }, [currentGroup, currentStoryIdx, currentGroupIdx, groups.length, navigation]);

  const goPrev = useCallback(() => {
    if (currentStoryIdx > 0) {
      setCurrentStoryIdx(prev => prev - 1);
    } else if (currentGroupIdx > 0) {
      const prevGroup = groups[currentGroupIdx - 1];
      setCurrentGroupIdx(prev => prev - 1);
      setCurrentStoryIdx(prevGroup.stories.length - 1);
    }
  }, [currentStoryIdx, currentGroupIdx, groups]);

  const handleTap = useCallback((side: 'left' | 'right') => {
    if (side === 'left') {
      goPrev();
    } else {
      goNext();
    }
  }, [goPrev, goNext]);

  const handleLongPressIn = useCallback(() => {
    setPaused(true);
  }, []);

  const handleLongPressOut = useCallback(() => {
    setPaused(false);
  }, []);

  if (!currentGroup || !currentStory) {
    return null;
  }

  const isTextStory = currentStory.media_type === 'text';
  const isVideoStory = currentStory.media_type === 'video';
  const isOwnStory = currentGroup.user.id === currentUser?.id;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Story Content */}
      {isTextStory ? (
        <View style={[styles.textStoryBg, { backgroundColor: currentStory.bg_color || '#3b82f6' }]}>
          <Text style={styles.textStoryContent}>{currentStory.text_content}</Text>
        </View>
      ) : isVideoStory ? (
        <View style={styles.videoPlaceholder}>
          <Ionicons name="videocam" size={48} color="rgba(255,255,255,0.5)" />
          <Text style={styles.videoText}>Video Story</Text>
          {currentStory.video_url && (
            <Image
              source={{ uri: currentStory.video_url }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
          )}
        </View>
      ) : (
        <Image
          source={{ uri: currentStory.image_url || '' }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={200}
        />
      )}

      {/* Top gradient overlay */}
      <View style={styles.topGradient} pointerEvents="none">
        <View style={styles.gradientFill} />
      </View>

      {/* Bottom gradient overlay */}
      <View style={styles.bottomGradient} pointerEvents="none">
        <View style={styles.gradientFillBottom} />
      </View>

      {/* Progress bars */}
      <View style={styles.progressContainer}>
        {currentGroup.stories.map((_, idx) => (
          <View key={idx} style={styles.progressBarBg}>
            {idx < currentStoryIdx ? (
              <View style={[styles.progressBarFill, { width: '100%' }]} />
            ) : idx === currentStoryIdx ? (
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            ) : null}
          </View>
        ))}
      </View>

      {/* User info */}
      <View style={styles.userInfo}>
        <Avatar
          uri={currentGroup.user.profile_image_url}
          name={currentGroup.user.full_name || currentGroup.user.username}
          size={36}
        />
        <View style={styles.userTextInfo}>
          <Text style={styles.userName}>
            {currentGroup.user.full_name || currentGroup.user.username}
          </Text>
          <Text style={styles.storyTime}>{timeAgo(currentStory.created_at)}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Caption */}
      {currentStory.caption && !isTextStory && (
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>{currentStory.caption}</Text>
        </View>
      )}

      {/* Bottom info */}
      <View style={styles.bottomInfo}>
        {isOwnStory && (
          <View style={styles.viewsRow}>
            <Ionicons name="eye-outline" size={18} color="#fff" />
            <Text style={styles.viewsText}>{currentStory.views_count} views</Text>
          </View>
        )}
      </View>

      {/* Tap areas */}
      <View style={styles.tapAreas}>
        <TouchableWithoutFeedback
          onPress={() => handleTap('left')}
          onLongPress={handleLongPressIn}
          onPressOut={handleLongPressOut}
        >
          <View style={styles.tapLeft} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback
          onPress={() => handleTap('right')}
          onLongPress={handleLongPressIn}
          onPressOut={handleLongPressOut}
        >
          <View style={styles.tapRight} />
        </TouchableWithoutFeedback>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#000',
  },
  // Text story
  textStoryBg: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  textStoryContent: {
    color: '#fff', fontSize: 28, fontWeight: '700', textAlign: 'center', lineHeight: 38,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  // Video placeholder
  videoPlaceholder: {
    flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
  },
  videoText: {
    color: 'rgba(255,255,255,0.5)', fontSize: 16, marginTop: 8,
  },
  // Gradients
  topGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 160,
  },
  gradientFill: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    opacity: 0.8,
  },
  bottomGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
  },
  gradientFillBottom: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    opacity: 0.6,
  },
  // Progress bars
  progressContainer: {
    position: 'absolute', top: 50, left: 8, right: 8,
    flexDirection: 'row', gap: 3,
  },
  progressBarBg: {
    flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', backgroundColor: '#fff', borderRadius: 2,
  },
  // User info
  userInfo: {
    position: 'absolute', top: 62, left: 12, right: 12,
    flexDirection: 'row', alignItems: 'center',
  },
  userTextInfo: { marginLeft: 10, flex: 1 },
  userName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  storyTime: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
  closeBtn: { padding: 4 },
  // Caption
  captionContainer: {
    position: 'absolute', bottom: 80, left: 16, right: 16,
  },
  captionText: {
    color: '#fff', fontSize: 16, fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  // Bottom
  bottomInfo: {
    position: 'absolute', bottom: 40, left: 16, right: 16,
  },
  viewsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewsText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  // Tap areas
  tapAreas: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  tapLeft: { flex: 1 },
  tapRight: { flex: 2 },
});
