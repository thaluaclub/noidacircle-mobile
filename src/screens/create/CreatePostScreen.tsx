import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import usePostsStore from '../../store/postsStore';
import { postsAPI } from '../../services/api';
import { uploadFile, getMimeType } from '../../services/upload';
import { colors } from '../../theme/colors';
import Avatar from '../../components/Avatar';
import useKeyboardHeight from '../../hooks/useKeyboardHeight';
import type { CreatePostData } from '../../types';

const MAX_CONTENT_LENGTH = 2000;
const MAX_POLL_OPTIONS = 4;
const MAX_IMAGES = 10;

type PostMode = 'post' | 'story' | 'poll' | 'event';

interface PollOption {
  id: number;
  text: string;
}

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
}

export default function CreatePostScreen() {
  const dark = useThemeStore((s) => s.dark);
  const user = useAuthStore((s) => s.user);
  const { addPost } = usePostsStore();
  const navigation = useNavigation();

  // Core state
  const [content, setContent] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [postMode, setPostMode] = useState<PostMode>('post');

  // Image picker modal
  const [showImagePicker, setShowImagePicker] = useState(false);
  // Reel picker modal
  const [showReelPicker, setShowReelPicker] = useState(false);

  // Poll state
  const [pollOptions, setPollOptions] = useState<PollOption[]>([
    { id: 1, text: '' },
    { id: 2, text: '' },
  ]);
  const [pollDuration, setPollDuration] = useState('24');

  // Event state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  const keyboardHeight = useKeyboardHeight();

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const cardBg = dark ? colors.dark.card : '#f5f5f5';

  const hasVideo = mediaItems.some(m => m.type === 'video');
  const hasImages = mediaItems.some(m => m.type === 'image');

  const hasContent = content.trim().length > 0;
  const hasMedia = mediaItems.length > 0;
  const hasPollData = postMode === 'poll' && pollOptions.filter(o => o.text.trim()).length >= 2;
  const hasEventData = postMode === 'event' && eventTitle.trim().length > 0;
  const canPublish = (hasContent || hasMedia || hasPollData || hasEventData) && !publishing;

  // ---- Multi-Image Handlers ----
  const pickImagesFromGallery = useCallback(async () => {
    setShowImagePicker(false);
    try {
      if (hasVideo) {
        Alert.alert('Cannot mix', 'Remove video first to add images');
        return;
      }
      const remainingSlots = MAX_IMAGES - mediaItems.length;
      if (remainingSlots <= 0) {
        Alert.alert('Limit reached', `You can add up to ${MAX_IMAGES} images`);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.7,
      });
      if (!result.canceled && result.assets.length > 0) {
        const newItems: MediaItem[] = result.assets.map(a => ({ uri: a.uri, type: 'image' as const }));
        setMediaItems(prev => [...prev, ...newItems].slice(0, MAX_IMAGES));
      }
    } catch (err: any) {
      Alert.alert('Error', 'Could not open gallery: ' + (err.message || 'Unknown error'));
    }
  }, [hasVideo, mediaItems.length]);

  const takePhotoFromCamera = useCallback(async () => {
    setShowImagePicker(false);
    try {
      if (hasVideo) {
        Alert.alert('Cannot mix', 'Remove video first to add images');
        return;
      }
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setMediaItems(prev => [...prev, { uri: result.assets[0].uri, type: 'image' }].slice(0, MAX_IMAGES));
      }
    } catch (err: any) {
      Alert.alert('Error', 'Could not open camera: ' + (err.message || 'Unknown error'));
    }
  }, [hasVideo]);

  // ---- Reel/Video Handlers ----
  const pickVideoFromGallery = useCallback(async () => {
    setShowReelPicker(false);
    try {
      if (mediaItems.length > 0) {
        Alert.alert('Cannot mix', 'Remove existing media first to add a video');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.7,
        videoMaxDuration: 120,
      });
      if (!result.canceled && result.assets[0]) {
        setMediaItems([{ uri: result.assets[0].uri, type: 'video' }]);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Could not pick video: ' + (err.message || 'Unknown error'));
    }
  }, [mediaItems.length]);

  const recordVideoFromCamera = useCallback(async () => {
    setShowReelPicker(false);
    try {
      if (mediaItems.length > 0) {
        Alert.alert('Cannot mix', 'Remove existing media first to add a video');
        return;
      }
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        quality: 0.7,
        videoMaxDuration: 60,
      });
      if (!result.canceled && result.assets[0]) {
        setMediaItems([{ uri: result.assets[0].uri, type: 'video' }]);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Could not record video: ' + (err.message || 'Unknown error'));
    }
  }, [mediaItems.length]);

  const removeMedia = useCallback((index: number) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeAllMedia = useCallback(() => {
    setMediaItems([]);
  }, []);

  // ---- Poll Handlers ----
  const addPollOption = useCallback(() => {
    if (pollOptions.length >= MAX_POLL_OPTIONS) return;
    setPollOptions(prev => [...prev, { id: Date.now(), text: '' }]);
  }, [pollOptions.length]);

  const removePollOption = useCallback((id: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(prev => prev.filter(o => o.id !== id));
  }, [pollOptions.length]);

  const updatePollOption = useCallback((id: number, text: string) => {
    setPollOptions(prev => prev.map(o => o.id === id ? { ...o, text } : o));
  }, []);

  // ---- Upload all media ----
  const uploadAllMedia = async (): Promise<{ urls: string[]; type: 'image' | 'video' } | null> => {
    if (mediaItems.length === 0) return null;
    try {
      const urls: string[] = [];
      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        setUploadProgress(`Uploading ${i + 1}/${mediaItems.length}...`);
        const mimeType = getMimeType(item.uri);
        const url = await uploadFile(item.uri, item.type === 'video' ? 'reels' : 'posts', mimeType);
        urls.push(url);
      }
      return { urls, type: mediaItems[0].type };
    } catch (err: any) {
      throw err;
    }
  };

  // ---- Publish ----
  const handlePublish = useCallback(async () => {
    if (!canPublish) return;
    if (publishing) return;

    setPublishing(true);
    setUploadProgress('');

    try {
      let mediaResult: { urls: string[]; type: 'image' | 'video' } | null = null;

      if (mediaItems.length > 0) {
        try {
          setUploadProgress('Uploading media...');
          mediaResult = await uploadAllMedia();
        } catch (uploadErr: any) {
          const uploadMsg = uploadErr.message || 'Media upload failed';
          Alert.alert('Upload Error', uploadMsg, [
            { text: 'Cancel', style: 'cancel', onPress: () => { setPublishing(false); setUploadProgress(''); } },
            { text: 'Post without media', onPress: () => createPost(undefined, undefined) },
          ]);
          return;
        }
      }

      await createPost(
        mediaResult ? (mediaResult.urls.length === 1 ? mediaResult.urls[0] : JSON.stringify(mediaResult.urls)) : undefined,
        mediaResult ? (mediaResult.urls.length > 1 ? 'carousel' : mediaResult.type) : undefined
      );

    } catch (err: any) {
      setPublishing(false);
      setUploadProgress('');
      const msg = err.response?.data?.error || err.message || 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    }
  }, [canPublish, publishing, content, mediaItems, postMode, pollOptions, pollDuration, eventTitle, eventDate, eventLocation, user, addPost, navigation]);

  const createPost = async (mediaUrl?: string, uploadMediaType?: 'image' | 'video' | 'carousel') => {
    try {
      setUploadProgress('Publishing...');

      const finalContent = content.trim() || ' ';

      const postData: CreatePostData = {
        content: finalContent,
        visibility: postMode === 'story' ? 'followers' : 'public',
      };

      if (mediaUrl) {
        postData.media_url = mediaUrl;
        postData.media_type = uploadMediaType as any;
        if (uploadMediaType === 'video' && !postData.category) {
          postData.category = 'reel';
        }
      }

      if (postMode === 'poll') {
        const validOptions = pollOptions.filter(o => o.text.trim());
        if (validOptions.length >= 2) {
          postData.category = 'poll';
          postData.description = JSON.stringify({
            type: 'poll',
            options: validOptions.map(o => o.text.trim()),
            duration_hours: parseInt(pollDuration, 10),
          });
        }
      }

      if (postMode === 'event') {
        postData.category = 'events';
        if (eventTitle) postData.title = eventTitle;
        postData.description = JSON.stringify({
          type: 'event',
          date: eventDate,
          location: eventLocation,
        });
      }

      if (postMode === 'story') {
        postData.category = 'story';
      }

      const res = await postsAPI.create(postData);
      const newPost = res.data;

      if (!newPost || !newPost.id) {
        throw new Error('Post created but invalid response from server');
      }

      addPost({
        ...newPost,
        user: newPost.user || {
          id: user?.id || '',
          username: user?.username || '',
          full_name: user?.full_name || user?.display_name || null,
          profile_image_url: user?.profile_image_url || user?.avatar_url || null,
          is_verified: user?.is_verified || false,
        },
        is_liked: false,
        is_following: null,
        is_own: true,
        is_bookmarked: false,
        is_downvoted: false,
        downvotes_count: 0,
      });

      // Reset all state
      setContent('');
      setMediaItems([]);
      setUploadProgress('');
      setPostMode('post');
      setPollOptions([{ id: 1, text: '' }, { id: 2, text: '' }]);
      setEventTitle('');
      setEventDate('');
      setEventLocation('');
      setPublishing(false);

      const label = postMode === 'story' ? 'Story' : postMode === 'event' ? 'Event' : 'Post';
      Alert.alert(`${label} Published!`, `Your ${label.toLowerCase()} is now live.`, [
        { text: 'OK', onPress: () => { if (navigation.canGoBack()) navigation.goBack(); } },
      ]);
    } catch (err: any) {
      setPublishing(false);
      setUploadProgress('');
      const msg = err.response?.data?.error || err.message || 'Failed to publish. Please try again.';
      Alert.alert('Publish Error', msg);
    }
  };

  // ---- Bottom Sheet Modal ----
  const renderPickerModal = (visible: boolean, onClose: () => void, title: string, options: { icon: string; label: string; onPress: () => void }[]) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalContent, { backgroundColor: dark ? colors.dark.card : '#fff' }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: textColor }]}>{title}</Text>
          {options.map((opt, i) => (
            <TouchableOpacity key={i} style={[styles.modalOption, { borderBottomColor: borderColor }]} onPress={opt.onPress} activeOpacity={0.7}>
              <Ionicons name={opt.icon as any} size={24} color={colors.primary[500]} />
              <Text style={[styles.modalOptionText, { color: textColor }]}>{opt.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={mutedColor} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
            <Text style={[styles.modalCancelText, { color: mutedColor }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={publishing}>
          <Text style={[styles.cancelText, { color: mutedColor }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          {postMode === 'post' ? 'New Post' : postMode === 'story' ? 'New Story' : postMode === 'poll' ? 'Create Poll' : 'Create Event'}
        </Text>
        <TouchableOpacity onPress={handlePublish} disabled={!canPublish} style={[styles.publishBtn, { opacity: canPublish ? 1 : 0.4 }]}>
          {publishing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.publishBtnText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Upload progress */}
          {publishing && uploadProgress ? (
            <View style={styles.progressBar}>
              <ActivityIndicator size="small" color={colors.primary[500]} />
              <Text style={[styles.progressText, { color: mutedColor }]}>{uploadProgress}</Text>
            </View>
          ) : null}

          {/* Composer */}
          <View style={styles.composerRow}>
            <Avatar uri={user?.avatar_url || null} name={user?.display_name || user?.username || 'U'} size={40} />
            <TextInput
              style={[styles.textInput, { color: textColor }]}
              placeholder={
                postMode === 'poll' ? 'Ask a question...' :
                postMode === 'event' ? 'Describe your event...' :
                postMode === 'story' ? 'Share your story...' :
                "What's happening in Noida?"
              }
              placeholderTextColor={mutedColor}
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={MAX_CONTENT_LENGTH}
              autoFocus
              editable={!publishing}
            />
          </View>

          {/* Character count */}
          <Text style={[styles.charCount, { color: content.length > MAX_CONTENT_LENGTH * 0.9 ? colors.error : mutedColor }]}>
            {content.length}/{MAX_CONTENT_LENGTH}
          </Text>

          {/* Poll Options */}
          {postMode === 'poll' && (
            <View style={styles.pollSection}>
              {pollOptions.map((opt, index) => (
                <View key={opt.id} style={[styles.pollOptionRow, { borderColor }]}>
                  <TextInput
                    style={[styles.pollInput, { color: textColor }]}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={mutedColor}
                    value={opt.text}
                    onChangeText={(t) => updatePollOption(opt.id, t)}
                    maxLength={50}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity onPress={() => removePollOption(opt.id)}>
                      <Ionicons name="close-circle" size={20} color={mutedColor} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {pollOptions.length < MAX_POLL_OPTIONS && (
                <TouchableOpacity style={styles.addOptionBtn} onPress={addPollOption}>
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary[500]} />
                  <Text style={{ color: colors.primary[500], fontSize: 14, fontWeight: '500' }}>Add option</Text>
                </TouchableOpacity>
              )}
              <View style={[styles.pollDurationRow, { borderColor }]}>
                <Ionicons name="time-outline" size={18} color={mutedColor} />
                <Text style={[{ color: mutedColor, fontSize: 13, marginLeft: 6 }]}>Poll duration:</Text>
                {['6', '12', '24', '48'].map(h => (
                  <TouchableOpacity
                    key={h}
                    onPress={() => setPollDuration(h)}
                    style={[styles.durationChip, pollDuration === h && { backgroundColor: colors.primary[500] }]}
                  >
                    <Text style={[styles.durationText, pollDuration === h && { color: '#fff' }]}>{h}h</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Event Fields */}
          {postMode === 'event' && (
            <View style={styles.eventSection}>
              <TextInput
                style={[styles.eventInput, { color: textColor, borderColor }]}
                placeholder="Event title"
                placeholderTextColor={mutedColor}
                value={eventTitle}
                onChangeText={setEventTitle}
              />
              <TextInput
                style={[styles.eventInput, { color: textColor, borderColor }]}
                placeholder="Date & Time (e.g. 25 Mar 2026, 6:00 PM)"
                placeholderTextColor={mutedColor}
                value={eventDate}
                onChangeText={setEventDate}
              />
              <TextInput
                style={[styles.eventInput, { color: textColor, borderColor }]}
                placeholder="Location (e.g. Sector 18, Noida)"
                placeholderTextColor={mutedColor}
                value={eventLocation}
                onChangeText={setEventLocation}
              />
            </View>
          )}

          {/* Multi-image preview grid */}
          {mediaItems.length > 0 && !hasVideo && (
            <View style={styles.mediaGridContainer}>
              <View style={[styles.mediaGrid, {
                flexDirection: 'row',
                flexWrap: 'wrap',
              }]}>
                {mediaItems.map((item, i) => (
                  <View key={i} style={styles.mediaGridItem}>
                    <Image source={{ uri: item.uri }} style={styles.gridImage} contentFit="cover" transition={200} />
                    <TouchableOpacity onPress={() => removeMedia(i)} style={styles.gridRemoveBtn} disabled={publishing}>
                      <Ionicons name="close-circle" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {mediaItems.length < MAX_IMAGES && (
                  <TouchableOpacity
                    style={[styles.addMoreBtn, { borderColor }]}
                    onPress={() => setShowImagePicker(true)}
                    disabled={publishing}
                  >
                    <Ionicons name="add" size={28} color={mutedColor} />
                    <Text style={[styles.addMoreText, { color: mutedColor }]}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.mediaGridFooter}>
                <Text style={[styles.mediaCountText, { color: mutedColor }]}>
                  {mediaItems.length} image{mediaItems.length !== 1 ? 's' : ''} selected
                  {mediaItems.length > 1 ? ' (carousel)' : ''}
                </Text>
                <TouchableOpacity onPress={removeAllMedia} disabled={publishing}>
                  <Text style={styles.removeAllText}>Remove all</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Video preview */}
          {hasVideo && mediaItems.length === 1 && (
            <View style={styles.mediaPreview}>
              <View style={[styles.previewImage, styles.videoPreview]}>
                <Ionicons name="videocam" size={40} color="#fff" />
                <Text style={styles.videoPreviewText}>Video selected</Text>
              </View>
              <TouchableOpacity onPress={() => removeMedia(0)} style={styles.removeMediaBtn} disabled={publishing}>
                <Ionicons name="close-circle" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={styles.mediaTypeBadge}>
                <Ionicons name="videocam" size={14} color="#fff" />
                <Text style={styles.mediaTypeBadgeText}>Reel</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom toolbar */}
        <View style={[styles.toolbar, { borderTopColor: borderColor, backgroundColor: bg, marginBottom: keyboardHeight > 0 ? keyboardHeight : 0 }]}>
          <TouchableOpacity
            onPress={() => { setPostMode('post'); setShowImagePicker(true); }}
            style={[styles.toolBtn, hasImages && styles.toolBtnActive]}
            disabled={publishing}
          >
            <Ionicons name="image" size={22} color={colors.primary[500]} />
            <Text style={[styles.toolLabel, { color: mutedColor }]}>
              {mediaItems.length > 0 && hasImages ? `${mediaItems.length}/${MAX_IMAGES}` : 'Image'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setPostMode('post'); setShowReelPicker(true); }}
            style={[styles.toolBtn, hasVideo && styles.toolBtnActive]}
            disabled={publishing}
          >
            <Ionicons name="videocam" size={22} color="#e11d48" />
            <Text style={[styles.toolLabel, { color: mutedColor }]}>Reel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setPostMode(postMode === 'story' ? 'post' : 'story'); setShowImagePicker(true); }}
            style={[styles.toolBtn, postMode === 'story' && styles.toolBtnActive]}
            disabled={publishing}
          >
            <Ionicons name="add-circle" size={22} color="#8b5cf6" />
            <Text style={[styles.toolLabel, { color: mutedColor }]}>Story</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPostMode(postMode === 'poll' ? 'post' : 'poll')}
            style={[styles.toolBtn, postMode === 'poll' && styles.toolBtnActive]}
            disabled={publishing}
          >
            <Ionicons name="bar-chart" size={22} color="#f59e0b" />
            <Text style={[styles.toolLabel, { color: mutedColor }]}>Poll</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPostMode(postMode === 'event' ? 'post' : 'event')}
            style={[styles.toolBtn, postMode === 'event' && styles.toolBtnActive]}
            disabled={publishing}
          >
            <Ionicons name="calendar" size={22} color="#10b981" />
            <Text style={[styles.toolLabel, { color: mutedColor }]}>Event</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Image Picker Modal */}
      {renderPickerModal(showImagePicker, () => setShowImagePicker(false), 'Add Photo', [
        { icon: 'images-outline', label: 'Choose from Gallery', onPress: pickImagesFromGallery },
        { icon: 'camera-outline', label: 'Take a Photo', onPress: takePhotoFromCamera },
      ])}

      {/* Reel Picker Modal */}
      {renderPickerModal(showReelPicker, () => setShowReelPicker(false), 'Add Reel', [
        { icon: 'film-outline', label: 'Choose from Gallery', onPress: pickVideoFromGallery },
        { icon: 'videocam-outline', label: 'Record Video', onPress: recordVideoFromCamera },
      ])}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5,
  },
  cancelText: { fontSize: 16, fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  publishBtn: {
    backgroundColor: colors.primary[500], paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 20, minWidth: 60, alignItems: 'center',
  },
  publishBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  body: { flex: 1, paddingHorizontal: 16 },
  progressBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 8 },
  progressText: { fontSize: 13, fontWeight: '500' },
  composerRow: { flexDirection: 'row', paddingTop: 16, alignItems: 'flex-start' },
  textInput: { flex: 1, fontSize: 16, lineHeight: 24, marginLeft: 12, minHeight: 100, textAlignVertical: 'top', paddingTop: 8 },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 4, marginBottom: 8 },

  // Poll
  pollSection: { marginTop: 8 },
  pollOptionRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8, gap: 8,
  },
  pollInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
  addOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  pollDurationRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 12,
    borderTopWidth: 0.5, gap: 4,
  },
  durationChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.06)', marginLeft: 4,
  },
  durationText: { fontSize: 12, fontWeight: '600', color: '#666' },

  // Event
  eventSection: { marginTop: 8, gap: 10 },
  eventInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },

  // Multi-image grid
  mediaGridContainer: { marginTop: 12 },
  mediaGrid: { gap: 8 },
  mediaGridItem: { width: '30%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', position: 'relative', marginBottom: 8, marginRight: '3.33%' },
  gridImage: { width: '100%', height: '100%' },
  gridRemoveBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 11 },
  addMoreBtn: {
    width: '30%', aspectRatio: 1, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  addMoreText: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  mediaGridFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  mediaCountText: { fontSize: 12 },
  removeAllText: { fontSize: 12, color: '#ef4444', fontWeight: '500' },

  // Single media / video preview
  mediaPreview: { marginTop: 8, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: 280, borderRadius: 12 },
  videoPreview: { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  videoPreviewText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8 },
  removeMediaBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14 },
  mediaTypeBadge: {
    position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4,
  },
  mediaTypeBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Toolbar
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: 8, paddingVertical: 8, borderTopWidth: 0.5,
  },
  toolBtn: { alignItems: 'center', padding: 6, gap: 2, borderRadius: 10 },
  toolBtnActive: { backgroundColor: 'rgba(59,130,246,0.1)' },
  toolLabel: { fontSize: 10, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 34 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 0.5, gap: 14,
  },
  modalOptionText: { flex: 1, fontSize: 16, fontWeight: '500' },
  modalCancel: { alignItems: 'center', paddingVertical: 16 },
  modalCancelText: { fontSize: 16, fontWeight: '500' },
});
