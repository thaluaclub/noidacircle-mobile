import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../navigation/AuthStack';
import useAuthStore from '../../store/authStore';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { validateLogin } from '../../utils/validators';
import { colors } from '../../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { login, loading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    const validationErrors = validateLogin(identifier, password);
    if (validationErrors.length > 0) {
      const errMap: Record<string, string> = {};
      validationErrors.forEach((e) => (errMap[e.field] = e.message));
      setErrors(errMap);
      return;
    }
    setErrors({});
    const success = await login(identifier.trim().toLowerCase(), password);
    if (!success && error) {
      // Error is shown inline via store
    }
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
          <Text style={styles.tagline}>Your Noida. Your Circle.</Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subHeading}>
            Sign in to your account
          </Text>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <Input
            label="Email or Username"
            icon="person-outline"
            placeholder="Email or username"
            value={identifier}
            onChangeText={setIdentifier}
            error={errors.identifier}
            autoCapitalize="none"
            autoComplete="username"
          />

          <Input
            label="Password"
            icon="lock-closed-outline"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            isPassword
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotBtn}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            size="lg"
          />

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Phone Login */}
          <TouchableOpacity
            style={styles.phoneLoginBtn}
            onPress={() => navigation.navigate('PhoneLogin')}
            activeOpacity={0.7}
          >
            <Ionicons name="phone-portrait-outline" size={20} color={colors.primary[500]} />
            <Text style={styles.phoneLoginText}>Sign in with Phone Number</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.footerLink}>Sign Up</Text>
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
    marginBottom: 40,
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
  tagline: {
    fontSize: 14,
    color: colors.light.muted,
    marginTop: 2,
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -8,
  },
  forgotText: {
    color: colors.primary[500],
    fontSize: 14,
    fontWeight: '500',
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    color: colors.light.muted,
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 12,
  },
  phoneLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.primary[500],
    borderRadius: 12,
    paddingVertical: 14,
  },
  phoneLoginText: {
    color: colors.primary[500],
    fontSize: 15,
    fontWeight: '600',
  },
});
