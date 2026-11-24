import { success } from '../../utils/response.js';

export function createCompanyController(companyService) {
  return {
    async list(request) {
      return success(await companyService.list(request.query, request.user), 'Companies retrieved');
    },
    async options() {
      return success(await companyService.options(), 'Company options retrieved');
    },
    async getById(request) {
      return success(
        await companyService.getById(request.params.id, request.user),
        'Company retrieved',
      );
    },
    async create(request, reply) {
      return reply
        .status(201)
        .send(success(await companyService.create(request.body, request.user), 'Company created'));
    },
    async update(request) {
      return success(
        await companyService.update(request.params.id, request.body, request.user),
        'Company updated',
      );
    },
    async remove(request) {
      await companyService.remove(request.params.id, request.user);
      return success(null, 'Company deleted');
    },
  };
}
