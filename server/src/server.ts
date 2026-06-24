import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { seedIfEmpty } from './controllers/seedController.js';
import './models/index.js'; // register all schemas on import

async function bootstrap(): Promise<void> {
  try {
    await connectDB();

    // Auto-seed an empty database (first boot in production) so the admin
    // account + sample data exist without a manual step. Idempotent + non-fatal.
    await seedIfEmpty().catch((err) => {
      logger.warn({ err }, 'Auto-seed skipped/failed (non-fatal)');
    });

    const app = createApp();
    const server = app.listen(env.port, () => {
      logger.info({ port: env.port, env: env.nodeEnv }, '🚀 TestASK AI API listening');
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutting down gracefully…');
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
      // Force-exit after 10s if connections hang
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'unhandledRejection');
    });
    process.on('uncaughtException', (err) => {
      logger.error({ err }, 'uncaughtException');
      process.exit(1);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to bootstrap server');
    process.exit(1);
  }
}

void bootstrap();
