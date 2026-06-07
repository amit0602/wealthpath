import Decimal from 'decimal.js';
import {
  calculateCorpusRequired,
  calculateCurrentCorpusFV,
  calculateExistingSipFV,
  calculateMonthlySipRequired,
  calculateFire,
  FireInputs,
} from './corpus.calculator';

/** Standard test profile used across most cases — matches ET Money FIRE calculator inputs */
const BASE_INPUTS: FireInputs = {
  currentAge: 30,
  targetRetirementAge: 50,
  lifeExpectancy: 85,
  currentMonthlyExpenses: new Decimal(50000),
  desiredMonthlyIncome: new Decimal(100000),  // ₹1L/mo in today's money
  inflationRate: new Decimal(0.06),            // 6% India default
  expectedReturnPreRetirement: new Decimal(0.12),  // 12% equity
  expectedReturnPostRetirement: new Decimal(0.07),
  withdrawalRate: new Decimal(0.0333),         // 3.33% India default
  currentCorpus: new Decimal(1000000),         // ₹10L existing
  monthlyContribution: new Decimal(30000),     // ₹30k/mo SIP
};

// ─── calculateCorpusRequired ──────────────────────────────────────────────────

describe('calculateCorpusRequired', () => {
  it('inflates desired income over n years and divides by withdrawal rate', () => {
    // years = 50 - 30 = 20
    // futureMonthly = 100000 × (1.06)^20 ≈ 320,714
    // annualExpense  = 320714 × 12             ≈ 3,848,568
    // corpusRequired = 3,848,568 / 0.0333      ≈ 1,15,57,245 (₹11.56 Cr)
    const result = calculateCorpusRequired(BASE_INPUTS);
    expect(result.toNumber()).toBeCloseTo(115_572_000, -3); // within ₹1000
  });

  it('returns higher corpus for higher inflation', () => {
    const high = calculateCorpusRequired({
      ...BASE_INPUTS,
      inflationRate: new Decimal(0.08),
    });
    const low = calculateCorpusRequired(BASE_INPUTS);
    expect(high.toNumber()).toBeGreaterThan(low.toNumber());
  });

  it('returns higher corpus for longer retirement period (lower withdrawal rate)', () => {
    const conservative = calculateCorpusRequired({
      ...BASE_INPUTS,
      withdrawalRate: new Decimal(0.025),
    });
    const standard = calculateCorpusRequired(BASE_INPUTS);
    expect(conservative.toNumber()).toBeGreaterThan(standard.toNumber());
  });

  it('returns zero corpus when desiredMonthlyIncome is zero', () => {
    const result = calculateCorpusRequired({
      ...BASE_INPUTS,
      desiredMonthlyIncome: new Decimal(0),
    });
    expect(result.toNumber()).toBe(0);
  });
});

// ─── calculateCurrentCorpusFV ─────────────────────────────────────────────────

describe('calculateCurrentCorpusFV', () => {
  it('compounds existing corpus at pre-retirement rate for n years', () => {
    // FV = 1,000,000 × (1.12)^20 ≈ 9,646,293
    const result = calculateCurrentCorpusFV(BASE_INPUTS);
    expect(result.toNumber()).toBeCloseTo(9_646_293, -3);
  });

  it('returns exactly currentCorpus when years = 0', () => {
    const sameAge = { ...BASE_INPUTS, currentAge: 50, targetRetirementAge: 50 };
    const result = calculateCurrentCorpusFV(sameAge);
    expect(result.toNumber()).toBeCloseTo(BASE_INPUTS.currentCorpus.toNumber(), 0);
  });

  it('returns 0 when currentCorpus is 0', () => {
    const result = calculateCurrentCorpusFV({
      ...BASE_INPUTS,
      currentCorpus: new Decimal(0),
    });
    expect(result.toNumber()).toBe(0);
  });
});

// ─── calculateExistingSipFV ───────────────────────────────────────────────────

describe('calculateExistingSipFV', () => {
  it('returns positive FV for positive monthly contributions', () => {
    const result = calculateExistingSipFV(BASE_INPUTS);
    expect(result.toNumber()).toBeGreaterThan(0);
  });

  it('returns 0 when monthlyContribution is 0', () => {
    const result = calculateExistingSipFV({
      ...BASE_INPUTS,
      monthlyContribution: new Decimal(0),
    });
    expect(result.toNumber()).toBe(0);
  });

  it('is larger than simple sum of contributions (compounding effect)', () => {
    const months = (BASE_INPUTS.targetRetirementAge - BASE_INPUTS.currentAge) * 12;
    const simpleSum = BASE_INPUTS.monthlyContribution.mul(months).toNumber();
    const fv = calculateExistingSipFV(BASE_INPUTS).toNumber();
    expect(fv).toBeGreaterThan(simpleSum);
  });
});

