import { ForbiddenError } from '../../../utils/errors.js';
import { PATTERNS } from '../../../utils/patterns.js';
import { f, key } from '../fields.js';
import { FILTER, REQUIRED, SEARCH, SORT, defineResource } from './helpers.js';

const APPLIES_TO = ['PROFILE', 'COMPANY', 'ANY', 'TRANSACTION'];
const setup = (definition) =>
  defineResource({ tag: 'setup', activeColumn: 'is_active', ...definition });
const BY_ORDER = { field: 'displayOrder', order: 'asc' };

/** Values the application code depends on cannot be re-coded or removed. */
const fixedValueRules = {
  beforeUpdate(existing, body) {
    if (existing.isFixed && body.code !== undefined && body.code !== existing.code) {
      throw new ForbiddenError('The code of a fixed dropdown value cannot be changed');
    }
  },
  beforeDelete(existing) {
    if (existing.isFixed)
      throw new ForbiddenError(
        'A fixed dropdown value cannot be deleted. Make it inactive instead.',
      );
  },
};

const systemTypeRules = {
  beforeUpdate(existing, body) {
    if (existing.isSystem && body.code !== undefined && body.code !== existing.code) {
      throw new ForbiddenError('The code of a system dropdown cannot be changed');
    }
  },
  beforeDelete(existing) {
    if (existing.isSystem) throw new ForbiddenError('A system dropdown cannot be deleted');
  },
};

export default [
  setup({
    name: 'organizations',
    model: 'organization',
    title: 'Organizations',
    singular: 'Organization',
    menu: 'ORGANIZATIONS',
    scope: 'organization_id',
    superAdminOnly: ['create', 'delete'],
    // Get, create and update (contact person, address, settings) live in modules/organization.
    operations: ['list', 'delete'],
    keys: [key.big('organization_id')],
    optionLabel: ['name'],
    defaultSort: { field: 'name', order: 'asc' },
    fields: {
      organizationCode: f.code('organization_code', {
        ...REQUIRED,
        ...SEARCH,
        ...SORT,
        max: 20,
        immutable: true,
      }),
      name: f.label('name', { ...REQUIRED, ...SEARCH, ...SORT, min: 2, max: 150 }),
      isHeadOffice: f.bool('is_head_office', FILTER),
      contactNo: f.phone('contact_no'),
      leadEmail: f.email('lead_email', SEARCH),
      baseCurrencyId: f.ref('base_currency_id'),
      timeZoneId: f.ref('time_zone_id'),
      logoFileId: f.bigRef('logo_file_id', { filter: false }),
      isActive: f.bool('is_active', FILTER),
    },
  }),
  setup({
    name: 'parameter-types',
    model: 'parameter_type',
    title: 'Dropdown types',
    singular: 'Dropdown type',
    menu: 'PARAMETERS',
    keys: [key.int('parameter_type_id')],
    optionLabel: ['name'],
    defaultSort: { field: 'name', order: 'asc' },
    rules: systemTypeRules,
    fields: {
      code: f.code('code', { ...REQUIRED, ...SEARCH }),
      name: f.label('name', { ...REQUIRED, ...SEARCH, ...SORT, min: 2, max: 150 }),
      description: f.text('description', { max: 500 }),
      moduleCode: f.code('module_code', { max: 30, ...FILTER }),
      isSystem: f.bool('is_system', { ...FILTER, readOnly: true }),
      allowUserValues: f.bool('allow_user_values', FILTER),
      isActive: f.bool('is_active', FILTER),
      displayOrder: f.int('display_order', { max: 9999, ...SORT }),
    },
  }),
  setup({
    name: 'parameters',
    model: 'parameter',
    title: 'Dropdown values',
    singular: 'Dropdown value',
    menu: 'PARAMETERS',
    keys: [key.int('parameter_id')],
    optionLabel: ['label'],
    defaultSort: BY_ORDER,
    rules: fixedValueRules,
    uniqueTogether: [
      {
        fields: ['parameterTypeId', 'displayOrder'],
        message: 'This display order is already used by another value of this dropdown',
      },
    ],
    fields: {
      parameterTypeId: f.ref('parameter_type_id', { ...REQUIRED, immutable: true }),
      code: f.code('code', { ...REQUIRED, ...SEARCH }),
      label: f.label('label', { ...REQUIRED, ...SEARCH, max: 250 }),
      description: f.text('description', { max: 500 }),
      displayOrder: f.int('display_order', { max: 9999, ...SORT }),
      isDefault: f.bool('is_default', FILTER),
      isFixed: f.bool('is_fixed', { ...FILTER, readOnly: true }),
      // Numbered 1, 2, 3 ... per dropdown by the database; never sent by clients.
      parameterValue: f.int('parameter_value', { readOnly: true, ...SORT }),
      isActive: f.bool('is_active', FILTER),
      colorHex: f.pattern('color_hex', PATTERNS.hexColor, { max: 7 }),
      parentParameterId: f.ref('parent_parameter_id'),
      organizationId: f.bigRef('organization_id'),
    },
  }),
  setup({
    name: 'document-types',
    model: 'document_type',
    title: 'Document types',
    singular: 'Document type',
    menu: 'DOCUMENT_TYPES',
    keys: [key.int('document_type_id')],
    optionLabel: ['name'],
    defaultSort: BY_ORDER,
    fields: {
      code: f.code('code', { ...REQUIRED, ...SEARCH, max: 40 }),
      name: f.label('name', { ...REQUIRED, ...SEARCH, min: 2, max: 150 }),
      categoryId: f.param('category_id', 'DOCUMENT_CATEGORY', REQUIRED),
      appliesTo: f.oneOf('applies_to', APPLIES_TO),
      requiresNumber: f.bool('requires_number'),
      requiresExpiry: f.bool('requires_expiry'),
      requiresFile: f.bool('requires_file'),
      expiryAlertDays: f.int('expiry_alert_days', { min: 1, max: 365 }),
      isActive: f.bool('is_active', FILTER),
      displayOrder: f.int('display_order', { max: 9999, ...SORT }),
    },
  }),
];
