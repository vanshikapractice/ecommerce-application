import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from './app-error.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request could not be validated.',
        details: error.flatten().fieldErrors,
        requestId: request.requestId,
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    response.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'A database error occurred.',
        requestId: request.requestId,
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    response.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'The database is temporarily unavailable.',
        requestId: request.requestId,
      },
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        requestId: request.requestId,
      },
    });
    return;
  }

  console.error('Unhandled request error:', error instanceof Error ? error.message : error);
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      requestId: request.requestId,
    },
  });
};
