import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { lightTheme, darkTheme } from '../theme/colors';
import { notificationsAPI } from '../services/api';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import SplashScreen from '../screens/auth/SplashScreen';
import PermissionsScreen from '../screens/auth/PermissionsScreen';

// Set up notification handler globally
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootNavigator() {
  const { user, initialized, restoreSession } = useAuthStore();
  const { dark, init: initTheme } = useThemeStore();
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [needsPermissions, setNeedsPermissions] = useState(false);

  useEffect(() => {
    initTheme();
    restoreSession();
  }, []);

  // Check if permissions have been shown
  useEffect(() => {
    if (user && initialized) {
      AsyncStorage.getItem('permissions_completed').then((val) => {
        if (val !== 'true') {
          setNeedsPermissions(true);
        }
        setPermissionsChecked(true);
      });
    } else if (!user && initialized) {
      setPermissionsChecked(true);
    }
  }, [user, initialized]);

  // Register FCM token when user is logged in
  useEffect(() => {
    if (!user?.id) return;

    const registerPushToken = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        if (existingStatus !== 'granted') return;

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'a486319f-13c4-4101-a54c-110a576a5c5d',
        });

        if (tokenData?.data) {
          await notificationsAPI.registerToken(tokenData.data);
        }
      } catch (err) {
        console.debug('FCM token registration failed:', err);
      }
    };

    registerPushToken();
  }, [user?.id]);

  const handlePermissionsComplete = useCallback(() => {
    setNeedsPermissions(false);
  }, []);

  if (!initialized || !permissionsChecked) {
    return <SplashScreen />;
  }

  if (user && needsPermissions) {
    return <PermissionsScreen onComplete={handlePermissionsComplete} />;
  }

  return (
    <NavigationContainer theme={dark ? darkTheme : lightTheme}>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
