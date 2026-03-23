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

export function BasicProfileScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [employmentType, setEmploymentType] = useState('salaried');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = fullName.trim() && dob && city.trim();

  const handleNext = async () => {
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
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} placeholder="Rahul Sharma" placeholderTextColor="#9CA3AF" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" value={dob} onChangeText={setDob} keyboardType="number-pad" />
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
            <Text style={styles.label}>City</Text>
            <TextInput style={styles.input} placeholder="Mumbai" placeholderTextColor="#9CA3AF" value={city} onChangeText={setCity} autoCapitalize="words" />
          </View>
        </View>

        <TouchableOpacity style={[styles.button, !isValid && styles.buttonDisabled]} onPress={handleNext} disabled={!isValid || loading}>
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  chipSelected: { borderColor: '#1B4332', backgroundColor: '#F0FDF4' },
  chipText: { fontSize: 14, color: '#6B7280' },
  chipTextSelected: { color: '#1B4332', fontWeight: '600' },
  button: { backgroundColor: '#1B4332', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#9CA3AF' },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
