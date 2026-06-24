import pino from 'pino';
import { env } from '../config/env.js';

/**
 * Structured logger (pino). Pretty in dev, NDJSON in prod for log shippers.
 */
export const logger = pino({
  level: env.isProd ? 'info' : 'debug',
  base: { service: 'testask-api' },
  ...(env.isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
        },
      }
    : {}),
});

export type Logger = typeof logger;
