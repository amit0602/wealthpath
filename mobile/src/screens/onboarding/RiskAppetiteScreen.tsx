import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { usersApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const QUESTIONS = [
  {
    id: 'q1',
    question: 'If your portfolio dropped 20% in a month, what would you do?',
    options: [
      { label: 'Sell everything immediately', score: 0 },
      { label: 'Reduce equity exposure', score: 1 },
      { label: 'Hold and wait', score: 2 },
      { label: 'Buy more at lower prices', score: 3 },
    ],
  },
  {
    id: 'q2',
    question: 'How stable is your income?',
    options: [
      { label: 'Very uncertain', score: 0 },
      { label: 'Somewhat stable', score: 1 },
      { label: 'Stable salaried income', score: 2 },
      { label: 'Multiple income sources', score: 3 },
    ],
  },
  {
    id: 'q3',
    question: 'What is your primary investment goal?',
    options: [
      { label: 'Preserve capital', score: 0 },
      { label: 'Steady income', score: 1 },
      { label: 'Long-term growth', score: 2 },
      { label: 'Maximum growth, OK with risk', score: 3 },
    ],
  },
  {
    id: 'q4',
    question: 'When do you need this money?',
    options: [
      { label: 'Within 3 years', score: 0 },
      { label: '3–7 years', score: 1 },
      { label: '7–15 years', score: 2 },
      { label: 'More than 15 years', score: 3 },
    ],
  },
  {
    id: 'q5',
    question: 'How familiar are you with investing in equity markets?',
    options: [
      { label: 'Not at all', score: 0 },
      { label: 'Basic (know what MFs are)', score: 1 },
      { label: 'Moderate (invest in MFs/SIPs)', score: 2 },
      { label: 'Advanced (direct equity, derivatives)', score: 3 },
    ],
  },
];

const getRiskProfile = (totalScore: number): { profile: string; description: string; color: string } => {
  if (totalScore <= 5) return { profile: 'conservative', description: 'You prefer capital safety. Recommended: 20% equity, 70% debt, 10% gold.', color: '#3B82F6' };
  if (totalScore <= 10) return { profile: 'moderate', description: 'Balanced approach. Recommended: 50% equity, 40% debt, 10% gold.', color: '#F59E0B' };
  return { profile: 'aggressive', description: 'Growth-focused. Recommended: 75% equity, 20% debt, 5% gold.', color: '#10B981' };
};

export function RiskAppetiteScreen() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const { setOnboardingComplete } = useAuthStore();

  const allAnswered = QUESTIONS.every((q) => answers[q.id] !== undefined);
  const totalScore = Object.values(answers).reduce((s, v) => s + v, 0);
  const riskResult = allAnswered ? getRiskProfile(totalScore) : null;

  const handleFinish = async () => {
    if (!riskResult) return;
    try {
      await usersApi.updateFinancialProfile({ riskAppetite: riskResult.profile });
      setOnboardingComplete();
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.step}>Step 5 of 5</Text>
          <View style={styles.progressBar}><View style={[styles.progress, { width: '100%' }]} /></View>
          <Text style={styles.title}>Risk Assessment</Text>
          <Text style={styles.subtitle}>5 quick questions to understand your investment style</Text>
        </View>

        {QUESTIONS.map((q) => (
          <View key={q.id} style={styles.question}>
            <Text style={styles.questionText}>{q.question}</Text>
            {q.options.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.option, answers[q.id] === opt.score && styles.optionSelected]}
                onPress={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.score }))}
              >
                <Text style={[styles.optionText, answers[q.id] === opt.score && styles.optionTextSelected]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {riskResult && (
          <View style={[styles.result, { borderColor: riskResult.color }]}>
            <Text style={[styles.resultProfile, { color: riskResult.color }]}>
              {riskResult.profile.charAt(0).toUpperCase() + riskResult.profile.slice(1)} Investor
            </Text>
            <Text style={styles.resultDesc}>{riskResult.description}</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.button, !allAnswered && styles.buttonDisabled]} onPress={handleFinish} disabled={!allAnswered}>
          <Text style={styles.buttonText}>Complete Setup 🎉</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          This assessment is for personalizing your experience only. Consult a SEBI-registered advisor for investment decisions.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, gap: 24 },
  header: { gap: 8 },
  step: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  progressBar: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 },
  progress: { height: 4, backgroundColor: '#1B4332', borderRadius: 2 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  question: { gap: 8 },
  questionText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  option: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, padding: 12 },
  optionSelected: { borderColor: '#1B4332', backgroundColor: '#F0FDF4' },
  optionText: { fontSize: 14, color: '#6B7280' },
  optionTextSelected: { color: '#1B4332', fontWeight: '600' },
  result: { borderWidth: 2, borderRadius: 12, padding: 16, gap: 6 },
  resultProfile: { fontSize: 18, fontWeight: '700' },
  resultDesc: { fontSize: 14, color: '#374151', lineHeight: 20 },
  button: { backgroundColor: '#1B4332', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#9CA3AF' },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16, paddingBottom: 8 },
});
