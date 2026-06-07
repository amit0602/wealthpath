import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type {
  SendOtpResponse, VerifyOtpResponse,
  UserProfile, FinancialProfile,
  SubscriptionResponse,
  FIREResult,
  InvestmentsResponse, Investment, InvestmentAllocation, PortfolioSnapshot,
  HealthScoreResult,
  TaxComparisonResponse, TaxProfile,
  EmergencyFundResponse,
  InsuranceResponse,
  FinancialGoal,
  Loan, LoansResponse,
  NotificationPreferences, NotificationLog,
} from '../types/api';

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
  sendOtp: (phoneNumber: string) =>
    api.post<SendOtpResponse>('/auth/send-otp', { phoneNumber }),
  verifyOtp: (phoneNumber: string, otp: string) =>
    api.post<VerifyOtpResponse>('/auth/verify-otp', { phoneNumber, otp }),
  logout: () => api.post('/auth/logout'),
};

// Users
export const usersApi = {
  getMe: () => api.get<UserProfile>('/users/me'),
  updateProfile: (data: Partial<UserProfile>) => api.put<UserProfile>('/users/me', data),
  updateFinancialProfile: (data: Partial<FinancialProfile>) =>
    api.put<FinancialProfile>('/users/me/financial-profile', data),
  exportData: () => api.get('/users/me/data-export'),
  deleteAccount: () => api.delete('/users/me'),
};

// FIRE
export const fireApi = {
  calculate: (data?: Partial<FIREResult>) =>
    api.post<FIREResult>('/fire/calculate', data ?? {}),
  getLatest: () => api.get<FIREResult>('/fire/latest'),
};

// Investments
export const investmentsApi = {
  getAll: () => api.get<InvestmentsResponse>('/investments'),
  create: (data: Omit<Investment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
    api.post<Investment>('/investments', data),
  update: (id: string, data: Partial<Omit<Investment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) =>
    api.put<Investment>(`/investments/${id}`, data),
  delete: (id: string) => api.delete(`/investments/${id}`),
  getAllocation: () => api.get<InvestmentAllocation>('/investments/allocation'),
  getSnapshots: () => api.get<PortfolioSnapshot[]>('/investments/snapshots'),
};

// Tax
export const taxApi = {
  getComparison: () => api.get<TaxComparisonResponse>('/tax/comparison'),
  getProfile: () => api.get<TaxProfile>('/tax/profile'),
  updateProfile: (data: Partial<TaxProfile>) => api.put<TaxProfile>('/tax/profile', data),
  calculateHra: (data: { basicSalary: number; hraReceived: number; rentPaid: number; cityType: 'metro' | 'non-metro' }) =>
    api.post<{ exemptHra: number }>('/tax/calculate-hra', data),
};

// Health Score
export const healthScoreApi = {
  calculate: () => api.post<HealthScoreResult>('/health-score/calculate'),
  getLatest: () => api.get<HealthScoreResult>('/health-score/latest'),
};

// Subscriptions
export const subscriptionsApi = {
  getMe: () => api.get<SubscriptionResponse>('/subscriptions/me'),
  createOrder: () => api.post<{ orderId: string; amount: number; currency: string; keyId: string }>(
    '/subscriptions/create-order', { plan: 'monthly' }),
  verifyPayment: (data: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
    api.post<{ message: string; expiresAt: string }>('/subscriptions/verify-payment', data),
  cancel: () => api.post<{ message: string }>('/subscriptions/cancel'),
  devActivate: () => api.post<{ message: string; plan: string; expiresAt: string }>('/subscriptions/dev-activate'),
};

// Loans
export const loansApi = {
  list: () => api.get<LoansResponse>('/loans'),
  create: (data: Pick<Loan, 'name' | 'loanType' | 'outstandingBalance' | 'interestRate' | 'remainingTenureMonths' | 'emiAmount'>) =>
    api.post<Loan>('/loans', data),
  update: (id: string, data: Partial<Pick<Loan, 'name' | 'loanType' | 'outstandingBalance' | 'interestRate' | 'remainingTenureMonths' | 'emiAmount'>>) =>
    api.put<Loan>(`/loans/${id}`, data),
  delete: (id: string) => api.delete(`/loans/${id}`),
};

// Emergency Fund
export const emergencyFundApi = {
  get: () => api.get<EmergencyFundResponse>('/emergency-fund/me'),
  upsert: (data: { liquidSavings: number; targetMonths?: number }) =>
    api.put<EmergencyFundResponse>('/emergency-fund/me', data),
};

// Insurance
export const insuranceApi = {
  get: () => api.get<InsuranceResponse>('/insurance/me'),
  upsert: (data: Partial<Omit<InsuranceResponse, 'id' | 'userId'>>) =>
    api.put<InsuranceResponse>('/insurance/me', data),
};

// MF Import
export const mfImportApi = {
  upload: (formData: FormData) =>
    api.post<{ sessionId: string; holdings: any[] }>('/mf-import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  confirm: (sessionId: string, holdings: any[]) =>
    api.post<{ imported: number }>('/mf-import/confirm', { sessionId, holdings }),
  getSessions: () => api.get('/mf-import/sessions'),
};

// Demat Sync
export const dematSyncApi = {
  upload: (formData: FormData) =>
    api.post<{ sessionId: string; holdings: any[] }>('/demat-sync/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  confirm: (sessionId: string, holdings: any[]) =>
    api.post<{ imported: number }>('/demat-sync/confirm', { sessionId, holdings }),
  getSessions: () => api.get('/demat-sync/sessions'),
};

// Goals
export const goalsApi = {
  list: () => api.get<FinancialGoal[]>('/goals'),
  create: (data: Pick<FinancialGoal, 'name' | 'targetAmount' | 'targetYears' | 'currentSavings' | 'expectedReturnRate'>) =>
    api.post<FinancialGoal>('/goals', data),
  update: (id: string, data: Partial<Pick<FinancialGoal, 'name' | 'targetAmount' | 'targetYears' | 'currentSavings' | 'expectedReturnRate'>>) =>
    api.put<FinancialGoal>(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`),
};

// Notifications
export const notificationsApi = {
  registerToken: (token: string, platform: 'ios' | 'android' | 'web') =>
    api.post('/notifications/token', { token, platform }),
  deregisterToken: (token: string) =>
    api.delete(`/notifications/token?token=${encodeURIComponent(token)}`),
  getPreferences: () => api.get<NotificationPreferences>('/notifications/preferences'),
  updatePreferences: (data: Partial<NotificationPreferences>) =>
    api.put<NotificationPreferences>('/notifications/preferences', data),
  getLogs: () => api.get<NotificationLog[]>('/notifications/logs'),
};
