const ROLE_SELECT = {
  role_id: true,
  role_code: true,
  name: true,
  role_level: true,
  is_active: true,
  created_at: true,
};

const PERMISSION_SELECT = {
  menu_item_id: true,
  page_url: true,
  is_create: true,
  is_edit: true,
  is_delete: true,
};

/** Everything the API returns for a role, so create/update can hand back the same shape as get. */
const ROLE_WITH_PERMISSIONS = {
  ...ROLE_SELECT,
  menu_role: { select: PERMISSION_SELECT },
};

const MENU_SELECT = {
  menu_item_id: true,
  menu_code: true,
  menu_name: true,
  menu_parent_id: true,
  menu_order: true,
  page_url: true,
};

/** Maps one API permission to the `menu_role` row it is stored as. */
function toPermissionRow(roleId, permission, actorId, pageUrl) {
  return {
    role_id: roleId,
    menu_item_id: permission.menuItemId,
    // The URL belongs to the menu, never to the request body, so it can not be wiped or forged.
    page_url: pageUrl ?? null,
    is_create: permission.create,
    is_edit: permission.edit,
    is_delete: permission.delete,
    created_by: BigInt(actorId),
  };
}

/** menu_item_id -> page_url, so permissions copy the URL from the menu they point at. */
async function loadPageUrls(client, menuItemIds) {
  if (menuItemIds.length === 0) return new Map();
  const rows = await client.menu_item.findMany({
    where: { menu_item_id: { in: menuItemIds } },
    select: { menu_item_id: true, page_url: true },
  });
  return new Map(rows.map((row) => [row.menu_item_id, row.page_url]));
}

export function createRoleRepository(prisma) {
  return {
    list() {
      return prisma.role.findMany({
        orderBy: [{ role_level: 'asc' }, { name: 'asc' }],
        select: ROLE_WITH_PERMISSIONS,
      });
    },

    listMenus() {
      return prisma.menu_item.findMany({
        where: { is_active: true },
        orderBy: [{ menu_order: 'asc' }, { menu_name: 'asc' }],
        select: MENU_SELECT,
      });
    },

    findById(id) {
      return prisma.role.findUnique({ where: { role_id: id }, select: ROLE_WITH_PERMISSIONS });
    },

    findByCode(code) {
      return prisma.role.findUnique({ where: { role_code: code }, select: ROLE_SELECT });
    },

    countAssignedUsers(id) {
      return prisma.app_user.count({ where: { role_id: id, deleted_at: null } });
    },

    /** How many of these menu ids exist and are active; used to reject unknown permissions. */
    countMenus(menuItemIds) {
      return prisma.menu_item.count({
        where: { menu_item_id: { in: menuItemIds }, is_active: true },
      });
    },

    create({ roleCode, name, roleLevel, actorId, permissions }) {
      return prisma.$transaction(async (tx) => {
        const role = await tx.role.create({
          data: {
            role_code: roleCode,
            name,
            role_level: roleLevel,
            created_by: BigInt(actorId),
          },
          select: ROLE_SELECT,
        });
        if (permissions.length) {
          const pageUrls = await loadPageUrls(
            tx,
            permissions.map((permission) => permission.menuItemId),
          );
          await tx.menu_role.createMany({
            data: permissions.map((permission) =>
              toPermissionRow(
                role.role_id,
                permission,
                actorId,
                pageUrls.get(permission.menuItemId),
              ),
            ),
          });
        }
        return tx.role.findUnique({
          where: { role_id: role.role_id },
          select: ROLE_WITH_PERMISSIONS,
        });
      });
    },

    update(id, { name, roleLevel, isActive, actorId, permissions }) {
      return prisma.$transaction(async (tx) => {
        await tx.role.update({
          where: { role_id: id },
          data: {
            ...(name !== undefined && { name }),
            ...(roleLevel !== undefined && { role_level: roleLevel }),
            ...(isActive !== undefined && { is_active: isActive }),
          },
        });

        if (permissions !== undefined) {
          await tx.menu_role.deleteMany({ where: { role_id: id } });
          if (permissions.length) {
            const pageUrls = await loadPageUrls(
              tx,
              permissions.map((permission) => permission.menuItemId),
            );
            await tx.menu_role.createMany({
              data: permissions.map((permission) =>
                toPermissionRow(id, permission, actorId, pageUrls.get(permission.menuItemId)),
              ),
            });
          }
        }
        return tx.role.findUnique({ where: { role_id: id }, select: ROLE_WITH_PERMISSIONS });
      });
    },
  };
}
