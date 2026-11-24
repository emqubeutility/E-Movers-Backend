import { authenticate } from '../../middlewares/auth.js';
import {
  requireAnyPermission,
  requirePermission,
  requireSelfOrPermission,
} from '../../middlewares/permission.js';
import { ACTION, MENU } from '../../utils/permissions.js';
import { createUserController } from './user.controller.js';
import {
  createUserSchema,
  deleteUserSchema,
  getMeSchema,
  getUserSchema,
  listCrewSchema,
  listRolesSchema,
  listUsersSchema,
  updateUserSchema,
  userSummarySchema,
} from './user.schema.js';

const canViewUsers = requirePermission(MENU.USERS, ACTION.VIEW);

export default async function userRoutes(app) {
  const controller = createUserController(app.userService);
  app.addHook('preHandler', async (request) => {
    await authenticate(request);
  });

  app.get('/', { schema: listUsersSchema, preHandler: canViewUsers }, controller.list);
  // The overview screen is the landing page, so its counts are not tied to the Users menu.
  app.get(
    '/summary',
    {
      schema: userSummarySchema,
      preHandler: requireAnyPermission([MENU.USERS, MENU.OVERVIEW], ACTION.VIEW),
    },
    controller.summary,
  );
  app.get('/me', { schema: getMeSchema }, controller.getMe);
  app.get('/crew', { schema: listCrewSchema, preHandler: canViewUsers }, controller.crew);
  app.get('/roles', { schema: listRolesSchema, preHandler: canViewUsers }, controller.listRoles);
  app.get('/:id', { schema: getUserSchema, preHandler: canViewUsers }, controller.getById);
  app.post(
    '/',
    { schema: createUserSchema, preHandler: requirePermission(MENU.USERS, ACTION.CREATE) },
    controller.create,
  );
  // Editing yourself (profile, password) must not need the Users menu.
  app.put(
    '/:id',
    { schema: updateUserSchema, preHandler: requireSelfOrPermission(MENU.USERS, ACTION.EDIT) },
    controller.update,
  );
  app.delete(
    '/:id',
    { schema: deleteUserSchema, preHandler: requirePermission(MENU.USERS, ACTION.DELETE) },
    controller.remove,
  );
}
