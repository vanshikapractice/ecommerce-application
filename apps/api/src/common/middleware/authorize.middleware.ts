import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { AppError } from '../errors/app-error.js';

export const authorize =
  (...allowedRoles: Role[]): RequestHandler =>
  (request, _response, next) => {
    if (!request.auth) {
      next(new AppError(401, 'Authentication is required.', 'UNAUTHENTICATED'));
      return;
    }
    if (!allowedRoles.includes(request.auth.role)) {
      next(new AppError(403, 'You do not have permission to access this resource.', 'FORBIDDEN'));
      return;
    }
    next();
  };
