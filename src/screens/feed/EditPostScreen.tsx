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
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import useThemeStore from '../../store/themeStore';
import usePostsStore from '../../store/postsStore';
import { postsAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import type { Post } from '../../types';

type EditPostParams = {
  EditPost: { post: Post };
};

type Route = RouteProp<EditPostParams, 'EditPost'>;

const MAX_CONTENT_LENGTH = 2000;

export default function EditPostScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const dark = useThemeStore((s) => s.dark);
  const { post } = route.params;

  const [content, setContent] = useState(post.content);
  const [title, setTitle] = useState(post.title || '');
  const [saving, setSaving] = useState(false);

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;

  const canSave = content.trim().length > 0 && !saving;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const updateData: any = { content: content.trim() };
      if (title.trim()) updateData.title = title.trim();

      await postsAPI.update(post.id, updateData);

      // Update in store
      const store = usePostsStore.getState();
      const posts = store.posts;
      const idx = posts.findIndex((p) => p.id === post.id);
      if (idx !== -1) {
        const updated = [...posts];
        updated[idx] = {
          ...updated[idx],
          content: content.trim(),
          title: title.trim() || null,
        };
        usePostsStore.setState({ posts: updated });
      }

      Alert.alert('Updated', 'Post updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update post.');
    } finally {
      setSaving(false);
    }
  }, [canSave, content, title, post.id, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={saving}>
          <Text style={[styles.cancelText, { color: mutedColor }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Edit Post</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          style={[styles.saveBtn, { opacity: canSave ? 1 : 0.4 }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
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
          {/* Title (optional) */}
          {(post.title || post.category === 'events' || post.category === 'event') && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: mutedColor }]}>Title</Text>
              <TextInput
                style={[styles.titleInput, { color: textColor, borderColor }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Post title"
                placeholderTextColor={mutedColor}
                maxLength={200}
                editable={!saving}
              />
            </View>
          )}

          {/* Content */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: mutedColor }]}>Content</Text>
            <TextInput
              style={[styles.contentInput, { color: textColor, borderColor }]}
              value={content}
              onChangeText={setContent}
              placeholder="What's on your mind?"
              placeholderTextColor={mutedColor}
              multiline
              maxLength={MAX_CONTENT_LENGTH}
              editable={!saving}
            />
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
          </View>

          {/* Media preview (read-only) */}
          {post.media_url && post.media_type === 'image' && (
            <View style={styles.mediaSection}>
              <Text style={[styles.label, { color: mutedColor }]}>Media</Text>
              <Image
                source={{ uri: post.media_url }}
                style={styles.mediaPreview}
                contentFit="cover"
                transition={200}
              />
              <Text style={[styles.mediaNote, { color: mutedColor }]}>
                Media cannot be changed when editing
              </Text>
            </View>
          )}

          {post.media_url && post.media_type === 'video' && (
            <View style={styles.mediaSection}>
              <Text style={[styles.label, { color: mutedColor }]}>Media</Text>
              <View style={[styles.mediaPreview, styles.videoPlaceholder]}>
                <Ionicons name="videocam" size={32} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 13, marginTop: 4 }}>
                  Video attached
                </Text>
              </View>
              <Text style={[styles.mediaNote, { color: mutedColor }]}>
                Media cannot be changed when editing
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  cancelText: { fontSize: 16, fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  titleInput: {
    borderWidth: 0.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  contentInput: {
    borderWidth: 0.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 4 },
  mediaSection: { marginBottom: 20 },
  mediaPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  videoPlaceholder: {
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaNote: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },
});
