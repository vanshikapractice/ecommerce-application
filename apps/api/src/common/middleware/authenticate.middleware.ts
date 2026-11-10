import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import { verifyAccessToken } from '../utils/token.js';

export const authenticate: RequestHandler = (request, _response, next) => {
  // The JWT subject is the only customer/admin identity accepted downstream;
  // controllers never trust a user ID supplied by the browser.
  const header = request.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    next(new AppError(401, 'Authentication is required.', 'UNAUTHENTICATED'));
    return;
  }

  try {
    request.auth = verifyAccessToken(header.slice('Bearer '.length));
    next();
  } catch {
    next(new AppError(401, 'The access token is invalid or expired.', 'INVALID_ACCESS_TOKEN'));
  }
};
