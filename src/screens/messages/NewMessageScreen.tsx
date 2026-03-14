import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Avatar from '../../components/Avatar';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import { usersAPI, messagesAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import type { MessagesStackParamList } from '../../navigation/MessagesStack';

type Nav = NativeStackNavigationProp<MessagesStackParamList, 'NewMessage'>;

interface SearchUser {
  id: string;
  username: string;
  full_name: string | null;
  profile_image_url: string | null;
  is_verified: boolean;
  account_type?: string;
}

export default function NewMessageScreen() {
  const dark = useThemeStore((s) => s.dark);
  const currentUser = useAuthStore((s) => s.user);
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeoutState] = useState<ReturnType<typeof setTimeout> | null>(null);

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const inputBg = dark ? colors.dark.card : '#f1f3f5';

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (text.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await usersAPI.search(text.trim());
        const users: SearchUser[] = (res.data.users || res.data || []).filter(
          (u: SearchUser) => u.id !== currentUser?.id
        );
        setResults(users);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    setSearchTimeoutState(timeout);
  }, [currentUser?.id, searchTimeout]);

  const handleSelectUser = useCallback(async (user: SearchUser) => {
    if (starting) return;
    setStarting(user.id);
    try {
      const res = await messagesAPI.createConversation({ participantId: user.id });
      const conv = res.data.conversation || res.data;
      navigation.replace('Chat', {
        conversationId: conv.id,
        recipientName: user.full_name || user.username,
        recipientAvatar: user.profile_image_url,
      });
    } catch {
      setStarting(null);
    }
  }, [navigation, starting]);

  const renderUser = useCallback(({ item }: { item: SearchUser }) => (
    <TouchableOpacity
      style={[styles.userItem, { borderBottomColor: borderColor }]}
      onPress={() => handleSelectUser(item)}
      activeOpacity={0.7}
      disabled={starting === item.id}
    >
      <Avatar uri={item.profile_image_url} name={item.full_name || item.username} size={48} />
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={[styles.userName, { color: textColor }]}>{item.full_name || item.username}</Text>
          {item.is_verified && <Ionicons name="checkmark-circle" size={14} color={colors.primary[500]} style={{ marginLeft: 3 }} />}
          {item.account_type && item.account_type !== 'individual' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.account_type}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.userHandle, { color: mutedColor }]}>@{item.username}</Text>
      </View>
      {starting === item.id ? (
        <ActivityIndicator size="small" color={colors.primary[500]} />
      ) : (
        <Ionicons name="chatbubble-outline" size={20} color={mutedColor} />
      )}
    </TouchableOpacity>
  ), [textColor, mutedColor, borderColor, handleSelectUser, starting]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>New Message</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.searchBar, { borderBottomColor: borderColor }]}>
        <Text style={[styles.toLabel, { color: mutedColor }]}>To:</Text>
        <TextInput
          style={[styles.searchInput, { color: textColor, backgroundColor: inputBg }]}
          placeholder="Search people..."
          placeholderTextColor={mutedColor}
          value={query}
          onChangeText={handleSearch}
          autoFocus
          returnKeyType="search"
        />
      </View>

      {searching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : query.trim().length < 2 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="search" size={48} color={dark ? colors.dark.border : '#ddd'} />
          <Text style={[styles.hintText, { color: mutedColor }]}>Search for people to message</Text>
          <Text style={[styles.hintSubtext, { color: mutedColor }]}>Type at least 2 characters to search</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="person-outline" size={48} color={dark ? colors.dark.border : '#ddd'} />
          <Text style={[styles.hintText, { color: mutedColor }]}>No users found</Text>
          <Text style={[styles.hintSubtext, { color: mutedColor }]}>Try a different name or username</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderUser}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5 },
  toLabel: { fontSize: 15, fontWeight: '600', marginRight: 10 },
  searchInput: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, minHeight: 36 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  hintText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  hintSubtext: { fontSize: 13, marginTop: 4 },
  userItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  userInfo: { flex: 1, marginLeft: 12 },
  userNameRow: { flexDirection: 'row', alignItems: 'center' },
  userName: { fontSize: 15, fontWeight: '600' },
  userHandle: { fontSize: 13, marginTop: 2 },
  badge: { marginLeft: 6, backgroundColor: 'rgba(59,130,246,0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '600', color: colors.primary[500], textTransform: 'capitalize' },
});
