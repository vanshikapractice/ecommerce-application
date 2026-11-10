import { z } from 'zod';

const page = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

export const notificationListSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: page,
});
export const notificationIdSchema = z.object({
  body: z.object({}),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}),
});
export const notificationCreateSchema = z.object({
  body: z.object({
    recipientId: z.string().min(1),
    title: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(500),
    type: z.enum([
      'ORDER_PLACED',
      'ORDER_STATUS_UPDATED',
      'PAYMENT_SUCCESS',
      'PAYMENT_FAILED',
      'PAYMENT_CANCELLED',
      'SYSTEM',
    ]),
    relatedEntityType: z.string().trim().max(40).optional(),
    relatedEntityId: z.string().trim().max(191).optional(),
    dedupeKey: z.string().trim().min(1).max(255),
  }),
  params: z.object({}),
  query: z.object({}),
});

export type NotificationInput = z.infer<typeof notificationCreateSchema>['body'];
