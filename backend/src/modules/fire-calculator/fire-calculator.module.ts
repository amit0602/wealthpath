import { Module } from '@nestjs/common';
import { FireCalculatorController } from './fire-calculator.controller';
import { FireCalculatorService } from './fire-calculator.service';

@Module({
  controllers: [FireCalculatorController],
  providers: [FireCalculatorService],
  exports: [FireCalculatorService],
})
export class FireCalculatorModule {}
