import { success } from '../../utils/response.js';

export function createCrudController(service, resource) {
  const name = resource.singular;
  return {
    async list(request) {
      return success(
        await service.list(request.query, request.user),
        `${resource.title} retrieved`,
      );
    },
    async options(request) {
      return success(await service.options(request.query, request.user), 'Options retrieved');
    },
    async get(request) {
      return success(await service.get(request.params, request.user), `${name} retrieved`);
    },
    async create(request, reply) {
      const record = await service.create(request.body, request.user);
      return reply.status(201).send(success(record, `${name} created`));
    },
    async update(request) {
      return success(
        await service.update(request.params, request.body, request.user),
        `${name} updated`,
      );
    },
    async remove(request) {
      await service.remove(request.params, request.user);
      return success(null, `${name} deleted`);
    },
  };
}
