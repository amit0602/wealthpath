import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  RefreshControl, Alert, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { investmentsApi } from '../../services/api';
import { MainStackParams } from '../../navigation/AppNavigator';
import { useSubscriptionGate } from '../../hooks/useSubscriptionGate';
import { formatINR } from '../../utils/money';

const INSTRUMENT_LABELS: Record<string, string> = {
  epf: 'EPF', ppf: 'PPF', nps_tier1: 'NPS Tier 1', nps_tier2: 'NPS Tier 2',
  elss: 'ELSS', fd: 'FD', rd: 'RD', direct_equity: 'Stocks',
  real_estate: 'Real Estate', gold: 'Gold', sgb: 'SGB',
  mutual_fund_equity: 'Equity MF', mutual_fund_debt: 'Debt MF', other: 'Other',
};

const ALLOC_COLORS: Record<string, string> = {
  equity: '#2F8A4B', debt: '#6B7280', gold: '#C65D3E', realEstate: '#D1D5DB',
};

const GROWTH_TYPES = new Set(['elss', 'direct_equity', 'mutual_fund_equity', 'mutual_fund_debt', 'nps_tier1', 'nps_tier2']);
const ANNUAL_CONTRIB_TYPES = new Set(['ppf', 'epf', 'fd', 'rd']);

type NavProp = NativeStackNavigationProp<MainStackParams>;

