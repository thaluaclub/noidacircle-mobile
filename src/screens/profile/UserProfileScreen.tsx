import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import { usersAPI, postsAPI, followAPI, messagesAPI, notificationsAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { formatCount } from '../../utils/formatters';
import type { Post } from '../../types';
type UserProfileParams = {
  UserProfile: { userId: string };
  FollowList: { userId: string; tab: string; username: string };
  PostDetail: { postId: string; post?: Post };
};

type Route = RouteProp<UserProfileParams, 'UserProfile'>;
type Nav = NativeStackNavigationProp<UserProfileParams, 'UserProfile'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const TILE = (SCREEN_WIDTH - 4) / 3;

interface UserProfile {
  id: string; username: string; full_name: string | null; bio: string | null;
  profile_image_url: string | null; cover_image_url: string | null;
  location: string | null; is_verified: boolean; is_private: boolean;
  followers_count: number; following_count: number; posts_count: number;
  is_following?: boolean; account_type?: string;
}

export default function UserProfileScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { userId } = route.params;
  const dark = useThemeStore((s) => s.dark);
  const currentUser = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, postsRes] = await Promise.all([
          usersAPI.getProfile(userId),
          postsAPI.getUserPosts(userId, 1),
        ]);
        const p = profileRes.data.user || profileRes.data;
        setProfile(p);
        setFollowing(p.is_following || false);
        setPosts(postsRes.data.posts || postsRes.data);
        // Check notification subscription
        try {
          const subRes = await notificationsAPI.checkSubscription(userId);
          setNotifEnabled(subRes.data?.subscribed || false);
        } catch {
          // API may not exist yet, default to false
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const handleFollow = useCallback(async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    try {
      if (wasFollowing) {
        await followAPI.unfollow(profile.id);
      } else {
        await followAPI.follow(profile.id);
      }
    } catch {
      setFollowing(wasFollowing);
    } finally {
      setFollowLoading(false);
    }
  }, [profile, following, followLoading]);

  const handleToggleNotifications = useCallback(async () => {
    if (!profile || notifLoading) return;
    setNotifLoading(true);
    const wasEnabled = notifEnabled;
    setNotifEnabled(!wasEnabled);
    try {
      if (wasEnabled) {
        await notificationsAPI.unsubscribe(profile.id);
      } else {
        await notificationsAPI.subscribe(profile.id);
      }
    } catch {
      setNotifEnabled(wasEnabled);
    } finally {
      setNotifLoading(false);
    }
  }, [profile, notifEnabled, notifLoading]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      </SafeAreaView>
    );
  }

  if (!profile) return null;

  const isOwnProfile = currentUser?.id === profile.id;

  const renderHeader = () => (
    <View>
      <View style={styles.profileSection}>
        <Avatar uri={profile.profile_image_url} name={profile.full_name || profile.username} size={80} />
        <View style={styles.nameRow}>
          <Text style={[styles.displayName, { color: textColor }]}>{profile.full_name || profile.username}</Text>
          {profile.is_verified && <Ionicons name="checkmark-circle" size={18} color={colors.primary[500]} style={{ marginLeft: 4 }} />}
        </View>
        <Text style={[styles.handle, { color: mutedColor }]}>@{profile.username}</Text>
        {profile.account_type && profile.account_type !== 'individual' && (
          <View style={styles.accountTypeBadge}>
            <Ionicons name={profile.account_type === 'business' ? 'briefcase' : profile.account_type === 'brand' ? 'pricetag' : 'flag'} size={12} color={colors.primary[500]} />
            <Text style={styles.accountTypeText}>{profile.account_type.charAt(0).toUpperCase() + profile.account_type.slice(1)}</Text>
          </View>
        )}
        {profile.bio ? <Text style={[styles.bio, { color: mutedColor }]}>{profile.bio}</Text> : null}
        {profile.location ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={mutedColor} />
            <Text style={[styles.locationText, { color: mutedColor }]}>{profile.location}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.statsRow, { borderColor }]}>
        <View style={styles.stat}><Text style={[styles.statNum, { color: textColor }]}>{formatCount(profile.posts_count)}</Text><Text style={[styles.statLabel, { color: mutedColor }]}>Posts</Text></View>
        <TouchableOpacity style={styles.stat} onPress={() => navigation.navigate('FollowList', { userId: profile.id, tab: 'followers', username: profile.username })}>
          <Text style={[styles.statNum, { color: textColor }]}>{formatCount(profile.followers_count)}</Text><Text style={[styles.statLabel, { color: mutedColor }]}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.stat} onPress={() => navigation.navigate('FollowList', { userId: profile.id, tab: 'following', username: profile.username })}>
          <Text style={[styles.statNum, { color: textColor }]}>{formatCount(profile.following_count)}</Text><Text style={[styles.statLabel, { color: mutedColor }]}>Following</Text>
        </TouchableOpacity>
      </View>
      {!isOwnProfile && (
        <View style={styles.followActions}>
          <Button title={following ? 'Following' : 'Follow'} variant={following ? 'outline' : 'primary'} size="sm" style={{ flex: 1, marginRight: 8 }} onPress={handleFollow} />
          <TouchableOpacity
            style={[styles.notifBtn, notifEnabled && styles.notifBtnActive]}
            onPress={handleToggleNotifications}
            disabled={notifLoading}
            activeOpacity={0.7}
          >
            <Ionicons
              name={notifEnabled ? 'notifications' : 'notifications-outline'}
              size={18}
              color={notifEnabled ? '#fff' : textColor}
            />
          </TouchableOpacity>
          <Button title={messageLoading ? "..." : "Message"} variant="outline" size="sm" style={{ flex: 1, marginLeft: 8 }} onPress={async () => {
            if (messageLoading || !profile) return;
            setMessageLoading(true);
            try {
              const res = await messagesAPI.createConversation({ participantId: profile.id });
              const conv = res.data.conversation || res.data;
              const rootNav = navigation.getParent()?.getParent() || navigation;
              (rootNav as any).navigate('MessagesTab', {
                screen: 'Chat',
                params: {
                  conversationId: conv.id,
                  recipientName: profile.full_name || profile.username,
                  recipientAvatar: profile.profile_image_url,
                },
              });
            } catch {
              const rootNav = navigation.getParent()?.getParent() || navigation;
              (rootNav as any).navigate('MessagesTab');
            } finally {
              setMessageLoading(false);
            }
          }} />
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: Post }) => {
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
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>@{profile.username}</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={3}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={<EmptyState icon="camera-outline" title="No posts yet" dark={dark} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  profileSection: { alignItems: 'center', paddingTop: 24, paddingHorizontal: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  displayName: { fontSize: 20, fontWeight: '700' },
  handle: { fontSize: 14, marginTop: 2 },
  bio: { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  locationText: { fontSize: 13 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, marginTop: 16, marginHorizontal: 16, borderTopWidth: 0.5, borderBottomWidth: 0.5 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  followActions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 16, marginBottom: 16 },
  notifBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: colors.primary[500], alignItems: 'center', justifyContent: 'center' },
  notifBtnActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  textTile: { width: TILE, height: TILE, margin: 1, padding: 6, justifyContent: 'center' },
  accountTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: 'rgba(59,130,246,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  accountTypeText: { fontSize: 12, fontWeight: '600', color: colors.primary[500] },
});
