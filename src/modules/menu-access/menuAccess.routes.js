import { authenticate } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { requireAdmin } from '../../middlewares/role-check.js';
import { ACTION, MENU } from '../../utils/permissions.js';
import { createMenuAccessController } from './menuAccess.controller.js';
import {
  getFunctionMenusSchema,
  getRoleMenusSchema,
  listFunctionsSchema,
  saveFunctionMenusSchema,
  saveRoleMenusSchema,
} from './menuAccess.schema.js';

/**
 * Menu access decides what a role can open. It needs an administrator as well as its own menu
 * grant, because changing a grant is itself a way to gain access to other screens.
 */
export default async function menuAccessRoutes(app) {
  const controller = createMenuAccessController(app.menuAccessService);
  app.addHook('preHandler', async (request) => {
    await authenticate(request);
    await requireAdmin(request);
  });
  app.get(
    '/roles/:id',
    { schema: getRoleMenusSchema, preHandler: requirePermission(MENU.MENU_ACCESS, ACTION.VIEW) },
    controller.roleMenus,
  );
  app.put(
    '/roles/:id',
    { schema: saveRoleMenusSchema, preHandler: requirePermission(MENU.MENU_ACCESS, ACTION.EDIT) },
    controller.saveRoleMenus,
  );
  app.get(
    '/functions',
    { schema: listFunctionsSchema, preHandler: requirePermission(MENU.MENU_ACCESS, ACTION.VIEW) },
    controller.listFunctions,
  );
  app.get(
    '/functions/:id',
    {
      schema: getFunctionMenusSchema,
      preHandler: requirePermission(MENU.MENU_ACCESS, ACTION.VIEW),
    },
    controller.functionMenus,
  );
  app.put(
    '/functions/:id',
    {
      schema: saveFunctionMenusSchema,
      preHandler: requirePermission(MENU.MENU_ACCESS, ACTION.EDIT),
    },
    controller.saveFunctionMenus,
  );
}
