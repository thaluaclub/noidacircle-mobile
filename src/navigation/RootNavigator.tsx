import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { lightTheme, darkTheme } from '../theme/colors';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import SplashScreen from '../screens/auth/SplashScreen';

export default function RootNavigator() {
  const { user, initialized, restoreSession } = useAuthStore();
  const { dark, init: initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
    restoreSession();
  }, []);

  if (!initialized) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={dark ? darkTheme : lightTheme}>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
