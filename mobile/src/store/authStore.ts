import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { authApi } from '../services/api';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  phoneNumber: string | null;
  isOnboardingComplete: boolean;
  subscriptionExpired: boolean;

  sendOtp: (phoneNumber: string) => Promise<{ devOtp?: string }>;
  verifyOtp: (phoneNumber: string, otp: string) => Promise<{ isNewUser: boolean }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setOnboardingComplete: () => void;
  setSubscriptionExpired: (expired: boolean) => void;
}

async function saveToken(key: string, value: string) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    if (Platform.OS === 'web') localStorage.setItem(key, value);
  }
}

async function getToken(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return null;
  }
}

async function deleteToken(key: string) {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    if (Platform.OS === 'web') localStorage.removeItem(key);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  userId: null,
  phoneNumber: null,
  isOnboardingComplete: false,
  subscriptionExpired: false,

  sendOtp: async (phoneNumber) => {
    const { data } = await authApi.sendOtp(phoneNumber);
    return { devOtp: data.devOtp };
  },

  verifyOtp: async (phoneNumber, otp) => {
    const { data } = await authApi.verifyOtp(phoneNumber, otp);
    await saveToken('accessToken', data.accessToken);
    await saveToken('refreshToken', data.refreshToken);
    const isOnboardingComplete = !data.isNewUser;
    if (Platform.OS === 'web' && isOnboardingComplete) {
      localStorage.setItem('isOnboardingComplete', 'true');
    }
    set({ isAuthenticated: true, phoneNumber, isOnboardingComplete });
    return { isNewUser: data.isNewUser };
  },

  logout: async () => {
    await authApi.logout().catch(() => {});
    await deleteToken('accessToken');
    await deleteToken('refreshToken');
    set({ isAuthenticated: false, userId: null, phoneNumber: null, isOnboardingComplete: false });
  },

  checkAuth: async () => {
    const token = await getToken('accessToken');
    const onboardingDone = Platform.OS === 'web'
      ? localStorage.getItem('isOnboardingComplete') === 'true'
      : false;
    set({ isAuthenticated: !!token, isOnboardingComplete: onboardingDone, isLoading: false });
  },

  setOnboardingComplete: () => {
    if (Platform.OS === 'web') localStorage.setItem('isOnboardingComplete', 'true');
    set({ isOnboardingComplete: true });
  },

  setSubscriptionExpired: (expired) => set({ subscriptionExpired: expired }),
}));
