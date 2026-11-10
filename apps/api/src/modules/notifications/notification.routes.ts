import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { validate } from '../../common/middleware/validate.middleware.js';
import { notificationController } from './notification.controller.js';
import { notificationIdSchema, notificationListSchema } from './notification.validation.js';

export const notificationRouter: RouterType = Router();
notificationRouter.use(authenticate);
notificationRouter.get('/', validate(notificationListSchema), notificationController.list);
notificationRouter.get('/unread-count', notificationController.unreadCount);
notificationRouter.patch('/:id/read', validate(notificationIdSchema), notificationController.markRead);
notificationRouter.patch('/read-all', notificationController.markAllRead);
