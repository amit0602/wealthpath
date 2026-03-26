import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { loansApi } from '../../services/api';
import { MainStackParams } from '../../navigation/AppNavigator';

type RouteParams = RouteProp<MainStackParams, 'EditLoan'>;

const LOAN_TYPES = [
  { value: 'home', label: '🏠 Home Loan' },
  { value: 'car', label: '🚗 Car Loan' },
  { value: 'personal', label: '💳 Personal Loan' },
  { value: 'education', label: '🎓 Education Loan' },
  { value: 'other', label: '📋 Other' },
];

function Field({
  label, hint, value, onChange, placeholder, keyboardType = 'numeric',
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; keyboardType?: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldHeader}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <TextInput
        style={[styles.input, value.length > 0 && styles.inputFilled]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholder={placeholder ?? ''}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

export function EditLoanScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { loanId } = route.params ?? {};
  const isEdit = !!loanId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [loanType, setLoanType] = useState('home');
  const [balance, setBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenureMonths, setTenureMonths] = useState('');
  const [emi, setEmi] = useState('');

  useEffect(() => {
    if (!loanId) return;
    loansApi.list()
      .then(({ data }) => {
        const loan = data.loans.find((l: any) => l.id === loanId);
        if (!loan) return;
        setName(loan.name);
        setLoanType(loan.loanType);
        setBalance(String(loan.outstandingBalance));
        setInterestRate(String(loan.interestRate));
        setTenureMonths(String(loan.remainingTenureMonths));
        setEmi(String(loan.emiAmount));
      })
      .catch(() => Alert.alert('Error', 'Could not load loan details.'))
      .finally(() => setLoading(false));
  }, [loanId]);

  // Auto-calculate EMI when balance, rate, tenure are filled
  const autoCalcEmi = () => {
    const P = Number(balance);
    const r = Number(interestRate) / 100 / 12;
    const n = Number(tenureMonths);
    if (!P || !r || !n) return;
    const emiCalc = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    setEmi(String(Math.round(emiCalc)));
  };

  const save = async () => {
    if (!name.trim()) { Alert.alert('Validation', 'Please enter a loan name.'); return; }
    const bal = Number(balance);
    const rate = Number(interestRate);
    const tenure = Number(tenureMonths);
    const emiVal = Number(emi);
    if (!bal || bal < 1000) { Alert.alert('Validation', 'Outstanding balance must be at least ₹1,000.'); return; }
    if (!rate || rate < 1 || rate > 50) { Alert.alert('Validation', 'Interest rate must be between 1% and 50%.'); return; }
    if (!tenure || tenure < 1 || tenure > 360) { Alert.alert('Validation', 'Tenure must be 1–360 months.'); return; }
    if (!emiVal || emiVal < 1) { Alert.alert('Validation', 'Please enter the monthly EMI amount.'); return; }

    const payload = {
      name: name.trim(),
      loanType,
      outstandingBalance: bal,
      interestRate: rate,
      remainingTenureMonths: tenure,
      emiAmount: emiVal,
    };

    setSaving(true);
    try {
      if (isEdit && loanId) {
        await loansApi.update(loanId, payload);
      } else {
        await loansApi.create(payload);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save loan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1B4332" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEdit ? 'Edit Loan' : 'Add Loan'}</Text>

        {/* Loan type chips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loan Type</Text>
          <View style={styles.chipsWrap}>
            {LOAN_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.chip, loanType === t.value && styles.chipActive]}
                onPress={() => setLoanType(t.value)}
              >
                <Text style={[styles.chipText, loanType === t.value && styles.chipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loan Details</Text>
          <Field
            label="Loan Name"
            value={name}
            onChange={setName}
            placeholder="e.g. Home Loan – HDFC"
            keyboardType="default"
          />
          <Field
            label="Outstanding Balance (₹)"
            hint="Remaining principal"
            value={balance}
            onChange={setBalance}
            placeholder="e.g. 3500000"
          />
          <Field
            label="Interest Rate (% p.a.)"
            hint="e.g. 8.5 for 8.5%"
            value={interestRate}
            onChange={setInterestRate}
            placeholder="e.g. 8.5"
          />
          <Field
            label="Remaining Tenure (months)"
            hint="1–360"
            value={tenureMonths}
            onChange={setTenureMonths}
            placeholder="e.g. 240"
          />
          <View style={styles.emiRow}>
            <View style={{ flex: 1 }}>
              <Field
                label="Monthly EMI (₹)"
                value={emi}
                onChange={setEmi}
                placeholder="e.g. 32000"
              />
            </View>
            <TouchableOpacity style={styles.calcButton} onPress={autoCalcEmi}>
              <Text style={styles.calcButtonText}>Auto-calc</Text>
            </TouchableOpacity>
          </View>
          {balance && interestRate && tenureMonths && !emi && (
            <Text style={styles.calcHint}>
              Tap "Auto-calc" to compute EMI from your balance, rate & tenure.
            </Text>
          )}
        </View>

        <Text style={styles.disclaimer}>
          For educational purposes only. Not financial advice.
        </Text>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveButtonText}>{isEdit ? 'Save Changes' : 'Add Loan'}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, gap: 14, paddingBottom: 48 },
  back: { fontSize: 17, color: '#1B4332', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { borderColor: '#1B4332', backgroundColor: '#F0FDF4' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#1B4332', fontWeight: '700' },
  fieldWrap: { gap: 6 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  hint: { fontSize: 11, color: '#9CA3AF' },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827',
  },
  inputFilled: { borderColor: '#1B4332' },
  emiRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  calcButton: {
    borderWidth: 1.5, borderColor: '#1B4332', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 0,
  },
  calcButtonText: { fontSize: 13, fontWeight: '700', color: '#1B4332' },
  calcHint: { fontSize: 12, color: '#6B7280' },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
  saveButton: { backgroundColor: '#1B4332', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
