import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { subscriptionsApi } from '../services/api';
import { MainStackParams } from '../navigation/AppNavigator';

/**
 * Add this hook to every bottom tab screen.
 * On each focus, checks subscription status and redirects to the
 * Subscription screen if the trial has expired or the paid subscription
 * is no longer active.
 */
export function useSubscriptionGate() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();

  useFocusEffect(useCallback(() => {
    subscriptionsApi.getMe().then(({ data }) => {
      const trialExpired = data.plan === 'trial' && data.trialExpired;
      const subExpired = data.plan === 'active' && data.status !== 'active';
      if (trialExpired || subExpired) navigation.navigate('Subscription');
    }).catch(() => {});
  }, []));
}
