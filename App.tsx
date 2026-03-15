import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import useThemeStore from './src/store/themeStore';
import useAuthStore from './src/store/authStore';
import { usersAPI } from './src/services/api';

export default function App() {
  const dark = useThemeStore((s) => s.dark);
  const user = useAuthStore((s) => s.user);
  const appStateRef = useRef<AppStateStatus>('active');
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Send heartbeat and handle app state changes
  useEffect(() => {
    // Function to send heartbeat to server
    const sendHeartbeat = async () => {
      if (!user?.id) return;
      try {
        await usersAPI.heartbeat();
      } catch (err) {
        // Silently fail - heartbeat failure is not critical
        console.debug('Heartbeat failed');
      }
    };

    // Function to notify server when going offline
    const notifyOffline = async () => {
      if (!user?.id) return;
      try {
        await usersAPI.goOffline();
      } catch (err) {
        // Silently fail
        console.debug('Offline notification failed');
      }
    };

    // Set up heartbeat interval - send heartbeat every 2 minutes when logged in
    if (user?.id && !heartbeatIntervalRef.current) {
      // Send initial heartbeat
      sendHeartbeat();
      // Set up recurring heartbeat
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 2 * 60 * 1000); // 2 minutes
    }

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appStateRef.current !== nextAppState) {
        // App is moving to background
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          notifyOffline();
          // Clear heartbeat interval when app goes to background
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
        }
        // App is coming back to foreground
        if (nextAppState === 'active' && appStateRef.current !== 'active') {
          sendHeartbeat();
          // Restart heartbeat interval
          if (!heartbeatIntervalRef.current && user?.id) {
            heartbeatIntervalRef.current = setInterval(sendHeartbeat, 2 * 60 * 1000);
          }
        }
        appStateRef.current = nextAppState;
      }
    });

    // Cleanup
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      subscription.remove();
    };
  }, [user?.id]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RootNavigator />
        <StatusBar style={dark ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
