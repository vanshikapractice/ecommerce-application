import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/errors/app-error.js';
import {
  clearRefreshCookie,
  refreshCookieName,
  setRefreshCookie,
} from '../../common/utils/auth-cookie.js';
import { authService } from './auth.service.js';

const sendAuth = (response: Response, result: Awaited<ReturnType<typeof authService.login>>) => {
  setRefreshCookie(response, result.refreshToken);
  response.status(200).json({ data: { user: result.user, accessToken: result.accessToken } });
};

export const authController = {
  register: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await authService.register(request.body);
      setRefreshCookie(response, result.refreshToken);
      response.status(201).json({ data: { user: result.user, accessToken: result.accessToken } });
    } catch (error) {
      next(error);
    }
  },

  login: async (request: Request, response: Response, next: NextFunction) => {
    try {
      sendAuth(response, await authService.login(request.body));
    } catch (error) {
      next(error);
    }
  },

  refresh: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const rawToken = request.cookies?.[refreshCookieName];
      if (!rawToken) throw new AppError(401, 'Refresh token is required.', 'MISSING_REFRESH_TOKEN');
      sendAuth(response, await authService.refresh(rawToken));
    } catch (error) {
      clearRefreshCookie(response);
      next(error);
    }
  },

  logout: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const rawToken = request.cookies?.[refreshCookieName];
      if (rawToken) {
        const session = await authService.revoke(rawToken);
        if (session && !session.revokedAt)
          await authService.revokeSession(session.userId, session.id);
      }
      clearRefreshCookie(response);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  logoutAll: async (request: Request, response: Response, next: NextFunction) => {
    try {
      await authService.revokeAll(request.auth!.sub);
      clearRefreshCookie(response);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  me: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await authService.getUser(request.auth!.sub);
      if (!user) throw new AppError(401, 'Account is unavailable.', 'ACCOUNT_UNAVAILABLE');
      response.json({ data: { user } });
    } catch (error) {
      next(error);
    }
  },

  sessions: async (request: Request, response: Response, next: NextFunction) => {
    try {
      response.json({ data: { sessions: await authService.sessions(request.auth!.sub) } });
    } catch (error) {
      next(error);
    }
  },

  revokeSession: async (request: Request, response: Response, next: NextFunction) => {
    try {
      const sessionId = request.params.sessionId;
      if (typeof sessionId !== 'string') {
        throw new AppError(400, 'A valid session ID is required.', 'INVALID_SESSION_ID');
      }
      const result = await authService.revokeSession(request.auth!.sub, sessionId);
      if (!result.count) throw new AppError(404, 'Session was not found.', 'SESSION_NOT_FOUND');
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
