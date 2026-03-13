import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ExploreScreen from '../screens/explore/ExploreScreen';
import SearchResultsScreen from '../screens/explore/SearchResultsScreen';
import PostDetailScreen from '../screens/feed/PostDetailScreen';
import type { Post } from '../types';

export type ExploreStackParamList = {
  Explore: undefined;
  SearchResults: { query: string; tab?: 'posts' | 'users' };
  PostDetail: { postId: string; post?: Post };
};

const Stack = createNativeStackNavigator<ExploreStackParamList>();

export default function ExploreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Explore" component={ExploreScreen} />
      <Stack.Screen
        name="SearchResults"
        component={SearchResultsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
