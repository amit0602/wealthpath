import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmergencyFundService } from './emergency-fund.service';
import { UpsertEmergencyFundDto } from './dto/upsert-emergency-fund.dto';

@UseGuards(JwtAuthGuard)
@Controller('emergency-fund')
export class EmergencyFundController {
  constructor(private readonly emergencyFundService: EmergencyFundService) {}

  @Get('me')
  get(@Req() req: any) {
    return this.emergencyFundService.get(req.user.userId);
  }

  @Put('me')
  upsert(@Req() req: any, @Body() dto: UpsertEmergencyFundDto) {
    return this.emergencyFundService.upsert(req.user.userId, dto);
  }
}
