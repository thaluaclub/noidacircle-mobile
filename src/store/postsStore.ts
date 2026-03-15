import { create } from 'zustand';
import { postsAPI, likesAPI, bookmarksAPI } from '../services/api';
import type { Post } from '../types';

interface PostsState {
  posts: Post[];
  loading: boolean;
  refreshing: boolean;
  page: number;
  hasMore: boolean;
  error: string | null;
  feedType: string;

  setFeedType: (type: string) => void;
  fetchFeed: (page?: number) => Promise<void>;
  refreshFeed: () => Promise<void>;
  loadMore: () => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  toggleDownvote: (postId: string) => Promise<void>;
  toggleBookmark: (postId: string) => Promise<void>;
  addPost: (post: Post) => void;
  removePost: (postId: string) => void;
  reset: () => void;
}

const usePostsStore = create<PostsState>((set, get) => ({
  posts: [],
  loading: false,
  refreshing: false,
  page: 1,
  hasMore: true,
  error: null,
  feedType: 'all',

  setFeedType: (type: string) => {
    set({ feedType: type, posts: [], page: 1, hasMore: true });
    get().fetchFeed(1);
  },

  fetchFeed: async (page = 1) => {
    const state = get();
    if (state.loading) return;

    set({ loading: page === 1, error: null });
    try {
      const res = await postsAPI.getFeed(page, 15, state.feedType);
      const { posts: newPosts, pagination } = res.data;

      set({
        posts: page === 1 ? newPosts : [...state.posts, ...newPosts],
        page,
        hasMore: page < pagination.totalPages,
        loading: false,
        refreshing: false,
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Failed to load feed',
        loading: false,
        refreshing: false,
      });
    }
  },

  refreshFeed: async () => {
    set({ refreshing: true });
    await get().fetchFeed(1);
  },

  loadMore: async () => {
    const { hasMore, loading, page } = get();
    if (!hasMore || loading) return;
    await get().fetchFeed(page + 1);
  },

  toggleLike: async (postId: string) => {
    const { posts } = get();
    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) return;

    const post = posts[postIndex];
    const wasLiked = post.is_liked;
    const wasDownvoted = post.is_downvoted;

    // Optimistic update - if liking, also remove downvote
    const updatedPosts = [...posts];
    updatedPosts[postIndex] = {
      ...post,
      is_liked: !wasLiked,
      likes_count: wasLiked
        ? Math.max(0, post.likes_count - 1)
        : post.likes_count + 1,
      // Remove downvote if liking
      is_downvoted: wasLiked ? post.is_downvoted : false,
      downvotes_count: (!wasLiked && wasDownvoted)
        ? Math.max(0, (post.downvotes_count || 0) - 1)
        : post.downvotes_count,
    };
    set({ posts: updatedPosts });

    // API call
    try {
      if (wasLiked) {
        await likesAPI.unlikePost(postId);
      } else {
        await likesAPI.likePost(postId);
      }
    } catch {
      // Revert on error
      const currentPosts = get().posts;
      const idx = currentPosts.findIndex((p) => p.id === postId);
      if (idx !== -1) {
        const reverted = [...currentPosts];
        reverted[idx] = { ...reverted[idx], is_liked: wasLiked, likes_count: post.likes_count, is_downvoted: post.is_downvoted, downvotes_count: post.downvotes_count };
        set({ posts: reverted });
      }
    }
  },

  toggleDownvote: async (postId: string) => {
    const { posts } = get();
    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) return;

    const post = posts[postIndex];
    const wasDownvoted = post.is_downvoted;
    const wasLiked = post.is_liked;

    // Optimistic update - if downvoting, also remove like
    const updatedPosts = [...posts];
    updatedPosts[postIndex] = {
      ...post,
      is_downvoted: !wasDownvoted,
      downvotes_count: wasDownvoted
        ? Math.max(0, (post.downvotes_count || 0) - 1)
        : (post.downvotes_count || 0) + 1,
      // Remove like if downvoting
      is_liked: wasDownvoted ? post.is_liked : false,
      likes_count: (!wasDownvoted && wasLiked)
        ? Math.max(0, post.likes_count - 1)
        : post.likes_count,
    };
    set({ posts: updatedPosts });

    try {
      if (wasDownvoted) {
        await likesAPI.removeDownvote(postId);
      } else {
        await likesAPI.downvotePost(postId);
      }
    } catch {
      const currentPosts = get().posts;
      const idx = currentPosts.findIndex((p) => p.id === postId);
      if (idx !== -1) {
        const reverted = [...currentPosts];
        reverted[idx] = { ...reverted[idx], is_downvoted: wasDownvoted, downvotes_count: post.downvotes_count, is_liked: post.is_liked, likes_count: post.likes_count };
        set({ posts: reverted });
      }
    }
  },

  toggleBookmark: async (postId: string) => {
    const { posts } = get();
    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) return;

    const post = posts[postIndex];
    const wasBookmarked = post.is_bookmarked;

    // Optimistic update
    const updatedPosts = [...posts];
    updatedPosts[postIndex] = {
      ...post,
      is_bookmarked: !wasBookmarked,
    };
    set({ posts: updatedPosts });

    try {
      if (wasBookmarked) {
        await bookmarksAPI.unbookmark(postId);
      } else {
        await bookmarksAPI.bookmark(postId);
      }
    } catch {
      // Revert
      const currentPosts = get().posts;
      const idx = currentPosts.findIndex((p) => p.id === postId);
      if (idx !== -1) {
        const reverted = [...currentPosts];
        reverted[idx] = { ...reverted[idx], is_bookmarked: wasBookmarked };
        set({ posts: reverted });
      }
    }
  },

  addPost: (post: Post) => {
    set((state) => ({ posts: [post, ...state.posts] }));
  },

  removePost: (postId: string) => {
    set((state) => ({ posts: state.posts.filter((p) => p.id !== postId) }));
  },

  reset: () => {
    set({ posts: [], loading: false, refreshing: false, page: 1, hasMore: true, error: null, feedType: 'all' });
  },
}));

export default usePostsStore;
