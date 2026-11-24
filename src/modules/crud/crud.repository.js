/**
 * Data access for one resource. The service describes what it wants in plain terms
 * ({ column, op, value } conditions); only this file knows Prisma.
 */
const OPERATORS = {
  eq: (value) => value,
  gte: (value) => ({ gte: value }),
  lte: (value) => ({ lte: value }),
  ne: (value) => ({ not: value }),
};

function buildSelect(resource) {
  const select = {};
  resource.keys.forEach((keyDef) => {
    select[keyDef.column] = true;
  });
  Object.values(resource.fields).forEach((definition) => {
    select[definition.column] = true;
  });
  if (resource.audit !== 'none') select.created_at = true;
  if (resource.audit === 'full') select.updated_at = true;
  return select;
}

function buildWhere({ conditions = [], search }) {
  const where = {};
  conditions.forEach(({ column, op, value }) => {
    const clause = OPERATORS[op](value);
    // Two conditions on one column (a from/to range) are merged instead of overwritten.
    where[column] =
      op === 'eq' || where[column] === undefined ? clause : { ...where[column], ...clause };
  });
  if (search) {
    where.OR = search.columns.map((column) => ({
      [column]: { contains: search.term, mode: 'insensitive' },
    }));
  }
  return where;
}

export function createCrudRepository(prisma, resource) {
  // Looked up per call so the app can be built without a database client (API tests).
  const modelOf = () => prisma[resource.model];
  const select = buildSelect(resource);

  function uniqueWhere(keyValues) {
    if (resource.keys.length === 1)
      return { [resource.keys[0].column]: keyValues[resource.keys[0].column] };
    return { [resource.keys.map((keyDef) => keyDef.column).join('_')]: keyValues };
  }

  return {
    async list({ conditions, search, orderBy, skip, take }) {
      const where = buildWhere({ conditions, search });
      const [rows, total] = await Promise.all([
        modelOf().findMany({
          where,
          orderBy: { [orderBy.column]: orderBy.order },
          skip,
          take,
          select,
        }),
        modelOf().count({ where }),
      ]);
      return { rows, total };
    },

    options({ conditions, search, labelColumns, take }) {
      const optionSelect = { [resource.keys[0].column]: true };
      labelColumns.forEach((column) => {
        optionSelect[column] = true;
      });
      return modelOf().findMany({
        where: buildWhere({ conditions, search }),
        orderBy: { [labelColumns[0]]: 'asc' },
        take,
        select: optionSelect,
      });
    },

    findOne(conditions) {
      return modelOf().findFirst({ where: buildWhere({ conditions }), select });
    },

    create(data) {
      return modelOf().create({ data, select });
    },

    update(keyValues, data) {
      return modelOf().update({ where: uniqueWhere(keyValues), data, select });
    },

    remove(keyValues) {
      return modelOf().delete({
        where: uniqueWhere(keyValues),
        select: { [resource.keys[0].column]: true },
      });
    },
  };
}

/** Shared look-ups used across resources. */
export function createLookupRepository(prisma) {
  return {
    /** Map of parameter id -> the code of its type, for checking dropdown values. */
    async parameterTypesOf(ids) {
      if (ids.length === 0) return new Map();
      const rows = await prisma.parameter.findMany({
        where: { parameter_id: { in: ids }, is_active: true },
        select: { parameter_id: true, parameter_type: { select: { code: true } } },
      });
      return new Map(rows.map((row) => [row.parameter_id, row.parameter_type.code]));
    },

    /** Active values of the given dropdown types, in display order. */
    dropdownValues(typeCodes) {
      return prisma.parameter.findMany({
        where: { is_active: true, parameter_type: { code: { in: typeCodes }, is_active: true } },
        orderBy: [{ display_order: 'asc' }, { label: 'asc' }],
        select: {
          parameter_id: true,
          code: true,
          label: true,
          is_default: true,
          color_hex: true,
          parameter_value: true,
          parent_parameter_id: true,
          parameter: { select: { parameter_value: true } },
          parameter_type: { select: { code: true } },
        },
      });
    },

    dropdownTypes() {
      return prisma.parameter_type.findMany({
        where: { is_active: true },
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
        select: { code: true, name: true, description: true, allow_user_values: true },
      });
    },
  };
}
