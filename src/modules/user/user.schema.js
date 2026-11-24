import { MAX_PAGE_SIZE } from '../../utils/pagination.js';
import {
  ERROR_RESPONSES,
  emailField,
  nullableString,
  pageResponse,
  passwordField,
  secured,
  uuidParams,
} from '../../utils/schemas.js';
import { envelope } from '../../utils/response.js';

/** Public shape of a user. Anything not listed here (e.g. the password hash) is never serialized. */
export const userResponse = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: ['string', 'null'] },
    employeeCode: { type: 'string' },
    username: { type: 'string' },
    isOutsourced: { type: 'boolean' },
    contractor: {
      type: ['object', 'null'],
      properties: { id: { type: 'string' }, name: { type: 'string' } },
    },
    personType: { type: 'string' },
    canSignIn: { type: 'boolean' },
    canLogin: { type: 'boolean' },
    profileId: { type: ['string', 'null'] },
    organizationIds: { type: 'array', items: { type: 'integer' } },
    organizations: {
      type: 'array',
      items: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } },
    },
    nationality: {
      type: ['object', 'null'],
      properties: { code: { type: 'string' }, name: { type: 'string' } },
    },
    address: {
      type: ['object', 'null'],
      properties: {
        countryId: { type: 'integer' },
        countryName: { type: 'string' },
        stateId: { type: ['integer', 'null'] },
        stateName: { type: ['string', 'null'] },
        cityId: { type: ['integer', 'null'] },
        cityName: { type: ['string', 'null'] },
        addressText: { type: 'string' },
        postalCode: { type: ['string', 'null'] },
      },
    },
    skills: { type: 'array', items: { type: 'string' } },
    crewMembers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          employeeCode: { type: 'string' },
        },
      },
    },
    firstName: { type: 'string' },
    lastName: nullableString,
    phone: nullableString,
    designation: nullableString,
    role: { type: 'string' },
    roleName: { type: 'string' },
    status: { type: 'string' },
    organizationId: { type: ['integer', 'null'] },
    functions: { type: 'array', items: { type: 'string' } },
    lastLoginAt: { type: ['string', 'null'], format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export { emailField, passwordField };

const nameField = { type: 'string', minLength: 1, maxLength: 100 };
const phoneField = { type: 'string', pattern: '^\\+[1-9][0-9]{7,14}$' };
// A form that leaves the (optional) phone blank must not fail validation, on create or on update.
const optionalPhoneField = { anyOf: [phoneField, { type: 'string', maxLength: 0 }] };
const roleField = { type: 'string', pattern: '^[A-Z_]{2,40}$' };
const statusField = { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] };

const functionsField = {
  type: 'array',
  maxItems: 10,
  uniqueItems: true,
  items: { type: 'string', pattern: '^[A-Z_]{2,40}$' },
};

const usernameField = { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$' };
const employeeCodeField = { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9-]{1,19}$' };
const personTypeField = { type: 'string', enum: ['SITE_USER', 'EMPLOYEE'] };

const codeList = {
  type: 'array',
  maxItems: 20,
  uniqueItems: true,
  items: { type: 'string', pattern: '^[A-Z0-9_]{2,60}$' },
};
const staffExtras = {
  organizationIds: {
    type: 'array',
    maxItems: 20,
    uniqueItems: true,
    items: { type: 'integer', minimum: 1 },
  },
  nationality: { type: 'string', maxLength: 10 },
  isOutsourced: { type: 'boolean' },
  contractorCompanyId: { type: ['string', 'null'], format: 'uuid' },
  skills: codeList,
  crewMemberIds: {
    type: 'array',
    maxItems: 100,
    uniqueItems: true,
    items: { type: 'string', format: 'uuid' },
  },
  address: {
    type: 'object',
    additionalProperties: false,
    required: ['countryId', 'addressText'],
    properties: {
      countryId: { type: 'integer', minimum: 1 },
      stateId: { type: 'integer', minimum: 1 },
      cityId: { type: 'integer', minimum: 1 },
      addressText: { type: 'string', minLength: 1, maxLength: 512 },
      postalCode: { type: 'string', maxLength: 20 },
    },
  },
};

const securedUsers = secured('users');

export const listUsersSchema = {
  ...securedUsers,
  summary: 'List users with pagination, search, sorting and filters',
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: MAX_PAGE_SIZE, default: 10 },
      search: { type: 'string', maxLength: 100 },
      role: roleField,
      status: statusField,
      skill: { type: 'string', pattern: '^[A-Z0-9_]{2,60}$' },
      organizationId: { type: 'integer', minimum: 1 },
      sortBy: {
        type: 'string',
        enum: ['createdAt', 'email', 'firstName', 'lastLoginAt'],
        default: 'createdAt',
      },
      sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
    },
  },
  response: { 200: pageResponse(userResponse), ...ERROR_RESPONSES },
};

