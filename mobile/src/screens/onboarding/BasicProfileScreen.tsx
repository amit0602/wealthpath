import React, { useState, useRef } from 'react';
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

function toISODate(dd: string, mm: string, yyyy: string): string {
  return `${yyyy.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function getAge(isoDate: string): number | null {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

export function BasicProfileScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [employmentType, setEmploymentType] = useState('salaried');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const dobIso = dobDay && dobMonth && dobYear ? toISODate(dobDay, dobMonth, dobYear) : '';

  const nameError = !fullName.trim()
    ? 'Full name is required'
    : fullName.trim().length < 2
    ? 'Enter at least 2 characters'
    : null;

  const dobError = (() => {
    if (!dobDay || !dobMonth || !dobYear) return 'Date of birth is required';
    if (dobYear.length < 4) return 'Enter a 4-digit year';
    const d = Number(dobDay), m = Number(dobMonth), y = Number(dobYear);
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900) return 'Enter a valid date';
    const age = getAge(dobIso);
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
      await usersApi.updateProfile({ fullName, dateOfBirth: dobIso, employmentType, city });
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
            <TextInput
              style={[styles.input, submitted && nameError ? styles.inputError : null]}
              placeholder="Rahul Sharma"
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
            {submitted && nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          </View>

          {/* Date of birth — 3-field picker (no third-party dependency) */}
          <View style={styles.field}>
            <Text style={styles.label}>Date of Birth *</Text>
            <View
              style={[styles.dobRow, submitted && dobError ? styles.inputError : null]}
              accessible
              accessibilityLabel="Date of birth, select date"
            >
              <TextInput
                style={styles.dobInput}
                placeholder="DD"
                placeholderTextColor="#9CA3AF"
                value={dobDay}
                keyboardType="number-pad"
                maxLength={2}
                onChangeText={(v) => {
                  const n = v.replace(/\D/g, '');
                  setDobDay(n);
                  if (n.length === 2) monthRef.current?.focus();
                }}
              />
              <Text style={styles.dobSep}>/</Text>
              <TextInput
                ref={monthRef}
                style={styles.dobInput}
                placeholder="MM"
                placeholderTextColor="#9CA3AF"
                value={dobMonth}
                keyboardType="number-pad"
                maxLength={2}
                onChangeText={(v) => {
                  const n = v.replace(/\D/g, '');
                  setDobMonth(n);
                  if (n.length === 2) yearRef.current?.focus();
                }}
              />
              <Text style={styles.dobSep}>/</Text>
              <TextInput
                ref={yearRef}
                style={[styles.dobInput, styles.dobYearInput]}
                placeholder="YYYY"
                placeholderTextColor="#9CA3AF"
                value={dobYear}
                keyboardType="number-pad"
                maxLength={4}
                onChangeText={(v) => setDobYear(v.replace(/\D/g, ''))}
              />
            </View>
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
            <TextInput
              style={[styles.input, submitted && cityError ? styles.inputError : null]}
              placeholder="Mumbai"
              placeholderTextColor="#9CA3AF"
              value={city}
              onChangeText={setCity}
              autoCapitalize="words"
            />
            {submitted && cityError ? <Text style={styles.errorText}>{cityError}</Text> : null}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, submitted && !isValid && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
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

  // DOB 3-field
  dobRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  dobInput: { fontSize: 16, color: '#111827', textAlign: 'center', minWidth: 32 },
  dobYearInput: { minWidth: 52 },
  dobSep: { fontSize: 18, color: '#9CA3AF', marginHorizontal: 8 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  chipSelected: { borderColor: '#1B4332', backgroundColor: '#F0FDF4' },
  chipText: { fontSize: 14, color: '#6B7280' },
  chipTextSelected: { color: '#1B4332', fontWeight: '600' },
  button: { backgroundColor: '#1B4332', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#9CA3AF' },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
