import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { toMeta, toPagination } from '../../utils/pagination.js';
import { isSuperAdmin } from '../../utils/roles.js';
import { orgScopeOf } from '../../utils/scope.js';
import { fromDb, toDb } from './fields.js';

const OPTIONS_LIMIT = 50;

export function createCrudService({ resource, repository, lookups }) {
  const fieldEntries = Object.entries(resource.fields);
  const softDelete = resource.softDelete;
  const hideDeleted = softDelete && softDelete.hide !== false;
  const defaultSort = resource.defaultSort || { field: null, order: 'asc' };
  const searchColumns = fieldEntries.filter(([, d]) => d.search).map(([, d]) => d.column);

  function toRecord(row) {
    const record = {};
    resource.keys.forEach((keyDef) => {
      record[keyDef.name] = fromDb(keyDef, row[keyDef.column]);
    });
    fieldEntries.forEach(([name, definition]) => {
      record[name] = fromDb(definition, row[definition.column]);
    });
    if (row.created_at) record.createdAt = row.created_at;
    if (row.updated_at) record.updatedAt = row.updated_at;
    return record;
  }

  /** Key values keyed by column, converted for the database. */
  function toKeyValues(source) {
    return Object.fromEntries(
      resource.keys.map((keyDef) => [keyDef.column, toDb(keyDef, source[keyDef.name])]),
    );
  }

  function keyConditions(keyValues) {
    const conditions = Object.entries(keyValues).map(([column, value]) => ({
      column,
      op: 'eq',
      value,
    }));
    if (hideDeleted) conditions.push({ column: softDelete.column, op: 'eq', value: null });
    return conditions;
  }

  /** Turns query parameters into conditions: exact filters and from/to ranges. */
  function filterConditions(query) {
    const conditions = [];
    resource.keys.forEach((keyDef) => {
      if (keyDef.filter && query[keyDef.name] !== undefined) {
        conditions.push({
          column: keyDef.column,
          op: 'eq',
          value: toDb(keyDef, query[keyDef.name]),
        });
      }
    });
    fieldEntries.forEach(([name, definition]) => {
      if (definition.filter && query[name] !== undefined) {
        conditions.push({
          column: definition.column,
          op: 'eq',
          value: toDb(definition, query[name]),
        });
      }
      if (definition.range && query[`${name}From`] !== undefined) {
        conditions.push({
          column: definition.column,
          op: 'gte',
          value: toDb(definition, query[`${name}From`]),
        });
      }
      if (definition.range && query[`${name}To`] !== undefined) {
        conditions.push({
          column: definition.column,
          op: 'lte',
          value: toDb(definition, query[`${name}To`]),
        });
      }
    });
    if (hideDeleted) conditions.push({ column: softDelete.column, op: 'eq', value: null });
    return conditions;
  }

  function searchOf(query) {
    return query.search && searchColumns.length > 0
      ? { columns: searchColumns, term: query.search }
      : undefined;
  }

  function orderOf(query) {
    const name = query.sortBy || defaultSort.field;
    const column = name ? resource.fields[name].column : resource.keys[0].column;
    return { column, order: query.sortOrder || defaultSort.order };
  }

  /** Converts a request body into column values, skipping anything the caller did not send. */
  function toColumns(body, { creating }) {
    const data = {};
    fieldEntries.forEach(([name, definition]) => {
      const blocked = definition.readOnly || (!creating && definition.immutable);
      if (!blocked && body[name] !== undefined)
        data[definition.column] = toDb(definition, body[name]);
    });
    return data;
  }

  /** A dropdown field must hold a value of its own dropdown, not just any parameter. */
  async function assertDropdownValues(body) {
    const used = fieldEntries.filter(
      ([name, definition]) => definition.parameterType && body[name] != null,
    );
    if (used.length === 0) return;
    const types = await lookups.parameterTypesOf([...new Set(used.map(([name]) => body[name]))]);
    const problems = used
      .filter(([name, definition]) => types.get(body[name]) !== definition.parameterType)
      .map(([name, definition]) => ({
        field: name,
        message: `must be an active value of the ${definition.parameterType} dropdown`,
      }));
    if (problems.length > 0) throw new ValidationError(problems);
  }

  /**
   * resource.uniqueTogether: [{ fields: ['a', 'b'], message }]. The combination of those fields must
   * not already exist on another row (the row being edited is ignored).
   */
  async function assertUniqueTogether(body, existing) {
    for (const rule of resource.uniqueTogether ?? []) {
      const conditions = rule.fields.map((name) => {
        const definition = resource.fields[name];
        const value = body[name] !== undefined ? body[name] : existing?.[name];
        return { column: definition.column, op: 'eq', value: toDb(definition, value) };
      });
      if (conditions.some((condition) => condition.value === undefined || condition.value === null))
        continue;
      if (hideDeleted) conditions.push({ column: softDelete.column, op: 'eq', value: null });
      if (existing) {
        const keyDef = resource.keys[0];
        conditions.push({
          column: keyDef.column,
          op: 'ne',
          value: toDb(keyDef, existing[keyDef.name] ?? existing.id),
        });
      }
      if (await repository.findOne(conditions)) {
        throw new ValidationError([
          { field: rule.fields[rule.fields.length - 1], message: rule.message },
        ]);
      }
    }
  }

  async function findExisting(keyValues, actor) {
    const row = await repository.findOne([...keyConditions(keyValues), ...scopeConditions(actor)]);
    if (!row) throw new NotFoundError(`${resource.singular} not found`);
    return row;
  }

  const actorId = (actor) => (actor?.uid ? BigInt(actor.uid) : null);

  /** A scoped resource (resource.scope = column) only shows the caller's own organization. */
  function scopeConditions(actor) {
    // A super administrator always sees every organization in the organizations list itself.
    const ownTable = resource.keys.some((keyDef) => keyDef.column === resource.scope);
    if (ownTable && isSuperAdmin(actor)) return [];
    const organizationId = resource.scope ? orgScopeOf(actor) : null;
    return organizationId === null
      ? []
      : [{ column: resource.scope, op: 'eq', value: organizationId }];
  }

  return {
    async list(query, actor) {
      const pagination = toPagination(query);
      const { rows, total } = await repository.list({
        conditions: [...filterConditions(query), ...scopeConditions(actor)],
        search: searchOf(query),
        orderBy: orderOf(query),
        skip: pagination.skip,
        take: pagination.take,
      });
      return { items: rows.map(toRecord), meta: toMeta(pagination, total) };
    },

    async options(query, actor) {
      const labelColumns = resource.optionLabel;
      const conditions = [...filterConditions(query), ...scopeConditions(actor)];
      if (resource.activeColumn)
        conditions.push({ column: resource.activeColumn, op: 'eq', value: true });
      const rows = await repository.options({
        conditions,
        search: query.search ? { columns: labelColumns, term: query.search } : undefined,
        labelColumns,
        take: query.limit || OPTIONS_LIMIT,
      });
      const keyDef = resource.keys[0];
      return rows.map((row) => ({
        value: fromDb(keyDef, row[keyDef.column]),
        label: labelColumns
          .map((column) => row[column])
          .filter(Boolean)
          .join(' '),
      }));
    },

    async get(params, actor) {
      return toRecord(await findExisting(toKeyValues(params), actor));
    },

    async create(body, actor) {
      await assertDropdownValues(body);
      await assertUniqueTogether(body, null);
      await resource.rules?.beforeCreate?.(body, actor);
      const data = { ...toColumns(body, { creating: true }) };
      // Rows of a scoped resource are stamped with the caller's organization.
      const scoped = resource.scope && orgScopeOf(actor);
      if (scoped && !resource.keys.some((keyDef) => keyDef.column === resource.scope))
        data[resource.scope] = scoped;
      resource.keys
        .filter((keyDef) => keyDef.assigned)
        .forEach((keyDef) => {
          data[keyDef.column] = toDb(keyDef, body[keyDef.name]);
        });
      if (resource.audit !== 'none') data.created_by = actorId(actor);
      return toRecord(await repository.create(data));
    },

    async update(params, body, actor) {
      const keyValues = toKeyValues(params);
      const existing = toRecord(await findExisting(keyValues, actor));
      await assertDropdownValues(body);
      await assertUniqueTogether(body, existing);
      await resource.rules?.beforeUpdate?.(existing, body, actor);
      const data = toColumns(body, { creating: false });
      if (resource.audit === 'full') data.updated_by = actorId(actor);
      return toRecord(await repository.update(keyValues, data));
    },

    async remove(params, actor) {
      const keyValues = toKeyValues(params);
      const existing = toRecord(await findExisting(keyValues, actor));
      await resource.rules?.beforeDelete?.(existing, actor);
      if (!softDelete) return repository.remove(keyValues);
      const data = { [softDelete.column]: new Date() };
      if (softDelete.byColumn) data[softDelete.byColumn] = actorId(actor);
      return repository.update(keyValues, data);
    },
  };
}
