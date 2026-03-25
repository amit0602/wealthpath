import React, { useState } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParams } from '../../navigation/AppNavigator';
import { dematSyncApi, fireApi, healthScoreApi } from '../../services/api';

type NavProp = NativeStackNavigationProp<MainStackParams>;

type Holding = {
  companyName: string;
  isin: string;
  quantity: number;
  currentValue: number;
  costValue: number;
  instrumentType: string;
  expectedReturnRate: number;
  depository: string;
  selected: boolean;
};

const INSTRUMENT_LABELS: Record<string, string> = {
  direct_equity: 'Stocks',
  sgb: 'SGB',
  gold: 'Gold ETF',
  mutual_fund_equity: 'Equity ETF',
  other: 'Bond/NCD',
};

const INSTRUMENT_TYPES = ['direct_equity', 'sgb', 'gold', 'mutual_fund_equity', 'other'];

const BADGE_COLORS: Record<string, string> = {
  direct_equity: '#D1FAE5',
  sgb: '#FEF3C7',
  gold: '#FEF9C3',
  mutual_fund_equity: '#DBEAFE',
  other: '#F3F4F6',
};

const formatINR = (v: number) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
};

type Step = 'instructions' | 'reviewing' | 'done';

export function DematSyncScreen() {
  const navigation = useNavigation<NavProp>();
  const [step, setStep] = useState<Step>('instructions');
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [depository, setDepository] = useState('');
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [importedCount, setImportedCount] = useState(0);

  // ── Step 1: Pick & upload file ──────────────────────────────────────────

  async function pickAndUpload() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file.name.match(/\.(csv|txt)$/i)) {
        Alert.alert(
          'Invalid File',
          'Please select a CSV file exported from CDSL or NSDL.',
        );
        return;
      }

      setUploading(true);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? 'text/csv',
      } as any);

      const { data } = await dematSyncApi.upload(formData);

      const enriched: Holding[] = data.holdings.map((h: any) => ({
        ...h,
        selected: true,
      }));

      setSessionId(data.sessionId);
      setDepository(data.depository ?? '');
      setHoldings(enriched);
      setStep('reviewing');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? err?.message ?? 'Upload failed.';
      Alert.alert('Upload Failed', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setUploading(false);
    }
  }

  // ── Step 2: Toggle / edit type ───────────────────────────────────────────

  function toggleSelected(idx: number) {
    setHoldings((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, selected: !h.selected } : h)),
    );
  }

  function cycleType(idx: number) {
    setHoldings((prev) =>
      prev.map((h, i) => {
        if (i !== idx) return h;
        const next =
          INSTRUMENT_TYPES[
            (INSTRUMENT_TYPES.indexOf(h.instrumentType) + 1) %
              INSTRUMENT_TYPES.length
          ];
        const rate =
          next === 'other' ? 0.07 : next === 'sgb' || next === 'gold' ? 0.08 : 0.12;
        return { ...h, instrumentType: next, expectedReturnRate: rate };
      }),
    );
  }

  // ── Step 3: Confirm ──────────────────────────────────────────────────────

  async function confirmSync() {
    const selected = holdings.filter((h) => h.selected);
    if (selected.length === 0) {
      Alert.alert('Nothing Selected', 'Please select at least one holding to sync.');
      return;
    }

    setConfirming(true);
    try {
      const payload = selected.map(({ selected: _s, ...rest }) => rest);
      const { data } = await dematSyncApi.confirm(sessionId, payload);
      setImportedCount(data.imported);
      setStep('done');

      fireApi.calculate().catch(() => {});
      healthScoreApi.calculate().catch(() => {});
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? 'Could not save holdings.';
      Alert.alert('Sync Failed', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setConfirming(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const selectedCount = holdings.filter((h) => h.selected).length;
  const selectedTotal = holdings
    .filter((h) => h.selected)
    .reduce((s, h) => s + h.currentValue, 0);

  const depositoryLabel =
    depository === 'cdsl' ? 'CDSL' : depository === 'nsdl' ? 'NSDL' : 'Demat';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Sync Demat Holdings</Text>

        {/* ── STEP 1: Instructions ── */}
        {step === 'instructions' && (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>How to get your Demat CAS CSV</Text>
              <Text style={styles.infoBody}>
                <Text style={styles.bold}>Option A — CDSL (recommended){'\n'}</Text>
                1. Visit cdslindia.com{'\n'}
                2. Log in → My Account → Account Statement{'\n'}
                3. Choose "Detailed" and format: <Text style={styles.bold}>CSV</Text>{'\n'}
                4. Download and upload here{'\n\n'}

                <Text style={styles.bold}>Option B — NSDL{'\n'}</Text>
                1. Visit nsdlindia.org → IDeAS Portal{'\n'}
                2. Account → Statement of Transactions{'\n'}
                3. Download as <Text style={styles.bold}>CSV</Text>
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>What gets synced</Text>
              <Text style={styles.infoBody}>
                • Stocks, ETFs, SGBs, and bonds held in demat{'\n'}
                • Holding type auto-detected (Stocks / ETF / SGB / Gold / Bond){'\n'}
                • Existing holdings updated by ISIN, new ones added{'\n'}
                • Monthly SIP amounts you've set are preserved
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, uploading && styles.buttonDisabled]}
              onPress={pickAndUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Select CSV File</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Your file is processed on our server and never stored permanently.
              For educational purposes only. Not investment advice.
            </Text>
          </>
        )}

        {/* ── STEP 2: Review holdings ── */}
        {step === 'reviewing' && (
          <>
            <View style={styles.summaryBar}>
              <Text style={styles.summaryText}>
                {depositoryLabel} · {selectedCount} of {holdings.length} holdings
                selected · {formatINR(selectedTotal)}
              </Text>
            </View>

            <Text style={styles.hint}>
              Tap the type badge to change it. Toggle the switch to include/exclude a holding.
            </Text>

            {holdings.map((h, idx) => (
              <View
                key={idx}
                style={[styles.holdingCard, !h.selected && styles.holdingCardDimmed]}
              >
                <View style={styles.holdingTop}>
                  <View style={styles.holdingNameWrap}>
                    <Text style={styles.holdingName} numberOfLines={2}>
                      {h.companyName}
                    </Text>
                    <Text style={styles.holdingIsin}>{h.isin}</Text>
                  </View>
                  <Switch
                    value={h.selected}
                    onValueChange={() => toggleSelected(idx)}
                    trackColor={{ true: '#1B4332', false: '#D1D5DB' }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.holdingStats}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Market Value</Text>
                    <Text style={styles.statValue}>{formatINR(h.currentValue)}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Qty</Text>
                    <Text style={styles.statValue}>{h.quantity.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Cost</Text>
                    <Text style={styles.statValue}>{formatINR(h.costValue)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.typeBadge,
                    { backgroundColor: BADGE_COLORS[h.instrumentType] ?? '#F3F4F6' },
                  ]}
                  onPress={() => cycleType(idx)}
                >
                  <Text style={styles.typeBadgeText}>
                    {INSTRUMENT_LABELS[h.instrumentType] ?? h.instrumentType}
                    {'  '}(tap to change)
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (confirming || selectedCount === 0) && styles.buttonDisabled,
              ]}
              onPress={confirmSync}
              disabled={confirming || selectedCount === 0}
            >
              {confirming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Sync {selectedCount} Holding{selectedCount !== 1 ? 's' : ''} →
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              For educational purposes only. Not investment advice.
            </Text>
          </>
        )}

        {/* ── STEP 3: Done ── */}
        {step === 'done' && (
          <View style={styles.doneCard}>
            <Text style={styles.doneIcon}>✓</Text>
            <Text style={styles.doneTitle}>
              {importedCount} Holding{importedCount !== 1 ? 's' : ''} Synced
            </Text>
            <Text style={styles.doneBody}>
              Your demat portfolio has been updated. FIRE projections and health
              score are recalculating in the background.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.primaryButtonText}>View Portfolio</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, gap: 14, paddingBottom: 48 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  back: { fontSize: 17, color: '#1B4332', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },

  infoBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 16,
    gap: 6,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#1B4332' },
  infoBody: { fontSize: 13, color: '#374151', lineHeight: 20 },
  bold: { fontWeight: '700' },

  primaryButton: {
    backgroundColor: '#1B4332',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },

  summaryBar: {
    backgroundColor: '#1B4332',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  summaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  hint: { fontSize: 12, color: '#6B7280', textAlign: 'center' },

  holdingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    elevation: 1,
  },
  holdingCardDimmed: { opacity: 0.45 },
  holdingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  holdingNameWrap: { flex: 1, marginRight: 10 },
  holdingName: { fontSize: 14, fontWeight: '600', color: '#111827', lineHeight: 20 },
  holdingIsin: { fontSize: 11, color: '#9CA3AF', marginTop: 2, fontFamily: 'monospace' },

  holdingStats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1 },
  statLabel: { fontSize: 11, color: '#9CA3AF' },
  statValue: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 2 },

  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '600', color: '#374151' },

  doneCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    elevation: 1,
  },
  doneIcon: { fontSize: 48, color: '#10B981' },
  doneTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  doneBody: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});
