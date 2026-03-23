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

type Props = NativeStackScreenProps<MainStackParams, 'EditFinancials'>;

export function EditFinancialsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [grossIncome, setGrossIncome] = useState('');
  const [takeHome, setTakeHome] = useState('');
  const [expenses, setExpenses] = useState('');
  const [emi, setEmi] = useState('0');
  const [dependents, setDependents] = useState('0');

  useEffect(() => {
    usersApi.getMe()
      .then(({ data }) => {
        const fp = data.financialProfile;
        if (fp) {
          setGrossIncome(fp.monthlyGrossIncome != null ? String(fp.monthlyGrossIncome) : '');
          setTakeHome(fp.monthlyTakeHome != null ? String(fp.monthlyTakeHome) : '');
          setExpenses(fp.monthlyExpenses != null ? String(fp.monthlyExpenses) : '');
          setEmi(fp.monthlyEmi != null ? String(fp.monthlyEmi) : '0');
          setDependents(fp.dependentsCount != null ? String(fp.dependentsCount) : '0');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await usersApi.updateFinancialProfile({
        monthlyGrossIncome: Number(grossIncome),
        monthlyTakeHome: Number(takeHome),
        monthlyExpenses: Number(expenses),
        monthlyEmi: Number(emi) || 0,
        dependentsCount: Number(dependents) || 0,
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

  const fields = [
    { label: 'Monthly Gross Income', hint: 'Before tax deductions', value: grossIncome, setter: setGrossIncome },
    { label: 'Monthly Take-Home', hint: 'After tax and PF', value: takeHome, setter: setTakeHome },
    { label: 'Monthly Expenses', hint: 'Rent, food, utilities, etc.', value: expenses, setter: setExpenses },
    { label: 'Monthly EMI Obligations', hint: 'Home loan, car loan, etc.', value: emi, setter: setEmi },
    { label: 'Number of Dependents', hint: 'Spouse, kids, parents', value: dependents, setter: setDependents },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Edit Income & Expenses</Text>
          <Text style={styles.subtitle}>All amounts in ₹ per month</Text>
        </View>

        {fields.map(({ label, hint, value, setter }) => (
          <View key={label} style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.hint}>{hint}</Text>
            <View style={styles.inputRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={value}
                onChangeText={setter}
              />
            </View>
          </View>
        ))}

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
  content: { padding: 24, gap: 20, paddingBottom: 40 },
  backButton: { alignSelf: 'flex-start' },
  backText: { fontSize: 16, color: '#1B4332', fontWeight: '600' },
  header: { gap: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280' },
  field: { gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  hint: { fontSize: 12, color: '#9CA3AF' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12, overflow: 'hidden' },
  rupee: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: '#6B7280', backgroundColor: '#F9FAFB', borderRightWidth: 1, borderRightColor: '#D1D5DB' },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: '#111827' },
  button: { backgroundColor: '#1B4332', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
