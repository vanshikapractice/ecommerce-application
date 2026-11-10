import { PrismaClient } from '@prisma/client';

/**
 * One Prisma client is shared by the API process to avoid creating a database
 * connection pool per request or per imported module.
 */
export const prisma = new PrismaClient();
