import { z } from 'zod';

const pageQuery = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(10),
});

export const adminListSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pageQuery,
});
export const adminProductListSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pageQuery.extend({
    categoryId: z.string().optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  }),
});
export const adminIdSchema = z.object({
  body: z.object({}),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}),
});
const optionalImageUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().max(500).nullable().optional(),
);

export const adminProductBodySchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(180)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().trim().min(1),
  sku: z.string().trim().min(1).max(80),
  price: z.coerce.number().finite().nonnegative(),
  stock: z.coerce.number().int().nonnegative().max(1_000_000),
  imageUrl: optionalImageUrl,
  categoryId: z.string().min(1),
  isActive: z.boolean().optional(),
});
export const adminProductSchema = z.object({
  body: adminProductBodySchema,
  params: z.object({}),
  query: z.object({}),
});
export const adminProductUpdateSchema = z.object({
  body: adminProductBodySchema,
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}),
});
export const adminCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .regex(/^[a-z0-9-]+$/),
  }),
  params: z.object({}),
  query: z.object({}),
});
export const adminInventorySchema = z.object({
  body: z.object({ stock: z.coerce.number().int().nonnegative().max(1_000_000) }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}),
});
