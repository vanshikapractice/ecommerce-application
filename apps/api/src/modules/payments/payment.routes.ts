import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { validate } from '../../common/middleware/validate.middleware.js';
import { paymentController } from './payment.controller.js';
import { createPaymentSchema, paymentIdSchema } from './payment.validation.js';

export const paymentRouter: RouterType = Router();
paymentRouter.use(authenticate);
paymentRouter.post('/create', validate(createPaymentSchema), paymentController.create);
paymentRouter.get('/:id', validate(paymentIdSchema), paymentController.get);
