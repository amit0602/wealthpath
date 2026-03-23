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
import { investmentsApi } from '../../services/api';

type Props = NativeStackScreenProps<MainStackParams, 'EditInvestment'>;

const INSTRUMENT_TYPES = [
  { value: 'epf', label: 'EPF' },
  { value: 'ppf', label: 'PPF' },
  { value: 'nps_tier1', label: 'NPS Tier 1' },
  { value: 'nps_tier2', label: 'NPS Tier 2' },
  { value: 'elss', label: 'ELSS' },
  { value: 'mutual_fund_equity', label: 'Equity MF' },
  { value: 'mutual_fund_debt', label: 'Debt MF' },
  { value: 'fd', label: 'FD' },
  { value: 'rd', label: 'RD' },
  { value: 'direct_equity', label: 'Stocks' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'gold', label: 'Gold' },
  { value: 'sgb', label: 'SGB' },
  { value: 'other', label: 'Other' },
];

export function EditInvestmentScreen({ route, navigation }: Props) {
  const investmentId = route.params?.investmentId;
  const isEdit = !!investmentId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [instrumentType, setInstrumentType] = useState('epf');
  const [currentValue, setCurrentValue] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [expectedReturnRate, setExpectedReturnRate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [lockInUntil, setLockInUntil] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    investmentsApi.getAll()
      .then(({ data }) => {
        const inv = data.investments?.find((i: any) => i.id === investmentId);
        if (inv) {
          setName(inv.name ?? '');
          setInstrumentType(inv.instrumentType ?? 'epf');
          setCurrentValue(inv.currentValue != null ? String(inv.currentValue) : '');
          setMonthlyContribution(inv.monthlyContribution != null && inv.monthlyContribution !== 0 ? String(inv.monthlyContribution) : '');
          setExpectedReturnRate(inv.expectedReturnRate != null ? String(inv.expectedReturnRate) : '');
          setStartDate(inv.startDate ? inv.startDate.split('T')[0] : '');
          setMaturityDate(inv.maturityDate ? inv.maturityDate.split('T')[0] : '');
          setLockInUntil(inv.lockInUntil ? inv.lockInUntil.split('T')[0] : '');
          setNotes(inv.notes ?? '');
        }
      })
      .catch(() => Alert.alert('Error', 'Could not load investment details'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter a name for this investment.');
      return;
    }
    if (!currentValue || Number(currentValue) < 0) {
      Alert.alert('Validation', 'Please enter a valid current value.');
      return;
    }

    const payload: any = {
      name: name.trim(),
      instrumentType,
      currentValue: Number(currentValue),
    };
    if (monthlyContribution) payload.monthlyContribution = Number(monthlyContribution);
    if (expectedReturnRate) payload.expectedReturnRate = Number(expectedReturnRate);
    if (startDate) payload.startDate = startDate;
    if (maturityDate) payload.maturityDate = maturityDate;
    if (lockInUntil) payload.lockInUntil = lockInUntil;
    if (notes.trim()) payload.notes = notes.trim();

    setSaving(true);
    try {
      if (isEdit) {
        await investmentsApi.update(investmentId, payload);
      } else {
        await investmentsApi.create(payload);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save investment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Investment',
      `Are you sure you want to delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await investmentsApi.delete(investmentId!);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete investment.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
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

        <View style={styles.header}>
          <Text style={styles.title}>{isEdit ? 'Edit Investment' : 'Add Investment'}</Text>
          <Text style={styles.subtitle}>For educational purposes only. Not investment advice.</Text>
        </View>

        {/* Instrument Type */}
        <View style={styles.field}>
          <Text style={styles.label}>Instrument Type</Text>
          <View style={styles.chipsGrid}>
            {INSTRUMENT_TYPES.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[styles.chip, instrumentType === value && styles.chipActive]}
                onPress={() => setInstrumentType(value)}
              >
                <Text style={[styles.chipText, instrumentType === value && styles.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Name / Description</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. HDFC Nifty 50 Index Fund"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Current Value */}
        <View style={styles.field}>
          <Text style={styles.label}>Current Value</Text>
          <View style={styles.inputRow}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={currentValue}
              onChangeText={setCurrentValue}
            />
          </View>
        </View>

        {/* Monthly Contribution */}
        <View style={styles.field}>
          <Text style={styles.label}>Monthly Contribution</Text>
          <Text style={styles.hint}>SIP amount, EPF deduction, RD installment, etc.</Text>
          <View style={styles.inputRow}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={monthlyContribution}
              onChangeText={setMonthlyContribution}
            />
          </View>
        </View>

        {/* Expected Return Rate */}
        <View style={styles.field}>
          <Text style={styles.label}>Expected Return Rate (% p.a.)</Text>
          <Text style={styles.hint}>Leave blank to use the default for this instrument type</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputNoPrefixPadding]}
              placeholder="e.g. 12"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              value={expectedReturnRate}
              onChangeText={setExpectedReturnRate}
            />
            <Text style={styles.pctSuffix}>%</Text>
          </View>
        </View>

        {/* Date row */}
        <View style={styles.dateRow}>
          <View style={[styles.field, styles.dateField]}>
            <Text style={styles.label}>Start Date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              value={startDate}
              onChangeText={setStartDate}
            />
          </View>
          <View style={[styles.field, styles.dateField]}>
            <Text style={styles.label}>Maturity Date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              value={maturityDate}
              onChangeText={setMaturityDate}
            />
          </View>
        </View>

        {/* Lock-in Until */}
        <View style={styles.field}>
          <Text style={styles.label}>Lock-in Until</Text>
          <Text style={styles.hint}>ELSS: 3 yrs from purchase, PPF: 15 yrs, NPS: retirement</Text>
          <TextInput
            style={styles.textInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
            value={lockInUntil}
            onChangeText={setLockInUntil}
          />
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            placeholder="e.g. Folio number, broker, account details…"
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving || deleting}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Investment'}
          </Text>
        </TouchableOpacity>

        {isEdit && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={saving || deleting}
          >
            <Text style={styles.deleteButtonText}>
              {deleting ? 'Deleting…' : 'Delete Investment'}
            </Text>
          </TouchableOpacity>
        )}
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
  subtitle: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  hint: { fontSize: 12, color: '#9CA3AF' },
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  chipActive: { borderColor: '#1B4332', backgroundColor: '#F0FDF4' },
  chipText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  chipTextActive: { color: '#1B4332', fontWeight: '700' },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  rupee: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#D1D5DB',
  },
  pctSuffix: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 1,
    borderLeftColor: '#D1D5DB',
  },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' },
  inputNoPrefixPadding: { paddingLeft: 14 },
  notesInput: { height: 80, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateField: { flex: 1 },
  saveButton: {
    backgroundColor: '#1B4332',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  deleteButton: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
});
