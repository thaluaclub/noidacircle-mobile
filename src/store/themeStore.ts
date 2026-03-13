import { create } from 'zustand';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeState {
  dark: boolean;
  initialized: boolean;
  toggle: () => void;
  init: () => Promise<void>;
}

const useThemeStore = create<ThemeState>((set, get) => ({
  dark: Appearance.getColorScheme() === 'dark',
  initialized: false,

  toggle: () => {
    set((state) => {
      const newDark = !state.dark;
      AsyncStorage.setItem('nc_theme', newDark ? 'dark' : 'light');
      return { dark: newDark };
    });
  },

  init: async () => {
    try {
      const saved = await AsyncStorage.getItem('nc_theme');
      if (saved) {
        set({ dark: saved === 'dark', initialized: true });
      } else {
        set({ dark: Appearance.getColorScheme() === 'dark', initialized: true });
      }
    } catch {
      set({ initialized: true });
    }
  },
}));

export default useThemeStore;
