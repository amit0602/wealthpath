import Decimal from 'decimal.js';

export interface FireInputs {
  currentAge: number;
  targetRetirementAge: number;
  lifeExpectancy: number;
  currentMonthlyExpenses: Decimal;
  desiredMonthlyIncome: Decimal;   // in today's rupees
  inflationRate: Decimal;          // e.g. 0.06 for 6%
  expectedReturnPreRetirement: Decimal;  // e.g. 0.12 for 12%
  expectedReturnPostRetirement: Decimal; // e.g. 0.07 for 7%
  withdrawalRate: Decimal;         // e.g. 0.0333 for 3.33%
  currentCorpus: Decimal;          // total current invested corpus
  monthlyContribution: Decimal;    // current total monthly SIP/savings
}

export interface FireResult {
  corpusRequired: Decimal;
  currentCorpusFutureValue: Decimal;
  corpusGap: Decimal;
  monthlySipRequired: Decimal;
  yearsToFire: Decimal;
  fireAge: number;
  projections: YearlyProjection[];
}

export interface YearlyProjection {
  year: number;
  age: number;
  portfolioValue: Decimal;
  annualContribution: Decimal;
  annualReturns: Decimal;
  isFireYear: boolean;
}

/**
 * Calculate the inflation-adjusted corpus needed at retirement.
 * Uses: corpus = (future_monthly_expense × 12) / withdrawal_rate
 */
export function calculateCorpusRequired(inputs: FireInputs): Decimal {
  const yearsToRetirement = new Decimal(inputs.targetRetirementAge - inputs.currentAge);
  const futureMonthlyExpense = inputs.desiredMonthlyIncome.mul(
    inputs.inflationRate.plus(1).pow(yearsToRetirement),
  );
  return futureMonthlyExpense.mul(12).div(inputs.withdrawalRate);
}

/**
 * Calculate the future value of the current corpus at retirement.
 */
export function calculateCurrentCorpusFV(inputs: FireInputs): Decimal {
  const yearsToRetirement = new Decimal(inputs.targetRetirementAge - inputs.currentAge);
  return inputs.currentCorpus.mul(
    inputs.expectedReturnPreRetirement.plus(1).pow(yearsToRetirement),
  );
}

/**
 * Calculate the monthly SIP required to bridge the corpus gap.
 * Uses Future Value of Annuity: FV = PMT × [((1+r)^n - 1) / r]
 * Solved for PMT: PMT = FV × r / ((1+r)^n - 1)
 */
export function calculateMonthlySipRequired(
  corpusGap: Decimal,
  monthlyRate: Decimal,
  months: Decimal,
): Decimal {
  if (corpusGap.lte(0)) return new Decimal(0);

  const onePlusR = monthlyRate.plus(1);
  const compounded = onePlusR.pow(months);
  const denominator = compounded.minus(1);

  if (denominator.lte(0)) return corpusGap.div(months);

  return corpusGap.mul(monthlyRate).div(denominator);
}

/**
 * Main FIRE calculation function.
 */
export function calculateFire(inputs: FireInputs): FireResult {
  const corpusRequired = calculateCorpusRequired(inputs);
  const currentCorpusFutureValue = calculateCurrentCorpusFV(inputs);
  const corpusGap = Decimal.max(corpusRequired.minus(currentCorpusFutureValue), new Decimal(0));

  const yearsToRetirement = new Decimal(inputs.targetRetirementAge - inputs.currentAge);
  const months = yearsToRetirement.mul(12);
  const monthlyRate = inputs.expectedReturnPreRetirement.div(12);
  const monthlySipRequired = calculateMonthlySipRequired(corpusGap, monthlyRate, months);

  // Build year-by-year projections
  const projections: YearlyProjection[] = [];
  let portfolioValue = inputs.currentCorpus;
  let fireYear: number | null = null;

  for (let yr = 0; yr <= yearsToRetirement.toNumber(); yr++) {
    const age = inputs.currentAge + yr;
    const annualContribution = inputs.monthlyContribution.mul(12);
    const annualReturns = portfolioValue.mul(inputs.expectedReturnPreRetirement);
    portfolioValue = portfolioValue.plus(annualContribution).plus(annualReturns);

    const isFireYear = portfolioValue.gte(corpusRequired);
    if (isFireYear && fireYear === null) {
      fireYear = yr;
    }

    projections.push({
      year: new Date().getFullYear() + yr,
      age,
      portfolioValue: portfolioValue.toDecimalPlaces(2),
      annualContribution: annualContribution.toDecimalPlaces(2),
      annualReturns: annualReturns.toDecimalPlaces(2),
      isFireYear,
    });
  }

  const yearsToFire = fireYear !== null
    ? new Decimal(fireYear)
    : yearsToRetirement;

  return {
    corpusRequired: corpusRequired.toDecimalPlaces(2),
    currentCorpusFutureValue: currentCorpusFutureValue.toDecimalPlaces(2),
    corpusGap: corpusGap.toDecimalPlaces(2),
    monthlySipRequired: monthlySipRequired.toDecimalPlaces(2),
    yearsToFire: yearsToFire.toDecimalPlaces(2),
    fireAge: inputs.currentAge + yearsToFire.toNumber(),
    projections,
  };
}
