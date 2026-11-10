import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { type Application } from 'express';
import helmet from 'helmet';
import { healthResponseSchema } from '@ecommerce/shared';
import { env } from './config/env.js';
import { errorHandler } from './common/errors/error-handler.js';
import { notFoundHandler } from './common/middleware/not-found.middleware.js';
import { requestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { requestLoggerMiddleware } from './common/middleware/request-logger.middleware.js';
import { prisma } from './database/prisma.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { catalogueRouter } from './modules/catalogue/catalogue.routes.js';
import { cartRouter } from './modules/cart/cart.routes.js';
import { wishlistRouter } from './modules/wishlist/wishlist.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { adminOrderRouter, orderRouter } from './modules/orders/order.routes.js';
import { paymentRouter } from './modules/payments/payment.routes.js';
import { notificationRouter } from './modules/notifications/notification.routes.js';

/**
 * Builds the HTTP application without listening.
 *
 * Keeping construction separate from `server.ts` makes Supertest able to
 * exercise middleware and routes without binding a network port.
 */
export const app: Application = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);
app.use(
  cors({
    origin: [env.FRONTEND_URL, env.ADMIN_URL],
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/products', catalogueRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/wishlist', wishlistRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/admin/orders', adminOrderRouter);

app.get('/api/v1/health', async (_request, response, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const payload = healthResponseSchema.parse({
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    });

    response.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

app.use(notFoundHandler);
app.use(errorHandler);
