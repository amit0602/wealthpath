import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParams } from '../../navigation/AppNavigator';
import { Icon } from '../../components/Icon';

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
          {/* Brand lockup */}
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Icon name="trending-up" size={16} color="#fff" />
            </View>
            <Text style={styles.brand}>WealthPath</Text>
          </View>

          {/* Editorial headline */}
          <Text style={styles.headlineBlack}>
            {'Build the road to\n'}
            <Text style={styles.headlineAccent}>{'financial\nindependence.'}</Text>
          </Text>

          <Text style={styles.sub}>
            Plan your FIRE number, optimise your tax regime and track every rupee of your corpus — in one place.
          </Text>
        </View>

        {/* Feature rows */}
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.tag} style={styles.featureRow}>
              <View style={styles.featureBadge}>
                <Text style={styles.featureTag}>{f.tag}</Text>
              </View>
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
  container: { flex: 1, backgroundColor: '#F5F3EE' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32, justifyContent: 'space-between' },

  top: { gap: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#1B4332', alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  headlineBlack: { fontSize: 36, fontWeight: '800', color: '#1A1A1A', lineHeight: 44, letterSpacing: -0.5 },
  headlineAccent: { fontSize: 36, fontWeight: '800', color: '#C65D3E', lineHeight: 44, letterSpacing: -0.5 },

  sub: { fontSize: 15, color: '#6B7280', lineHeight: 22 },

  featureList: { gap: 8 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E3DE',
    width: '100%',
  },
  featureBadge: {
    backgroundColor: '#F5F3EE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#D6D3CC',
  },
  featureTag: { fontSize: 11, fontWeight: '800', color: '#1B4332', letterSpacing: 0.6 },
  featureDesc: { fontSize: 14, color: '#374151', fontWeight: '500' },

  actions: { gap: 14 },
  primaryButton: { backgroundColor: '#111827', borderRadius: 14, paddingVertical: 17, alignItems: 'center' },
  primaryButtonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
});
