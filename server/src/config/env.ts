import dotenv from 'dotenv';

dotenv.config();

function required(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (v === undefined) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
  return v;
}

function num(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  isDev: process.env.NODE_ENV !== 'production',
  port: num('PORT', 5000),
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',

  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/testask'),

  jwt: {
    secret: required('JWT_SECRET', 'dev_insecure_secret_change_me'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_insecure_refresh_secret_change_me'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  corsOrigin: process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000',
  ],

  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    enabled: !!process.env.OPENAI_API_KEY,
  },

  // Unified AI provider config — supports 'openai' (default) and 'gemini' (free tier).
  ai: {
    provider: (process.env.AI_PROVIDER ?? (process.env.OPENAI_API_KEY ? 'openai' : 'gemini')) as
      | 'openai'
      | 'gemini',
    // Gemini (Google AI Studio / Generative Language API)
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    geminiEnabled: !!process.env.GEMINI_API_KEY,
  },

  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: num('SMTP_PORT', 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.EMAIL_FROM ?? 'TestASK AI <no-reply@testask.ai>',
  },

  upload: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxUploadMb: num('MAX_UPLOAD_MB', 25),
  },

  rateLimit: {
    windowMs: num('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    max: num('RATE_LIMIT_MAX', 300),
  },
} as const;

export type Env = typeof env;
