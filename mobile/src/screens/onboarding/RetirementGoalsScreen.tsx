import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParams } from '../../navigation/AppNavigator';
import { usersApi } from '../../services/api';

type Props = NativeStackScreenProps<OnboardingStackParams, 'RetirementGoals'>;

export function RetirementGoalsScreen({ navigation }: Props) {
  const [retirementAge, setRetirementAge] = useState('60');
  const [desiredIncome, setDesiredIncome] = useState('');
  const [retirementCity, setRetirementCity] = useState('');

  const isValid = retirementAge && desiredIncome && retirementCity;

  const handleNext = async () => {
    if (!isValid) return;
    try {
      await usersApi.updateFinancialProfile({
        targetRetirementAge: Number(retirementAge),
        desiredMonthlyIncome: Number(desiredIncome),
        retirementCity,
      });
      navigation.navigate('RiskAppetite');
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.step}>Step 4 of 5</Text>
          <View style={styles.progressBar}><View style={[styles.progress, { width: '80%' }]} /></View>
          <Text style={styles.title}>Retirement Goals</Text>
          <Text style={styles.subtitle}>Tell us what financial freedom looks like for you</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Target Retirement Age</Text>
          <View style={styles.ageRow}>
            {[45, 50, 55, 60, 65].map((age) => (
              <TouchableOpacity
                key={age}
                style={[styles.ageChip, retirementAge === String(age) && styles.ageChipSelected]}
                onPress={() => setRetirementAge(String(age))}
              >
                <Text style={[styles.ageText, retirementAge === String(age) && styles.ageTextSelected]}>{age}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Or enter custom age (40-70)"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            value={retirementAge}
            onChangeText={setRetirementAge}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Desired Monthly Income After Retirement</Text>
          <Text style={styles.hint}>In today's rupees — we'll adjust for inflation</Text>
          <View style={styles.inputRow}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput style={styles.inputFlex} placeholder="e.g. 100000" placeholderTextColor="#9CA3AF" keyboardType="number-pad" value={desiredIncome} onChangeText={setDesiredIncome} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Where do you plan to retire?</Text>
          <TextInput style={styles.input} placeholder="Mumbai, Pune, Goa..." placeholderTextColor="#9CA3AF" value={retirementCity} onChangeText={setRetirementCity} autoCapitalize="words" />
        </View>

        <TouchableOpacity style={[styles.button, !isValid && styles.buttonDisabled]} onPress={handleNext} disabled={!isValid}>
          <Text style={styles.buttonText}>Continue →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, gap: 24 },
  header: { gap: 8 },
  step: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  progressBar: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 },
  progress: { height: 4, backgroundColor: '#1B4332', borderRadius: 2 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: -4 },
  ageRow: { flexDirection: 'row', gap: 8 },
  ageChip: { flex: 1, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  ageChipSelected: { borderColor: '#1B4332', backgroundColor: '#F0FDF4' },
  ageText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  ageTextSelected: { color: '#1B4332' },
  input: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#111827' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12, overflow: 'hidden' },
  rupee: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: '#6B7280', backgroundColor: '#F9FAFB', borderRightWidth: 1, borderRightColor: '#D1D5DB' },
  inputFlex: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: '#111827' },
  button: { backgroundColor: '#1B4332', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#9CA3AF' },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
