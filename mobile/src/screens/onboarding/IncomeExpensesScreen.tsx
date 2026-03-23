import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParams } from '../../navigation/AppNavigator';
import { usersApi } from '../../services/api';

type Props = NativeStackScreenProps<OnboardingStackParams, 'IncomeExpenses'>;

export function IncomeExpensesScreen({ navigation }: Props) {
  const [grossIncome, setGrossIncome] = useState('');
  const [takeHome, setTakeHome] = useState('');
  const [expenses, setExpenses] = useState('');
  const [emi, setEmi] = useState('0');
  const [dependents, setDependents] = useState('0');

  const isValid = grossIncome && takeHome && expenses;

  const handleNext = async () => {
    try {
      await usersApi.updateFinancialProfile({
        monthlyGrossIncome: Number(grossIncome),
        monthlyTakeHome: Number(takeHome),
        monthlyExpenses: Number(expenses),
        monthlyEmi: Number(emi) || 0,
        dependentsCount: Number(dependents) || 0,
      });
      navigation.navigate('SavingsSnapshot');
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.step}>Step 2 of 5</Text>
          <View style={styles.progressBar}><View style={[styles.progress, { width: '40%' }]} /></View>
          <Text style={styles.title}>Income & Expenses</Text>
          <Text style={styles.subtitle}>All amounts in ₹ per month</Text>
        </View>

        {[
          { label: 'Monthly Gross Income', value: grossIncome, setter: setGrossIncome, hint: 'Before tax deductions' },
          { label: 'Monthly Take-Home', value: takeHome, setter: setTakeHome, hint: 'After tax and PF' },
          { label: 'Monthly Expenses', value: expenses, setter: setExpenses, hint: 'Rent, food, utilities, etc.' },
          { label: 'Monthly EMI Obligations', value: emi, setter: setEmi, hint: 'Home loan, car loan, etc.' },
          { label: 'Number of Dependents', value: dependents, setter: setDependents, hint: 'Spouse, kids, parents' },
        ].map(({ label, value, setter, hint }) => (
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

        <TouchableOpacity style={[styles.button, !isValid && styles.buttonDisabled]} onPress={handleNext} disabled={!isValid}>
          <Text style={styles.buttonText}>Continue →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, gap: 20 },
  header: { gap: 8, marginBottom: 4 },
  step: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  progressBar: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 },
  progress: { height: 4, backgroundColor: '#1B4332', borderRadius: 2 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  field: { gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  hint: { fontSize: 12, color: '#9CA3AF' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12, overflow: 'hidden' },
  rupee: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: '#6B7280', backgroundColor: '#F9FAFB', borderRightWidth: 1, borderRightColor: '#D1D5DB' },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: '#111827' },
  button: { backgroundColor: '#1B4332', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { backgroundColor: '#9CA3AF' },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
