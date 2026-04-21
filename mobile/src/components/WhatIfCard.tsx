import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { fireApi } from '../services/api';
import { formatINR, formatINRDelta } from '../utils/money';

const EXTRA_SIP_STEP = 1000;
const EXTRA_SIP_MAX = 50000;
const AGE_DELTA_MIN = -5;
const AGE_DELTA_MAX = 10;
const RETURN_DELTA_MIN = -3;
const RETURN_DELTA_MAX = 4;
const RETURN_DELTA_STEP = 0.5;

interface WhatIfCardProps {
  result: any;
  overrides: {
    retirementAge: string;
    inflationRate: string;
    withdrawalRate: string;
  };
}

interface WhatIfState {
  extraSip: number;
  retireAgeDelta: number;
  returnDelta: number;
}

export function WhatIfCard({ result, overrides }: WhatIfCardProps) {
  const [whatIf, setWhatIf] = useState<WhatIfState>({ extraSip: 0, retireAgeDelta: 0, returnDelta: 0 });
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculate = async (wi: WhatIfState) => {
    if (wi.extraSip === 0 && wi.retireAgeDelta === 0 && wi.returnDelta === 0) {
      setWhatIfResult(null);
      return;
    }
    setWhatIfLoading(true);
    try {
      const payload: any = {};
      if (overrides.retirementAge) payload.targetRetirementAge = Number(overrides.retirementAge);
      if (overrides.inflationRate) payload.inflationRate = Number(overrides.inflationRate) / 100;
      if (overrides.withdrawalRate) payload.withdrawalRate = Number(overrides.withdrawalRate) / 100;
      if (wi.extraSip > 0) payload.additionalMonthlySip = wi.extraSip;
      if (wi.retireAgeDelta !== 0) {
        const base = overrides.retirementAge ? Number(overrides.retirementAge) : (result?.fireAge ?? 60);
        payload.targetRetirementAge = Math.max(40, Math.min(70, Math.round(base + wi.retireAgeDelta)));
      }
      if (wi.returnDelta !== 0) {
        const inputs = result?.calculationInputs ? JSON.parse(result.calculationInputs) : null;
        const cur = inputs?.expectedReturnPre ?? 0.12;
        payload.expectedReturnPre = Math.max(0.04, Math.min(0.20, cur + wi.returnDelta / 100));
      }
      const { data } = await fireApi.calculate(payload);
      setWhatIfResult(data);
    } catch {
      // non-critical — leave previous result
    } finally {
      setWhatIfLoading(false);
    }
  };

  const update = (next: WhatIfState) => {
    setWhatIf(next);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => calculate(next), 400);
  };

  const hasWhatIf = whatIf.extraSip !== 0 || whatIf.retireAgeDelta !== 0 || whatIf.returnDelta !== 0;

  const Lever = ({
    label, valueLabel, onMinus, onPlus, minusDisabled, plusDisabled, trackFill, trackColor,
  }: {
    label: string; valueLabel: string;
    onMinus: () => void; onPlus: () => void;
    minusDisabled: boolean; plusDisabled: boolean;
    trackFill: number; trackColor: string;
  }) => (
    <View style={styles.lever}>
      <View style={styles.leverHeader}>
        <Text style={styles.leverLabel}>{label}</Text>
        <Text style={styles.leverValue}>{valueLabel}</Text>
      </View>
      <View style={styles.stepRow}>
        <TouchableOpacity style={[styles.stepBtn, minusDisabled && styles.stepBtnDisabled]} onPress={onMinus} disabled={minusDisabled}>
          <Text style={[styles.stepBtnText, minusDisabled && styles.stepBtnTextDisabled]}>−</Text>
        </TouchableOpacity>
        <View style={styles.stepTrack}>
          <View style={[styles.stepFill, { flex: trackFill, backgroundColor: trackColor }]} />
        </View>
        <TouchableOpacity style={[styles.stepBtn, plusDisabled && styles.stepBtnDisabled]} onPress={onPlus} disabled={plusDisabled}>
          <Text style={[styles.stepBtnText, plusDisabled && styles.stepBtnTextDisabled]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>What-If Scenarios</Text>
      <Text style={styles.subtitle}>Adjust levers to see the impact on your FIRE plan</Text>

      <Lever
        label="Extra Monthly SIP"
        valueLabel={whatIf.extraSip === 0 ? '—' : `+₹${whatIf.extraSip.toLocaleString('en-IN')}/mo`}
        onMinus={() => update({ ...whatIf, extraSip: Math.max(0, whatIf.extraSip - EXTRA_SIP_STEP) })}
        onPlus={() => update({ ...whatIf, extraSip: Math.min(EXTRA_SIP_MAX, whatIf.extraSip + EXTRA_SIP_STEP) })}
        minusDisabled={whatIf.extraSip <= 0}
        plusDisabled={whatIf.extraSip >= EXTRA_SIP_MAX}
        trackFill={whatIf.extraSip / EXTRA_SIP_MAX}
        trackColor="#1B4332"
      />

      <Lever
        label="Retirement Age"
        valueLabel={
          whatIf.retireAgeDelta === 0 ? '—'
            : whatIf.retireAgeDelta > 0 ? `+${whatIf.retireAgeDelta} yrs later`
            : `${whatIf.retireAgeDelta} yrs earlier`
        }
        onMinus={() => update({ ...whatIf, retireAgeDelta: Math.max(AGE_DELTA_MIN, whatIf.retireAgeDelta - 1) })}
        onPlus={() => update({ ...whatIf, retireAgeDelta: Math.min(AGE_DELTA_MAX, whatIf.retireAgeDelta + 1) })}
        minusDisabled={whatIf.retireAgeDelta <= AGE_DELTA_MIN}
        plusDisabled={whatIf.retireAgeDelta >= AGE_DELTA_MAX}
        trackFill={(whatIf.retireAgeDelta - AGE_DELTA_MIN) / (AGE_DELTA_MAX - AGE_DELTA_MIN)}
        trackColor={whatIf.retireAgeDelta >= 0 ? '#1B4332' : '#F59E0B'}
      />

      <Lever
        label="Expected Return"
        valueLabel={
          whatIf.returnDelta === 0 ? '—'
            : whatIf.returnDelta > 0 ? `+${whatIf.returnDelta}% p.a.`
            : `${whatIf.returnDelta}% p.a.`
        }
        onMinus={() => update({ ...whatIf, returnDelta: Math.max(RETURN_DELTA_MIN, +(whatIf.returnDelta - RETURN_DELTA_STEP).toFixed(1)) })}
        onPlus={() => update({ ...whatIf, returnDelta: Math.min(RETURN_DELTA_MAX, +(whatIf.returnDelta + RETURN_DELTA_STEP).toFixed(1)) })}
        minusDisabled={whatIf.returnDelta <= RETURN_DELTA_MIN}
        plusDisabled={whatIf.returnDelta >= RETURN_DELTA_MAX}
        trackFill={(whatIf.returnDelta - RETURN_DELTA_MIN) / (RETURN_DELTA_MAX - RETURN_DELTA_MIN)}
        trackColor={whatIf.returnDelta >= 0 ? '#1B4332' : '#EF4444'}
      />

      {hasWhatIf && (
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => { setWhatIf({ extraSip: 0, retireAgeDelta: 0, returnDelta: 0 }); setWhatIfResult(null); }}
        >
          <Text style={styles.resetBtnText}>Reset</Text>
        </TouchableOpacity>
      )}

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
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>Corpus Gap</Text>
                <Text style={[styles.comparisonNew, { color: newGap <= baseGap ? '#10B981' : '#EF4444' }]}>
                  {newGap > 0 ? formatINR(newGap) : 'On Track'}
                </Text>
                {baseGap !== newGap && (
                  <Text style={[styles.comparisonDelta, { color: newGap <= baseGap ? '#10B981' : '#EF4444' }]}>
                    {formatINRDelta(newGap - baseGap)}
                  </Text>
                )}
              </View>
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
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 16, elevation: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#9CA3AF', marginTop: -8 },
  lever: { gap: 8 },
  leverHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leverLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  leverValue: { fontSize: 13, fontWeight: '700', color: '#1B4332' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1.5, borderColor: '#1B4332', alignItems: 'center', justifyContent: 'center' },
  stepBtnDisabled: { borderColor: '#D1D5DB' },
  stepBtnText: { fontSize: 20, fontWeight: '700', color: '#1B4332', lineHeight: 24 },
  stepBtnTextDisabled: { color: '#D1D5DB' },
  stepTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB', overflow: 'hidden', flexDirection: 'row' },
  stepFill: { height: 6, borderRadius: 3 },
  resetBtn: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 6 },
  resetBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  comparisonBox: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, gap: 8 },
  comparisonTitle: { fontSize: 11, fontWeight: '700', color: '#1B4332', textTransform: 'uppercase', letterSpacing: 0.5 },
  comparisonRow: { flexDirection: 'row' },
  comparisonItem: { flex: 1, gap: 2 },
  comparisonLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  comparisonNew: { fontSize: 15, fontWeight: '700' },
  comparisonDelta: { fontSize: 12, fontWeight: '600' },
});
