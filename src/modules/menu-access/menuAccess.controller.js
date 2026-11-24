import { success } from '../../utils/response.js';

export function createMenuAccessController(menuAccessService) {
  return {
    async roleMenus(request) {
      return success(await menuAccessService.roleMenus(request.params.id), 'Menu roles retrieved');
    },
    async saveRoleMenus(request) {
      return success(
        await menuAccessService.saveRoleMenus(request.params.id, request.body.grants, request.user),
        'Menu roles saved',
      );
    },
    async listFunctions() {
      return success(await menuAccessService.listFunctions(), 'Menu functions retrieved');
    },
    async functionMenus(request) {
      return success(
        await menuAccessService.functionMenus(request.params.id),
        'Menu function retrieved',
      );
    },
    async saveFunctionMenus(request) {
      return success(
        await menuAccessService.saveFunctionMenus(
          request.params.id,
          request.body.menuItemIds,
          request.user,
        ),
        'Menu function saved',
      );
    },
  };
}
