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
      usersApi.getMe().then(({ data }) => setUser(data)).catch(() => {});
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
  const city = user?.financialProfile?.city ?? user?.city ?? '';

  const NAV_ROWS = [
    { icon: 'shield' as const, label: 'Personal info', sub: 'Name, DOB, city', onPress: () => navigation.navigate('EditPersonal') },
    { icon: 'chart' as const, label: 'Income & expenses', sub: 'Monthly income, EMI', onPress: () => navigation.navigate('EditFinancials') },
    { icon: 'target' as const, label: 'Goals & risk', sub: 'Retirement, risk level', onPress: () => navigation.navigate('EditGoals') },
    { icon: 'bell' as const, label: 'Notifications', sub: 'Alerts & reminders', onPress: () => navigation.navigate('NotificationPreferences') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Account</Text>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Profile card */}
        {user && (
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.fullName?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user.fullName || 'Complete your profile'}</Text>
              <Text style={styles.phone}>
                {user.phoneNumber}{city ? ` · ${city}` : ''}
              </Text>
              {isPremium && (
                <View style={styles.premiumBadge}>
                  <Icon name="star" size={12} color="#92400E" />
                  <Text style={styles.premiumBadgeText}> Premium</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Premium upsell card */}
        {user && !isPremium && (
          <TouchableOpacity style={styles.upsellCard} onPress={() => navigation.navigate('Subscription')} activeOpacity={0.85}>
            <View style={styles.upsellStarBox}>
              <Icon name="star" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.upsellTitle}>Upgrade to Premium</Text>
              <Text style={styles.upsellSub}>Unlimited what-ifs, CSV export, tax regimes</Text>
            </View>
            <View style={styles.upsellCta}>
              <Text style={styles.upsellCtaText}>Try free</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Nav rows */}
        <View style={styles.section}>
          {NAV_ROWS.map(({ icon, label, sub, onPress }) => (
            <TouchableOpacity key={label} style={styles.settingRow} onPress={onPress}>
              <View style={styles.settingIconRow}>
                <View style={styles.iconBox}>
                  <Icon name={icon} size={16} color="#1B4332" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>{label}</Text>
                  <Text style={styles.settingSubtitle}>{sub}</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={18} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Export PDF */}
        <TouchableOpacity
          style={[styles.exportRow, exporting && { opacity: 0.6 }]}
          onPress={handleExport}
          disabled={exporting}
        >
          <View style={styles.settingIconRow}>
            <View style={styles.iconBox}>
              <Icon name="document" size={16} color="#1B4332" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{exporting ? 'Generating PDF…' : 'Export PDF report'}</Text>
              <Text style={styles.settingSubtitle}>FIRE · Portfolio · Tax</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={18} color="#D1D5DB" />
        </TouchableOpacity>

        {/* Log out */}
        <TouchableOpacity onPress={() => logout()} style={styles.logoutRow}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3EE' },
  content: { padding: 20, gap: 12, paddingBottom: 40 },

  header: { gap: 2 },
  eyebrow: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A' },

  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1B4332', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  name: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  phone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  premiumBadge: { marginTop: 4, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  premiumBadgeText: { fontSize: 11, color: '#92400E', fontWeight: '600' },

  // Near-black upsell card with terracotta star + "Try free" pill
  upsellCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  upsellStarBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#C65D3E', alignItems: 'center', justifyContent: 'center' },
  upsellTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  upsellSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2, lineHeight: 15 },
  upsellCta: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  upsellCtaText: { fontSize: 13, fontWeight: '700', color: '#111827' },

  section: { backgroundColor: '#fff', borderRadius: 14, elevation: 1, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14, minHeight: 56,
    borderBottomWidth: 1, borderBottomColor: '#F5F3EE',
  },
  settingIconRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  settingSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },

  exportRow: {
    backgroundColor: '#fff', borderRadius: 14, elevation: 1,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14, minHeight: 56,
  },

  logoutRow: { alignItems: 'center', paddingVertical: 12 },
  logoutText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  deleteText: { fontSize: 13, color: '#EF4444', textAlign: 'center' },
});
