import type { Response } from 'express';

/**
 * Consistent JSON response envelope used across all controllers.
 *   { success: true,  data, meta? }
 *   { success: false, error: { code, message, details? } }
 */

interface SuccessOptions<T> {
  res: Response;
  data: T;
  meta?: Record<string, unknown>;
  status?: number;
}

export function sendSuccess<T>({ res, data, meta, status = 200 }: SuccessOptions<T>): Response {
  return res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
}

interface ErrorOptions {
  res: Response;
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export function sendError({
  res,
  message,
  code = 'INTERNAL_ERROR',
  status = 500,
  details,
}: ErrorOptions): Response {
  return res.status(status).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
}

export function sendPaginated<T>(
  res: Response,
  result: { items: T[]; total: number; page: number; limit: number; pages: number },
): Response {
  return sendSuccess({
    res,
    data: result.items,
    meta: {
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: result.pages,
      },
    },
  });
}
