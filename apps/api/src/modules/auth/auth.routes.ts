import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { authorize } from '../../common/middleware/authorize.middleware.js';
import { authRateLimit } from '../../common/middleware/rate-limit.middleware.js';
import { validate } from '../../common/middleware/validate.middleware.js';
import { authController } from './auth.controller.js';
import {
  emptyRequestSchema,
  loginSchema,
  registerSchema,
  sessionParamSchema,
} from './auth.validation.js';

export const authRouter: RouterType = Router();

authRouter.post('/register', authRateLimit, validate(registerSchema), authController.register); 
authRouter.post('/login', authRateLimit, validate(loginSchema), authController.login);
authRouter.post('/refresh', authRateLimit, validate(emptyRequestSchema), authController.refresh);
authRouter.post('/logout', validate(emptyRequestSchema), authController.logout);
authRouter.post(
  '/logout-all',
  authenticate,
  validate(emptyRequestSchema),
  authController.logoutAll,
);
authRouter.get('/me', authenticate, authController.me);
authRouter.get('/sessions', authenticate, authController.sessions);
authRouter.delete(
  '/sessions/:sessionId',
  authenticate,
  validate(sessionParamSchema),
  authController.revokeSession,
);

authRouter.get('/customer/profile', authenticate, authorize('CUSTOMER'), authController.me);
authRouter.get('/admin/dashboard', authenticate, authorize('ADMIN'), authController.me);
