import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { authorize } from '../../common/middleware/authorize.middleware.js';
import { validate } from '../../common/middleware/validate.middleware.js';
import { adminOrderController, orderController } from './order.controller.js';
import { paymentController } from '../payments/payment.controller.js';
import {
  adminOrderListSchema,
  adminOrderStatusSchema,
  cancelOrderSchema,
  createOrderSchema,
  orderIdSchema,
  orderListSchema,
} from './order.validation.js';

export const orderRouter: RouterType = Router();
orderRouter.use(authenticate);
orderRouter.post('/', validate(createOrderSchema), orderController.create);
orderRouter.get('/', validate(orderListSchema), orderController.list);
orderRouter.get('/:id/payment', validate(orderIdSchema), paymentController.getForOrder);
orderRouter.get('/:id', validate(orderIdSchema), orderController.get);
orderRouter.patch('/:id/cancel', validate(cancelOrderSchema), orderController.cancel);

export const adminOrderRouter: RouterType = Router();
adminOrderRouter.use(authenticate, authorize('ADMIN'));
adminOrderRouter.get('/', validate(adminOrderListSchema), adminOrderController.list);
adminOrderRouter.get('/:id', validate(orderIdSchema), adminOrderController.get);
adminOrderRouter.patch('/:id/status', validate(adminOrderStatusSchema), adminOrderController.status);
