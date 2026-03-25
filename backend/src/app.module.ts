import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FireCalculatorModule } from './modules/fire-calculator/fire-calculator.module';
import { InvestmentsModule } from './modules/investments/investments.module';
import { TaxModule } from './modules/tax/tax.module';
import { HealthScoreModule } from './modules/health-score/health-score.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MfImportModule } from './modules/mf-import/mf-import.module';
import { DematSyncModule } from './modules/demat-sync/demat-sync.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    FireCalculatorModule,
    InvestmentsModule,
    TaxModule,
    HealthScoreModule,
    SubscriptionsModule,
    NotificationsModule,
    MfImportModule,
    DematSyncModule,
  ],
})
export class AppModule {}
