import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/errors/app-error.js';
import { notificationService } from './notification.service.js';

const page = (request: Request) => ({
  page: typeof request.query.page === 'string' ? Number(request.query.page) : 1,
  pageSize: typeof request.query.pageSize === 'string' ? Number(request.query.pageSize) : 20,
});
const id = (request: Request) => {
  if (typeof request.params.id !== 'string')
    throw new AppError(400, 'A valid notification ID is required.', 'INVALID_ID');
  return request.params.id;
};

export const notificationController = {
  list: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const input = page(request);
      const result = await notificationService.list(request.auth!.sub, input.page, input.pageSize);
      response.json({
        data: {
          notifications: result.notifications.map(notificationService.public),
          unreadCount: result.unreadCount,
          pagination: { ...input, total: result.total, pages: Math.ceil(result.total / input.pageSize) },
        },
      });
    } catch (error) {
      next(error);
    }
  },
  unreadCount: async (request: Request, response: Response, next: NextFunction) => {
    try {
      response.json({ data: { unreadCount: await notificationService.unreadCount(request.auth!.sub) } });
    } catch (error) {
      next(error);
    }
  },
  markRead: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await notificationService.markRead(request.auth!.sub, id(request));
      if (!result.count) throw new AppError(404, 'Notification was not found.', 'NOTIFICATION_NOT_FOUND');
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  markAllRead: async (request: Request, response: Response, next: NextFunction) => {
    try {
      await notificationService.markAllRead(request.auth!.sub);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
