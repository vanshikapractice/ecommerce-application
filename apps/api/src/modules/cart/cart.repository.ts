/**
 * Cart persistence and server-side pricing.
 * The repository always scopes reads and writes through the authenticated user.
 */
import { prisma } from '../../database/prisma.js';

const productSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  stock: true,
  imageUrl: true,
} as const;

export const cartRepository = {
  async get(userId: string) {
    const cart = await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: {
        items: { include: { product: { select: productSelect } }, orderBy: { createdAt: 'asc' } },
      },
    });
    const items = cart.items.map((item) => ({
      id: item.id,
      product: { ...item.product, price: Number(item.product.price) },
      quantity: item.quantity,
      subtotal: Number(item.product.price) * item.quantity,
    }));
    return {
      id: cart.id,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.subtotal, 0),
    };
  },
  findProduct: (productId: string) =>
    prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true, stock: true },
    }),
  add: (userId: string, productId: string, quantity: number) =>
    prisma.$transaction(async (transaction) => {
      const product = await transaction.product.findFirst({
        where: { id: productId, isActive: true },
        select: { id: true, stock: true },
      });
      if (!product) return { kind: 'missing' as const };
      const cart = await transaction.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
      const existing = await transaction.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId } },
      });
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      if (nextQuantity > product.stock) return { kind: 'stock' as const, stock: product.stock };
      await transaction.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId } },
        update: { quantity: nextQuantity },
        create: { cartId: cart.id, productId, quantity },
      });
      return { kind: 'ok' as const };
    }),
  async update(userId: string, productId: string, quantity: number) {
    return prisma.$transaction(async (transaction) => {
      const product = await transaction.product.findFirst({
        where: { id: productId, isActive: true },
        select: { stock: true },
      });
      if (!product || quantity > product.stock) return { count: 0, stock: product?.stock ?? 0 };
      const result = await transaction.cartItem.updateMany({
        where: { productId, quantity: { gt: 0 }, cart: { userId } },
        data: { quantity },
      });
      return { count: result.count, stock: product.stock };
    });
  },
  remove: (userId: string, productId: string) =>
    prisma.cartItem.deleteMany({ where: { productId, cart: { userId } } }),
  clear: (userId: string) => prisma.cartItem.deleteMany({ where: { cart: { userId } } }),
};
