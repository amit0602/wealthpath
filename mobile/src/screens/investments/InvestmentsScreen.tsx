import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { investmentsApi } from '../../services/api';
import { MainStackParams } from '../../navigation/AppNavigator';

const INSTRUMENT_LABELS: Record<string, string> = {
  epf: 'EPF', ppf: 'PPF', nps_tier1: 'NPS Tier 1', nps_tier2: 'NPS Tier 2',
  elss: 'ELSS', fd: 'FD', rd: 'RD', direct_equity: 'Stocks',
  real_estate: 'Real Estate', gold: 'Gold', sgb: 'SGB',
  mutual_fund_equity: 'Equity MF', mutual_fund_debt: 'Debt MF', other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  equity: '#10B981', debt: '#3B82F6', gold: '#F59E0B', realEstate: '#8B5CF6',
};

// Instrument types where a missing monthly SIP is notable (growth assets)
const GROWTH_TYPES = new Set(['elss', 'direct_equity', 'mutual_fund_equity', 'mutual_fund_debt', 'nps_tier1', 'nps_tier2']);
// Types that use annualContribution (not monthly SIP)
const ANNUAL_CONTRIB_TYPES = new Set(['ppf', 'epf', 'fd', 'rd']);

const formatINR = (val: number) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

type NavProp = NativeStackNavigationProp<MainStackParams>;

