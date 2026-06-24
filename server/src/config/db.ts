import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/** Tracks whether ensureIndexes has run for this process. */
let indexesEnsured = false;

export async function connectDB(): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    logger.info({ uri: maskUri(env.mongoUri) }, 'MongoDB connected');
  });
  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: env.isDev,
  });

  if (!indexesEnsured) {
    indexesEnsured = true;
    // Models register their indexes via schema.index(); Mongoose builds them
    // automatically when autoIndex=true. In prod we run them explicitly.
    if (env.isProd) {
      logger.info('Ensuring MongoDB indexes …');
      await Promise.all(
        Object.values(mongoose.models).map((m) => m.ensureIndexes()),
      );
      logger.info('Indexes ensured');
    }
  }

  return mongoose;
}

function maskUri(uri: string): string {
  return uri.replace(/(\/\/[^:]+:)[^@]+@/, '$1****@');
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
