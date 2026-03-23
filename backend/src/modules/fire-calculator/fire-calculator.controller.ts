import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FireCalculatorService } from './fire-calculator.service';
import { FireCalculateDto } from './dto/fire-calculate.dto';

@ApiTags('fire-calculator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fire')
export class FireCalculatorController {
  constructor(private fireService: FireCalculatorService) {}

  @Post('calculate')
  calculate(@Request() req: any, @Body() dto: FireCalculateDto) {
    return this.fireService.calculate(req.user.userId, dto);
  }

  @Get('latest')
  getLatest(@Request() req: any) {
    return this.fireService.getLatestCalculation(req.user.userId);
  }
}
