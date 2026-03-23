import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { fireApi, healthScoreApi, investmentsApi } from '../../services/api';

const formatCrore = (val: number) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

export function DashboardScreen() {
  const [fire, setFire] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [allocation, setAllocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [fireRes, healthRes, allocRes] = await Promise.allSettled([
        fireApi.calculate(),
        healthScoreApi.calculate(),
        investmentsApi.getAllocation(),
      ]);
      if (fireRes.status === 'fulfilled') setFire(fireRes.value.data);
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data);
      if (allocRes.status === 'fulfilled') setAllocation(allocRes.value.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const corpusGap = fire ? Number(fire.corpusGap) : 0;
  const corpusRequired = fire ? Number(fire.corpusRequired) : 0;
  const corpusFv = fire ? Number(fire.currentCorpusFutureValue) : 0;
  const progressPct = corpusRequired > 0 ? Math.min((corpusFv / corpusRequired) * 100, 100) : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1B4332" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting} 👋</Text>
          <Text style={styles.subtitle}>Here's your financial snapshot</Text>
        </View>

        {/* Health Score */}
        {health && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Financial Health Score</Text>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreValue}>{health.overallScore}</Text>
              <Text style={styles.scoreMax}>/100</Text>
              <View style={[styles.scoreBadge, { backgroundColor: health.overallScore >= 70 ? '#D1FAE5' : health.overallScore >= 40 ? '#FEF3C7' : '#FEE2E2' }]}>
                <Text style={[styles.scoreBadgeText, { color: health.overallScore >= 70 ? '#065F46' : health.overallScore >= 40 ? '#92400E' : '#991B1B' }]}>
                  {health.overallScore >= 70 ? 'Healthy' : health.overallScore >= 40 ? 'Needs Work' : 'Critical'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* FIRE Progress */}
        {fire && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Retirement Progress</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.progressPct}>{progressPct.toFixed(0)}%</Text>
            </View>
            <View style={styles.fireRow}>
              <View>
                <Text style={styles.fireLabel}>Corpus Needed</Text>
                <Text style={styles.fireValue}>{formatCrore(corpusRequired)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.fireLabel}>Corpus Gap</Text>
                <Text style={[styles.fireValue, { color: corpusGap > 0 ? '#EF4444' : '#10B981' }]}>
                  {corpusGap > 0 ? `-${formatCrore(corpusGap)}` : 'On Track ✓'}
                </Text>
              </View>
            </View>
            <View style={styles.sipBox}>
              <Text style={styles.sipLabel}>Required Monthly SIP</Text>
              <Text style={styles.sipValue}>{formatCrore(Number(fire.monthlySipRequired))}/mo</Text>
            </View>
          </View>
        )}

        {/* Portfolio */}
        {allocation && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Portfolio</Text>
            <Text style={styles.portfolioValue}>{formatCrore(Number(allocation.totalCorpus))}</Text>
            <View style={styles.allocationRow}>
              {Object.entries(allocation.allocation).map(([key, val]: any) => (
                val.percentage > 0 && (
                  <View key={key} style={styles.allocationItem}>
                    <Text style={styles.allocationLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                    <Text style={styles.allocationPct}>{val.percentage}%</Text>
                  </View>
                )
              ))}
            </View>
          </View>
        )}

        <Text style={styles.disclaimer}>
          For educational purposes only. Not investment advice. Consult a SEBI-registered advisor.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  header: { paddingTop: 8 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  scoreValue: { fontSize: 48, fontWeight: '800', color: '#1B4332' },
  scoreMax: { fontSize: 20, color: '#9CA3AF' },
  scoreBadge: { marginLeft: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  scoreBadgeText: { fontSize: 13, fontWeight: '600' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBarBg: { flex: 1, height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: 10, backgroundColor: '#1B4332', borderRadius: 5 },
  progressPct: { fontSize: 14, fontWeight: '700', color: '#1B4332', minWidth: 36 },
  fireRow: { flexDirection: 'row', justifyContent: 'space-between' },
  fireLabel: { fontSize: 12, color: '#9CA3AF' },
  fireValue: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 2 },
  sipBox: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sipLabel: { fontSize: 13, color: '#374151' },
  sipValue: { fontSize: 16, fontWeight: '700', color: '#1B4332' },
  portfolioValue: { fontSize: 28, fontWeight: '800', color: '#111827' },
  allocationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allocationItem: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  allocationLabel: { fontSize: 11, color: '#6B7280' },
  allocationPct: { fontSize: 14, fontWeight: '700', color: '#1B4332' },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
});
