import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { SubscriptionsService } from '../../modules/subscriptions/subscriptions.service';

// Routes that don't require an active trial/subscription
const EXEMPT_PREFIXES = ['/api/v1/auth', '/api/v1/subscriptions'];

@Injectable()
export class SubscriptionInterceptor implements NestInterceptor {
  constructor(private subscriptionsService: SubscriptionsService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.userId;

    // Skip unauthenticated requests (JwtAuthGuard will handle those)
    if (!userId) return next.handle();

    // Skip auth and subscription routes
    const path: string = request.path ?? '';
    if (EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix))) return next.handle();

    const access = await this.subscriptionsService.hasAccess(userId);
    if (!access) {
      throw new ForbiddenException('Your free trial has ended. Subscribe at ₹199/mo to continue.');
    }

    return next.handle();
  }
}
