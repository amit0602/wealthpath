import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { insuranceApi, healthScoreApi } from '../../services/api';

const formatLakh = (val: number) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

export function InsuranceScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [hasTermInsurance, setHasTerm] = useState(false);
  const [termCoverAmount, setTermCover] = useState('');
  const [annualTermPremium, setTermPremium] = useState('');

  const [hasHealthInsurance, setHasHealth] = useState(false);
  const [healthCoverAmount, setHealthCover] = useState('');
  const [annualHealthPremium, setHealthPremium] = useState('');

  useEffect(() => {
    insuranceApi.get()
      .then(({ data }) => {
        setHasTerm(data.hasTermInsurance ?? false);
        setTermCover(data.termCoverAmount ? String(data.termCoverAmount) : '');
        setTermPremium(data.annualTermPremium ? String(data.annualTermPremium) : '');
        setHasHealth(data.hasHealthInsurance ?? false);
        setHealthCover(data.healthCoverAmount ? String(data.healthCoverAmount) : '');
        setHealthPremium(data.annualHealthPremium ? String(data.annualHealthPremium) : '');
      })
      .catch(() => Alert.alert('Error', 'Could not load insurance details.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await insuranceApi.upsert({
        hasTermInsurance,
        termCoverAmount: hasTermInsurance ? Number(termCoverAmount) || 0 : 0,
        annualTermPremium: hasTermInsurance ? Number(annualTermPremium) || 0 : 0,
        hasHealthInsurance,
        healthCoverAmount: hasHealthInsurance ? Number(healthCoverAmount) || 0 : 0,
        annualHealthPremium: hasHealthInsurance ? Number(annualHealthPremium) || 0 : 0,
      });
      // Recalculate health score in background
      healthScoreApi.calculate().catch(() => {});
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save insurance details. Please try again.');
    } finally {
      setSaving(false);
    }
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Insurance Coverage</Text>
        <Text style={styles.subtitle}>
          Insurance is 20% of your financial health score. Add your details to get an accurate score.
        </Text>

        {/* Term Insurance */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Text style={styles.cardTitle}>Term Life Insurance</Text>
              <Text style={styles.cardSubtitle}>Pure protection — pays lump sum on death</Text>
            </View>
            <Switch
              value={hasTermInsurance}
              onValueChange={setHasTerm}
              trackColor={{ true: '#1B4332', false: '#D1D5DB' }}
              thumbColor="#fff"
            />
          </View>

          {hasTermInsurance && (
            <>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Sum Assured (₹)</Text>
                <Text style={styles.hint}>Recommended: 10× annual income</Text>
              </View>
              <TextInput
                style={styles.input}
                value={termCoverAmount}
                onChangeText={setTermCover}
                keyboardType="numeric"
                placeholder="e.g. 10000000"
                placeholderTextColor="#9CA3AF"
              />
              {termCoverAmount ? (
                <Text style={styles.preview}>{formatLakh(Number(termCoverAmount))}</Text>
              ) : null}

              <Text style={[styles.label, { marginTop: 12 }]}>Annual Premium (₹)</Text>
              <TextInput
                style={styles.input}
                value={annualTermPremium}
                onChangeText={setTermPremium}
                keyboardType="numeric"
                placeholder="e.g. 15000"
                placeholderTextColor="#9CA3AF"
              />
            </>
          )}
        </View>

        {/* Health Insurance */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Text style={styles.cardTitle}>Health Insurance</Text>
              <Text style={styles.cardSubtitle}>Covers hospitalisation costs</Text>
            </View>
            <Switch
              value={hasHealthInsurance}
              onValueChange={setHasHealth}
              trackColor={{ true: '#1B4332', false: '#D1D5DB' }}
              thumbColor="#fff"
            />
          </View>

          {hasHealthInsurance && (
            <>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Sum Insured (₹)</Text>
                <Text style={styles.hint}>Recommended: ₹5L minimum</Text>
              </View>
              <TextInput
                style={styles.input}
                value={healthCoverAmount}
                onChangeText={setHealthCover}
                keyboardType="numeric"
                placeholder="e.g. 500000"
                placeholderTextColor="#9CA3AF"
              />
              {healthCoverAmount ? (
                <Text style={styles.preview}>{formatLakh(Number(healthCoverAmount))}</Text>
              ) : null}

              <Text style={[styles.label, { marginTop: 12 }]}>Annual Premium (₹)</Text>
              <TextInput
                style={styles.input}
                value={annualHealthPremium}
                onChangeText={setHealthPremium}
                keyboardType="numeric"
                placeholder="e.g. 12000"
                placeholderTextColor="#9CA3AF"
              />
            </>
          )}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            This information is used only to calculate your financial health score. It is stored securely and never shared.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveButtonText}>Save Insurance Details</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, gap: 14, paddingBottom: 48 },
  back: { fontSize: 17, color: '#1B4332', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10, elevation: 1 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  hint: { fontSize: 11, color: '#9CA3AF' },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#111827',
  },
  preview: { fontSize: 13, color: '#1B4332', fontWeight: '600' },
  infoBox: {
    backgroundColor: '#F0FDF4', borderRadius: 10,
    borderWidth: 1, borderColor: '#BBF7D0', padding: 12,
  },
  infoText: { fontSize: 12, color: '#065F46', lineHeight: 18 },
  saveButton: {
    backgroundColor: '#1B4332', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
