import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useThemeStore from '../../store/themeStore';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

interface PermissionStep {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
}

const STEPS: PermissionStep[] = [
  {
    key: 'notifications',
    icon: 'notifications-outline',
    title: 'Stay in the Loop',
    description: 'Get notified when someone likes your post, follows you, or sends you a message. You can customize these later in settings.',
    color: '#3b82f6',
  },
];

export default function PermissionsScreen({ onComplete }: { onComplete: () => void }) {
  const dark = useThemeStore((s) => s.dark);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;

  const step = STEPS[currentStep];

  const handleAllow = useCallback(async () => {
    setLoading(true);
    try {
      if (step.key === 'notifications') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          // Set up notification handler
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
            }),
          });
        }
      }
    } catch (err) {
      console.debug('Permission request failed:', err);
    } finally {
      setLoading(false);
      moveNext();
    }
  }, [currentStep, step]);

  const handleSkip = useCallback(() => {
    moveNext();
  }, [currentStep]);

  const moveNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All done - mark permissions as completed
      await AsyncStorage.setItem('permissions_completed', 'true');
      onComplete();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.content}>
        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i <= currentStep ? step.color : (dark ? '#333' : '#ddd') },
              ]}
            />
          ))}
        </View>

        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: step.color + '15' }]}>
          <Ionicons name={step.icon} size={64} color={step.color} />
        </View>

        {/* Text */}
        <Text style={[styles.title, { color: textColor }]}>{step.title}</Text>
        <Text style={[styles.description, { color: mutedColor }]}>{step.description}</Text>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.allowBtn, { backgroundColor: step.color }]}
            onPress={handleAllow}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.allowText}>{loading ? 'Please wait...' : 'Allow'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleSkip}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipText, { color: mutedColor }]}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.footer, { color: mutedColor }]}>
        You can change these anytime in Settings
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 48 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  iconCircle: { width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 48 },
  buttons: { width: '100%' },
  allowBtn: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  allowText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  skipBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 15 },
  footer: { fontSize: 12, textAlign: 'center', paddingBottom: 24 },
});
