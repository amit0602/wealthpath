import { Module } from '@nestjs/common';
import { DematSyncController } from './demat-sync.controller';
import { DematSyncService } from './demat-sync.service';

@Module({
  controllers: [DematSyncController],
  providers: [DematSyncService],
})
export class DematSyncModule {}
