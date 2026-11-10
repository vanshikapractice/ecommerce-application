import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';

const include = { order: { select: { id: true, userId: true, orderNumber: true, total: true, paymentStatus: true } } } as const;
const serialize = (payment: Prisma.PaymentGetPayload<{ include: typeof include }>) => ({
  ...payment,
  amount: Number(payment.amount),
  order: { ...payment.order, total: Number(payment.order.total) },
});

export const paymentRepository = {
  getForUser: async (id: string, userId: string) => {
    const payment = await prisma.payment.findFirst({ where: { id, order: { userId } }, include });
    return payment ? serialize(payment) : null;
  },
  getForOrder: async (orderId: string, userId: string) => {
    const payment = await prisma.payment.findFirst({ where: { orderId, order: { userId } }, include });
    return payment ? serialize(payment) : null;
  },
  createPending: async (orderId: string, provider: string, amount: Prisma.Decimal, currency: string, paymentMethod: string) =>
    prisma.payment.upsert({
      where: { orderId },
      update: { provider, amount, currency, paymentMethod, status: 'PENDING', failureReason: null },
      create: { orderId, provider, amount, currency, paymentMethod },
      include,
    }),
  updateResult: async (
    id: string,
    result: { status: 'SUCCESS' | 'FAILED' | 'CANCELLED'; reference: string; failureReason?: string },
  ) =>
    prisma.$transaction(async (transaction) => {
      const payment = await transaction.payment.findUniqueOrThrow({ where: { id } });
      if (payment.status !== 'PENDING' && payment.status !== 'PROCESSING')
        return transaction.payment.findUniqueOrThrow({ where: { id }, include });
      await transaction.payment.update({
        where: { id },
        data: {
          status: result.status,
          providerPaymentReference: result.reference,
          failureReason: result.failureReason,
        },
        include,
      });
      await transaction.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: result.status === 'SUCCESS' ? 'SUCCESS' : result.status },
      });
      return transaction.payment.findUniqueOrThrow({ where: { id }, include });
    }),
};
