import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParams } from '../../navigation/AppNavigator';
import { investmentsApi } from '../../services/api';

type Props = NativeStackScreenProps<OnboardingStackParams, 'SavingsSnapshot'>;

const INSTRUMENTS = [
  { type: 'epf', label: 'EPF Balance', hint: 'Check on UMANG app or salary slip' },
  { type: 'ppf', label: 'PPF Balance', hint: 'Annual limit: ₹1.5L' },
  { type: 'mutual_fund_equity', label: 'Mutual Funds (Equity)', hint: 'Current market value' },
  { type: 'direct_equity', label: 'Stocks / Direct Equity', hint: 'Current portfolio value' },
  { type: 'fd', label: 'Fixed Deposits', hint: 'Total FD principal + interest' },
  { type: 'real_estate', label: 'Real Estate', hint: 'Estimated current market value' },
  { type: 'gold', label: 'Gold / SGB', hint: 'Physical gold + SGB value' },
];

export function SavingsSnapshotScreen({ navigation }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    setLoading(true);
    try {
      // Create investments for non-zero entries
      const entries = Object.entries(values).filter(([, v]) => v && Number(v) > 0);
      await Promise.all(
        entries.map(([type, value]) =>
          investmentsApi.create({
            instrumentType: type,
            name: INSTRUMENTS.find(i => i.type === type)?.label ?? type,
            currentValue: Number(value),
          }),
        ),
      );
      navigation.navigate('RetirementGoals');
    } catch {
      Alert.alert('Error', 'Failed to save investments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.step}>Step 3 of 5</Text>
          <View style={styles.progressBar}><View style={[styles.progress, { width: '60%' }]} /></View>
          <Text style={styles.title}>Current Savings</Text>
          <Text style={styles.subtitle}>Enter approximate values. You can update these later.</Text>
        </View>

        {INSTRUMENTS.map(({ type, label, hint }) => (
          <View key={type} style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.hint}>{hint}</Text>
            <View style={styles.inputRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={values[type] ?? ''}
                onChangeText={(v) => setValues((prev) => ({ ...prev, [type]: v }))}
              />
            </View>
          </View>
        ))}

        <Text style={styles.skip}>Skip any you don't have — you can add them later</Text>

        <TouchableOpacity style={styles.button} onPress={handleNext} disabled={loading}>
          <Text style={styles.buttonText}>Continue →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, gap: 16 },
  header: { gap: 8, marginBottom: 4 },
  step: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  progressBar: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 },
  progress: { height: 4, backgroundColor: '#1B4332', borderRadius: 2 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  field: { gap: 3 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  hint: { fontSize: 12, color: '#9CA3AF' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  rupee: { paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: '#6B7280', backgroundColor: '#F9FAFB', borderRightWidth: 1, borderRightColor: '#D1D5DB' },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: '#111827' },
  skip: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  button: { backgroundColor: '#1B4332', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
