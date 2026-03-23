import { Controller, Get, Put, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateFinancialProfileDto } from './dto/update-financial-profile.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@Request() req: any) {
    return this.usersService.getMe(req.user.userId);
  }

  @Put('me')
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @Put('me/financial-profile')
  updateFinancialProfile(@Request() req: any, @Body() dto: UpdateFinancialProfileDto) {
    return this.usersService.upsertFinancialProfile(req.user.userId, dto);
  }

  @Get('me/data-export')
  exportData(@Request() req: any) {
    return this.usersService.exportData(req.user.userId);
  }

  @Delete('me')
  deleteAccount(@Request() req: any) {
    return this.usersService.deleteAccount(req.user.userId);
  }
}
