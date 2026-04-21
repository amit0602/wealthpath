import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { fireApi } from '../services/api';
import { formatINR } from '../utils/money';
import { Slider } from './Slider';

interface Props {
  result: any;
  overrides: { retirementAge: string; inflationRate: string; withdrawalRate: string };
}

export function WhatIfCard({ result, overrides }: Props) {
  const baseCorpusGap = Number(result.corpusGap);
  const baseFireAge = result.fireAge;
  const baseSip = Number(result.monthlySipRequired);

  const [extraSip, setExtraSip] = useState(0);
  const [retireDelta, setRetireDelta] = useState(0);
  const [returnBoost, setReturnBoost] = useState(0);
  const [impact, setImpact] = useState<any>(null);
  const debounceRef = useRef<any>(null);

  const compute = useCallback((es: number, rd: number, rb: number) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const p: any = {};
        if (overrides.retirementAge) p.targetRetirementAge = Number(overrides.retirementAge);
        if (overrides.inflationRate) p.inflationRate = Number(overrides.inflationRate) / 100;
        if (overrides.withdrawalRate) p.withdrawalRate = Number(overrides.withdrawalRate) / 100;
        if (es) p.extraMonthlySip = es;
        if (rd) p.targetRetirementAge = (p.targetRetirementAge ?? baseFireAge) + rd;
        if (rb) p.expectedReturnRate = (Number(result.expectedReturnRate ?? 0.12)) + rb / 100;
        const { data } = await fireApi.calculate(p);
        setImpact(data);
      } catch { /* silent — best-effort */ }
    }, 400);
  }, [result, overrides, baseFireAge]);

  const handleExtraSip = (v: number) => { setExtraSip(v); compute(v, retireDelta, returnBoost); };
  const handleRetireDelta = (v: number) => { setRetireDelta(v); compute(extraSip, v, returnBoost); };
  const handleReturnBoost = (v: number) => { setReturnBoost(v); compute(extraSip, retireDelta, v); };

  const reset = () => { setExtraSip(0); setRetireDelta(0); setReturnBoost(0); setImpact(null); };

  const impactGap = impact ? Number(impact.corpusGap) : baseCorpusGap;
  const impactAge = impact ? impact.fireAge : baseFireAge;
  const impactSip = impact ? Number(impact.monthlySipRequired) : baseSip;
  const gapImproved = impactGap < baseCorpusGap;
  const ageImproved = impactAge < baseFireAge;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>What if…</Text>
        <TouchableOpacity onPress={reset}>
          <Text style={styles.resetLink}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sliderBlock}>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Extra SIP</Text>
          <Text style={styles.sliderValue}>+{formatINR(extraSip)}/mo</Text>
        </View>
        <Slider value={extraSip} min={0} max={50000} step={1000} onValueChange={handleExtraSip} color="#C65D3E" />
      </View>

      <View style={styles.sliderBlock}>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Retire at</Text>
          <Text style={styles.sliderValue}>{baseFireAge + retireDelta} ({retireDelta >= 0 ? '+' : ''}{retireDelta} yrs)</Text>
        </View>
        <Slider value={retireDelta} min={-10} max={10} step={1} onValueChange={handleRetireDelta} color="#1B4332" />
      </View>

      <View style={styles.sliderBlock}>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Return</Text>
          <Text style={styles.sliderValue}>{((Number(result.expectedReturnRate ?? 0.12)) * 100 + returnBoost).toFixed(0)}% p.a. ({returnBoost >= 0 ? '+' : ''}{returnBoost})</Text>
        </View>
        <Slider value={returnBoost} min={-3} max={5} step={1} onValueChange={handleReturnBoost} color="#374151" />
      </View>

      {(extraSip > 0 || retireDelta !== 0 || returnBoost !== 0) && (
        <View style={styles.impactCard}>
          <Text style={styles.impactLabel}>IMPACT</Text>
          <View style={styles.impactRow}>
            <View style={styles.impactItem}>
              <Text style={styles.impactItemLabel}>Gap</Text>
              <Text style={[styles.impactItemValue, { color: gapImproved ? '#2F8A4B' : '#C43535' }]}>
                {formatINR(Math.abs(impactGap))} {gapImproved ? '▼' : '▲'}
              </Text>
            </View>
            <View style={styles.impactItem}>
              <Text style={styles.impactItemLabel}>FIRE age</Text>
              <Text style={[styles.impactItemValue, { color: ageImproved ? '#2F8A4B' : '#C43535' }]}>
                {impactAge} {ageImproved ? '▼' : '▲'}
              </Text>
            </View>
            <View style={styles.impactItem}>
              <Text style={styles.impactItemLabel}>Net SIP</Text>
              <Text style={styles.impactItemValue}>{formatINR(impactSip)}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 14, elevation: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  resetLink: { fontSize: 13, fontWeight: '600', color: '#C65D3E' },
  sliderBlock: { gap: 6 },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  sliderValue: { fontSize: 13, color: '#6B7280', fontVariant: ['tabular-nums'] },
  impactCard: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, gap: 8 },
  impactLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6 },
  impactRow: { flexDirection: 'row', justifyContent: 'space-between' },
  impactItem: { gap: 2 },
  impactItemLabel: { fontSize: 11, color: '#9CA3AF' },
  impactItemValue: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', fontVariant: ['tabular-nums'] },
});
