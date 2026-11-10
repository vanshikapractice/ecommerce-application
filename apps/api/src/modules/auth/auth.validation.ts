import { z } from 'zod';

const credentials = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const registerSchema = z.object({
  body: credentials.extend({
    name: z.string().trim().min(2).max(120),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const loginSchema = z.object({
  body: credentials,
  params: z.object({}),
  query: z.object({}),
});

export const emptyRequestSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
});

export const sessionParamSchema = z.object({
  body: z.object({}),
  params: z.object({ sessionId: z.string().min(1) }),
  query: z.object({}),
});
