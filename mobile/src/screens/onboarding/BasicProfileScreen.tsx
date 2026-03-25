import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParams } from '../../navigation/AppNavigator';
import { usersApi } from '../../services/api';

type Props = NativeStackScreenProps<OnboardingStackParams, 'BasicProfile'>;

const EMPLOYMENT_TYPES = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'business', label: 'Business Owner' },
  { value: 'other', label: 'Other' },
];

function getAge(dobStr: string): number | null {
  const d = new Date(dobStr);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

export function BasicProfileScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [employmentType, setEmploymentType] = useState('salaried');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const nameError = !fullName.trim()
    ? 'Full name is required'
    : fullName.trim().length < 2
    ? 'Enter at least 2 characters'
    : null;

  const dobError = !dob
    ? 'Date of birth is required'
    : !/^\d{4}-\d{2}-\d{2}$/.test(dob)
    ? 'Use format YYYY-MM-DD (e.g. 1990-06-15)'
    : (() => {
        const age = getAge(dob);
        if (age === null) return 'Enter a valid date';
        if (age < 18) return 'You must be at least 18 years old';
        if (age > 100) return 'Enter a valid date of birth';
        return null;
      })();

  const cityError = !city.trim() ? 'City is required' : null;

  const isValid = !nameError && !dobError && !cityError;

  const handleNext = async () => {
    setSubmitted(true);
    if (!isValid) return;
    setLoading(true);
    try {
      await usersApi.updateProfile({ fullName, dateOfBirth: dob, employmentType, city });
      navigation.navigate('IncomeExpenses');
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.step}>Step 1 of 5</Text>
          <View style={styles.progressBar}><View style={[styles.progress, { width: '20%' }]} /></View>
          <Text style={styles.title}>Tell us about yourself</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput style={[styles.input, submitted && nameError ? styles.inputError : null]} placeholder="Rahul Sharma" placeholderTextColor="#9CA3AF" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
            {submitted && nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date of Birth *</Text>
            <TextInput style={[styles.input, submitted && dobError ? styles.inputError : null]} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" value={dob} onChangeText={setDob} keyboardType="number-pad" />
            {submitted && dobError ? <Text style={styles.errorText}>{dobError}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Employment Type</Text>
            <View style={styles.chips}>
              {EMPLOYMENT_TYPES.map((e) => (
                <TouchableOpacity
                  key={e.value}
                  style={[styles.chip, employmentType === e.value && styles.chipSelected]}
                  onPress={() => setEmploymentType(e.value)}
                >
                  <Text style={[styles.chipText, employmentType === e.value && styles.chipTextSelected]}>{e.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>City *</Text>
            <TextInput style={[styles.input, submitted && cityError ? styles.inputError : null]} placeholder="Mumbai" placeholderTextColor="#9CA3AF" value={city} onChangeText={setCity} autoCapitalize="words" />
            {submitted && cityError ? <Text style={styles.errorText}>{cityError}</Text> : null}
          </View>
        </View>

        <TouchableOpacity style={[styles.button, submitted && !isValid && styles.buttonDisabled]} onPress={handleNext} disabled={loading}>
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
  form: { gap: 20 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  input: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#111827' },
  inputError: { borderColor: '#EF4444' },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  chipSelected: { borderColor: '#1B4332', backgroundColor: '#F0FDF4' },
  chipText: { fontSize: 14, color: '#6B7280' },
  chipTextSelected: { color: '#1B4332', fontWeight: '600' },
  button: { backgroundColor: '#1B4332', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#9CA3AF' },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
