import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertEmergencyFundDto } from './dto/upsert-emergency-fund.dto';

@Injectable()
export class EmergencyFundService {
  constructor(private prisma: PrismaService) {}

  async get(userId: string) {
    const [fund, profile] = await Promise.all([
      this.prisma.emergencyFund.findUnique({ where: { userId } }),
      this.prisma.financialProfile.findUnique({ where: { userId } }),
    ]);

    const monthlyExpenses = profile ? Number(profile.monthlyExpenses) : 0;
    const targetMonths = fund?.targetMonths ?? 6;
    const liquidSavings = fund?.liquidSavings ?? 0;
    const targetAmount = monthlyExpenses * targetMonths;
    const shortfall = Math.max(0, targetAmount - liquidSavings);
    const monthsCovered = monthlyExpenses > 0 ? liquidSavings / monthlyExpenses : 0;
    const progressPct = targetAmount > 0 ? Math.min((liquidSavings / targetAmount) * 100, 100) : 0;

    return {
      liquidSavings,
      targetMonths,
      targetAmount,
      shortfall,
      monthsCovered: parseFloat(monthsCovered.toFixed(1)),
      progressPct: parseFloat(progressPct.toFixed(1)),
      monthlyExpenses,
    };
  }

  async upsert(userId: string, dto: UpsertEmergencyFundDto) {
    await this.prisma.emergencyFund.upsert({
      where: { userId },
      create: {
        userId,
        liquidSavings: dto.liquidSavings,
        targetMonths: dto.targetMonths ?? 6,
      },
      update: {
        liquidSavings: dto.liquidSavings,
        ...(dto.targetMonths !== undefined && { targetMonths: dto.targetMonths }),
      },
    });
    return this.get(userId);
  }
}
