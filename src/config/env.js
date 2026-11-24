import 'dotenv/config';

const REQUIRED = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'CORS_ORIGINS'];

function toInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) throw new Error(`Environment variable ${name} must be a number`);
  return value;
}

function toBool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['true', '1', 'yes'].includes(raw.toLowerCase());
}

function loadEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (process.env.JWT_ACCESS_SECRET.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 characters long');
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  return Object.freeze({
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
    host: process.env.HOST || '0.0.0.0',
    port: toInt('PORT', 4000),
    logLevel: process.env.LOG_LEVEL || 'info',
    databaseUrl: process.env.DATABASE_URL,
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    refreshTokenTtlDays: toInt('REFRESH_TOKEN_TTL_DAYS', 7),
    corsOrigins: process.env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    cookieSecure: toBool('COOKIE_SECURE', nodeEnv === 'production'),
    rateLimitMax: toInt('RATE_LIMIT_MAX', 200),
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    bcryptRounds: toInt('BCRYPT_ROUNDS', 12),
    allowPublicRegistration: toBool('ALLOW_PUBLIC_REGISTRATION', true),
    // Folder on this server where uploaded files are kept (file_doc.path is relative to it).
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    uploadMaxBytes: toInt('UPLOAD_MAX_BYTES', 2 * 1024 * 1024),
  });
}

export const env = loadEnv();
