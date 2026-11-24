import { authenticate } from '../../middlewares/auth.js';
import { createPermissionController } from './permission.controller.js';
import { listPermissionsSchema } from './permission.schema.js';

/**
 * The signed-in user's own grants. Deliberately open to every authenticated account (including
 * one that must still change its password): the shell needs it before rendering any screen.
 */
export default async function permissionRoutes(app) {
  const controller = createPermissionController(app.permissionService);
  app.addHook('preHandler', authenticate);
  app.get('/', { schema: listPermissionsSchema }, controller.list);
}
