import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fireApi } from '../../services/api';

const formatCrore = (val: number) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const formatDelta = (val: number, prefix = '') => {
  const abs = Math.abs(val);
  const sign = val >= 0 ? '+' : '−';
  if (abs >= 10000000) return `${sign}${prefix}${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${sign}${prefix}${(abs / 100000).toFixed(1)} L`;
  return `${sign}${prefix}${abs.toLocaleString('en-IN')}`;
};

interface WhatIfState {
  extraSip: number;       // ₹ per month
  retireAgeDelta: number; // years (positive = retire later)
  returnDelta: number;    // percentage points (positive = higher returns)
}

const EXTRA_SIP_STEP = 1000;
const EXTRA_SIP_MAX = 50000;
const AGE_DELTA_MIN = -5;
const AGE_DELTA_MAX = 10;
const RETURN_DELTA_MIN = -3;
const RETURN_DELTA_MAX = 4;
const RETURN_DELTA_STEP = 0.5;

export function FIREScreen() {
  const [result, setResult] = useState<any>(null);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [overrides, setOverrides] = useState({
    retirementAge: '',
    inflationRate: '',
    withdrawalRate: '',
  });
  const [whatIf, setWhatIf] = useState<WhatIfState>({
    extraSip: 0,
    retireAgeDelta: 0,
    returnDelta: 0,
  });
  const whatIfDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildPayload = (ov: typeof overrides) => {
    const p: any = {};
    if (ov.retirementAge) p.targetRetirementAge = Number(ov.retirementAge);
    if (ov.inflationRate) p.inflationRate = Number(ov.inflationRate) / 100;
    if (ov.withdrawalRate) p.withdrawalRate = Number(ov.withdrawalRate) / 100;
    return p;
  };

  const calculate = async () => {
    setLoading(true);
    try {
      const { data } = await fireApi.calculate(buildPayload(overrides));
      setResult(data);
    } catch {
      Alert.alert('Error', 'Could not calculate FIRE projection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateWhatIf = async (wi: WhatIfState, ov: typeof overrides) => {
    if (wi.extraSip === 0 && wi.retireAgeDelta === 0 && wi.returnDelta === 0) {
      setWhatIfResult(null);
      return;
    }
    setWhatIfLoading(true);
    try {
      const base = buildPayload(ov);
      const payload: any = { ...base };
      if (wi.extraSip > 0) payload.additionalMonthlySip = wi.extraSip;
      if (wi.retireAgeDelta !== 0) {
        const baseAge = ov.retirementAge ? Number(ov.retirementAge) : (result?.fireAge ?? 60);
        payload.targetRetirementAge = Math.max(40, Math.min(70, Math.round(baseAge + wi.retireAgeDelta)));
      }
      if (wi.returnDelta !== 0) {
        // Use actual pre-retirement return from last calculation, fallback to 12%
        const inputs = result?.calculationInputs ? JSON.parse(result.calculationInputs) : null;
        const currentReturn = inputs?.expectedReturnPre ?? 0.12;
        payload.expectedReturnPre = Math.max(0.04, Math.min(0.20, currentReturn + wi.returnDelta / 100));
      }
      const { data } = await fireApi.calculate(payload);
      setWhatIfResult(data);
    } catch {
      // What-if errors are non-critical; don't alert — just leave previous result
    } finally {
      setWhatIfLoading(false);
    }
  };

  const updateWhatIf = (next: WhatIfState) => {
    setWhatIf(next);
    if (whatIfDebounce.current) clearTimeout(whatIfDebounce.current);
    whatIfDebounce.current = setTimeout(() => calculateWhatIf(next, overrides), 400);
  };

  useFocusEffect(useCallback(() => {
    calculate();
    return () => {
      if (whatIfDebounce.current) clearTimeout(whatIfDebounce.current);
    };
  }, []));

  const hasWhatIf = whatIf.extraSip !== 0 || whatIf.retireAgeDelta !== 0 || whatIf.returnDelta !== 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>FIRE Calculator</Text>
        <Text style={styles.subtitle}>Financial Independence, Retire Early</Text>

        {/* Override assumptions */}
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
              <Text style={styles.heroSub}>
                To retire at age {result.fireAge} with{' '}
                {overrides.withdrawalRate || '3.33'}% withdrawal rate
              </Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Additional SIP Needed</Text>
                <Text style={styles.metricValue}>
                  {formatCrore(Number(result.monthlySipRequired))}/mo
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Corpus Gap</Text>
                <Text style={[styles.metricValue, { color: Number(result.corpusGap) > 0 ? '#EF4444' : '#10B981' }]}>
                  {Number(result.corpusGap) > 0 ? formatCrore(Number(result.corpusGap)) : 'On Track ✓'}
                </Text>
              </View>
            </View>

            {/* What-If Scenarios */}
            <View style={styles.whatIfCard}>
              <Text style={styles.whatIfTitle}>What-If Scenarios</Text>
              <Text style={styles.whatIfSubtitle}>Adjust levers to see the impact on your FIRE plan</Text>

              {/* Extra SIP lever */}
              <View style={styles.lever}>
                <View style={styles.leverHeader}>
                  <Text style={styles.leverLabel}>Extra Monthly SIP</Text>
                  <Text style={styles.leverValue}>
                    {whatIf.extraSip === 0 ? '—' : `+₹${whatIf.extraSip.toLocaleString('en-IN')}/mo`}
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <TouchableOpacity
                    style={[styles.stepBtn, whatIf.extraSip <= 0 && styles.stepBtnDisabled]}
                    onPress={() => updateWhatIf({ ...whatIf, extraSip: Math.max(0, whatIf.extraSip - EXTRA_SIP_STEP) })}
                    disabled={whatIf.extraSip <= 0}
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <View style={styles.stepTrack}>
                    <View style={[styles.stepFill, { flex: whatIf.extraSip / EXTRA_SIP_MAX }]} />
                  </View>
                  <TouchableOpacity
                    style={[styles.stepBtn, whatIf.extraSip >= EXTRA_SIP_MAX && styles.stepBtnDisabled]}
                    onPress={() => updateWhatIf({ ...whatIf, extraSip: Math.min(EXTRA_SIP_MAX, whatIf.extraSip + EXTRA_SIP_STEP) })}
                    disabled={whatIf.extraSip >= EXTRA_SIP_MAX}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Retire age lever */}
              <View style={styles.lever}>
                <View style={styles.leverHeader}>
                  <Text style={styles.leverLabel}>Retirement Age</Text>
                  <Text style={styles.leverValue}>
                    {whatIf.retireAgeDelta === 0
                      ? '—'
                      : whatIf.retireAgeDelta > 0
                        ? `+${whatIf.retireAgeDelta} yrs later`
                        : `${whatIf.retireAgeDelta} yrs earlier`}
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <TouchableOpacity
                    style={[styles.stepBtn, whatIf.retireAgeDelta <= AGE_DELTA_MIN && styles.stepBtnDisabled]}
                    onPress={() => updateWhatIf({ ...whatIf, retireAgeDelta: Math.max(AGE_DELTA_MIN, whatIf.retireAgeDelta - 1) })}
                    disabled={whatIf.retireAgeDelta <= AGE_DELTA_MIN}
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <View style={styles.stepTrack}>
                    <View style={[
                      styles.stepFill,
                      {
                        flex: (whatIf.retireAgeDelta - AGE_DELTA_MIN) / (AGE_DELTA_MAX - AGE_DELTA_MIN),
                        backgroundColor: whatIf.retireAgeDelta >= 0 ? '#1B4332' : '#F59E0B',
                      },
                    ]} />
                  </View>
                  <TouchableOpacity
                    style={[styles.stepBtn, whatIf.retireAgeDelta >= AGE_DELTA_MAX && styles.stepBtnDisabled]}
                    onPress={() => updateWhatIf({ ...whatIf, retireAgeDelta: Math.min(AGE_DELTA_MAX, whatIf.retireAgeDelta + 1) })}
                    disabled={whatIf.retireAgeDelta >= AGE_DELTA_MAX}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Return rate lever */}
              <View style={styles.lever}>
                <View style={styles.leverHeader}>
                  <Text style={styles.leverLabel}>Expected Return</Text>
                  <Text style={styles.leverValue}>
                    {whatIf.returnDelta === 0
                      ? '—'
                      : whatIf.returnDelta > 0
                        ? `+${whatIf.returnDelta}% p.a.`
                        : `${whatIf.returnDelta}% p.a.`}
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <TouchableOpacity
                    style={[styles.stepBtn, whatIf.returnDelta <= RETURN_DELTA_MIN && styles.stepBtnDisabled]}
                    onPress={() => updateWhatIf({ ...whatIf, returnDelta: Math.max(RETURN_DELTA_MIN, +(whatIf.returnDelta - RETURN_DELTA_STEP).toFixed(1)) })}
                    disabled={whatIf.returnDelta <= RETURN_DELTA_MIN}
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <View style={styles.stepTrack}>
                    <View style={[
                      styles.stepFill,
                      {
                        flex: (whatIf.returnDelta - RETURN_DELTA_MIN) / (RETURN_DELTA_MAX - RETURN_DELTA_MIN),
                        backgroundColor: whatIf.returnDelta >= 0 ? '#1B4332' : '#EF4444',
                      },
                    ]} />
                  </View>
                  <TouchableOpacity
                    style={[styles.stepBtn, whatIf.returnDelta >= RETURN_DELTA_MAX && styles.stepBtnDisabled]}
                    onPress={() => updateWhatIf({ ...whatIf, returnDelta: Math.min(RETURN_DELTA_MAX, +(whatIf.returnDelta + RETURN_DELTA_STEP).toFixed(1)) })}
                    disabled={whatIf.returnDelta >= RETURN_DELTA_MAX}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Reset */}
              {hasWhatIf && (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => {
                    setWhatIf({ extraSip: 0, retireAgeDelta: 0, returnDelta: 0 });
                    setWhatIfResult(null);
                  }}
                >
                  <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>
              )}

              {/* What-if result comparison */}
              {whatIfLoading && <ActivityIndicator color="#1B4332" style={{ marginTop: 12 }} />}

              {whatIfResult && !whatIfLoading && (() => {
                const baseGap = Number(result.corpusGap);
                const newGap = Number(whatIfResult.corpusGap);
                const baseSip = Number(result.monthlySipRequired);
                const newSip = Number(whatIfResult.monthlySipRequired);
                const baseAge = Number(result.fireAge);
                const newAge = Number(whatIfResult.fireAge);
                const ageDiff = newAge - baseAge;

                return (
                  <View style={styles.comparisonBox}>
                    <Text style={styles.comparisonTitle}>Impact vs Current Plan</Text>
                    <View style={styles.comparisonRow}>
                      {/* Corpus gap */}
                      <View style={styles.comparisonItem}>
                        <Text style={styles.comparisonLabel}>Corpus Gap</Text>
                        <Text style={[styles.comparisonNew, { color: newGap <= baseGap ? '#10B981' : '#EF4444' }]}>
                          {newGap > 0 ? formatCrore(newGap) : 'On Track ✓'}
                        </Text>
                        {baseGap !== newGap && (
                          <Text style={[styles.comparisonDelta, { color: newGap <= baseGap ? '#10B981' : '#EF4444' }]}>
                            {formatDelta(newGap - baseGap, '₹')}
                          </Text>
                        )}
                      </View>
                      {/* Additional SIP needed */}
                      <View style={styles.comparisonItem}>
                        <Text style={styles.comparisonLabel}>Add. SIP Needed</Text>
                        <Text style={[styles.comparisonNew, { color: newSip <= baseSip ? '#10B981' : '#EF4444' }]}>
                          {formatCrore(newSip)}/mo
                        </Text>
                        {baseSip !== newSip && (
                          <Text style={[styles.comparisonDelta, { color: newSip <= baseSip ? '#10B981' : '#EF4444' }]}>
                            {formatDelta(newSip - baseSip, '₹')}/mo
                          </Text>
                        )}
                      </View>
                      {/* FIRE age */}
                      <View style={styles.comparisonItem}>
                        <Text style={styles.comparisonLabel}>FIRE Age</Text>
                        <Text style={[styles.comparisonNew, { color: newAge <= baseAge ? '#10B981' : '#6B7280' }]}>
                          {newAge}
                        </Text>
                        {ageDiff !== 0 && (
                          <Text style={[styles.comparisonDelta, { color: ageDiff < 0 ? '#10B981' : '#6B7280' }]}>
                            {ageDiff > 0 ? `+${ageDiff}` : ageDiff} yrs
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })()}
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

  // What-If section
  whatIfCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 16, elevation: 1 },
  whatIfTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  whatIfSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: -8 },
  lever: { gap: 8 },
  leverHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leverLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  leverValue: { fontSize: 13, fontWeight: '700', color: '#1B4332' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#1B4332',
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnDisabled: { borderColor: '#D1D5DB' },
  stepBtnText: { fontSize: 18, fontWeight: '700', color: '#1B4332', lineHeight: 22 },
  stepTrack: {
    flex: 1, height: 6, borderRadius: 3,
    backgroundColor: '#E5E7EB', overflow: 'hidden',
    flexDirection: 'row',
  },
  stepFill: { height: 6, backgroundColor: '#1B4332', borderRadius: 3 },
  resetBtn: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 6 },
  resetBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  comparisonBox: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, gap: 8 },
  comparisonTitle: { fontSize: 12, fontWeight: '700', color: '#1B4332', textTransform: 'uppercase', letterSpacing: 0.5 },
  comparisonRow: { flexDirection: 'row' },
  comparisonItem: { flex: 1, gap: 2 },
  comparisonLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  comparisonNew: { fontSize: 15, fontWeight: '700' },
  comparisonDelta: { fontSize: 12, fontWeight: '600' },

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
