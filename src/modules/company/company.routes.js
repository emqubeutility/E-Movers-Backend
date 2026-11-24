import { authenticate } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { ACTION, MENU } from '../../utils/permissions.js';
import { createCompanyController } from './company.controller.js';
import {
  companyOptionsSchema,
  createCompanySchema,
  deleteCompanySchema,
  getCompanySchema,
  listCompaniesSchema,
  updateCompanySchema,
} from './company.schema.js';

export default async function companyRoutes(app) {
  const controller = createCompanyController(app.companyService);
  app.addHook('preHandler', async (request) => {
    await authenticate(request);
  });

  app.get(
    '/',
    { schema: listCompaniesSchema, preHandler: requirePermission(MENU.COMPANY, ACTION.VIEW) },
    controller.list,
  );
  app.get(
    '/options',
    { schema: companyOptionsSchema, preHandler: requirePermission(MENU.COMPANY, ACTION.VIEW) },
    controller.options,
  );
  app.get(
    '/:id',
    { schema: getCompanySchema, preHandler: requirePermission(MENU.COMPANY, ACTION.VIEW) },
    controller.getById,
  );
  app.post(
    '/',
    { schema: createCompanySchema, preHandler: requirePermission(MENU.COMPANY, ACTION.CREATE) },
    controller.create,
  );
  app.put(
    '/:id',
    { schema: updateCompanySchema, preHandler: requirePermission(MENU.COMPANY, ACTION.EDIT) },
    controller.update,
  );
  app.delete(
    '/:id',
    { schema: deleteCompanySchema, preHandler: requirePermission(MENU.COMPANY, ACTION.DELETE) },
    controller.remove,
  );
}
