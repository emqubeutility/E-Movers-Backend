import { authenticate } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { requireAdmin, requireSuperAdmin } from '../../middlewares/role-check.js';
import { ACTION } from '../../utils/permissions.js';
import { createCrudController } from './crud.controller.js';
import { buildSchemas } from './crud.schema.js';
import { createCrudService } from './crud.service.js';
import { RESOURCES } from './resources/index.js';

/**
 * Registers the endpoints of one resource under /<resource.name>.
 * Access is the same RBAC as every other module: the caller's role needs the resource's menu
 * (`resource.menu`) with the matching action in `menu_role`. Security-sensitive resources
 * (`adminOnly`) also need an administrator role, like roles and menu access.
 */
function registerResource(app, resource, { createRepository, lookups }) {
  const service = createCrudService({ resource, repository: createRepository(resource), lookups });
  const controller = createCrudController(service, resource);
  const schemas = buildSchemas(resource);
  const can = (operation) => resource.operations.includes(operation);
  const guard = (action, operation) => {
    const checks = [requirePermission(resource.menu, action)];
    if (resource.adminOnly) checks.unshift(requireAdmin);
    // e.g. organizations: only the super administrator may create or delete them.
    if (resource.superAdminOnly?.includes(operation)) checks.unshift(requireSuperAdmin);
    return { preHandler: checks };
  };
  const base = `/${resource.name}`;
  const one = `${base}/${resource.keys.map((keyDef) => `:${keyDef.name}`).join('/')}`;

  if (can('list')) app.get(base, { schema: schemas.list, ...guard(ACTION.VIEW) }, controller.list);
  if (can('list') && resource.optionLabel)
    app.get(
      `${base}/options`,
      { schema: schemas.options, ...guard(ACTION.VIEW) },
      controller.options,
    );
  if (can('get')) app.get(one, { schema: schemas.get, ...guard(ACTION.VIEW) }, controller.get);
  if (can('create'))
    app.post(
      base,
      { schema: schemas.create, ...guard(ACTION.CREATE, 'create') },
      controller.create,
    );
  if (can('update'))
    app.put(one, { schema: schemas.update, ...guard(ACTION.EDIT) }, controller.update);
  if (can('delete'))
    app.delete(
      one,
      { schema: schemas.delete, ...guard(ACTION.DELETE, 'delete') },
      controller.remove,
    );
}

export default async function crudRoutes(app, options) {
  app.addHook('preHandler', async (request) => {
    await authenticate(request);
  });
  RESOURCES.forEach((resource) => registerResource(app, resource, options));
}
