import React, { useEffect, useState } from 'react';
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

type Props = NativeStackScreenProps<MainStackParams, 'EditGoals'>;

const RISK_OPTIONS = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'aggressive', label: 'Aggressive' },
];

export function EditGoalsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retirementAge, setRetirementAge] = useState('60');
  const [desiredIncome, setDesiredIncome] = useState('');
  const [retirementCity, setRetirementCity] = useState('');
  const [riskAppetite, setRiskAppetite] = useState('moderate');

  useEffect(() => {
    usersApi.getMe()
      .then(({ data }) => {
        const fp = data.financialProfile;
        if (fp) {
          if (fp.targetRetirementAge != null) setRetirementAge(String(fp.targetRetirementAge));
          if (fp.desiredMonthlyIncome != null) setDesiredIncome(String(fp.desiredMonthlyIncome));
          setRetirementCity(fp.retirementCity ?? '');
          setRiskAppetite(fp.riskAppetite ?? 'moderate');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await usersApi.updateFinancialProfile({
        targetRetirementAge: Number(retirementAge),
        desiredMonthlyIncome: Number(desiredIncome),
        retirementCity,
        riskAppetite,
      });
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

        <Text style={styles.title}>Edit Goals & Risk</Text>

        {/* Section 1: Retirement Goals */}
        <Text style={styles.sectionHeader}>Retirement Goals</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Target Retirement Age</Text>
          <View style={styles.ageRow}>
            {[45, 50, 55, 60, 65].map((age) => (
              <TouchableOpacity
                key={age}
                style={[styles.ageChip, retirementAge === String(age) && styles.ageChipSelected]}
                onPress={() => setRetirementAge(String(age))}
              >
                <Text style={[styles.ageText, retirementAge === String(age) && styles.ageTextSelected]}>
                  {age}
                </Text>
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
            <TextInput
              style={styles.inputFlex}
              placeholder="e.g. 100000"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={desiredIncome}
              onChangeText={setDesiredIncome}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Where do you plan to retire?</Text>
          <TextInput
            style={styles.input}
            placeholder="Mumbai, Pune, Goa..."
            placeholderTextColor="#9CA3AF"
            value={retirementCity}
            onChangeText={setRetirementCity}
            autoCapitalize="words"
          />
        </View>

        {/* Section 2: Risk Appetite */}
        <Text style={styles.sectionHeader}>Risk Appetite</Text>

        <View style={styles.chips}>
          {RISK_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, riskAppetite === opt.value && styles.chipSelected]}
              onPress={() => setRiskAppetite(opt.value)}
            >
              <Text style={[styles.chipText, riskAppetite === opt.value && styles.chipTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
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
  sectionHeader: { fontSize: 16, fontWeight: '700', color: '#1B4332', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 6 },
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
  chips: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  chipSelected: { borderColor: '#1B4332', backgroundColor: '#F0FDF4' },
  chipText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  chipTextSelected: { color: '#1B4332', fontWeight: '700' },
  button: { backgroundColor: '#1B4332', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
