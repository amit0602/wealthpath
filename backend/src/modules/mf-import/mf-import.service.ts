import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseCasCsv } from './cas.parser';
import { ConfirmImportDto } from './dto/confirm-import.dto';

@Injectable()
export class MfImportService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Upload + parse ───────────────────────────────────────────────────────

  async uploadAndParse(
    userId: string,
    fileName: string,
    fileContent: string,
  ) {
    let holdings: ReturnType<typeof parseCasCsv>;

    try {
      holdings = parseCasCsv(fileContent);
    } catch (err: any) {
      // Persist the failed session for debugging
      await this.prisma.mfImportSession.create({
        data: {
          userId,
          fileName,
          status: 'failed',
          parsedData: '[]',
          errorMessage: err?.message ?? 'Parse error',
        },
      });
      throw new BadRequestException(err?.message ?? 'Failed to parse CAS file.');
    }

    const session = await this.prisma.mfImportSession.create({
      data: {
        userId,
        fileName,
        status: 'parsed',
        parsedData: JSON.stringify(holdings),
        holdingCount: holdings.length,
      },
    });

    return { sessionId: session.id, holdings, holdingCount: holdings.length };
  }

  // ── Confirm + upsert into investments ────────────────────────────────────

  async confirmImport(userId: string, dto: ConfirmImportDto) {
    const session = await this.prisma.mfImportSession.findFirst({
      where: { id: dto.sessionId, userId, status: 'parsed' },
    });

    if (!session) {
      throw new NotFoundException('Import session not found or already confirmed.');
    }

    const upserted: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const h of dto.holdings) {
        // Try to match existing investment by ISIN (if available) or scheme name
        const existing = await tx.investment.findFirst({
          where: {
            userId,
            isActive: true,
            ...(h.isin
              ? { notes: { contains: h.isin } }
              : { name: h.schemeName }),
          },
        });

        if (existing) {
          await tx.investment.update({
            where: { id: existing.id },
            data: {
              currentValue: h.currentValue,
              // Preserve monthlyContribution — user may have set it manually
              notes: h.isin ? `ISIN: ${h.isin}` : existing.notes,
              updatedAt: new Date(),
            },
          });
        } else {
          await tx.investment.create({
            data: {
              userId,
              instrumentType: h.instrumentType,
              name: h.schemeName,
              currentValue: h.currentValue,
              monthlyContribution: 0,
              annualContribution: 0,
              expectedReturnRate: h.expectedReturnRate,
              notes: h.isin ? `ISIN: ${h.isin}` : null,
            },
          });
        }
        upserted.push(h.schemeName);
      }

      await tx.mfImportSession.update({
        where: { id: session.id },
        data: { status: 'confirmed', importedAt: new Date() },
      });
    });

    return {
      imported: upserted.length,
      fundNames: upserted,
    };
  }

  // ── Session history ───────────────────────────────────────────────────────

  async getSessions(userId: string) {
    return this.prisma.mfImportSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        fileName: true,
        status: true,
        holdingCount: true,
        importedAt: true,
        errorMessage: true,
        createdAt: true,
      },
    });
  }
}
