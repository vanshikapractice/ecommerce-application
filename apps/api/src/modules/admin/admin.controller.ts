import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error.js';
import { adminRepository } from './admin.repository.js';

const send = (response: Response, data: unknown, status = 200) =>
  response.status(status).json({ data });

const paramId = (request: Request) => {
  const { id } = request.params;
  if (typeof id !== 'string') throw new AppError(400, 'A valid ID is required.', 'INVALID_ID');
  return id;
};

const listQuery = (request: Request) => ({
  search: typeof request.query.search === 'string' ? request.query.search : undefined,
  page: typeof request.query.page === 'string' ? Math.max(1, Number(request.query.page)) : 1,
  pageSize:
    typeof request.query.pageSize === 'string'
      ? Math.min(50, Math.max(1, Number(request.query.pageSize)))
      : 10,
});

const rethrow = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError(
      409,
      'A record with the same unique value already exists.',
      'DUPLICATE_RECORD',
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    throw new AppError(404, 'The requested record was not found.', 'RECORD_NOT_FOUND');
  }
  throw error;
};

export const adminController = {
  stats: async (_request: Request, response: Response, next: NextFunction) => {
    try {
      send(response, await adminRepository.stats());
    } catch (error) {
      next(error);
    }
  },
  products: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const query = listQuery(request);
      const result = await adminRepository.products({
        ...query,
        categoryId:
          typeof request.query.categoryId === 'string' ? request.query.categoryId : undefined,
        isActive:
          request.query.isActive === 'true'
            ? true
            : request.query.isActive === 'false'
              ? false
              : undefined,
      });
      send(response, {
        products: result.items,
        pagination: {
          ...query,
          total: result.total,
          pages: Math.ceil(result.total / query.pageSize),
        },
      });
    } catch (error) {
      next(error);
    }
  },
  getProduct: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const product = await adminRepository.getProduct(paramId(request));
      if (!product) throw new AppError(404, 'Product was not found.', 'PRODUCT_NOT_FOUND');
      send(response, { product: { ...product, price: Number(product.price) } });
    } catch (error) {
      next(error);
    }
  },
  createProduct: async (request: Request, response: Response, next: NextFunction) => {
    try {
      if (!(await adminRepository.getCategory(request.body.categoryId))) {
        throw new AppError(400, 'The selected category does not exist.', 'INVALID_CATEGORY');
      }
      const product = await adminRepository.createProduct(request.body);
      send(response, { product: { ...product, price: Number(product.price) } }, 201);
    } catch (error) {
      try {
        rethrow(error);
      } catch (nested) {
        next(nested);
      }
    }
  },
  updateProduct: async (request: Request, response: Response, next: NextFunction) => {
    try {
      if (!(await adminRepository.getCategory(request.body.categoryId))) {
        throw new AppError(400, 'The selected category does not exist.', 'INVALID_CATEGORY');
      }
      const product = await adminRepository.updateProduct(paramId(request), request.body);
      send(response, { product: { ...product, price: Number(product.price) } });
    } catch (error) {
      try {
        rethrow(error);
      } catch (nested) {
        next(nested);
      }
    }
  },
  deleteProduct: async (request: Request, response: Response, next: NextFunction) => {
    try {
      await adminRepository.deleteProduct(paramId(request));
      response.status(204).send();
    } catch (error) {
      try {
        rethrow(error);
      } catch (nested) {
        next(nested);
      }
    }
  },
  categories: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const query = listQuery(request);
      const [categories, total] = await adminRepository.categories(query);
      send(response, {
        categories,
        pagination: { ...query, total, pages: Math.ceil(total / query.pageSize) },
      });
    } catch (error) {
      next(error);
    }
  },
  getCategory: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const category = await adminRepository.getCategory(paramId(request));
      if (!category) throw new AppError(404, 'Category was not found.', 'CATEGORY_NOT_FOUND');
      send(response, { category });
    } catch (error) {
      next(error);
    }
  },
  createCategory: async (request: Request, response: Response, next: NextFunction) => {
    try {
      send(response, { category: await adminRepository.createCategory(request.body) }, 201);
    } catch (error) {
      try {
        rethrow(error);
      } catch (nested) {
        next(nested);
      }
    }
  },
  updateCategory: async (request: Request, response: Response, next: NextFunction) => {
    try {
      send(response, {
        category: await adminRepository.updateCategory(paramId(request), request.body),
      });
    } catch (error) {
      try {
        rethrow(error);
      } catch (nested) {
        next(nested);
      }
    }
  },
  deleteCategory: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const id = paramId(request);
      const category = await adminRepository.getCategory(id);
      if (category?._count.products)
        throw new AppError(
          409,
          'Cannot delete a category that still has products.',
          'CATEGORY_HAS_PRODUCTS',
        );
      await adminRepository.deleteCategory(id);
      response.status(204).send();
    } catch (error) {
      try {
        rethrow(error);
      } catch (nested) {
        next(nested);
      }
    }
  },
  customers: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const query = listQuery(request);
      const result = await adminRepository.customers(query);
      send(response, {
        customers: result.items,
        pagination: {
          ...query,
          total: result.total,
          pages: Math.ceil(result.total / query.pageSize),
        },
      });
    } catch (error) {
      next(error);
    }
  },
  getCustomer: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const customer = await adminRepository.getCustomer(paramId(request));
      if (!customer) throw new AppError(404, 'Customer was not found.', 'CUSTOMER_NOT_FOUND');
      send(response, { customer });
    } catch (error) {
      next(error);
    }
  },
  inventory: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const query = listQuery(request);
      const result = await adminRepository.inventory(query);
      send(response, {
        inventory: result.items,
        pagination: {
          ...query,
          total: result.total,
          pages: Math.ceil(result.total / query.pageSize),
        },
      });
    } catch (error) {
      next(error);
    }
  },
  updateInventory: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const product = await adminRepository.updateProduct(paramId(request), {
        stock: request.body.stock,
      });
      send(response, { product: { id: product.id, name: product.name, stock: product.stock } });
    } catch (error) {
      try {
        rethrow(error);
      } catch (nested) {
        next(nested);
      }
    }
  },
};
