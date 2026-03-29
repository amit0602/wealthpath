import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SubscriptionsService } from '../../modules/subscriptions/subscriptions.service';

@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(private subscriptionsService: SubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    if (!userId) return false;

    const premium = await this.subscriptionsService.hasAccess(userId);
    if (!premium) {
      throw new ForbiddenException('Your free trial has ended. Subscribe to continue using WealthPath.');
    }
    return true;
  }
}
