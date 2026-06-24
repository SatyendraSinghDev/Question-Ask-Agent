import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ApiError } from '../utils/apiError.js';

/**
 * Accepts a Zod schema describing the request shape: `z.object({ body, query, params })`.
 * Each present part is parsed in place. Throws ApiError(422) on failure.
 */
export function validate(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as { body?: unknown; query?: unknown; params?: unknown };

      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query as never;
      if (parsed.params !== undefined) req.params = parsed.params as never;
      next();
    } catch (err) {
      next(ApiError.unprocessable('Validation failed', err));
    }
  };
}
