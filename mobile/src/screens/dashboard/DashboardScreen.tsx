import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fireApi, healthScoreApi, investmentsApi, subscriptionsApi, usersApi } from '../../services/api';
import { NetWorthChart } from '../../components/NetWorthChart';
import { Icon } from '../../components/Icon';
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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  useSubscriptionGate();

  const load = async () => {
    try {
      const [fireRes, healthRes, allocRes, snapshotRes, subRes, userRes] = await Promise.allSettled([
        fireApi.calculate(),
        healthScoreApi.calculate(),
        investmentsApi.getAllocation(),
        investmentsApi.getSnapshots(),
        subscriptionsApi.getMe(),
        usersApi.getMe(),
      ]);
      if (fireRes.status === 'fulfilled') setFire(fireRes.value.data);
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data);
      if (allocRes.status === 'fulfilled') setAllocation(allocRes.value.data);
      if (snapshotRes.status === 'fulfilled') setSnapshots(snapshotRes.value.data);
      if (userRes.status === 'fulfilled') setUser(userRes.value.data);
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
  const timeOfDay = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const greeting = firstName ? `${timeOfDay}, ${firstName}` : timeOfDay;

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

  const healthScore = health?.overallScore ?? 0;
  const healthColor = healthScore >= 70 ? '#2F8A4B' : healthScore >= 40 ? '#C48A1E' : '#C43535';
  const healthLabel = healthScore >= 70 ? 'Healthy' : healthScore >= 40 ? 'Needs work' : 'Critical';

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
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.pageTitle}>Your path</Text>
          </View>
          <TouchableOpacity style={styles.bellButton} onPress={() => navigation.navigate('NotificationPreferences')}>
            <Icon name="bell" size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Trial ending soon banner */}
        {trialDaysLeft !== null && (
          <TouchableOpacity style={styles.trialWarning} onPress={() => navigation.navigate('Subscription')}>
            <Text style={styles.trialWarningText}>
              Trial ends in {trialDaysLeft === 0 ? 'less than a day' : `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}`} — tap to subscribe
            </Text>
          </TouchableOpacity>
        )}

        {/* Hero FIRE card */}
        {fire && (
          <TouchableOpacity
            style={styles.heroCard}
            onPress={() => (navigation as any).navigate('FIRE')}
            activeOpacity={0.85}
          >
            <View style={styles.heroTopRow}>
              <Text style={styles.heroLabel}>FIRE PROGRESS</Text>
              <Text style={styles.heroAgeRange}>Age {fire.currentAge ?? '—'} → {fire.fireAge}</Text>
            </View>

            <Text style={styles.heroCorpus}>
              {formatINR(corpusFv)} <Text style={styles.heroCorpusOf}>of {formatINR(corpusRequired)}</Text>
            </Text>

            {/* Terracotta progress bar */}
            <View style={styles.heroProgressBg}>
              <View style={[styles.heroProgressFill, { width: `${progressPct}%` as any }]} />
            </View>

            <View style={styles.heroFooter}>
              <Text style={styles.heroFundedLabel}>{progressPct.toFixed(0)}% funded</Text>
              {corpusGap > 0 ? (
                <Text style={styles.heroToGoLabel}>{formatINR(corpusGap)} to go</Text>
              ) : (
                <Text style={styles.heroOnTrack}>On track</Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Stat tiles */}
        <View style={styles.statRow}>
          {health && (
            <TouchableOpacity style={styles.statTile} activeOpacity={0.8}>
              <Text style={styles.statLabel}>HEALTH</Text>
              <Text style={styles.statValue}>{healthScore}<Text style={styles.statUnit}> /100</Text></Text>
              {/* Mini segmented bar */}
              <View style={styles.miniBarRow}>
                {[...Array(5)].map((_, i) => (
                  <View
                    key={i}
                    style={[styles.miniBarSeg, { backgroundColor: i < Math.round(healthScore / 20) ? healthColor : '#E5E7EB' }]}
                  />
                ))}
              </View>
              <Text style={[styles.statHint, { color: healthColor }]}>
                {healthLabel}{healthScore < 70 ? ' · fix emergency fund' : ''}
              </Text>
            </TouchableOpacity>
          )}
          {allocation && (
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>MONTHLY SIP</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {formatINR(Number(allocation.monthlyContribution))}
              </Text>
              <Text style={styles.statSubLabel}>to stay on track</Text>
            </View>
          )}
        </View>

        {/* Portfolio card */}
        {allocation && (
          <TouchableOpacity
            style={styles.portfolioCard}
            activeOpacity={0.85}
            onPress={() => (navigation as any).navigate('Investments')}
          >
            <View style={styles.portfolioHeader}>
              <View>
                <Text style={styles.portfolioEyebrow}>PORTFOLIO</Text>
                <Text style={styles.portfolioValue}>{formatINR(Number(allocation.totalCorpus))}</Text>
              </View>
              <Text style={styles.viewAllLink}>View all ›</Text>
            </View>

            {/* Allocation bar */}
            <View style={styles.allocationBar}>
              {Object.entries(allocation.allocation).map(([key, val]: any) =>
                val.percentage > 0 ? (
                  <View
                    key={key}
                    style={[styles.allocationSeg, {
                      flex: val.percentage,
                      backgroundColor: ALLOC_COLORS[key] ?? '#9CA3AF',
                    }]}
                  />
                ) : null
              )}
            </View>

            {/* Legend dots */}
            <View style={styles.legendRow}>
              {Object.entries(allocation.allocation).map(([key, val]: any) =>
                val.percentage > 0 ? (
                  <View key={key} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: ALLOC_COLORS[key] ?? '#9CA3AF' }]} />
                    <Text style={styles.legendText}>
                      {ALLOC_LABELS[key] ?? key} {val.percentage}%
                    </Text>
                  </View>
                ) : null
              )}
            </View>

            {/* Net Worth chart */}
            {hasChart && (
              <View style={styles.chartSection}>
                <View style={styles.chartHeaderRow}>
                  <Text style={styles.chartLabel}>Net Worth Timeline</Text>
                  <View style={[styles.trendBadge, { backgroundColor: isUp ? '#D1FAE5' : '#FEE2E2' }]}>
                    <Text style={[styles.trendText, { color: isUp ? '#065F46' : '#991B1B' }]}>
                      {isUp ? '▲' : '▼'} {Math.abs(trendPct).toFixed(1)}%
                    </Text>
                  </View>
                </View>
                <NetWorthChart snapshots={snapshots} width={chartWidth} />
              </View>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          For educational purposes only. Not investment advice. Consult a SEBI-registered advisor.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const ALLOC_COLORS: Record<string, string> = {
  equity: '#2F8A4B', debt: '#6B7280', gold: '#C65D3E', realEstate: '#D1D5DB',
};
const ALLOC_LABELS: Record<string, string> = {
  equity: 'Equity', debt: 'Debt', gold: 'Gold', realEstate: 'RE',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3EE' },
  content: { padding: 20, gap: 14, paddingBottom: 32 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 4 },
  headerLeft: { gap: 2 },
  greeting: { fontSize: 13, color: '#6B7280' },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A1A' },
  bellButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E3DE' },

  trialWarning: { backgroundColor: '#FEF9C3', borderRadius: 12, padding: 12 },
  trialWarningText: { fontSize: 13, fontWeight: '600', color: '#92400E', textAlign: 'center' },

  // Hero FIRE card
  heroCard: {
    backgroundColor: '#1B4332', borderRadius: 20, padding: 20, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroAgeRange: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  heroCorpus: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroCorpusOf: { fontSize: 16, fontWeight: '400', color: 'rgba(255,255,255,0.6)' },
  heroProgressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  heroProgressFill: { height: 6, backgroundColor: '#C65D3E', borderRadius: 3 },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroFundedLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  heroToGoLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  heroOnTrack: { fontSize: 13, color: '#6EE7B7', fontWeight: '600' },

  // Stat tiles
  statRow: { flexDirection: 'row', gap: 12 },
  statTile: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  statLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  statValue: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', fontVariant: ['tabular-nums'] },
  statUnit: { fontSize: 14, fontWeight: '400', color: '#9CA3AF' },
  statSubLabel: { fontSize: 11, color: '#9CA3AF' },
  miniBarRow: { flexDirection: 'row', gap: 3 },
  miniBarSeg: { flex: 1, height: 3, borderRadius: 2 },
  statHint: { fontSize: 11, fontWeight: '600', lineHeight: 15 },

  // Portfolio card
  portfolioCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10, elevation: 1 },
  portfolioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  portfolioEyebrow: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  portfolioValue: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', fontVariant: ['tabular-nums'] },
  viewAllLink: { fontSize: 13, fontWeight: '600', color: '#C65D3E' },
  allocationBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden' },
  allocationSeg: { height: 6 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#374151' },
  chartSection: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10, gap: 6 },
  chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  trendBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  trendText: { fontSize: 12, fontWeight: '700' },

  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
});
