import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import useThemeStore from '../../store/themeStore';
import { notificationsAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { timeAgo } from '../../utils/formatters';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'reply' | string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: { id: string; username: string; full_name: string | null; profile_image_url: string | null };
  post_id?: string;
  comment_id?: string;
}

const iconMap: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  like: { name: 'heart', color: '#ef4444' },
  comment: { name: 'chatbubble', color: colors.primary[500] },
  follow: { name: 'person-add', color: '#8b5cf6' },
  mention: { name: 'at', color: '#f59e0b' },
  reply: { name: 'arrow-undo', color: '#10b981' },
};

export default function NotificationsScreen() {
  const dark = useThemeStore((s) => s.dark);
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;

  const fetchNotifications = useCallback(async (p: number = 1, refresh = false) => {
    try {
      if (p === 1) refresh ? setRefreshing(true) : setLoading(true);
      const res = await notificationsAPI.getAll(p);
      const data = res.data;
      const list: Notification[] = data.notifications || data;
      setNotifications(prev => p === 1 ? list : [...prev, ...list]);
      setPage(p);
      if (data.pagination) {
        setHasMore(p < data.pagination.totalPages);
      } else {
        setHasMore(false);
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(1); }, [fetchNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  }, []);

  const handleNotificationPress = useCallback(async (notif: Notification) => {
    if (!notif.is_read) {
      notificationsAPI.markRead(notif.id).catch(() => {});
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    // Deep link will be handled when we have full navigation context
  }, []);

  const renderItem = useCallback(({ item }: { item: Notification }) => {
    const icon = iconMap[item.type] || { name: 'notifications' as keyof typeof Ionicons.glyphMap, color: mutedColor };
    const unreadBg = !item.is_read ? (dark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)') : 'transparent';

    return (
      <TouchableOpacity
        style={[styles.notifItem, { borderBottomColor: borderColor, backgroundColor: unreadBg }]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {item.sender ? (
          <View>
            <Avatar uri={item.sender.profile_image_url} name={item.sender.full_name || item.sender.username} size={42} />
            <View style={[styles.typeIcon, { backgroundColor: icon.color }]}>
              <Ionicons name={icon.name} size={10} color="#fff" />
            </View>
          </View>
        ) : (
          <View style={[styles.iconCircle, { backgroundColor: icon.color + '20' }]}>
            <Ionicons name={icon.name} size={20} color={icon.color} />
          </View>
        )}
        <View style={styles.notifContent}>
          <Text style={[styles.notifMessage, { color: textColor }]} numberOfLines={2}>{item.message}</Text>
          <Text style={[styles.notifTime, { color: mutedColor }]}>{timeAgo(item.created_at)}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  }, [textColor, mutedColor, borderColor, dark, handleNotificationPress]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead}>
          <Ionicons name="checkmark-done" size={22} color={colors.primary[500]} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={<EmptyState icon="notifications-outline" title="No notifications" subtitle="You're all caught up!" dark={dark} />}
          onEndReached={() => { if (hasMore && !loading) fetchNotifications(page + 1); }}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(1, true)} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notifItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  typeIcon: { position: 'absolute', bottom: -2, right: -2, borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1, marginLeft: 12 },
  notifMessage: { fontSize: 14, lineHeight: 20 },
  notifTime: { fontSize: 12, marginTop: 3 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary[500], marginLeft: 8 },
});
