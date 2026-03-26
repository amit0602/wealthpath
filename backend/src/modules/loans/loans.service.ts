import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';

function enrichLoan(loan: any) {
  const balance = new Decimal(loan.outstandingBalance);
  const emi = new Decimal(loan.emiAmount);
  const months = loan.remainingTenureMonths;

  // Total remaining interest = EMI × months - outstanding balance
  const totalRemainingPayments = emi.mul(months);
  const totalInterestPayable = Decimal.max(0, totalRemainingPayments.minus(balance));

  // Payoff date
  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + months);

  return {
    ...loan,
    totalInterestPayable: totalInterestPayable.toDecimalPlaces(0).toNumber(),
    payoffDate: payoffDate.toISOString().slice(0, 7), // YYYY-MM
  };
}

@Injectable()
export class LoansService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    const loans = await this.prisma.loan.findMany({
      where: { userId },
      orderBy: { interestRate: 'desc' }, // highest rate first (avalanche)
    });

    const enriched = loans.map(enrichLoan);

    const totalOutstanding = enriched.reduce((s, l) => s + l.outstandingBalance, 0);
    const totalMonthlyEmi = enriched.reduce((s, l) => s + l.emiAmount, 0);
    const totalInterest = enriched.reduce((s, l) => s + l.totalInterestPayable, 0);

    // Mark the highest-rate loan as "pay first" (avalanche recommendation)
    if (enriched.length > 0) {
      enriched[0].avalancheFirst = true;
    }

    return {
      loans: enriched,
      summary: {
        totalOutstanding: Math.round(totalOutstanding),
        totalMonthlyEmi: Math.round(totalMonthlyEmi),
        totalInterestPayable: Math.round(totalInterest),
        loanCount: loans.length,
      },
    };
  }

  async create(userId: string, dto: CreateLoanDto) {
    const loan = await this.prisma.loan.create({
      data: {
        userId,
        name: dto.name,
        loanType: dto.loanType,
        outstandingBalance: dto.outstandingBalance,
        interestRate: dto.interestRate,
        remainingTenureMonths: dto.remainingTenureMonths,
        emiAmount: dto.emiAmount,
      },
    });
    return enrichLoan(loan);
  }

  async update(userId: string, loanId: string, dto: UpdateLoanDto) {
    const existing = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!existing) throw new NotFoundException('Loan not found');
    if (existing.userId !== userId) throw new ForbiddenException();

    const loan = await this.prisma.loan.update({
      where: { id: loanId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.loanType !== undefined && { loanType: dto.loanType }),
        ...(dto.outstandingBalance !== undefined && { outstandingBalance: dto.outstandingBalance }),
        ...(dto.interestRate !== undefined && { interestRate: dto.interestRate }),
        ...(dto.remainingTenureMonths !== undefined && { remainingTenureMonths: dto.remainingTenureMonths }),
        ...(dto.emiAmount !== undefined && { emiAmount: dto.emiAmount }),
      },
    });
    return enrichLoan(loan);
  }

  async delete(userId: string, loanId: string) {
    const existing = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!existing) throw new NotFoundException('Loan not found');
    if (existing.userId !== userId) throw new ForbiddenException();
    await this.prisma.loan.delete({ where: { id: loanId } });
    return { success: true };
  }
}
