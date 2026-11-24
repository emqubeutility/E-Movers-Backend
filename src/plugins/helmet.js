import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';

export default fp(async (app) => {
  await app.register(helmet, {
    // Swagger UI needs inline assets; the API itself serves no other HTML.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
      },
    },
  });
});
