import { envelope, errorEnvelope } from '../../utils/response.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../utils/pagination.js';

const errors = {
  400: errorEnvelope,
  401: errorEnvelope,
  403: errorEnvelope,
  404: errorEnvelope,
  409: errorEnvelope,
  422: errorEnvelope,
};
const OPTIONS_LIMIT = 50;

const nullable = (json) => ({
  ...json,
  type: [].concat(json.type, 'null'),
  ...(json.enum && { enum: [...json.enum, null] }),
});
const entries = (resource) => Object.entries(resource.fields);
const writable = (resource) => entries(resource).filter(([, definition]) => !definition.readOnly);
const assignedKeys = (resource) => resource.keys.filter((keyDef) => keyDef.assigned);

function recordSchema(resource) {
  const properties = Object.fromEntries(resource.keys.map((keyDef) => [keyDef.name, keyDef.json]));
  entries(resource).forEach(([name, definition]) => {
    properties[name] = nullable(definition.json);
  });
  if (resource.audit !== 'none') properties.createdAt = { type: 'string', format: 'date-time' };
  if (resource.audit === 'full') properties.updatedAt = { type: 'string', format: 'date-time' };
  return { type: 'object', properties };
}

function createBody(resource) {
  const properties = Object.fromEntries(
    assignedKeys(resource).map((keyDef) => [keyDef.name, keyDef.json]),
  );
  writable(resource).forEach(([name, definition]) => {
    properties[name] = definition.required ? definition.json : nullable(definition.json);
  });
  const required = [
    ...assignedKeys(resource).map((keyDef) => keyDef.name),
    ...writable(resource)
      .filter(([, d]) => d.required)
      .map(([name]) => name),
  ];
  return { type: 'object', additionalProperties: false, required, properties };
}

function updateBody(resource) {
  const properties = {};
  writable(resource)
    .filter(([, definition]) => !definition.immutable)
    .forEach(([name, definition]) => {
      properties[name] = definition.required ? definition.json : nullable(definition.json);
    });
  return { type: 'object', additionalProperties: false, minProperties: 1, properties };
}

/** Exact filters for flagged fields and keys, plus <name>From / <name>To for dates. */
function filterProperties(resource) {
  const properties = {};
  resource.keys.forEach((keyDef) => {
    if (keyDef.filter) properties[keyDef.name] = keyDef.json;
  });
  entries(resource).forEach(([name, definition]) => {
    if (definition.filter) properties[name] = definition.json;
    if (definition.range) {
      properties[`${name}From`] = definition.json;
      properties[`${name}To`] = definition.json;
    }
  });
  return properties;
}

function listQuery(resource) {
  const sortable = entries(resource)
    .filter(([, d]) => d.sort)
    .map(([name]) => name);
  const hasSearch = entries(resource).some(([, d]) => d.search);
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE },
      ...(hasSearch && { search: { type: 'string', minLength: 1, maxLength: 100 } }),
      ...(sortable.length > 0 && { sortBy: { type: 'string', enum: sortable } }),
      sortOrder: { type: 'string', enum: ['asc', 'desc'] },
      ...filterProperties(resource),
    },
  };
}

function keyParams(resource) {
  return {
    type: 'object',
    required: resource.keys.map((keyDef) => keyDef.name),
    properties: Object.fromEntries(resource.keys.map((keyDef) => [keyDef.name, keyDef.json])),
  };
}

const pageMeta = {
  type: 'object',
  properties: {
    page: { type: 'integer' },
    limit: { type: 'integer' },
    total: { type: 'integer' },
    totalPages: { type: 'integer' },
  },
};

export function buildSchemas(resource) {
  const record = recordSchema(resource);
  const base = { tags: [resource.tag], security: [{ bearerAuth: [] }] };
  const title = resource.title;
  return {
    list: {
      ...base,
      summary: `List ${title} with pagination, search, sorting and filters`,
      querystring: listQuery(resource),
      response: {
        200: envelope({
          type: 'object',
          properties: { items: { type: 'array', items: record }, meta: pageMeta },
        }),
        ...errors,
      },
    },
    options: {
      ...base,
      summary: `Dropdown options for ${title}`,
      querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
          search: { type: 'string', minLength: 1, maxLength: 100 },
          limit: { type: 'integer', minimum: 1, maximum: MAX_PAGE_SIZE, default: OPTIONS_LIMIT },
          ...filterProperties(resource),
        },
      },
      response: {
        200: envelope({
          type: 'array',
          items: {
            type: 'object',
            properties: { value: resource.keys[0].json, label: { type: 'string' } },
          },
        }),
        ...errors,
      },
    },
    get: {
      ...base,
      summary: `Get one of ${title}`,
      params: keyParams(resource),
      response: { 200: envelope(record), ...errors },
    },
    create: {
      ...base,
      summary: `Create in ${title}`,
      body: createBody(resource),
      response: { 201: envelope(record), ...errors },
    },
    update: {
      ...base,
      summary: `Update in ${title}`,
      params: keyParams(resource),
      body: updateBody(resource),
      response: { 200: envelope(record), ...errors },
    },
    delete: {
      ...base,
      summary: `Delete from ${title}`,
      params: keyParams(resource),
      response: { 200: envelope({ type: 'null' }), ...errors },
    },
  };
}
