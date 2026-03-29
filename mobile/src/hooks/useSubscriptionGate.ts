import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { subscriptionsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

/**
 * Add to every bottom tab screen. On each focus, checks subscription
 * status and sets subscriptionExpired in the store if the trial or
 * subscription has lapsed. AppNavigator reacts and shows the
 * SubscriptionGate (full-screen, no back) automatically.
 */
export function useSubscriptionGate() {
  const setSubscriptionExpired = useAuthStore((s) => s.setSubscriptionExpired);

  useFocusEffect(useCallback(() => {
    subscriptionsApi.getMe().then(({ data }) => {
      const expired =
        (data.plan === 'trial' && data.trialExpired) ||
        (data.plan === 'active' && data.status !== 'active');
      if (expired) setSubscriptionExpired(true);
    }).catch(() => {});
  }, []));
}
