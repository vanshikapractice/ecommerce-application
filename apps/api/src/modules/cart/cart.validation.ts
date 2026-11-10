import { z } from 'zod';

const productParam = z.object({ productId: z.string().min(1) });
const quantityBody = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive().max(99),
});

export const cartItemSchema = z.object({
  body: quantityBody,
  params: z.object({}),
  query: z.object({}),
});

export const cartProductSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    quantity: z.coerce.number().int().positive().max(99).default(1),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const cartProductParamSchema = z.object({
  body: z.object({}),
  params: productParam,
  query: z.object({}),
});
