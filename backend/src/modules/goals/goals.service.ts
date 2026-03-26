import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import Decimal from 'decimal.js';

function calculateGoalSip(
  targetAmount: number,
  targetYears: number,
  currentSavings: number,
  annualRate: number,
): { monthlyRequiredSip: number; futureValueOfCurrentSavings: number; amountStillNeeded: number } {
  const d = Decimal;
  const rate = new d(annualRate);
  const months = targetYears * 12;

  // FV of current lump-sum savings at goal horizon
  const fvSavings = new d(currentSavings).mul(
    rate.div(12).plus(1).pow(months),
  );

  const amountStillNeeded = d.max(0, new d(targetAmount).minus(fvSavings));

  let monthlyRequiredSip = new d(0);
  if (amountStillNeeded.gt(0) && months > 0) {
    const rMonthly = rate.div(12);
    // FV annuity-due factor: ((1+r)^n - 1) / r * (1+r)
    const fvFactor = rMonthly.plus(1).pow(months).minus(1).div(rMonthly).mul(rMonthly.plus(1));
    monthlyRequiredSip = amountStillNeeded.div(fvFactor);
  }

  return {
    monthlyRequiredSip: Math.ceil(monthlyRequiredSip.toNumber()),
    futureValueOfCurrentSavings: Math.round(fvSavings.toNumber()),
    amountStillNeeded: Math.round(amountStillNeeded.toNumber()),
  };
}

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  private enrich(goal: any) {
    const calc = calculateGoalSip(
      goal.targetAmount,
      goal.targetYears,
      goal.currentSavings,
      goal.expectedReturnRate,
    );
    return { ...goal, ...calc };
  }

  async list(userId: string) {
    const goals = await this.prisma.financialGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return goals.map((g) => this.enrich(g));
  }

  async create(userId: string, dto: CreateGoalDto) {
    const goal = await this.prisma.financialGoal.create({
      data: {
        userId,
        name: dto.name,
        targetAmount: dto.targetAmount,
        targetYears: dto.targetYears,
        currentSavings: dto.currentSavings ?? 0,
        expectedReturnRate: dto.expectedReturnRate ?? 0.10,
      },
    });
    return this.enrich(goal);
  }

  async update(userId: string, goalId: string, dto: UpdateGoalDto) {
    const existing = await this.prisma.financialGoal.findUnique({ where: { id: goalId } });
    if (!existing) throw new NotFoundException('Goal not found');
    if (existing.userId !== userId) throw new ForbiddenException();

    const goal = await this.prisma.financialGoal.update({
      where: { id: goalId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.targetAmount !== undefined && { targetAmount: dto.targetAmount }),
        ...(dto.targetYears !== undefined && { targetYears: dto.targetYears }),
        ...(dto.currentSavings !== undefined && { currentSavings: dto.currentSavings }),
        ...(dto.expectedReturnRate !== undefined && { expectedReturnRate: dto.expectedReturnRate }),
      },
    });
    return this.enrich(goal);
  }

  async delete(userId: string, goalId: string) {
    const existing = await this.prisma.financialGoal.findUnique({ where: { id: goalId } });
    if (!existing) throw new NotFoundException('Goal not found');
    if (existing.userId !== userId) throw new ForbiddenException();
    await this.prisma.financialGoal.delete({ where: { id: goalId } });
    return { success: true };
  }
}
