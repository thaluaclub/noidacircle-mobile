import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Avatar from '../../components/Avatar';
import PostCard from '../../components/PostCard';
import EmptyState from '../../components/EmptyState';
import useThemeStore from '../../store/themeStore';
import usePostsStore from '../../store/postsStore';
import { usersAPI, postsAPI } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { colors } from '../../theme/colors';
import type { Post, SearchUser } from '../../types';
import type { ExploreStackParamList } from '../../navigation/ExploreStack';

type SearchRoute = RouteProp<ExploreStackParamList, 'SearchResults'>;
type SearchNav = NativeStackNavigationProp<ExploreStackParamList, 'SearchResults'>;

type Tab = 'users' | 'posts';

export default function SearchResultsScreen() {
  const route = useRoute<SearchRoute>();
  const navigation = useNavigation<SearchNav>();
  const dark = useThemeStore((s) => s.dark);
  const { toggleLike, toggleBookmark } = usePostsStore();

  const [query, setQuery] = useState(route.params?.query || '');
  const [activeTab, setActiveTab] = useState<Tab>(route.params?.tab || 'users');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [postPage, setPostPage] = useState(1);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  const inputRef = useRef<TextInput>(null);
  const debouncedQuery = useDebounce(query, 400);

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const cardBg = dark ? colors.dark.card : '#f1f3f5';

  // Auto-focus search input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Search users
  const searchUsers = useCallback(
    async (q: string, p: number = 1) => {
      if (q.length < 2) {
        setUsers([]);
        return;
      }
      try {
        if (p === 1) setLoadingUsers(true);
        const res = await usersAPI.search(q);
        const data = res.data;
        const newUsers: SearchUser[] = data.users || data;
        setUsers((prev) => (p === 1 ? newUsers : [...prev, ...newUsers]));
        setUserPage(p);
        if (data.pagination) {
          setHasMoreUsers(p < data.pagination.totalPages);
        } else {
          setHasMoreUsers(false);
        }
      } catch {
        // silent
      } finally {
        setLoadingUsers(false);
      }
    },
    []
  );

  // Search posts (using explore with client-side filter for now)
  const searchPosts = useCallback(
    async (q: string, p: number = 1) => {
      if (q.length < 2) {
        setPosts([]);
        return;
      }
      try {
        if (p === 1) setLoadingPosts(true);
        // Backend explore doesn't have search param, so fetch and filter client-side
        const res = await postsAPI.getAll(p, 30);
        const { posts: allPosts, pagination } = res.data;
        const filtered = allPosts.filter(
          (post: Post) =>
            post.content?.toLowerCase().includes(q.toLowerCase()) ||
            post.title?.toLowerCase().includes(q.toLowerCase()) ||
            post.user?.username?.toLowerCase().includes(q.toLowerCase()) ||
            post.user?.full_name?.toLowerCase().includes(q.toLowerCase())
        );
        setPosts((prev) => (p === 1 ? filtered : [...prev, ...filtered]));
        setPostPage(p);
        setHasMorePosts(p < pagination.totalPages);
      } catch {
        // silent
      } finally {
        setLoadingPosts(false);
      }
    },
    []
  );

  // Trigger search on debounced query change
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchUsers(debouncedQuery, 1);
      searchPosts(debouncedQuery, 1);
    } else {
      setUsers([]);
      setPosts([]);
    }
  }, [debouncedQuery, searchUsers, searchPosts]);

  const handlePostPress = useCallback(
    (post: Post) => {
      navigation.navigate('PostDetail', { postId: post.id, post });
    },
    [navigation]
  );

  const handleUserPress = useCallback(
    (_userId: string) => {
      // Will navigate to profile in Phase 4
    },
    []
  );

  const renderUserItem = useCallback(
    ({ item }: { item: SearchUser }) => (
      <TouchableOpacity
        onPress={() => handleUserPress(item.id)}
        style={[styles.userItem, { borderBottomColor: borderColor }]}
        activeOpacity={0.7}
      >
        <Avatar
          uri={item.profile_image_url}
          name={item.full_name || item.username}
          size={48}
        />
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={[styles.userDisplayName, { color: textColor }]}>
              {item.full_name || item.username}
            </Text>
            {item.is_verified && (
              <Ionicons
                name="checkmark-circle"
                size={15}
                color={colors.primary[500]}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
          <Text style={[styles.userHandle, { color: mutedColor }]}>
            @{item.username}
          </Text>
          {item.bio && (
            <Text
              style={[styles.userBio, { color: mutedColor }]}
              numberOfLines={1}
            >
              {item.bio}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    ),
    [textColor, mutedColor, borderColor, handleUserPress]
  );

  const renderPostItem = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        post={item}
        dark={dark}
        onPress={() => handlePostPress(item)}
        onLike={() => toggleLike(item.id)}
        onBookmark={() => toggleBookmark(item.id)}
        onComment={() => handlePostPress(item)}
        onUserPress={handleUserPress}
      />
    ),
    [dark, toggleLike, toggleBookmark, handlePostPress, handleUserPress]
  );

  const isLoading = activeTab === 'users' ? loadingUsers : loadingPosts;
  const isEmpty =
    activeTab === 'users' ? users.length === 0 : posts.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      {/* Search Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View
          style={[styles.searchInput, { backgroundColor: cardBg }]}
        >
          <Ionicons name="search" size={16} color={mutedColor} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: textColor }]}
            placeholder="Search people, posts..."
            placeholderTextColor={mutedColor}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={mutedColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: borderColor }]}>
        {(['users', 'posts'] as Tab[]).map((tab) => {
          const isActive = activeTab === tab;
          const count = tab === 'users' ? users.length : posts.length;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                isActive && styles.activeTab,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? colors.primary[500] : mutedColor,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                {tab === 'users' ? 'People' : 'Posts'}
                {debouncedQuery.length >= 2 && ` (${count})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Results */}
      {debouncedQuery.length < 2 ? (
        <View style={styles.promptContainer}>
          <Ionicons name="search" size={48} color={mutedColor} />
          <Text style={[styles.promptText, { color: mutedColor }]}>
            Type at least 2 characters to search
          </Text>
        </View>
      ) : isLoading && isEmpty ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : activeTab === 'users' ? (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No people found"
              subtitle={`No users matching "${debouncedQuery}"`}
              dark={dark}
            />
          }
          onEndReached={() => {
            if (hasMoreUsers && !loadingUsers) {
              searchUsers(debouncedQuery, userPage + 1);
            }
          }}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState
              icon="newspaper-outline"
              title="No posts found"
              subtitle={`No posts matching "${debouncedQuery}"`}
              dark={dark}
            />
          }
          onEndReached={() => {
            if (hasMorePosts && !loadingPosts) {
              searchPosts(debouncedQuery, postPage + 1);
            }
          }}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary[500],
  },
  tabText: {
    fontSize: 14,
  },
  promptContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  promptText: {
    fontSize: 15,
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDisplayName: {
    fontSize: 15,
    fontWeight: '600',
  },
  userHandle: {
    fontSize: 13,
    marginTop: 1,
  },
  userBio: {
    fontSize: 13,
    marginTop: 3,
  },
});
