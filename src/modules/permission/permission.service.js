import { SUPERADMIN_ROLE, isAdminRole } from '../../utils/roles.js';

const NO_ACCESS = Object.freeze({ view: false, create: false, edit: false, delete: false });
const FULL_ACCESS = Object.freeze({ view: true, create: true, edit: true, delete: true });

function toGrant(menu, actions) {
  return {
    id: menu.menu_item_id,
    code: menu.menu_code,
    name: menu.menu_name,
    order: menu.menu_order,
    parentId: menu.menu_parent_id,
    pageUrl: menu.page_url,
    icon: menu.css_class,
    ...actions,
  };
}

/** A `menu_role` row means "may open"; its flags say which actions are allowed. */
function actionsOf(grant) {
  if (!grant) return NO_ACCESS;
  return {
    view: true,
    create: grant.is_create,
    edit: grant.is_edit,
    delete: grant.is_delete,
  };
}

export function createPermissionService({ permissionRepository }) {
  return {
    /**
     * The menus the role may open, with the actions it may perform on each. A menu owned by one
     * or more business functions also needs one of them on the person; Admin roles hold all.
     */
    async listFor(roleCode, userId) {
      if (roleCode === SUPERADMIN_ROLE) {
        const menus = await permissionRepository.listActiveMenus();
        return menus.map((menu) => toGrant(menu, FULL_ACCESS));
      }
      const rows = await permissionRepository.listMenusForRole(roleCode);
      const allFunctions = isAdminRole(roleCode);
      const mine = new Set(
        allFunctions || !userId ? [] : await permissionRepository.listFunctionIdsForUser(userId),
      );
      const inMyFunctions = (row) => {
        const owners = row.menu_function ?? [];
        return (
          allFunctions || owners.length === 0 || owners.some((owner) => mine.has(owner.function_id))
        );
      };
      return rows
        .filter(inMyFunctions)
        .map((row) => toGrant(row, actionsOf(row.menu_role[0])))
        .filter((grant) => grant.view);
    },
  };
}
