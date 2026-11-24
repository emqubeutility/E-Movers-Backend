import { PATTERNS } from '../../../utils/patterns.js';
import { OPERATIONS, f, key } from '../fields.js';
import { FILTER, REQUIRED, SEARCH, SORT, defineResource } from './helpers.js';

// Changing access rows is itself a way to gain access, so these need an administrator as well.
const security = (definition) =>
  defineResource({
    tag: 'access',
    menu: 'ACCESS_SETUP',
    adminOnly: true,
    audit: 'basic',
    ...definition,
  });

const menuRights = () => ({
  pageUrl: f.pattern('page_url', PATTERNS.path, { max: 350 }),
  isCreate: f.bool('is_create', FILTER),
  isEdit: f.bool('is_edit', FILTER),
  isDelete: f.bool('is_delete', FILTER),
});

export default [
  security({
    name: 'menu-items',
    model: 'menu_item',
    title: 'Menu items',
    singular: 'Menu item',
    keys: [key.int('menu_item_id')],
    optionLabel: ['menu_name'],
    activeColumn: 'is_active',
    defaultSort: { field: 'menuOrder', order: 'asc' },
    fields: {
      menuCode: f.pattern('menu_code', PATTERNS.dottedCode, {
        ...REQUIRED,
        ...SEARCH,
        max: 80,
        immutable: true,
      }),
      menuName: f.label('menu_name', { ...REQUIRED, ...SEARCH, min: 2, max: 100 }),
      menuParentId: f.ref('menu_parent_id'),
      menuOrder: f.int('menu_order', { max: 9999, ...SORT }),
      cssClass: f.text('css_class', { max: 50 }),
      pageUrl: f.pattern('page_url', PATTERNS.path, { max: 350 }),
      isMainMenu: f.bool('is_main_menu', FILTER),
      organizationId: f.bigRef('organization_id'),
      isActive: f.bool('is_active', FILTER),
    },
  }),
  security({
    name: 'menu-roles',
    model: 'menu_role',
    title: 'Menu access by role',
    singular: 'Menu access',
    menu: 'MENU_ACCESS',
    keys: [key.big('menu_role_id')],
    fields: {
      roleId: f.ref('role_id', { ...REQUIRED, immutable: true }),
      menuItemId: f.ref('menu_item_id', { ...REQUIRED, immutable: true }),
      ...menuRights(),
    },
  }),
  security({
    name: 'menu-functions',
    model: 'menu_function',
    title: 'Menu access by function',
    singular: 'Menu function',
    menu: 'MENU_ACCESS',
    operations: OPERATIONS.link,
    keys: [key.big('menu_function_id')],
    fields: {
      menuItemId: f.ref('menu_item_id', REQUIRED),
      functionId: f.param('function_id', 'MENU_FUNCTION', REQUIRED),
    },
  }),
  security({
    name: 'employee-functions',
    model: 'employee_function',
    title: 'Employee functions',
    singular: 'Employee function',
    operations: OPERATIONS.link,
    keys: [
      key.big('profile_id', 'profileId', { assigned: true, filter: true }),
      key.int('function_id', 'functionId', { assigned: true, filter: true }),
    ],
    fields: {},
  }),
  security({
    name: 'employee-organizations',
    model: 'employee_organization',
    title: 'Employee organizations',
    singular: 'Employee organization',
    operations: OPERATIONS.link,
    keys: [
      key.big('profile_id', 'profileId', { assigned: true, filter: true }),
      key.big('organization_id', 'organizationId', { assigned: true, filter: true }),
    ],
    fields: {},
  }),
  security({
    name: 'menu-special-user-access',
    model: 'menu_special_user_access',
    title: 'Menu exceptions by user',
    singular: 'Menu exception',
    audit: 'full',
    keys: [key.big('menu_special_user_access_id')],
    fields: {
      profileId: f.bigRef('profile_id', { ...REQUIRED, immutable: true }),
      menuItemId: f.ref('menu_item_id', { ...REQUIRED, immutable: true }),
      organizationId: f.bigRef('organization_id', { ...REQUIRED, immutable: true }),
      isInclude: f.bool('is_include', { ...REQUIRED, ...FILTER }),
      ...menuRights(),
    },
  }),
];
