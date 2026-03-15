import React, { useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, RefreshControl,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Avatar from '../../components/Avatar';
import useStoriesStore, { StoryGroup } from '../../store/storiesStore';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import { colors } from '../../theme/colors';
import { timeAgo } from '../../utils/formatters';

export default function StoriesScreen() {
  const dark = useThemeStore((s) => s.dark);
  const user = useAuthStore((s) => s.user);
  const { groups, loading, refreshing, fetchStories, refreshStories } = useStoriesStore();
  const navigation = useNavigation<any>();

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const cardBg = dark ? colors.dark.card : '#f8f9fa';

  useEffect(() => {
    fetchStories();
  }, []);

  const handleOpenViewer = useCallback((groupIndex: number, storyIndex = 0) => {
    navigation.navigate('StoryViewer', { groupIndex, storyIndex });
  }, [navigation]);

  const handleCreateStory = useCallback(() => {
    navigation.navigate('CreateStory');
  }, [navigation]);

  // Avatar row at top
  const renderAvatarRow = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.avatarScroll}
      style={[styles.avatarRow, { borderBottomColor: borderColor }]}
    >
      {/* Add Story button */}
      <TouchableOpacity style={styles.avatarItem} onPress={handleCreateStory}>
        <View style={[styles.addStoryCircle, { borderColor: colors.primary[500] }]}>
          {user?.avatar_url || user?.profile_image_url ? (
            <Avatar
              uri={user.avatar_url || user.profile_image_url}
              name={user.display_name || user.username || 'U'}
              size={60}
            />
          ) : (
            <View style={[styles.addStoryInner, { backgroundColor: cardBg }]}>
              <Ionicons name="person" size={28} color={mutedColor} />
            </View>
          )}
          <View style={styles.addBadge}>
            <Ionicons name="add" size={16} color="#fff" />
          </View>
        </View>
        <Text style={[styles.avatarName, { color: textColor }]} numberOfLines={1}>Your Story</Text>
      </TouchableOpacity>

      {/* Other users' stories */}
      {groups.map((group, idx) => {
        // Skip own stories in the row (already shown as "Your Story")
        if (group.user.id === user?.id) return null;
        return (
          <TouchableOpacity
            key={group.user.id}
            style={styles.avatarItem}
            onPress={() => handleOpenViewer(idx)}
          >
            <View style={[
              styles.storyCircle,
              { borderColor: group.has_unviewed ? '#8b5cf6' : borderColor },
              !group.has_unviewed && { borderWidth: 2 },
            ]}>
              <Avatar
                uri={group.user.profile_image_url}
                name={group.user.full_name || group.user.username}
                size={60}
              />
            </View>
            <Text style={[styles.avatarName, { color: group.has_unviewed ? textColor : mutedColor }]} numberOfLines={1}>
              {group.user.full_name?.split(' ')[0] || group.user.username}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // Story group card in list
  const renderGroupCard = useCallback(({ item, index }: { item: StoryGroup; index: number }) => {
    const latestStory = item.stories[0];
    const previewUrl = latestStory?.image_url || null;
    const isText = latestStory?.media_type === 'text';
    const isVideo = latestStory?.media_type === 'video';

    return (
      <TouchableOpacity
        style={[styles.groupCard, { backgroundColor: cardBg, borderColor }]}
        onPress={() => handleOpenViewer(index)}
        activeOpacity={0.7}
      >
        <View style={styles.groupLeft}>
          <View style={[
            styles.groupAvatar,
            { borderColor: item.has_unviewed ? '#8b5cf6' : borderColor },
          ]}>
            <Avatar
              uri={item.user.profile_image_url}
              name={item.user.full_name || item.user.username}
              size={48}
            />
          </View>
          <View style={styles.groupInfo}>
            <View style={styles.groupNameRow}>
              <Text style={[styles.groupName, { color: textColor }]}>
                {item.user.full_name || item.user.username}
              </Text>
              {item.user.is_verified && (
                <Ionicons name="checkmark-circle" size={14} color={colors.primary[500]} style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={[styles.groupTime, { color: mutedColor }]}>
              {item.stories.length} {item.stories.length === 1 ? 'story' : 'stories'} · {timeAgo(item.latest_at)}
            </Text>
          </View>
        </View>

        {/* Preview indicator */}
        <View style={styles.groupRight}>
          {isText && (
            <View style={[styles.textPreview, { backgroundColor: latestStory.bg_color || '#3b82f6' }]}>
              <Text style={styles.textPreviewText} numberOfLines={2}>
                {latestStory.text_content?.substring(0, 30)}
              </Text>
            </View>
          )}
          {isVideo && (
            <View style={[styles.mediaPreview, { backgroundColor: '#1a1a1a' }]}>
              <Ionicons name="videocam" size={20} color="#fff" />
            </View>
          )}
          {!isText && !isVideo && previewUrl && (
            <View style={styles.mediaPreview}>
              <Avatar uri={previewUrl} name="" size={44} />
            </View>
          )}
          {item.has_unviewed && (
            <View style={styles.unviewedDot} />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [textColor, mutedColor, borderColor, cardBg, handleOpenViewer]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>Stories</Text>
        <TouchableOpacity onPress={handleCreateStory} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="add-circle-outline" size={28} color={colors.primary[500]} />
        </TouchableOpacity>
      </View>

      {loading && groups.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={[styles.loadingText, { color: mutedColor }]}>Loading stories...</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroupCard}
          keyExtractor={item => item.user.id}
          ListHeaderComponent={renderAvatarRow}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="albums-outline" size={64} color={mutedColor} style={{ opacity: 0.3 }} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No stories yet</Text>
              <Text style={[styles.emptyText, { color: mutedColor }]}>
                Stories from people you follow will appear here
              </Text>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreateStory}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.createBtnText}>Create Story</Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshStories}
              tintColor={colors.primary[500]}
              colors={[colors.primary[500]]}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  // Avatar row
  avatarRow: { borderBottomWidth: 0.5, maxHeight: 110 },
  avatarScroll: { paddingHorizontal: 12, paddingVertical: 12, gap: 14 },
  avatarItem: { alignItems: 'center', width: 72 },
  addStoryCircle: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  addStoryInner: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  addBadge: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary[500], alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  storyCircle: { width: 66, height: 66, borderRadius: 33, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  avatarName: { fontSize: 11, fontWeight: '500', marginTop: 4, textAlign: 'center' },
  // Group card
  groupCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 12, marginVertical: 4, padding: 14, borderRadius: 14, borderWidth: 0.5 },
  groupLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  groupAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  groupInfo: { marginLeft: 12, flex: 1 },
  groupNameRow: { flexDirection: 'row', alignItems: 'center' },
  groupName: { fontSize: 15, fontWeight: '600' },
  groupTime: { fontSize: 13, marginTop: 2 },
  groupRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textPreview: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', padding: 4 },
  textPreviewText: { color: '#fff', fontSize: 8, fontWeight: '600', textAlign: 'center' },
  mediaPreview: { width: 44, height: 44, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5e7eb' },
  unviewedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#8b5cf6' },
  // Loading / empty
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary[500], paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 16 },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  listContent: { paddingBottom: 100 },
});
