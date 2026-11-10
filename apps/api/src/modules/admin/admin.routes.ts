import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { authorize } from '../../common/middleware/authorize.middleware.js';
import { validate } from '../../common/middleware/validate.middleware.js';
import { adminController } from './admin.controller.js';
import {
  adminCategorySchema,
  adminIdSchema,
  adminInventorySchema,
  adminListSchema,
  adminProductListSchema,
  adminProductSchema,
  adminProductUpdateSchema,
} from './admin.validation.js';

export const adminRouter: RouterType = Router();
adminRouter.use(authenticate, authorize('ADMIN'));
adminRouter.get('/dashboard/stats', adminController.stats);
adminRouter.get('/products', validate(adminProductListSchema), adminController.products);
adminRouter.get('/products/:id', validate(adminIdSchema), adminController.getProduct);
adminRouter.post('/products', validate(adminProductSchema), adminController.createProduct);
adminRouter.patch(
  '/products/:id',
  validate(adminProductUpdateSchema),
  adminController.updateProduct,
);
adminRouter.delete('/products/:id', validate(adminIdSchema), adminController.deleteProduct);
adminRouter.get('/categories', validate(adminListSchema), adminController.categories);
adminRouter.get('/categories/:id', validate(adminIdSchema), adminController.getCategory);
adminRouter.post('/categories', validate(adminCategorySchema), adminController.createCategory);
adminRouter.patch(
  '/categories/:id',
  validate(adminIdSchema.merge(adminCategorySchema)),
  adminController.updateCategory,
);
adminRouter.delete('/categories/:id', validate(adminIdSchema), adminController.deleteCategory);
adminRouter.get('/customers', validate(adminListSchema), adminController.customers);
adminRouter.get('/customers/:id', validate(adminIdSchema), adminController.getCustomer);
adminRouter.get('/inventory', validate(adminListSchema), adminController.inventory);
adminRouter.patch(
  '/inventory/:id',
  validate(adminInventorySchema),
  adminController.updateInventory,
);
