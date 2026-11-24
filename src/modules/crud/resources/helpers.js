import { OPERATIONS } from '../fields.js';

export const REQUIRED = { required: true };
export const SEARCH = { search: true, sort: true };
export const SORT = { sort: true };
export const FILTER = { filter: true };
export const SOFT_DELETE = { column: 'deleted_at', byColumn: 'deleted_by' };

/**
 * Fills in the defaults so each resource file only states what is special about it.
 * `menu` is the `menu_item.menu_code` whose `menu_role` grants control the endpoints.
 */
export function defineResource(definition) {
  return {
    audit: 'full',
    softDelete: null,
    operations: OPERATIONS.all,
    adminOnly: false,
    ...definition,
  };
}
