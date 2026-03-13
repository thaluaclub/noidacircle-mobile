import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import { colors } from '../../theme/colors';
import { formatCount } from '../../utils/formatters';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { dark, toggle } = useThemeStore();

  const bg = dark ? colors.dark.bg : '#ffffff';
  const cardBg = dark ? colors.dark.card : colors.light.card;
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          @{user?.username}
        </Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={toggle} style={styles.iconBtn}>
            <Ionicons
              name={dark ? 'sunny-outline' : 'moon-outline'}
              size={22}
              color={textColor}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={22} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.profileSection}>
        <Avatar
          uri={user?.avatar_url}
          name={user?.display_name || user?.username || ''}
          size={80}
        />
        <Text style={[styles.displayName, { color: textColor }]}>
          {user?.display_name || user?.username}
        </Text>
        {user?.bio ? (
          <Text style={[styles.bio, { color: mutedColor }]}>{user.bio}</Text>
        ) : null}
        {user?.location ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={mutedColor} />
            <Text style={[styles.location, { color: mutedColor }]}>
              {user.location}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { borderColor }]}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: textColor }]}>
            {formatCount(user?.posts_count || 0)}
          </Text>
          <Text style={[styles.statLabel, { color: mutedColor }]}>Posts</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: textColor }]}>
            {formatCount(user?.followers_count || 0)}
          </Text>
          <Text style={[styles.statLabel, { color: mutedColor }]}>
            Followers
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: textColor }]}>
            {formatCount(user?.following_count || 0)}
          </Text>
          <Text style={[styles.statLabel, { color: mutedColor }]}>
            Following
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Edit Profile"
          variant="outline"
          size="sm"
          style={{ flex: 1, marginRight: 8 }}
          onPress={() => {}}
        />
        <Button
          title="Sign Out"
          variant="ghost"
          size="sm"
          onPress={logout}
          textStyle={{ color: colors.error }}
        />
      </View>

      {/* Placeholder */}
      <View style={styles.placeholder}>
        <Ionicons name="grid-outline" size={48} color={mutedColor} />
        <Text style={[styles.placeholderText, { color: mutedColor }]}>
          User posts grid coming in Phase 5
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  bio: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  location: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginTop: 16,
    marginHorizontal: 16,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
  },
  stat: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
