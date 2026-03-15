import { create } from 'zustand';
import { storiesAPI } from '../services/api';

export interface Story {
  id: string;
  user_id: string;
  image_url: string | null;
  video_url: string | null;
  caption: string | null;
  media_type: 'image' | 'video' | 'text';
  bg_color: string | null;
  text_content: string | null;
  expires_at: string;
  views_count: number;
  created_at: string;
  is_viewed: boolean;
}

export interface StoryGroup {
  user: {
    id: string;
    username: string;
    full_name: string | null;
    profile_image_url: string | null;
    is_verified: boolean;
    account_type?: string;
  };
  stories: Story[];
  latest_at: string;
  has_unviewed: boolean;
}

interface StoriesState {
  groups: StoryGroup[];
  myStories: Story[];
  loading: boolean;
  refreshing: boolean;

  fetchStories: () => Promise<void>;
  refreshStories: () => Promise<void>;
  fetchMyStories: () => Promise<void>;
  markViewed: (storyId: string) => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;
}

const useStoriesStore = create<StoriesState>((set, get) => ({
  groups: [],
  myStories: [],
  loading: false,
  refreshing: false,

  fetchStories: async () => {
    const state = get();
    if (state.loading) return;
    set({ loading: true });
    try {
      const res = await storiesAPI.getFeed();
      set({ groups: res.data.groups || [], loading: false, refreshing: false });
    } catch {
      set({ loading: false, refreshing: false });
    }
  },

  refreshStories: async () => {
    set({ refreshing: true });
    await get().fetchStories();
  },

  fetchMyStories: async () => {
    try {
      const res = await storiesAPI.getMy();
      set({ myStories: res.data.stories || [] });
    } catch {}
  },

  markViewed: async (storyId: string) => {
    // Optimistic update
    set((state) => ({
      groups: state.groups.map(group => ({
        ...group,
        stories: group.stories.map(s =>
          s.id === storyId ? { ...s, is_viewed: true, views_count: s.views_count + 1 } : s
        ),
        has_unviewed: group.stories.some(s => s.id !== storyId && !s.is_viewed),
      })),
    }));

    try {
      await storiesAPI.markViewed(storyId);
    } catch {}
  },

  deleteStory: async (storyId: string) => {
    try {
      await storiesAPI.delete(storyId);
      set((state) => ({
        myStories: state.myStories.filter(s => s.id !== storyId),
        groups: state.groups.map(g => ({
          ...g,
          stories: g.stories.filter(s => s.id !== storyId),
        })).filter(g => g.stories.length > 0),
      }));
    } catch {}
  },
}));

export default useStoriesStore;