const countItem = (labelKey) => ({
  type: 'object',
  properties: {
    code: { type: 'string' },
    [labelKey]: { type: 'string' },
    count: { type: 'integer' },
  },
});

export const userSummarySchema = {
  ...securedUsers,
  summary: 'Counts by role and status, and the newest users',
  response: {
    200: envelope({
      type: 'object',
      properties: {
        total: { type: 'integer' },
        byRole: { type: 'array', items: countItem('name') },
        byStatus: { type: 'array', items: countItem('label') },
        recent: { type: 'array', items: userResponse },
      },
    }),
    ...ERROR_RESPONSES,
  },
};

export const getUserSchema = {
  ...securedUsers,
  summary: 'Get one user',
  params: uuidParams,
  response: { 200: envelope(userResponse), ...ERROR_RESPONSES },
};

export const getMeSchema = {
  ...securedUsers,
  summary: 'Get the signed-in user',
  response: { 200: envelope(userResponse), ...ERROR_RESPONSES },
};

export const listRolesSchema = {
  ...securedUsers,
  summary: 'List the roles a user can be given',
  response: {
    200: envelope({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          level: { type: 'integer' },
        },
      },
    }),
    ...ERROR_RESPONSES,
  },
};

export const listCrewSchema = {
  ...securedUsers,
  summary: 'Employees who can be picked as crew members (active, with a skill)',
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      skill: { type: 'string', pattern: '^[A-Z0-9_]{2,60}$' },
      search: { type: 'string', maxLength: 100 },
      organizationId: { type: 'integer', minimum: 1 },
      exclude: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: envelope({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          employeeCode: { type: 'string' },
          skills: {
            type: 'array',
            items: {
              type: 'object',
              properties: { code: { type: 'string' }, name: { type: 'string' } },
            },
          },
        },
      },
    }),
    ...ERROR_RESPONSES,
  },
};

export const createUserSchema = {
  ...securedUsers,
  summary: 'Create a user (admin only)',
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['employeeCode', 'firstName'],
    properties: {
      employeeCode: employeeCodeField,
      username: usernameField,
      personType: personTypeField,
      canSignIn: { type: 'boolean' },
      canLogin: { type: 'boolean' },
      email: emailField,
      password: passwordField,
      firstName: nameField,
      lastName: { type: 'string', maxLength: 100 },
      phone: optionalPhoneField,
      designation: { type: 'string', maxLength: 150 },
      role: roleField,
      status: statusField,
      organizationId: { type: 'integer', minimum: 1 },
      functions: functionsField,
      ...staffExtras,
    },
  },
  response: { 201: envelope(userResponse), ...ERROR_RESPONSES },
};

export const updateUserSchema = {
  ...securedUsers,
  summary: 'Update a user (own profile, or any user for admins)',
  params: uuidParams,
  body: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: {
      email: emailField,
      password: passwordField,
      currentPassword: { type: 'string', minLength: 1, maxLength: 72 },
      personType: personTypeField,
      canSignIn: { type: 'boolean' },
      canLogin: { type: 'boolean' },
      firstName: nameField,
      lastName: { type: 'string', maxLength: 100 },
      phone: optionalPhoneField,
      designation: { type: 'string', maxLength: 150 },
      role: roleField,
      status: statusField,
      functions: functionsField,
      ...staffExtras,
    },
  },
  response: { 200: envelope(userResponse), ...ERROR_RESPONSES },
};

export const deleteUserSchema = {
  ...securedUsers,
  summary: 'Soft-delete a user (admin only)',
  params: uuidParams,
  response: { 200: envelope({ type: 'null' }), ...ERROR_RESPONSES },
};
