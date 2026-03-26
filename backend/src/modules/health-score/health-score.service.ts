import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from '../../prisma/prisma.service';

interface ScoreComponent {
  score: number;
  status: 'good' | 'warning' | 'critical';
  message: string;
  recommendation: string;
}

interface HealthScoreResult {
  overallScore: number;
  components: {
    emergencyFund: ScoreComponent;
    insurance: ScoreComponent;
    debtRatio: ScoreComponent;
    savingsRate: ScoreComponent;
    retirementTrack: ScoreComponent;
  };
}

@Injectable()
export class HealthScoreService {
  constructor(private prisma: PrismaService) {}

  async calculate(userId: string): Promise<HealthScoreResult> {
    const [profile, investments, insuranceCover] = await Promise.all([
      this.prisma.financialProfile.findUnique({ where: { userId } }),
      this.prisma.investment.findMany({ where: { userId, isActive: true } }),
      this.prisma.insuranceCover.findUnique({ where: { userId } }),
    ]);

    const monthlyExpenses = profile ? Number(profile.monthlyExpenses) : 0;
    const monthlyIncome = profile ? Number(profile.monthlyGrossIncome) : 0;
    const monthlyEmi = profile ? Number(profile.monthlyEmi) : 0;
    const totalCorpus = investments.reduce((s, i) => s + Number(i.currentValue), 0);
    const monthlyContribution = investments.reduce((s, i) => s + Number(i.monthlyContribution), 0);

    // 1. Emergency Fund: target = 6 months of expenses in liquid assets
    const liquidAssets = investments
      .filter(i => ['fd', 'rd', 'other'].includes(i.instrumentType))
      .reduce((s, i) => s + Number(i.currentValue), 0);
    const emergencyFundMonths = monthlyExpenses > 0 ? liquidAssets / monthlyExpenses : 0;
    const emergencyFund = this.scoreEmergencyFund(emergencyFundMonths);

    // 2. Insurance: score based on actual cover data (if entered)
    const insurance = this.scoreInsurance(monthlyIncome, insuranceCover);

    // 3. Debt ratio: EMI / take-home income
    const takeHome = profile ? Number(profile.monthlyTakeHome) : monthlyIncome * 0.8;
    const debtRatio = takeHome > 0 ? monthlyEmi / takeHome : 0;
    const debt = this.scoreDebtRatio(debtRatio);

    // 4. Savings rate: monthly contribution / take-home
    const savingsRate = takeHome > 0 ? monthlyContribution / takeHome : 0;
    const savings = this.scoreSavingsRate(savingsRate);

    // 5. Retirement track: compare current corpus growth vs FIRE target
    const retirementTrack = this.scoreRetirementTrack(profile, totalCorpus);

    const components = { emergencyFund, insurance, debtRatio: debt, savingsRate: savings, retirementTrack };
    const overallScore = Math.round(
      (emergencyFund.score * 0.20) +
      (insurance.score * 0.20) +
      (debt.score * 0.15) +
      (savings.score * 0.25) +
      (retirementTrack.score * 0.20),
    );

    // Persist
    await this.prisma.healthScore.create({
      data: {
        userId,
        overallScore,
        emergencyFundScore: emergencyFund.score,
        insuranceScore: insurance.score,
        debtRatioScore: debt.score,
        savingsRateScore: savings.score,
        retirementTrackScore: retirementTrack.score,
        scoreBreakdown: JSON.stringify(components),
      },
    });

    return { overallScore, components };
  }

  async getLatest(userId: string) {
    return this.prisma.healthScore.findFirst({
      where: { userId },
      orderBy: { calculatedAt: 'desc' },
    });
  }

  private scoreEmergencyFund(months: number): ScoreComponent {
    if (months >= 6) return { score: 100, status: 'good', message: `${months.toFixed(1)} months covered`, recommendation: 'Emergency fund is healthy. Consider investing surplus.' };
    if (months >= 3) return { score: 60, status: 'warning', message: `${months.toFixed(1)} months covered`, recommendation: 'Build emergency fund to 6 months. Target liquid FD/savings account.' };
    return { score: 20, status: 'critical', message: `Only ${months.toFixed(1)} months covered`, recommendation: 'Priority: Build emergency fund to at least 3 months before investing.' };
  }

