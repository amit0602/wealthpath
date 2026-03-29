import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { subscriptionsApi } from '../../services/api';

interface Subscription {
  plan: string;
  status: string;
  expiresAt: string | null;
  trialEndsAt: string | null;
  trialActive: boolean;
  trialExpired: boolean;
  trialDaysLeft: number;
}

export function SubscriptionScreen() {
  const navigation = useNavigation();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    subscriptionsApi
      .getMe()
      .then(({ data }) => setSubscription(data))
      .catch(() => Alert.alert('Error', 'Could not load subscription details.'))
      .finally(() => setLoading(false));
  }, []);

  const isActive = subscription?.plan === 'active' && subscription?.status === 'active';
  const isTrial = subscription?.trialActive;
  const isExpired = subscription?.trialExpired || (subscription?.plan === 'active' && subscription?.status !== 'active');

  const handleActivate = async () => {
    setActivating(true);
    try {
      // Dev mode: bypass payment — call dev-activate directly.
      // In production: call createOrder → open Razorpay payment sheet → verifyPayment.
      const { data } = await subscriptionsApi.devActivate();
      setSubscription((prev) => prev ? { ...prev, plan: 'active', status: 'active', expiresAt: data.expiresAt } : prev);
      Alert.alert('Subscribed!', 'You now have full access to WealthPath.');
    } catch {
      Alert.alert('Activation Failed', 'Could not activate subscription. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Subscription',
      'You will retain access until your current period ends. Continue?',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel', style: 'destructive', onPress: async () => {
            setCancelling(true);
            try {
              await subscriptionsApi.cancel();
              setSubscription((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
              Alert.alert('Cancelled', 'Your subscription has been cancelled.');
            } catch {
              Alert.alert('Error', 'Could not cancel subscription. Please try again.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1B4332" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>WealthPath</Text>
          <Text style={styles.subtitle}>Your complete personal finance dashboard</Text>
        </View>

        {/* Trial / active status banner */}
        {isTrial && (
          <View style={styles.trialBanner}>
            <Text style={styles.trialBannerTitle}>
              {subscription!.trialDaysLeft > 0
                ? `${subscription!.trialDaysLeft} day${subscription!.trialDaysLeft === 1 ? '' : 's'} left in your free trial`
                : 'Your free trial ends today'}
            </Text>
            <Text style={styles.trialBannerSub}>Subscribe to keep access at ₹199/mo</Text>
          </View>
        )}

        {isExpired && !isActive && (
          <View style={styles.expiredBanner}>
            <Text style={styles.expiredBannerTitle}>Your free trial has ended</Text>
            <Text style={styles.expiredBannerSub}>Subscribe below to continue using WealthPath</Text>
          </View>
        )}

        {isActive && (
          <View style={styles.activeBanner}>
            <Text style={styles.activeBannerTitle}>✓ Active Subscription</Text>
            {subscription?.expiresAt && (
              <Text style={styles.activeBannerSub}>
                Renews on {new Date(subscription.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            )}
            {subscription?.status === 'cancelled' && (
              <Text style={styles.activeBannerCancelled}>Cancelled — access until period end</Text>
            )}
          </View>
        )}

        {/* Everything included list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Everything included</Text>
          {[
            { icon: '📊', title: 'FIRE Calculator', desc: 'Know exactly when you can retire' },
            { icon: '🏦', title: 'Investment Tracker', desc: 'All your investments in one place' },
            { icon: '🧾', title: 'Tax Planner', desc: 'Old vs new regime comparison, 80C optimizer' },
            { icon: '❤️', title: 'Financial Health Score', desc: '0–100 score across 5 dimensions' },
            { icon: '🎯', title: 'Goal-based Planner', desc: 'SIP targets for every financial goal' },
            { icon: '📂', title: 'MF Import (CAMS / KFintech)', desc: 'Import mutual fund CAS statements' },
            { icon: '📈', title: 'Demat Holdings Sync', desc: 'Sync equity holdings from CDSL / NSDL' },
            { icon: '🔔', title: 'Smart Alerts', desc: 'Portfolio drift alerts & tax reminders' },
          ].map(({ icon, title, desc }) => (
            <View key={title} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureDesc}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Subscribe CTA */}
        {!isActive && (
          <View style={styles.section}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>₹199</Text>
              <Text style={styles.pricePer}> / month</Text>
            </View>
            <Text style={styles.priceNote}>Cancel anytime. No lock-in.</Text>

            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={handleActivate}
              disabled={activating}
            >
              {activating
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
              }
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              For educational purposes only. Not investment advice.
            </Text>
          </View>
        )}

        {isActive && subscription?.status !== 'cancelled' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling
              ? <ActivityIndicator color="#EF4444" />
              : <Text style={styles.cancelText}>Cancel Subscription</Text>
            }
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  header: { gap: 4 },
  backButton: { alignSelf: 'flex-start', marginBottom: 8 },
  backText: { fontSize: 16, color: '#1B4332', fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280' },
  trialBanner: { backgroundColor: '#FEF9C3', borderRadius: 14, padding: 16, gap: 4 },
  trialBannerTitle: { fontSize: 15, fontWeight: '700', color: '#92400E' },
  trialBannerSub: { fontSize: 13, color: '#78350F' },
  expiredBanner: { backgroundColor: '#FEE2E2', borderRadius: 14, padding: 16, gap: 4 },
  expiredBannerTitle: { fontSize: 15, fontWeight: '700', color: '#991B1B' },
  expiredBannerSub: { fontSize: 13, color: '#7F1D1D' },
  activeBanner: { backgroundColor: '#1B4332', borderRadius: 14, padding: 16, gap: 4 },
  activeBannerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  activeBannerSub: { fontSize: 13, color: '#A7F3D0' },
  activeBannerCancelled: { fontSize: 13, color: '#FCA5A5' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12, elevation: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 2 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  featureDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  price: { fontSize: 36, fontWeight: '800', color: '#1B4332' },
  pricePer: { fontSize: 16, color: '#6B7280', fontWeight: '600' },
  priceNote: { fontSize: 13, color: '#9CA3AF', marginTop: -6 },
  subscribeButton: { backgroundColor: '#1B4332', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  subscribeButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
  cancelButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: 15, color: '#EF4444' },
});
