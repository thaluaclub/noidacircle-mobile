import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  Platform, ActivityIndicator, Keyboard, KeyboardEvent, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Avatar from '../../components/Avatar';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import { messagesAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import type { MessagesStackParamList } from '../../navigation/MessagesStack';

type Route = RouteProp<MessagesStackParamList, 'Chat'>;

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
  is_edited: boolean;
  _sending?: boolean;
  _failed?: boolean;
}

// Robust time formatter for chat messages
function formatMsgTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Date header grouping
function formatDateHeader(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-IN', { weekday: 'long' });
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export default function ChatScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { conversationId, recipientName, recipientAvatar } = route.params;
  const dark = useThemeStore((s) => s.dark);
  const user = useAuthStore((s) => s.user);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Keyboard tracking
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: KeyboardEvent) => setKeyboardHeight(e.endCoordinates.height);
    const onHide = () => setKeyboardHeight(0);
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const bg = dark ? colors.dark.bg : '#f0f2f5';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const inputBg = dark ? colors.dark.card : '#ffffff';
  const headerBg = dark ? colors.dark.card : '#ffffff';

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await messagesAPI.getMessages(conversationId, 50);
      const msgs = res.data?.messages || res.data || [];
      setMessages(msgs);
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  }, [conversationId]);

  // Initial load
  useEffect(() => {
    fetchMessages().finally(() => setLoading(false));
  }, [fetchMessages]);

  // Poll for new messages every 4 seconds
  useEffect(() => {
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user?.id || '',
      content,
      created_at: new Date().toISOString(),
      is_edited: false,
      _sending: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setText('');

    try {
      const res = await messagesAPI.send(conversationId, { content });
      // Backend now returns the message object directly (snake_case)
      const serverMsg = res.data;
      // Handle both old format { data: { ... } } and new format (direct object)
      const newMsg: Message = serverMsg?.id ? serverMsg : (serverMsg?.data || optimisticMsg);
      // Normalize field names in case backend returns camelCase
      const normalized: Message = {
        id: newMsg.id || tempId,
        conversation_id: newMsg.conversation_id || conversationId,
        sender_id: newMsg.sender_id || (newMsg as any).senderId || user?.id || '',
        content: newMsg.content || content,
        created_at: newMsg.created_at || (newMsg as any).createdAt || new Date().toISOString(),
        is_edited: false,
      };
      setMessages((prev) => prev.map((m) => m.id === tempId ? normalized : m));
    } catch {
      // Mark as failed instead of removing
      setMessages((prev) => prev.map((m) =>
        m.id === tempId ? { ...m, _sending: false, _failed: true } : m
      ));
    } finally {
      setSending(false);
    }
  }, [text, sending, conversationId, user?.id]);

  // Retry failed message
  const handleRetry = useCallback(async (failedMsg: Message) => {
    setMessages((prev) => prev.map((m) =>
      m.id === failedMsg.id ? { ...m, _sending: true, _failed: false } : m
    ));
    try {
      const res = await messagesAPI.send(conversationId, { content: failedMsg.content });
      const serverMsg = res.data;
      const newMsg: Message = serverMsg?.id ? serverMsg : (serverMsg?.data || failedMsg);
      const normalized: Message = {
        id: newMsg.id || failedMsg.id,
        conversation_id: newMsg.conversation_id || conversationId,
        sender_id: newMsg.sender_id || (newMsg as any).senderId || user?.id || '',
        content: newMsg.content || failedMsg.content,
        created_at: newMsg.created_at || (newMsg as any).createdAt || new Date().toISOString(),
        is_edited: false,
      };
      setMessages((prev) => prev.map((m) => m.id === failedMsg.id ? normalized : m));
    } catch {
      setMessages((prev) => prev.map((m) =>
        m.id === failedMsg.id ? { ...m, _sending: false, _failed: true } : m
      ));
    }
  }, [conversationId, user?.id]);

  // Build messages with date headers
  const messagesWithHeaders = useMemo(() => {
    const result: (Message | { type: 'date_header'; label: string; key: string })[] = [];
    let lastDateLabel = '';
    for (const msg of messages) {
      const dateLabel = formatDateHeader(msg.created_at);
      if (dateLabel && dateLabel !== lastDateLabel) {
        result.push({ type: 'date_header', label: dateLabel, key: `header_${dateLabel}_${msg.id}` });
        lastDateLabel = dateLabel;
      }
      result.push(msg);
    }
    return result;
  }, [messages]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    // Date header
    if (item.type === 'date_header') {
      return (
        <View style={styles.dateHeaderContainer}>
          <View style={[styles.dateHeaderBadge, { backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
            <Text style={[styles.dateHeaderText, { color: dark ? 'rgba(255,255,255,0.6)' : '#667781' }]}>{item.label}</Text>
          </View>
        </View>
      );
    }

    const msg = item as Message;
    const isMine = msg.sender_id === user?.id;

    // Check if previous non-header message is same sender (for grouping)
    const prevItems = messagesWithHeaders.slice(0, index);
    let prevMsg: Message | null = null;
    for (let i = prevItems.length - 1; i >= 0; i--) {
      if (!prevItems[i].type) { prevMsg = prevItems[i] as Message; break; }
    }
    const sameSenderAsPrev = prevMsg && prevMsg.sender_id === msg.sender_id;
    const timeDiff = prevMsg ? (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) / 60000 : 999;
    const grouped = sameSenderAsPrev && timeDiff < 2;

    return (
      <View style={[
        styles.msgRow,
        isMine ? styles.msgRowMine : styles.msgRowOther,
        { marginTop: grouped ? 2 : 10 },
      ]}>
        {/* Avatar for other user's first message in group */}
        {!isMine && !grouped && (
          <Avatar uri={recipientAvatar} name={recipientName} size={28} />
        )}
        {!isMine && grouped && <View style={{ width: 28 }} />}

        <View style={[
          styles.bubble,
          isMine ? [styles.bubbleMine, !grouped && styles.bubbleMineFirst] : [styles.bubbleOther, { backgroundColor: dark ? colors.dark.card : '#ffffff' }, !grouped && styles.bubbleOtherFirst],
          msg._sending && { opacity: 0.6 },
        ]}>
          <Text style={[styles.msgText, { color: isMine ? '#fff' : textColor }]}>
            {msg.content}
          </Text>
          <View style={styles.msgMeta}>
            <Text style={[styles.msgTime, { color: isMine ? 'rgba(255,255,255,0.65)' : mutedColor }]}>
              {formatMsgTime(msg.created_at)}
            </Text>
            {isMine && !msg._sending && !msg._failed && (
              <Ionicons
                name={msg.read_at ? 'checkmark-done' : 'checkmark-done-outline'}
                size={14}
                color={msg.read_at ? '#53bdeb' : (isMine ? 'rgba(255,255,255,0.5)' : mutedColor)}
                style={{ marginLeft: 3 }}
              />
            )}
            {msg._sending && (
              <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.5)" style={{ marginLeft: 3 }} />
            )}
          </View>
        </View>

        {/* Failed indicator */}
        {msg._failed && (
          <TouchableOpacity onPress={() => handleRetry(msg)} style={styles.retryBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  }, [user?.id, recipientAvatar, recipientName, textColor, mutedColor, dark, messagesWithHeaders, handleRetry]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} activeOpacity={0.7}>
          <Avatar uri={recipientAvatar} name={recipientName} size={36} />
          <View>
            <Text style={[styles.headerName, { color: textColor }]} numberOfLines={1}>{recipientName}</Text>
            <Text style={[styles.headerStatus, { color: mutedColor }]}>tap for info</Text>
          </View>
        </TouchableOpacity>
        <View style={{ width: 48 }} />
      </View>

      {/* Messages area */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={mutedColor} />
            <Text style={[styles.emptyText, { color: mutedColor }]}>No messages yet</Text>
            <Text style={[styles.emptySubtext, { color: mutedColor }]}>Say hello to start the conversation!</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messagesWithHeaders}
            renderItem={renderItem}
            keyExtractor={(item: any) => item.key || item.id}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            contentContainerStyle={styles.msgList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Input bar */}
        <View style={[
          styles.inputContainer,
          { backgroundColor: bg, marginBottom: keyboardHeight > 0 ? keyboardHeight : 0 },
        ]}>
          <View style={[styles.inputBar, { backgroundColor: inputBg }]}>
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { color: textColor }]}
              placeholder="Message"
              placeholderTextColor={mutedColor}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
            />
          </View>
          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, { opacity: text.trim() && !sending ? 1 : 0.4 }]}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  backBtn: { padding: 6 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 },
  headerName: { fontSize: 16, fontWeight: '600' },
  headerStatus: { fontSize: 12, marginTop: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 17, fontWeight: '600', marginTop: 12 },
  emptySubtext: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  msgList: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 },

  // Date header
  dateHeaderContainer: { alignItems: 'center', marginVertical: 12 },
  dateHeaderBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  dateHeaderText: { fontSize: 12, fontWeight: '500' },

  // Message rows
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: 4 },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },

  // Bubbles
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 5,
    elevation: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
  },
  bubbleMine: {
    backgroundColor: colors.primary[500],
    borderBottomRightRadius: 4,
  },
  bubbleMineFirst: {
    borderTopRightRadius: 16,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
  },
  bubbleOtherFirst: {
    borderTopLeftRadius: 16,
  },

  msgText: { fontSize: 15, lineHeight: 20 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 },
  msgTime: { fontSize: 11 },

  retryBtn: { marginLeft: 4, marginBottom: 4 },

  // Input area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  inputBar: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    minHeight: 42,
    maxHeight: 120,
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
