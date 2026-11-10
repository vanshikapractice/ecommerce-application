import { prisma } from '../../database/prisma.js';

export const authRepository = {
  findUserByEmail: (email: string) =>
    prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }),

  findUserById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    }),

  createUser: (data: { name: string; email: string; passwordHash: string }) =>
    prisma.user.create({
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    }),

  createRefreshToken: (data: { userId: string; tokenHash: string; expiresAt: Date }) =>
    prisma.refreshToken.create({ data }),

  findRefreshToken: (tokenHash: string) => prisma.refreshToken.findUnique({ where: { tokenHash } }),

  revokeRefreshToken: (id: string, replacedByTokenId?: string) =>
    prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedByTokenId },
    }),

  revokeAllRefreshTokens: (userId: string) =>
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),

  listRefreshTokens: (userId: string) =>
    prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    }),

  revokeOwnedRefreshToken: (userId: string, id: string) =>
    prisma.refreshToken.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
};
