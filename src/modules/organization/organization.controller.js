import { success } from '../../utils/response.js';

export function createOrganizationController(organizationService) {
  return {
    async getById(request) {
      return success(
        await organizationService.getById(request.params.id, request.user),
        'Organization retrieved',
      );
    },
    async create(request, reply) {
      return reply
        .status(201)
        .send(
          success(
            await organizationService.create(request.body, request.user),
            'Organization created',
          ),
        );
    },
    async update(request) {
      return success(
        await organizationService.update(request.params.id, request.body, request.user),
        'Organization updated',
      );
    },
  };
}
