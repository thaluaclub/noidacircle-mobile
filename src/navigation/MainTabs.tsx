import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import useThemeStore from '../store/themeStore';

// Tab screens / stacks
import FeedStack from './FeedStack';
import ExploreStack from './ExploreStack';
import CreatePostScreen from '../screens/create/CreatePostScreen';
import MessagesStack from './MessagesStack';
import ProfileStack from './ProfileStack';

export type MainTabsParamList = {
  FeedTab: undefined;
  ExploreTab: undefined;
  CreateTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export default function MainTabs() {
  const dark = useThemeStore((s) => s.dark);

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
            case 'ExploreTab':
              iconName = focused ? 'search' : 'search-outline';
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
        name="ExploreTab"
        component={ExploreStack}
        options={{ tabBarLabel: 'Explore' }}
      />
      <Tab.Screen
        name="CreateTab"
        component={CreatePostScreen}
        options={{ tabBarLabel: '' }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStack}
        options={{ tabBarLabel: 'Chat' }}
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
