import { AppError } from '../../common/errors/app-error.js';
import { comparePassword, hashPassword } from '../../common/utils/password.js';
import { createAccessToken, createRefreshToken, hashToken } from '../../common/utils/token.js';
import { env } from '../../config/env.js';
import { authRepository } from './auth.repository.js';
import type { SafeUser } from './auth.types.js';

const toSafeUser = (user: SafeUser): SafeUser => user;

const issueSession = async (user: SafeUser) => {
  const refreshToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const storedSession = await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });
  return {
    accessToken: createAccessToken(user.id, user.role),
    refreshToken,
    expiresAt,
    sessionId: storedSession.id,
  };
};

export const authService = {
  /**
   * Registers a customer, hashes the password, creates a refresh-token record,
   * and returns an in-memory access token plus safe user data.
   */
  async register(input: { name: string; email: string; password: string }) {
    if (await authRepository.findUserByEmail(input.email)) {
      throw new AppError(409, 'An account with this email already exists.', 'EMAIL_IN_USE');
    }
    const user = await authRepository.createUser({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    });
    const session = await issueSession(user);
    return { user: toSafeUser(user), ...session };
  },

  async login(input: { email: string; password: string }) {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user || !(await comparePassword(input.password, user.passwordHash))) {
      throw new AppError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
    }
    if (!user.isActive) {
      throw new AppError(403, 'This account is inactive.', 'ACCOUNT_INACTIVE');
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    const session = await issueSession(safeUser);
    return { user: safeUser, ...session };
  },

  /**
   * Rotates a refresh token after checking its hash, expiry, revocation state,
   * and current account status. Reuse detection revokes every user session.
   */
  async refresh(rawToken: string) {
    const session = await authRepository.findRefreshToken(hashToken(rawToken));
    if (!session) throw new AppError(401, 'Invalid refresh token.', 'INVALID_REFRESH_TOKEN');
    if (session.revokedAt) {
      await authRepository.revokeAllRefreshTokens(session.userId);
      throw new AppError(401, 'Refresh token reuse detected.', 'REFRESH_TOKEN_REUSE');
    }
    if (session.expiresAt <= new Date()) {
      throw new AppError(401, 'Refresh token expired.', 'REFRESH_TOKEN_EXPIRED');
    }
    const user = await authRepository.findUserById(session.userId);
    if (!user || !user.isActive)
      throw new AppError(401, 'Account is unavailable.', 'ACCOUNT_UNAVAILABLE');
    const next = await issueSession(user);
    await authRepository.revokeRefreshToken(session.id, next.sessionId);
    return { user, ...next };
  },

  getUser: (userId: string) => authRepository.findUserById(userId),
  revoke: (token: string) => authRepository.findRefreshToken(hashToken(token)),
  revokeAll: (userId: string) => authRepository.revokeAllRefreshTokens(userId),
  sessions: (userId: string) => authRepository.listRefreshTokens(userId),
  revokeSession: (userId: string, sessionId: string) =>
    authRepository.revokeOwnedRefreshToken(userId, sessionId),
};
