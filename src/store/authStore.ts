import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, usersAPI, setOnUnauthorized } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  display_name?: string;
  full_name?: string;
  avatar_url?: string;
  profile_image_url?: string;
  bio?: string;
  location?: string;
  is_verified?: boolean;
  is_admin?: boolean;
  account_type?: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  signup: (data: { username: string; email: string; password: string; fullName?: string; phone?: string; account_type?: string }) => Promise<boolean>;
  setAuth: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  error: null,
  initialized: false,

  login: async (identifier: string, password: string) => {
    set({ loading: true, error: null });
    try {
      // Send as 'identifier' — backend handles both email and username
      const res = await authAPI.login({ identifier, password });
      const token = res.data.token || res.data.idToken;
      await AsyncStorage.setItem('nc_token', token);
      const profile = await usersAPI.me();
      await AsyncStorage.setItem('nc_user', JSON.stringify(profile.data));
      set({ user: profile.data, token, loading: false });
      return true;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Login failed. Check your credentials.';
      set({ error: message, loading: false });
      return false;
    }
  },

  signup: async (data) => {
    set({ loading: true, error: null });
    try {
      await authAPI.signup(data);
      return await get().login(data.email, data.password);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Signup failed. Please try again.';
      set({ error: message, loading: false });
      return false;
    }
  },

  setAuth: async (user: User, token: string) => {
    await AsyncStorage.setItem('nc_token', token);
    await AsyncStorage.setItem('nc_user', JSON.stringify(user));
    set({ user, token, loading: false });
  },

  logout: async () => {
    await AsyncStorage.removeItem('nc_token');
    await AsyncStorage.removeItem('nc_user');
    set({ user: null, token: null });
  },

  refreshProfile: async () => {
    try {
      const res = await usersAPI.me();
      await AsyncStorage.setItem('nc_user', JSON.stringify(res.data));
      set({ user: res.data });
    } catch {
      // silently fail
    }
  },

  restoreSession: async () => {
    try {
      const token = await AsyncStorage.getItem('nc_token');
      const userStr = await AsyncStorage.getItem('nc_user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ token, user, initialized: true });
        // Refresh profile in background
        get().refreshProfile();
      } else {
        set({ initialized: true });
      }
    } catch {
      set({ initialized: true });
    }
  },

  setUser: (user: User) => {
    set({ user });
    AsyncStorage.setItem('nc_user', JSON.stringify(user));
  },

  clearError: () => set({ error: null }),
}));

// Wire up 401 handler to auto-logout
setOnUnauthorized(() => {
  useAuthStore.getState().logout();
});

export default useAuthStore;
