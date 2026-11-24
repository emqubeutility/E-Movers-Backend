/**
 * Menu codes are the permission keys: each one matches a `menu_item.menu_code` row, and a
 * `menu_role` row for that menu is what grants the action.
 */
export const MENU = Object.freeze({
  OVERVIEW: 'OVERVIEW',
  USERS: 'USERS',
  ROLES: 'ROLES',
  MENU_ACCESS: 'MENU_ACCESS',
  MASTER: 'MASTER',
  CUSTOMER: 'CUSTOMER',
  COMPANY: 'COMPANY',
  SERVICE_REQUESTS: 'SERVICE_REQUESTS',
  ORGANIZATIONS: 'ORGANIZATIONS',
});

export const ACTION = Object.freeze({
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
});
