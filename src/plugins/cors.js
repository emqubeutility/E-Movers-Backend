import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { env } from '../config/env.js';
import { ForbiddenError } from '../utils/errors.js';

export default fp(async (app) => {
  await app.register(cors, {
    origin(origin, callback) {
      // Non-browser clients (curl, server-to-server) send no Origin header.
      if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new ForbiddenError('Origin not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });
});
