import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import { authAPI } from '../../services/api';
import { colors } from '../../theme/colors';

type Step = 'phone' | 'otp';

export default function PhoneLoginScreen() {
  const dark = useThemeStore((s) => s.dark);
  const navigation = useNavigation();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const inputBg = dark ? colors.dark.card : '#f1f3f5';

  const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/^0+/, '')}`;

  const startResendTimer = useCallback(() => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSendOTP = useCallback(async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.sendOTP(formattedPhone);
      setStep('otp');
      startResendTimer();
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [phone, formattedPhone, startResendTimer]);

  const handleOTPChange = useCallback((text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-verify when all 6 digits entered
    if (text && index === 5) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        verifyOTP(fullOtp);
      }
    }
  }, [otp]);

  const handleOTPKeyPress = useCallback((e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  }, [otp]);

  const verifyOTP = useCallback(async (code: string) => {
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP(formattedPhone, code);
      const data = res.data;
      if (data.token && data.user) {
        await setAuth(data.token, data.user);
      } else {
        Alert.alert('Error', 'Unexpected response. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.response?.data?.message || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [formattedPhone, setAuth]);

  const handleResend = useCallback(async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await authAPI.sendOTP(formattedPhone);
      startResendTimer();
      Alert.alert('OTP Sent', 'A new verification code has been sent to your phone.');
    } catch {
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [formattedPhone, resendTimer, startResendTimer]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => step === 'otp' ? setStep('phone') : navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {step === 'phone' ? (
            <>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary[500] + '15' }]}>
                <Ionicons name="phone-portrait" size={36} color={colors.primary[500]} />
              </View>
              <Text style={[styles.title, { color: textColor }]}>Enter your phone number</Text>
              <Text style={[styles.subtitle, { color: mutedColor }]}>
                We will send you a 6-digit verification code via SMS
              </Text>

              <View style={[styles.phoneInputRow, { borderColor }]}>
                <View style={[styles.countryCode, { backgroundColor: inputBg, borderColor }]}>
                  <Text style={[styles.countryCodeText, { color: textColor }]}>+91</Text>
                </View>
                <TextInput
                  style={[styles.phoneInput, { color: textColor, backgroundColor: inputBg, borderColor }]}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={mutedColor}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleSendOTP}
                disabled={loading || phone.replace(/\D/g, '').length < 10}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary[500] + '15' }]}>
                <Ionicons name="shield-checkmark" size={36} color={colors.primary[500]} />
              </View>
              <Text style={[styles.title, { color: textColor }]}>Verify your number</Text>
              <Text style={[styles.subtitle, { color: mutedColor }]}>
                Enter the 6-digit code sent to {formattedPhone}
              </Text>

              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={ref => { inputRefs.current[i] = ref; }}
                    style={[
                      styles.otpBox,
                      { color: textColor, backgroundColor: inputBg, borderColor: digit ? colors.primary[500] : borderColor },
                    ]}
                    value={digit}
                    onChangeText={text => handleOTPChange(text, i)}
                    onKeyPress={e => handleOTPKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={() => verifyOTP(otp.join(''))}
                disabled={loading || otp.join('').length < 6}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verify & Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0} style={styles.resendBtn}>
                <Text style={[styles.resendText, { color: resendTimer > 0 ? mutedColor : colors.primary[500] }]}>
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.altLogin}>
            <Ionicons name="mail-outline" size={18} color={colors.primary[500]} />
            <Text style={[styles.altLoginText, { color: colors.primary[500] }]}>Sign in with email instead</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 40 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 32 },
  phoneInputRow: { flexDirection: 'row', width: '100%', gap: 8, marginBottom: 24 },
  countryCode: { paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  countryCodeText: { fontSize: 16, fontWeight: '600' },
  phoneInput: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontWeight: '500', letterSpacing: 1 },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  otpBox: { width: 46, height: 54, borderRadius: 12, borderWidth: 1.5, textAlign: 'center', fontSize: 22, fontWeight: '700' },
  primaryBtn: { width: '100%', backgroundColor: colors.primary[500], borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendBtn: { marginTop: 20 },
  resendText: { fontSize: 14, fontWeight: '600' },
  altLogin: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 40, paddingVertical: 12 },
  altLoginText: { fontSize: 14, fontWeight: '600' },
});
