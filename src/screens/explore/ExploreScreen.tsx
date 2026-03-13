import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../../store/themeStore';
import { colors } from '../../theme/colors';

export default function ExploreScreen() {
  const dark = useThemeStore((s) => s.dark);
  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.content}>
        <Ionicons name="compass-outline" size={64} color={mutedColor} />
        <Text style={[styles.title, { color: textColor }]}>Explore</Text>
        <Text style={[styles.subtitle, { color: mutedColor }]}>
          Discover content and communities.{'\n'}Coming in Phase 3.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
