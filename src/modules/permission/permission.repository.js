const MENU_SELECT = {
  menu_item_id: true,
  menu_code: true,
  menu_name: true,
  menu_order: true,
  menu_parent_id: true,
  css_class: true,
  page_url: true,
};

const MENU_ORDER = [{ menu_order: 'asc' }, { menu_name: 'asc' }];

export function createPermissionRepository(prisma) {
  return {
    /** Every active menu plus the grant (zero or one row) owned by the given role. */
    listMenusForRole(roleCode) {
      return prisma.menu_item.findMany({
        where: { is_active: true },
        orderBy: MENU_ORDER,
        select: {
          ...MENU_SELECT,
          menu_role: {
            where: { role: { is: { role_code: roleCode } } },
            select: { is_create: true, is_edit: true, is_delete: true },
          },
          menu_function: { select: { function_id: true } },
        },
      });
    },

    /** The business functions (departments) of the employee linked to this login, if any. */
    async listFunctionIdsForUser(userId) {
      const account = await prisma.app_user.findUnique({
        where: { user_id: BigInt(userId) },
        select: { profile_id: true },
      });
      if (!account?.profile_id) return [];
      const rows = await prisma.employee_function.findMany({
        where: { profile_id: account.profile_id },
        select: { function_id: true },
      });
      return rows.map((row) => row.function_id);
    },

    /** The catalogue a super administrator can already use, with no grant rows involved. */
    listActiveMenus() {
      return prisma.menu_item.findMany({
        where: { is_active: true },
        orderBy: MENU_ORDER,
        select: MENU_SELECT,
      });
    },
  };
}
