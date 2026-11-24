import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { env } from '../config/env.js';

export default fp(async (app) => {
  await app.register(cookie);
  await app.register(jwt, { secret: env.jwtAccessSecret, sign: { expiresIn: env.accessTokenTtl } });
});
