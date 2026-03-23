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

const formatINR = (val: number) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

type NavProp = NativeStackNavigationProp<MainStackParams>;

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
  const investments = data?.investments ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Header row with title and Add button */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Investments</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('EditInvestment', {})}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {summary && (
          <>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Portfolio</Text>
              <Text style={styles.totalValue}>{formatINR(Number(summary.totalCorpus))}</Text>
              <Text style={styles.totalSub}>Monthly contribution: {formatINR(Number(summary.monthlyContribution))}</Text>
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
          <TouchableOpacity
            style={styles.emptyCard}
            onPress={() => navigation.navigate('EditInvestment', {})}
          >
            <Text style={styles.emptyText}>No investments added yet</Text>
            <Text style={styles.emptySub}>Tap here to add your first investment</Text>
          </TouchableOpacity>
        ) : (
          investments.map((inv: any) => (
            <TouchableOpacity
              key={inv.id}
              style={styles.investmentCard}
              onPress={() => navigation.navigate('EditInvestment', { investmentId: inv.id })}
              activeOpacity={0.7}
            >
              <View style={styles.invHeader}>
                <View style={styles.invInfo}>
                  <Text style={styles.invName}>{inv.name}</Text>
                  <Text style={styles.invType}>{INSTRUMENT_LABELS[inv.instrumentType] ?? inv.instrumentType}</Text>
                </View>
                <View style={styles.invRight}>
                  <Text style={styles.invValue}>{formatINR(Number(inv.currentValue))}</Text>
                  <Text style={styles.editHint}>Edit ›</Text>
                </View>
              </View>
              {Number(inv.monthlyContribution) > 0 && (
                <Text style={styles.invContrib}>+{formatINR(Number(inv.monthlyContribution))}/mo</Text>
              )}
              {inv.lockInUntil && (
                <Text style={styles.invLockIn}>🔒 Locked until {new Date(inv.lockInUntil).toLocaleDateString('en-IN')}</Text>
              )}
            </TouchableOpacity>
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
  addButton: {
    backgroundColor: '#1B4332',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  totalCard: { backgroundColor: '#1B4332', borderRadius: 16, padding: 20 },
  totalLabel: { fontSize: 12, color: '#A7F3D0', fontWeight: '600', textTransform: 'uppercase' },
  totalValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 4 },
  totalSub: { fontSize: 13, color: '#6EE7B7', marginTop: 4 },
  allocationCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  allocationBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' },
  allocationSegment: { height: 10 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#374151', textTransform: 'capitalize' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 32, alignItems: 'center', elevation: 1 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySub: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  investmentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 4, elevation: 1 },
  invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invInfo: { flex: 1 },
  invName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  invType: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  invRight: { alignItems: 'flex-end', gap: 2 },
  invValue: { fontSize: 17, fontWeight: '700', color: '#1B4332' },
  editHint: { fontSize: 11, color: '#9CA3AF' },
  invContrib: { fontSize: 13, color: '#6B7280' },
  invLockIn: { fontSize: 12, color: '#F59E0B' },
});
