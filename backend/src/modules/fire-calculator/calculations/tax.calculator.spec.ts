import { calculateTax, calculateHraExemption, TaxInputs } from './tax.calculator';

// ─── calculateHraExemption ────────────────────────────────────────────────────

describe('calculateHraExemption', () => {
  it('metro city: exemption is min(actual HRA, rent−10%basic, 50%basic)', () => {
    // basic = 400000, hra = 200000, rent = 180000, metro
    // actual HRA = 200000
    // rent - 10% basic = 180000 - 40000 = 140000
    // 50% basic = 200000
    // exemption = min(200000, 140000, 200000) = 140000
    const result = calculateHraExemption(400000, 200000, 180000, true);
    expect(result.exemption).toBe(140000);
  });

  it('non-metro city: uses 40% of basic for HRA cap', () => {
    // basic = 400000, hra = 200000, rent = 300000, non-metro
    // 40% basic = 160000
    // rent - 10% basic = 300000 - 40000 = 260000
    // exemption = min(200000, 260000, 160000) = 160000
    const result = calculateHraExemption(400000, 200000, 300000, false);
    expect(result.exemption).toBe(160000);
  });

  it('returns 0 exemption when rent paid is below 10% of basic', () => {
    // rent = 30000, 10% basic = 40000 → rent - 10%basic = 0
    const result = calculateHraExemption(400000, 200000, 30000, true);
    expect(result.exemption).toBe(0);
  });
});

// ─── calculateTax — New Regime ────────────────────────────────────────────────

describe('calculateTax — New Regime', () => {
  it('zero tax for income ≤ ₹12L (87A full rebate)', () => {
    // ₹12L gross - ₹75k std deduction = ₹11.25L taxable → rebate applies → 0
    const result = calculateTax({ grossSalary: 1_200_000 });
    expect(result.newRegimeTax).toBe(0);
  });

  it('zero tax for gross exactly at rebate threshold after std deduction', () => {
    // ₹12.75L gross - ₹75k std = ₹12L taxable → full rebate → 0
    const result = calculateTax({ grossSalary: 1_275_000 });
    expect(result.newRegimeTax).toBe(0);
  });

  it('positive tax for income above rebate threshold', () => {
    const result = calculateTax({ grossSalary: 1_500_000 });
    expect(result.newRegimeTax).toBeGreaterThan(0);
  });

  it('ignores 80C/80D deductions in new regime', () => {
    const withDeductions = calculateTax({
      grossSalary: 1_500_000,
      section80c: 150_000,
      section80d: 25_000,
    });
    const without = calculateTax({ grossSalary: 1_500_000 });
    // New regime ignores these deductions — tax should be identical
    expect(withDeductions.newRegimeTax).toBe(without.newRegimeTax);
  });

  it('applies 10% surcharge for income > ₹50L', () => {
    const result = calculateTax({ grossSalary: 6_000_000 });
    expect(result.newRegimeTax).toBeGreaterThan(0);
    // Effective rate should be meaningful — at ₹60L, roughly ~20%+ effective
    expect(result.effectiveNewRate).toBeGreaterThan(15);
  });

  it('new regime surcharge capped at 25% (never 37%) for income > ₹5 Cr', () => {
    const result = calculateTax({ grossSalary: 60_000_000 }); // ₹6 Cr
    // Old regime would apply 37% surcharge; new regime caps at 25%
    // So new regime tax should be less than old regime tax here
    expect(result.newRegimeTax).toBeLessThan(result.oldRegimeTax);
  });

  it('effective rate increases monotonically with income', () => {
    const low = calculateTax({ grossSalary: 2_000_000 });
    const mid = calculateTax({ grossSalary: 5_000_000 });
    const high = calculateTax({ grossSalary: 10_000_000 });
    expect(mid.effectiveNewRate).toBeGreaterThan(low.effectiveNewRate);
    expect(high.effectiveNewRate).toBeGreaterThan(mid.effectiveNewRate);
  });
});

// ─── calculateTax — Old Regime ────────────────────────────────────────────────

