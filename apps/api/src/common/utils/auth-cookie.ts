import type { Response } from 'express';
import { env } from '../../config/env.js';

export const refreshCookieName = 'shopsmart_refresh';

export const setRefreshCookie = (response: Response, token: string) => {
  response.cookie(refreshCookieName, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SECURE ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  });
};

export const clearRefreshCookie = (response: Response) => {
  response.clearCookie(refreshCookieName, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SECURE ? 'none' : 'lax',
    path: '/api/v1/auth',
  });
};
