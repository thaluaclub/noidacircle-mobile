import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StoriesScreen from '../screens/stories/StoriesScreen';
import StoryViewerScreen from '../screens/stories/StoryViewerScreen';
import CreateStoryScreen from '../screens/stories/CreateStoryScreen';

export type StoriesStackParamList = {
  Stories: undefined;
  StoryViewer: { groupIndex: number; storyIndex?: number };
  CreateStory: undefined;
};

const Stack = createNativeStackNavigator<StoriesStackParamList>();

export default function StoriesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Stories" component={StoriesScreen} />
      <Stack.Screen
        name="StoryViewer"
        component={StoryViewerScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="CreateStory"
        component={CreateStoryScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}
