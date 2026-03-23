import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';

@ApiTags('investments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(private investmentsService: InvestmentsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.investmentsService.findAll(req.user.userId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateInvestmentDto) {
    return this.investmentsService.create(req.user.userId, dto);
  }

  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateInvestmentDto) {
    return this.investmentsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.investmentsService.remove(req.user.userId, id);
  }

  @Get('allocation')
  getAllocation(@Request() req: any) {
    return this.investmentsService.getAllocationSummary(req.user.userId);
  }
}
