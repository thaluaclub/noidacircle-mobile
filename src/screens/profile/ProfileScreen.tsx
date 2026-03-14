import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { postsAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { formatCount } from '../../utils/formatters';
import type { Post } from '../../types';
import type { ProfileStackParamList } from '../../navigation/ProfileStack';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;
const SCREEN_WIDTH = Dimensions.get('window').width;
const TILE = (SCREEN_WIDTH - 4) / 3;

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const dark = useThemeStore((s) => s.dark);
  const navigation = useNavigation<Nav>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;

  useEffect(() => {
    if (user?.id) {
      postsAPI.getUserPosts(user.id, 1).then((res) => {
        setPosts(res.data.posts || res.data);
      }).finally(() => setLoading(false));
    }
  }, [user?.id]);

  const renderHeader = useCallback(() => (
    <View>
      <View style={styles.profileSection}>
        <Avatar uri={user?.avatar_url || user?.profile_image_url} name={user?.display_name || user?.full_name || user?.username || ''} size={80} />
        <Text style={[styles.displayName, { color: textColor }]}>{user?.display_name || user?.full_name || user?.username}</Text>
        {user?.bio ? <Text style={[styles.bio, { color: mutedColor }]}>{user.bio}</Text> : null}
        {user?.location ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={mutedColor} />
            <Text style={[styles.location, { color: mutedColor }]}>{user.location}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.statsRow, { borderColor }]}>
        <TouchableOpacity style={styles.stat}>
          <Text style={[styles.statNum, { color: textColor }]}>{formatCount(user?.posts_count || 0)}</Text>
          <Text style={[styles.statLabel, { color: mutedColor }]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.stat} onPress={() => navigation.navigate('FollowList', { userId: user!.id, tab: 'followers', username: user!.username })}>
          <Text style={[styles.statNum, { color: textColor }]}>{formatCount(user?.followers_count || 0)}</Text>
          <Text style={[styles.statLabel, { color: mutedColor }]}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.stat} onPress={() => navigation.navigate('FollowList', { userId: user!.id, tab: 'following', username: user!.username })}>
          <Text style={[styles.statNum, { color: textColor }]}>{formatCount(user?.following_count || 0)}</Text>
          <Text style={[styles.statLabel, { color: mutedColor }]}>Following</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actions}>
        <Button title="Edit Profile" variant="outline" size="sm" style={{ flex: 1, marginRight: 8 }} onPress={() => navigation.navigate('EditProfile')} />
        <Button title="Sign Out" variant="ghost" size="sm" onPress={logout} textStyle={{ color: colors.error }} />
      </View>
    </View>
  ), [user, textColor, mutedColor, borderColor, navigation, logout]);

  const renderItem = useCallback(({ item }: { item: Post }) => {
    if (item.media_url) {
      return (
        <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { postId: item.id, post: item })} activeOpacity={0.8}>
          <Image source={{ uri: item.media_url }} style={{ width: TILE, height: TILE, margin: 1 }} contentFit="cover" recyclingKey={item.id} />
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { postId: item.id, post: item })} style={[styles.textTile, { backgroundColor: dark ? colors.dark.card : '#f1f3f5' }]} activeOpacity={0.8}>
        <Text style={{ color: textColor, fontSize: 11, lineHeight: 15 }} numberOfLines={4}>{item.content}</Text>
      </TouchableOpacity>
    );
  }, [navigation, dark, textColor]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>@{user?.username}</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => navigation.navigate('Communities')} style={styles.iconBtn}>
            <Ionicons name="people-outline" size={22} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={22} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={loading ? null : <EmptyState icon="camera-outline" title="No posts yet" subtitle="Your posts will appear here" dark={dark} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerIcons: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },
  profileSection: { alignItems: 'center', paddingTop: 24, paddingHorizontal: 16 },
  displayName: { fontSize: 20, fontWeight: '700', marginTop: 12 },
  bio: { fontSize: 14, textAlign: 'center', marginTop: 4, lineHeight: 20 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  location: { fontSize: 13 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, marginTop: 16, marginHorizontal: 16, borderTopWidth: 0.5, borderBottomWidth: 0.5 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, marginBottom: 16 },
  textTile: { width: TILE, height: TILE, margin: 1, padding: 6, justifyContent: 'center' },
});