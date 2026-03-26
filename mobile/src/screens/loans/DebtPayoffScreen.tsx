import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { loansApi } from '../../services/api';
import { MainStackParams } from '../../navigation/AppNavigator';

const formatINR = (val: number) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const LOAN_TYPE_LABELS: Record<string, string> = {
  home: '🏠 Home Loan',
  car: '🚗 Car Loan',
  personal: '💳 Personal Loan',
  education: '🎓 Education Loan',
  other: '📋 Other Loan',
};

export function DebtPayoffScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();
  const [loans, setLoans] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await loansApi.list();
      setLoans(data.loans);
      setSummary(data.summary);
    } catch {
      Alert.alert('Error', 'Could not load loans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleDelete = (loan: any) => {
    Alert.alert(
      'Remove Loan',
      `Remove "${loan.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive', onPress: async () => {
            try {
              await loansApi.delete(loan.id);
              setLoans((l) => l.filter((x) => x.id !== loan.id));
              const { data } = await loansApi.list();
              setSummary(data.summary);
            } catch {
              Alert.alert('Error', 'Could not remove loan. Please try again.');
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
            <Text style={styles.title}>Debt Payoff</Text>
            <Text style={styles.subtitle}>Avalanche method — highest rate first</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('EditLoan', {})}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Summary card */}
        {summary && summary.loanCount > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Owed</Text>
                <Text style={styles.summaryValue}>{formatINR(summary.totalOutstanding)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Monthly EMI</Text>
                <Text style={styles.summaryValue}>{formatINR(summary.totalMonthlyEmi)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Interest</Text>
                <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                  {formatINR(summary.totalInterestPayable)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Avalanche recommendation */}
        {loans.length > 0 && (
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💡 Avalanche Method</Text>
            <Text style={styles.tipText}>
              Pay the minimum EMI on all loans, then put every extra rupee towards{' '}
              <Text style={{ fontWeight: '700' }}>{loans[0].name}</Text> ({loans[0].interestRate}% p.a.) first.
              This saves the most interest overall.
            </Text>
          </View>
        )}

        {/* Loan cards — sorted by interest rate desc */}
        {loans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>Debt-free!</Text>
            <Text style={styles.emptySubtitle}>
              No loans tracked. Add a loan to see your payoff plan and total interest cost.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('EditLoan', {})}
            >
              <Text style={styles.emptyButtonText}>Add a Loan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          loans.map((loan, idx) => {
            const isFirst = idx === 0;
            const yearsLeft = Math.floor(loan.remainingTenureMonths / 12);
            const monthsLeft = loan.remainingTenureMonths % 12;
            const tenureLabel = yearsLeft > 0
              ? `${yearsLeft}y ${monthsLeft > 0 ? `${monthsLeft}m` : ''} left`
              : `${monthsLeft}m left`;

            return (
              <View key={loan.id} style={[styles.loanCard, isFirst && styles.loanCardFirst]}>
                {isFirst && (
                  <View style={styles.payFirstBadge}>
                    <Text style={styles.payFirstText}>⚡ Pay This First</Text>
                  </View>
                )}

                <View style={styles.loanHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.loanName}>{loan.name}</Text>
                    <Text style={styles.loanType}>{LOAN_TYPE_LABELS[loan.loanType] ?? loan.loanType}</Text>
                  </View>
                  <View style={styles.loanActions}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('EditLoan', { loanId: loan.id })}
                      style={styles.actionBtn}
                    >
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(loan)} style={styles.actionBtn}>
                      <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.loanMetrics}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Outstanding</Text>
                    <Text style={styles.metricValue}>{formatINR(loan.outstandingBalance)}</Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Rate</Text>
                    <Text style={[styles.metricValue, { color: isFirst ? '#EF4444' : '#111827' }]}>
                      {loan.interestRate}%
                    </Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>EMI / mo</Text>
                    <Text style={styles.metricValue}>{formatINR(loan.emiAmount)}</Text>
                  </View>
                </View>

                <View style={styles.loanFooter}>
                  <Text style={styles.footerText}>{tenureLabel} · Payoff {loan.payoffDate}</Text>
                  <Text style={[styles.footerInterest, { color: '#EF4444' }]}>
                    Interest cost: {formatINR(loan.totalInterestPayable)}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.disclaimer}>
          For educational purposes only. Actual interest may vary. Not financial advice.
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
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  addButton: { backgroundColor: '#1B4332', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  summaryCard: { backgroundColor: '#1B4332', borderRadius: 16, padding: 16 },
  summaryRow: { flexDirection: 'row' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  summaryLabel: { fontSize: 10, color: '#A7F3D0', fontWeight: '600', textTransform: 'uppercase' },
  summaryValue: { fontSize: 16, fontWeight: '800', color: '#fff' },
  tipCard: { backgroundColor: '#FEF9C3', borderRadius: 12, padding: 14, gap: 6 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  tipText: { fontSize: 13, color: '#78350F', lineHeight: 20 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', gap: 10, elevation: 1 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  emptyButton: { backgroundColor: '#1B4332', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  loanCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10, elevation: 1 },
  loanCardFirst: { borderWidth: 2, borderColor: '#1B4332' },
  payFirstBadge: { backgroundColor: '#1B4332', borderRadius: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4 },
  payFirstText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  loanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  loanName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  loanType: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  loanActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { paddingVertical: 2 },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#1B4332' },
  loanMetrics: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12 },
  metricItem: { flex: 1, alignItems: 'center', gap: 3 },
  metricDivider: { width: 1, backgroundColor: '#E5E7EB' },
  metricLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  metricValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  loanFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 12, color: '#6B7280' },
  footerInterest: { fontSize: 12, fontWeight: '700' },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
});
