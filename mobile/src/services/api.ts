import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE_URL = 'http://localhost:3000/api/v1';

async function getStoredToken(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return null;
  }
}

async function setStoredToken(key: string, value: string) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    if (Platform.OS === 'web') localStorage.setItem(key, value);
  }
}

async function deleteStoredToken(key: string) {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    if (Platform.OS === 'web') localStorage.removeItem(key);
  }
}

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use(async (config) => {
  const token = await getStoredToken('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await getStoredToken('refreshToken');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken });
        await setStoredToken('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        await deleteStoredToken('accessToken');
        await deleteStoredToken('refreshToken');
        // Navigation to login handled by auth store
      }
    }
    return Promise.reject(error);
  },
);

// Auth
export const authApi = {
  sendOtp: (phoneNumber: string) => api.post('/auth/send-otp', { phoneNumber }),
  verifyOtp: (phoneNumber: string, otp: string) => api.post('/auth/verify-otp', { phoneNumber, otp }),
  logout: () => api.post('/auth/logout'),
};

// Users
export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateProfile: (data: any) => api.put('/users/me', data),
  updateFinancialProfile: (data: any) => api.put('/users/me/financial-profile', data),
  exportData: () => api.get('/users/me/data-export'),
  deleteAccount: () => api.delete('/users/me'),
};

// FIRE
export const fireApi = {
  calculate: (data?: any) => api.post('/fire/calculate', data ?? {}),
  getLatest: () => api.get('/fire/latest'),
};

// Investments
export const investmentsApi = {
  getAll: () => api.get('/investments'),
  create: (data: any) => api.post('/investments', data),
  update: (id: string, data: any) => api.put(`/investments/${id}`, data),
  delete: (id: string) => api.delete(`/investments/${id}`),
  getAllocation: () => api.get('/investments/allocation'),
  getSnapshots: () => api.get('/investments/snapshots'),
};

// Tax
export const taxApi = {
  getComparison: () => api.get('/tax/comparison'),
  getProfile: () => api.get('/tax/profile'),
  updateProfile: (data: any) => api.put('/tax/profile', data),
  calculateHra: (data: any) => api.post('/tax/calculate-hra', data),
};

// Health Score
export const healthScoreApi = {
  calculate: () => api.post('/health-score/calculate'),
  getLatest: () => api.get('/health-score/latest'),
};

// Subscriptions
export const subscriptionsApi = {
  getMe: () => api.get('/subscriptions/me'),
  createOrder: (plan: 'monthly' | 'annual') => api.post('/subscriptions/create-order', { plan }),
  verifyPayment: (data: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
    api.post('/subscriptions/verify-payment', data),
  cancel: () => api.post('/subscriptions/cancel'),
  devActivate: (plan: 'monthly' | 'annual') => api.post('/subscriptions/dev-activate', { plan }),
};

// Emergency Fund
export const emergencyFundApi = {
  get: () => api.get('/emergency-fund/me'),
  upsert: (data: { liquidSavings: number; targetMonths?: number }) =>
    api.put('/emergency-fund/me', data),
};

// Insurance
export const insuranceApi = {
  get: () => api.get('/insurance/me'),
  upsert: (data: {
    hasTermInsurance?: boolean; termCoverAmount?: number; annualTermPremium?: number;
    hasHealthInsurance?: boolean; healthCoverAmount?: number; annualHealthPremium?: number;
  }) => api.put('/insurance/me', data),
};

// MF Import
export const mfImportApi = {
  upload: (formData: FormData) =>
    api.post('/mf-import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  confirm: (sessionId: string, holdings: any[]) =>
    api.post('/mf-import/confirm', { sessionId, holdings }),
  getSessions: () => api.get('/mf-import/sessions'),
};

// Demat Sync
export const dematSyncApi = {
  upload: (formData: FormData) =>
    api.post('/demat-sync/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  confirm: (sessionId: string, holdings: any[]) =>
    api.post('/demat-sync/confirm', { sessionId, holdings }),
  getSessions: () => api.get('/demat-sync/sessions'),
};

// Goals
export const goalsApi = {
  list: () => api.get('/goals'),
  create: (data: {
    name: string; targetAmount: number; targetYears: number;
    currentSavings?: number; expectedReturnRate?: number;
  }) => api.post('/goals', data),
  update: (id: string, data: {
    name?: string; targetAmount?: number; targetYears?: number;
    currentSavings?: number; expectedReturnRate?: number;
  }) => api.put(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`),
};

// Notifications
export const notificationsApi = {
  registerToken: (token: string, platform: 'ios' | 'android' | 'web') =>
    api.post('/notifications/token', { token, platform }),
  deregisterToken: (token: string) =>
    api.delete(`/notifications/token?token=${encodeURIComponent(token)}`),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data: {
    driftAlertsEnabled?: boolean;
    taxRemindersEnabled?: boolean;
    driftThresholdPercent?: number;
  }) => api.put('/notifications/preferences', data),
  getLogs: () => api.get('/notifications/logs'),
};
