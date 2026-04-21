import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParams } from '../../navigation/AppNavigator';
import { usersApi } from '../../services/api';

type Props = NativeStackScreenProps<OnboardingStackParams, 'BasicProfile'>;

const EMPLOYMENT_TYPES = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'self_employed', label: 'Self-employed' },
  { value: 'business', label: 'Business owner' },
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

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDobDisplay(dd: string, mm: string, yyyy: string): string | null {
  const d = Number(dd), m = Number(mm), y = Number(yyyy);
  if (!d || !m || !y || yyyy.length < 4) return null;
  const age = getAge(toISODate(dd, mm, yyyy));
  if (age === null || age < 0) return null;
  return `${d} ${MONTHS[m - 1] ?? ''} ${y} · ${age} yrs`;
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
  const cityRef = useRef<TextInput>(null);

  const dobIso = dobDay && dobMonth && dobYear ? toISODate(dobDay, dobMonth, dobYear) : '';
  const dobDisplay = formatDobDisplay(dobDay, dobMonth, dobYear);

  const nameError = submitted && (!fullName.trim() || fullName.trim().length < 2)
    ? 'Full name is required' : null;

  const dobError = submitted ? (() => {
    if (!dobDay || !dobMonth || !dobYear) return 'Date of birth is required';
    if (dobYear.length < 4) return 'Enter a 4-digit year';
    const age = getAge(dobIso);
    if (age === null || age < 0) return 'Enter a valid date';
    if (age < 18) return 'You must be at least 18';
    if (age > 100) return 'Enter a valid date';
    return null;
  })() : null;

  const cityError = submitted && !city.trim() ? 'City is required' : null;
  const isValid = fullName.trim().length >= 2 && !!dobDisplay && !getAge(dobIso) || (getAge(dobIso) ?? 0) >= 18 && city.trim().length > 0;

  const handleNext = async () => {
    setSubmitted(true);
    const age = dobIso ? getAge(dobIso) : null;
    if (!fullName.trim() || fullName.trim().length < 2) return;
    if (!dobDay || !dobMonth || !dobYear || dobYear.length < 4 || !age || age < 18) return;
    if (!city.trim()) return;
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
        {/* Step header */}
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.stepPills}>
            {[1,2,3,4,5].map((n) => (
              <View key={n} style={[styles.stepPill, n === 1 && styles.stepPillActive, n < 1 && styles.stepPillDone]} />
            ))}
          </View>
          <Text style={styles.stepLabel}>Step 1 of 5 · About you</Text>
        </View>

        <Text style={styles.title}>Let's start with{'\n'}the basics.</Text>
        <Text style={styles.subtitle}>We use this to tailor your retirement plan. You can change it later.</Text>

        <View style={styles.form}>
          {/* Full name */}
          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : null]}
              placeholder="Rahul Sharma"
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              returnKeyType="next"
            />
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          </View>

          {/* Date of birth — 3-field with formatted display */}
          <View style={styles.field}>
            <Text style={styles.label}>Date of birth</Text>
            <View style={[styles.dobContainer, dobError ? styles.inputError : null]}>
              {dobDisplay ? (
                <Text style={styles.dobDisplayText}>{dobDisplay}</Text>
              ) : (
                <View style={styles.dobRow}>
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
                    style={[styles.dobInput, { minWidth: 52 }]}
                    placeholder="YYYY"
                    placeholderTextColor="#9CA3AF"
                    value={dobYear}
                    keyboardType="number-pad"
                    maxLength={4}
                    onChangeText={(v) => setDobYear(v.replace(/\D/g, ''))}
                  />
                </View>
              )}
              <Text style={styles.calIcon}>📅</Text>
            </View>
            {dobError ? <Text style={styles.errorText}>{dobError}</Text> : null}
          </View>

          {/* Employment type */}
          <View style={styles.field}>
            <Text style={styles.label}>I work as</Text>
            <View style={styles.chips}>
              {EMPLOYMENT_TYPES.map((e) => (
                <TouchableOpacity
                  key={e.value}
                  style={[styles.chip, employmentType === e.value && styles.chipSelected]}
                  onPress={() => setEmploymentType(e.value)}
                >
                  <Text style={[styles.chipText, employmentType === e.value && styles.chipTextSelected]}>
                    {e.label}
                  </Text>
                  {employmentType === e.value && <Text style={styles.checkmark}> ✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* City */}
          <View style={styles.field}>
            <Text style={styles.label}>City</Text>
            <TextInput
              ref={cityRef}
              style={[styles.input, cityError ? styles.inputError : null]}
              placeholder="Mumbai"
              placeholderTextColor="#9CA3AF"
              value={city}
              onChangeText={setCity}
              autoCapitalize="words"
            />
            {cityError ? <Text style={styles.errorText}>{cityError}</Text> : null}
          </View>
        </View>

        {/* Skip + Continue */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.navigate('IncomeExpenses')}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.continueBtn, loading && styles.continueBtnDisabled]}
            onPress={handleNext}
            disabled={loading}
          >
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, gap: 20, paddingBottom: 32 },

  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 24, color: '#374151', lineHeight: 28 },
  stepPills: { flexDirection: 'row', gap: 4 },
  stepPill: { width: 24, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  stepPillActive: { backgroundColor: '#1B4332', width: 32 },
  stepPillDone: { backgroundColor: '#1B4332' },
  stepLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  title: { fontSize: 28, fontWeight: '800', color: '#1A1A1A', lineHeight: 36, marginTop: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginTop: -8 },

  form: { gap: 18 },
  field: { gap: 6 },
  label: { fontSize: 14, color: '#374151', fontWeight: '500' },
  input: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#111827' },
  inputError: { borderColor: '#EF4444' },
  errorText: { fontSize: 12, color: '#EF4444' },

  dobContainer: {
    borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dobDisplayText: { fontSize: 15, color: '#111827', flex: 1 },
  dobRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dobInput: { fontSize: 15, color: '#111827', textAlign: 'center', minWidth: 32 },
  dobSep: { fontSize: 16, color: '#9CA3AF', marginHorizontal: 6 },
  calIcon: { fontSize: 16 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center',
  },
  chipSelected: { borderColor: '#1B4332', backgroundColor: '#F0FDF4' },
  chipText: { fontSize: 14, color: '#6B7280' },
  chipTextSelected: { color: '#1B4332', fontWeight: '600' },
  checkmark: { fontSize: 13, color: '#1B4332', fontWeight: '700' },

  buttonRow: { flexDirection: 'row', gap: 12 },
  skipBtn: { flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
  continueBtn: { flex: 2, backgroundColor: '#111827', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  continueBtnDisabled: { opacity: 0.5 },
  continueText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
