import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import FollowListScreen from '../screens/profile/FollowListScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import VerificationScreen from '../screens/settings/VerificationScreen';
import CommunitiesScreen from '../screens/communities/CommunitiesScreen';
import PostDetailScreen from '../screens/feed/PostDetailScreen';
import type { Post } from '../types';

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  FollowList: { userId: string; tab: 'followers' | 'following'; username: string };
  UserProfile: { userId: string };
  Settings: undefined;
  Verification: undefined;
  Communities: undefined;
  PostDetail: { postId: string; post?: Post };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="FollowList" component={FollowListScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Verification" component={VerificationScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Communities" component={CommunitiesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}