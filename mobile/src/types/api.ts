/**
 * Typed API response shapes for WealthPath.
 * Keep in sync with the NestJS DTOs in backend/src/modules/{module}/
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface SendOtpResponse {
  message: string;
  devOtp?: string; // only present when NODE_ENV !== 'production'
}

export interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  isOnboardingComplete: boolean;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export interface FinancialProfile {
  id: string;
  userId: string;
  monthlyGrossIncome: number;
  monthlyTakeHome: number;
  monthlyExpenses: number;
  monthlyEmi: number;
  dependentsCount: number;
  riskAppetite: string; // 'conservative' | 'moderate' | 'aggressive'
  targetRetirementAge: number;
  desiredMonthlyIncome: number;
  retirementCity: string;
  retirementCityTier: string;
  inflationAssumption: number;
  expectedReturnPre: number;
  expectedReturnPost: number;
  withdrawalRate: number;
  lifeExpectancy: number;
}

export interface UserProfile {
  id: string;
  phoneNumber: string;
  fullName: string;
  dateOfBirth: string | null;
  city: string;
  cityTier: string;
  employmentType: string;
  createdAt: string;
  financialProfile: FinancialProfile | null;
}

// ─── Subscriptions ────────────────────────────────────────────────────────────
export interface SubscriptionResponse {
  id: string;
  userId: string;
  plan: 'trial' | 'active' | 'cancelled';
  status: 'active' | 'inactive' | 'cancelled';
  trialEndsAt: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  // Computed by backend getSubscription()
  trialActive: boolean;
  trialExpired: boolean;
  trialDaysLeft: number;
}

// ─── FIRE ─────────────────────────────────────────────────────────────────────
export interface FIREResult {
  corpusRequired: number;
  currentCorpusFutureValue: number;
  existingSipFutureValue: number;
  corpusGap: number;
  monthlySipRequired: number;
  yearsToFire: number;
  fireAge: number;
  projections: Array<{ year: number; corpus: number }>;
  calculationInputs?: string; // JSON string
  createdAt: string;
}

// ─── Investments ──────────────────────────────────────────────────────────────
export type InstrumentType =
  | 'epf' | 'ppf' | 'nps_tier1' | 'nps_tier2' | 'elss' | 'fd' | 'rd'
  | 'direct_equity' | 'real_estate' | 'gold' | 'sgb'
  | 'mutual_fund_equity' | 'mutual_fund_debt' | 'other';

export interface Investment {
  id: string;
  userId: string;
  name: string;
  instrumentType: InstrumentType;
  currentValue: number;
  monthlyContribution: number;
  annualContribution: number;
  expectedReturnRate: number;
  interestRate: number | null;
  startDate: string | null;
  maturityDate: string | null;
  lockInUntil: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AllocationCategory {
  value: number;
  percentage: number;
}

export interface InvestmentAllocation {
  totalCorpus: number;
  monthlyContribution: number;
  allocation: {
    equity: AllocationCategory;
    debt: AllocationCategory;
    gold: AllocationCategory;
    realEstate: AllocationCategory;
  };
}

export interface InvestmentsResponse {
  investments: Investment[];
  summary: InvestmentAllocation;
}

export interface PortfolioSnapshot {
  month: string; // "YYYY-MM"
  totalCorpus: number;
}

// ─── Health Score ─────────────────────────────────────────────────────────────
export interface HealthScoreBreakdown {
  savingsRate: number;
  insurance: number;
  debtManagement: number;
  emergencyFund: number;
  retirementTrack: number;
}

export interface HealthScoreResult {
  overallScore: number;
  breakdown: HealthScoreBreakdown;
  createdAt: string;
}

// ─── Tax ──────────────────────────────────────────────────────────────────────
export interface TaxComparisonResponse {
  financialYear: string;
  grossSalary: number;
  oldRegimeTax: number;
  newRegimeTax: number;
  recommendedRegime: 'old' | 'new';
  savings: number;
  oldRegimeTaxableIncome: number;
  newRegimeTaxableIncome: number;
  effectiveOldRate: number;
  effectiveNewRate: number;
  section80cRemaining: number;
  section80c: number;
  section80d: number;
  section80ccd1b: number;
  homeLoanInterest: number;
}

export interface TaxProfile {
  grossSalary: number;
  hraReceived: number;
  rentPaid: number;
  isMetro: boolean;
  section80cUsed: number;
  section80dUsed: number;
  section80ccd1bUsed: number;
  homeLoanInterest: number;
  recommendedRegime: string | null;
  oldRegimeTax: number | null;
  newRegimeTax: number | null;
}

// ─── Emergency Fund ───────────────────────────────────────────────────────────
export interface EmergencyFundResponse {
  liquidSavings: number;
  targetMonths: number;
  monthlyExpenses: number;
  monthsCovered: number;
  targetAmount: number;
  shortfall: number;
  progressPct: number;
}

// ─── Insurance ────────────────────────────────────────────────────────────────
export interface InsuranceResponse {
  id: string;
  userId: string;
  hasTermInsurance: boolean;
  termCoverAmount: number;
  annualTermPremium: number;
  hasHealthInsurance: boolean;
  healthCoverAmount: number;
  annualHealthPremium: number;
}

// ─── Goals ────────────────────────────────────────────────────────────────────
export interface FinancialGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  targetYears: number;
  currentSavings: number;
  expectedReturnRate: number;
  monthlySip: number;
  progressPct: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Loans ────────────────────────────────────────────────────────────────────
export type LoanType = 'home' | 'car' | 'personal' | 'education' | 'other';

export interface Loan {
  id: string;
  userId: string;
  name: string;
  loanType: LoanType;
  outstandingBalance: number;
  interestRate: number;
  remainingTenureMonths: number;
  emiAmount: number;
  // Computed by backend enrichLoan()
  totalInterestPayable: number;
  payoffDate: string;
  avalancheFirst?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoansSummary {
  totalOutstanding: number;
  totalMonthlyEmi: number;
  totalInterestPayable: number;
  loanCount: number;
}

export interface LoansResponse {
  loans: Loan[];
  summary: LoansSummary;
}

// ─── Notifications ────────────────────────────────────────────────────────────
export interface NotificationPreferences {
  driftAlertsEnabled: boolean;
  taxRemindersEnabled: boolean;
  driftThresholdPercent: number;
}

export interface NotificationLog {
  id: string;
  title: string;
  body: string;
  type: string;
  sentAt: string;
  status: string;
}

// ─── MF Import / Demat Sync ───────────────────────────────────────────────────
export interface MfHolding {
  name: string;
  instrumentType: string;
  currentValue: number;
  units: number | null;
  nav: number | null;
  folioNumber: string | null;
}

export interface MfImportUploadResponse {
  sessionId: string;
  holdings: MfHolding[];
}

export interface DematHolding {
  name: string;
  isin: string | null;
  quantity: number;
  currentValue: number;
  exchange: string | null;
}

export interface DematUploadResponse {
  sessionId: string;
  holdings: DematHolding[];
  depository: string | null;
}