// ─── calculateMonthlySipRequired ─────────────────────────────────────────────

describe('calculateMonthlySipRequired', () => {
  it('returns 0 when corpusGap is 0 or negative', () => {
    const result = calculateMonthlySipRequired(
      new Decimal(0),
      new Decimal(0.01),
      new Decimal(240),
    );
    expect(result.toNumber()).toBe(0);
  });

  it('returns a positive SIP for a positive corpus gap', () => {
    const result = calculateMonthlySipRequired(
      new Decimal(10_000_000),
      new Decimal(0.01),  // 1% monthly = 12% annual
      new Decimal(240),   // 20 years
    );
    expect(result.toNumber()).toBeGreaterThan(0);
  });

  it('falls back to gap/months when rate is near zero', () => {
    const gap = new Decimal(2_400_000);
    const months = new Decimal(240);
    const result = calculateMonthlySipRequired(gap, new Decimal(0), months);
    // should not throw; falls back to gap / months
    expect(result.toNumber()).toBeCloseTo(10_000, 0);
  });
});

// ─── calculateFire (integration) ─────────────────────────────────────────────

describe('calculateFire (integration)', () => {
  it('returns all expected fields', () => {
    const result = calculateFire(BASE_INPUTS);
    expect(result).toHaveProperty('corpusRequired');
    expect(result).toHaveProperty('currentCorpusFutureValue');
    expect(result).toHaveProperty('existingSipFutureValue');
    expect(result).toHaveProperty('corpusGap');
    expect(result).toHaveProperty('monthlySipRequired');
    expect(result).toHaveProperty('yearsToFire');
    expect(result).toHaveProperty('fireAge');
    expect(result).toHaveProperty('projections');
  });

  it('corpus gap is non-negative', () => {
    const result = calculateFire(BASE_INPUTS);
    expect(result.corpusGap.toNumber()).toBeGreaterThanOrEqual(0);
  });

  it('fireAge is between currentAge and lifeExpectancy', () => {
    const result = calculateFire(BASE_INPUTS);
    expect(result.fireAge).toBeGreaterThanOrEqual(BASE_INPUTS.currentAge);
    expect(result.fireAge).toBeLessThanOrEqual(BASE_INPUTS.lifeExpectancy);
  });

  it('projections cover at least n = yearsToRetirement entries', () => {
    const result = calculateFire(BASE_INPUTS);
    const yearsToRetirement = BASE_INPUTS.targetRetirementAge - BASE_INPUTS.currentAge;
    expect(result.projections.length).toBe(yearsToRetirement + 1);
  });

  it('corpus gap is 0 when existing corpus+SIP already exceeds corpus required', () => {
    const wealthy: FireInputs = {
      ...BASE_INPUTS,
      currentCorpus: new Decimal(100_000_000), // ₹10 Cr — clearly sufficient
      monthlyContribution: new Decimal(100_000),
    };
    const result = calculateFire(wealthy);
    expect(result.corpusGap.toNumber()).toBe(0);
    expect(result.monthlySipRequired.toNumber()).toBe(0);
  });

  it('higher return rate reduces required SIP', () => {
    const highReturn = calculateFire({
      ...BASE_INPUTS,
      expectedReturnPreRetirement: new Decimal(0.15),
    });
    const baseReturn = calculateFire(BASE_INPUTS);
    expect(highReturn.monthlySipRequired.toNumber())
      .toBeLessThan(baseReturn.monthlySipRequired.toNumber());
  });

  it('retiring later reduces required SIP (more time to compound)', () => {
    const laterRetirement = calculateFire({
      ...BASE_INPUTS,
      targetRetirementAge: 55,
    });
    const earlierRetirement = calculateFire(BASE_INPUTS);
    // Retiring 5 years later gives more compounding time — SIP should drop
    expect(laterRetirement.monthlySipRequired.toNumber())
      .toBeLessThan(earlierRetirement.monthlySipRequired.toNumber());
  });
});
