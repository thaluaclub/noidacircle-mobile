import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ConversationsScreen from '../screens/messages/ConversationsScreen';
import ChatScreen from '../screens/messages/ChatScreen';

export type MessagesStackParamList = {
  Conversations: undefined;
  Chat: { conversationId: string; recipientName: string; recipientAvatar?: string | null };
};

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export default function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Conversations" component={ConversationsScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}
