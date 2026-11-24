import { AppError } from '../utils/errors.js';
import { failure } from '../utils/response.js';
import { PATTERN_MESSAGES } from '../utils/patterns.js';

export const INTERNAL_ERROR_MESSAGE =
  'Something went wrong on our side. Please try again, or contact your administrator if it keeps happening.';

function fieldOf(issue, context) {
  const path = (issue.instancePath || '').replace(/^\//, '').replace(/\//g, '.');
  return path || issue.params?.missingProperty || context || 'request';
}

/** Turns Ajv's technical wording into something a person can act on. */
function messageOf(issue) {
  if (issue.keyword === 'pattern') return PATTERN_MESSAGES[issue.params.pattern] || issue.message;
  if (issue.keyword === 'enum') return `must be one of: ${issue.params.allowedValues.join(', ')}`;
  return issue.message;
}

function fromValidation(error) {
  return error.validation.map((issue) => ({
    field: fieldOf(issue, error.validationContext),
    message: messageOf(issue),
  }));
}

export function errorHandler(error, request, reply) {
  if (error.validation) {
    return reply.status(422).send(failure('Validation failed', fromValidation(error)));
  }
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(failure(error.message, error.errors));
  }
  // Prisma unique-constraint violation (race between the uniqueness check and the insert).
  if (error.code === 'P2002') {
    return reply.status(409).send(failure('A record with these details already exists'));
  }
  // Foreign-key violation: the body referenced a row that does not exist (e.g. an unknown menu).
  if (error.code === 'P2003') {
    return request.method === 'DELETE'
      ? reply
          .status(409)
          .send(failure('This record is used by other records and cannot be deleted'))
      : reply.status(400).send(failure('A referenced record does not exist'));
  }
  // The row was deleted between the lookup and the write.
  if (error.code === 'P2025') {
    return reply.status(404).send(failure('Resource not found'));
  }
  if (/violates check constraint/.test(error.message || '')) {
    return reply.status(400).send(failure('The values break a data rule'));
  }
  if (error.statusCode && error.statusCode < 500) {
    return reply.status(error.statusCode).send(failure(error.message));
  }

  // The real cause goes to the server log only. Users get a plain message and a reference to quote.
  request.log.error({ err: error }, 'Unhandled error');
  return reply.status(500).send(failure(`${INTERNAL_ERROR_MESSAGE} (Ref: ${request.id})`));
}

export function notFoundHandler(request, reply) {
  return reply.status(404).send(failure(`Route ${request.method} ${request.url} not found`));
}
