import { success } from '../../utils/response.js';

export function createUserController(userService) {
  return {
    async list(request) {
      return success(await userService.list(request.query, request.user), 'Users retrieved');
    },

    async summary(request) {
      return success(await userService.summary(request.user), 'Summary retrieved');
    },

    async getMe(request) {
      return success(await userService.getById(request.user.sub), 'Profile retrieved');
    },

    async getById(request) {
      return success(await userService.getById(request.params.id, request.user), 'User retrieved');
    },

    async crew(request) {
      return success(
        await userService.listCrew(request.query, request.user),
        'Crew candidates retrieved',
      );
    },
    async listRoles(request) {
      return success(await userService.listRoles(request.user), 'Roles retrieved');
    },

    async create(request, reply) {
      const user = await userService.create(request.body, request.user);
      return reply.status(201).send(success(user, 'User created'));
    },

    async update(request) {
      const user = await userService.update(request.params.id, request.body, request.user);
      return success(user, 'User updated');
    },

    async remove(request) {
      await userService.remove(request.params.id, request.user);
      return success(null, 'User deleted');
    },
  };
}
