import { z } from 'zod';

export const catalogueQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).optional(),
    category: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(50).default(12),
  }),
  params: z.object({}),
  body: z.object({}),
});

export const productSlugSchema = z.object({
  params: z.object({ slug: z.string().trim().min(1).max(180) }),
  query: z.object({}),
  body: z.object({}),
});
