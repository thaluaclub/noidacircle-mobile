import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../navigation/AuthStack';
import useAuthStore from '../../store/authStore';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { validateSignup } from '../../utils/validators';
import { colors } from '../../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
};

export default function SignupScreen({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { signup, loading, error, clearError } = useAuthStore();

  const handleSignup = async () => {
    clearError();
    const validationErrors = validateSignup(username, email, password);
    if (validationErrors.length > 0) {
      const errMap: Record<string, string> = {};
      validationErrors.forEach((e) => (errMap[e.field] = e.message));
      setErrors(errMap);
      return;
    }
    setErrors({});
    await signup({
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.iconWrapper}>
            <Ionicons name="location" size={32} color="#fff" />
          </View>
          <Text style={styles.appName}>NoidaCircle</Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={styles.heading}>Create account</Text>
          <Text style={styles.subHeading}>
            Join Noida's local community
          </Text>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <Input
            label="Username"
            icon="at-outline"
            placeholder="yourname"
            value={username}
            onChangeText={setUsername}
            error={errors.username}
            autoComplete="username"
          />

          <Input
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            autoComplete="email"
          />

          <Input
            label="Password"
            icon="lock-closed-outline"
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            isPassword
          />

          <Button
            title="Create Account"
            onPress={handleSignup}
            loading={loading}
            size="lg"
            style={{ marginTop: 8 }}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.light.text,
    letterSpacing: -0.5,
  },
  formSection: {
    flex: 1,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.light.text,
    marginBottom: 4,
  },
  subHeading: {
    fontSize: 15,
    color: colors.light.muted,
    marginBottom: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    color: colors.error,
    fontSize: 14,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: colors.light.muted,
    fontSize: 15,
  },
  footerLink: {
    color: colors.primary[500],
    fontSize: 15,
    fontWeight: '600',
  },
});
