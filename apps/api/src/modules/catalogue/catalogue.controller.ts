import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/errors/app-error.js';
import { catalogueRepository } from './catalogue.repository.js';

export const catalogueController = {
  async list(request: Request, response: Response, next: NextFunction) {
    try {
      const search = typeof request.query.search === 'string' ? request.query.search : undefined;
      const category =
        typeof request.query.category === 'string' ? request.query.category : undefined;
      const page =
        typeof request.query.page === 'string' ? Math.max(1, Number(request.query.page)) : 1;
      const pageSize =
        typeof request.query.pageSize === 'string'
          ? Math.min(50, Math.max(1, Number(request.query.pageSize)))
          : 12;
      const result = await catalogueRepository.list({ search, category, page, pageSize });
      response.json({
        data: {
          products: result.products,
          pagination: {
            page,
            pageSize,
            total: result.total,
            pages: Math.ceil(result.total / pageSize),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getBySlug(request: Request, response: Response, next: NextFunction) {
    try {
      const slug = request.params.slug;
      if (typeof slug !== 'string')
        throw new AppError(400, 'A valid product slug is required.', 'INVALID_PRODUCT_SLUG');
      const product = await catalogueRepository.findBySlug(slug);
      if (!product) throw new AppError(404, 'Product was not found.', 'PRODUCT_NOT_FOUND');
      response.json({ data: { product: { ...product, price: Number(product.price) } } });
    } catch (error) {
      next(error);
    }
  },
};
