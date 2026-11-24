import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { SUPERADMIN_ROLE } from '../utils/roles.js';

const DENIED = {
  view: 'Your role cannot open this screen',
  create: 'Your role cannot create records here',
  edit: 'Your role cannot edit records here',
  delete: 'Your role cannot delete records here',
};

/**
 * Resolves the caller's menus once per request. `null` means the super administrator, who is
 * never limited by `menu_role` rows.
 */
async function grantsFor(request) {
  if (!request.user) throw new UnauthorizedError();
  if (request.user.role === SUPERADMIN_ROLE) return null;
  if (!request.permissions) {
    request.permissions = await request.server.permissionService.listFor(
      request.user.role,
      request.user.uid,
    );
  }
  return request.permissions;
}

function denied(action) {
  return new ForbiddenError(DENIED[action] ?? 'You do not have permission to do this');
}

/** preHandler factory: the caller's role needs `menuCode` with `action` granted. */
export function requirePermission(menuCode, action = 'view') {
  return async function permissionCheck(request) {
    const menus = await grantsFor(request);
    if (menus === null) return;
    if (!menus.some((menu) => menu.code === menuCode && menu[action])) throw denied(action);
  };
}

/** preHandler factory: any one of the listed menus may satisfy the check. */
export function requireAnyPermission(menuCodes, action = 'view') {
  return async function anyPermissionCheck(request) {
    const menus = await grantsFor(request);
    if (menus === null) return;
    if (!menus.some((menu) => menuCodes.includes(menu.code) && menu[action])) throw denied(action);
  };
}

/**
 * preHandler factory for self-service routes: the owner always passes, everyone else needs the
 * menu grant. Used by `PUT /users/:id`, which edits a profile and changes a password.
 */
export function requireSelfOrPermission(menuCode, action = 'edit', param = 'id') {
  const check = requirePermission(menuCode, action);
  return async function selfOrPermissionCheck(request) {
    if (!request.user) throw new UnauthorizedError();
    if (request.params?.[param] === request.user.sub) return;
    await check(request);
  };
}
