import { z } from 'zod';

const address = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(40),
  line1: z.string().trim().min(3).max(191),
  line2: z.string().trim().max(191).optional(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(2).max(20),
  country: z.string().trim().min(2).max(100),
});

const page = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(10),
});

export const createOrderSchema = z.object({
  body: z.object({ shippingAddress: address }),
  params: z.object({}),
  query: z.object({}),
});
export const orderListSchema = z.object({ body: z.object({}), params: z.object({}), query: page });
export const orderIdSchema = z.object({
  body: z.object({}),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}),
});
export const cancelOrderSchema = orderIdSchema;
export const adminOrderListSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: page.extend({
    search: z.string().trim().max(100).optional(),
    status: z
      .enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
      .optional(),
  }),
});
export const adminOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}),
});

export type ShippingAddress = z.infer<typeof address>;
