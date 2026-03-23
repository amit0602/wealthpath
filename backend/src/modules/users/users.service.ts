import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateFinancialProfileDto } from './dto/update-financial-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: { financialProfile: true, subscription: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        employmentType: dto.employmentType,
        city: dto.city,
        cityTier: dto.cityTier,
      },
    });
  }

  async upsertFinancialProfile(userId: string, dto: UpdateFinancialProfileDto) {
    return this.prisma.financialProfile.upsert({
      where: { userId },
      update: { ...(dto as any) },
      create: {
        userId,
        monthlyGrossIncome: dto.monthlyGrossIncome ?? 0,
        monthlyTakeHome: dto.monthlyTakeHome ?? 0,
        monthlyExpenses: dto.monthlyExpenses ?? 0,
        monthlyEmi: dto.monthlyEmi ?? 0,
        dependentsCount: dto.dependentsCount ?? 0,
        riskAppetite: dto.riskAppetite ?? 'moderate',
        targetRetirementAge: dto.targetRetirementAge ?? 60,
        desiredMonthlyIncome: dto.desiredMonthlyIncome ?? 0,
        retirementCity: dto.retirementCity ?? '',
        retirementCityTier: dto.retirementCityTier ?? 'metro',
        inflationAssumption: dto.inflationAssumption ?? 0.06,
        expectedReturnPre: dto.expectedReturnPre ?? 0.12,
        expectedReturnPost: dto.expectedReturnPost ?? 0.07,
        withdrawalRate: dto.withdrawalRate ?? 0.0333,
        lifeExpectancy: dto.lifeExpectancy ?? 85,
      },
    });
  }

  async deleteAccount(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
    return { message: 'Account scheduled for deletion within 30 days per DPDP Act 2023' };
  }

  async exportData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        financialProfile: true,
        investments: true,
        fireCalculations: true,
        taxProfile: true,
        healthScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
        consentRecords: true,
      },
    });
    return user;
  }
}
