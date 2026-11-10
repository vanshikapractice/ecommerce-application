import type { NotificationInput } from './notification.validation.js';
import { emitNotification } from './notification.gateway.js';
import { notificationRepository } from './notification.repository.js';

const publicNotification = (notification: Awaited<ReturnType<typeof notificationRepository.create>>) => ({
  id: notification.id,
  title: notification.title,
  message: notification.message,
  type: notification.type,
  relatedEntityType: notification.relatedEntityType,
  relatedEntityId: notification.relatedEntityId,
  isRead: notification.isRead,
  readAt: notification.readAt,
  createdAt: notification.createdAt,
});

export const notificationService = {
  /**
   * Persists before emitting so Socket.IO is only a delivery optimization; a
   * reconnecting client can always recover from the notification API.
   */
  async create(input: NotificationInput) {
    const notification = await notificationRepository.create(input);
    emitNotification(input.recipientId, publicNotification(notification));
    return notification;
  },
  async notifyAdmins(input: Omit<NotificationInput, 'recipientId'>) {
    const admins = await notificationRepository.adminIds();
    await Promise.all(admins.map(({ id }) => notificationService.create({ ...input, recipientId: id })));
  },
  list: (recipientId: string, page: number, pageSize: number) =>
    notificationRepository.list(recipientId, page, pageSize),
  unreadCount: (recipientId: string) => notificationRepository.unreadCount(recipientId),
  markRead: (recipientId: string, id: string) => notificationRepository.markRead(recipientId, id),
  markAllRead: (recipientId: string) => notificationRepository.markAllRead(recipientId),
  public: publicNotification,
  async publish(input: NotificationInput) {
    try {
      return await notificationService.create(input);
    } catch (error) {
      console.error(
        'Notification persistence failed:',
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  },
};
