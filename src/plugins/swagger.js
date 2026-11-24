import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export default fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      info: { title: 'Movers API', description: 'User module API', version: '1.0.0' },
      tags: [
        { name: 'auth', description: 'Sign in, sign out and token refresh' },
        { name: 'users', description: 'User management' },
        { name: 'roles', description: 'Role management and menu permissions' },
        { name: 'system', description: 'Health checks' },
      ],
      components: {
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
});
