import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { goalsApi } from '../../services/api';
import { MainStackParams } from '../../navigation/AppNavigator';

type RouteParams = RouteProp<MainStackParams, 'EditGoal'>;

const PRESET_GOALS = [
  { name: 'Buy a House', icon: '🏠', targetYears: 7 },
  { name: 'Child\'s Education', icon: '🎓', targetYears: 10 },
  { name: 'Buy a Car', icon: '🚗', targetYears: 3 },
  { name: 'Dream Vacation', icon: '✈️', targetYears: 2 },
  { name: 'Wedding', icon: '💍', targetYears: 3 },
  { name: 'Emergency Fund', icon: '🛡️', targetYears: 1 },
  { name: 'Start a Business', icon: '💼', targetYears: 5 },
];

function Field({
  label, hint, value, onChange, placeholder, keyboardType = 'numeric',
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; keyboardType?: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldHeader}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <TextInput
        style={[styles.input, value.length > 0 && styles.inputFilled]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholder={placeholder ?? '0'}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

export function EditGoalScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { goalId } = route.params ?? {};
  const isEdit = !!goalId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetYears, setTargetYears] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [returnRate, setReturnRate] = useState('10');

  useEffect(() => {
    if (!goalId) return;
    goalsApi.list()
      .then(({ data }) => {
        const goal = data.find((g: any) => g.id === goalId);
        if (!goal) return;
        setName(goal.name);
        setTargetAmount(String(goal.targetAmount));
        setTargetYears(String(goal.targetYears));
        setCurrentSavings(goal.currentSavings > 0 ? String(goal.currentSavings) : '');
        setReturnRate(String(Math.round(goal.expectedReturnRate * 100)));
      })
      .catch(() => Alert.alert('Error', 'Could not load goal.'))
      .finally(() => setLoading(false));
  }, [goalId]);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter a goal name.');
      return;
    }
    const target = Number(targetAmount);
    const years = Number(targetYears);
    if (!target || target < 10000) {
      Alert.alert('Validation', 'Target amount must be at least ₹10,000.');
      return;
    }
    if (!years || years < 1 || years > 50) {
      Alert.alert('Validation', 'Years to goal must be between 1 and 50.');
      return;
    }

    const payload = {
      name: name.trim(),
      targetAmount: target,
      targetYears: years,
      currentSavings: Number(currentSavings) || 0,
      expectedReturnRate: (Number(returnRate) || 10) / 100,
    };

    setSaving(true);
    try {
      if (isEdit && goalId) {
        await goalsApi.update(goalId, payload);
      } else {
        await goalsApi.create(payload);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save goal. Please try again.');
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEdit ? 'Edit Goal' : 'New Goal'}</Text>

        {!isEdit && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Start</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
              {PRESET_GOALS.map((preset) => (
                <TouchableOpacity
                  key={preset.name}
                  style={[styles.presetChip, name === preset.name && styles.presetChipActive]}
                  onPress={() => {
                    setName(preset.name);
                    setTargetYears(String(preset.targetYears));
                  }}
                >
                  <Text style={styles.presetIcon}>{preset.icon}</Text>
                  <Text style={[styles.presetLabel, name === preset.name && styles.presetLabelActive]}>
                    {preset.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goal Details</Text>
          <Field
            label="Goal Name"
            value={name}
            onChange={setName}
            placeholder="e.g. Buy a House"
            keyboardType="default"
          />
          <Field
            label="Target Amount (₹)"
            hint="How much do you need?"
            value={targetAmount}
            onChange={setTargetAmount}
            placeholder="e.g. 4000000"
          />
          <Field
            label="Years to Goal"
            hint="1–50 years"
            value={targetYears}
            onChange={setTargetYears}
            placeholder="e.g. 7"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Progress (Optional)</Text>
          <Field
            label="Already Saved (₹)"
            hint="Amount dedicated to this goal"
            value={currentSavings}
            onChange={setCurrentSavings}
            placeholder="0"
          />
          <Field
            label="Expected Return Rate (%)"
            hint="Default 10% p.a. (equity)"
            value={returnRate}
            onChange={setReturnRate}
            placeholder="10"
          />
        </View>

        <Text style={styles.disclaimer}>
          For educational purposes only. SIP calculation assumes consistent returns. Not investment advice.
        </Text>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveButtonText}>{isEdit ? 'Save Changes' : 'Create Goal'}</Text>
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
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  presetsRow: { gap: 8, paddingRight: 4 },
  presetChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
  },
  presetChipActive: { borderColor: '#1B4332', backgroundColor: '#F0FDF4' },
  presetIcon: { fontSize: 16 },
  presetLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  presetLabelActive: { color: '#1B4332', fontWeight: '700' },
  fieldWrap: { gap: 6 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  hint: { fontSize: 11, color: '#9CA3AF' },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827',
  },
  inputFilled: { borderColor: '#1B4332' },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
  saveButton: { backgroundColor: '#1B4332', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
