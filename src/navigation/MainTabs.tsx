import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Platform, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import useThemeStore from '../store/themeStore';
import { messagesAPI } from '../services/api';

// Tab screens / stacks
import FeedStack from './FeedStack';
import StoriesStack from './StoriesStack';
import CreatePostScreen from '../screens/create/CreatePostScreen';
import MessagesStack from './MessagesStack';
import ProfileStack from './ProfileStack';

export type MainTabsParamList = {
  FeedTab: undefined;
  StoriesTab: undefined;
  CreateTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export default function MainTabs() {
  const dark = useThemeStore((s) => s.dark);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Fetch unread message count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await messagesAPI.getConversations();
        const convos = res.data.conversations || res.data || [];
        const total = convos.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);
        setUnreadMessages(total);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'FeedTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'StoriesTab':
              iconName = focused ? 'albums' : 'albums-outline';
              break;
            case 'CreateTab':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'MessagesTab':
              iconName = focused ? 'chatbubble' : 'chatbubble-outline';
              break;
            case 'ProfileTab':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          if (route.name === 'CreateTab') {
            return (
              <View style={styles.createButton}>
                <Ionicons name="add" size={28} color="#fff" />
              </View>
            );
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: dark ? colors.dark.muted : colors.light.muted,
        tabBarStyle: {
          backgroundColor: dark ? colors.dark.card : '#ffffff',
          borderTopColor: dark ? colors.dark.border : colors.light.border,
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedStack}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="StoriesTab"
        component={StoriesStack}
        options={{ tabBarLabel: 'Stories' }}
      />
      <Tab.Screen
        name="CreateTab"
        component={CreatePostScreen}
        options={{ tabBarLabel: '' }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStack}
        options={{
          tabBarLabel: 'Chat',
          tabBarBadge: unreadMessages > 0 ? (unreadMessages > 99 ? '99+' : unreadMessages) : undefined,
          tabBarBadgeStyle: unreadMessages > 0 ? { backgroundColor: colors.error, fontSize: 10, fontWeight: '700', minWidth: 18, height: 18, borderRadius: 9 } : undefined,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
