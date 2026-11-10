import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/errors/app-error.js';
import { wishlistRepository } from './wishlist.repository.js';

export const wishlistController = {
  async get(request: Request, response: Response, next: NextFunction) {
    try {
      response.json({ data: { wishlist: await wishlistRepository.get(request.auth!.sub) } });
    } catch (error) {
      next(error);
    }
  },
  async add(request: Request, response: Response, next: NextFunction) {
    try {
      if (!(await wishlistRepository.add(request.auth!.sub, request.body.productId)))
        throw new AppError(404, 'Product is unavailable.', 'PRODUCT_UNAVAILABLE');
      response
        .status(201)
        .json({ data: { wishlist: await wishlistRepository.get(request.auth!.sub) } });
    } catch (error) {
      next(error);
    }
  },
  async remove(request: Request, response: Response, next: NextFunction) {
    try {
      const productId = request.params.productId;
      if (typeof productId !== 'string')
        throw new AppError(400, 'A valid product ID is required.', 'INVALID_PRODUCT_ID');
      await wishlistRepository.remove(request.auth!.sub, productId);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
