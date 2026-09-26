import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { sendError } from '../utils/response';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only log detailed errors in non-test / non-production or when critical
  if (process.env.NODE_ENV !== 'test') {
    console.error('Unhandled Application Error:', err);
  }

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    sendError(
      res,
      'VALIDATION_ERROR',
      'Validation failed: ' + err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      400,
      err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message
      }))
    );
    return;
  }

  // 2. Prisma Database Constraint & Query Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      sendError(res, 'DUPLICATE_RESOURCE', `Unique constraint violation on: ${target}`, 409, [
        { constraint: 'UNIQUE', target }
      ]);
      return;
    }
    if (err.code === 'P2003') {
      sendError(res, 'FOREIGN_KEY_VIOLATION', 'Foreign key constraint violation: referenced record does not exist or has dependents', 409);
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 'NOT_FOUND', 'The requested record was not found in the database', 404);
      return;
    }
    sendError(res, 'DB_ERROR', `Database operation error [${err.code}]`, 400, [{ code: err.code }]);
    return;
  }

  // 3. Custom Operational Errors
  if (err.statusCode) {
    sendError(res, err.code || 'OPERATIONAL_ERROR', err.message, err.statusCode, err.details || []);
    return;
  }

  // 4. Fallback 500 (Never leak stack traces in production)
  sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Internal server error'),
    500,
    []
  );
}
