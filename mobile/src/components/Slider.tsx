import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (v: number) => void;
  color?: string;
}

export function Slider({ value, min, max, step, onValueChange, color = '#1B4332' }: SliderProps) {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webWrapper}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e: any) => onValueChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: color, height: 4, cursor: 'pointer' } as any}
        />
      </View>
    );
  }

  // Native fallback — stepper buttons
  const dec = () => onValueChange(Math.max(min, value - step));
  const inc = () => onValueChange(Math.min(max, value + step));
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepBtn} onPress={dec}>
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <View style={[styles.track, { flex: 1 }]}>
        <View style={[styles.fill, { flex: (value - min) / (max - min), backgroundColor: color }]} />
      </View>
      <TouchableOpacity style={styles.stepBtn} onPress={inc}>
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  webWrapper: { width: '100%' as any, paddingVertical: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 18, color: '#374151', lineHeight: 20 },
  track: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden', flexDirection: 'row' },
  fill: { height: 4, borderRadius: 2 },
});
