import { authenticate } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { requireAdmin } from '../../middlewares/role-check.js';
import { ACTION, MENU } from '../../utils/permissions.js';
import { createRoleController } from './role.controller.js';
import {
  createRoleSchema,
  getRoleSchema,
  listMenusSchema,
  listRolesSchema,
  updateRoleSchema,
} from './role.schema.js';

/**
 * Role definitions grant permissions, so only an administrator may manage them at all. The menu
 * grant on top of that lets an administrator be limited to reading roles, for example.
 */
export default async function roleRoutes(app) {
  const controller = createRoleController(app.roleService);
  app.addHook('preHandler', async (request) => {
    await authenticate(request);
    await requireAdmin(request);
  });
  app.get(
    '/',
    { schema: listRolesSchema, preHandler: requirePermission(MENU.ROLES, ACTION.VIEW) },
    controller.list,
  );
  app.get(
    '/menus',
    { schema: listMenusSchema, preHandler: requirePermission(MENU.ROLES, ACTION.VIEW) },
    controller.listMenus,
  );
  app.get(
    '/:id',
    { schema: getRoleSchema, preHandler: requirePermission(MENU.ROLES, ACTION.VIEW) },
    controller.get,
  );
  app.post(
    '/',
    { schema: createRoleSchema, preHandler: requirePermission(MENU.ROLES, ACTION.CREATE) },
    controller.create,
  );
  app.put(
    '/:id',
    { schema: updateRoleSchema, preHandler: requirePermission(MENU.ROLES, ACTION.EDIT) },
    controller.update,
  );
}
