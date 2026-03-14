import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import { messagesAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import type { MessagesStackParamList } from '../../navigation/MessagesStack';

type Nav = NativeStackNavigationProp<MessagesStackParamList, 'Conversations'>;

interface Participant {
  id: string;
  username: string;
  full_name: string | null;
  profile_image_url: string | null;
  is_verified?: boolean;
  verification_badge?: string;
}

interface Conversation {
  id: string;
  participants: Participant[];
  // Handle both camelCase (API) and snake_case formats
  lastMessage?: { id?: string; content: string; senderId?: string; sender_id?: string; createdAt?: string; created_at?: string } | null;
  last_message?: { id?: string; content: string; sender_id?: string; created_at?: string } | null;
  unreadCount?: number;
  unread_count?: number;
  updatedAt?: string;
  updated_at?: string;
  is_muted?: boolean;
}

// Format time for conversation list (WhatsApp style)
function formatConvTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);

  if (diffDays === 0) {
    // Today: show time like "2:21 AM"
    const h = date.getHours();
    const m = date.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-IN', { weekday: 'short' });
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function ConversationsScreen() {
  const dark = useThemeStore((s) => s.dark);
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<Nav>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const hoverBg = dark ? colors.dark.card : '#f8f9fa';

  const fetchConversations = useCallback(async () => {
    try {
      const res = await messagesAPI.getConversations();
      setConversations(res.data?.conversations || res.data || []);
    } catch (err) {
      console.error('Fetch conversations error:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations().finally(() => setLoading(false));
  }, [fetchConversations]);

  // Refresh when screen is focused (e.g. coming back from chat)
  useFocusEffect(
    useCallback(() => {
      fetchConversations();
      // Poll every 8 seconds
      pollRef.current = setInterval(fetchConversations, 8000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [fetchConversations])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  const getOtherParticipant = useCallback((conv: Conversation): Participant => {
    const p = conv.participants?.find((p) => p.id !== user?.id) || conv.participants?.[0];
    return p || { id: '', username: '?', full_name: null, profile_image_url: null };
  }, [user?.id]);

  // Normalize data from API (handles both camelCase and snake_case)
  const getLastMessage = (conv: Conversation) => {
    const lm = conv.lastMessage || conv.last_message;
    if (!lm) return null;
    return {
      content: lm.content || '',
      sender_id: lm.sender_id || lm.senderId || '',
      created_at: lm.created_at || lm.createdAt || '',
    };
  };

  const getUnreadCount = (conv: Conversation): number => {
    return conv.unreadCount || conv.unread_count || 0;
  };

  const getUpdatedAt = (conv: Conversation): string => {
    const lm = getLastMessage(conv);
    return lm?.created_at || conv.updatedAt || conv.updated_at || '';
  };

  const renderItem = useCallback(({ item }: { item: Conversation }) => {
    const other = getOtherParticipant(item);
    const lastMsg = getLastMessage(item);
    const unread = getUnreadCount(item);
    const timeStr = formatConvTime(getUpdatedAt(item));
    const hasUnread = unread > 0;

    return (
      <TouchableOpacity
        style={[styles.convItem]}
        onPress={() => navigation.navigate('Chat', {
          conversationId: item.id,
          recipientName: other.full_name || other.username,
          recipientAvatar: other.profile_image_url,
        })}
        activeOpacity={0.6}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Avatar uri={other.profile_image_url} name={other.full_name || other.username} size={54} />
        </View>

        {/* Content */}
        <View style={styles.convInfo}>
          <View style={styles.convTopRow}>
            <View style={styles.nameRow}>
              <Text style={[styles.convName, { color: textColor }, hasUnread && styles.convNameBold]} numberOfLines={1}>
                {other.full_name || other.username}
              </Text>
              {(other.is_verified || other.verification_badge) && (
                <Ionicons name="checkmark-circle" size={15} color={colors.primary[500]} style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={[styles.convTime, { color: hasUnread ? colors.primary[500] : mutedColor }]}>
              {timeStr}
            </Text>
          </View>

          <View style={styles.convBottomRow}>
            <Text style={[styles.convPreview, { color: hasUnread ? textColor : mutedColor }, hasUnread && styles.convPreviewBold]} numberOfLines={1}>
              {lastMsg ? (
                lastMsg.sender_id === user?.id ? `You: ${lastMsg.content}` : lastMsg.content
              ) : 'Tap to start chatting'}
            </Text>
            {hasUnread ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [textColor, mutedColor, user?.id, navigation, getOtherParticipant]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('NewMessage')}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={23} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary[500]}
              colors={[colors.primary[500]]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: dark ? 'rgba(255,255,255,0.05)' : '#f0f2f5' }]}>
                <Ionicons name="chatbubbles-outline" size={48} color={mutedColor} />
              </View>
              <Text style={[styles.emptyTitle, { color: textColor }]}>No conversations yet</Text>
              <Text style={[styles.emptySubtitle, { color: mutedColor }]}>
                Start chatting with people on NoidaCircle
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('NewMessage')}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>New Chat</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={conversations.length === 0 ? { flex: 1 } : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerBtn: { padding: 4 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Conversation item
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  avatarContainer: { position: 'relative' },
  convInfo: { flex: 1, marginLeft: 14 },
  convTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  convName: { fontSize: 16, fontWeight: '500' },
  convNameBold: { fontWeight: '700' },
  convTime: { fontSize: 12, fontWeight: '400' },
  convBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  convPreview: { fontSize: 14, flex: 1, marginRight: 8 },
  convPreviewBold: { fontWeight: '600' },

  // Unread badge
  unreadBadge: {
    backgroundColor: colors.primary[500],
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
