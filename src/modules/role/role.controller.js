import { success } from '../../utils/response.js';

export function createRoleController(roleService) {
  return {
    async list() {
      return success(await roleService.list(), 'Roles retrieved');
    },
    async listMenus() {
      return success(await roleService.listMenus(), 'Menus retrieved');
    },
    async get(request) {
      return success(await roleService.get(request.params.id), 'Role retrieved');
    },
    async create(request, reply) {
      return reply
        .status(201)
        .send(success(await roleService.create(request.body, request.user), 'Role created'));
    },
    async update(request) {
      return success(
        await roleService.update(request.params.id, request.body, request.user),
        'Role updated',
      );
    },
  };
}
