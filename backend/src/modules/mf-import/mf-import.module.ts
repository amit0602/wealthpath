import { Module } from '@nestjs/common';
import { MfImportController } from './mf-import.controller';
import { MfImportService } from './mf-import.service';

@Module({
  controllers: [MfImportController],
  providers: [MfImportService],
})
export class MfImportModule {}
