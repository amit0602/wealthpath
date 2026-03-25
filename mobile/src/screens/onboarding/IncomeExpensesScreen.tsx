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
  const [submitted, setSubmitted] = useState(false);

  const grossError = !grossIncome || Number(grossIncome) <= 0
    ? 'Monthly gross income is required and must be greater than 0'
    : null;
  const takeHomeError = !takeHome || Number(takeHome) <= 0
    ? 'Monthly take-home is required and must be greater than 0'
    : grossIncome && Number(takeHome) > Number(grossIncome)
    ? 'Take-home cannot exceed gross income'
    : null;
  const expensesError = !expenses || Number(expenses) <= 0
    ? 'Monthly expenses are required and must be greater than 0'
    : null;

  const isValid = !grossError && !takeHomeError && !expensesError;

  const handleNext = async () => {
    setSubmitted(true);
    if (!isValid) return;
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

        <View style={styles.field}>
          <Text style={styles.label}>Monthly Gross Income *</Text>
          <Text style={styles.hint}>Before tax deductions</Text>
          <View style={[styles.inputRow, submitted && grossError ? styles.inputRowError : null]}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput style={styles.input} placeholder="0" placeholderTextColor="#9CA3AF" keyboardType="number-pad" value={grossIncome} onChangeText={setGrossIncome} />
          </View>
          {submitted && grossError ? <Text style={styles.errorText}>{grossError}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Monthly Take-Home *</Text>
          <Text style={styles.hint}>After tax and PF</Text>
          <View style={[styles.inputRow, submitted && takeHomeError ? styles.inputRowError : null]}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput style={styles.input} placeholder="0" placeholderTextColor="#9CA3AF" keyboardType="number-pad" value={takeHome} onChangeText={setTakeHome} />
          </View>
          {submitted && takeHomeError ? <Text style={styles.errorText}>{takeHomeError}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Monthly Expenses *</Text>
          <Text style={styles.hint}>Rent, food, utilities, etc.</Text>
          <View style={[styles.inputRow, submitted && expensesError ? styles.inputRowError : null]}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput style={styles.input} placeholder="0" placeholderTextColor="#9CA3AF" keyboardType="number-pad" value={expenses} onChangeText={setExpenses} />
          </View>
          {submitted && expensesError ? <Text style={styles.errorText}>{expensesError}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Monthly EMI Obligations</Text>
          <Text style={styles.hint}>Home loan, car loan, etc.</Text>
          <View style={styles.inputRow}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput style={styles.input} placeholder="0" placeholderTextColor="#9CA3AF" keyboardType="number-pad" value={emi} onChangeText={setEmi} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Number of Dependents</Text>
          <Text style={styles.hint}>Spouse, kids, parents</Text>
          <View style={styles.inputRow}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput style={styles.input} placeholder="0" placeholderTextColor="#9CA3AF" keyboardType="number-pad" value={dependents} onChangeText={setDependents} />
          </View>
        </View>

        <TouchableOpacity style={[styles.button, submitted && !isValid && styles.buttonDisabled]} onPress={handleNext} disabled={false}>
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
  inputRowError: { borderColor: '#EF4444' },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 2 },
  rupee: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: '#6B7280', backgroundColor: '#F9FAFB', borderRightWidth: 1, borderRightColor: '#D1D5DB' },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: '#111827' },
  button: { backgroundColor: '#1B4332', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { backgroundColor: '#9CA3AF' },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
