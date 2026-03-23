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
  existingSipFutureValue: Decimal;
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
 * Corpus needed at retirement.
 * Formula: futureAnnualExpense / withdrawalRate
 * where futureAnnualExpense = desiredMonthlyIncome × (1+inflation)^years × 12
 *
 * Matches ET Money / ClearTax FIRE calculator.
 */
export function calculateCorpusRequired(inputs: FireInputs): Decimal {
  const yearsToRetirement = new Decimal(inputs.targetRetirementAge - inputs.currentAge);
  const futureMonthlyExpense = inputs.desiredMonthlyIncome.mul(
    inputs.inflationRate.plus(1).pow(yearsToRetirement),
  );
  return futureMonthlyExpense.mul(12).div(inputs.withdrawalRate);
}

/**
 * Future value of the current lump-sum corpus at retirement.
 * Uses annual compounding: FV = PV × (1 + r)^n
 */
export function calculateCurrentCorpusFV(inputs: FireInputs): Decimal {
  const yearsToRetirement = new Decimal(inputs.targetRetirementAge - inputs.currentAge);
  return inputs.currentCorpus.mul(
    inputs.expectedReturnPreRetirement.plus(1).pow(yearsToRetirement),
  );
}

/**
 * Future value of existing ongoing monthly contributions (SIP/EPF/etc.)
 * Uses FV of ordinary annuity: FV = PMT × [(1+r)^n - 1] / r
 * where r = monthly rate, n = number of months
 *
 * This must be subtracted from the corpus gap before calculating
 * additional SIP needed — otherwise the required SIP is overstated.
 */
export function calculateExistingSipFV(inputs: FireInputs): Decimal {
  if (inputs.monthlyContribution.lte(0)) return new Decimal(0);

  const yearsToRetirement = new Decimal(inputs.targetRetirementAge - inputs.currentAge);
  const months = yearsToRetirement.mul(12);
  const monthlyRate = inputs.expectedReturnPreRetirement.div(12);

  if (monthlyRate.lte(0)) return inputs.monthlyContribution.mul(months);

  const compounded = monthlyRate.plus(1).pow(months);
  return inputs.monthlyContribution.mul(compounded.minus(1)).div(monthlyRate);
}

/**
 * Additional monthly SIP needed to bridge the remaining corpus gap.
 * Uses PMT formula: PMT = FV × r / ((1+r)^n - 1)
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
 *
 * Corpus gap accounts for:
 *   1. FV of current lump-sum corpus
 *   2. FV of existing monthly contributions (SIPs, EPF, etc.)
 * The monthlySipRequired is the *additional* SIP on top of what
 * the user already invests — matching the ET Money FIRE calculator.
 */
export function calculateFire(inputs: FireInputs): FireResult {
  const corpusRequired = calculateCorpusRequired(inputs);
  const currentCorpusFutureValue = calculateCurrentCorpusFV(inputs);
  const existingSipFutureValue = calculateExistingSipFV(inputs);

  const yearsToRetirement = new Decimal(inputs.targetRetirementAge - inputs.currentAge);
  const months = yearsToRetirement.mul(12);
  const monthlyRate = inputs.expectedReturnPreRetirement.div(12);

  // Gap after accounting for both existing lump sum and ongoing contributions
  const corpusGap = Decimal.max(
    corpusRequired.minus(currentCorpusFutureValue).minus(existingSipFutureValue),
    new Decimal(0),
  );

  const monthlySipRequired = calculateMonthlySipRequired(corpusGap, monthlyRate, months);

  // Year-by-year projection (used for chart / table on FIRE screen)
  // Portfolio grows by: returns on existing balance + annual contributions
  // Contributions assumed end-of-year (conservative, matches standard FIRE models)
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
    existingSipFutureValue: existingSipFutureValue.toDecimalPlaces(2),
    corpusGap: corpusGap.toDecimalPlaces(2),
    monthlySipRequired: monthlySipRequired.toDecimalPlaces(2),
    yearsToFire: yearsToFire.toDecimalPlaces(2),
    fireAge: inputs.currentAge + yearsToFire.toNumber(),
    projections,
  };
}
