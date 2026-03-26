import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { taxApi } from '../../services/api';

const SECTION_80C_LIMIT = 150000;

function Field({
  label, hint, value, onChange, placeholder,
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  const filled = value.length > 0;
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldHeader}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <TextInput
        style={[styles.input, filled && styles.inputFilled]}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder={placeholder ?? '0'}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

export function EditTaxProfileScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [grossSalary, setGross] = useState('');
  const [hraReceived, setHra] = useState('');
  const [rentPaid, setRent] = useState('');
  const [section80cUsed, set80c] = useState('');
  const [section80dUsed, set80d] = useState('');
  const [section80ccd1bUsed, set80ccd] = useState('');
  const [homeLoanInterest, setHli] = useState('');

  useEffect(() => {
    taxApi.getProfile()
      .then(({ data }) => {
        if (!data) return;
        setGross(data.grossSalary ? String(data.grossSalary) : '');
        setHra(data.hraReceived ? String(data.hraReceived) : '');
        setRent(data.rentPaid ? String(data.rentPaid) : '');
        set80c(data.section80cUsed ? String(data.section80cUsed) : '');
        set80d(data.section80dUsed ? String(data.section80dUsed) : '');
        set80ccd(data.section80ccd1bUsed ? String(data.section80ccd1bUsed) : '');
        setHli(data.homeLoanInterest ? String(data.homeLoanInterest) : '');
      })
      .catch(() => Alert.alert('Error', 'Could not load tax profile.'))
      .finally(() => setLoading(false));
  }, []);

  const used80c = Number(section80cUsed) || 0;
  const remaining80c = Math.max(0, SECTION_80C_LIMIT - used80c);

  const save = async () => {
    if (!grossSalary || Number(grossSalary) <= 0) {
      Alert.alert('Validation', 'Please enter your annual gross salary.');
      return;
    }
    setSaving(true);
    try {
      await taxApi.updateProfile({
        grossSalary: Number(grossSalary),
        hraReceived: Number(hraReceived) || 0,
        rentPaid: Number(rentPaid) || 0,
        section80cUsed: Number(section80cUsed) || 0,
        section80dUsed: Number(section80dUsed) || 0,
        section80ccd1bUsed: Number(section80ccd1bUsed) || 0,
        homeLoanInterest: Number(homeLoanInterest) || 0,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save tax profile. Please try again.');
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
        <Text style={styles.title}>Edit Tax Profile</Text>
        <Text style={styles.subtitle}>FY 2025-26 · Used to calculate old vs new regime comparison</Text>

        {/* Income */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Income</Text>
          <Field label="Annual Gross Salary (₹)" hint="Before deductions" value={grossSalary} onChange={setGross} placeholder="e.g. 1200000" />
          <Field label="HRA Received (₹/year)" hint="Leave 0 if no HRA" value={hraReceived} onChange={setHra} />
          <Field label="Rent Paid (₹/year)" hint="Leave 0 if not renting" value={rentPaid} onChange={setRent} />
        </View>

        {/* 80C */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section 80C</Text>
          <Text style={styles.sectionNote}>
            Auto-detected from your investments (EPF/PPF/ELSS). Enter additional 80C here — LIC premiums, NSC, home loan principal, etc.
          </Text>
          <Field
            label="Total 80C (₹)"
            hint="Limit: ₹1,50,000"
            value={section80cUsed}
            onChange={(v) => set80c(v.length > 0 ? String(Math.min(Number(v), SECTION_80C_LIMIT)) : '')}
            placeholder="0"
          />
          {used80c > 0 && (
            <View style={styles.progressWrap}>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${Math.min(used80c / SECTION_80C_LIMIT, 1) * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>
                ₹{used80c.toLocaleString('en-IN')} used · {remaining80c > 0 ? `₹${remaining80c.toLocaleString('en-IN')} remaining` : 'Maxed out ✓'}
              </Text>
            </View>
          )}
          {remaining80c > 0 && used80c > 0 && (
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                Invest ₹{remaining80c.toLocaleString('en-IN')} more in ELSS or PPF to max out 80C and save up to ₹{Math.round(remaining80c * 0.3).toLocaleString('en-IN')} in tax.
              </Text>
            </View>
          )}
        </View>

        {/* Other deductions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Deductions (Old Regime)</Text>
          <Field label="Section 80D — Health Insurance Premium (₹)" hint="Limit: ₹25,000" value={section80dUsed} onChange={set80d} />
          <Field label="Section 80CCD(1B) — NPS (₹)" hint="Limit: ₹50,000" value={section80ccd1bUsed} onChange={set80ccd} />
          <Field label="Home Loan Interest (₹/year)" hint="Limit: ₹2,00,000 (Sec 24)" value={homeLoanInterest} onChange={setHli} />
        </View>

        <Text style={styles.disclaimer}>
          For educational purposes only. Not tax advice. Consult a CA for accurate computation.
        </Text>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveButtonText}>Save & Recalculate Tax</Text>
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
  subtitle: { fontSize: 13, color: '#6B7280' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  sectionNote: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  fieldWrap: { gap: 6 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  hint: { fontSize: 11, color: '#9CA3AF' },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827',
  },
  inputFilled: { borderColor: '#1B4332' },
  progressWrap: { gap: 6 },
  progressBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#1B4332', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#374151' },
  tipBox: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  tipText: { fontSize: 12, color: '#065F46', lineHeight: 18 },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
  saveButton: {
    backgroundColor: '#1B4332', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
