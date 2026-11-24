import { PASSWORD_PATTERN } from './password.js';
import { envelope, errorEnvelope } from './response.js';

/**
 * Schemas that every route shares. Declaring them once keeps each module schema short and stops
 * the same `errors`/`secured`/`idParams` blocks from being copied into every new module.
 */
export const ERROR_RESPONSES = Object.freeze({
  400: errorEnvelope,
  401: errorEnvelope,
  403: errorEnvelope,
  404: errorEnvelope,
  409: errorEnvelope,
  422: errorEnvelope,
  429: errorEnvelope,
});

export const nullableString = { type: ['string', 'null'] };

export const emailField = { type: 'string', format: 'email', maxLength: 150 };
export const passwordField = { type: 'string', pattern: PASSWORD_PATTERN };

/** A path parameter that holds a UUID (users). */
export const uuidParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } },
};

/** A path parameter that holds a positive integer (roles). */
export const integerParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer', minimum: 1 } },
};

/** Tags a route for Swagger and requires the bearer token. */
export function secured(tag) {
  return { tags: [tag], security: [{ bearerAuth: [] }] };
}

export const pageMeta = {
  type: 'object',
  properties: {
    page: { type: 'integer' },
    limit: { type: 'integer' },
    total: { type: 'integer' },
    totalPages: { type: 'integer' },
  },
};

/** Standard `{ items, meta }` page wrapped in the response envelope. */
export function pageResponse(itemSchema) {
  return envelope({
    type: 'object',
    properties: { items: { type: 'array', items: itemSchema }, meta: pageMeta },
  });
}
