import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ReelsScreen from '../screens/reels/ReelsScreen';

export type ReelsStackParamList = {
  Reels: undefined;
};

const Stack = createNativeStackNavigator<ReelsStackParamList>();

export default function ReelsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Reels" component={ReelsScreen} />
    </Stack.Navigator>
  );
}
