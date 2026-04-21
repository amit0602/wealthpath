import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParams } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<OnboardingStackParams, 'OTPVerification'>;

type ErrorKind = 'incorrect' | 'expired' | 'network' | null;

export function OTPVerificationScreen({ navigation, route }: Props) {
  const { phoneNumber, devOtp } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const inputs = useRef<TextInput[]>([]);
  const { verifyOtp, sendOtp } = useAuthStore();

  useEffect(() => {
    const interval = setInterval(() => setResendTimer((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (devOtp) {
      const digits = devOtp.split('');
      setOtp(digits);
      handleVerify(devOtp);
    }
  }, [devOtp]);

  const handleChange = (val: string, idx: number) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length > 1) {
      const next = [...otp];
      for (let i = 0; i < digits.length && idx + i < 6; i++) next[idx + i] = digits[i];
      setOtp(next);
      const lastFilled = Math.min(idx + digits.length - 1, 5);
      inputs.current[lastFilled]?.focus();
      if (next.every((d) => d !== '')) handleVerify(next.join(''));
      return;
    }
    const next = [...otp];
    next[idx] = digits;
    setOtp(next);
    setErrorKind(null);
    if (digits && idx < 5) inputs.current[idx + 1]?.focus();
    if (next.every((d) => d !== '')) handleVerify(next.join(''));
  };

  const handleVerify = async (code: string) => {
    setLoading(true);
    setErrorKind(null);
    try {
      const { isNewUser } = await verifyOtp(phoneNumber, code);
      if (isNewUser) navigation.navigate('BasicProfile');
      // else: AppNavigator redirects to Main automatically
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 410) {
        setErrorKind('expired');
      } else if (status === 401 || status === 400) {
        setErrorKind('incorrect');
      } else {
        setErrorKind('network');
      }
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (loading) return;
    const { devOtp: newOtp } = await sendOtp(phoneNumber);
    setResendTimer(60);
    setErrorKind(null);
    if (newOtp) {
      setOtp(newOtp.split(''));
      handleVerify(newOtp);
    }
  };

  const errorMessage = (() => {
    if (errorKind === 'incorrect') return 'Code incorrect — please try again';
    if (errorKind === 'expired') return 'Code expired — tap Resend OTP to get a new one';
    if (errorKind === 'network') return 'Connection error — check your network and retry';
    return null;
  })();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Verify your number</Text>
        <Text style={styles.subtitle}>Enter the 6-digit OTP sent to {phoneNumber}</Text>

        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(el) => { if (el) inputs.current[idx] = el; }}
              style={[styles.otpInput, digit ? styles.otpFilled : null, errorKind ? styles.otpError : null]}
              value={digit}
              onChangeText={(v) => handleChange(v.replace(/\D/g, ''), idx)}
              keyboardType="number-pad"
              autoFocus={idx === 0}
            />
          ))}
        </View>

        {/* Verification feedback — visible text, not just a spinner */}
        {loading && (
          <View style={styles.statusRow}>
            <ActivityIndicator color="#1B4332" size="small" />
            <Text style={styles.verifyingText}>Verifying…</Text>
          </View>
        )}
        {!loading && errorMessage && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        <TouchableOpacity
          onPress={handleResend}
          disabled={resendTimer > 0 || loading}
          style={styles.resend}
        >
          <Text style={[styles.resendText, (resendTimer > 0 || loading) && styles.resendDisabled]}>
            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
          </Text>
        </TouchableOpacity>

        {devOtp && <Text style={styles.devHint}>Dev mode: auto-filling OTP {devOtp}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  back: { paddingVertical: 8 },
  backText: { fontSize: 16, color: '#1B4332' },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginTop: 32 },
  subtitle: { fontSize: 15, color: '#6B7280', marginTop: 8, marginBottom: 40 },
  otpRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  otpInput: { width: 48, height: 56, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12, textAlign: 'center', fontSize: 22, fontWeight: '700', color: '#111827' },
  otpFilled: { borderColor: '#1B4332', backgroundColor: '#F0FDF4' },
  otpError: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, justifyContent: 'center' },
  verifyingText: { fontSize: 15, color: '#1B4332', fontWeight: '600' },
  errorText: { marginTop: 16, fontSize: 14, color: '#EF4444', textAlign: 'center', lineHeight: 20 },
  resend: { marginTop: 28, alignItems: 'center' },
  resendText: { fontSize: 15, color: '#1B4332', fontWeight: '600' },
  resendDisabled: { color: '#9CA3AF' },
  devHint: { marginTop: 24, textAlign: 'center', fontSize: 12, color: '#9CA3AF' },
});
