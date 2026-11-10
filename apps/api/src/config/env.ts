import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Resolve the backend .env from this file's location, not the shell's current
// directory. This keeps filtered pnpm and root Turbo commands consistent.
const backendEnvPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env');
dotenv.config({ path: backendEnvPath });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((value) => value.startsWith('mysql://'), {
      message: 'DATABASE_URL must be a MySQL connection URL.',
    }),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  ADMIN_URL: z.string().url().default('http://localhost:5174'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().int().positive().default(30),
  PAYMENT_PROVIDER: z.enum(['mock']).default('mock'),
  PAYMENT_CURRENCY: z.string().length(3).transform((value) => value.toUpperCase()).default('INR'),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  SEED_ADMIN_NAME: z.string().min(2).optional(),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(12).optional(),
});

const parsedEnv = envSchema.superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && !value.COOKIE_SECURE) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['COOKIE_SECURE'],
      message: 'COOKIE_SECURE must be true in production.',
    });
  }
}).safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue: z.ZodIssue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
    .join('; ');
  throw new Error(`API environment validation failed. ${details}`);
}

export const env = parsedEnv.data;
