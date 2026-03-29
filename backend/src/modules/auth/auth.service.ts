import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async sendOtp(phoneNumber: string): Promise<{ message: string; devOtp?: string }> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + (Number(process.env.OTP_TTL_SECONDS) || 300) * 1000);

    await this.prisma.otpRecord.create({
      data: { phoneNumber, otpHash, expiresAt },
    });

    // POC: log OTP to console instead of sending SMS
    console.log(`[OTP] ${phoneNumber}: ${otp}`);

    // Return OTP in response body in non-production environments
    const devOtp = process.env.NODE_ENV !== 'production' ? otp : undefined;
    return { message: 'OTP sent successfully', devOtp };
  }

  async verifyOtp(phoneNumber: string, otp: string): Promise<{ accessToken: string; refreshToken: string; isNewUser: boolean }> {
    const record = await this.prisma.otpRecord.findFirst({
      where: {
        phoneNumber,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const isValid = await bcrypt.compare(otp, record.otpHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.prisma.otpRecord.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    let user = await this.prisma.user.findUnique({ where: { phoneNumber } });
    const isNewUser = !user;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phoneNumber,
          fullName: '',
          dateOfBirth: new Date('1990-01-01'),
          employmentType: 'salaried',
          city: '',
          subscription: {
            create: {
              plan: 'trial',
              status: 'active',
              trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
          },
        },
      });
    }

    const payload = { sub: user.id, phone: user.phoneNumber };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
    });

    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken, isNewUser };
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret',
      });

      const records = await this.prisma.refreshToken.findMany({
        where: { userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      });

      const validRecord = await Promise.all(
        records.map(async (r) => ({
          record: r,
          valid: await bcrypt.compare(refreshToken, r.tokenHash),
        })),
      ).then((results) => results.find((r) => r.valid));

      if (!validRecord) throw new UnauthorizedException('Invalid refresh token');

      const accessToken = this.jwtService.sign({ sub: payload.sub, phone: payload.phone });
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
