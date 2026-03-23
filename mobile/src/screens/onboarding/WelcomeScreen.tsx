import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParams } from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<OnboardingStackParams, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>WealthPath</Text>
          <Text style={styles.tagline}>Your journey to financial freedom</Text>
        </View>

        <View style={styles.features}>
          {['Calculate your FIRE number', 'Optimize taxes (Old vs New regime)', 'Track investments & corpus', 'Get your Financial Health Score'].map((f) => (
            <View key={f} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('PhoneEntry')}>
            <Text style={styles.primaryButtonText}>Get Started — It's Free</Text>
          </TouchableOpacity>
          <Text style={styles.disclaimer}>
            By continuing, you agree to our Terms & Privacy Policy.{'\n'}
            This app provides financial education, not investment advice.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1B4332' },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingVertical: 48 },
  logoContainer: { alignItems: 'center', marginTop: 32 },
  logoText: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  tagline: { fontSize: 16, color: '#A7F3D0', marginTop: 8 },
  features: { gap: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureCheck: { fontSize: 18, color: '#6EE7B7' },
  featureText: { fontSize: 16, color: '#fff', flex: 1 },
  actions: { gap: 16 },
  primaryButton: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { fontSize: 17, fontWeight: '700', color: '#1B4332' },
  disclaimer: { fontSize: 11, color: '#6EE7B7', textAlign: 'center', lineHeight: 16 },
});
