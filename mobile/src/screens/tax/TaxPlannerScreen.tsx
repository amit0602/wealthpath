import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { taxApi } from '../../services/api';
import { MainStackParams } from '../../navigation/AppNavigator';
import { useSubscriptionGate } from '../../hooks/useSubscriptionGate';

const formatINR = (val: number) => `₹${val.toLocaleString('en-IN')}`;

export function TaxPlannerScreen() {
  useSubscriptionGate();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();
  const [tax, setTax] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'comparison' | 'deductions'>('comparison');

  useFocusEffect(useCallback(() => {
    setLoading(true);
    taxApi.getComparison()
      .then(({ data }) => setTax(data))
      .catch(() => Alert.alert('Error', 'Could not load tax comparison. Please try again.'))
      .finally(() => setLoading(false));
  }, []));

  if (loading) return <SafeAreaView style={styles.container}><ActivityIndicator color="#1B4332" style={{ marginTop: 60 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Tax Planner</Text>
            <Text style={styles.subtitle}>FY {tax?.financialYear ?? '2025-26'}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('EditTaxProfile')}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['comparison', 'deductions'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'comparison' ? 'Regime Comparison' : 'Deductions'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tax && activeTab === 'comparison' && (
          <>
            {tax.recommendedRegime && (
              <View style={styles.recommendCard}>
                <Text style={styles.recommendLabel}>✨ Recommended Regime</Text>
                <Text style={styles.recommendValue}>
                  {tax.recommendedRegime === 'old' ? 'Old Regime' : 'New Regime'}
                </Text>
                <Text style={styles.recommendSavings}>Save {formatINR(tax.savings)} vs the other option</Text>
              </View>
            )}

            <View style={styles.regimeRow}>
              {[
                { label: 'Old Regime', tax: tax.oldRegimeTax, rate: tax.effectiveOldRate, recommended: tax.recommendedRegime === 'old' },
                { label: 'New Regime', tax: tax.newRegimeTax, rate: tax.effectiveNewRate, recommended: tax.recommendedRegime === 'new' },
              ].map(({ label, tax: t, rate, recommended }) => (
                <View key={label} style={[styles.regimeCard, recommended && styles.regimeCardRecommended]}>
                  {recommended && <Text style={styles.regimeBadge}>Recommended</Text>}
                  <Text style={styles.regimeLabel}>{label}</Text>
                  <Text style={styles.regimeTax}>{formatINR(t ?? 0)}</Text>
                  <Text style={styles.regimeRate}>Effective rate: {(rate ?? 0).toFixed(1)}%</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {tax && activeTab === 'deductions' && (
          <View style={styles.deductionsCard}>
            <Text style={styles.sectionTitle}>Section 80C</Text>
            <View style={styles.deductionRow}>
              <View style={[styles.deductionBar, { flex: Math.min(Number(tax.autoDetected80c ?? 0) / 150000, 1) }]} />
              <View style={[styles.deductionBarBg, { flex: Math.max(1 - Number(tax.autoDetected80c ?? 0) / 150000, 0) }]} />
            </View>
            <Text style={styles.deductionText}>
              Used: {formatINR(tax.autoDetected80c ?? 0)} / ₹1,50,000
            </Text>
            {(tax.section80cRemaining ?? 0) > 0 && (
              <Text style={styles.deductionHint}>
                💡 Invest {formatINR(tax.section80cRemaining)} more in ELSS or PPF to max out 80C
              </Text>
            )}

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Key Deductions (Old Regime)</Text>
            {[
              { label: 'Standard Deduction', limit: '₹75,000', note: 'Auto-applied' },
              { label: 'Section 80C', limit: '₹1,50,000', note: 'EPF + PPF + ELSS + LIC' },
              { label: 'Section 80D', limit: '₹25,000', note: 'Health insurance premium' },
              { label: 'Section 80CCD(1B)', limit: '₹50,000', note: 'NPS additional deduction' },
              { label: 'HRA Exemption', limit: 'Variable', note: 'Based on rent paid & city' },
            ].map(({ label, limit, note }) => (
              <View key={label} style={styles.deductionItem}>
                <View>
                  <Text style={styles.deductionLabel}>{label}</Text>
                  <Text style={styles.deductionNote}>{note}</Text>
                </View>
                <Text style={styles.deductionLimit}>{limit}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            Tax calculations are estimates. Consult a CA for accurate computation. Updated for FY 2025-26.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, gap: 14, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280' },
  editButton: { borderWidth: 1, borderColor: '#1B4332', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  editButtonText: { fontSize: 13, fontWeight: '600', color: '#1B4332' },
  tabs: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  tabTextActive: { color: '#1B4332', fontWeight: '700' },
  recommendCard: { backgroundColor: '#F0FDF4', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#6EE7B7' },
  recommendLabel: { fontSize: 12, color: '#065F46', fontWeight: '600' },
  recommendValue: { fontSize: 20, fontWeight: '800', color: '#1B4332', marginTop: 2 },
  recommendSavings: { fontSize: 13, color: '#065F46', marginTop: 2 },
  regimeRow: { flexDirection: 'row', gap: 12 },
  regimeCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#E5E7EB', elevation: 1 },
  regimeCardRecommended: { borderColor: '#1B4332' },
  regimeBadge: { fontSize: 10, color: '#1B4332', fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  regimeLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  regimeTax: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 4 },
  regimeRate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  deductionsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  deductionRow: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  deductionBar: { backgroundColor: '#1B4332', height: 8 },
  deductionBarBg: { backgroundColor: '#E5E7EB', height: 8 },
  deductionText: { fontSize: 13, color: '#374151' },
  deductionHint: { fontSize: 13, color: '#065F46', backgroundColor: '#F0FDF4', padding: 10, borderRadius: 8 },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  deductionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6 },
  deductionLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  deductionNote: { fontSize: 11, color: '#9CA3AF' },
  deductionLimit: { fontSize: 13, fontWeight: '700', color: '#1B4332' },
  disclaimerBox: { backgroundColor: '#FEF9C3', borderRadius: 10, padding: 12 },
  disclaimerText: { fontSize: 12, color: '#92400E', lineHeight: 18 },
});
