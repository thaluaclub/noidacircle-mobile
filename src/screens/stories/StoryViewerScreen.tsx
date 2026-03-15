import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet,
  Dimensions, StatusBar, Animated, FlatList, PanResponder,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Avatar from '../../components/Avatar';
import useStoriesStore from '../../store/storiesStore';
import useAuthStore from '../../store/authStore';
import { storiesAPI } from '../../services/api';
import { timeAgo } from '../../utils/formatters';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000;
const VIEWERS_PANEL_HEIGHT = SCREEN_HEIGHT * 0.55;

interface Viewer {
  id: string;
  username: string;
  full_name: string | null;
  profile_image_url: string | null;
  is_verified: boolean;
  account_type: string;
}

export default function StoryViewerScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { groupIndex: initialGroupIndex = 0, storyIndex: initialStoryIndex = 0 } = route.params || {};

  const { groups, markViewed } = useStoriesStore();
  const currentUser = useAuthStore((s) => s.user);

  const [currentGroupIdx, setCurrentGroupIdx] = useState(initialGroupIndex);
  const [currentStoryIdx, setCurrentStoryIdx] = useState(initialStoryIndex);
  const [paused, setPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const viewersPanelAnim = useRef(new Animated.Value(0)).current;

  const currentGroup = groups[currentGroupIdx];
  const currentStory = currentGroup?.stories[currentStoryIdx];
  const isOwnStory = currentGroup?.user?.id === currentUser?.id;

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && !currentStory.is_viewed) {
      markViewed(currentStory.id);
    }
  }, [currentStory?.id]);

  // Progress bar animation
  useEffect(() => {
    if (!currentStory || paused || showViewers) return;

    progressAnim.setValue(0);
    const animation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) goNext();
    });

    return () => animation.stop();
  }, [currentGroupIdx, currentStoryIdx, paused, showViewers]);

  // Fetch viewers when panel opens
  useEffect(() => {
    if (showViewers && currentStory && isOwnStory) {
      fetchViewers();
    }
  }, [showViewers, currentStory?.id]);

  const fetchViewers = async () => {
    if (!currentStory) return;
    setLoadingViewers(true);
    try {
      const res = await storiesAPI.getViewers(currentStory.id);
      setViewers(res.data?.viewers || []);
    } catch (e) {
      console.error('Failed to fetch viewers:', e);
    } finally {
      setLoadingViewers(false);
    }
  };

  const openViewersPanel = useCallback(() => {
    if (!isOwnStory) return;
    setShowViewers(true);
    setPaused(true);
    Animated.spring(viewersPanelAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [isOwnStory, viewersPanelAnim]);

  const closeViewersPanel = useCallback(() => {
    Animated.timing(viewersPanelAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowViewers(false);
      setPaused(false);
    });
  }, [viewersPanelAnim]);

  // PanResponder for swipe up to open viewers
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return isOwnStory && gestureState.dy < -30 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) {
          openViewersPanel();
        }
      },
    })
  ).current;

  const goNext = useCallback(() => {
    if (!currentGroup) return;
    if (currentStoryIdx < currentGroup.stories.length - 1) {
      setCurrentStoryIdx(prev => prev + 1);
    } else if (currentGroupIdx < groups.length - 1) {
      setCurrentGroupIdx(prev => prev + 1);
      setCurrentStoryIdx(0);
    } else {
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
    if (showViewers) {
      closeViewersPanel();
      return;
    }
    if (side === 'left') goPrev();
    else goNext();
  }, [goPrev, goNext, showViewers, closeViewersPanel]);

  const handleLongPressIn = useCallback(() => {
    if (!showViewers) setPaused(true);
  }, [showViewers]);

  const handleLongPressOut = useCallback(() => {
    if (!showViewers) setPaused(false);
  }, [showViewers]);

  if (!currentGroup || !currentStory) return null;

  const isTextStory = currentStory.media_type === 'text';
  const isVideoStory = currentStory.media_type === 'video';

  const viewersPanelTranslateY = viewersPanelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [VIEWERS_PANEL_HEIGHT, 0],
  });

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
              contentFit="contain"
            />
          )}
        </View>
      ) : (
        <View style={StyleSheet.absoluteFillObject}>
          <Image
            source={{ uri: currentStory.image_url || '' }}
            style={StyleSheet.absoluteFillObject}
            contentFit="contain"
            transition={200}
          />
        </View>
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

      {/* Bottom bar — views count + swipe up hint */}
      <View style={styles.bottomInfo}>
        {isOwnStory && (
          <TouchableOpacity style={styles.viewsRow} onPress={openViewersPanel} activeOpacity={0.7}>
            <Ionicons name="eye-outline" size={18} color="#fff" />
            <Text style={styles.viewsText}>{currentStory.views_count} views</Text>
            <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tap areas */}
      <View style={styles.tapAreas} {...(isOwnStory ? panResponder.panHandlers : {})}>
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

      {/* Viewers Panel (WhatsApp-style bottom sheet) */}
      {showViewers && (
        <View style={StyleSheet.absoluteFillObject}>
          {/* Backdrop */}
          <TouchableWithoutFeedback onPress={closeViewersPanel}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          {/* Panel */}
          <Animated.View
            style={[
              styles.viewersPanel,
              { transform: [{ translateY: viewersPanelTranslateY }] },
            ]}
          >
            {/* Handle bar */}
            <View style={styles.panelHandle}>
              <View style={styles.handleBar} />
            </View>

            {/* Header */}
            <View style={styles.viewersPanelHeader}>
              <Text style={styles.viewersPanelTitle}>
                Viewed by {currentStory.views_count}
              </Text>
              <TouchableOpacity onPress={closeViewersPanel}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Viewers list */}
            {loadingViewers ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : viewers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="eye-off-outline" size={40} color="#ccc" />
                <Text style={styles.emptyText}>No viewers yet</Text>
              </View>
            ) : (
              <FlatList
                data={viewers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.viewerItem}>
                    <Avatar
                      uri={item.profile_image_url}
                      name={item.full_name || item.username}
                      size={44}
                    />
                    <View style={styles.viewerInfo}>
                      <View style={styles.viewerNameRow}>
                        <Text style={styles.viewerName} numberOfLines={1}>
                          {item.full_name || item.username}
                        </Text>
                        {item.is_verified && (
                          <Ionicons name="checkmark-circle" size={14} color="#3b82f6" style={{ marginLeft: 4 }} />
                        )}
                      </View>
                      <Text style={styles.viewerUsername} numberOfLines={1}>@{item.username}</Text>
                    </View>
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </Animated.View>
        </View>
      )}
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
  // Video
  videoPlaceholder: {
    flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center',
  },
  videoText: {
    color: 'rgba(255,255,255,0.5)', fontSize: 16, marginTop: 8,
  },
  // Gradients
  topGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 160,
  },
  gradientFill: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', opacity: 0.8,
  },
  bottomGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
  },
  gradientFillBottom: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', opacity: 0.6,
  },
  // Progress
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
  // Viewers panel
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  viewersPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: VIEWERS_PANEL_HEIGHT,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  panelHandle: {
    alignItems: 'center', paddingTop: 10, paddingBottom: 6,
  },
  handleBar: {
    width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2,
  },
  viewersPanelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  viewersPanelTitle: {
    fontSize: 16, fontWeight: '700', color: '#111',
  },
  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  loadingText: {
    color: '#999', fontSize: 14,
  },
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  emptyText: {
    color: '#999', fontSize: 14, marginTop: 8,
  },
  viewerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  viewerInfo: {
    marginLeft: 12, flex: 1,
  },
  viewerNameRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  viewerName: {
    fontSize: 15, fontWeight: '600', color: '#111',
  },
  viewerUsername: {
    fontSize: 13, color: '#888', marginTop: 1,
  },
});
