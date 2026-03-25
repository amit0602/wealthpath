import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('me')
  getMe(@Request() req: any) {
    return this.subscriptionsService.getSubscription(req.user.userId);
  }

  @Post('create-order')
  createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.subscriptionsService.createOrder(req.user.userId, dto);
  }

  @Post('verify-payment')
  verifyPayment(@Request() req: any, @Body() dto: VerifyPaymentDto) {
    return this.subscriptionsService.verifyAndActivate(req.user.userId, dto);
  }

  @Post('cancel')
  cancel(@Request() req: any) {
    return this.subscriptionsService.cancel(req.user.userId);
  }

  // Dev-only endpoint — bypasses payment for local testing
  @Post('dev-activate')
  devActivate(@Request() req: any, @Body() body: { plan?: 'monthly' | 'annual' }) {
    return this.subscriptionsService.devActivate(req.user.userId, body.plan ?? 'monthly');
  }
}
