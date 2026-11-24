import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { env } from '../config/env.js';
import { TooManyRequestsError } from '../utils/errors.js';

export default fp(async (app) => {
  await app.register(rateLimit, {
    max: env.rateLimitMax,
    timeWindow: env.rateLimitWindow,
    allowList: (request) => request.url === '/health',
    errorResponseBuilder: () => new TooManyRequestsError(),
  });
});

/** Stricter limit for endpoints that accept credentials. */
export const authRateLimit = { rateLimit: { max: 10, timeWindow: '1 minute' } };
