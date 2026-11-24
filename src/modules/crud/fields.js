import { PATTERNS } from '../../utils/patterns.js';

const MAX_INT = 2147483647;
const MAX_ID = Number.MAX_SAFE_INTEGER;

/**
 * Field builders. Each returns { column, json, db, ...options }.
 *   column  database column           json  JSON-schema for one value
 *   db      conversion to and from the database: int | bigint | decimal | date | datetime | plain
 * Options: required, filter (exact-match filter), search, sort, range (from/to filters),
 *          readOnly (returned, never written), immutable (set on create only), parameterType.
 */
function field(column, json, db, options = {}) {
  return { column, json, db, ...options };
}

const text = (column, { min = 0, max = 255, pattern, ...options } = {}) =>
  field(
    column,
    { type: 'string', minLength: min, maxLength: max, ...(pattern && { pattern }) },
    'plain',
    options,
  );

export const f = {
  text,
  label: (column, options = {}) => text(column, { min: 1, max: 150, ...options }),
  personName: (column, options = {}) =>
    text(column, { min: 1, max: 150, pattern: PATTERNS.personName, ...options }),
  code: (column, options = {}) =>
    text(column, { min: 2, max: 60, pattern: PATTERNS.code, ...options }),
  pattern: (column, pattern, options = {}) => text(column, { min: 1, pattern, ...options }),
  phone: (column, options = {}) =>
    text(column, { min: 9, max: 16, pattern: PATTERNS.phone, ...options }),
  email: (column, options = {}) =>
    field(
      column,
      { type: 'string', format: 'email', minLength: 5, maxLength: 150 },
      'plain',
      options,
    ),
  url: (column, options = {}) =>
    text(column, { min: 8, max: 255, pattern: PATTERNS.url, ...options }),
  int: (column, { min = 0, max = MAX_INT, ...options } = {}) =>
    field(column, { type: 'integer', minimum: min, maximum: max }, 'int', options),
  bigInt: (column, { min = 0, max = MAX_ID, ...options } = {}) =>
    field(column, { type: 'integer', minimum: min, maximum: max }, 'bigint', options),
  decimal: (column, { min = 0, max = 9999999999999, ...options } = {}) =>
    field(column, { type: 'number', minimum: min, maximum: max }, 'decimal', options),
  percent: (column, options = {}) =>
    field(column, { type: 'number', minimum: 0, maximum: 100 }, 'decimal', options),
  bool: (column, options = {}) => field(column, { type: 'boolean' }, 'plain', options),
  date: (column, options = {}) =>
    field(column, { type: 'string', format: 'date' }, 'date', { range: true, ...options }),
  dateTime: (column, options = {}) =>
    field(column, { type: 'string', format: 'date-time' }, 'datetime', { range: true, ...options }),
  oneOf: (column, values, options = {}) =>
    field(column, { type: 'string', enum: values }, 'plain', { filter: true, ...options }),
  /** Link to another table with an integer key. */
  ref: (column, options = {}) =>
    field(column, { type: 'integer', minimum: 1, maximum: MAX_INT }, 'int', {
      filter: true,
      ...options,
    }),
  /** Link to another table with a big-integer key. */
  bigRef: (column, options = {}) =>
    field(column, { type: 'integer', minimum: 1, maximum: MAX_ID }, 'bigint', {
      filter: true,
      ...options,
    }),
  /** Dropdown value: must be a parameter of the named type. */
  param: (column, parameterType, options = {}) =>
    field(column, { type: 'integer', minimum: 1, maximum: MAX_INT }, 'int', {
      filter: true,
      parameterType,
      ...options,
    }),
  json: (column, options = {}) =>
    field(column, { type: 'object', additionalProperties: true }, 'plain', options),
};

/** Key builders: the columns that identify a row. */
export const key = {
  int: (column, name = 'id', options = {}) => ({
    column,
    name,
    db: 'int',
    json: { type: 'integer', minimum: 1, maximum: MAX_INT },
    ...options,
  }),
  big: (column, name = 'id', options = {}) => ({
    column,
    name,
    db: 'bigint',
    json: { type: 'integer', minimum: 1, maximum: MAX_ID },
    ...options,
  }),
  uuid: (column, name = 'id', options = {}) => ({
    column,
    name,
    db: 'plain',
    json: { type: 'string', format: 'uuid' },
    ...options,
  }),
};

export const OPERATIONS = Object.freeze({
  all: ['list', 'get', 'create', 'update', 'delete'],
  readOnly: ['list', 'get'],
  link: ['list', 'get', 'create', 'delete'],
  readAndDelete: ['list', 'get', 'delete'],
});

/** Converts an API value to what Prisma expects for the column. */
export function toDb(definition, value) {
  if (value === null || value === undefined) return value;
  if (definition.db === 'bigint') return BigInt(value);
  if (definition.db === 'date') return new Date(`${value}T00:00:00.000Z`);
  if (definition.db === 'datetime') return new Date(value);
  return value;
}

/** Converts a database value to plain JSON (BigInt and Decimal are not JSON types). */
export function fromDb(definition, value) {
  if (value === null || value === undefined) return null;
  if (definition.db === 'bigint' || definition.db === 'decimal') return Number(value);
  if (definition.db === 'date') return value.toISOString().slice(0, 10);
  return value;
}
