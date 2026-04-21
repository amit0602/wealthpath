import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParams } from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<OnboardingStackParams, 'Welcome'>;

const FEATURES = [
  { tag: 'FIRE', desc: 'Calculate your number' },
  { tag: 'TAX', desc: 'Old vs New regime' },
  { tag: 'PORTFOLIO', desc: 'Corpus & allocation' },
  { tag: 'SCORE', desc: 'Financial Health' },
];

export function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={styles.brand}>WealthPath</Text>
          <Text style={styles.headline}>
            Build the road to{'\n'}financial{'\n'}independence.
          </Text>
          <Text style={styles.sub}>
            Plan your FIRE number, optimise your tax regime and track every rupee of your corpus — in one place.
          </Text>
        </View>

        <View style={styles.featureGrid}>
          {FEATURES.map((f) => (
            <View key={f.tag} style={styles.featurePill}>
              <Text style={styles.featureTag}>{f.tag}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('PhoneEntry')}>
            <Text style={styles.primaryButtonText}>Get started</Text>
          </TouchableOpacity>
          <Text style={styles.disclaimer}>
            Educational tool, not investment advice. Terms · Privacy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, justifyContent: 'space-between' },
  top: { gap: 12, marginTop: 16 },
  brand: { fontSize: 15, fontWeight: '700', color: '#1B4332', letterSpacing: 0.3 },
  headline: { fontSize: 38, fontWeight: '800', color: '#1A1A1A', lineHeight: 46, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: '#6B7280', lineHeight: 22 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featurePill: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  featureTag: { fontSize: 11, fontWeight: '800', color: '#1B4332', letterSpacing: 0.8 },
  featureDesc: { fontSize: 13, color: '#6B7280' },
  actions: { gap: 14 },
  primaryButton: { backgroundColor: '#1B4332', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
});
