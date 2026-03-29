import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
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
import { InsuranceModule } from './modules/insurance/insurance.module';
import { GoalsModule } from './modules/goals/goals.module';
import { EmergencyFundModule } from './modules/emergency-fund/emergency-fund.module';
import { LoansModule } from './modules/loans/loans.module';
import { SubscriptionInterceptor } from './common/interceptors/subscription.interceptor';

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
    InsuranceModule,
    GoalsModule,
    EmergencyFundModule,
    LoansModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: SubscriptionInterceptor },
  ],
})
export class AppModule {}
