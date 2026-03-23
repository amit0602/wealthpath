import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateTax, calculateHraExemption } from '../fire-calculator/calculations/tax.calculator';
import { UpsertTaxProfileDto } from './dto/upsert-tax-profile.dto';

@Injectable()
export class TaxService {
  constructor(private prisma: PrismaService) {}

  async getComparison(userId: string) {
    const profile = await this.prisma.taxProfile.findUnique({
      where: { userId_financialYear: { userId, financialYear: this.currentFY() } },
    });

    const investments = await this.prisma.investment.findMany({
      where: { userId, isActive: true },
    });

    // Auto-calculate 80C from EPF/PPF/ELSS investments
    const autoSection80c = investments
      .filter(i => ['epf', 'ppf', 'elss'].includes(i.instrumentType))
      .reduce((sum, i) => sum + Number(i.annualContribution), 0);

    const grossSalary = profile?.grossSalary ? Number(profile.grossSalary) : 0;
    const section80c = profile ? Math.max(autoSection80c, Number(profile.section80cUsed)) : autoSection80c;

    const result = calculateTax({
      grossSalary,
      hraReceived: profile ? Number(profile.hraReceived) : 0,
      rentPaid: profile ? Number(profile.rentPaid) : 0,
      isMetro: profile?.isMetro ?? true,
      section80c,
      section80d: profile ? Number(profile.section80dUsed) : 0,
      section80ccd1b: profile ? Number(profile.section80ccd1bUsed) : 0,
      homeLoanInterest: profile ? Number(profile.homeLoanInterest) : 0,
    });

    return {
      financialYear: this.currentFY(),
      ...result,
      autoDetected80c: autoSection80c,
    };
  }

  async upsertProfile(userId: string, dto: UpsertTaxProfileDto) {
    const fy = this.currentFY();
    const result = calculateTax({
      grossSalary: dto.grossSalary,
      hraReceived: dto.hraReceived,
      rentPaid: dto.rentPaid,
      isMetro: dto.isMetro,
      section80c: dto.section80cUsed,
      section80d: dto.section80dUsed,
      section80ccd1b: dto.section80ccd1bUsed,
      homeLoanInterest: dto.homeLoanInterest,
    });

    return this.prisma.taxProfile.upsert({
      where: { userId_financialYear: { userId, financialYear: fy } },
      update: {
        ...dto,
        recommendedRegime: result.recommendedRegime,
        oldRegimeTax: result.oldRegimeTax,
        newRegimeTax: result.newRegimeTax,
      },
      create: {
        userId,
        financialYear: fy,
        ...dto,
        recommendedRegime: result.recommendedRegime,
        oldRegimeTax: result.oldRegimeTax,
        newRegimeTax: result.newRegimeTax,
      },
    });
  }

  calculateHra(basicSalary: number, hraReceived: number, rentPaid: number, isMetro: boolean) {
    return calculateHraExemption(basicSalary, hraReceived, rentPaid, isMetro);
  }

  private currentFY(): string {
    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}-${String(year + 1).slice(2)}`;
  }
}
