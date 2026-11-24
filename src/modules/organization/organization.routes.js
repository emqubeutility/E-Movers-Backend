import { authenticate } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { requireSuperAdmin } from '../../middlewares/role-check.js';
import { ACTION, MENU } from '../../utils/permissions.js';
import { createOrganizationController } from './organization.controller.js';
import {
  createOrganizationSchema,
  getOrganizationSchema,
  updateOrganizationSchema,
} from './organization.schema.js';

/**
 * One organization with its contact person and address. The list, dropdown options and delete
 * stay on the generic CRUD (crud/resources/setup.js).
 */
export default async function organizationRoutes(app) {
  const controller = createOrganizationController(app.organizationService);
  app.addHook('preHandler', async (request) => {
    await authenticate(request);
  });

  app.get(
    '/:id',
    {
      schema: getOrganizationSchema,
      preHandler: requirePermission(MENU.ORGANIZATIONS, ACTION.VIEW),
    },
    controller.getById,
  );
  app.post(
    '/',
    {
      schema: createOrganizationSchema,
      preHandler: [requireSuperAdmin, requirePermission(MENU.ORGANIZATIONS, ACTION.CREATE)],
    },
    controller.create,
  );
  app.put(
    '/:id',
    {
      schema: updateOrganizationSchema,
      preHandler: requirePermission(MENU.ORGANIZATIONS, ACTION.EDIT),
    },
    controller.update,
  );
}
