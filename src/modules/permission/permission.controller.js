import { success } from '../../utils/response.js';
import { SUPERADMIN_ROLE } from '../../utils/roles.js';

export function createPermissionController(permissionService) {
  return {
    async list(request) {
      const menus = await permissionService.listFor(request.user.role, request.user.uid);
      return success(
        {
          role: request.user.role,
          isSuperAdmin: request.user.role === SUPERADMIN_ROLE,
          menus,
        },
        'Permissions retrieved',
      );
    },
  };
}
