import { env } from '../../config/env.js';
import { AppError } from '../../common/errors/app-error.js';
import { paymentProvider } from './payment.factory.js';
import { paymentRepository } from './payment.repository.js';
import type { MockPaymentMethod } from './payment.validation.js';
import { prisma } from '../../database/prisma.js';
import { notificationService } from '../notifications/notification.service.js';

export const paymentService = {
  /**
   * Orchestrates a provider-backed payment without trusting browser totals or
   * status values. The stored order total is passed to the provider, the
   * provider outcome is verified server-side, and payment/order state changes
   * are persisted before notifications are published.
   */
  async create(userId: string, orderId: string, paymentMethod: MockPaymentMethod) {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new AppError(404, 'Order was not found.', 'ORDER_NOT_FOUND');
    if (order.paymentStatus === 'SUCCESS')
      throw new AppError(409, 'This order has already been paid.', 'ORDER_ALREADY_PAID');
    if (order.status === 'CANCELLED')
      throw new AppError(409, 'Cancelled orders cannot be paid.', 'ORDER_NOT_PAYABLE');
    const existing = await paymentRepository.getForOrder(order.id, userId);
    if (existing && (existing.status === 'PENDING' || existing.status === 'PROCESSING'))
      throw new AppError(409, 'A payment is already being processed for this order.', 'PAYMENT_IN_PROGRESS');

    const pending = await paymentRepository.createPending(
      order.id,
      env.PAYMENT_PROVIDER,
      order.total,
      env.PAYMENT_CURRENCY,
      paymentMethod,
    );
    const providerPayment = await paymentProvider.createPayment({
      amount: order.total.toFixed(2),
      currency: env.PAYMENT_CURRENCY,
      paymentMethod,
    });
    const verified = await paymentProvider.verifyPayment(providerPayment.reference);
    const payment = await paymentRepository.updateResult(pending.id, {
      status: verified.outcome,
      reference: verified.reference,
      failureReason: verified.failureReason,
    });
    const notificationType = {
      SUCCESS: 'PAYMENT_SUCCESS',
      FAILED: 'PAYMENT_FAILED',
      CANCELLED: 'PAYMENT_CANCELLED',
    }[verified.outcome] as 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'PAYMENT_CANCELLED';
    await notificationService.publish({
      recipientId: userId,
      title: `Payment ${verified.outcome.toLowerCase()}`,
      message: verified.failureReason ?? `Payment for order ${payment.order.orderNumber} completed.`,
      type: notificationType,
      relatedEntityType: 'PAYMENT',
      relatedEntityId: payment.id,
      dedupeKey: `payment:${payment.id}:${verified.outcome}`,
    });
    if (verified.outcome !== 'SUCCESS') {
      await notificationService.notifyAdmins({
        title: 'Payment attention required',
        message: `Payment for order ${payment.order.orderNumber} was ${verified.outcome.toLowerCase()}.`,
        type: notificationType,
        relatedEntityType: 'PAYMENT',
        relatedEntityId: payment.id,
        dedupeKey: `payment:${payment.id}:admin:${verified.outcome}`,
      });
    }
    return payment;
  },
  get: (userId: string, id: string) => paymentRepository.getForUser(id, userId),
  getForOrder: (userId: string, orderId: string) => paymentRepository.getForOrder(orderId, userId),
};
