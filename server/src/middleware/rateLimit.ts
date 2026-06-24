import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { sendError } from '../utils/apiResponse.js';

const globalLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    sendError({
      res,
      status: 429,
      code: 'RATE_LIMITED',
      message: 'Too many requests, please slow down.',
    }),
});

/** Stricter limiter for auth endpoints — mitigates brute force. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    sendError({
      res,
      status: 429,
      code: 'AUTH_RATE_LIMITED',
      message: 'Too many auth attempts. Try again later.',
    }),
});

/** Very strict limiter for AI generation — protects token spend. */
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    sendError({
      res,
      status: 429,
      code: 'AI_RATE_LIMITED',
      message: 'AI generation quota reached for this hour.',
    }),
});

export { globalLimiter, authLimiter, aiLimiter };