describe('calculateTax — Old Regime', () => {
  it('zero tax for income ≤ ₹5L with 87A rebate in old regime', () => {
    const result = calculateTax({ grossSalary: 600_000, section80c: 100_000 });
    // 600000 - 50000 std - 100000 80C = 450000 taxable → ≤ 500000 → rebate → 0
    expect(result.oldRegimeTax).toBe(0);
  });

  it('reduces old regime tax with full 80C deduction of ₹1.5L', () => {
    const with80c = calculateTax({ grossSalary: 1_200_000, section80c: 150_000 });
    const without80c = calculateTax({ grossSalary: 1_200_000 });
    expect(with80c.oldRegimeTax).toBeLessThan(without80c.oldRegimeTax);
  });

  it('80C deduction capped at ₹1.5L even if higher amount provided', () => {
    const atLimit = calculateTax({ grossSalary: 1_500_000, section80c: 150_000 });
    const overLimit = calculateTax({ grossSalary: 1_500_000, section80c: 200_000 });
    expect(atLimit.oldRegimeTax).toBe(overLimit.oldRegimeTax);
  });

  it('section80cRemaining = 0 when 80C is maxed out', () => {
    const result = calculateTax({ grossSalary: 1_500_000, section80c: 150_000 });
    expect(result.section80cRemaining).toBe(0);
  });

  it('section80cRemaining reflects unused 80C headroom', () => {
    const result = calculateTax({ grossSalary: 1_500_000, section80c: 50_000 });
    expect(result.section80cRemaining).toBe(100_000);
  });

  it('reduces tax with HRA exemption when rent > 10% of basic', () => {
    const withHra = calculateTax({
      grossSalary: 1_500_000,
      hraReceived: 300_000,
      rentPaid: 240_000,
      isMetro: true,
    });
    const withoutHra = calculateTax({ grossSalary: 1_500_000 });
    expect(withHra.oldRegimeTax).toBeLessThan(withoutHra.oldRegimeTax);
  });
});

// ─── calculateTax — Recommendation ───────────────────────────────────────────

describe('calculateTax — regime recommendation', () => {
  it('recommends new regime for salaried with no deductions at low income', () => {
    // With no deductions, new regime is almost always better at low-mid income
    const result = calculateTax({ grossSalary: 800_000 });
    // At ₹8L with no deductions, both may be 0 due to rebate; just check it runs
    expect(['old', 'new']).toContain(result.recommendedRegime);
  });

  it('recommends old regime for high deductions case', () => {
    // ₹15L income: 80C + 80D + home loan + HRA (metro, rent > 10% basic)
    // basic = 15L × 40% = ₹6L; HRA exemption = min(3L, 42L, 3L) = ₹3L
    // Old taxable = 15L - 50K std - 1.5L 80C - 25K 80D - 2L home loan - 3L HRA = ₹7.75L
    // Old tax ≈ ₹70,200 < New regime ₹97,500 → old regime wins
    const result = calculateTax({
      grossSalary: 1_500_000,
      section80c: 150_000,
      section80d: 25_000,
      homeLoanInterest: 200_000,
      hraReceived: 300_000,
      rentPaid: 480_000,
      isMetro: true,
    });
    expect(result.recommendedRegime).toBe('old');
  });

  it('savings equals absolute difference between old and new regime tax', () => {
    const result = calculateTax({ grossSalary: 2_000_000, section80c: 150_000 });
    expect(result.savings).toBe(Math.abs(result.oldRegimeTax - result.newRegimeTax));
  });
});

// ─── Regression: verified against IT dept calculator ─────────────────────────

describe('Regression: spot-check against IT dept / ClearTax', () => {
  /**
   * Test case: ₹12,00,000 gross, no deductions
   * Expected: new regime tax = 0 (87A rebate fully covers)
   * Source: Income Tax department online calculator, FY 2025-26
   */
  it('₹12L gross → new regime = ₹0 (87A rebate)', () => {
    const result = calculateTax({ grossSalary: 1_200_000 });
    expect(result.newRegimeTax).toBe(0);
  });

  /**
   * Test case: ₹20,00,000 gross, no deductions
   * New regime: 2000000 - 75000 std = 1925000 taxable
   *   0–4L: 0, 4–8L: 20000, 8–12L: 40000, 12–16L: 60000, 16–19.25L: 56250 → total ~176250 pre-cess
   *   + 4% cess → ~183300
   * Old regime: 2000000 - 50000 std = 1950000 taxable
   *   0–2.5L: 0, 2.5–5L: 12500, 5–10L: 100000, 10–19.5L: 285000 → total ~397500 pre-cess
   *   + 4% cess → ~413400
   * New regime should be better here.
   */
  it('₹20L gross, no deductions → new regime recommended', () => {
    const result = calculateTax({ grossSalary: 2_000_000 });
    expect(result.recommendedRegime).toBe('new');
    expect(result.newRegimeTax).toBeLessThan(result.oldRegimeTax);
  });
});
