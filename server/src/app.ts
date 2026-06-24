import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import path from 'node:path';
import { env } from './config/env.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/error.js';
import { logger } from './utils/logger.js';

import authRoutes from './routes/authRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import testRoutes from './routes/testRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import resultRoutes from './routes/resultRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import seedRoutes from './routes/seedRoutes.js';

export function createApp(): Express {
  const app = express();

  // ── Trust proxy (for accurate IPs behind nginx/load balancer) ──
  app.set('trust proxy', 1);

  // ── Core security & parsing middleware ──
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow same-origin/no-origin (curl, server-side) and whitelisted origins.
        if (!origin || env.corsOrigin.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());
  app.use(mongoSanitize());          // strips $ and . from payloads (NoSQL injection guard)
  app.use(hpp());                    // HTTP parameter pollution guard
  app.use(globalLimiter);

  // ── Static uploads (AI image/pdf files) ──
  app.use('/uploads', express.static(path.resolve(env.upload.dir), { maxAge: '7d' }));

  // ── Health ──
  app.get('/api/v1/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'testask-api',
        version: process.env.npm_package_version ?? '1.0.0',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        env: env.nodeEnv,
      },
    });
  });

  // ── API routes ──
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1', contentRoutes);
  app.use('/api/v1/tests', testRoutes);
  app.use('/api/v1/ai', aiRoutes);
  app.use('/api/v1/results', resultRoutes);
  app.use('/api/v1/seed', seedRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);

  // ── 404 + central error handler (last) ──
  app.use(notFound);
  app.use(errorHandler);

  logger.info('Express app configured');
  return app;
}
