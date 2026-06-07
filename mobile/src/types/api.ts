/**
 * Typed API response shapes for WealthPath.
 * Keep in sync with the NestJS DTOs in backend/src/modules/*/
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
export interface UserProfile {
  id: string;
  phoneNumber: string;
  name: string | null;
  dateOfBirth: string | null;
  city: string | null;
  employmentType: string | null;
  isOnboardingComplete: boolean;
  createdAt: string;
}

export interface FinancialProfile {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyEmi: number;
  numberOfDependents: number;
  existingCorpus: number;
  monthlyInvestment: number;
  currentAge: number;
  retirementAge: number;
  desiredMonthlyIncomeInRetirement: number;
  riskAppetite: 'conservative' | 'moderate' | 'aggressive';
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
export interface FIREAssumptions {
  inflationRate: number;
  preRetirementReturn: number;
  postRetirementReturn: number;
  withdrawalRate: number;
  lifeExpectancy: number;
}

export interface FIREResult {
  corpusRequired: number;
  corpusFv: number;
  corpusGap: number;
  monthlySipRequired: number;
  fiYearsAway: number;
  targetRetirementAge: number;
  fireAchievable: boolean;
  monthlyExpensesInRetirement: number;
  assumptions: FIREAssumptions;
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
  purchaseValue: number | null;
  monthlyContribution: number;
  annualContribution: number;
  expectedReturnRate: number;
  lockInUntil: string | null;
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
  totalValue: number;
}

// ─── Health Score ─────────────────────────────────────────────────────────────
export interface HealthScoreBreakdown {
  savings: number;
  insurance: number;
  debtManagement: number;
  emergencyFund: number;
  retirementTrack: number;
}

export interface HealthScoreResult {
  totalScore: number;
  breakdown: HealthScoreBreakdown;
  label: string;
  createdAt: string;
}

// ─── Tax ──────────────────────────────────────────────────────────────────────
export interface TaxRegimeResult {
  grossIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  taxBeforeRebate: number;
  rebate87A: number;
  taxAfterRebate: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  effectiveRate: number;
}

export interface TaxComparisonResponse {
  financialYear: string;
  oldRegime: TaxRegimeResult;
  newRegime: TaxRegimeResult;
  recommendation: 'old' | 'new';
  saving: number;
  deductions80C: number;
  deductions80D: number;
  deductions80CCD1B: number;
  homeLoanInterest: number;
}

export interface TaxProfile {
  annualSalary: number;
  hraReceived: number;
  rentPaid: number;
  cityType: 'metro' | 'non-metro';
  deductions80C: number;
  deductions80D: number;
  deductions80CCD1B: number;
  homeLoanInterest: number;
}

// ─── Emergency Fund ───────────────────────────────────────────────────────────
export interface EmergencyFundResponse {
  id: string;
  userId: string;
  liquidSavings: number;
  targetMonths: number;
  monthlyExpenses: number;
  monthsCovered: number;
  targetAmount: number;
  shortfall: number;
  progressPercent: number;
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
  // Computed by backend
  monthlyRequiredSip: number;
  amountStillNeeded: number;
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
  // Computed by backend
  totalInterestPayable: number;
  payoffDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoansResponse {
  loans: Loan[];
  totalOutstanding: number;
  totalMonthlyEmi: number;
  recommendation: string;
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
