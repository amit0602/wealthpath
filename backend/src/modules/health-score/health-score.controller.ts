import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HealthScoreService } from './health-score.service';

@ApiTags('health-score')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('health-score')
export class HealthScoreController {
  constructor(private healthScoreService: HealthScoreService) {}

  @Post('calculate')
  calculate(@Request() req: any): Promise<any> {
    return this.healthScoreService.calculate(req.user.userId);
  }

  @Get('latest')
  getLatest(@Request() req: any) {
    return this.healthScoreService.getLatest(req.user.userId);
  }
}
