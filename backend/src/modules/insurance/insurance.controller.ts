import { Body, Controller, Get, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpsertInsuranceDto } from './dto/upsert-insurance.dto';
import { InsuranceService } from './insurance.service';

@Controller('insurance')
@UseGuards(JwtAuthGuard)
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  /** GET /insurance/me — returns current insurance cover (or defaults) */
  @Get('me')
  get(@Request() req: any) {
    return this.insuranceService.get(req.user.userId);
  }

  /** PUT /insurance/me — upsert insurance cover */
  @Put('me')
  upsert(@Request() req: any, @Body() dto: UpsertInsuranceDto) {
    return this.insuranceService.upsert(req.user.userId, dto);
  }
}
