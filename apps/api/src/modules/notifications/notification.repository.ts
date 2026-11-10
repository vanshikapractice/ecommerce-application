import { prisma } from '../../database/prisma.js';
import type { NotificationInput } from './notification.validation.js';

export const notificationRepository = {
  async create(input: NotificationInput) {
    return prisma.notification.upsert({
      where: { dedupeKey: input.dedupeKey },
      update: {},
      create: input,
    });
  },
  async list(recipientId: string, page: number, pageSize: number) {
    const where = { recipientId };
    const [notifications, total, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { recipientId, isRead: false } }),
    ]);
    return { notifications, total, unreadCount };
  },
  getForUser: (recipientId: string, id: string) =>
    prisma.notification.findFirst({ where: { id, recipientId } }),
  unreadCount: (recipientId: string) =>
    prisma.notification.count({ where: { recipientId, isRead: false } }),
  markRead: (recipientId: string, id: string) =>
    prisma.notification.updateMany({
      where: { id, recipientId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    }),
  markAllRead: (recipientId: string) =>
    prisma.notification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    }),
  adminIds: () => prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } }),
};
