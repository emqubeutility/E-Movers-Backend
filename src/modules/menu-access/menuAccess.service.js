import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { SUPERADMIN_ROLE } from '../../utils/roles.js';

function toMenu(row, selectedIds, flags) {
  return {
    id: row.menu_item_id,
    code: row.menu_code,
    name: row.menu_name,
    parentId: row.menu_parent_id,
    order: row.menu_order,
    pageUrl: row.page_url,
    selected: selectedIds === null || selectedIds.has(row.menu_item_id),
    create: flags === null || Boolean(flags.get(row.menu_item_id)?.is_create),
    edit: flags === null || Boolean(flags.get(row.menu_item_id)?.is_edit),
    delete: flags === null || Boolean(flags.get(row.menu_item_id)?.is_delete),
  };
}

function toFunction(row) {
  return { id: row.parameter_id, code: row.code, name: row.label };
}

export function createMenuAccessService({ menuAccessRepository }) {
  async function getRole(roleId) {
    const role = await menuAccessRepository.findRole(roleId);
    if (!role) throw new NotFoundError('Role not found');
    return role;
  }

  async function getFunction(functionId) {
    const row = await menuAccessRepository.findFunction(functionId);
    if (!row) throw new NotFoundError('Menu function not found');
    return row;
  }

  /** Rejects unknown or inactive menus, and collapses duplicates so a repeat is harmless. */
  async function assertMenusExist(menuItemIds) {
    const ids = [...new Set(menuItemIds)];
    if (ids.length === 0) return ids;
    if ((await menuAccessRepository.countActiveMenus(ids)) !== ids.length) {
      throw new BadRequestError('One or more menus do not exist or are inactive', [
        { field: 'menuItemIds', message: 'One or more menus do not exist or are inactive' },
      ]);
    }
    return ids;
  }

  async function menusWithSelection(selectedIds, flags) {
    return (await menuAccessRepository.listActiveMenus()).map((row) =>
      toMenu(row, selectedIds, flags),
    );
  }

  /** The emove "Menu Role" tab: every active menu, flagged with whether the role has it. */
  async function roleMenus(roleId) {
    const role = await getRole(roleId);
    const isSuperAdmin = role.role_code === SUPERADMIN_ROLE;
    const grants = isSuperAdmin ? [] : await menuAccessRepository.listRoleGrants(roleId);
    const selectedIds = isSuperAdmin ? null : new Set(grants.map((row) => row.menu_item_id));
    const flags = isSuperAdmin ? null : new Map(grants.map((row) => [row.menu_item_id, row]));
    return {
      role: { id: role.role_id, code: role.role_code, name: role.name },
      isSuperAdmin,
      menus: await menusWithSelection(selectedIds, flags),
    };
  }

  async function functionMenus(functionId) {
    const fn = await getFunction(functionId);
    const selectedIds = new Set(await menuAccessRepository.listFunctionMenuIds(functionId));
    return { function: toFunction(fn), menus: await menusWithSelection(selectedIds, new Map()) };
  }

  return {
    roleMenus,

    async saveRoleMenus(roleId, grants, actor) {
      const role = await getRole(roleId);
      if (role.role_code === SUPERADMIN_ROLE) {
        throw new ForbiddenError('The super administrator always has every menu');
      }
      const unique = new Map(
        grants.map((grant) => [
          grant.menuItemId,
          {
            menuItemId: grant.menuItemId,
            create: Boolean(grant.create),
            edit: Boolean(grant.edit),
            delete: Boolean(grant.delete),
          },
        ]),
      );
      await assertMenusExist([...unique.keys()]);
      await menuAccessRepository.replaceRoleMenus(roleId, [...unique.values()], actor.uid);
      return roleMenus(roleId);
    },

    /** The emove "Menu Function" tab: the actions a screen can support, assigned to menus. */
    async listFunctions() {
      return (await menuAccessRepository.listFunctions()).map(toFunction);
    },

    functionMenus,

    async saveFunctionMenus(functionId, menuItemIds, actor) {
      await getFunction(functionId);
      const ids = await assertMenusExist(menuItemIds);
      await menuAccessRepository.replaceFunctionMenus(functionId, ids, actor.uid);
      return functionMenus(functionId);
    },
  };
}
