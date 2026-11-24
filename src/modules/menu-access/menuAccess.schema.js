import { envelope } from '../../utils/response.js';
import { ERROR_RESPONSES, integerParams, secured } from '../../utils/schemas.js';

const menuGrant = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    code: { type: 'string' },
    name: { type: 'string' },
    parentId: { type: ['integer', 'null'] },
    order: { type: ['integer', 'null'] },
    pageUrl: { type: ['string', 'null'] },
    selected: { type: 'boolean' },
    create: { type: 'boolean' },
    edit: { type: 'boolean' },
    delete: { type: 'boolean' },
  },
};

const functionRow = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    code: { type: 'string' },
    name: { type: 'string' },
  },
};

const roleMenusResponse = {
  type: 'object',
  properties: {
    role: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        code: { type: 'string' },
        name: { type: 'string' },
      },
    },
    isSuperAdmin: { type: 'boolean' },
    menus: { type: 'array', items: menuGrant },
  },
};

const functionMenusResponse = {
  type: 'object',
  properties: {
    function: functionRow,
    menus: { type: 'array', items: menuGrant },
  },
};

const menuSelectionBody = {
  type: 'object',
  additionalProperties: false,
  required: ['menuItemIds'],
  properties: {
    menuItemIds: { type: 'array', items: { type: 'integer', minimum: 1 }, maxItems: 500 },
  },
};

const roleGrantsBody = {
  type: 'object',
  additionalProperties: false,
  required: ['grants'],
  properties: {
    grants: {
      type: 'array',
      maxItems: 500,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['menuItemId'],
        properties: {
          menuItemId: { type: 'integer', minimum: 1 },
          create: { type: 'boolean', default: false },
          edit: { type: 'boolean', default: false },
          delete: { type: 'boolean', default: false },
        },
      },
    },
  },
};

const securedMenuAccess = secured('menu-access');

export const getRoleMenusSchema = {
  ...securedMenuAccess,
  summary: 'Every active menu, flagged with whether a role has it',
  params: integerParams,
  response: { 200: envelope(roleMenusResponse), ...ERROR_RESPONSES },
};

export const saveRoleMenusSchema = {
  ...securedMenuAccess,
  summary: 'Replace the menus a role can open, with add / edit / delete per menu',
  params: integerParams,
  body: roleGrantsBody,
  response: { 200: envelope(roleMenusResponse), ...ERROR_RESPONSES },
};

export const listFunctionsSchema = {
  ...securedMenuAccess,
  summary: 'List the business functions (Sales, Operations, Stores...)',
  response: { 200: envelope({ type: 'array', items: functionRow }), ...ERROR_RESPONSES },
};

export const getFunctionMenusSchema = {
  ...securedMenuAccess,
  summary: 'Every active menu, flagged with whether a function applies to it',
  params: integerParams,
  response: { 200: envelope(functionMenusResponse), ...ERROR_RESPONSES },
};

export const saveFunctionMenusSchema = {
  ...securedMenuAccess,
  summary: 'Replace the menus a business function owns',
  params: integerParams,
  body: menuSelectionBody,
  response: { 200: envelope(functionMenusResponse), ...ERROR_RESPONSES },
};
