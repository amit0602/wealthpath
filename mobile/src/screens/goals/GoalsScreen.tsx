import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { goalsApi } from '../../services/api';
import { MainStackParams } from '../../navigation/AppNavigator';

const formatCrore = (val: number) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const GOAL_ICONS: Record<string, string> = {
  house: '🏠', home: '🏠', flat: '🏠', property: '🏠',
  car: '🚗', vehicle: '🚗',
  education: '🎓', college: '🎓', school: '🎓', study: '🎓',
  travel: '✈️', vacation: '✈️', trip: '✈️',
  wedding: '💍', marriage: '💍',
  emergency: '🛡️', fund: '🛡️',
  business: '💼', startup: '💼',
};

function getGoalIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, icon] of Object.entries(GOAL_ICONS)) {
    if (lower.includes(keyword)) return icon;
  }
  return '🎯';
}

export function GoalsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await goalsApi.list();
      setGoals(data);
    } catch {
      Alert.alert('Error', 'Could not load goals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleDelete = (goal: any) => {
    Alert.alert(
      'Delete Goal',
      `Remove "${goal.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await goalsApi.delete(goal.id);
              setGoals((g) => g.filter((x) => x.id !== goal.id));
            } catch {
              Alert.alert('Error', 'Could not delete goal. Please try again.');
            }
          },
        },
      ],
    );
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
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>My Goals</Text>
            <Text style={styles.subtitle}>Save towards life milestones alongside FIRE</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('EditGoal', {})}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {goals.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.emptySubtitle}>
              Add goals like "Buy house in 5 years" or "Child's education in 8 years" to track how much to save each month.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('EditGoal', {})}
            >
              <Text style={styles.emptyButtonText}>Add First Goal</Text>
            </TouchableOpacity>
          </View>
        )}

        {goals.map((goal) => {
          const progressPct = goal.targetAmount > 0
            ? Math.min((goal.currentSavings / goal.targetAmount) * 100, 100)
            : 0;

          return (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <View style={styles.goalTitleRow}>
                  <Text style={styles.goalIcon}>{getGoalIcon(goal.name)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    <Text style={styles.goalMeta}>
                      {goal.targetYears} {goal.targetYears === 1 ? 'year' : 'years'} · {(goal.expectedReturnRate * 100).toFixed(0)}% p.a.
                    </Text>
                  </View>
                </View>
                <View style={styles.goalActions}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('EditGoal', { goalId: goal.id })}
                    style={styles.actionBtn}
                  >
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(goal)} style={styles.actionBtn}>
                    <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Target + SIP */}
              <View style={styles.goalMetrics}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Target</Text>
                  <Text style={styles.metricValue}>{formatCrore(goal.targetAmount)}</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Monthly SIP</Text>
                  <Text style={[styles.metricValue, { color: '#1B4332' }]}>
                    {goal.monthlyRequiredSip > 0 ? `${formatCrore(goal.monthlyRequiredSip)}/mo` : 'On track ✓'}
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Still Needed</Text>
                  <Text style={styles.metricValue}>
                    {goal.amountStillNeeded > 0 ? formatCrore(goal.amountStillNeeded) : '—'}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              {goal.currentSavings > 0 && (
                <View style={styles.progressWrap}>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {formatCrore(goal.currentSavings)} saved · {progressPct.toFixed(0)}%
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.disclaimer}>
          For educational purposes only. SIP amounts assume consistent returns. Not investment advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  back: { fontSize: 17, color: '#1B4332', fontWeight: '600' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2, maxWidth: 220 },
  addButton: { backgroundColor: '#1B4332', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', gap: 10, elevation: 1 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  emptyButton: { backgroundColor: '#1B4332', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  goalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12, elevation: 1 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  goalTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  goalIcon: { fontSize: 24, marginTop: 2 },
  goalName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  goalMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  goalActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { paddingVertical: 2 },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#1B4332' },
  goalMetrics: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12 },
  metricItem: { flex: 1, alignItems: 'center', gap: 3 },
  metricDivider: { width: 1, backgroundColor: '#E5E7EB' },
  metricLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  metricValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  progressWrap: { gap: 4 },
  progressBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#1B4332', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#6B7280' },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
});
