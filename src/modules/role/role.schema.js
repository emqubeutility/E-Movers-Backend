import { envelope } from '../../utils/response.js';
import { ERROR_RESPONSES, integerParams, secured } from '../../utils/schemas.js';

const permission = {
  type: 'object',
  additionalProperties: false,
  required: ['menuItemId', 'create', 'edit', 'delete'],
  properties: {
    menuItemId: { type: 'integer', minimum: 1 },
    create: { type: 'boolean' },
    edit: { type: 'boolean' },
    delete: { type: 'boolean' },
  },
};

const roleProperties = {
  name: { type: 'string', minLength: 2, maxLength: 150 },
  level: { type: 'integer', minimum: 0, maximum: 99 },
  isActive: { type: 'boolean' },
  permissions: { type: 'array', items: permission, maxItems: 500 },
};

const permissionResponse = {
  type: 'object',
  properties: {
    menuItemId: { type: 'integer' },
    pageUrl: { type: ['string', 'null'] },
    create: { type: 'boolean' },
    edit: { type: 'boolean' },
    delete: { type: 'boolean' },
  },
};

const roleResponse = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    code: { type: 'string' },
    name: { type: 'string' },
    level: { type: 'integer' },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    permissions: { type: 'array', items: permissionResponse },
  },
};

const securedRoles = secured('roles');

export const listRolesSchema = {
  ...securedRoles,
  summary: 'List roles',
  response: { 200: envelope({ type: 'array', items: roleResponse }), ...ERROR_RESPONSES },
};

export const listMenusSchema = {
  ...securedRoles,
  summary: 'List active menus for role permissions',
  response: {
    200: envelope({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          code: { type: 'string' },
          name: { type: 'string' },
          parentId: { type: ['integer', 'null'] },
          order: { type: ['integer', 'null'] },
          pageUrl: { type: ['string', 'null'] },
        },
      },
    }),
    ...ERROR_RESPONSES,
  },
};

export const getRoleSchema = {
  ...securedRoles,
  summary: 'Get a role and its menu permissions',
  params: integerParams,
  response: { 200: envelope(roleResponse), ...ERROR_RESPONSES },
};

export const createRoleSchema = {
  ...securedRoles,
  summary: 'Create a role',
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['code', 'name', 'level'],
    properties: {
      code: { type: 'string', pattern: '^[A-Z][A-Z0-9_]{1,39}$' },
      ...roleProperties,
    },
  },
  response: { 201: envelope(roleResponse), ...ERROR_RESPONSES },
};

export const updateRoleSchema = {
  ...securedRoles,
  summary: 'Update a role and its menu permissions',
  params: integerParams,
  body: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: roleProperties,
  },
  response: { 200: envelope(roleResponse), ...ERROR_RESPONSES },
};
