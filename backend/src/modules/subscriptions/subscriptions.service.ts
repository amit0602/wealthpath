import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

// Amount in paise
const PLAN_PRICES: Record<'monthly' | 'annual', number> = {
  monthly: 49900,   // ₹499
  annual: 399900,   // ₹3,999
};

// Duration in days
const PLAN_DURATION_DAYS: Record<'monthly' | 'annual', number> = {
  monthly: 30,
  annual: 365,
};

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
    return sub;
  }

  async isPremium(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) return false;
    if (sub.plan !== 'premium' || sub.status !== 'active') return false;
    if (sub.expiresAt && sub.expiresAt < new Date()) return false;
    return true;
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    if (!this.razorpay) {
      throw new BadRequestException('Payment gateway not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }

    const amountPaise = PLAN_PRICES[dto.plan];
    const sub = await this.getSubscription(userId);

    const order = await this.razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      notes: { userId, plan: dto.plan },
    });

    await this.prisma.subscriptionOrder.create({
      data: {
        userId,
        subscriptionId: sub.id,
        razorpayOrderId: order.id,
        plan: dto.plan,
        amountPaise,
        status: 'pending',
      },
    });

    return {
      orderId: order.id,
      amount: amountPaise,
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

    const durationDays = PLAN_DURATION_DAYS[order.plan as 'monthly' | 'annual'];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    await this.prisma.$transaction([
      this.prisma.subscriptionOrder.update({
        where: { id: order.id },
        data: { status: 'paid', razorpayPaymentId: dto.razorpayPaymentId },
      }),
      this.prisma.subscription.update({
        where: { userId },
        data: { plan: 'premium', status: 'active', expiresAt },
      }),
    ]);

    return { message: 'Premium activated.', expiresAt };
  }

  async cancel(userId: string) {
    const sub = await this.getSubscription(userId);
    if (sub.plan !== 'premium') throw new BadRequestException('No active premium subscription.');

    await this.prisma.subscription.update({
      where: { userId },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    return { message: 'Subscription cancelled.' };
  }

  // Dev-only: instantly activate premium without payment
  async devActivate(userId: string, plan: 'monthly' | 'annual') {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException();
    }

    const durationDays = PLAN_DURATION_DAYS[plan];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const sub = await this.prisma.subscription.update({
      where: { userId },
      data: { plan: 'premium', status: 'active', expiresAt },
    });

    return { message: 'Dev premium activated.', plan: sub.plan, expiresAt: sub.expiresAt };
  }
}
