import { f, key } from '../fields.js';
import { FILTER, REQUIRED, SEARCH, SORT, defineResource } from './helpers.js';

const master = (definition) =>
  defineResource({
    tag: 'services',
    menu: 'SERVICE_TYPES',
    audit: 'basic',
    activeColumn: 'is_active',
    ...definition,
  });

export default [
  master({
    name: 'service-groups',
    model: 'service_group',
    title: 'Service groups',
    singular: 'Service group',
    keys: [key.int('service_group_id')],
    optionLabel: ['name'],
    defaultSort: { field: 'displayOrder', order: 'asc' },
    fields: {
      code: f.code('code', { ...REQUIRED, ...SEARCH, immutable: true }),
      name: f.label('name', { ...REQUIRED, ...SEARCH, ...SORT, min: 2, max: 150 }),
      fileId: f.bigRef('file_id', { filter: false }),
      displayOrder: f.int('display_order', { max: 9999, ...SORT }),
      isActive: f.bool('is_active', FILTER),
    },
  }),
  master({
    name: 'service-types',
    model: 'service_type',
    title: 'Service types',
    singular: 'Service type',
    keys: [key.int('service_type_id')],
    optionLabel: ['name'],
    defaultSort: { field: 'name', order: 'asc' },
    fields: {
      serviceGroupId: f.ref('service_group_id', REQUIRED),
      name: f.label('name', { ...REQUIRED, ...SEARCH, ...SORT, min: 2, max: 250 }),
      displayOrder: f.int('display_order', { max: 9999, ...SORT }),
      isActive: f.bool('is_active', FILTER),
    },
  }),
];
