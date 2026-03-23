// FY 2025-26 tax calculator (Budget 2025)

interface TaxSlab {
  upTo: number;
  rate: number;
}

// New Regime slabs (FY 2025-26, Budget 2025)
// Verified against Income Tax dept portal and ClearTax
const NEW_REGIME_SLABS: TaxSlab[] = [
  { upTo: 400000, rate: 0 },
  { upTo: 800000, rate: 0.05 },
  { upTo: 1200000, rate: 0.10 },
  { upTo: 1600000, rate: 0.15 },
  { upTo: 2000000, rate: 0.20 },
  { upTo: 2400000, rate: 0.25 },
  { upTo: Infinity, rate: 0.30 },
];

// Old Regime slabs (FY 2025-26) — age below 60
const OLD_REGIME_SLABS: TaxSlab[] = [
  { upTo: 250000, rate: 0 },
  { upTo: 500000, rate: 0.05 },
  { upTo: 1000000, rate: 0.20 },
  { upTo: Infinity, rate: 0.30 },
];

const STANDARD_DEDUCTION_NEW = 75000;
const STANDARD_DEDUCTION_OLD = 50000;
const SECTION_80C_LIMIT = 150000;
const SECTION_80D_LIMIT = 25000;        // self + family (non-senior)
const SECTION_80CCD1B_LIMIT = 50000;    // NPS additional (both regimes)
const HOME_LOAN_INTEREST_LIMIT = 200000;

function calculateTaxFromSlabs(taxableIncome: number, slabs: TaxSlab[]): number {
  let tax = 0;
  let prevLimit = 0;

  for (const slab of slabs) {
    if (taxableIncome <= prevLimit) break;
    const slabIncome = Math.min(taxableIncome, slab.upTo) - prevLimit;
    tax += slabIncome * slab.rate;
    prevLimit = slab.upTo;
  }

  return tax;
}

/**
 * Section 87A rebate with marginal relief.
 *
 * FY 2025-26 thresholds (Budget 2025):
 *   New regime: rebate up to ₹60,000 for taxable income ≤ ₹12,00,000
 *   Old regime: rebate up to ₹12,500 for taxable income ≤ ₹5,00,000
 *
 * Marginal relief: when income is just above the rebate threshold, the
 * tax payable cannot exceed the income above the threshold. This prevents
 * a ₹1 increase in income causing a ₹50,000+ jump in tax.
 * Verified against the Income Tax department's online calculator.
 */
function applyRebate87A(tax: number, taxableIncome: number, regime: 'old' | 'new'): number {
  if (regime === 'new') {
    const REBATE_THRESHOLD = 1200000;
    const MAX_REBATE = 60000;
    if (taxableIncome <= REBATE_THRESHOLD) return 0;
    // Marginal relief: tax capped at income above threshold
    const marginalIncome = taxableIncome - REBATE_THRESHOLD;
    const rebate = Math.max(0, Math.min(MAX_REBATE, tax - marginalIncome));
    return tax - rebate;
  }

  if (regime === 'old') {
    const REBATE_THRESHOLD = 500000;
    const MAX_REBATE = 12500;
    if (taxableIncome <= REBATE_THRESHOLD) return 0;
    const marginalIncome = taxableIncome - REBATE_THRESHOLD;
    const rebate = Math.max(0, Math.min(MAX_REBATE, tax - marginalIncome));
    return tax - rebate;
  }

  return tax;
}

/**
 * Add surcharge and 4% health & education cess.
 *
 * Surcharge rates (same for both regimes up to ₹5 Cr):
 *   >50L–1Cr: 10%, >1Cr–2Cr: 15%, >2Cr–5Cr: 25%
 * Above ₹5 Cr:
 *   Old regime: 37% | New regime: capped at 25% (Budget 2023 onward)
 */
function addSurchargeAndCess(tax: number, grossIncome: number, regime: 'old' | 'new'): number {
  let surchargeRate = 0;
  if (grossIncome > 5000000 && grossIncome <= 10000000) surchargeRate = 0.10;
  else if (grossIncome > 10000000 && grossIncome <= 20000000) surchargeRate = 0.15;
  else if (grossIncome > 20000000 && grossIncome <= 50000000) surchargeRate = 0.25;
  else if (grossIncome > 50000000) {
    // New regime surcharge capped at 25% (Budget 2023, for AY 2023-24 onwards)
    surchargeRate = regime === 'new' ? 0.25 : 0.37;
  }
  const surcharge = tax * surchargeRate;
  const cess = (tax + surcharge) * 0.04;
  return tax + surcharge + cess;
}

