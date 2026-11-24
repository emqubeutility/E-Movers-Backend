/**
 * Role rules shared by the HTTP layer (middleware) and the business layer (services).
 * Kept out of the middleware so a service never has to import an HTTP concern.
 */
export const ADMIN_ROLES = Object.freeze(['SUPERADMIN', 'ADMIN']);
export const SUPERADMIN_ROLE = 'SUPERADMIN';

export function hasRole(user, allowed) {
  return Boolean(user) && allowed.includes(user.role);
}

export function isAdmin(user) {
  return hasRole(user, ADMIN_ROLES);
}

export function isSuperAdmin(user) {
  return user?.role === SUPERADMIN_ROLE;
}

export function isAdminRole(code) {
  return ADMIN_ROLES.includes(code);
}
