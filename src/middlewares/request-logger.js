import { sanitizeValue } from '../utils/sanitize.js';

/** Adds the request id to every response, sanitizes input and logs one line per request. */
export function registerRequestHooks(app) {
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  app.addHook('preValidation', async (request) => {
    if (request.body && typeof request.body === 'object') {
      request.body = sanitizeValue(request.body);
    }
    if (request.query && typeof request.query === 'object') {
      request.query = sanitizeValue(request.query);
    }
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        url: request.routeOptions?.url || request.url,
        statusCode: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
        userId: request.user?.sub,
      },
      'request completed',
    );
  });
}
