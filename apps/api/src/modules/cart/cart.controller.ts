import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/errors/app-error.js';
import { cartRepository } from './cart.repository.js';

export const cartController = {
  async get(request: Request, response: Response, next: NextFunction) {
    try {
      response.json({ data: { cart: await cartRepository.get(request.auth!.sub) } });
    } catch (error) {
      next(error);
    }
  },
  async add(request: Request, response: Response, next: NextFunction) {
    try {
      const result = await cartRepository.add(
        request.auth!.sub,
        request.body.productId,
        request.body.quantity,
      );
      if (result.kind === 'missing')
        throw new AppError(404, 'Product is unavailable.', 'PRODUCT_UNAVAILABLE');
      if (result.kind === 'stock')
        throw new AppError(409, `Only ${result.stock} units are available.`, 'INSUFFICIENT_STOCK');
      response.status(201).json({ data: { cart: await cartRepository.get(request.auth!.sub) } });
    } catch (error) {
      next(error);
    }
  },
  async update(request: Request, response: Response, next: NextFunction) {
    try {
      const result = await cartRepository.update(
        request.auth!.sub,
        request.body.productId,
        request.body.quantity,
      );
      if (!result.count) {
        if (result.stock === 0)
          throw new AppError(
            404,
            'Cart item was not found or product is unavailable.',
            'CART_ITEM_NOT_FOUND',
          );
        if (request.body.quantity > result.stock)
          throw new AppError(
            409,
            `Only ${result.stock} units are available.`,
            'INSUFFICIENT_STOCK',
          );
        throw new AppError(404, 'Cart item was not found.', 'CART_ITEM_NOT_FOUND');
      }
      response.json({ data: { cart: await cartRepository.get(request.auth!.sub) } });
    } catch (error) {
      next(error);
    }
  },
  async remove(request: Request, response: Response, next: NextFunction) {
    try {
      const productId = request.params.productId;
      if (typeof productId !== 'string')
        throw new AppError(400, 'A valid product ID is required.', 'INVALID_PRODUCT_ID');
      await cartRepository.remove(request.auth!.sub, productId);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  async clear(request: Request, response: Response, next: NextFunction) {
    try {
      await cartRepository.clear(request.auth!.sub);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
