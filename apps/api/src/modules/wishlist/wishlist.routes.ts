import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { validate } from '../../common/middleware/validate.middleware.js';
import { wishlistController } from './wishlist.controller.js';
import { wishlistProductParamSchema, wishlistProductSchema } from './wishlist.validation.js';

export const wishlistRouter: RouterType = Router();
wishlistRouter.use(authenticate);
wishlistRouter.get('/', wishlistController.get);
wishlistRouter.post('/items', validate(wishlistProductSchema), wishlistController.add);
wishlistRouter.delete(
  '/items/:productId',
  validate(wishlistProductParamSchema),
  wishlistController.remove,
);
