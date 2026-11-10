import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/errors/app-error.js';
import { orderRepository } from './order.repository.js';
import { notificationService } from '../notifications/notification.service.js';

const page = (request: Request) => ({
  page: typeof request.query.page === 'string' ? Number(request.query.page) : 1,
  pageSize: typeof request.query.pageSize === 'string' ? Number(request.query.pageSize) : 10,
});
const id = (request: Request) => {
  const value = request.params.id;
  if (typeof value !== 'string') throw new AppError(400, 'A valid order ID is required.', 'INVALID_ID');
  return value;
};

export const orderController = {
  create: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await orderRepository.create(request.auth!.sub, request.body.shippingAddress);
      if (result.kind === 'empty') throw new AppError(409, 'Your cart is empty.', 'EMPTY_CART');
      if (result.kind === 'unavailable')
        throw new AppError(409, `${result.product} is no longer available.`, 'PRODUCT_UNAVAILABLE');
      if (result.kind === 'stock')
        throw new AppError(409, `Insufficient stock for ${result.product}.`, 'INSUFFICIENT_STOCK');
      await notificationService.publish({
        recipientId: request.auth!.sub,
        title: 'Order placed',
        message: `Order ${result.order.orderNumber} was placed successfully.`,
        type: 'ORDER_PLACED',
        relatedEntityType: 'ORDER',
        relatedEntityId: result.order.id,
        dedupeKey: `order:${result.order.id}:placed:${result.order.updatedAt.toISOString()}`,
      });
      await notificationService.notifyAdmins({
        title: 'New order received',
        message: `Order ${result.order.orderNumber} was placed.`,
        type: 'ORDER_PLACED',
        relatedEntityType: 'ORDER',
        relatedEntityId: result.order.id,
        dedupeKey: `order:${result.order.id}:admin-placed`,
      });
      response.status(201).json({ data: { order: result.order } });
    } catch (error) {
      next(error);
    }
  },
  list: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const input = page(request);
      const result = await orderRepository.listForUser(request.auth!.sub, input.page, input.pageSize);
      response.json({ data: { orders: result.orders, pagination: { ...input, total: result.total, pages: Math.ceil(result.total / input.pageSize) } } });
    } catch (error) {
      next(error);
    }
  },
  get: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const order = await orderRepository.getForUser(request.auth!.sub, id(request));
      if (!order) throw new AppError(404, 'Order was not found.', 'ORDER_NOT_FOUND');
      response.json({ data: { order } });
    } catch (error) {
      next(error);
    }
  },
  cancel: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await orderRepository.cancel(request.auth!.sub, id(request));
      if (result.kind === 'missing') throw new AppError(404, 'Order was not found.', 'ORDER_NOT_FOUND');
      if (result.kind === 'not_cancellable')
        throw new AppError(409, `Orders in ${result.status} status cannot be cancelled.`, 'ORDER_NOT_CANCELLABLE');
      await notificationService.publish({
        recipientId: request.auth!.sub,
        title: 'Order cancelled',
        message: `Order ${result.order.orderNumber} was cancelled.`,
        type: 'ORDER_STATUS_UPDATED',
        relatedEntityType: 'ORDER',
        relatedEntityId: result.order.id,
        dedupeKey: `order:${result.order.id}:status:CANCELLED`,
      });
      response.json({ data: { order: result.order } });
    } catch (error) {
      next(error);
    }
  },
};

export const adminOrderController = {
  list: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const input = page(request);
      const result = await orderRepository.adminList({
        ...input,
        search: typeof request.query.search === 'string' ? request.query.search : undefined,
        status: typeof request.query.status === 'string' ? request.query.status as never : undefined,
      });
      response.json({ data: { orders: result.orders, pagination: { ...input, total: result.total, pages: Math.ceil(result.total / input.pageSize) } } });
    } catch (error) {
      next(error);
    }
  },
  get: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const order = await orderRepository.adminGet(id(request));
      if (!order) throw new AppError(404, 'Order was not found.', 'ORDER_NOT_FOUND');
      response.json({ data: { order } });
    } catch (error) {
      next(error);
    }
  },
  status: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await orderRepository.adminStatus(id(request), request.body.status);
      if (result.kind === 'missing') throw new AppError(404, 'Order was not found.', 'ORDER_NOT_FOUND');
      if (result.kind === 'invalid')
        throw new AppError(409, `Cannot change order from ${result.from} to ${result.to}.`, 'INVALID_STATUS_TRANSITION');
      await notificationService.publish({
        recipientId: result.order.userId,
        title: 'Order status updated',
        message: `Order ${result.order.orderNumber} is now ${result.order.status}.`,
        type: 'ORDER_STATUS_UPDATED',
        relatedEntityType: 'ORDER',
        relatedEntityId: result.order.id,
        dedupeKey: `order:${result.order.id}:status:${result.order.status}`,
      });
      response.json({ data: { order: result.order } });
    } catch (error) {
      next(error);
    }
  },
};
