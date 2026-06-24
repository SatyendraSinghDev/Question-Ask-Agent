import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/apiError.js';
import { sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/** Convert anything thrown into a consistent JSON error envelope. */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── Zod validation ──
  if (err instanceof ZodError) {
    sendError({
      res,
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: err.flatten(),
    });
    return;
  }

  // ── Our operational errors ──
  if (err instanceof ApiError) {
    sendError({ res, status: err.status, code: err.code, message: err.message, details: err.details });
    return;
  }

  // ── Mongoose duplicate key ──
  if (isMongoDup(err)) {
    const field = parseDupField(err);
    sendError({
      res,
      status: 409,
      code: 'CONFLICT',
      message: `Resource already exists${field ? ` (${field})` : ''}`,
    });
    return;
  }

  // ── Mongoose cast / validation ──
  if (isMongooseError(err)) {
    sendError({
      res,
      status: 400,
      code: 'BAD_REQUEST',
      message: (err as Error)?.message ?? 'Bad request',
    });
    return;
  }

  // ── Multer limits ──
  if (isMulterError(err)) {
    sendError({
      res,
      status: 413,
      code: 'FILE_TOO_LARGE',
      message: 'Uploaded file exceeds the size limit',
    });
    return;
  }

  // ── Fallback ──
  logger.error({ err, path: req.path, method: req.method }, 'unhandled error');
  sendError({
    res,
    status: 500,
    code: 'INTERNAL_ERROR',
    message: env.isProd ? 'Something went wrong' : (err as Error)?.message ?? 'Unknown error',
  });
}

/** 404 handler for unmatched routes. */
export function notFound(req: Request, res: Response): void {
  sendError({ res, status: 404, code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.path}` });
}

// ── type guards ──
function isMongoDup(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}
function parseDupField(err: unknown): string | undefined {
  const wv = (err as { keyValue?: Record<string, unknown> }).keyValue;
  return wv ? Object.keys(wv).join(', ') : undefined;
}
function isMongooseError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    ['ValidationError', 'CastError', 'StrictModeError'].includes((err as { name: string }).name)
  );
}
function isMulterError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: string }).name === 'MulterError'
  );
}

/** Wrap an async route handler so rejections flow into errorHandler. */
export const asyncHandler =
  <T extends Request = Request>(fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
