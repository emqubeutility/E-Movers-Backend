import { success } from '../../utils/response.js';

export function createServiceRequestController(service) {
  return {
    async list(request) {
      return success(await service.list(request.query, request.user), 'Service requests retrieved');
    },
    async options(request) {
      return success(
        await service.options(request.user, request.query),
        'Service request options retrieved',
      );
    },
    async getById(request) {
      return success(
        await service.getById(request.params.id, request.user),
        'Service request retrieved',
      );
    },
    async create(request, reply) {
      return reply
        .status(201)
        .send(success(await service.create(request.body, request.user), 'Service request created'));
    },
    async update(request) {
      return success(
        await service.update(request.params.id, request.body, request.user),
        'Service request updated',
      );
    },
    async logs(request) {
      return success(
        await service.logs(request.params.id, request.user),
        'Service request history retrieved',
      );
    },
    async markContacted(request) {
      return success(
        await service.markContacted(request.params.id, request.body, request.user),
        'Request marked as contacted',
      );
    },
    async drop(request) {
      return success(
        await service.drop(request.params.id, request.body, request.user),
        'Request dropped',
      );
    },
    async remove(request) {
      await service.remove(request.params.id, request.user);
      return success(null, 'Service request deleted');
    },
  };
}
