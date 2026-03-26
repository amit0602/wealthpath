import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { emergencyFundApi, healthScoreApi } from '../../services/api';

const formatINR = (val: number) => {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const TARGET_MONTHS_OPTIONS = [3, 6, 9, 12];

export function EmergencyFundScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data from API
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [targetMonths, setTargetMonths] = useState(6);
  const [targetAmount, setTargetAmount] = useState(0);
  const [shortfall, setShortfall] = useState(0);
  const [monthsCovered, setMonthsCovered] = useState(0);
  const [progressPct, setProgressPct] = useState(0);

  // Form state
  const [liquidSavingsInput, setLiquidSavingsInput] = useState('');
  const [selectedMonths, setSelectedMonths] = useState(6);

  useEffect(() => {
    emergencyFundApi.get()
      .then(({ data }) => {
        setMonthlyExpenses(data.monthlyExpenses);
        setTargetMonths(data.targetMonths);
        setTargetAmount(data.targetAmount);
        setShortfall(data.shortfall);
        setMonthsCovered(data.monthsCovered);
        setProgressPct(data.progressPct);
        setLiquidSavingsInput(data.liquidSavings > 0 ? String(data.liquidSavings) : '');
        setSelectedMonths(data.targetMonths);
      })
      .catch(() => Alert.alert('Error', 'Could not load emergency fund data. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const liquid = Number(liquidSavingsInput) || 0;
    setSaving(true);
    try {
      const { data } = await emergencyFundApi.upsert({ liquidSavings: liquid, targetMonths: selectedMonths });
      setMonthlyExpenses(data.monthlyExpenses);
      setTargetMonths(data.targetMonths);
      setTargetAmount(data.targetAmount);
      setShortfall(data.shortfall);
      setMonthsCovered(data.monthsCovered);
      setProgressPct(data.progressPct);
      // Recalculate health score in background
      healthScoreApi.calculate().catch(() => {});
      Alert.alert('Saved', 'Emergency fund updated. Your health score will refresh.');
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
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

  const statusColor = progressPct >= 100 ? '#10B981' : progressPct >= 50 ? '#F59E0B' : '#EF4444';
  const statusLabel = progressPct >= 100 ? 'Fully Funded ✓' : progressPct >= 50 ? 'Partially Funded' : 'Underfunded';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Emergency Fund</Text>
        <Text style={styles.subtitle}>A financial safety net for unexpected events</Text>

        {/* Status card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>Months Covered</Text>
              <Text style={[styles.statusValue, { color: statusColor }]}>{monthsCovered} mo</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: progressPct >= 100 ? '#D1FAE5' : progressPct >= 50 ? '#FEF3C7' : '#FEE2E2' }]}>
              <Text style={[styles.statusBadgeText, { color: progressPct >= 100 ? '#065F46' : progressPct >= 50 ? '#92400E' : '#991B1B' }]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: statusColor }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLeft}>₹0</Text>
            <Text style={[styles.progressCenter, { color: statusColor }]}>{progressPct.toFixed(0)}% of target</Text>
            <Text style={styles.progressRight}>{formatINR(targetAmount)}</Text>
          </View>

          {/* Key numbers */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Liquid Savings</Text>
              <Text style={styles.metricValue}>{formatINR(Number(liquidSavingsInput) || 0)}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Target ({selectedMonths} mo)</Text>
              <Text style={styles.metricValue}>{formatINR(monthlyExpenses * selectedMonths)}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Shortfall</Text>
              <Text style={[styles.metricValue, { color: shortfall > 0 ? '#EF4444' : '#10B981' }]}>
                {shortfall > 0 ? formatINR(shortfall) : 'None'}
              </Text>
            </View>
          </View>
        </View>

        {/* What counts as an emergency fund */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What to include</Text>
          {[
            { icon: '🏦', text: 'Savings account balance (not salary account)' },
            { icon: '📋', text: 'Liquid FD (no lock-in or breakable within 1–2 days)' },
            { icon: '💰', text: 'Liquid funds / overnight funds in MF' },
          ].map(({ icon, text }) => (
            <View key={text} style={styles.infoRow}>
              <Text style={styles.infoIcon}>{icon}</Text>
              <Text style={styles.infoText}>{text}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <Text style={styles.infoNote}>
            Do NOT include equity, ELSS, PPF, EPF, or any investment you cannot access within 2–3 days.
          </Text>
        </View>

        {/* Edit form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update Your Emergency Fund</Text>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Total Liquid Savings (₹)</Text>
            <TextInput
              style={[styles.input, liquidSavingsInput.length > 0 && styles.inputFilled]}
              value={liquidSavingsInput}
              onChangeText={setLiquidSavingsInput}
              keyboardType="numeric"
              placeholder="e.g. 200000"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Target Coverage</Text>
            <Text style={styles.fieldNote}>How many months of expenses as a safety net?</Text>
            <View style={styles.monthsRow}>
              {TARGET_MONTHS_OPTIONS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.monthChip, selectedMonths === m && styles.monthChipActive]}
                  onPress={() => setSelectedMonths(m)}
                >
                  <Text style={[styles.monthChipText, selectedMonths === m && styles.monthChipTextActive]}>
                    {m} mo
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {monthlyExpenses > 0 && (
              <Text style={styles.targetHint}>
                Target: {formatINR(monthlyExpenses * selectedMonths)} ({selectedMonths}× ₹{monthlyExpenses.toLocaleString('en-IN')}/mo expenses)
              </Text>
            )}
          </View>
        </View>

        {shortfall > 0 && (
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💡 How to build your emergency fund</Text>
            <Text style={styles.tipText}>
              You need {formatINR(shortfall)} more. Consider setting up an auto-sweep to a liquid FD or money market fund each month. Even ₹{formatINR(Math.round(shortfall / 12))}/month gets you there in a year.
            </Text>
          </View>
        )}

        <Text style={styles.disclaimer}>
          For educational purposes only. Not investment advice.
        </Text>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveButtonText}>Save & Update Health Score</Text>
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
  statusCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12, elevation: 1 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' },
  statusValue: { fontSize: 32, fontWeight: '800', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText: { fontSize: 13, fontWeight: '700' },
  progressBg: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: 10, borderRadius: 5 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLeft: { fontSize: 11, color: '#9CA3AF' },
  progressCenter: { fontSize: 13, fontWeight: '700' },
  progressRight: { fontSize: 11, color: '#9CA3AF' },
  metricsRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12 },
  metricItem: { flex: 1, alignItems: 'center', gap: 3 },
  metricDivider: { width: 1, backgroundColor: '#E5E7EB' },
  metricLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  metricValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  infoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10, elevation: 1 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { fontSize: 18 },
  infoText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  infoNote: { fontSize: 12, color: '#EF4444', lineHeight: 18 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  fieldWrap: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  fieldNote: { fontSize: 12, color: '#9CA3AF' },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827',
  },
  inputFilled: { borderColor: '#1B4332' },
  monthsRow: { flexDirection: 'row', gap: 8 },
  monthChip: { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  monthChipActive: { borderColor: '#1B4332', backgroundColor: '#F0FDF4' },
  monthChipText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  monthChipTextActive: { color: '#1B4332' },
  targetHint: { fontSize: 12, color: '#065F46', backgroundColor: '#F0FDF4', padding: 8, borderRadius: 8 },
  tipCard: { backgroundColor: '#FEF9C3', borderRadius: 12, padding: 14, gap: 8 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  tipText: { fontSize: 13, color: '#78350F', lineHeight: 20 },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
  saveButton: { backgroundColor: '#1B4332', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
