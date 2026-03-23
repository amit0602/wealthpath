import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FireCalculatorModule } from './modules/fire-calculator/fire-calculator.module';
import { InvestmentsModule } from './modules/investments/investments.module';
import { TaxModule } from './modules/tax/tax.module';
import { HealthScoreModule } from './modules/health-score/health-score.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    FireCalculatorModule,
    InvestmentsModule,
    TaxModule,
    HealthScoreModule,
  ],
})
export class AppModule {}