function InvestmentCard({ inv, onPress }: { inv: any; onPress: () => void }) {
  const monthly = Number(inv.monthlyContribution);
  const annual = Number(inv.annualContribution);
  const hasSip = monthly > 0;
  const hasAnnual = annual > 0 && ANNUAL_CONTRIB_TYPES.has(inv.instrumentType);
  const isGrowthAsset = GROWTH_TYPES.has(inv.instrumentType);

  return (
    <TouchableOpacity style={styles.investmentCard} onPress={onPress} activeOpacity={0.7}>
      {/* Top row: name + corpus value */}
      <View style={styles.invHeader}>
        <View style={styles.invInfo}>
          <Text style={styles.invName}>{inv.name}</Text>
          <Text style={styles.invType}>{INSTRUMENT_LABELS[inv.instrumentType] ?? inv.instrumentType}</Text>
        </View>
        <View style={styles.invRight}>
          <Text style={styles.invValue}>{formatINR(Number(inv.currentValue))}</Text>
          <Text style={styles.corpusLabel}>corpus</Text>
        </View>
      </View>

      {/* Bottom row: SIP / contribution status */}
      <View style={styles.invFooter}>
        {hasSip ? (
          // Active SIP — prominent green badge
          <View style={styles.sipBadge}>
            <View style={styles.sipDot} />
            <Text style={styles.sipBadgeText}>SIP Active · {formatINR(monthly)}/mo</Text>
          </View>
        ) : hasAnnual ? (
          // Annual contribution (EPF/PPF/FD/RD)
          <View style={styles.annualBadge}>
            <Text style={styles.annualBadgeText}>📅 {formatINR(annual)}/yr</Text>
          </View>
        ) : isGrowthAsset ? (
          // Growth asset with no SIP — flag it
          <View style={styles.idleBadge}>
            <Text style={styles.idleBadgeText}>Lump Sum · No active SIP</Text>
          </View>
        ) : (
          // Non-growth asset, no contribution — just show idle
          <View style={styles.lumpSumBadge}>
            <Text style={styles.lumpSumBadgeText}>Lump Sum</Text>
          </View>
        )}
        <Text style={styles.editHint}>Edit ›</Text>
      </View>

      {inv.lockInUntil && (
        <Text style={styles.invLockIn}>
          🔒 Locked until {new Date(inv.lockInUntil).toLocaleDateString('en-IN')}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function InvestmentsScreen() {
  const navigation = useNavigation<NavProp>();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data: res } = await investmentsApi.getAll();
      setData(res);
    } catch {
      Alert.alert('Error', 'Could not load investments');
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const summary = data?.summary;
  const investments: any[] = data?.investments ?? [];

  const activeSipCount = investments.filter((i) => Number(i.monthlyContribution) > 0).length;
  const lumpSumCount = investments.length - activeSipCount;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Investments</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.importButton} onPress={() => navigation.navigate('DematSync')}>
              <Text style={styles.importButtonText}>⟳ Demat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.importButton} onPress={() => navigation.navigate('MfImport')}>
              <Text style={styles.importButtonText}>↑ MF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('EditInvestment', {})}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {summary && (
          <>
            {/* Portfolio summary — clearer SIP vs corpus split */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Portfolio</Text>
              <Text style={styles.totalValue}>{formatINR(Number(summary.totalCorpus))}</Text>
              <View style={styles.totalBreakdown}>
                <View style={styles.totalBreakdownItem}>
                  <View style={styles.sipDotSmall} />
                  <Text style={styles.totalBreakdownText}>
                    {activeSipCount} active SIP{activeSipCount !== 1 ? 's' : ''} · {formatINR(Number(summary.monthlyContribution))}/mo
                  </Text>
                </View>
                {lumpSumCount > 0 && (
                  <View style={styles.totalBreakdownItem}>
                    <View style={styles.lumpDot} />
                    <Text style={styles.totalBreakdownText}>
                      {lumpSumCount} lump sum
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.allocationCard}>
              <Text style={styles.sectionTitle}>Asset Allocation</Text>
              <View style={styles.allocationBar}>
                {Object.entries(summary.allocation).map(([key, val]: any) =>
                  Number(val.percentage) > 0 ? (
                    <View
                      key={key}
                      style={[styles.allocationSegment, { flex: Number(val.percentage), backgroundColor: CATEGORY_COLORS[key] ?? '#6B7280' }]}
                    />
                  ) : null
                )}
              </View>
              <View style={styles.legendRow}>
                {Object.entries(summary.allocation).map(([key, val]: any) =>
                  Number(val.percentage) > 0 ? (
                    <View key={key} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[key] ?? '#6B7280' }]} />
                      <Text style={styles.legendText}>{key} {val.percentage}%</Text>
                    </View>
                  ) : null
                )}
              </View>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Your Investments</Text>

        {investments.length === 0 ? (
          <TouchableOpacity style={styles.emptyCard} onPress={() => navigation.navigate('EditInvestment', {})}>
            <Text style={styles.emptyText}>No investments added yet</Text>
            <Text style={styles.emptySub}>Tap here to add your first investment</Text>
          </TouchableOpacity>
        ) : (
          investments.map((inv: any) => (
            <InvestmentCard
              key={inv.id}
              inv={inv}
              onPress={() => navigation.navigate('EditInvestment', { investmentId: inv.id })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, gap: 14, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  importButton: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#1B4332',
  },
  importButtonText: { fontSize: 14, fontWeight: '700', color: '#1B4332' },
  addButton: { backgroundColor: '#1B4332', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Total portfolio card
  totalCard: { backgroundColor: '#1B4332', borderRadius: 16, padding: 20, gap: 8 },
  totalLabel: { fontSize: 12, color: '#A7F3D0', fontWeight: '600', textTransform: 'uppercase' },
  totalValue: { fontSize: 32, fontWeight: '800', color: '#fff' },
  totalBreakdown: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  totalBreakdownItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sipDotSmall: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6EE7B7' },
  lumpDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9CA3AF' },
  totalBreakdownText: { fontSize: 13, color: '#A7F3D0' },

  // Allocation card
  allocationCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  allocationBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' },
  allocationSegment: { height: 10 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#374151', textTransform: 'capitalize' },

  // Empty state
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 32, alignItems: 'center', elevation: 1 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySub: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },

  // Investment card
  investmentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 8, elevation: 1 },
  invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invInfo: { flex: 1 },
  invName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  invType: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  invRight: { alignItems: 'flex-end', gap: 2 },
  invValue: { fontSize: 17, fontWeight: '700', color: '#111827' },
  corpusLabel: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  invFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editHint: { fontSize: 11, color: '#9CA3AF' },
  invLockIn: { fontSize: 12, color: '#F59E0B' },

  // SIP badge — active SIP (green)
  sipBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  sipDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  sipBadgeText: { fontSize: 12, fontWeight: '700', color: '#065F46' },

  // Annual contribution badge (blue-ish)
  annualBadge: {
    backgroundColor: '#EFF6FF', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  annualBadgeText: { fontSize: 12, fontWeight: '600', color: '#1D4ED8' },

  // Idle growth asset badge (amber — call to action)
  idleBadge: {
    backgroundColor: '#FEF9C3', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  idleBadgeText: { fontSize: 12, fontWeight: '600', color: '#92400E' },

  // Lump sum (neutral)
  lumpSumBadge: {
    backgroundColor: '#F3F4F6', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  lumpSumBadgeText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
});
