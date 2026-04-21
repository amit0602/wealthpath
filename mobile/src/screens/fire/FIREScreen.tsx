import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TextInput, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fireApi, goalsApi } from '../../services/api';
import { MainStackParams } from '../../navigation/AppNavigator';
import { useSubscriptionGate } from '../../hooks/useSubscriptionGate';
import { WhatIfCard } from '../../components/WhatIfCard';
import { formatINR } from '../../utils/money';

export function FIREScreen() {
  useSubscriptionGate();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();
  const [result, setResult] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [overrides, setOverrides] = useState({ retirementAge: '', inflationRate: '', withdrawalRate: '' });

  const calculate = async (ov = overrides) => {
    setLoading(true);
    try {
      const p: any = {};
      if (ov.retirementAge) p.targetRetirementAge = Number(ov.retirementAge);
      if (ov.inflationRate) p.inflationRate = Number(ov.inflationRate) / 100;
      if (ov.withdrawalRate) p.withdrawalRate = Number(ov.withdrawalRate) / 100;
      const { data } = await fireApi.calculate(p);
      setResult(data);
    } catch {
      Alert.alert('Error', 'Could not calculate FIRE projection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    calculate();
    goalsApi.list().then(({ data }) => setGoals(data)).catch(() => {});
  }, []));

  const corpusRequired = result ? Number(result.corpusRequired) : 0;
  const corpusFv = result ? Number(result.currentCorpusFutureValue) : 0;
  const progressPct = corpusRequired > 0 ? Math.min((corpusFv / corpusRequired) * 100, 100) : 0;
  const corpusGap = result ? Number(result.corpusGap) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>FIRE Calculator</Text>
        <Text style={styles.subtitle}>Financial Independence, Retire Early</Text>

        {/* Assumption overrides */}
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
                  onEndEditing={() => calculate()}
                />
              </View>
            ))}
          </View>
        </View>

        {loading && <ActivityIndicator color="#1B4332" />}

        {result && !loading && (
          <>
            {/* Result hero — visible above fold */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Corpus Required</Text>
              <Text style={styles.heroValue}>{formatINR(corpusRequired)}</Text>
              <Text style={styles.heroSub}>
                Retire at age {result.fireAge} · {overrides.withdrawalRate || '3.33'}% withdrawal
              </Text>
              <View style={styles.heroProgressBg}>
                <View style={[styles.heroProgressFill, { width: `${progressPct}%` as any }]} />
              </View>
              <View style={styles.heroMetrics}>
                <View>
                  <Text style={styles.heroMetricLabel}>Additional SIP</Text>
                  <Text style={styles.heroMetricValue}>{formatINR(Number(result.monthlySipRequired))}/mo</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.heroMetricLabel}>Gap to goal</Text>
                  <Text style={[styles.heroMetricValue, { color: corpusGap > 0 ? 'rgba(255,255,255,0.85)' : '#6EE7B7' }]}>
                    {corpusGap > 0 ? formatINR(corpusGap) : 'On Track'}
                  </Text>
                </View>
              </View>
            </View>

            {/* What-if scenarios */}
            <WhatIfCard result={result} overrides={overrides} />

            {/* Drill-down: year-by-year projection */}
            <TouchableOpacity
              style={styles.drillRow}
              onPress={() => navigation.navigate('FIREProjection', {
                projections: result.projections ?? [],
                corpusRequired,
                fireAge: result.fireAge,
              })}
            >
              <Text style={styles.drillLabel}>See year-by-year projection</Text>
              <Text style={styles.drillChevron}>›</Text>
            </TouchableOpacity>

            {/* Financial goals shortcut */}
            <TouchableOpacity
              style={styles.drillRow}
              onPress={() => navigation.navigate(goals.length > 0 ? 'Goals' : 'EditGoal', {})}
            >
              <View>
                <Text style={styles.drillLabel}>Financial Goals</Text>
                <Text style={styles.drillSub}>
                  {goals.length > 0 ? `${goals.length} goal${goals.length === 1 ? '' : 's'} tracked` : 'Add goals like house, education, car'}
                </Text>
              </View>
              <Text style={styles.drillChevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                For educational purposes only. Projections assume consistent returns. Real returns vary. Consult a SEBI-registered investment advisor before making decisions.
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
  heroCard: { backgroundColor: '#1B4332', borderRadius: 16, padding: 24, gap: 8 },
  heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroValue: { fontSize: 36, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  heroProgressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  heroProgressFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
  heroMetrics: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  heroMetricLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  heroMetricValue: { fontSize: 16, fontWeight: '700', color: '#fff', fontVariant: ['tabular-nums'] },
  drillRow: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 1,
  },
  drillLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  drillSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  drillChevron: { fontSize: 22, color: '#9CA3AF' },
  disclaimerBox: { backgroundColor: '#FEF9C3', borderRadius: 10, padding: 12 },
  disclaimerText: { fontSize: 12, color: '#92400E', lineHeight: 18 },
});
