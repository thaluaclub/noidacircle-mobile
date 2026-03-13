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
  KeyboardAvoidingView,
  Platform,
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
import type { CreatePostData } from '../../types';

const MAX_CONTENT_LENGTH = 2000;

export default function CreatePostScreen() {
  const dark = useThemeStore((s) => s.dark);
  const user = useAuthStore((s) => s.user);
  const { addPost } = usePostsStore();
  const navigation = useNavigation();

  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;

  const canPublish = content.trim().length > 0 && !publishing;

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  }, []);

  const removeImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const handlePublish = useCallback(async () => {
    if (!canPublish) return;

    setPublishing(true);
    try {
      let mediaUrl: string | undefined;
      let mediaType: 'image' | undefined;

      // Upload image if selected
      if (selectedImage) {
        setUploadProgress('Uploading image...');
        const mimeType = getMimeType(selectedImage);
        mediaUrl = await uploadFile(selectedImage, 'posts', mimeType);
        mediaType = 'image';
      }

      setUploadProgress('Publishing...');

      const postData: CreatePostData = {
        content: content.trim(),
        visibility: 'public',
      };

      if (mediaUrl) {
        postData.media_url = mediaUrl;
        postData.media_type = mediaType;
      }

      const res = await postsAPI.create(postData);
      const newPost = res.data.post || res.data;

      // Add to feed store
      addPost({
        ...newPost,
        user: {
          id: user?.id || '',
          username: user?.username || '',
          full_name: user?.display_name || null,
          profile_image_url: user?.avatar_url || null,
          is_verified: user?.is_verified || false,
        },
        is_liked: false,
        is_following: null,
        is_own: true,
        is_bookmarked: false,
      });

      // Reset form
      setContent('');
      setSelectedImage(null);
      setUploadProgress('');

      // Navigate to feed
      Alert.alert('Posted!', 'Your post is now live.', [
        {
          text: 'OK',
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          },
        },
      ]);
    } catch (err: any) {
      const msg =
        err.response?.data?.error || 'Failed to create post. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setPublishing(false);
      setUploadProgress('');
    }
  }, [canPublish, content, selectedImage, user, addPost, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          disabled={publishing}
        >
          <Text style={[styles.cancelText, { color: mutedColor }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>New Post</Text>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={!canPublish}
          style={[
            styles.publishBtn,
            { opacity: canPublish ? 1 : 0.4 },
          ]}
        >
          {publishing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.publishBtnText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Upload progress */}
          {publishing && uploadProgress ? (
            <View style={styles.progressBar}>
              <ActivityIndicator size="small" color={colors.primary[500]} />
              <Text style={[styles.progressText, { color: mutedColor }]}>
                {uploadProgress}
              </Text>
            </View>
          ) : null}

          {/* Composer */}
          <View style={styles.composerRow}>
            <Avatar
              uri={user?.avatar_url || null}
              name={user?.display_name || user?.username || 'U'}
              size={40}
            />
            <TextInput
              style={[styles.textInput, { color: textColor }]}
              placeholder="What's happening in Noida?"
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
          <Text
            style={[
              styles.charCount,
              {
                color:
                  content.length > MAX_CONTENT_LENGTH * 0.9
                    ? colors.error
                    : mutedColor,
              },
            ]}
          >
            {content.length}/{MAX_CONTENT_LENGTH}
          </Text>

          {/* Selected image preview */}
          {selectedImage && (
            <View style={styles.imagePreview}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
                contentFit="cover"
                transition={200}
              />
              <TouchableOpacity
                onPress={removeImage}
                style={styles.removeImageBtn}
                disabled={publishing}
              >
                <Ionicons name="close-circle" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Bottom toolbar */}
        <View style={[styles.toolbar, { borderTopColor: borderColor, backgroundColor: bg }]}>
          <TouchableOpacity
            onPress={pickImage}
            style={styles.toolBtn}
            disabled={publishing}
          >
            <Ionicons name="image-outline" size={24} color={colors.primary[500]} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={takePhoto}
            style={styles.toolBtn}
            disabled={publishing}
          >
            <Ionicons name="camera-outline" size={24} color={colors.primary[500]} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  publishBtn: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  publishBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '500',
  },
  composerRow: {
    flexDirection: 'row',
    paddingTop: 16,
    alignItems: 'flex-start',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    marginLeft: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 8,
  },
  imagePreview: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    gap: 20,
  },
  toolBtn: {
    padding: 4,
  },
});
