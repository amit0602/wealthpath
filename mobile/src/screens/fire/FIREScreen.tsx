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
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Plan</Text>
          <Text style={styles.title}>FIRE number</Text>
        </View>

        {/* Assumption overrides */}
        <View style={styles.controls}>
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
            {/* YOU'LL NEED hero card */}
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>YOU'LL NEED</Text>
              <Text style={styles.heroValue}>{formatINR(corpusRequired)}</Text>
              <Text style={styles.heroSub}>
                to retire at {result.fireAge} · {overrides.withdrawalRate || '3.33'}% SWR · {overrides.inflationRate || '6'}% inflation
              </Text>

              {/* Terracotta progress bar */}
              <View style={styles.heroProgressBg}>
                <View style={[styles.heroProgressFill, { width: `${progressPct}%` as any }]} />
              </View>

              {/* Three inline stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statItemLabel}>You have</Text>
                  <Text style={styles.statItemValue}>{formatINR(corpusFv)}</Text>
                </View>
                <View style={[styles.statItem, styles.statItemCenter]}>
                  <Text style={styles.statItemLabel}>Gap</Text>
                  <Text style={[styles.statItemValue, corpusGap > 0 && styles.gapValue]}>
                    {corpusGap > 0 ? formatINR(corpusGap) : '—'}
                  </Text>
                </View>
                <View style={[styles.statItem, { alignItems: 'flex-end' }]}>
                  <Text style={styles.statItemLabel}>Monthly SIP</Text>
                  <Text style={styles.statItemValue}>{formatINR(Number(result.monthlySipRequired))}</Text>
                </View>
              </View>
            </View>

            {/* What-if sliders */}
            <WhatIfCard result={result} overrides={overrides} />

            {/* Year-by-year drill-down */}
            <TouchableOpacity
              style={styles.drillRow}
              onPress={() => navigation.navigate('FIREProjection', {
                projections: result.projections ?? [],
                corpusRequired,
                fireAge: result.fireAge,
              })}
            >
              <View>
                <Text style={styles.drillLabel}>Year-by-year projection</Text>
                <Text style={styles.drillSub}>Age {result.currentAge ?? '—'} → {result.fireAge} · {result.projections?.length ?? 0} rows</Text>
              </View>
              <Text style={styles.drillChevron}>›</Text>
            </TouchableOpacity>

            {goals.length > 0 && (
              <TouchableOpacity
                style={styles.drillRow}
                onPress={() => navigation.navigate('Goals')}
              >
                <View>
                  <Text style={styles.drillLabel}>Financial Goals</Text>
                  <Text style={styles.drillSub}>{goals.length} goal{goals.length === 1 ? '' : 's'} tracked</Text>
                </View>
                <Text style={styles.drillChevron}>›</Text>
              </TouchableOpacity>
            )}

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
  container: { flex: 1, backgroundColor: '#F5F3EE' },
  content: { padding: 20, gap: 14, paddingBottom: 32 },

  header: { gap: 2 },
  eyebrow: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A' },

  controls: { backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 1 },
  controlRow: { flexDirection: 'row', gap: 8 },
  controlField: { flex: 1, gap: 4 },
  controlLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  controlInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 14, textAlign: 'center', color: '#111827' },

  // Hero card
  heroCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 10, elevation: 1 },
  heroEyebrow: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroValue: { fontSize: 40, fontWeight: '800', color: '#1A1A1A', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  heroSub: { fontSize: 13, color: '#6B7280', marginTop: -4 },
  heroProgressBg: { height: 5, backgroundColor: '#F0EDE8', borderRadius: 3, overflow: 'hidden' },
  heroProgressFill: { height: 5, backgroundColor: '#C65D3E', borderRadius: 3 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
  statItem: { gap: 2 },
  statItemCenter: { alignItems: 'center' },
  statItemLabel: { fontSize: 11, color: '#9CA3AF' },
  statItemValue: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', fontVariant: ['tabular-nums'] },
  gapValue: { color: '#C65D3E' },

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
