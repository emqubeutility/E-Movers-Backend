import { authenticate } from '../../middlewares/auth.js';
import { authRateLimit } from '../../plugins/rate-limit.js';
import { createAuthController } from './auth.controller.js';
import {
  loginSchema,
  logoutSchema,
  refreshSchema,
  switchOrganizationSchema,
} from './auth.schema.js';

export default async function authRoutes(app) {
  const controller = createAuthController(app.authService);

  app.post('/login', { schema: loginSchema, config: authRateLimit }, controller.login);
  app.post('/refresh', { schema: refreshSchema }, controller.refresh);
  app.post(
    '/switch-organization',
    { schema: switchOrganizationSchema, preHandler: authenticate },
    controller.switchOrganization,
  );
  app.post('/logout', { schema: logoutSchema }, controller.logout);
}
