import { authenticate } from '../../middlewares/auth.js';
import { PATTERNS } from '../../utils/patterns.js';
import { envelope, errorEnvelope, success } from '../../utils/response.js';

const MAX_TYPES = 25;
const errors = { 401: errorEnvelope, 403: errorEnvelope, 422: errorEnvelope };
const base = { tags: ['dropdowns'], security: [{ bearerAuth: [] }] };

const optionSchema = {
  type: 'object',
  properties: {
    value: { type: 'integer' },
    code: { type: 'string' },
    label: { type: 'string' },
    isDefault: { type: 'boolean' },
    colorHex: { type: ['string', 'null'] },
    parameterValue: { type: 'integer' },
    parentValue: { type: ['integer', 'null'] },
  },
};

const valuesSchema = {
  ...base,
  summary: 'Values of one or more dropdowns, e.g. ?types=GENDER,ACCOUNT_STATUS',
  querystring: {
    type: 'object',
    additionalProperties: false,
    required: ['types'],
    properties: {
      types: {
        type: 'array',
        minItems: 1,
        maxItems: MAX_TYPES,
        uniqueItems: true,
        items: { type: 'string', maxLength: 60, pattern: PATTERNS.code },
      },
    },
  },
  response: {
    200: envelope({ type: 'object', additionalProperties: { type: 'array', items: optionSchema } }),
    ...errors,
  },
};

const typesSchema = {
  ...base,
  summary: 'The dropdowns that exist',
  response: {
    200: envelope({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          description: { type: ['string', 'null'] },
          allowUserValues: { type: 'boolean' },
        },
      },
    }),
    ...errors,
  },
};

/**
 * Read-only dropdown values for forms. Any signed-in user may read them: they are labels, not
 * business data. Maintaining them is the Parameters CRUD, which needs the PARAMETERS menu grant.
 */
export default async function dropdownRoutes(app, { lookups }) {
  app.addHook('preHandler', async (request) => {
    await authenticate(request);
  });
  // "?types=A,B" arrives as one string; split it before validation so each code is checked.
  app.addHook('preValidation', async (request) => {
    if (typeof request.query?.types === 'string')
      request.query.types = request.query.types.split(',').map((code) => code.trim());
  });

  app.get('/', { schema: valuesSchema }, async (request) => {
    const rows = await lookups.dropdownValues(request.query.types);
    const grouped = Object.fromEntries(request.query.types.map((code) => [code, []]));
    rows.forEach((row) => {
      grouped[row.parameter_type.code].push({
        value: row.parameter_id,
        code: row.code,
        label: row.label,
        isDefault: row.is_default,
        colorHex: row.color_hex,
        // The value within its type, and the parent's (e.g. a status's stage).
        parameterValue: row.parameter_value,
        parentValue: row.parameter?.parameter_value ?? null,
      });
    });
    return success(grouped, 'Dropdown values retrieved');
  });

  app.get('/types', { schema: typesSchema }, async () => {
    const types = await lookups.dropdownTypes();
    return success(
      types.map((type) => ({
        code: type.code,
        name: type.name,
        description: type.description,
        allowUserValues: type.allow_user_values,
      })),
      'Dropdown types retrieved',
    );
  });
}
