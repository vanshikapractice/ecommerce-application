import { z } from 'zod';

const paymentMethod = z.enum(['mock_card', 'mock_failure', 'mock_cancel']);

export const createPaymentSchema = z.object({
  body: z.object({
    orderId: z.string().min(1),
    paymentMethod,
  }),
  params: z.object({}),
  query: z.object({}),
});
export const paymentIdSchema = z.object({
  body: z.object({}),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}),
});

export type MockPaymentMethod = z.infer<typeof paymentMethod>;
