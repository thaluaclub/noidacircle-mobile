import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FeedScreen from '../screens/feed/FeedScreen';
import PostDetailScreen from '../screens/feed/PostDetailScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import type { Post } from '../types';

export type FeedStackParamList = {
  Feed: undefined;
  PostDetail: { postId: string; post?: Post };
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<FeedStackParamList>();

export default function FeedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Feed" component={FeedScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}
