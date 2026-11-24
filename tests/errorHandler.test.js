import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middlewares/error-handler.js';

describe('error handler', () => {
  it('never shows the cause of an unexpected error to the caller', async () => {
    const app = Fastify({ logger: false });
    app.setErrorHandler(errorHandler);
    app.get('/boom', async () => {
      throw new Error(
        'Invalid `prisma.app_user.findUnique()` invocation: column can_sign_in does not exist',
      );
    });

    const response = await app.inject({ method: 'GET', url: '/boom' });
    const body = response.json();

    expect(response.statusCode).toBe(500);
    expect(body.message).toMatch(/^Something went wrong on our side/);
    expect(body.message).not.toMatch(/prisma|can_sign_in|invocation/i);
    await app.close();
  });
});
