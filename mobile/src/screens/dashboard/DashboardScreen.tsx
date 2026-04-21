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

  const hasChart = snapshots.length >= 2;
  const firstSnap = snapshots[0]?.totalCorpus ?? 0;
  const lastSnap = snapshots[snapshots.length - 1]?.totalCorpus ?? 0;
  const trendPct = firstSnap > 0 ? ((lastSnap - firstSnap) / firstSnap) * 100 : 0;
  const isUp = trendPct >= 0;

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
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.subtitle}>Here's your financial snapshot</Text>
        </View>

        {/* Trial ending soon banner */}
        {trialDaysLeft !== null && (
          <TouchableOpacity style={styles.trialWarning} onPress={() => navigation.navigate('Subscription')}>
            <Text style={styles.trialWarningText}>
              Trial ends in {trialDaysLeft === 0 ? 'less than a day' : `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}`} — tap to subscribe
            </Text>
          </TouchableOpacity>
        )}

        {/* Hero FIRE card — the primary reason users open the app */}
        {fire && (
          <TouchableOpacity
            style={styles.heroCard}
            onPress={() => (navigation as any).navigate('FIRE')}
            activeOpacity={0.85}
          >
            <Text style={styles.heroLabel}>Retirement Goal</Text>
            <Text style={styles.heroPercent}>{progressPct.toFixed(0)}% of goal</Text>
            <Text style={styles.heroCorpus}>
              {formatINR(corpusFv)} of {formatINR(corpusRequired)}
            </Text>

            {/* Full-width progress bar */}
            <View style={styles.heroProgressBg}>
              <View style={[styles.heroProgressFill, { width: `${progressPct}%` as any }]} />
            </View>

            {/* CTA row */}
            {corpusGap > 0 ? (
              <View style={styles.heroCta}>
                <View>
                  <Text style={styles.heroCtaLabel}>Gap to goal</Text>
                  <Text style={styles.heroCtaValue}>{formatINR(Math.abs(corpusGap))}</Text>
                </View>
                <View style={styles.heroCtaPill}>
                  <Text style={styles.heroCtaPillText}>
                    Invest {formatINR(Number(fire.monthlySipRequired))}/mo
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.heroCta}>
                <Text style={styles.heroOnTrack}>On Track — retire at age {fire.fireAge}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Stat tiles row — health score + SIP total */}
        <View style={styles.statRow}>
          {health && (
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Health Score</Text>
              <Text style={styles.statValue}>{health.overallScore}<Text style={styles.statUnit}>/100</Text></Text>
              <View style={[styles.statBadge, {
                backgroundColor: health.overallScore >= 70 ? '#D1FAE5' : health.overallScore >= 40 ? '#FEF3C7' : '#FEE2E2',
              }]}>
                <Text style={[styles.statBadgeText, {
                  color: health.overallScore >= 70 ? '#065F46' : health.overallScore >= 40 ? '#92400E' : '#991B1B',
                }]}>
                  {health.overallScore >= 70 ? 'Healthy' : health.overallScore >= 40 ? 'Needs Work' : 'Critical'}
                </Text>
              </View>
            </View>
          )}
          {allocation && (
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>SIP This Month</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {formatINR(Number(allocation.monthlyContribution))}
              </Text>
              <Text style={styles.statSubLabel}>active contributions</Text>
            </View>
          )}
        </View>

        {/* Portfolio + Net Worth Timeline */}
        {allocation && (
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

            <View style={styles.chartSection}>
              <Text style={styles.chartLabel}>Net Worth Timeline</Text>
              <NetWorthChart snapshots={snapshots} width={chartWidth} />
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
  trialWarning: { backgroundColor: '#FEF9C3', borderRadius: 12, padding: 12 },
  trialWarningText: { fontSize: 13, fontWeight: '600', color: '#92400E', textAlign: 'center' },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },

  // Hero FIRE card
  heroCard: {
    backgroundColor: '#1B4332', borderRadius: 20, padding: 20, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  heroLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroPercent: { fontSize: 40, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  heroCorpus: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: -4 },
  heroProgressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  heroProgressFill: { height: 8, backgroundColor: '#fff', borderRadius: 4 },
  heroCta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  heroCtaLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  heroCtaValue: { fontSize: 16, fontWeight: '700', color: '#fff', fontVariant: ['tabular-nums'] },
  heroCtaPill: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  heroCtaPillText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  heroOnTrack: { fontSize: 14, color: '#6EE7B7', fontWeight: '600' },

  // Stat tiles
  statRow: { flexDirection: 'row', gap: 12 },
  statTile: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#1B4332', fontVariant: ['tabular-nums'] },
  statUnit: { fontSize: 16, fontWeight: '400', color: '#9CA3AF' },
  statSubLabel: { fontSize: 11, color: '#9CA3AF' },
  statBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start', marginTop: 2 },
  statBadgeText: { fontSize: 11, fontWeight: '600' },

  // Portfolio card
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  cardLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  portfolioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  portfolioValue: { fontSize: 28, fontWeight: '800', color: '#111827', marginTop: 2, fontVariant: ['tabular-nums'] },
  trendBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  trendText: { fontSize: 13, fontWeight: '700' },
  allocationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allocationItem: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  allocationLabel: { fontSize: 11, color: '#6B7280' },
  allocationPct: { fontSize: 14, fontWeight: '700', color: '#1B4332' },
  chartSection: { gap: 6, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  chartLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
});
