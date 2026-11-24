import { BadRequestError } from './errors.js';

/** Turns a stable parameter code from the API into the numeric id stored in the database. */
export async function requireParameter(repository, typeCode, code, field) {
  const parameter = await repository.findParameter(typeCode, code);
  if (!parameter) {
    throw new BadRequestError(`Unknown ${field}: ${code}. Run the seed script to add it.`, [
      { field, message: `Unknown ${field}` },
    ]);
  }
  return parameter.parameter_id;
}

/** Optional lookups accept an omitted or empty value and store NULL. */
export async function resolveOptionalParameter(repository, typeCode, code, field) {
  if (code === undefined || code === null || code === '') return null;
  return requireParameter(repository, typeCode, code, field);
}
