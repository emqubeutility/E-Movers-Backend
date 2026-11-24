import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { ADMIN_ROLES, hasRole, isSuperAdmin } from '../utils/roles.js';

export { ADMIN_ROLES };

/** preHandler factory: allows the request only for the listed role codes. */
export function requireRole(...allowedRoles) {
  return async function roleCheck(request) {
    if (!request.user) throw new UnauthorizedError();
    if (!hasRole(request.user, allowedRoles)) throw new ForbiddenError();
  };
}

export const requireAdmin = requireRole(...ADMIN_ROLES);

/** preHandler: only the super administrator (used for creating and deleting organizations). */
export async function requireSuperAdmin(request) {
  if (!request.user) throw new UnauthorizedError();
  if (!isSuperAdmin(request.user))
    throw new ForbiddenError('Only a super administrator can do this');
}
