import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseDematCasCsv } from './demat-cas.parser';
import { ConfirmDematDto } from './dto/confirm-demat.dto';

@Injectable()
export class DematSyncService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Upload + parse ───────────────────────────────────────────────────────

  async uploadAndParse(userId: string, fileName: string, fileContent: string) {
    let result: ReturnType<typeof parseDematCasCsv>;

    try {
      result = parseDematCasCsv(fileContent);
    } catch (err: any) {
      await this.prisma.dematSyncSession.create({
        data: {
          userId,
          fileName,
          status: 'failed',
          parsedData: '[]',
          errorMessage: err?.message ?? 'Parse error',
        },
      });
      throw new BadRequestException(
        err?.message ?? 'Failed to parse demat CAS file.',
      );
    }

    const { holdings, depository } = result;

    const session = await this.prisma.dematSyncSession.create({
      data: {
        userId,
        fileName,
        depository,
        status: 'parsed',
        parsedData: JSON.stringify(holdings),
        holdingCount: holdings.length,
      },
    });

    return {
      sessionId: session.id,
      depository,
      holdings,
      holdingCount: holdings.length,
    };
  }

  // ── Confirm + upsert into investments ────────────────────────────────────

  async confirmSync(userId: string, dto: ConfirmDematDto) {
    const session = await this.prisma.dematSyncSession.findFirst({
      where: { id: dto.sessionId, userId, status: 'parsed' },
    });

    if (!session) {
      throw new NotFoundException(
        'Sync session not found or already confirmed.',
      );
    }

    const upserted: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const h of dto.holdings) {
        // Match by ISIN stored in notes, or by exact company name
        const existing = await tx.investment.findFirst({
          where: {
            userId,
            isActive: true,
            OR: [
              { notes: { contains: h.isin } },
              { name: h.companyName },
            ],
          },
        });

        if (existing) {
          await tx.investment.update({
            where: { id: existing.id },
            data: {
              currentValue: h.currentValue,
              notes: `ISIN: ${h.isin}`,
              updatedAt: new Date(),
            },
          });
        } else {
          await tx.investment.create({
            data: {
              userId,
              instrumentType: h.instrumentType,
              name: h.companyName,
              currentValue: h.currentValue,
              monthlyContribution: 0,
              annualContribution: 0,
              expectedReturnRate: h.expectedReturnRate,
              notes: `ISIN: ${h.isin}`,
            },
          });
        }

        upserted.push(h.companyName);
      }

      await tx.dematSyncSession.update({
        where: { id: session.id },
        data: { status: 'confirmed', importedAt: new Date() },
      });
    });

    return { imported: upserted.length, holdings: upserted };
  }

  // ── Session history ───────────────────────────────────────────────────────

  async getSessions(userId: string) {
    return this.prisma.dematSyncSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        fileName: true,
        depository: true,
        status: true,
        holdingCount: true,
        importedAt: true,
        errorMessage: true,
        createdAt: true,
      },
    });
  }
}
