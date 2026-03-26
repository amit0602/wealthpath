import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertInsuranceDto } from './dto/upsert-insurance.dto';

@Injectable()
export class InsuranceService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    return this.prisma.insuranceCover.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async upsert(userId: string, dto: UpsertInsuranceDto) {
    return this.prisma.insuranceCover.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }
}
