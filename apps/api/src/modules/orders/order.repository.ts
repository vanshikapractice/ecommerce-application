import { randomBytes } from 'node:crypto';
import { Prisma, type OrderStatus, type PaymentStatus } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { ShippingAddress } from './order.validation.js';

const orderInclude = {
  items: { orderBy: { id: 'asc' as const } },
  user: { select: { id: true, name: true, email: true } },
} as const;

const money = (value: Prisma.Decimal | number) => Number(value);
const serialize = (order: {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: Prisma.Decimal;
  shippingCharge: Prisma.Decimal;
  discount: Prisma.Decimal;
  total: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
  shippingName: string;
  shippingPhone: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  items: Array<Record<string, unknown> & { unitPrice: Prisma.Decimal; lineTotal: Prisma.Decimal }>;
  user: { id: string; name: string; email: string };
}) => ({
  ...order,
  subtotal: money(order.subtotal),
  shippingCharge: money(order.shippingCharge),
  discount: money(order.discount),
  total: money(order.total),
  items: order.items.map((item) => ({
    ...item,
    unitPrice: money(item.unitPrice),
    lineTotal: money(item.lineTotal),
  })),
});

const orderNumber = () => `SS-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;

export const orderRepository = {
  /**
   * Creates an order from the authenticated user's current cart.
   *
   * The transaction rereads product prices and availability, conditionally
   * decrements stock, stores item snapshots, and clears the cart only after
   * the order projection has been created. Returning a tagged result lets the
   * controller translate business outcomes into stable API errors.
   */
  async create(userId: string, shippingAddress: ShippingAddress) {
    return prisma.$transaction(async (transaction) => {
      const cart = await transaction.cart.findUnique({
        where: { userId },
        include: { items: { include: { product: true } } },
      });
      if (!cart?.items.length) return { kind: 'empty' as const };

      let subtotal = new Prisma.Decimal(0);
      const items: Array<{
        productId: string;
        productName: string;
        productImageUrl: string | null;
        quantity: number;
        unitPrice: Prisma.Decimal;
        lineTotal: Prisma.Decimal;
      }> = [];
      for (const item of cart.items) {
        if (!item.product.isActive) return { kind: 'unavailable' as const, product: item.product.name };
        const updated = await transaction.product.updateMany({
          where: { id: item.productId, isActive: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (!updated.count) return { kind: 'stock' as const, product: item.product.name };
        const lineTotal = item.product.price.mul(item.quantity);
        subtotal = subtotal.add(lineTotal);
        items.push({
          productId: item.productId,
          productName: item.product.name,
          productImageUrl: item.product.imageUrl,
          quantity: item.quantity,
          unitPrice: item.product.price,
          lineTotal,
        });
      }
      const shippingCharge = subtotal.gte(100) ? new Prisma.Decimal(0) : new Prisma.Decimal(10);
      const total = subtotal.add(shippingCharge);
      const order = await transaction.order.create({
        data: {
          orderNumber: orderNumber(),
          userId,
          subtotal,
          shippingCharge,
          discount: 0,
          total,
          shippingName: shippingAddress.name,
          shippingPhone: shippingAddress.phone,
          shippingLine1: shippingAddress.line1,
          shippingLine2: shippingAddress.line2,
          shippingCity: shippingAddress.city,
          shippingState: shippingAddress.state,
          shippingPostalCode: shippingAddress.postalCode,
          shippingCountry: shippingAddress.country,
          items: { create: items },
        },
      });
      const completeOrder = await transaction.order.findUniqueOrThrow({
        where: { id: order.id },
        include: orderInclude,
      });
      await transaction.cartItem.deleteMany({ where: { cartId: cart.id } });
      return { kind: 'ok' as const, order: serialize(completeOrder) };
    });
  },
  async listForUser(userId: string, page: number, pageSize: number) {
    const where = { userId };
    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);
    return { orders: orders.map(serialize), total };
  },
  async getForUser(userId: string, id: string) {
    const order = await prisma.order.findFirst({ where: { id, userId }, include: orderInclude });
    return order ? serialize(order) : null;
  },
  async cancel(userId: string, id: string) {
    return prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findFirst({
        where: { id, userId },
        include: { items: true },
      });
      if (!order) return { kind: 'missing' as const };
      if (order.paymentStatus === 'SUCCESS')
        return { kind: 'not_cancellable' as const, status: 'PAID' as const };
      if (!['PENDING', 'CONFIRMED'].includes(order.status))
        return { kind: 'not_cancellable' as const, status: order.status };
      for (const item of order.items) {
        await transaction.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      const updated = await transaction.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: orderInclude,
      });
      return { kind: 'ok' as const, order: serialize(updated) };
    });
  },
  async adminList(input: { page: number; pageSize: number; search?: string; status?: OrderStatus }) {
    const where = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.search
        ? { OR: [{ orderNumber: { contains: input.search } }, { user: { name: { contains: input.search } } }, { user: { email: { contains: input.search } } }] }
        : {}),
    };
    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' }, skip: (input.page - 1) * input.pageSize, take: input.pageSize }),
      prisma.order.count({ where }),
    ]);
    return { orders: orders.map(serialize), total };
  },
  adminGet: async (id: string) => {
    const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
    return order ? serialize(order) : null;
  },
  /**
   * Applies the explicit order-state transition table for administrators.
   * Cancellation restores stock in the same transaction and paid orders are
   * rejected because this phase does not implement refunds.
   */
  async adminStatus(id: string, status: OrderStatus) {
    return prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findUnique({ where: { id }, include: { items: true } });
      if (!order) return { kind: 'missing' as const };
      const allowed: Record<OrderStatus, OrderStatus[]> = {
        PENDING: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['PROCESSING', 'CANCELLED'],
        PROCESSING: ['SHIPPED'],
        SHIPPED: ['DELIVERED'],
        DELIVERED: [],
        CANCELLED: [],
      };
      if (status === 'CANCELLED' && order.paymentStatus === 'SUCCESS')
        return { kind: 'invalid' as const, from: 'PAID', to: status };
      if (!allowed[order.status].includes(status)) return { kind: 'invalid' as const, from: order.status, to: status };
      if (status === 'CANCELLED') {
        for (const item of order.items) await transaction.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
      const updated = await transaction.order.update({ where: { id }, data: { status }, include: orderInclude });
      return { kind: 'ok' as const, order: serialize(updated) };
    });
  },
};
