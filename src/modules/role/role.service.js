import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors.js';

const RESERVED_CODES = new Set(['SUPERADMIN', 'ADMIN']);

/** Maps a `role` row (with its `menu_role` rows) to the API shape. */
function toRoleDto(row) {
  return {
    id: row.role_id,
    code: row.role_code,
    name: row.name,
    level: row.role_level,
    isActive: row.is_active,
    createdAt: row.created_at,
    permissions: (row.menu_role ?? []).map((permission) => ({
      menuItemId: permission.menu_item_id,
      pageUrl: permission.page_url,
      create: permission.is_create,
      edit: permission.is_edit,
      delete: permission.is_delete,
    })),
  };
}

export function createRoleService({ roleRepository }) {
  async function getRole(id) {
    const row = await roleRepository.findById(id);
    if (!row) throw new NotFoundError('Role not found');
    return row;
  }

  async function assertPermissionsValid(permissions = []) {
    const ids = permissions.map((item) => item.menuItemId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestError('A menu can only appear once in a role', [
        { field: 'permissions', message: 'A menu can only appear once in a role' },
      ]);
    }
    if (ids.length === 0) return;
    if ((await roleRepository.countMenus(ids)) !== ids.length) {
      throw new BadRequestError('One or more menus do not exist or are inactive', [
        { field: 'permissions', message: 'One or more menus do not exist or are inactive' },
      ]);
    }
  }

  async function assertCodeAvailable(code) {
    if (await roleRepository.findByCode(code)) {
      throw new ConflictError('Role code is already in use', [
        { field: 'code', message: 'Role code is already in use' },
      ]);
    }
  }

  return {
    async list() {
      return (await roleRepository.list()).map(toRoleDto);
    },

    async listMenus() {
      return (await roleRepository.listMenus()).map((menu) => ({
        id: menu.menu_item_id,
        code: menu.menu_code,
        name: menu.menu_name,
        parentId: menu.menu_parent_id,
        order: menu.menu_order,
        pageUrl: menu.page_url,
      }));
    },

    async get(id) {
      return toRoleDto(await getRole(id));
    },

    async create(input, actor) {
      const code = input.code.trim().toUpperCase();
      if (RESERVED_CODES.has(code)) throw new ForbiddenError('This role code is reserved');
      await assertCodeAvailable(code);
      await assertPermissionsValid(input.permissions);
      const row = await roleRepository.create({
        roleCode: code,
        name: input.name.trim(),
        roleLevel: input.level,
        permissions: input.permissions ?? [],
        actorId: actor.uid,
      });
      return toRoleDto(row);
    },

    async update(id, input, actor) {
      const existing = await getRole(id);
      if (RESERVED_CODES.has(existing.role_code)) {
        throw new ForbiddenError('Built-in administrator roles cannot be edited');
      }
      if (input.isActive === false && (await roleRepository.countAssignedUsers(id)) > 0) {
        throw new ConflictError(
          'Reassign or deactivate users with this role before deactivating it',
        );
      }
      await assertPermissionsValid(input.permissions);
      const row = await roleRepository.update(id, {
        name: input.name?.trim(),
        roleLevel: input.level,
        isActive: input.isActive,
        permissions: input.permissions,
        actorId: actor.uid,
      });
      return toRoleDto(row);
    },
  };
}
