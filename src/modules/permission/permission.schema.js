import { envelope } from '../../utils/response.js';
import { ERROR_RESPONSES, secured } from '../../utils/schemas.js';

const menuGrant = {
  type: 'object',
  properties: {
    code: { type: 'string' },
    name: { type: 'string' },
    id: { type: 'integer' },
    order: { type: ['integer', 'null'] },
    parentId: { type: ['integer', 'null'] },
    icon: { type: ['string', 'null'] },
    pageUrl: { type: ['string', 'null'] },
    view: { type: 'boolean' },
    create: { type: 'boolean' },
    edit: { type: 'boolean' },
    delete: { type: 'boolean' },
  },
};

export const listPermissionsSchema = {
  ...secured('permissions'),
  summary: 'Menus and actions available to the signed-in user',
  response: {
    200: envelope({
      type: 'object',
      properties: {
        role: { type: 'string' },
        isSuperAdmin: { type: 'boolean' },
        menus: { type: 'array', items: menuGrant },
      },
    }),
    ...ERROR_RESPONSES,
  },
};
