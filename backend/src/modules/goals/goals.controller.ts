import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  list(@Req() req: any) {
    return this.goalsService.list(req.user.userId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(req.user.userId, dto);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.goalsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.goalsService.delete(req.user.userId, id);
  }
}
