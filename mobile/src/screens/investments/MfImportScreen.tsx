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
import { mfImportApi, fireApi, healthScoreApi } from '../../services/api';

type NavProp = NativeStackNavigationProp<MainStackParams>;

type Holding = {
  schemeName: string;
  isin: string;
  units: number;
  currentValue: number;
  costValue: number;
  instrumentType: string;
  expectedReturnRate: number;
  amc: string;
  selected: boolean;
};

const INSTRUMENT_LABELS: Record<string, string> = {
  mutual_fund_equity: 'Equity MF',
  mutual_fund_debt: 'Debt MF',
  elss: 'ELSS',
};

const INSTRUMENT_TYPES = ['mutual_fund_equity', 'mutual_fund_debt', 'elss'];

const formatINR = (v: number) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
};

type Step = 'instructions' | 'reviewing' | 'done';

export function MfImportScreen() {
  const navigation = useNavigation<NavProp>();
  const [step, setStep] = useState<Step>('instructions');
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sessionId, setSessionId] = useState('');
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
        Alert.alert('Invalid File', 'Please select a CSV file exported from CAMS, KFintech, or MFCentral.');
        return;
      }

      setUploading(true);

      // Build FormData — works on web and native
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? 'text/csv',
      } as any);

      const { data } = await mfImportApi.upload(formData);

      const enriched: Holding[] = data.holdings.map((h: any) => ({
        ...h,
        selected: true,
      }));

      setSessionId(data.sessionId);
      setHoldings(enriched);
      setStep('reviewing');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Upload failed.';
      Alert.alert('Upload Failed', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setUploading(false);
    }
  }

  // ── Step 2: Toggle selection / edit type ────────────────────────────────

  function toggleSelected(idx: number) {
    setHoldings((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, selected: !h.selected } : h)),
    );
  }

  function cycleType(idx: number) {
    setHoldings((prev) =>
      prev.map((h, i) => {
        if (i !== idx) return h;
        const next = INSTRUMENT_TYPES[(INSTRUMENT_TYPES.indexOf(h.instrumentType) + 1) % INSTRUMENT_TYPES.length];
        const returnRate = next === 'mutual_fund_debt' ? 0.07 : 0.12;
        return { ...h, instrumentType: next, expectedReturnRate: returnRate };
      }),
    );
  }

  // ── Step 3: Confirm import ───────────────────────────────────────────────

  async function confirmImport() {
    const selected = holdings.filter((h) => h.selected);
    if (selected.length === 0) {
      Alert.alert('Nothing Selected', 'Please select at least one fund to import.');
      return;
    }

    setConfirming(true);
    try {
      const payload = selected.map(({ selected: _s, amc: _a, ...rest }) => rest);
      const { data } = await mfImportApi.confirm(sessionId, payload);
      setImportedCount(data.imported);
      setStep('done');

      // Trigger background recalculations
      fireApi.calculate().catch(() => {});
      healthScoreApi.calculate().catch(() => {});
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not save investments.';
      Alert.alert('Import Failed', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setConfirming(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const selectedCount = holdings.filter((h) => h.selected).length;
  const selectedTotal = holdings
    .filter((h) => h.selected)
    .reduce((s, h) => s + h.currentValue, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Import MF Portfolio</Text>

        {/* ── STEP 1: Instructions ── */}
        {step === 'instructions' && (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>How to get your CAS CSV file</Text>
              <Text style={styles.infoBody}>
                <Text style={styles.bold}>Option A — MFCentral (recommended){'\n'}</Text>
                1. Visit mfcentral.com{'\n'}
                2. Log in with your PAN{'\n'}
                3. Go to Reports → Account Statement → Detailed{'\n'}
                4. Select format: <Text style={styles.bold}>CSV</Text>{'\n'}
                5. Download and upload here{'\n\n'}

                <Text style={styles.bold}>Option B — CAMS{'\n'}</Text>
                1. Visit mycams.com{'\n'}
                2. Services → Statement → Detailed Statement{'\n'}
                3. Choose format: <Text style={styles.bold}>CSV / Excel</Text>{'\n\n'}

                <Text style={styles.bold}>Option C — KFintech{'\n'}</Text>
                1. Visit kfintech.com → Investor{'\n'}
                2. MF Portfolio → Download Statement → CSV
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>What gets imported</Text>
              <Text style={styles.infoBody}>
                • Fund name, units, and current value{'\n'}
                • Fund type auto-detected (Equity / Debt / ELSS){'\n'}
                • Existing funds updated, new ones added{'\n'}
                • Monthly SIP amounts you've set are preserved
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, uploading && styles.buttonDisabled]}
              onPress={pickAndUpload}
              disabled={uploading}
            >
              {uploading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryButtonText}>Select CSV File</Text>
              }
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
                {selectedCount} of {holdings.length} funds selected · {formatINR(selectedTotal)}
              </Text>
            </View>

            <Text style={styles.hint}>
              Tap a fund type badge to change it. Toggle the switch to include/exclude a fund.
            </Text>

            {holdings.map((h, idx) => (
              <View key={idx} style={[styles.holdingCard, !h.selected && styles.holdingCardDimmed]}>
                <View style={styles.holdingTop}>
                  <View style={styles.holdingNameWrap}>
                    <Text style={styles.holdingName} numberOfLines={2}>{h.schemeName}</Text>
                    {h.amc ? <Text style={styles.holdingAmc}>{h.amc}</Text> : null}
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
                    <Text style={styles.statLabel}>Current Value</Text>
                    <Text style={styles.statValue}>{formatINR(h.currentValue)}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Units</Text>
                    <Text style={styles.statValue}>{h.units.toFixed(3)}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Cost</Text>
                    <Text style={styles.statValue}>{formatINR(h.costValue)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.typeBadge,
                    h.instrumentType === 'mutual_fund_debt' && styles.typeBadgeDebt,
                    h.instrumentType === 'elss' && styles.typeBadgeElss,
                  ]}
                  onPress={() => cycleType(idx)}
                  onLongPress={() => cycleType(idx)}
                >
                  <Text style={styles.typeBadgeText}>
                    {INSTRUMENT_LABELS[h.instrumentType] ?? h.instrumentType}  (tap to change)
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.primaryButton, (confirming || selectedCount === 0) && styles.buttonDisabled]}
              onPress={confirmImport}
              disabled={confirming || selectedCount === 0}
            >
              {confirming
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryButtonText}>
                    Import {selectedCount} Fund{selectedCount !== 1 ? 's' : ''} →
                  </Text>
              }
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
            <Text style={styles.doneTitle}>{importedCount} Fund{importedCount !== 1 ? 's' : ''} Imported</Text>
            <Text style={styles.doneBody}>
              Your portfolio has been updated. FIRE projections and health score
              are recalculating in the background.
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
    backgroundColor: '#F0FDF4', borderRadius: 12,
    borderWidth: 1, borderColor: '#BBF7D0', padding: 16, gap: 6,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#1B4332' },
  infoBody: { fontSize: 13, color: '#374151', lineHeight: 20 },
  bold: { fontWeight: '700' },

  primaryButton: {
    backgroundColor: '#1B4332', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },

  summaryBar: {
    backgroundColor: '#1B4332', borderRadius: 10, padding: 12, alignItems: 'center',
  },
  summaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  hint: { fontSize: 12, color: '#6B7280', textAlign: 'center' },

  holdingCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    gap: 10, elevation: 1,
  },
  holdingCardDimmed: { opacity: 0.45 },
  holdingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  holdingNameWrap: { flex: 1, marginRight: 10 },
  holdingName: { fontSize: 14, fontWeight: '600', color: '#111827', lineHeight: 20 },
  holdingAmc: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  holdingStats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1 },
  statLabel: { fontSize: 11, color: '#9CA3AF' },
  statValue: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 2 },

  typeBadge: {
    alignSelf: 'flex-start', backgroundColor: '#D1FAE5',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
  },
  typeBadgeDebt: { backgroundColor: '#DBEAFE' },
  typeBadgeElss: { backgroundColor: '#EDE9FE' },
  typeBadgeText: { fontSize: 11, fontWeight: '600', color: '#374151' },

  doneCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 28,
    alignItems: 'center', gap: 12, elevation: 1,
  },
  doneIcon: { fontSize: 48, color: '#10B981' },
  doneTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  doneBody: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});
