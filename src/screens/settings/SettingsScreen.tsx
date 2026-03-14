import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import Avatar from '../../components/Avatar';
import { colors } from '../../theme/colors';

interface SettingItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuthStore();
  const { dark, toggle } = useThemeStore();

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const cardBg = dark ? colors.dark.card : '#f8f9fa';

  const handleLogout = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }, [logout]);

  const sections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Appearance',
      items: [
        {
          icon: dark ? 'moon' : 'sunny',
          label: 'Dark Mode',
          rightElement: <Switch value={dark} onValueChange={toggle} trackColor={{ true: colors.primary[500] }} />,
        },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', label: 'Edit Profile', onPress: () => navigation.goBack() },
        { icon: 'shield-checkmark-outline', label: 'Request Verification', onPress: () => (navigation as any).navigate('Verification') },
        { icon: 'lock-closed-outline', label: 'Privacy', onPress: () => {} },
        { icon: 'notifications-outline', label: 'Push Notifications', onPress: () => Linking.openSettings() },
        { icon: 'shield-outline', label: 'Security', onPress: () => {} },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', onPress: () => Linking.openURL('https://noidacircle.com') },
        { icon: 'information-circle-outline', label: 'About', onPress: () => Alert.alert('NoidaCircle', 'Version 1.0.0\nBuilt for the Noida community') },
        { icon: 'document-text-outline', label: 'Terms of Service', onPress: () => Linking.openURL('https://noidacircle.com/terms') },
        { icon: 'shield-checkmark-outline', label: 'Privacy Policy', onPress: () => Linking.openURL('https://noidacircle.com/privacy') },
      ],
    },
    {
      title: '',
      items: [
        { icon: 'log-out-outline', label: 'Sign Out', onPress: handleLogout, danger: true },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User card */}
        <View style={[styles.userCard, { backgroundColor: cardBg }]}>
          <Avatar uri={user?.avatar_url || user?.profile_image_url} name={user?.display_name || user?.full_name || user?.username || ''} size={50} />
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: textColor }]}>{user?.display_name || user?.username}</Text>
            <Text style={[styles.userEmail, { color: mutedColor }]}>{user?.email}</Text>
          </View>
        </View>

        {sections.map((section, sIndex) => (
          <View key={sIndex} style={styles.section}>
            {section.title ? <Text style={[styles.sectionTitle, { color: mutedColor }]}>{section.title}</Text> : null}
            <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor }]}>
              {section.items.map((item, iIndex) => (
                <TouchableOpacity
                  key={iIndex}
                  onPress={item.onPress}
                  disabled={!item.onPress && !item.rightElement}
                  style={[styles.settingItem, iIndex < section.items.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: borderColor }]}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingLeft}>
                    <Ionicons name={item.icon} size={20} color={item.danger ? colors.error : textColor} />
                    <Text style={[styles.settingLabel, { color: item.danger ? colors.error : textColor }]}>{item.label}</Text>
                  </View>
                  {item.rightElement || (item.onPress && <Ionicons name="chevron-forward" size={18} color={mutedColor} />)}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={[styles.version, { color: mutedColor }]}>NoidaCircle v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  userCard: { flexDirection: 'row', alignItems: 'center', margin: 16, padding: 16, borderRadius: 12 },
  userInfo: { marginLeft: 12, flex: 1 },
  userName: { fontSize: 16, fontWeight: '600' },
  userEmail: { fontSize: 13, marginTop: 2 },
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', paddingHorizontal: 16, marginBottom: 6 },
  sectionCard: { marginHorizontal: 16, borderRadius: 12, borderWidth: 0.5 },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontSize: 15 },
  version: { textAlign: 'center', fontSize: 12, paddingVertical: 20 },
});