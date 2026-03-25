import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RegisterTokenDto } from './dto/register-token.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('token')
  registerToken(@Request() req: any, @Body() dto: RegisterTokenDto) {
    return this.notificationsService.registerToken(req.user.userId, dto);
  }

  @Delete('token')
  deregisterToken(@Request() req: any, @Query('token') token: string) {
    return this.notificationsService.deregisterToken(req.user.userId, token);
  }

  @Get('preferences')
  getPreferences(@Request() req: any) {
    return this.notificationsService.getPreferences(req.user.userId);
  }

  @Put('preferences')
  updatePreferences(@Request() req: any, @Body() dto: UpdatePreferencesDto) {
    return this.notificationsService.updatePreferences(req.user.userId, dto);
  }

  @Get('logs')
  getNotificationLogs(@Request() req: any) {
    return this.notificationsService.getNotificationLogs(req.user.userId);
  }
}
