import { createHash, randomBytes } from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import type { Role } from '@prisma/client';

export type AccessTokenPayload = JwtPayload & {
  sub: string;
  role: Role;
};

export const createAccessToken = (userId: string, role: Role) =>
  jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRY as jwt.SignOptions['expiresIn'],
  });

export const verifyAccessToken = (token: string) => {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (
    typeof payload === 'string' ||
    typeof payload.sub !== 'string' ||
    (payload.role !== 'CUSTOMER' && payload.role !== 'ADMIN')
  ) {
    throw new Error('Invalid access token payload');
  }
  return payload as AccessTokenPayload;
};

export const createRefreshToken = () => randomBytes(48).toString('base64url');

export const hashToken = (token: string) =>
  createHash('sha256').update(token, 'utf8').digest('hex');
