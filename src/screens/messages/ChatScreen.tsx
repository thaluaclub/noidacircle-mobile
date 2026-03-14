import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  Platform, ActivityIndicator, Keyboard, KeyboardEvent,
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
import { timeAgo } from '../../utils/formatters';
import type { MessagesStackParamList } from '../../navigation/MessagesStack';

type Route = RouteProp<MessagesStackParamList, 'Chat'>;

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_edited: boolean;
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

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const bubbleBg = dark ? colors.dark.card : '#f1f3f5';

  useEffect(() => {
    messagesAPI.getMessages(conversationId, 50).then((res) => {
      const msgs = res.data.messages || res.data || [];
      setMessages(msgs.reverse());
    }).finally(() => setLoading(false));
  }, [conversationId]);

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
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setText('');

    try {
      const res = await messagesAPI.send(conversationId, { content });
      const newMsg = res.data.message || res.data;
      setMessages((prev) => prev.map((m) => m.id === tempId ? newMsg : m));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(content);
    } finally {
      setSending(false);
    }
  }, [text, sending, conversationId, user?.id]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isMine = item.sender_id === user?.id;
    return (
      <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
        {!isMine && <Avatar uri={recipientAvatar} name={recipientName} size={28} />}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : { backgroundColor: bubbleBg }]}>
          <Text style={[styles.msgText, { color: isMine ? '#fff' : textColor }]}>{item.content}</Text>
          <Text style={[styles.msgTime, { color: isMine ? 'rgba(255,255,255,0.7)' : mutedColor }]}>{timeAgo(item.created_at)}</Text>
        </View>
      </View>
    );
  }, [user?.id, recipientAvatar, recipientName, textColor, mutedColor, bubbleBg]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Avatar uri={recipientAvatar} name={recipientName} size={32} />
          <Text style={[styles.headerName, { color: textColor }]}>{recipientName}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            contentContainerStyle={styles.msgList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        <View style={[
          styles.inputBar,
          { borderTopColor: borderColor, backgroundColor: bg, marginBottom: keyboardHeight > 0 ? keyboardHeight : 0 },
        ]}>
          <TextInput
            style={[styles.textInput, { color: textColor, backgroundColor: bubbleBg }]}
            placeholder="Type a message..."
            placeholderTextColor={mutedColor}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity onPress={handleSend} disabled={!text.trim() || sending} style={{ opacity: text.trim() && !sending ? 1 : 0.4 }}>
            <Ionicons name="send" size={22} color={colors.primary[500]} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerName: { fontSize: 16, fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  msgList: { paddingHorizontal: 12, paddingVertical: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8, gap: 6 },
  msgRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMine: { backgroundColor: colors.primary[500], borderBottomRightRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 21 },
  msgTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 0.5, gap: 8 },
  textInput: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, maxHeight: 100, minHeight: 36 },
});
