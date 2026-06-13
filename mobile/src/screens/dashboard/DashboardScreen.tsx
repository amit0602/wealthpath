import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fireApi, healthScoreApi, investmentsApi, subscriptionsApi } from '../../services/api';
import { NetWorthChart } from '../../components/NetWorthChart';
import { MainStackParams } from '../../navigation/AppNavigator';
import { useSubscriptionGate } from '../../hooks/useSubscriptionGate';
import { formatINR } from '../../utils/money';

export function DashboardScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();
  const [fire, setFire] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [allocation, setAllocation] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  useSubscriptionGate();

  const load = async () => {
    try {
      const [fireRes, healthRes, allocRes, snapshotRes, subRes] = await Promise.allSettled([
        fireApi.calculate(),
        healthScoreApi.calculate(),
        investmentsApi.getAllocation(),
        investmentsApi.getSnapshots(),
        subscriptionsApi.getMe(),
      ]);
      if (fireRes.status === 'fulfilled') setFire(fireRes.value.data);
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data);
      if (allocRes.status === 'fulfilled') setAllocation(allocRes.value.data);
      if (snapshotRes.status === 'fulfilled') setSnapshots(snapshotRes.value.data);
      if (subRes.status === 'fulfilled') {
        const sub = subRes.value.data;
        if (sub.trialActive && sub.trialDaysLeft <= 2) setTrialDaysLeft(sub.trialDaysLeft);
        else setTrialDaysLeft(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const corpusGap = fire ? Number(fire.corpusGap) : 0;
  const corpusRequired = fire ? Number(fire.corpusRequired) : 0;
  const corpusFv = fire ? Number(fire.currentCorpusFutureValue) : 0;
  const progressPct = corpusRequired > 0 ? Math.min((corpusFv / corpusRequired) * 100, 100) : 0;

  // Net worth trend (first vs last snapshot)
  const hasChart = snapshots.length >= 2;
  const firstSnap = snapshots[0]?.totalCorpus ?? 0;
  const lastSnap = snapshots[snapshots.length - 1]?.totalCorpus ?? 0;
  const trendPct = firstSnap > 0 ? ((lastSnap - firstSnap) / firstSnap) * 100 : 0;
  const isUp = trendPct >= 0;

  // Chart width = card width = screen - 2*padding - 2*card-padding
  const chartWidth = width - 40 - 32;

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

        {/* Trial ending soon banner */}
        {trialDaysLeft !== null && (
          <TouchableOpacity style={styles.trialWarning} onPress={() => navigation.navigate('Subscription')}>
            <Text style={styles.trialWarningText}>
              ⏳ Your free trial ends in {trialDaysLeft === 0 ? 'less than a day' : `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}`} — tap to subscribe
            </Text>
          </TouchableOpacity>
        )}

        {/* FIRE Hero Card — primary focal point */}
        {fire && (
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Retirement Progress</Text>
            <Text style={styles.heroPercent}>{progressPct.toFixed(0)}% of goal</Text>
            <View style={styles.heroProgressBg}>
              <View style={[styles.heroProgressFill, { width: `${progressPct}%` as any }]} />
            </View>
            <View style={styles.heroDetails}>
              <View>
                <Text style={styles.heroDetailLabel}>Target Corpus</Text>
                <Text style={styles.heroDetailValue}>{formatINR(corpusRequired)}</Text>
              </View>
              {corpusGap > 0 ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.heroDetailLabel}>SIP to reach goal</Text>
                  <Text style={styles.heroDetailValue}>{formatINR(Number(fire.monthlySipRequired))}/mo</Text>
                </View>
              ) : (
                <View style={[styles.heroOnTrack]}>
                  <Text style={styles.heroOnTrackText}>On Track ✓</Text>
                </View>
              )}
            </View>
            {corpusGap > 0 && (
              <Text style={styles.heroGapLabel}>Gap to goal: {formatINR(corpusGap)} · retire at {fire.fireAge}</Text>
            )}
          </View>
        )}

        {/* Stat tiles — Health Score + monthly SIP */}
        <View style={styles.statRow}>
          {health && (
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Health Score</Text>
              <Text style={[styles.statValue, { color: health.overallScore >= 70 ? '#10B981' : health.overallScore >= 40 ? '#F59E0B' : '#EF4444' }]} numberOfLines={1}>
                {health.overallScore}<Text style={styles.statUnit}>/100</Text>
              </Text>
              <Text style={styles.statCaption}>{health.overallScore >= 70 ? 'Healthy' : health.overallScore >= 40 ? 'Needs Work' : 'Critical'}</Text>
            </View>
          )}
          {fire && (
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Monthly SIP</Text>
              <Text style={styles.statValue} numberOfLines={1}>{formatINR(Number(fire.monthlySipRequired))}</Text>
              <Text style={styles.statCaption}>needed/month</Text>
            </View>
          )}
        </View>

        {/* Portfolio + Net Worth Timeline */}
        {allocation && Number(allocation.totalCorpus) > 0 ? (
          <View style={styles.card}>
            <View style={styles.portfolioHeader}>
              <View>
                <Text style={styles.cardLabel}>Total Portfolio</Text>
                <Text style={styles.portfolioValue}>{formatINR(Number(allocation.totalCorpus))}</Text>
              </View>
              {hasChart && (
                <View style={[styles.trendBadge, { backgroundColor: isUp ? '#D1FAE5' : '#FEE2E2' }]}>
                  <Text style={[styles.trendText, { color: isUp ? '#065F46' : '#991B1B' }]}>
                    {isUp ? '▲' : '▼'} {Math.abs(trendPct).toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>

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

            {/* Net worth chart */}
            <View style={styles.chartSection}>
              <Text style={styles.chartLabel}>Net Worth Timeline</Text>
              <NetWorthChart snapshots={snapshots} width={chartWidth} />
            </View>
          </View>
        ) : (
          /* Empty state — no investments yet */
          <TouchableOpacity style={styles.emptyCard} onPress={() => navigation.navigate('EditInvestment', {})}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>Add your first investment</Text>
            <Text style={styles.emptySub}>
              Track MF, EPF, PPF, stocks, FD and more in one place — your portfolio summary will appear here.
            </Text>
            <View style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>+ Add Investment</Text>
            </View>
          </TouchableOpacity>
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
  trialWarning: { backgroundColor: '#FEF9C3', borderRadius: 12, padding: 12 },
  trialWarningText: { fontSize: 13, fontWeight: '600', color: '#92400E', textAlign: 'center' },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // FIRE hero card
  heroCard: { backgroundColor: '#1B4332', borderRadius: 20, padding: 20, gap: 10 },
  heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.60)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroPercent: { fontSize: 36, fontWeight: '800', color: '#fff' },
  heroProgressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.20)', borderRadius: 4, overflow: 'hidden' },
  heroProgressFill: { height: 8, backgroundColor: '#6EE7B7', borderRadius: 4 },
  heroDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  heroDetailLabel: { fontSize: 11, color: 'rgba(255,255,255,0.60)' },
  heroDetailValue: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 2 },
  heroOnTrack: { backgroundColor: 'rgba(110,231,183,0.20)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  heroOnTrackText: { fontSize: 14, fontWeight: '700', color: '#6EE7B7' },
  heroGapLabel: { fontSize: 11, color: 'rgba(255,255,255,0.50)', marginTop: -4 },

  // Stat tiles row
  statRow: { flexDirection: 'row', gap: 12 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 4, elevation: 1 },
  statLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  statUnit: { fontSize: 14, fontWeight: '400', color: '#9CA3AF' },
  statCaption: { fontSize: 12, color: '#6B7280' },

  portfolioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  portfolioValue: { fontSize: 28, fontWeight: '800', color: '#111827', marginTop: 2 },
  trendBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  trendText: { fontSize: 13, fontWeight: '700' },
  allocationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allocationItem: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  allocationLabel: { fontSize: 11, color: '#6B7280' },
  allocationPct: { fontSize: 14, fontWeight: '700', color: '#1B4332' },
  chartSection: { gap: 6, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  chartLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },

  // Empty state — no investments yet
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  emptyIcon: { fontSize: 36, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptySub: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19 },
  emptyButton: {
    marginTop: 6, backgroundColor: '#1B4332', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  emptyButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
