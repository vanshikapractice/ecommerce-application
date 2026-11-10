import { z } from 'zod';

export const wishlistProductSchema = z.object({
  body: z.object({ productId: z.string().min(1) }),
  params: z.object({}),
  query: z.object({}),
});

export const wishlistProductParamSchema = z.object({
  body: z.object({}),
  params: z.object({ productId: z.string().min(1) }),
  query: z.object({}),
});
