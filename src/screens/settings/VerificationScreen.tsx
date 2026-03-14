import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { verificationAPI } from '../../services/api';
import { colors } from '../../theme/colors';

interface VerificationRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  admin_notes?: string;
  created_at: string;
  reviewed_at?: string;
}

export default function VerificationScreen() {
  const dark = useThemeStore((s) => s.dark);
  const { user } = useAuthStore();
  const navigation = useNavigation();

  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [socialLinks, setSocialLinks] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [showForm, setShowForm] = useState(false);

  const bg = dark ? colors.dark.bg : '#ffffff';
  const textColor = dark ? colors.dark.text : colors.light.text;
  const mutedColor = dark ? colors.dark.muted : colors.light.muted;
  const borderColor = dark ? colors.dark.border : colors.light.border;
  const cardBg = dark ? colors.dark.card : '#f8f9fa';

  const fetchStatus = useCallback(async () => {
    try {
      const res = await verificationAPI.myStatus();
      setRequests(res.data.requests || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const hasPending = requests.some((r) => r.status === 'pending');

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      Alert.alert('Error', 'Please provide a reason with at least 10 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await verificationAPI.apply({
        reason: reason.trim(),
        social_links: socialLinks.trim() || undefined,
        website_url: websiteUrl.trim() || undefined,
      });
      Alert.alert('Success', 'Your verification request has been submitted. We will review it shortly.');
      setReason('');
      setSocialLinks('');
      setWebsiteUrl('');
      setShowForm(false);
      fetchStatus();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to submit request';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return mutedColor;
    }
  };

  const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'approved': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      default: return 'help-circle-outline';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Info Banner */}
          <View style={[styles.infoBanner, { backgroundColor: dark ? '#1e3a5f' : '#eff6ff' }]}>
            <Ionicons name="shield-checkmark" size={28} color={colors.primary[500]} />
            <View style={styles.infoText}>
              <Text style={[styles.infoTitle, { color: textColor }]}>Get Verified</Text>
              <Text style={[styles.infoDesc, { color: mutedColor }]}>
                A verified badge confirms your identity as a notable public figure, brand, or organization on NoidaCircle.
              </Text>
            </View>
          </View>

          {/* Already verified */}
          {user?.is_verified && (
            <View style={[styles.statusCard, { backgroundColor: '#10b98120', borderColor: '#10b981' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={[styles.statusText, { color: '#10b981' }]}>Your account is verified!</Text>
            </View>
          )}

          {/* Previous Requests */}
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary[500]} style={{ marginTop: 30 }} />
          ) : (
            <>
              {requests.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: mutedColor }]}>YOUR REQUESTS</Text>
                  {requests.map((req) => (
                    <View key={req.id} style={[styles.requestCard, { backgroundColor: cardBg, borderColor }]}>
                      <View style={styles.requestHeader}>
                        <Ionicons name={getStatusIcon(req.status)} size={20} color={getStatusColor(req.status)} />
                        <Text style={[styles.requestStatus, { color: getStatusColor(req.status) }]}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </Text>
                        <Text style={[styles.requestDate, { color: mutedColor }]}>
                          {new Date(req.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={[styles.requestReason, { color: textColor }]}>{req.reason}</Text>
                      {req.admin_notes && (
                        <View style={[styles.adminNote, { backgroundColor: dark ? '#2a2a2a' : '#f1f3f5' }]}>
                          <Text style={[styles.adminNoteLabel, { color: mutedColor }]}>Admin Note:</Text>
                          <Text style={[styles.adminNoteText, { color: textColor }]}>{req.admin_notes}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Apply Button / Form */}
              {!user?.is_verified && !hasPending && (
                <>
                  {!showForm ? (
                    <TouchableOpacity
                      style={[styles.applyBtn, { backgroundColor: colors.primary[500] }]}
                      onPress={() => setShowForm(true)}
                    >
                      <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
                      <Text style={styles.applyBtnText}>Apply for Verification</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: mutedColor }]}>APPLICATION FORM</Text>
                      <View style={[styles.formCard, { backgroundColor: cardBg, borderColor }]}>
                        <Text style={[styles.inputLabel, { color: textColor }]}>Why should you be verified? *</Text>
                        <TextInput
                          style={[styles.textArea, { color: textColor, borderColor, backgroundColor: bg }]}
                          placeholder="Explain why you deserve verification (min 10 characters)"
                          placeholderTextColor={mutedColor}
                          value={reason}
                          onChangeText={setReason}
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                        />

                        <Text style={[styles.inputLabel, { color: textColor, marginTop: 16 }]}>Social Media Links</Text>
                        <TextInput
                          style={[styles.input, { color: textColor, borderColor, backgroundColor: bg }]}
                          placeholder="Instagram, Twitter, LinkedIn URLs"
                          placeholderTextColor={mutedColor}
                          value={socialLinks}
                          onChangeText={setSocialLinks}
                        />

                        <Text style={[styles.inputLabel, { color: textColor, marginTop: 16 }]}>Website URL</Text>
                        <TextInput
                          style={[styles.input, { color: textColor, borderColor, backgroundColor: bg }]}
                          placeholder="https://yourwebsite.com"
                          placeholderTextColor={mutedColor}
                          value={websiteUrl}
                          onChangeText={setWebsiteUrl}
                          autoCapitalize="none"
                          keyboardType="url"
                        />

                        <View style={styles.formActions}>
                          <TouchableOpacity
                            style={[styles.cancelBtn, { borderColor }]}
                            onPress={() => setShowForm(false)}
                          >
                            <Text style={[styles.cancelBtnText, { color: textColor }]}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: colors.primary[500], opacity: submitting ? 0.6 : 1 }]}
                            onPress={handleSubmit}
                            disabled={submitting}
                          >
                            {submitting ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={styles.submitBtnText}>Submit</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </>
              )}

              {hasPending && (
                <View style={[styles.statusCard, { backgroundColor: '#f59e0b20', borderColor: '#f59e0b' }]}>
                  <Ionicons name="time-outline" size={24} color="#f59e0b" />
                  <Text style={[styles.statusText, { color: '#f59e0b' }]}>
                    Your request is under review. We'll notify you once it's processed.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 40 },
  infoBanner: {
    flexDirection: 'row', padding: 16, borderRadius: 12, gap: 12, alignItems: 'flex-start',
  },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  infoDesc: { fontSize: 13, lineHeight: 19 },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12,
    borderWidth: 1, marginTop: 16, gap: 12,
  },
  statusText: { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 20 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 },
  requestCard: { padding: 14, borderRadius: 12, borderWidth: 0.5, marginBottom: 10 },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  requestStatus: { fontSize: 14, fontWeight: '600', flex: 1 },
  requestDate: { fontSize: 12 },
  requestReason: { fontSize: 13, lineHeight: 19 },
  adminNote: { marginTop: 10, padding: 10, borderRadius: 8 },
  adminNoteLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  adminNoteText: { fontSize: 13, lineHeight: 18 },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, marginTop: 24, gap: 8,
  },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  formCard: { padding: 16, borderRadius: 12, borderWidth: 0.5 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  textArea: {
    borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 100, lineHeight: 20,
  },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '500' },
  submitBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});