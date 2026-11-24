import { authenticate } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { ACTION, MENU } from '../../utils/permissions.js';
import { createServiceRequestController } from './service-request.controller.js';
import {
  contactedSchema,
  dropSchema,
  logsSchema,
  createServiceRequestSchema,
  deleteServiceRequestSchema,
  getServiceRequestSchema,
  listServiceRequestsSchema,
  serviceRequestOptionsSchema,
  updateServiceRequestSchema,
} from './service-request.schema.js';

export default async function serviceRequestRoutes(app) {
  const controller = createServiceRequestController(app.serviceRequestService);
  const can = (action) => requirePermission(MENU.SERVICE_REQUESTS, action);
  app.addHook('preHandler', async (request) => {
    await authenticate(request);
  });

  app.get(
    '/',
    { schema: listServiceRequestsSchema, preHandler: can(ACTION.VIEW) },
    controller.list,
  );
  app.get(
    '/options',
    { schema: serviceRequestOptionsSchema, preHandler: can(ACTION.VIEW) },
    controller.options,
  );
  app.get(
    '/:id',
    { schema: getServiceRequestSchema, preHandler: can(ACTION.VIEW) },
    controller.getById,
  );
  app.get('/:id/logs', { schema: logsSchema, preHandler: can(ACTION.VIEW) }, controller.logs);
  app.post(
    '/',
    { schema: createServiceRequestSchema, preHandler: can(ACTION.CREATE) },
    controller.create,
  );
  app.put(
    '/:id',
    { schema: updateServiceRequestSchema, preHandler: can(ACTION.EDIT) },
    controller.update,
  );
  app.post(
    '/:id/contacted',
    { schema: contactedSchema, preHandler: can(ACTION.EDIT) },
    controller.markContacted,
  );
  app.post('/:id/drop', { schema: dropSchema, preHandler: can(ACTION.EDIT) }, controller.drop);
  app.delete(
    '/:id',
    { schema: deleteServiceRequestSchema, preHandler: can(ACTION.DELETE) },
    controller.remove,
  );
}
