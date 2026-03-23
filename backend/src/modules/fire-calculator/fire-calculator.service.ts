import { Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateFire, FireInputs } from './calculations/corpus.calculator';
import { FireCalculateDto } from './dto/fire-calculate.dto';

@Injectable()
export class FireCalculatorService {
  constructor(private prisma: PrismaService) {}

  async calculate(userId: string, dto: FireCalculateDto) {
    const profile = await this.prisma.financialProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Financial profile not found. Complete onboarding first.');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const currentAge = this.calculateAge(user!.dateOfBirth);

    // Sum current corpus from all active investments
    const investments = await this.prisma.investment.findMany({
      where: { userId, isActive: true },
    });
    const currentCorpus = investments.reduce(
      (sum, inv) => sum.plus(new Decimal(String(inv.currentValue))),
      new Decimal(0),
    );
    const monthlyContribution = investments.reduce(
      (sum, inv) => sum.plus(new Decimal(String(inv.monthlyContribution))),
      new Decimal(0),
    );

    const inputs: FireInputs = {
      currentAge,
      targetRetirementAge: dto.targetRetirementAge ?? profile.targetRetirementAge,
      lifeExpectancy: dto.lifeExpectancy ?? profile.lifeExpectancy,
      currentMonthlyExpenses: new Decimal(profile.monthlyExpenses.toString()),
      desiredMonthlyIncome: new Decimal(profile.desiredMonthlyIncome.toString()),
      inflationRate: new Decimal((dto.inflationRate ?? profile.inflationAssumption).toString()),
      expectedReturnPreRetirement: new Decimal((dto.expectedReturnPre ?? profile.expectedReturnPre).toString()),
      expectedReturnPostRetirement: new Decimal((dto.expectedReturnPost ?? profile.expectedReturnPost).toString()),
      withdrawalRate: new Decimal((dto.withdrawalRate ?? profile.withdrawalRate).toString()),
      currentCorpus,
      monthlyContribution,
    };

    const result = calculateFire(inputs);

    // Persist the calculation
    await this.prisma.fireCalculation.create({
      data: {
        userId,
        corpusRequired: result.corpusRequired.toNumber(),
        currentCorpusFv: result.currentCorpusFutureValue.toNumber(),
        corpusGap: result.corpusGap.toNumber(),
        monthlySipRequired: result.monthlySipRequired.toNumber(),
        yearsToFire: result.yearsToFire.toNumber(),
        fireAge: result.fireAge,
        calculationInputs: JSON.stringify(inputs),
      },
    });

    return {
      corpusRequired: result.corpusRequired,
      currentCorpusFutureValue: result.currentCorpusFutureValue,
      existingSipFutureValue: result.existingSipFutureValue,
      corpusGap: result.corpusGap,
      monthlySipRequired: result.monthlySipRequired,
      yearsToFire: result.yearsToFire,
      fireAge: result.fireAge,
      projections: result.projections,
    };
  }

  async getLatestCalculation(userId: string) {
    return this.prisma.fireCalculation.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const m = today.getMonth() - dateOfBirth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) age--;
    return age;
  }
}
