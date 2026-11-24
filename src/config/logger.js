import { randomUUID } from 'node:crypto';
import { env } from './env.js';

const REDACTED = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password',
  '*.currentPassword',
  '*.password_hash',
];

export function buildLoggerOptions() {
  if (env.isTest) return false;
  const options = { level: env.logLevel, redact: { paths: REDACTED, censor: '[redacted]' } };
  if (!env.isProduction) {
    options.transport = {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    };
  }
  return options;
}

export function genRequestId(request) {
  return request.headers['x-request-id'] || randomUUID();
}
