import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParams } from '../../navigation/AppNavigator';
import { notificationsApi } from '../../services/api';

type NotificationLog = {
  id: string;
  type: string;
  title: string;
  body: string;
  status: string;
  sentAt: string;
};

type Preferences = {
  driftAlertsEnabled: boolean;
  taxRemindersEnabled: boolean;
  driftThresholdPercent: number;
};

const THRESHOLD_OPTIONS = [3, 5, 10, 15, 20];

export function NotificationPreferencesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  async function loadData() {
    setLoading(true);
    const [prefsRes, logsRes] = await Promise.allSettled([
      notificationsApi.getPreferences(),
      notificationsApi.getLogs(),
    ]);
    if (prefsRes.status === 'fulfilled') setPrefs(prefsRes.value.data);
    if (logsRes.status === 'fulfilled') setLogs(logsRes.value.data);
    setLoading(false);
  }

  async function toggleDriftAlerts(value: boolean) {
    if (!prefs) return;
    const updated = { ...prefs, driftAlertsEnabled: value };
    setPrefs(updated);
    await save({ driftAlertsEnabled: value });
  }

  async function toggleTaxReminders(value: boolean) {
    if (!prefs) return;
    const updated = { ...prefs, taxRemindersEnabled: value };
    setPrefs(updated);
    await save({ taxRemindersEnabled: value });
  }

  async function setThreshold(value: number) {
    if (!prefs) return;
    const updated = { ...prefs, driftThresholdPercent: value };
    setPrefs(updated);
    await save({ driftThresholdPercent: value });
  }

  async function save(partial: Partial<Preferences>) {
    setSaving(true);
    try {
      await notificationsApi.updatePreferences(partial);
    } catch {
      Alert.alert('Error', 'Failed to save notification preferences.');
      await loadData(); // revert to server state
    } finally {
      setSaving(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function logTypeLabel(type: string) {
    if (type === 'drift_alert') return 'Portfolio Drift';
    if (type === 'tax_reminder') return '80C Reminder';
    return type;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1B4332" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>
          {saving && <ActivityIndicator size="small" color="#1B4332" />}
        </View>
        <Text style={styles.title}>Notification Preferences</Text>
        <Text style={styles.subtitle}>
          Control which alerts you receive and how sensitive they are.
        </Text>

        {/* Toggles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Types</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Portfolio Drift Alerts</Text>
              <Text style={styles.toggleSubtitle}>
                Daily check — notified when allocation drifts from your target
              </Text>
            </View>
            <Switch
              value={prefs?.driftAlertsEnabled ?? true}
              onValueChange={toggleDriftAlerts}
              trackColor={{ true: '#1B4332', false: '#D1D5DB' }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Tax Saving Reminders</Text>
              <Text style={styles.toggleSubtitle}>
                Weekly nudge to utilise your 80C limit before year-end
              </Text>
            </View>
            <Switch
              value={prefs?.taxRemindersEnabled ?? true}
              onValueChange={toggleTaxReminders}
              trackColor={{ true: '#1B4332', false: '#D1D5DB' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Drift threshold */}
        {prefs?.driftAlertsEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Drift Sensitivity</Text>
            <Text style={styles.sectionSubtitle}>
              Alert me when equity allocation drifts by more than:
            </Text>
            <View style={styles.chipRow}>
              {THRESHOLD_OPTIONS.map((pct) => {
                const active = prefs.driftThresholdPercent === pct;
                return (
                  <TouchableOpacity
                    key={pct}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setThreshold(pct)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {pct}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* How it works */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How drift alerts work</Text>
          <Text style={styles.infoBody}>
            Every morning at 9 AM we compare your actual equity allocation against
            your target based on your risk appetite (conservative 20%, moderate 60%,
            aggressive 80%). If the gap exceeds your threshold, you get a push
            notification.{'\n\n'}
            Tax reminders are sent every Monday and check how much of your ₹1.5L 80C
            limit is still unutilised for FY 2025-26.
          </Text>
          <Text style={styles.disclaimer}>
            For educational purposes only. Not investment advice.
          </Text>
        </View>

        {/* Notification history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Notifications</Text>
          {logs.length === 0 ? (
            <Text style={styles.emptyText}>No notifications sent yet.</Text>
          ) : (
            logs.slice(0, 10).map((log) => (
              <View key={log.id} style={styles.logRow}>
                <View style={styles.logLeft}>
                  <Text style={styles.logType}>{logTypeLabel(log.type)}</Text>
                  <Text style={styles.logBody} numberOfLines={2}>
                    {log.body}
                  </Text>
                  <Text style={styles.logDate}>{formatDate(log.sentAt)}</Text>
                </View>
                <View
                  style={[
                    styles.logStatus,
                    log.status === 'sent' ? styles.logSent : styles.logFailed,
                  ]}
                >
                  <Text style={styles.logStatusText}>
                    {log.status === 'sent' ? 'Sent' : 'Failed'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { fontSize: 17, color: '#1B4332', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20 },

  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 0, elevation: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  sectionSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 10 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, color: '#111827', fontWeight: '500' },
  toggleSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: { borderColor: '#1B4332', backgroundColor: '#1B4332' },
  chipText: { fontSize: 14, color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  infoBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 16,
    gap: 8,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#1B4332' },
  infoBody: { fontSize: 13, color: '#374151', lineHeight: 20 },
  disclaimer: { fontSize: 11, color: '#6B7280', fontStyle: 'italic' },

  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 12 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logLeft: { flex: 1, marginRight: 8 },
  logType: { fontSize: 13, fontWeight: '700', color: '#1B4332' },
  logBody: { fontSize: 13, color: '#374151', marginTop: 2, lineHeight: 18 },
  logDate: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  logStatus: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  logSent: { backgroundColor: '#D1FAE5' },
  logFailed: { backgroundColor: '#FEE2E2' },
  logStatusText: { fontSize: 11, fontWeight: '600', color: '#374151' },
});
