import type { Role } from '@prisma/client';

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
};
