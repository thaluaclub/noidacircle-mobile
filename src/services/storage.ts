import AsyncStorage from '@react-native-async-storage/async-storage';

const storage = {
  get: async (key: string): Promise<string | null> => {
    return AsyncStorage.getItem(key);
  },

  set: async (key: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(key, value);
  },

  getJSON: async <T>(key: string): Promise<T | null> => {
    const value = await AsyncStorage.getItem(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  setJSON: async (key: string, value: any): Promise<void> => {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  remove: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },

  multiRemove: async (keys: string[]): Promise<void> => {
    for (const key of keys) {
      await AsyncStorage.removeItem(key);
    }
  },

  clear: async (): Promise<void> => {
    await AsyncStorage.clear();
  },
};

export default storage;