  private scoreInsurance(monthlyIncome: number, cover: any): ScoreComponent {
    const annualIncome = monthlyIncome * 12;
    const recommendedTerm = annualIncome * 10;
    const recommendedHealth = 500000; // ₹5L minimum

    if (!cover || (!cover.hasTermInsurance && !cover.hasHealthInsurance)) {
      return {
        score: 0,
        status: 'critical',
        message: 'No insurance details added',
        recommendation: `Add your insurance details. Recommended: ₹${(recommendedTerm / 100000).toFixed(0)}L term cover + ₹5L health cover.`,
      };
    }

    // Term score (60% weight)
    let termScore = 0;
    if (cover.hasTermInsurance && cover.termCoverAmount > 0) {
      const ratio = annualIncome > 0 ? cover.termCoverAmount / annualIncome : 0;
      termScore = ratio >= 10 ? 100 : ratio >= 5 ? 70 : 40;
    }

    // Health score (40% weight)
    let healthScore = 0;
    if (cover.hasHealthInsurance && cover.healthCoverAmount > 0) {
      healthScore = cover.healthCoverAmount >= 1000000 ? 100 : cover.healthCoverAmount >= 500000 ? 70 : 40;
    }

    const score = Math.round(termScore * 0.6 + healthScore * 0.4);
    const status = score >= 70 ? 'good' : score >= 40 ? 'warning' : 'critical';

    const parts: string[] = [];
    if (cover.hasTermInsurance) parts.push(`Term: ₹${(cover.termCoverAmount / 100000).toFixed(0)}L`);
    else parts.push('No term insurance');
    if (cover.hasHealthInsurance) parts.push(`Health: ₹${(cover.healthCoverAmount / 100000).toFixed(0)}L`);
    else parts.push('No health insurance');

    const recs: string[] = [];
    if (!cover.hasTermInsurance || cover.termCoverAmount < recommendedTerm)
      recs.push(`Get ₹${(recommendedTerm / 100000).toFixed(0)}L term cover (10× income)`);
    if (!cover.hasHealthInsurance || cover.healthCoverAmount < recommendedHealth)
      recs.push('Get ₹5L+ health cover for family');

    return {
      score,
      status,
      message: parts.join(' · '),
      recommendation: recs.length > 0 ? recs.join('. ') : 'Insurance coverage is adequate.',
    };
  }

  private scoreDebtRatio(ratio: number): ScoreComponent {
    if (ratio <= 0.20) return { score: 100, status: 'good', message: `${(ratio * 100).toFixed(0)}% of income`, recommendation: 'Healthy debt level. Keep EMIs below 30% of take-home.' };
    if (ratio <= 0.35) return { score: 65, status: 'warning', message: `${(ratio * 100).toFixed(0)}% of income`, recommendation: 'Manageable but consider prepaying high-interest debt first.' };
    return { score: 20, status: 'critical', message: `${(ratio * 100).toFixed(0)}% of income`, recommendation: 'High debt burden. Prioritize debt reduction before increasing investments.' };
  }

  private scoreSavingsRate(rate: number): ScoreComponent {
    if (rate >= 0.30) return { score: 100, status: 'good', message: `${(rate * 100).toFixed(0)}% savings rate`, recommendation: 'Excellent savings rate. Review asset allocation to ensure optimal growth.' };
    if (rate >= 0.20) return { score: 75, status: 'good', message: `${(rate * 100).toFixed(0)}% savings rate`, recommendation: 'Good savings rate. Consider increasing by ₹2,000-5,000/month.' };
    if (rate >= 0.10) return { score: 45, status: 'warning', message: `${(rate * 100).toFixed(0)}% savings rate`, recommendation: 'Below target. Aim for 20%+ savings rate. Review discretionary expenses.' };
    return { score: 15, status: 'critical', message: `${(rate * 100).toFixed(0)}% savings rate`, recommendation: 'Critical: Very low savings rate. Create a budget and automate savings.' };
  }

  private scoreRetirementTrack(profile: any, currentCorpus: number): ScoreComponent {
    if (!profile) return { score: 0, status: 'critical', message: 'Profile incomplete', recommendation: 'Complete your financial profile to track retirement progress.' };
    // Simple heuristic: compare current corpus to age-based target
    return { score: 60, status: 'warning', message: 'On partial track', recommendation: 'Run FIRE calculator for detailed retirement projection.' };
  }
}