export interface TaxInputs {
  grossSalary: number;
  // Old regime deductions
  hraReceived?: number;
  rentPaid?: number;
  isMetro?: boolean;
  section80c?: number;      // EPF + PPF + ELSS + LIC + etc.
  section80d?: number;      // health insurance premium
  section80ccd1b?: number;  // NPS additional (above employer contribution)
  homeLoanInterest?: number;
}

export interface HraExemption {
  actualHra: number;
  rentMinusPercent: number;
  percentOfBasic: number;
  exemption: number;
}

export interface TaxResult {
  oldRegimeTax: number;
  newRegimeTax: number;
  recommendedRegime: 'old' | 'new';
  savings: number;
  oldRegimeTaxableIncome: number;
  newRegimeTaxableIncome: number;
  effectiveOldRate: number;
  effectiveNewRate: number;
  section80cRemaining: number;
}

export function calculateHraExemption(
  basicSalary: number,
  hraReceived: number,
  rentPaid: number,
  isMetro: boolean,
): HraExemption {
  const actualHra = hraReceived;
  const rentMinusPercent = Math.max(0, rentPaid - basicSalary * 0.1);
  const percentOfBasic = basicSalary * (isMetro ? 0.5 : 0.4);
  const exemption = Math.min(actualHra, rentMinusPercent, percentOfBasic);
  return { actualHra, rentMinusPercent, percentOfBasic, exemption };
}

export function calculateTax(inputs: TaxInputs): TaxResult {
  const gross = inputs.grossSalary;

  // --- New Regime ---
  // Only standard deduction allowed; no other deductions
  const newRegimeTaxableIncome = Math.max(0, gross - STANDARD_DEDUCTION_NEW);
  const newTaxBeforeRebate = calculateTaxFromSlabs(newRegimeTaxableIncome, NEW_REGIME_SLABS);
  const newTaxAfterRebate = applyRebate87A(newTaxBeforeRebate, newRegimeTaxableIncome, 'new');
  const newRegimeTax = Math.round(addSurchargeAndCess(newTaxAfterRebate, gross, 'new'));

  // --- Old Regime ---
  const section80c = Math.min(inputs.section80c ?? 0, SECTION_80C_LIMIT);
  const section80d = Math.min(inputs.section80d ?? 0, SECTION_80D_LIMIT);
  const section80ccd1b = Math.min(inputs.section80ccd1b ?? 0, SECTION_80CCD1B_LIMIT);
  const homeLoanDeduction = Math.min(inputs.homeLoanInterest ?? 0, HOME_LOAN_INTEREST_LIMIT);

  // HRA exemption (basic estimated as 40% of CTC for salaried — standard approximation)
  const estimatedBasic = gross * 0.4;
  const hraExemption = inputs.hraReceived && inputs.rentPaid
    ? calculateHraExemption(estimatedBasic, inputs.hraReceived, inputs.rentPaid, inputs.isMetro ?? true).exemption
    : 0;

  const totalDeductions = STANDARD_DEDUCTION_OLD + section80c + section80d + section80ccd1b + homeLoanDeduction + hraExemption;
  const oldRegimeTaxableIncome = Math.max(0, gross - totalDeductions);
  const oldTaxBeforeRebate = calculateTaxFromSlabs(oldRegimeTaxableIncome, OLD_REGIME_SLABS);
  const oldTaxAfterRebate = applyRebate87A(oldTaxBeforeRebate, oldRegimeTaxableIncome, 'old');
  const oldRegimeTax = Math.round(addSurchargeAndCess(oldTaxAfterRebate, gross, 'old'));

  const recommendedRegime: 'old' | 'new' = oldRegimeTax <= newRegimeTax ? 'old' : 'new';
  const savings = Math.abs(oldRegimeTax - newRegimeTax);

  return {
    oldRegimeTax,
    newRegimeTax,
    recommendedRegime,
    savings,
    oldRegimeTaxableIncome,
    newRegimeTaxableIncome,
    effectiveOldRate: gross > 0 ? (oldRegimeTax / gross) * 100 : 0,
    effectiveNewRate: gross > 0 ? (newRegimeTax / gross) * 100 : 0,
    section80cRemaining: SECTION_80C_LIMIT - section80c,
  };
}
