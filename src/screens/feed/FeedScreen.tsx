import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { colors } from '../../theme/colors';

export default function FeedScreen() {
  const user = useAuthStore((s) => s.user);
  const dark = useThemeStore((s) => s.dark);

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.logo, { color: textColor }]}>NoidaCircle</Text>
        <View style={styles.headerIcons}>
          <Ionicons
            name="heart-outline"
            size={24}
            color={textColor}
            style={styles.headerIcon}
          />
          <Ionicons
            name="notifications-outline"
            size={24}
            color={textColor}
          />
        </View>
      </View>

      {/* Placeholder content */}
      <View style={styles.content}>
        <Ionicons name="newspaper-outline" size={64} color={mutedColor} />
        <Text style={[styles.welcomeText, { color: textColor }]}>
          Welcome, {user?.display_name || user?.username || 'there'}!
        </Text>
        <Text style={[styles.placeholderText, { color: mutedColor }]}>
          Feed will load here with FlashList infinite scroll.
          {'\n'}Coming in Phase 2.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.light.border,
  },
  logo: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    marginRight: 0,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
