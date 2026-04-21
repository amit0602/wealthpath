import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usersApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionGate } from '../../hooks/useSubscriptionGate';
import { exportPdfReport } from '../../utils/generateReport';
import { MainStackParams } from '../../navigation/AppNavigator';
import { Icon } from '../../components/Icon';

export function ProfileScreen() {
  useSubscriptionGate();
  const [user, setUser] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const { logout } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();

  useFocusEffect(
    useCallback(() => {
      usersApi.getMe().then(({ data }) => setUser(data)).catch(console.error);
    }, []),
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportPdfReport();
    } catch {
      Alert.alert('Export Failed', 'Could not generate the report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      'This will schedule your account for deletion within 30 days per DPDP Act 2023. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await usersApi.deleteAccount();
          await logout();
        }},
      ],
    );
  };

  const isPremium = user?.subscription?.plan === 'premium';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {user && (
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.fullName?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user.fullName || 'Complete your profile'}</Text>
              <Text style={styles.phone}>{user.phoneNumber}</Text>
              {isPremium && (
                <View style={styles.premiumBadge}>
                  <Icon name="star" size={12} color="#92400E" />
                  <Text style={styles.premiumBadgeText}> Premium</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Premium upsell card — visually distinct from settings rows */}
        {user && !isPremium && (
          <TouchableOpacity style={styles.upsellCard} onPress={() => navigation.navigate('Subscription')} activeOpacity={0.85}>
            <View style={{ flex: 1 }}>
              <Text style={styles.upsellTitle}>Unlock Premium</Text>
              <Text style={styles.upsellSub}>Advanced tax optimisation, unlimited goals</Text>
            </View>
            <View style={styles.upsellCta}>
              <Text style={styles.upsellCtaText}>Upgrade</Text>
            </View>
          </TouchableOpacity>
        )}

        {user?.financialProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Profile</Text>
            {[
              { label: 'Monthly Income', value: `₹${Number(user.financialProfile.monthlyGrossIncome).toLocaleString('en-IN')}` },
              { label: 'Monthly Expenses', value: `₹${Number(user.financialProfile.monthlyExpenses).toLocaleString('en-IN')}` },
              { label: 'Target Retirement Age', value: String(user.financialProfile.targetRetirementAge) },
              { label: 'Risk Appetite', value: user.financialProfile.riskAppetite?.charAt(0).toUpperCase() + user.financialProfile.riskAppetite?.slice(1) },
            ].map(({ label, value }) => (
              <View key={label} style={styles.row}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Edit Details</Text>
          {[
            { label: 'Personal Info', subtitle: 'Name, DOB, city, employment', onPress: () => navigation.navigate('EditPersonal') },
            { label: 'Income & Expenses', subtitle: 'Monthly income, expenses, EMI', onPress: () => navigation.navigate('EditFinancials') },
            { label: 'Goals & Risk', subtitle: 'Retirement age, income target, risk level', onPress: () => navigation.navigate('EditGoals') },
            { label: 'Insurance Coverage', subtitle: 'Term & health cover — affects health score', onPress: () => navigation.navigate('Insurance') },
            { label: 'Emergency Fund', subtitle: 'Liquid savings — affects health score', onPress: () => navigation.navigate('EmergencyFund') },
            { label: 'Debt & Loans', subtitle: 'EMIs, interest costs, payoff plan', onPress: () => navigation.navigate('DebtPayoff') },
          ].map(({ label, subtitle, onPress }) => (
            <TouchableOpacity key={label} style={styles.settingRow} onPress={onPress}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{label}</Text>
                <Text style={styles.settingSubtitle}>{subtitle}</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reports & Data</Text>

          <TouchableOpacity
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <View style={styles.exportInner}>
                <Text style={styles.exportButtonText}>Generating PDF…</Text>
              </View>
            ) : (
              <View style={styles.exportInner}>
                <Icon name="document" size={22} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.exportButtonText}>Export PDF Report</Text>
                  <Text style={styles.exportButtonSub}>FIRE plan · Portfolio · Tax comparison</Text>
                </View>
                <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('NotificationPreferences')}>
            <View style={styles.settingIconRow}>
              <Icon name="bell" size={18} color="#6B7280" />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Notification Preferences</Text>
                <Text style={styles.settingSubtitle}>Drift alerts, tax reminders, sensitivity</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={() => usersApi.exportData()}>
            <View style={styles.settingIconRow}>
              <Icon name="chart" size={18} color="#6B7280" />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Export Raw Data</Text>
                <Text style={styles.settingSubtitle}>DPDP right to data portability</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={() => {}}>
            <View style={styles.settingIconRow}>
              <Icon name="lock" size={18} color="#6B7280" />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Security Log</Text>
                <Text style={styles.settingSubtitle}>View recent login activity</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          WealthPath provides financial education tools, not investment advice.{'\n'}
          Data protected under DPDP Act 2023.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 1 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1B4332', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  name: { fontSize: 17, fontWeight: '700', color: '#111827' },
  phone: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  premiumBadge: { marginTop: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  premiumBadgeText: { fontSize: 12, color: '#92400E', fontWeight: '600' },

  // Premium upsell card — dark green, visually dominant, ≤96pt tall
  upsellCard: {
    backgroundColor: '#1B4332', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    minHeight: 72, maxHeight: 96,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  upsellTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  upsellSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  upsellCta: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  upsellCtaText: { fontSize: 14, fontWeight: '700', color: '#1B4332' },

  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 4, elevation: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowLabel: { fontSize: 14, color: '#6B7280' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111827' },

  // Setting rows — minHeight 48 for touch target compliance
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, minHeight: 48,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  settingIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  settingLabel: { fontSize: 15, color: '#111827' },
  settingSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },

  exportButton: { backgroundColor: '#1B4332', borderRadius: 12, padding: 14, marginBottom: 4 },
  exportButtonDisabled: { opacity: 0.6 },
  exportInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exportButtonText: { fontSize: 15, fontWeight: '700', color: '#fff', flex: 1 },
  exportButtonSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  logoutButton: { backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 14, alignItems: 'center', minHeight: 48 },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  deleteButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', minHeight: 48 },
  deleteText: { fontSize: 15, color: '#EF4444' },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
});
