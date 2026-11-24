import { envelope } from '../../utils/response.js';
import { ERROR_RESPONSES } from '../../utils/schemas.js';
import { userResponse } from '../user/user.schema.js';

const sessionResponse = envelope({
  type: 'object',
  properties: { accessToken: { type: 'string' }, user: userResponse },
});

export const loginSchema = {
  tags: ['auth'],
  summary: 'Sign in with user name and password',
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['username', 'password'],
    properties: {
      username: { type: 'string', minLength: 1, maxLength: 30 },
      // No policy check here: existing passwords must stay usable even if the policy changes.
      password: { type: 'string', minLength: 1, maxLength: 72 },
    },
  },
  response: { 200: sessionResponse, ...ERROR_RESPONSES },
};

export const refreshSchema = {
  tags: ['auth'],
  summary: 'Exchange the refresh cookie for a new access token',
  response: { 200: sessionResponse, ...ERROR_RESPONSES },
};

export const logoutSchema = {
  tags: ['auth'],
  summary: 'Sign out and revoke the refresh token',
  response: { 200: envelope({ type: 'null' }), ...ERROR_RESPONSES },
};

export const switchOrganizationSchema = {
  tags: ['auth'],
  summary: 'Make another organization the active one (super admin: any, or null for all)',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['organizationId'],
    properties: { organizationId: { type: ['integer', 'null'], minimum: 1 } },
  },
  response: { 200: sessionResponse, ...ERROR_RESPONSES },
};
