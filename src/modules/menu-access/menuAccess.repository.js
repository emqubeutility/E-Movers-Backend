const MENU_FUNCTION_TYPE = 'MENU_FUNCTION';

const MENU_SELECT = {
  menu_item_id: true,
  menu_code: true,
  menu_name: true,
  menu_parent_id: true,
  menu_order: true,
  page_url: true,
};

const MENU_ORDER = [{ menu_order: 'asc' }, { menu_name: 'asc' }];

const ROLE_SELECT = { role_id: true, role_code: true, name: true };

const FUNCTION_SELECT = { parameter_id: true, code: true, label: true };

/** menu_item_id -> page_url. The URL is always copied from the menu, never sent by the client. */
async function loadPageUrls(client, menuItemIds) {
  if (menuItemIds.length === 0) return new Map();
  const rows = await client.menu_item.findMany({
    where: { menu_item_id: { in: menuItemIds } },
    select: { menu_item_id: true, page_url: true },
  });
  return new Map(rows.map((row) => [row.menu_item_id, row.page_url]));
}

export function createMenuAccessRepository(prisma) {
  return {
    listActiveMenus() {
      return prisma.menu_item.findMany({
        where: { is_active: true },
        orderBy: MENU_ORDER,
        select: MENU_SELECT,
      });
    },

    findRole(roleId) {
      return prisma.role.findUnique({ where: { role_id: roleId }, select: ROLE_SELECT });
    },

    /** The menus a role has, with the add / edit / delete flags of each. */
    listRoleGrants(roleId) {
      return prisma.menu_role.findMany({
        where: { role_id: roleId },
        select: { menu_item_id: true, is_create: true, is_edit: true, is_delete: true },
      });
    },

    countActiveMenus(menuItemIds) {
      return prisma.menu_item.count({
        where: { menu_item_id: { in: menuItemIds }, is_active: true },
      });
    },

    /**
     * Replaces the menus of a role with `grants` ({ menuItemId, create, edit, delete }). A menu
     * that stays is updated in place; one that is dropped loses its row.
     */
    replaceRoleMenus(roleId, grants, actorId) {
      return prisma.$transaction(async (tx) => {
        const ids = grants.map((grant) => grant.menuItemId);
        await tx.menu_role.deleteMany({
          where: { role_id: roleId, ...(ids.length > 0 && { menu_item_id: { notIn: ids } }) },
        });
        const existing = await tx.menu_role.findMany({
          where: { role_id: roleId },
          select: { menu_item_id: true },
        });
        const kept = new Set(existing.map((row) => row.menu_item_id));
        const flagsOf = (grant) => ({
          is_create: grant.create,
          is_edit: grant.edit,
          is_delete: grant.delete,
        });

        for (const grant of grants.filter((item) => kept.has(item.menuItemId))) {
          await tx.menu_role.updateMany({
            where: { role_id: roleId, menu_item_id: grant.menuItemId },
            data: flagsOf(grant),
          });
        }
        const added = grants.filter((item) => !kept.has(item.menuItemId));
        if (added.length === 0) return;
        const pageUrls = await loadPageUrls(
          tx,
          added.map((item) => item.menuItemId),
        );
        await tx.menu_role.createMany({
          data: added.map((grant) => ({
            role_id: roleId,
            menu_item_id: grant.menuItemId,
            page_url: pageUrls.get(grant.menuItemId) ?? null,
            ...flagsOf(grant),
            created_by: actorId ? BigInt(actorId) : null,
          })),
        });
      });
    },

    listFunctions() {
      return prisma.parameter.findMany({
        where: { parameter_type: { code: MENU_FUNCTION_TYPE }, is_active: true },
        orderBy: [{ display_order: 'asc' }, { label: 'asc' }],
        select: FUNCTION_SELECT,
      });
    },

    findFunction(functionId) {
      return prisma.parameter.findFirst({
        where: { parameter_id: functionId, parameter_type: { code: MENU_FUNCTION_TYPE } },
        select: FUNCTION_SELECT,
      });
    },

    async listFunctionMenuIds(functionId) {
      const rows = await prisma.menu_function.findMany({
        where: { function_id: functionId },
        select: { menu_item_id: true },
      });
      return rows.map((row) => row.menu_item_id);
    },

    /** Replaces the menus a business function owns. */
    replaceFunctionMenus(functionId, menuItemIds, actorId) {
      return prisma.$transaction(async (tx) => {
        const existing = await tx.menu_function.findMany({
          where: { function_id: functionId },
          select: { menu_item_id: true },
        });
        const kept = new Set(existing.map((row) => row.menu_item_id));

        await tx.menu_function.deleteMany({
          where: {
            function_id: functionId,
            ...(menuItemIds.length > 0 && { menu_item_id: { notIn: menuItemIds } }),
          },
        });

        const added = menuItemIds.filter((id) => !kept.has(id));
        if (added.length > 0) {
          await tx.menu_function.createMany({
            data: added.map((menuItemId) => ({
              function_id: functionId,
              menu_item_id: menuItemId,
              created_by: actorId ? BigInt(actorId) : null,
            })),
          });
        }
      });
    },
  };
}
