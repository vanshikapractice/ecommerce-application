/**
 * Catalogue persistence queries.
 *
 * List queries select only fields required by cards and apply pagination in
 * MySQL, avoiding the memory and latency cost of loading the whole catalogue.
 */
import { prisma } from '../../database/prisma.js';

export const catalogueRepository = {
  async list(input: { search?: string; category?: string; page: number; pageSize: number }) {
    const where = {
      isActive: true,
      ...(input.search ? { name: { contains: input.search, mode: 'insensitive' as const } } : {}),
      ...(input.category ? { category: { slug: input.category } } : {}),
    };
    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          stock: true,
          imageUrl: true,
          category: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      prisma.product.count({ where }),
    ]);
    return {
      products: products.map((product) => ({ ...product, price: Number(product.price) })),
      total,
    };
  },

  findBySlug: (slug: string) =>
    prisma.product.findFirst({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        sku: true,
        price: true,
        stock: true,
        imageUrl: true,
        category: { select: { name: true, slug: true } },
      },
    }),
};
