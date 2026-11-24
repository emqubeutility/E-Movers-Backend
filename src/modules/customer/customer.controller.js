import { success } from '../../utils/response.js';

export function createCustomerController(customerService) {
  return {
    async list(request) {
      return success(await customerService.list(request.query), 'Customers retrieved');
    },
    async options() {
      return success(await customerService.options(), 'Customer options retrieved');
    },
    async getById(request) {
      return success(await customerService.getById(request.params.id), 'Customer retrieved');
    },
    async create(request, reply) {
      return reply
        .status(201)
        .send(
          success(await customerService.create(request.body, request.user), 'Customer created'),
        );
    },
    async update(request) {
      return success(
        await customerService.update(request.params.id, request.body, request.user),
        'Customer updated',
      );
    },
    async remove(request) {
      await customerService.remove(request.params.id, request.user);
      return success(null, 'Customer deleted');
    },
  };
}
