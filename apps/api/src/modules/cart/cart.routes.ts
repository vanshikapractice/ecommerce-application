import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { validate } from '../../common/middleware/validate.middleware.js';
import { cartController } from './cart.controller.js';
import { cartItemSchema, cartProductParamSchema, cartProductSchema } from './cart.validation.js';

export const cartRouter: RouterType = Router();
cartRouter.use(authenticate);
cartRouter.get('/', cartController.get);
cartRouter.post('/items', validate(cartProductSchema), cartController.add);
cartRouter.patch('/items', validate(cartItemSchema), cartController.update);
cartRouter.delete('/items/:productId', validate(cartProductParamSchema), cartController.remove);
cartRouter.delete('/', cartController.clear);
