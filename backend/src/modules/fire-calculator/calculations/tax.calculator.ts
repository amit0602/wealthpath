import Decimal from 'decimal.js';

// FY 2025-26 tax slabs

interface TaxSlab {
  upTo: number;
  rate: number;
}

// New Regime slabs (FY 2025-26)
const NEW_REGIME_SLABS: TaxSlab[] = [
  { upTo: 400000, rate: 0 },
  { upTo: 800000, rate: 0.05 },
  { upTo: 1200000, rate: 0.10 },
  { upTo: 1600000, rate: 0.15 },
  { upTo: 2000000, rate: 0.20 },
  { upTo: 2400000, rate: 0.25 },
  { upTo: Infinity, rate: 0.30 },
];

// Old Regime slabs (FY 2025-26) — below 60 years
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
const SECTION_80D_PARENT_LIMIT = 25000;
const SECTION_80CCD1B_LIMIT = 50000;    // NPS additional
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

function applyRebate87A(tax: number, taxableIncome: number, regime: 'old' | 'new'): number {
  // Section 87A rebate
  if (regime === 'new' && taxableIncome <= 700000) return 0;
  if (regime === 'old' && taxableIncome <= 500000) return 0;
  return tax;
}

function addSurchargeAndCess(tax: number, grossIncome: number): number {
  let surcharge = 0;
  if (grossIncome > 5000000 && grossIncome <= 10000000) surcharge = tax * 0.10;
  else if (grossIncome > 10000000 && grossIncome <= 20000000) surcharge = tax * 0.15;
  else if (grossIncome > 20000000 && grossIncome <= 50000000) surcharge = tax * 0.25;
  else if (grossIncome > 50000000) surcharge = tax * 0.37;
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
  section80d?: number;      // health insurance
  section80ccd1b?: number;  // NPS extra
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
  const newRegimeTaxableIncome = Math.max(0, gross - STANDARD_DEDUCTION_NEW);
  const newTaxBeforeRebate = calculateTaxFromSlabs(newRegimeTaxableIncome, NEW_REGIME_SLABS);
  const newTaxAfterRebate = applyRebate87A(newTaxBeforeRebate, newRegimeTaxableIncome, 'new');
  const newRegimeTax = Math.round(addSurchargeAndCess(newTaxAfterRebate, gross));

  // --- Old Regime ---
  const stdDeduction = STANDARD_DEDUCTION_OLD;
  const section80c = Math.min(inputs.section80c ?? 0, SECTION_80C_LIMIT);
  const section80d = Math.min(inputs.section80d ?? 0, SECTION_80D_LIMIT);
  const section80ccd1b = Math.min(inputs.section80ccd1b ?? 0, SECTION_80CCD1B_LIMIT);
  const homeLoanDeduction = Math.min(inputs.homeLoanInterest ?? 0, HOME_LOAN_INTEREST_LIMIT);

  // HRA exemption (simplified: assume basic = 40% of gross for salaried)
  const estimatedBasic = gross * 0.4;
  const hraExemption = inputs.hraReceived && inputs.rentPaid
    ? calculateHraExemption(estimatedBasic, inputs.hraReceived, inputs.rentPaid, inputs.isMetro ?? true).exemption
    : 0;

  const totalDeductions = stdDeduction + section80c + section80d + section80ccd1b + homeLoanDeduction + hraExemption;
  const oldRegimeTaxableIncome = Math.max(0, gross - totalDeductions);
  const oldTaxBeforeRebate = calculateTaxFromSlabs(oldRegimeTaxableIncome, OLD_REGIME_SLABS);
  const oldTaxAfterRebate = applyRebate87A(oldTaxBeforeRebate, oldRegimeTaxableIncome, 'old');
  const oldRegimeTax = Math.round(addSurchargeAndCess(oldTaxAfterRebate, gross));

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
