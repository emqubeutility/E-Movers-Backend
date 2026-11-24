export function success(data = null, message = 'OK') {
  return { success: true, message, data, errors: null };
}

export function failure(message, errors = null) {
  return { success: false, message, data: null, errors };
}

/** JSON schema for the standard response envelope around `dataSchema`. */
export function envelope(dataSchema) {
  return {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
      data: dataSchema,
      errors: { type: 'null' },
    },
  };
}

export const errorEnvelope = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    data: { type: 'null' },
    errors: {
      type: ['array', 'null'],
      items: {
        type: 'object',
        properties: { field: { type: 'string' }, message: { type: 'string' } },
      },
    },
  },
};
