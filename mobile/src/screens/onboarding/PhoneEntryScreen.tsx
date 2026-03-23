import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParams } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<OnboardingStackParams, 'PhoneEntry'>;

export function PhoneEntryScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { sendOtp } = useAuthStore();

  const fullPhone = `+91${phone}`;
  const isValid = /^[6-9]\d{9}$/.test(phone);

  const handleSend = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const { devOtp } = await sendOtp(fullPhone);
      navigation.navigate('OTPVerification', { phoneNumber: fullPhone, devOtp });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Enter your mobile number</Text>
        <Text style={styles.subtitle}>We'll send a 6-digit OTP to verify your number</Text>

        <View style={styles.inputRow}>
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>+91</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="9876543210"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
            autoFocus
          />
        </View>

        <TouchableOpacity
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={!isValid || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP</Text>}
        </TouchableOpacity>
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
  subtitle: { fontSize: 15, color: '#6B7280', marginTop: 8, marginBottom: 32 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12, overflow: 'hidden' },
  prefix: { backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 14, borderRightWidth: 1, borderRightColor: '#D1D5DB' },
  prefixText: { fontSize: 17, color: '#374151', fontWeight: '600' },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, color: '#111827' },
  button: { backgroundColor: '#1B4332', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { backgroundColor: '#9CA3AF' },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
