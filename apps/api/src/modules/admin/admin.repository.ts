/**
 * Administrator persistence queries.
 *
 * Every method is called only after ADMIN authorization. Select clauses keep
 * password hashes and refresh-token records out of administrative responses.
 */
import { prisma } from '../../database/prisma.js';

const productFields = {
  id: true,
  name: true,
  slug: true,
  description: true,
  sku: true,
  price: true,
  stock: true,
  imageUrl: true,
  isActive: true,
  categoryId: true,
  category: { select: { id: true, name: true, slug: true } },
  createdAt: true,
  updatedAt: true,
} as const;

const serializeProduct = (product: { price: unknown } & Record<string, unknown>) => ({
  ...product,
  price: Number(product.price),
});

export const adminRepository = {
  async stats() {
    const [products, customers, activeProducts, lowStock, categories, recentProducts] =
      await prisma.$transaction([
        prisma.product.count(),
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.product.count({ where: { isActive: true } }),
        prisma.product.count({ where: { isActive: true, stock: { lte: 5 } } }),
        prisma.category.count(),
        prisma.product.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: productFields }),
      ]);
    return {
      totals: { products, customers, activeProducts, lowStock, categories },
      recentProducts: recentProducts.map(serializeProduct),
    };
  },
  async products(input: {
    search?: string;
    categoryId?: string;
    isActive?: boolean;
    page: number;
    pageSize: number;
  }) {
    const where = {
      ...(input.search
        ? { OR: [{ name: { contains: input.search } }, { sku: { contains: input.search } }] }
        : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        select: productFields,
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      prisma.product.count({ where }),
    ]);
    return { items: items.map(serializeProduct), total };
  },
  getProduct: (id: string) => prisma.product.findUnique({ where: { id }, select: productFields }),
  createProduct: (data: {
    name: string;
    slug: string;
    description: string;
    sku: string;
    price: number;
    stock: number;
    imageUrl?: string | null;
    categoryId: string;
    isActive?: boolean;
  }) => prisma.product.create({ data, select: productFields }),
  updateProduct: (
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      sku: string;
      price: number;
      stock: number;
      imageUrl: string | null;
      categoryId: string;
      isActive: boolean;
    }>,
  ) => prisma.product.update({ where: { id }, data, select: productFields }),
  deleteProduct: (id: string) => prisma.product.delete({ where: { id } }),
  categories: (input: { search?: string; page: number; pageSize: number }) => {
    const where = input.search ? { name: { contains: input.search } } : {};
    return prisma.$transaction([
      prisma.category.findMany({
        where,
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      prisma.category.count({ where }),
    ]);
  },
  getCategory: (id: string) =>
    prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    }),
  createCategory: (data: { name: string; slug: string }) =>
    prisma.category.create({ data, include: { _count: { select: { products: true } } } }),
  updateCategory: (id: string, data: { name: string; slug: string }) =>
    prisma.category.update({
      where: { id },
      data,
      include: { _count: { select: { products: true } } },
    }),
  deleteCategory: (id: string) => prisma.category.delete({ where: { id } }),
  async customers(input: { search?: string; page: number; pageSize: number }) {
    const where = {
      role: 'CUSTOMER' as const,
      ...(input.search
        ? { OR: [{ name: { contains: input.search } }, { email: { contains: input.search } }] }
        : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  },
  getCustomer: (id: string) =>
    prisma.user.findFirst({
      where: { id, role: 'CUSTOMER' },
      select: { id: true, name: true, email: true, isActive: true, createdAt: true },
    }),
  async inventory(input: { search?: string; page: number; pageSize: number }) {
    const where = input.search
      ? { OR: [{ name: { contains: input.search } }, { sku: { contains: input.search } }] }
      : {};
    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        select: { id: true, name: true, sku: true, stock: true, isActive: true },
        orderBy: { stock: 'asc' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      prisma.product.count({ where }),
    ]);
    return { items, total };
  },
};
