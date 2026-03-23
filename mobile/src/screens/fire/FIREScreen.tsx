import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fireApi } from '../../services/api';

const formatCrore = (val: number) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

export function FIREScreen() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [overrides, setOverrides] = useState({
    retirementAge: '',
    inflationRate: '',
    withdrawalRate: '',
  });

  const calculate = async () => {
    setLoading(true);
    try {
      const payload: any = {};
      if (overrides.retirementAge) payload.targetRetirementAge = Number(overrides.retirementAge);
      if (overrides.inflationRate) payload.inflationRate = Number(overrides.inflationRate) / 100;
      if (overrides.withdrawalRate) payload.withdrawalRate = Number(overrides.withdrawalRate) / 100;
      const { data } = await fireApi.calculate(payload);
      setResult(data);
    } catch (e: any) {
      console.error(e?.response?.data);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { calculate(); }, []));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>FIRE Calculator</Text>
        <Text style={styles.subtitle}>Financial Independence, Retire Early</Text>

        {/* Override controls */}
        <View style={styles.controls}>
          <Text style={styles.controlsLabel}>Adjust Assumptions</Text>
          <View style={styles.controlRow}>
            {[
              { label: 'Retire Age', key: 'retirementAge', placeholder: '60' },
              { label: 'Inflation %', key: 'inflationRate', placeholder: '6' },
              { label: 'Withdrawal %', key: 'withdrawalRate', placeholder: '3.33' },
            ].map(({ label, key, placeholder }) => (
              <View key={key} style={styles.controlField}>
                <Text style={styles.controlLabel}>{label}</Text>
                <TextInput
                  style={styles.controlInput}
                  placeholder={placeholder}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  value={overrides[key as keyof typeof overrides]}
                  onChangeText={(v) => setOverrides((p) => ({ ...p, [key]: v }))}
                  onEndEditing={calculate}
                />
              </View>
            ))}
          </View>
        </View>

        {loading && <ActivityIndicator color="#1B4332" />}

        {result && !loading && (
          <>
            {/* Primary result */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Corpus Required</Text>
              <Text style={styles.heroValue}>{formatCrore(Number(result.corpusRequired))}</Text>
              <Text style={styles.heroSub}>To retire at age {result.fireAge} with 3.33% withdrawal rate</Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Monthly SIP Needed</Text>
                <Text style={styles.metricValue}>{formatCrore(Number(result.monthlySipRequired))}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Corpus Gap</Text>
                <Text style={[styles.metricValue, { color: Number(result.corpusGap) > 0 ? '#EF4444' : '#10B981' }]}>
                  {Number(result.corpusGap) > 0 ? formatCrore(Number(result.corpusGap)) : 'On Track ✓'}
                </Text>
              </View>
            </View>

            {/* Year-by-year table */}
            <View style={styles.tableCard}>
              <Text style={styles.tableTitle}>Year-by-Year Projection</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 1 }]}>Year</Text>
                <Text style={[styles.th, { flex: 1 }]}>Age</Text>
                <Text style={[styles.th, { flex: 2 }]}>Portfolio</Text>
              </View>
              {result.projections?.slice(0, 20).map((p: any) => (
                <View key={p.year} style={[styles.tableRow, p.isFireYear && styles.fireRow]}>
                  <Text style={[styles.td, { flex: 1 }]}>{p.year}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{p.age}</Text>
                  <Text style={[styles.td, { flex: 2 }, p.isFireYear && styles.fireTd]}>{formatCrore(Number(p.portfolioValue))}</Text>
                </View>
              ))}
            </View>

            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                📋 For educational purposes only. Projections assume consistent returns. Real returns vary. Consult a SEBI-registered investment advisor before making decisions.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: -8 },
  controls: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 10, elevation: 1 },
  controlsLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  controlRow: { flexDirection: 'row', gap: 8 },
  controlField: { flex: 1, gap: 4 },
  controlLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  controlInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 14, textAlign: 'center', color: '#111827' },
  heroCard: { backgroundColor: '#1B4332', borderRadius: 16, padding: 24, alignItems: 'center', gap: 4 },
  heroLabel: { fontSize: 13, color: '#A7F3D0', fontWeight: '600' },
  heroValue: { fontSize: 36, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 13, color: '#6EE7B7', textAlign: 'center' },
  metricsRow: { flexDirection: 'row', gap: 12 },
  metricCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 4, elevation: 1 },
  metricLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  metricValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  tableCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 8, elevation: 1 },
  tableTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 6 },
  th: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tableRow: { flexDirection: 'row', paddingVertical: 6 },
  fireRow: { backgroundColor: '#F0FDF4', borderRadius: 6, paddingHorizontal: 4 },
  td: { fontSize: 14, color: '#374151' },
  fireTd: { color: '#1B4332', fontWeight: '700' },
  disclaimerBox: { backgroundColor: '#FEF9C3', borderRadius: 10, padding: 12 },
  disclaimerText: { fontSize: 12, color: '#92400E', lineHeight: 18 },
});
