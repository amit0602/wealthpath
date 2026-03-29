import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

// Amount in paise
const PLAN_PRICE_PAISE = 19900; // ₹199/mo
const PLAN_DURATION_DAYS = 30;

@Injectable()
export class SubscriptionsService {
  private razorpay: Razorpay | null = null;

  constructor(private prisma: PrismaService) {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    }
  }

  async getSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException('Subscription not found');

    const now = new Date();
    const trialActive = sub.plan === 'trial' && !!sub.trialEndsAt && sub.trialEndsAt > now;
    const trialExpired = sub.plan === 'trial' && !!sub.trialEndsAt && sub.trialEndsAt <= now;
    const trialDaysLeft = trialActive && sub.trialEndsAt
      ? Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return { ...sub, trialActive, trialExpired, trialDaysLeft };
  }

  async hasAccess(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) return false;

    const now = new Date();
    // Active trial
    if (sub.plan === 'trial' && sub.trialEndsAt && sub.trialEndsAt > now) return true;
    // Active paid subscription
    if (sub.plan === 'active' && sub.status === 'active') {
      if (sub.expiresAt && sub.expiresAt < now) return false;
      return true;
    }
    return false;
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    if (!this.razorpay) {
      throw new BadRequestException('Payment gateway not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }

    const sub = await this.getSubscription(userId);

    const order = await this.razorpay.orders.create({
      amount: PLAN_PRICE_PAISE,
      currency: 'INR',
      notes: { userId, plan: dto.plan },
    });

    await this.prisma.subscriptionOrder.create({
      data: {
        userId,
        subscriptionId: sub.id,
        razorpayOrderId: order.id,
        plan: dto.plan,
        amountPaise: PLAN_PRICE_PAISE,
        status: 'pending',
      },
    });

    return {
      orderId: order.id,
      amount: PLAN_PRICE_PAISE,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  async verifyAndActivate(userId: string, dto: VerifyPaymentDto) {
    const webhookSecret = process.env.RAZORPAY_KEY_SECRET;
    if (!webhookSecret) throw new BadRequestException('Payment gateway not configured.');

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      throw new BadRequestException('Invalid payment signature.');
    }

    const order = await this.prisma.subscriptionOrder.findUnique({
      where: { razorpayOrderId: dto.razorpayOrderId },
    });
    if (!order || order.userId !== userId) throw new NotFoundException('Order not found.');
    if (order.status === 'paid') return { message: 'Already activated.' };

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + PLAN_DURATION_DAYS);

    await this.prisma.$transaction([
      this.prisma.subscriptionOrder.update({
        where: { id: order.id },
        data: { status: 'paid', razorpayPaymentId: dto.razorpayPaymentId },
      }),
      this.prisma.subscription.update({
        where: { userId },
        data: { plan: 'active', status: 'active', expiresAt },
      }),
    ]);

    return { message: 'Subscription activated.', expiresAt };
  }

  async cancel(userId: string) {
    const sub = await this.getSubscription(userId);
    if (sub.plan !== 'active') throw new BadRequestException('No active subscription.');

    await this.prisma.subscription.update({
      where: { userId },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    return { message: 'Subscription cancelled.' };
  }

  // Dev-only: instantly activate without payment
  async devActivate(userId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException();
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + PLAN_DURATION_DAYS);

    const sub = await this.prisma.subscription.update({
      where: { userId },
      data: { plan: 'active', status: 'active', expiresAt },
    });

    return { message: 'Dev subscription activated.', plan: sub.plan, expiresAt: sub.expiresAt };
  }
}
