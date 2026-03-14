import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FeedScreen from '../screens/feed/FeedScreen';
import PostDetailScreen from '../screens/feed/PostDetailScreen';
import EditPostScreen from '../screens/feed/EditPostScreen';
import ReelViewerScreen from '../screens/feed/ReelViewerScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import CommunitiesScreen from '../screens/communities/CommunitiesScreen';
import ExploreScreen from '../screens/explore/ExploreScreen';
import type { Post } from '../types';

export type FeedStackParamList = {
  Feed: undefined;
  PostDetail: { postId: string; post?: Post };
  EditPost: { post: Post };
  ReelViewer: { post: Post; startIndex?: number };
  Notifications: undefined;
  UserProfile: { userId: string };
  Communities: undefined;
  Explore: undefined;
};

const Stack = createNativeStackNavigator<FeedStackParamList>();

export default function FeedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Feed" component={FeedScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="EditPost" component={EditPostScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="ReelViewer" component={ReelViewerScreen} options={{ animation: 'slide_from_bottom', headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Communities" component={CommunitiesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Explore" component={ExploreScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}