function InvestmentCard({ inv, onPress }: { inv: any; onPress: () => void }) {
  const monthly = Number(inv.monthlyContribution);
  const annual = Number(inv.annualContribution);
  const hasSip = monthly > 0;
  const hasAnnual = annual > 0 && ANNUAL_CONTRIB_TYPES.has(inv.instrumentType);
  const isGrowthAsset = GROWTH_TYPES.has(inv.instrumentType);
  const initial = (inv.name?.[0] ?? '?').toUpperCase();

  const category = INSTRUMENT_LABELS[inv.instrumentType] ?? inv.instrumentType;
  const isLocked = !!inv.lockInUntil && new Date(inv.lockInUntil) > new Date();
  const lockLabel = isLocked ? `Locked ${new Date(inv.lockInUntil).getFullYear()}` : 'Open';

  return (
    <TouchableOpacity style={styles.investmentCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.invRow}>
        {/* Letter avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        {/* Name + category */}
        <View style={styles.invInfo}>
          <Text style={styles.invName}>{inv.name}</Text>
          <Text style={styles.invType}>
            {category}{isLocked ? ` · ${lockLabel}` : ''}
          </Text>
        </View>

        {/* Value + contribution badge */}
        <View style={styles.invRight}>
          <Text style={styles.invValue}>{formatINR(Number(inv.currentValue))}</Text>
          {hasSip ? (
            <Text style={styles.sipLabel}>SIP · {formatINR(monthly)}/mo</Text>
          ) : hasAnnual ? (
            <Text style={styles.annualLabel}>{formatINR(annual)}/yr</Text>
          ) : isGrowthAsset ? (
            <Text style={styles.idleLabel}>No SIP</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function InvestmentsScreen() {
  useSubscriptionGate();
  const navigation = useNavigation<NavProp>();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showActions, setShowActions] = useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>Portfolio</Text>
            <Text style={styles.title}>Investments</Text>
          </View>
        </View>

        {/* Action sheet modal */}
        <Modal visible={showActions} transparent animationType="fade" onRequestClose={() => setShowActions(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowActions(false)}>
            <View style={styles.actionSheet}>
              <Text style={styles.actionSheetTitle}>Add Investment</Text>
              {[
                { label: 'Add manually', onPress: () => { setShowActions(false); navigation.navigate('EditInvestment', {}); } },
                { label: 'Import MF (CAMS / KFintech)', onPress: () => { setShowActions(false); navigation.navigate('MfImport'); } },
                { label: 'Sync Demat holdings', onPress: () => { setShowActions(false); navigation.navigate('DematSync'); } },
              ].map(({ label, onPress }) => (
                <TouchableOpacity key={label} style={styles.actionItem} onPress={onPress}>
                  <Text style={styles.actionItemText}>{label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.actionCancel} onPress={() => setShowActions(false)}>
                <Text style={styles.actionCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {summary && (
          <>
            {/* Corpus card with inline allocation */}
            <View style={styles.corpusCard}>
              <View style={styles.corpusTopRow}>
                <View>
                  <Text style={styles.corpusEyebrow}>TOTAL CORPUS</Text>
                  <Text style={styles.corpusValue}>{formatINR(Number(summary.totalCorpus))}</Text>
                </View>
                {Number(summary.monthlyContribution) > 0 && (
                  <Text style={styles.corpusSip}>+{formatINR(Number(summary.monthlyContribution))}/mo</Text>
                )}
              </View>

              {/* Allocation bar */}
              <View style={styles.allocationBar}>
                {Object.entries(summary.allocation).map(([key, val]: any) =>
                  Number(val.percentage) > 0 ? (
                    <View key={key} style={[styles.allocationSeg, { flex: Number(val.percentage), backgroundColor: ALLOC_COLORS[key] ?? '#9CA3AF' }]} />
                  ) : null
                )}
              </View>

              {/* Allocation labels */}
              <View style={styles.allocLabelRow}>
                {Object.entries(summary.allocation).map(([key, val]: any) =>
                  Number(val.percentage) > 0 ? (
                    <View key={key} style={styles.allocLabelItem}>
                      <Text style={styles.allocLabelKey}>{key === 'realEstate' ? 'Real Est.' : key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                      <Text style={[styles.allocLabelPct, { color: ALLOC_COLORS[key] ?? '#6B7280' }]}>{val.percentage}%</Text>
                    </View>
                  ) : null
                )}
              </View>
            </View>

            {/* 3 action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('DematSync')}>
                <Text style={styles.actionBtnLabel}>Link demat</Text>
                <Text style={styles.actionBtnSub}>Fetch holdings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('MfImport')}>
                <Text style={styles.actionBtnLabel}>Import MF</Text>
                <Text style={styles.actionBtnSub}>CAS statement</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDark]} onPress={() => navigation.navigate('EditInvestment', {})}>
                <Text style={styles.actionBtnLabelDark}>Manual</Text>
                <Text style={styles.actionBtnSubDark}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Holdings header */}
        <View style={styles.holdingsHeader}>
          <Text style={styles.holdingsLabel}>HOLDINGS</Text>
        </View>

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
  container: { flex: 1, backgroundColor: '#F5F3EE' },
  content: { padding: 20, gap: 12, paddingBottom: 32 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  eyebrow: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  actionSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 4 },
  actionSheetTitle: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textAlign: 'center', marginBottom: 8 },
  actionItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  actionItemText: { fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'center' },
  actionCancel: { paddingVertical: 14, marginTop: 4 },
  actionCancelText: { fontSize: 16, fontWeight: '600', color: '#EF4444', textAlign: 'center' },

  // Corpus card
  corpusCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10, elevation: 1 },
  corpusTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  corpusEyebrow: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  corpusValue: { fontSize: 32, fontWeight: '800', color: '#1A1A1A', fontVariant: ['tabular-nums'] },
  corpusSip: { fontSize: 14, fontWeight: '600', color: '#2F8A4B' },
  allocationBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden' },
  allocationSeg: { height: 6 },
  allocLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  allocLabelItem: { alignItems: 'center', gap: 2 },
  allocLabelKey: { fontSize: 11, color: '#6B7280' },
  allocLabelPct: { fontSize: 13, fontWeight: '700' },

  // 3 action buttons
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 2,
    borderWidth: 1, borderColor: '#E5E3DE', alignItems: 'center',
  },
  actionBtnDark: { backgroundColor: '#111827', borderColor: '#111827' },
  actionBtnLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  actionBtnSub: { fontSize: 11, color: '#9CA3AF' },
  actionBtnLabelDark: { fontSize: 13, fontWeight: '700', color: '#fff' },
  actionBtnSubDark: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  // Holdings
  holdingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 },
  holdingsLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.6 },

  // Empty state
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 32, alignItems: 'center', elevation: 1 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySub: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },

  // Investment card
  investmentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 1 },
  invRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#1B4332' },
  invInfo: { flex: 1 },
  invName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  invType: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  invRight: { alignItems: 'flex-end', gap: 3 },
  invValue: { fontSize: 15, fontWeight: '700', color: '#111827', fontVariant: ['tabular-nums'] },
  sipLabel: { fontSize: 11, color: '#2F8A4B', fontWeight: '600' },
  annualLabel: { fontSize: 11, color: '#1D4ED8', fontWeight: '600' },
  idleLabel: { fontSize: 11, color: '#C48A1E', fontWeight: '600' },
});
