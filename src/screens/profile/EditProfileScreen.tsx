import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import { usersAPI } from '../../services/api';
import { uploadFile, getMimeType } from '../../services/upload';
import { colors } from '../../theme/colors';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { user, setUser } = useAuthStore();
  const dark = useThemeStore((s) => s.dark);

  const [displayName, setDisplayName] = useState(user?.display_name || user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [accountType, setAccountType] = useState(user?.account_type || 'individual');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const ACCOUNT_TYPES = [
    { key: 'individual', label: 'Individual', icon: 'person-outline', desc: 'Personal account' },
    { key: 'business', label: 'Business', icon: 'briefcase-outline', desc: 'Company or startup' },
    { key: 'brand', label: 'Brand', icon: 'pricetag-outline', desc: 'Product or brand page' },
    { key: 'page', label: 'Page', icon: 'flag-outline', desc: 'Public figure or community' },
  ];

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const inputBg = dark ? colors.dark.card : '#f8f9fa';

  const pickAvatar = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      let profileImageUrl = user?.profile_image_url || user?.avatar_url;

      if (avatarUri) {
        const mime = getMimeType(avatarUri);
        profileImageUrl = await uploadFile(avatarUri, 'avatars', mime);
      }

      const data: any = {
        full_name: displayName.trim(),
        display_name: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        account_type: accountType,
      };
      if (profileImageUrl) data.profile_image_url = profileImageUrl;

      await usersAPI.updateProfile(data);

      // Also update account type via dedicated endpoint
      try {
        await usersAPI.updateAccountType({ account_type: accountType });
      } catch {}

      setUser({ ...user!, ...data, account_type: accountType, profile_image_url: profileImageUrl || user?.profile_image_url, avatar_url: profileImageUrl || user?.avatar_url });

      Alert.alert('Saved', 'Profile updated successfully');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }, [displayName, bio, location, avatarUri, user, setUser, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar}>
            <Avatar
              uri={avatarUri || user?.profile_image_url || user?.avatar_url}
              name={user?.display_name || user?.full_name || user?.username || ''}
              size={90}
            />
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickAvatar}>
            <Text style={{ color: colors.primary[500], fontSize: 14, fontWeight: '500', marginTop: 8 }}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: mutedColor }]}>Display Name</Text>
          <TextInput
            style={[styles.input, { color: textColor, backgroundColor: inputBg, borderColor }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={mutedColor}
            maxLength={50}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: mutedColor }]}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput, { color: textColor, backgroundColor: inputBg, borderColor }]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people about yourself"
            placeholderTextColor={mutedColor}
            multiline
            maxLength={160}
          />
          <Text style={[styles.charCount, { color: mutedColor }]}>{bio.length}/160</Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: mutedColor }]}>Location</Text>
          <TextInput
            style={[styles.input, { color: textColor, backgroundColor: inputBg, borderColor }]}
            value={location}
            onChangeText={setLocation}
            placeholder="Noida, UP"
            placeholderTextColor={mutedColor}
            maxLength={50}
          />
        </View>

        {/* Account Type */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: mutedColor }]}>Account Type</Text>
          <View style={styles.accountTypeGrid}>
            {ACCOUNT_TYPES.map((type) => {
              const isSelected = accountType === type.key;
              return (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.accountTypeCard,
                    { borderColor: isSelected ? colors.primary[500] : borderColor, backgroundColor: isSelected ? (dark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)') : inputBg },
                  ]}
                  onPress={() => setAccountType(type.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={type.icon as any} size={22} color={isSelected ? colors.primary[500] : mutedColor} />
                  <Text style={[styles.accountTypeLabel, { color: isSelected ? colors.primary[500] : textColor }]}>{type.label}</Text>
                  <Text style={[styles.accountTypeDesc, { color: mutedColor }]}>{type.desc}</Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary[500]} style={{ position: 'absolute', top: 8, right: 8 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Button
          title={saving ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          disabled={saving}
          loading={saving}
          style={{ marginTop: 24, marginHorizontal: 16 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  body: { flex: 1 },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.primary[500], borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  field: { paddingHorizontal: 16, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: { borderRadius: 10, borderWidth: 0.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },
  accountTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accountTypeCard: { width: '47%', borderWidth: 1.5, borderRadius: 12, padding: 12, alignItems: 'center', position: 'relative' },
  accountTypeLabel: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  accountTypeDesc: { fontSize: 11, marginTop: 2 },
});
