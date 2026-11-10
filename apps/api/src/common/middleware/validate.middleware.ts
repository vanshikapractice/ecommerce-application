import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/**
 * Validates request data before a controller runs. Keeping this boundary
 * reusable prevents each route from duplicating parsing and error handling.
 */
export const validate =
  (schema: ZodType): RequestHandler =>
  (request, _response, next) => {
    // Schemas receive one stable envelope so body, path, and query validation
    // follows the same convention across every module.
    schema.parse({
      body: request.body ?? {},
      params: request.params ?? {},
      query: request.query ?? {},
    });
    next();
  };
