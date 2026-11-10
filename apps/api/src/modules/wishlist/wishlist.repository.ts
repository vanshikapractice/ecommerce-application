/**
 * Wishlist persistence scoped to one authenticated customer.
 * The composite database key prevents duplicate products atomically.
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

export const wishlistRepository = {
  async get(userId: string) {
    const wishlist = await prisma.wishlist.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: {
        items: { include: { product: { select: productSelect } }, orderBy: { createdAt: 'desc' } },
      },
    });
    return {
      id: wishlist.id,
      items: wishlist.items.map((item) => ({
        id: item.id,
        product: { ...item.product, price: Number(item.product.price) },
      })),
    };
  },
  add: (userId: string, productId: string) =>
    prisma.$transaction(async (transaction) => {
      const product = await transaction.product.findFirst({
        where: { id: productId, isActive: true },
        select: { id: true },
      });
      if (!product) return false;
      const wishlist = await transaction.wishlist.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
      await transaction.wishlistItem.upsert({
        where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
        update: {},
        create: { wishlistId: wishlist.id, productId },
      });
      return true;
    }),
  remove: (userId: string, productId: string) =>
    prisma.wishlistItem.deleteMany({ where: { productId, wishlist: { userId } } }),
};
