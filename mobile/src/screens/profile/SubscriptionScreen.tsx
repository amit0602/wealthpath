import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { subscriptionsApi } from '../../services/api';

type Plan = 'monthly' | 'annual';

interface Subscription {
  plan: string;
  status: string;
  expiresAt: string | null;
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

  const isPremium = subscription?.plan === 'premium' && subscription?.status === 'active';

  const handleActivate = async (plan: Plan) => {
    setActivating(true);
    try {
      // Dev mode: bypass payment — call dev-activate directly.
      // In production: call createOrder → open Razorpay payment sheet → verifyPayment.
      const { data } = await subscriptionsApi.devActivate(plan);
      setSubscription((prev) => prev ? { ...prev, plan: 'premium', status: 'active', expiresAt: data.expiresAt } : prev);
      Alert.alert('Premium Activated!', `Your ${plan} plan is now active.`);
    } catch {
      Alert.alert('Activation Failed', 'Could not activate premium. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Subscription',
      'You will retain premium access until your current period ends. Continue?',
      [
        { text: 'Keep Premium', style: 'cancel' },
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
          <Text style={styles.title}>WealthPath Premium</Text>
        </View>

        {/* Current plan status */}
        <View style={[styles.statusCard, isPremium ? styles.statusCardPremium : styles.statusCardFree]}>
          <Text style={styles.statusLabel}>Current Plan</Text>
          <Text style={styles.statusPlan}>{isPremium ? '⭐ Premium' : 'Free'}</Text>
          {isPremium && subscription?.expiresAt && (
            <Text style={styles.statusExpiry}>
              Active until {new Date(subscription.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          )}
          {subscription?.status === 'cancelled' && (
            <Text style={styles.statusCancelled}>Cancels at period end</Text>
          )}
        </View>

        {/* Premium features list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What you get with Premium</Text>
          {[
            { icon: '🔄', title: 'Account Aggregator Sync', desc: 'Auto-sync bank & investments via RBI-licensed AA' },
            { icon: '📂', title: 'CAMS / KFintech Import', desc: 'Import mutual fund CAS statements instantly' },
            { icon: '📈', title: 'Demat Holdings Sync', desc: 'Sync equity holdings from CDSL / NSDL' },
            { icon: '🔔', title: 'Smart Alerts', desc: 'Portfolio drift alerts & tax harvesting opportunities' },
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

        {!isPremium && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose a Plan</Text>

            {/* Annual plan — highlight with save badge */}
            <TouchableOpacity
              style={[styles.planCard, styles.planCardHighlight]}
              onPress={() => !activating && handleActivate('annual')}
              disabled={activating}
            >
              <View style={styles.planCardHeader}>
                <View>
                  <Text style={styles.planName}>Annual</Text>
                  <Text style={styles.planPrice}>₹3,999 / year</Text>
                  <Text style={styles.planPriceNote}>₹333 / month</Text>
                </View>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>Save 33%</Text>
                </View>
              </View>
              {activating ? (
                <ActivityIndicator color="#fff" style={{ marginTop: 12 }} />
              ) : (
                <View style={styles.planButton}>
                  <Text style={styles.planButtonText}>Get Annual Plan</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Monthly plan */}
            <TouchableOpacity
              style={styles.planCard}
              onPress={() => !activating && handleActivate('monthly')}
              disabled={activating}
            >
              <Text style={styles.planName}>Monthly</Text>
              <Text style={styles.planPrice}>₹499 / month</Text>
              {activating ? (
                <ActivityIndicator color="#1B4332" style={{ marginTop: 12 }} />
              ) : (
                <View style={[styles.planButton, styles.planButtonOutline]}>
                  <Text style={[styles.planButtonText, styles.planButtonTextOutline]}>Get Monthly Plan</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              For educational purposes only. Not investment advice.{'\n'}
              Cancel anytime. Renews automatically.
            </Text>
          </View>
        )}

        {isPremium && subscription?.status !== 'cancelled' && (
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
  header: { gap: 8 },
  backButton: { alignSelf: 'flex-start' },
  backText: { fontSize: 16, color: '#1B4332', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  statusCard: { borderRadius: 16, padding: 20, elevation: 1 },
  statusCardFree: { backgroundColor: '#fff' },
  statusCardPremium: { backgroundColor: '#1B4332' },
  statusLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusPlan: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 4 },
  statusExpiry: { fontSize: 13, color: '#6EE7B7', marginTop: 4 },
  statusCancelled: { fontSize: 13, color: '#FCA5A5', marginTop: 4 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12, elevation: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 2 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  featureDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  planCard: { borderRadius: 14, borderWidth: 1.5, borderColor: '#D1D5DB', padding: 16 },
  planCardHighlight: { borderColor: '#1B4332', backgroundColor: '#F0FDF4' },
  planCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  planPrice: { fontSize: 22, fontWeight: '800', color: '#1B4332', marginTop: 4 },
  planPriceNote: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  saveBadge: { backgroundColor: '#1B4332', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  saveBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  planButton: { marginTop: 14, backgroundColor: '#1B4332', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  planButtonOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#1B4332' },
  planButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  planButtonTextOutline: { color: '#1B4332' },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16, marginTop: 4 },
  cancelButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: 15, color: '#EF4444' },
});
