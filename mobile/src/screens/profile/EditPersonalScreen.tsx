import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParams } from '../../navigation/AppNavigator';
import { usersApi } from '../../services/api';

type Props = NativeStackScreenProps<MainStackParams, 'EditPersonal'>;

const EMPLOYMENT_TYPES = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'business', label: 'Business Owner' },
  { value: 'other', label: 'Other' },
];

export function EditPersonalScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [employmentType, setEmploymentType] = useState('salaried');
  const [city, setCity] = useState('');

  useEffect(() => {
    usersApi.getMe()
      .then(({ data }) => {
        setFullName(data.fullName ?? '');
        if (data.dateOfBirth) {
          const d = new Date(data.dateOfBirth);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          setDob(`${yyyy}-${mm}-${dd}`);
        }
        setEmploymentType(data.employmentType ?? 'salaried');
        setCity(data.city ?? '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await usersApi.updateProfile({ fullName, dateOfBirth: dob, employmentType, city });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B4332" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Edit Personal Info</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Rahul Sharma"
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              value={dob}
              onChangeText={setDob}
              keyboardType="number-pad"
            />
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
                  <Text style={[styles.chipText, employmentType === e.value && styles.chipTextSelected]}>
                    {e.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="Mumbai"
              placeholderTextColor="#9CA3AF"
              value={city}
              onChangeText={setCity}
              autoCapitalize="words"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, gap: 24, paddingBottom: 40 },
  backButton: { alignSelf: 'flex-start' },
  backText: { fontSize: 16, color: '#1B4332', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
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
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
