import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/errors/app-error.js';
import { paymentService } from './payment.service.js';

const id = (request: Request) => {
  if (typeof request.params.id !== 'string')
    throw new AppError(400, 'A valid payment ID is required.', 'INVALID_ID');
  return request.params.id;
};

export const paymentController = {
  create: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const payment = await paymentService.create(
        request.auth!.sub,
        request.body.orderId,
        request.body.paymentMethod,
      );
      response.status(201).json({ data: { payment } });
    } catch (error) {
      next(error);
    }
  },
  get: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const payment = await paymentService.get(request.auth!.sub, id(request));
      if (!payment) throw new AppError(404, 'Payment was not found.', 'PAYMENT_NOT_FOUND');
      response.json({ data: { payment } });
    } catch (error) {
      next(error);
    }
  },
  getForOrder: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const orderId = request.params.id;
      if (typeof orderId !== 'string')
        throw new AppError(400, 'A valid order ID is required.', 'INVALID_ID');
      const payment = await paymentService.getForOrder(request.auth!.sub, orderId);
      if (!payment) throw new AppError(404, 'Payment was not found.', 'PAYMENT_NOT_FOUND');
      response.json({ data: { payment } });
    } catch (error) {
      next(error);
    }
  },
};
