import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usersApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { MainStackParams } from '../../navigation/AppNavigator';

export function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const { logout } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();

  useFocusEffect(
    useCallback(() => {
      usersApi.getMe().then(({ data }) => setUser(data)).catch(console.error);
    }, []),
  );

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

  const SCORE_COMPONENTS = [
    { key: 'emergencyFund', label: 'Emergency Fund', weight: '20%' },
    { key: 'insurance', label: 'Insurance Coverage', weight: '20%' },
    { key: 'debtRatio', label: 'Debt-to-Income', weight: '15%' },
    { key: 'savingsRate', label: 'Savings Rate', weight: '25%' },
    { key: 'retirementTrack', label: 'Retirement Track', weight: '20%' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {user && (
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.fullName?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View>
              <Text style={styles.name}>{user.fullName || 'Complete your profile'}</Text>
              <Text style={styles.phone}>{user.phoneNumber}</Text>
              <View style={[styles.planBadge, user.subscription?.plan === 'premium' && styles.planBadgePremium]}>
                <Text style={styles.planText}>{user.subscription?.plan === 'premium' ? '⭐ Premium' : 'Free Plan'}</Text>
              </View>
            </View>
          </View>
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
          ].map(({ label, subtitle, onPress }) => (
            <TouchableOpacity key={label} style={styles.settingRow} onPress={onPress}>
              <View>
                <Text style={styles.settingLabel}>{label}</Text>
                <Text style={styles.settingSubtitle}>{subtitle}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {[
            { label: '📊 Export My Data', subtitle: 'DPDP right to data portability', action: () => usersApi.exportData() },
            { label: '🔒 Security Log', subtitle: 'View recent login activity', action: () => {} },
          ].map(({ label, subtitle, action }) => (
            <TouchableOpacity key={label} style={styles.settingRow} onPress={action}>
              <View>
                <Text style={styles.settingLabel}>{label}</Text>
                <Text style={styles.settingSubtitle}>{subtitle}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
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
  planBadge: { marginTop: 6, backgroundColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  planBadgePremium: { backgroundColor: '#FEF3C7' },
  planText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10, elevation: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowLabel: { fontSize: 14, color: '#6B7280' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  settingLabel: { fontSize: 15, color: '#111827' },
  settingSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  chevron: { fontSize: 20, color: '#9CA3AF' },
  logoutButton: { backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  deleteButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  deleteText: { fontSize: 15, color: '#EF4444' },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
});
