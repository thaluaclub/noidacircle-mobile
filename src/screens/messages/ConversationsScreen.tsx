import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import { messagesAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { timeAgo } from '../../utils/formatters';
import type { MessagesStackParamList } from '../../navigation/MessagesStack';

type Nav = NativeStackNavigationProp<MessagesStackParamList, 'Conversations'>;

interface Conversation {
  id: string;
  participants: { id: string; username: string; full_name: string | null; profile_image_url: string | null; is_verified: boolean }[];
  last_message?: { content: string; created_at: string; sender_id: string };
  is_muted: boolean;
  unread_count?: number;
}

export default function ConversationsScreen() {
  const dark = useThemeStore((s) => s.dark);
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<Nav>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;

  useEffect(() => {
    messagesAPI.getConversations().then((res) => {
      setConversations(res.data.conversations || res.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const getOtherParticipant = useCallback((conv: Conversation) => {
    return conv.participants.find((p) => p.id !== user?.id) || conv.participants[0];
  }, [user?.id]);

  const renderItem = useCallback(({ item }: { item: Conversation }) => {
    const other = getOtherParticipant(item);
    const lastMsg = item.last_message;

    return (
      <TouchableOpacity
        style={[styles.convItem, { borderBottomColor: borderColor }]}
        onPress={() => navigation.navigate('Chat', {
          conversationId: item.id,
          recipientName: other.full_name || other.username,
          recipientAvatar: other.profile_image_url,
        })}
        activeOpacity={0.7}
      >
        <Avatar uri={other.profile_image_url} name={other.full_name || other.username} size={50} />
        <View style={styles.convInfo}>
          <View style={styles.convHeader}>
            <View style={styles.nameRow}>
              <Text style={[styles.convName, { color: textColor }]}>{other.full_name || other.username}</Text>
              {other.is_verified && <Ionicons name="checkmark-circle" size={14} color={colors.primary[500]} style={{ marginLeft: 3 }} />}
            </View>
            {lastMsg && <Text style={[styles.convTime, { color: mutedColor }]}>{timeAgo(lastMsg.created_at)}</Text>}
          </View>
          {lastMsg && (
            <Text style={[styles.convPreview, { color: mutedColor }]} numberOfLines={1}>
              {lastMsg.sender_id === user?.id ? 'You: ' : ''}{lastMsg.content}
            </Text>
          )}
        </View>
        {item.unread_count && item.unread_count > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread_count}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  }, [textColor, mutedColor, borderColor, user?.id, navigation, getOtherParticipant]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>Messages</Text>
        <TouchableOpacity onPress={() => navigation.navigate('NewMessage')}>
          <Ionicons name="create-outline" size={22} color={textColor} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title="No messages" subtitle="Start a conversation with someone" dark={dark} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  convItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  convInfo: { flex: 1, marginLeft: 12 },
  convHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  convName: { fontSize: 15, fontWeight: '600' },
  convTime: { fontSize: 12 },
  convPreview: { fontSize: 14, marginTop: 3 },
  unreadBadge: { backgroundColor: colors.primary[500], borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
