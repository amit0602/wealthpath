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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fireApi, goalsApi } from '../../services/api';
import { MainStackParams } from '../../navigation/AppNavigator';
import { useSubscriptionGate } from '../../hooks/useSubscriptionGate';
import { formatINR, formatINRDelta } from '../../utils/money';

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

// formatINR from money.ts used for all currency — goal display uses decimals: 1

export function FIREScreen() {
  useSubscriptionGate();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();
  const [result, setResult] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
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
    goalsApi.list().then(({ data }) => setGoals(data)).catch(() => {});
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

        {!result && !loading && (
          <TouchableOpacity
            style={styles.emptyCard}
            onPress={() => navigation.navigate('EditInvestment', {})}
          >
            <Text style={styles.emptyIcon}>🔥</Text>
            <Text style={styles.emptyTitle}>Your FIRE number awaits</Text>
            <Text style={styles.emptySub}>
              Add at least one investment to calculate how much corpus you need and your monthly SIP target.
            </Text>
            <View style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>+ Add Investment</Text>
            </View>
          </TouchableOpacity>
        )}

        {result && !loading && (
          <>
            {/* Primary result */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Corpus Required</Text>
              <Text style={styles.heroValue}>{formatINR(Number(result.corpusRequired))}</Text>
              <Text style={styles.heroSub}>
                To retire at age {result.fireAge} with{' '}
                {overrides.withdrawalRate || '3.33'}% withdrawal rate
              </Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Additional SIP Needed</Text>
                <Text style={styles.metricValue} numberOfLines={1}>
                  {formatINR(Number(result.monthlySipRequired))}/mo
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Corpus Gap</Text>
                <Text style={[styles.metricValue, { color: Number(result.corpusGap) > 0 ? '#EF4444' : '#10B981' }]} numberOfLines={1}>
                  {Number(result.corpusGap) > 0 ? formatINR(Number(result.corpusGap)) : 'On Track ✓'}
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
                          {newGap > 0 ? formatINR(newGap) : 'On Track ✓'}
                        </Text>
                        {baseGap !== newGap && (
                          <Text style={[styles.comparisonDelta, { color: newGap <= baseGap ? '#10B981' : '#EF4444' }]}>
                            {formatINRDelta(newGap - baseGap)}
                          </Text>
                        )}
                      </View>
                      {/* Additional SIP needed */}
                      <View style={styles.comparisonItem}>
                        <Text style={styles.comparisonLabel}>Add. SIP Needed</Text>
                        <Text style={[styles.comparisonNew, { color: newSip <= baseSip ? '#10B981' : '#EF4444' }]}>
                          {formatINR(newSip)}/mo
                        </Text>
                        {baseSip !== newSip && (
                          <Text style={[styles.comparisonDelta, { color: newSip <= baseSip ? '#10B981' : '#EF4444' }]}>
                            {formatINRDelta(newSip - baseSip)}/mo
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

            {/* Drill-down to year-by-year projection */}
            {result.projections?.length > 0 && (
              <TouchableOpacity
                style={styles.projectionRow}
                onPress={() => navigation.navigate('FIREProjection', {
                  projections: result.projections,
                  corpusRequired: Number(result.corpusRequired),
                  fireAge: result.fireAge,
                })}
              >
                <View>
                  <Text style={styles.projectionRowLabel}>Year-by-Year Projection</Text>
                  <Text style={styles.projectionRowSub}>{result.projections.length} years · target at age {result.fireAge}</Text>
                </View>
                <Text style={styles.projectionRowChevron}>›</Text>
              </TouchableOpacity>
            )}

            {/* Financial Goals */}
            <View style={styles.goalsCard}>
              <View style={styles.goalsHeader}>
                <View>
                  <Text style={styles.goalsTitle}>Financial Goals</Text>
                  <Text style={styles.goalsSubtitle}>Track savings for life milestones</Text>
                </View>
                <TouchableOpacity
                  style={styles.goalsViewAll}
                  onPress={() => navigation.navigate('Goals')}
                >
                  <Text style={styles.goalsViewAllText}>
                    {goals.length > 0 ? 'View All ›' : '+ Add Goal'}
                  </Text>
                </TouchableOpacity>
              </View>

              {goals.length === 0 ? (
                <TouchableOpacity
                  style={styles.goalsEmpty}
                  onPress={() => navigation.navigate('EditGoal', {})}
                >
                  <Text style={styles.goalsEmptyIcon}>🎯</Text>
                  <Text style={styles.goalsEmptyText}>
                    Add goals like "Buy house in 5 years" to calculate a dedicated monthly SIP
                  </Text>
                </TouchableOpacity>
              ) : (
                goals.slice(0, 3).map((goal) => (
                  <View key={goal.id} style={styles.goalRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalRowName}>{goal.name}</Text>
                      <Text style={styles.goalRowMeta}>
                        {goal.targetYears} {goal.targetYears === 1 ? 'yr' : 'yrs'} · Target {formatINR(goal.targetAmount, { decimals: 1 })}
                      </Text>
                    </View>
                    <Text style={styles.goalRowSip}>
                      {goal.monthlyRequiredSip > 0
                        ? `${formatINR(goal.monthlyRequiredSip, { decimals: 1 })}/mo`
                        : 'On track ✓'}
                    </Text>
                  </View>
                ))
              )}
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
  metricValue: { fontSize: 16, fontWeight: '700', color: '#111827' },

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

  projectionRow: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 1,
  },
  projectionRowLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  projectionRowSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  projectionRowChevron: { fontSize: 22, color: '#9CA3AF' },

  disclaimerBox: { backgroundColor: '#FEF9C3', borderRadius: 10, padding: 12 },
  disclaimerText: { fontSize: 12, color: '#92400E', lineHeight: 18 },
  goalsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12, elevation: 1 },
  goalsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  goalsTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  goalsSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  goalsViewAll: { paddingHorizontal: 2, paddingVertical: 2 },
  goalsViewAllText: { fontSize: 14, color: '#1B4332', fontWeight: '700' },
  goalsEmpty: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  goalsEmptyIcon: { fontSize: 24 },
  goalsEmptyText: { flex: 1, fontSize: 13, color: '#6B7280', lineHeight: 18 },
  goalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  goalRowName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  goalRowMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  goalRowSip: { fontSize: 14, fontWeight: '700', color: '#1B4332' },

  // Empty state — no investments/FIRE data yet
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', gap: 8,
    elevation: 1,
  },
  emptyIcon: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  emptySub: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19 },
  emptyButton: {
    marginTop: 6, backgroundColor: '#1B4332', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  emptyButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
