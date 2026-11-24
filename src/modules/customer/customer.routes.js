import { authenticate } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { ACTION, MENU } from '../../utils/permissions.js';
import { createCustomerController } from './customer.controller.js';
import {
  createCustomerSchema,
  customerOptionsSchema,
  deleteCustomerSchema,
  getCustomerSchema,
  listCustomersSchema,
  updateCustomerSchema,
} from './customer.schema.js';

export default async function customerRoutes(app) {
  const controller = createCustomerController(app.customerService);
  app.addHook('preHandler', async (request) => {
    await authenticate(request);
  });

  app.get(
    '/',
    { schema: listCustomersSchema, preHandler: requirePermission(MENU.CUSTOMER, ACTION.VIEW) },
    controller.list,
  );
  app.get(
    '/options',
    { schema: customerOptionsSchema, preHandler: requirePermission(MENU.CUSTOMER, ACTION.VIEW) },
    controller.options,
  );
  app.get(
    '/:id',
    { schema: getCustomerSchema, preHandler: requirePermission(MENU.CUSTOMER, ACTION.VIEW) },
    controller.getById,
  );
  app.post(
    '/',
    { schema: createCustomerSchema, preHandler: requirePermission(MENU.CUSTOMER, ACTION.CREATE) },
    controller.create,
  );
  app.put(
    '/:id',
    { schema: updateCustomerSchema, preHandler: requirePermission(MENU.CUSTOMER, ACTION.EDIT) },
    controller.update,
  );
  app.delete(
    '/:id',
    { schema: deleteCustomerSchema, preHandler: requirePermission(MENU.CUSTOMER, ACTION.DELETE) },
    controller.remove,
  );
}
