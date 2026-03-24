import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

// Equity instrument types for drift calculation
const EQUITY_TYPES = new Set([
  'direct_equity',
  'mutual_fund_equity',
  'elss',
  'sgb',
]);

// Target equity allocation (%) by risk appetite
const TARGET_EQUITY_PCT: Record<string, number> = {
  conservative: 20,
  moderate: 60,
  aggressive: 80,
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Token management ─────────────────────────────────────────────────────

  async registerToken(userId: string, dto: RegisterTokenDto) {
    await this.prisma.pushToken.upsert({
      where: { token: dto.token },
      update: { userId, platform: dto.platform, isActive: true },
      create: { userId, token: dto.token, platform: dto.platform },
    });
    return { registered: true };
  }

  async deregisterToken(userId: string, token: string) {
    await this.prisma.pushToken.updateMany({
      where: { userId, token },
      data: { isActive: false },
    });
    return { deregistered: true };
  }

  // ── Preferences ──────────────────────────────────────────────────────────

  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }

  // ── Notification logs ────────────────────────────────────────────────────

  async getNotificationLogs(userId: string) {
    return this.prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
  }

  // ── Push delivery ────────────────────────────────────────────────────────

  private async sendPushNotification(
    token: string,
    title: string,
    body: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: token, title, body, sound: 'default' }),
      });

      const result = (await response.json()) as any;
      if (result?.data?.status === 'error') {
        return { success: false, error: result.data.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? 'Unknown error' };
    }
  }

  private async notifyUser(
    userId: string,
    type: string,
    title: string,
    body: string,
  ) {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId, isActive: true },
    });

    for (const { token } of tokens) {
      const result = await this.sendPushNotification(token, title, body);
      await this.prisma.notificationLog.create({
        data: {
          userId,
          type,
          title,
          body,
          status: result.success ? 'sent' : 'failed',
          error: result.error ?? null,
        },
      });
    }
  }

  // ── Cron: daily portfolio drift check (09:00 IST every day) ─────────────

  @Cron('0 9 * * *', { timeZone: 'Asia/Kolkata' })
  async checkPortfolioDrift() {
    this.logger.log('Running daily portfolio drift check');

    const usersWithTokens = await this.prisma.pushToken.findMany({
      where: { isActive: true },
      select: { userId: true },
      distinct: ['userId'],
    });

    for (const { userId } of usersWithTokens) {
      try {
        await this.checkDriftForUser(userId);
      } catch (err) {
        this.logger.error(`Drift check failed for user ${userId}: ${err}`);
      }
    }
  }

  private async checkDriftForUser(userId: string) {
    const [prefs, profile, investments] = await Promise.all([
      this.prisma.notificationPreference.findUnique({ where: { userId } }),
      this.prisma.financialProfile.findUnique({ where: { userId } }),
      this.prisma.investment.findMany({
        where: { userId, isActive: true },
      }),
    ]);

    if (!prefs?.driftAlertsEnabled) return;
    if (!profile || investments.length === 0) return;

    const threshold = prefs.driftThresholdPercent ?? 5;
    const totalValue = investments.reduce((sum, i) => sum + i.currentValue, 0);
    if (totalValue === 0) return;

    const equityValue = investments
      .filter((i) => EQUITY_TYPES.has(i.instrumentType))
      .reduce((sum, i) => sum + i.currentValue, 0);

    const actualEquityPct = (equityValue / totalValue) * 100;
    const targetEquityPct =
      TARGET_EQUITY_PCT[profile.riskAppetite] ?? TARGET_EQUITY_PCT.moderate;
    const drift = Math.abs(actualEquityPct - targetEquityPct);

    if (drift >= threshold) {
      const direction = actualEquityPct > targetEquityPct ? 'overweight' : 'underweight';
      await this.notifyUser(
        userId,
        'drift_alert',
        'Portfolio Rebalancing Alert',
        `Your equity allocation is ${actualEquityPct.toFixed(1)}% (target: ${targetEquityPct}%). ` +
          `Equity is ${direction} by ${drift.toFixed(1)}%. Consider rebalancing.`,
      );
    }
  }

  // ── Cron: weekly tax reminder (Monday 10:00 IST) ─────────────────────────

  @Cron('0 10 * * 1', { timeZone: 'Asia/Kolkata' })
  async sendTaxReminders() {
    this.logger.log('Running weekly tax reminders');

    const usersWithTokens = await this.prisma.pushToken.findMany({
      where: { isActive: true },
      select: { userId: true },
      distinct: ['userId'],
    });

    for (const { userId } of usersWithTokens) {
      try {
        await this.checkTaxReminderForUser(userId);
      } catch (err) {
        this.logger.error(`Tax reminder failed for user ${userId}: ${err}`);
      }
    }
  }

  private async checkTaxReminderForUser(userId: string) {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (!prefs?.taxRemindersEnabled) return;

    const taxProfile = await this.prisma.taxProfile.findFirst({
      where: { userId, financialYear: 'FY2025-26' },
    });

    const sec80cUsed = taxProfile?.section80cUsed ?? 0;
    const sec80cLimit = 150000;
    const remaining = sec80cLimit - sec80cUsed;

    if (remaining > 0) {
      const formattedRemaining = remaining.toLocaleString('en-IN');
      await this.notifyUser(
        userId,
        'tax_reminder',
        '80C Tax Saving Reminder',
        `You have ₹${formattedRemaining} remaining in 80C for FY 2025-26. ` +
          `Invest in ELSS, PPF, or other 80C instruments to save tax.`,
      );
    }
  }
}
