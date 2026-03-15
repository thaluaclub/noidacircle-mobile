import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, ScrollView, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import useThemeStore from '../../store/themeStore';
import useStoriesStore from '../../store/storiesStore';
import { storiesAPI } from '../../services/api';
import { uploadFile, getMimeType } from '../../services/upload';
import { colors } from '../../theme/colors';

type StoryMode = 'select' | 'text' | 'preview';

const BG_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#1a1a2e', // Dark navy
  '#e74c3c', // Coral red
];

const BG_GRADIENTS: Record<string, string[]> = {
  '#3b82f6': ['#3b82f6', '#2563eb'],
  '#8b5cf6': ['#8b5cf6', '#7c3aed'],
  '#ec4899': ['#ec4899', '#db2777'],
  '#ef4444': ['#ef4444', '#dc2626'],
  '#f59e0b': ['#f59e0b', '#d97706'],
  '#10b981': ['#10b981', '#059669'],
  '#1a1a2e': ['#1a1a2e', '#16213e'],
  '#e74c3c': ['#e74c3c', '#c0392b'],
};

export default function CreateStoryScreen() {
  const dark = useThemeStore((s) => s.dark);
  const navigation = useNavigation();
  const { fetchStories } = useStoriesStore();

  const [mode, setMode] = useState<StoryMode>('select');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [caption, setCaption] = useState('');
  const [textContent, setTextContent] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;

  // Pick image
  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        aspect: [9, 16],
      });
      if (!result.canceled && result.assets[0]) {
        setMediaUri(result.assets[0].uri);
        setMediaType('image');
        setMode('preview');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not open gallery');
    }
  }, []);

  // Take photo
  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        aspect: [9, 16],
      });
      if (!result.canceled && result.assets[0]) {
        setMediaUri(result.assets[0].uri);
        setMediaType('image');
        setMode('preview');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not open camera');
    }
  }, []);

  // Pick video
  const pickVideo = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.7,
        videoMaxDuration: 30,
      });
      if (!result.canceled && result.assets[0]) {
        setMediaUri(result.assets[0].uri);
        setMediaType('video');
        setMode('preview');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not pick video');
    }
  }, []);

  // Publish story
  const handlePublish = useCallback(async () => {
    if (publishing) return;
    setPublishing(true);

    try {
      if (mode === 'text') {
        if (!textContent.trim()) {
          Alert.alert('Error', 'Please enter some text');
          setPublishing(false);
          return;
        }
        setUploadProgress('Publishing...');
        await storiesAPI.create({
          media_type: 'text',
          text_content: textContent.trim(),
          bg_color: bgColor,
        });
      } else if (mediaUri && mediaType) {
        setUploadProgress('Uploading...');
        const mimeType = getMimeType(mediaUri);
        const url = await uploadFile(mediaUri, 'stories', mimeType);
        setUploadProgress('Publishing...');
        await storiesAPI.create({
          media_url: url,
          media_type: mediaType,
          caption: caption.trim() || null,
        });
      } else {
        setPublishing(false);
        return;
      }

      await fetchStories();
      Alert.alert('Story Published!', 'Your story is now live for 48 hours.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to publish story');
    } finally {
      setPublishing(false);
      setUploadProgress('');
    }
  }, [publishing, mode, textContent, bgColor, mediaUri, mediaType, caption, fetchStories, navigation]);

  // Select mode screen
  if (mode === 'select') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Create Story</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.selectContainer}>
          <TouchableOpacity style={[styles.selectCard, { backgroundColor: '#3b82f6' }]} onPress={pickImage}>
            <Ionicons name="images" size={40} color="#fff" />
            <Text style={styles.selectCardTitle}>Gallery</Text>
            <Text style={styles.selectCardSub}>Choose a photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.selectCard, { backgroundColor: '#8b5cf6' }]} onPress={takePhoto}>
            <Ionicons name="camera" size={40} color="#fff" />
            <Text style={styles.selectCardTitle}>Camera</Text>
            <Text style={styles.selectCardSub}>Take a photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.selectCard, { backgroundColor: '#ec4899' }]} onPress={pickVideo}>
            <Ionicons name="videocam" size={40} color="#fff" />
            <Text style={styles.selectCardTitle}>Video</Text>
            <Text style={styles.selectCardSub}>Record or choose</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.selectCard, { backgroundColor: '#10b981' }]} onPress={() => setMode('text')}>
            <Ionicons name="text" size={40} color="#fff" />
            <Text style={styles.selectCardTitle}>Text</Text>
            <Text style={styles.selectCardSub}>Colored background</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Text story mode
  if (mode === 'text') {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.textHeader}>
            <TouchableOpacity onPress={() => setMode('select')}>
              <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePublish}
              disabled={publishing || !textContent.trim()}
              style={[styles.publishBtn, { opacity: textContent.trim() ? 1 : 0.4 }]}
            >
              {publishing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.publishBtnText}>Share</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Text input */}
          <KeyboardAvoidingView style={styles.textInputContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TextInput
              style={styles.textStoryInput}
              placeholder="Type your story..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={textContent}
              onChangeText={setTextContent}
              multiline
              autoFocus
              maxLength={500}
            />
          </KeyboardAvoidingView>

          {/* Color picker */}
          <View style={styles.colorPicker}>
            {BG_COLORS.map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorDot,
                  { backgroundColor: color },
                  bgColor === color && styles.colorDotActive,
                ]}
                onPress={() => setBgColor(color)}
              />
            ))}
          </View>

          {publishing && uploadProgress ? (
            <View style={styles.progressOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.progressText}>{uploadProgress}</Text>
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    );
  }

  // Preview mode (image/video)
  return (
    <View style={styles.container}>
      {/* Preview */}
      {mediaType === 'image' && mediaUri && (
        <Image source={{ uri: mediaUri }} style={StyleSheet.absoluteFillObject} contentFit="contain" />
      )}
      {mediaType === 'video' && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="videocam" size={48} color="rgba(255,255,255,0.5)" />
          <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>Video preview</Text>
        </View>
      )}

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.previewHeader}>
          <TouchableOpacity onPress={() => { setMode('select'); setMediaUri(null); }}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePublish}
            disabled={publishing}
            style={styles.publishBtn}
          >
            {publishing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={16} color="#fff" />
                <Text style={styles.publishBtnText}>Share</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Caption input at bottom */}
        <View style={styles.captionContainer}>
          <TextInput
            style={styles.captionInput}
            placeholder="Add a caption..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={caption}
            onChangeText={setCaption}
            maxLength={200}
          />
        </View>
      </SafeAreaView>

      {publishing && uploadProgress ? (
        <View style={styles.progressOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.progressText}>{uploadProgress}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  // Select mode
  selectContainer: {
    flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12,
    justifyContent: 'center', alignContent: 'center',
  },
  selectCard: {
    width: '45%', aspectRatio: 1, borderRadius: 20, alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  selectCardTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  selectCardSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },
  // Text mode
  textHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  textInputContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  textStoryInput: {
    color: '#fff', fontSize: 28, fontWeight: '700', textAlign: 'center',
    lineHeight: 38, width: '100%', minHeight: 100,
  },
  colorPicker: {
    flexDirection: 'row', justifyContent: 'center', paddingVertical: 16, gap: 10,
  },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.15 }] },
  // Preview mode
  previewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  captionContainer: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
  },
  captionInput: {
    backgroundColor: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 16,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24,
  },
  // Common
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary[500], paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 24,
  },
  publishBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  progressText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

