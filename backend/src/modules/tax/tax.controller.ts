import { Controller, Get, Put, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TaxService } from './tax.service';
import { UpsertTaxProfileDto } from './dto/upsert-tax-profile.dto';
import { HraCalculateDto } from './dto/hra-calculate.dto';

@ApiTags('tax')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax')
export class TaxController {
  constructor(private taxService: TaxService) {}

  @Get('comparison')
  getComparison(@Request() req: any) {
    return this.taxService.getComparison(req.user.userId);
  }

  @Put('profile')
  upsertProfile(@Request() req: any, @Body() dto: UpsertTaxProfileDto) {
    return this.taxService.upsertProfile(req.user.userId, dto);
  }

  @Post('calculate-hra')
  calculateHra(@Body() dto: HraCalculateDto) {
    return this.taxService.calculateHra(dto.basicSalary, dto.hraReceived, dto.rentPaid, dto.isMetro);
  }
}
