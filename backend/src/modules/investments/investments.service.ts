import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';

// Default expected returns by instrument type (conservative estimates)
const DEFAULT_RETURNS: Record<string, number> = {
  epf: 0.0815,
  ppf: 0.071,
  nps_tier1: 0.10,
  nps_tier2: 0.10,
  elss: 0.12,
  fd: 0.068,
  rd: 0.065,
  direct_equity: 0.13,
  real_estate: 0.07,
  gold: 0.08,
  sgb: 0.085,
  mutual_fund_equity: 0.12,
  mutual_fund_debt: 0.07,
  other: 0.08,
};

@Injectable()
export class InvestmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { userId, isActive: true },
      orderBy: { instrumentType: 'asc' },
    });

    const summary = this.buildAllocationSummary(investments);
    return { investments, summary };
  }

  async create(userId: string, dto: CreateInvestmentDto) {
    const expectedReturnRate = dto.expectedReturnRate ?? DEFAULT_RETURNS[dto.instrumentType] ?? 0.08;
    return this.prisma.investment.create({
      data: {
        userId,
        instrumentType: dto.instrumentType,
        name: dto.name,
        currentValue: dto.currentValue,
        monthlyContribution: dto.monthlyContribution ?? 0,
        annualContribution: dto.annualContribution ?? 0,
        expectedReturnRate,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        maturityDate: dto.maturityDate ? new Date(dto.maturityDate) : null,
        lockInUntil: dto.lockInUntil ? new Date(dto.lockInUntil) : null,
        interestRate: dto.interestRate ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateInvestmentDto) {
    const investment = await this.prisma.investment.findUnique({ where: { id } });
    if (!investment) throw new NotFoundException('Investment not found');
    if (investment.userId !== userId) throw new ForbiddenException();

    // Save value history snapshot
    const dtoAny = dto as any;
    if (dtoAny.currentValue && dtoAny.currentValue !== investment.currentValue) {
      await this.prisma.investmentValueHistory.create({
        data: { investmentId: id, recordedValue: investment.currentValue },
      });
    }

    return this.prisma.investment.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const investment = await this.prisma.investment.findUnique({ where: { id } });
    if (!investment) throw new NotFoundException('Investment not found');
    if (investment.userId !== userId) throw new ForbiddenException();

    return this.prisma.investment.update({ where: { id }, data: { isActive: false } });
  }

  async getAllocationSummary(userId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { userId, isActive: true },
    });
    return this.buildAllocationSummary(investments);
  }

  private buildAllocationSummary(investments: any[]) {
    const equityTypes = ['elss', 'direct_equity', 'mutual_fund_equity'];
    const debtTypes = ['epf', 'ppf', 'nps_tier1', 'nps_tier2', 'fd', 'rd', 'mutual_fund_debt'];
    const goldTypes = ['gold', 'sgb'];
    const realEstateTypes = ['real_estate'];

    const total = investments.reduce((s, i) => s.plus(new Decimal(i.currentValue.toString())), new Decimal(0));

    const byCategory = {
      equity: investments.filter(i => equityTypes.includes(i.instrumentType)).reduce((s, i) => s.plus(new Decimal(i.currentValue.toString())), new Decimal(0)),
      debt: investments.filter(i => debtTypes.includes(i.instrumentType)).reduce((s, i) => s.plus(new Decimal(i.currentValue.toString())), new Decimal(0)),
      gold: investments.filter(i => goldTypes.includes(i.instrumentType)).reduce((s, i) => s.plus(new Decimal(i.currentValue.toString())), new Decimal(0)),
      realEstate: investments.filter(i => realEstateTypes.includes(i.instrumentType)).reduce((s, i) => s.plus(new Decimal(i.currentValue.toString())), new Decimal(0)),
    };

    const pct = (val: Decimal) => total.gt(0) ? val.div(total).mul(100).toDecimalPlaces(1) : new Decimal(0);

    return {
      totalCorpus: total.toDecimalPlaces(2),
      allocation: {
        equity: { value: byCategory.equity.toDecimalPlaces(2), percentage: pct(byCategory.equity) },
        debt: { value: byCategory.debt.toDecimalPlaces(2), percentage: pct(byCategory.debt) },
        gold: { value: byCategory.gold.toDecimalPlaces(2), percentage: pct(byCategory.gold) },
        realEstate: { value: byCategory.realEstate.toDecimalPlaces(2), percentage: pct(byCategory.realEstate) },
      },
      monthlyContribution: investments.reduce((s, i) => s.plus(new Decimal(i.monthlyContribution.toString())), new Decimal(0)).toDecimalPlaces(2),
    };
  }
}
