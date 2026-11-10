import type { RequestHandler } from 'express';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const windowMs = 60_000;
const maxRequests = 20;

export const authRateLimit: RequestHandler = (request, response, next) => {
  const now = Date.now();
  const key = request.ip ?? 'unknown';
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > maxRequests) {
    response.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
    response.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many authentication requests. Please try again later.',
        requestId: request.requestId,
      },
    });
    return;
  }

  next();
};
