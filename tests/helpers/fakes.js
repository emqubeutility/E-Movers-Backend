import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const ROLES = [
  { role_id: 1, role_code: 'SUPERADMIN', name: 'superadmin', role_level: 0 },
  { role_id: 2, role_code: 'ADMIN', name: 'admin', role_level: 1 },
  { role_id: 3, role_code: 'EXECUTIVE', name: 'Executive', role_level: 5 },
  { role_id: 4, role_code: 'AUDITOR', name: 'Auditor', role_level: 6 },
  { role_id: 5, role_code: 'TEAM_LEADER', name: 'Team Leader', role_level: 6 },
];
const PARAMETERS = [
  { parameter_id: 1, type: 'USER_TYPE', code: 'EMPLOYEE', label: 'Employee' },
  { parameter_id: 41, type: 'USER_TYPE', code: 'CUSTOMER', label: 'Customer' },
  { parameter_id: 2, type: 'ACCOUNT_STATUS', code: 'ACTIVE', label: 'Active' },
  { parameter_id: 3, type: 'ACCOUNT_STATUS', code: 'INACTIVE', label: 'Inactive' },
  { parameter_id: 4, type: 'ACCOUNT_STATUS', code: 'SUSPENDED', label: 'Suspended' },
  { parameter_id: 5, type: 'PAYMENT_TERM', code: 'CREDIT', label: 'Credit' },
  { parameter_id: 6, type: 'PAYMENT_TERM', code: 'ADVANCE_100', label: '100% Advance' },
  { parameter_id: 7, type: 'COMPANY_TYPE', code: 'AGENT', label: 'Agent' },
  { parameter_id: 8, type: 'COMPANY_TYPE', code: 'SUPPLIER', label: 'Supplier' },
  { parameter_id: 9, type: 'COMPANY_TYPE', code: 'CONTRACTOR', label: 'Contractor' },
  { parameter_id: 10, type: 'COMPANY_TYPE', code: 'COMPETITOR', label: 'Competitor' },
  { parameter_id: 20, type: 'MENU_FUNCTION', code: 'SALES', label: 'Sales' },
  { parameter_id: 21, type: 'MENU_FUNCTION', code: 'OPERATIONS', label: 'Operations' },
  { parameter_id: 30, type: 'SKILL', code: 'DRIVING', label: 'Driving' },
  { parameter_id: 31, type: 'SKILL', code: 'PACKING', label: 'Packing' },
  { parameter_id: 40, type: 'ADDRESS_TYPE', code: 'HOME', label: 'Home' },
];
const MENUS = [
  {
    menu_item_id: 1,
    menu_code: 'OVERVIEW',
    menu_name: 'Overview',
    menu_parent_id: null,
    menu_order: 1,
    css_class: 'layout-dashboard',
    page_url: '/overview',
    is_active: true,
  },
  {
    menu_item_id: 2,
    menu_code: 'ADMINISTRATION',
    menu_name: 'Administration',
    menu_parent_id: null,
    menu_order: 5,
    css_class: 'shield-check',
    page_url: null,
    is_active: true,
  },
  {
    menu_item_id: 3,
    menu_code: 'USERS',
    menu_name: 'Users',
    menu_parent_id: 2,
    menu_order: 6,
    css_class: 'users',
    page_url: '/users',
    is_active: true,
  },
  {
    menu_item_id: 4,
    menu_code: 'ROLES',
    menu_name: 'Roles',
    menu_parent_id: 2,
    menu_order: 7,
    css_class: 'shield-check',
    page_url: '/roles',
    is_active: true,
  },
  {
    menu_item_id: 5,
    menu_code: 'MENU_ACCESS',
    menu_name: 'Menu access',
    menu_parent_id: 2,
    menu_order: 8,
    css_class: 'key-round',
    page_url: '/menu-access',
    is_active: true,
  },
  {
    menu_item_id: 6,
    menu_code: 'MASTER',
    menu_name: 'Master',
    menu_parent_id: null,
    menu_order: 2,
    css_class: 'boxes',
    page_url: null,
    is_active: true,
  },
  {
    menu_item_id: 7,
    menu_code: 'CUSTOMER',
    menu_name: 'Customers',
    menu_parent_id: 6,
    menu_order: 3,
    css_class: 'user-round',
    page_url: '/customers',
    is_active: true,
  },
  {
    menu_item_id: 8,
    menu_code: 'COMPANY',
    menu_name: 'Companies',
    menu_parent_id: 6,
    menu_order: 4,
    css_class: 'building-2',
    page_url: '/companies',
    is_active: true,
  },
];

const menuPageUrl = (menuItemId) =>
  MENUS.find((menu) => menu.menu_item_id === menuItemId)?.page_url ?? null;

/** In-memory stand-in for createRoleRepository, returning rows in the same shape. */
export function createFakeRoleRepository() {
  const roles = [
    { role_id: 1, role_code: 'SUPERADMIN', name: 'Super admin', role_level: 0, is_active: true },
    { role_id: 2, role_code: 'ADMIN', name: 'Admin', role_level: 1, is_active: true },
  ];
  const permissions = [];
  let nextId = 3;

  const withPermissions = (role) => ({
    ...role,
    menu_role: permissions
      .filter((permission) => permission.role_id === role.role_id)
      .map((permission) => ({
        menu_item_id: permission.menu_item_id,
        page_url: permission.page_url,
        is_create: permission.is_create,
        is_edit: permission.is_edit,
        is_delete: permission.is_delete,
      })),
  });

  const writePermissions = (roleId, rows) => {
    for (let index = permissions.length - 1; index >= 0; index -= 1) {
      if (permissions[index].role_id === roleId) permissions.splice(index, 1);
    }
    for (const row of rows) permissions.push({ role_id: roleId, ...row });
  };

  const toRow = (row) => ({
    menu_item_id: row.menuItemId,
    page_url: menuPageUrl(row.menuItemId),
    is_create: row.create,
    is_edit: row.edit,
    is_delete: row.delete,
  });

  return {
    roles,
    list() {
      return roles.map(withPermissions);
    },
    listMenus() {
      return MENUS;
    },
    findById(id) {
      const role = roles.find((row) => row.role_id === id);
      return role ? withPermissions(role) : null;
    },
    findByCode(code) {
      return roles.find((role) => role.role_code === code) || null;
    },
    countAssignedUsers(id) {
      return roles.find((role) => role.role_id === id)?.assigned ?? 0;
    },
    countMenus(ids) {
      return MENUS.filter((menu) => ids.includes(menu.menu_item_id) && menu.is_active).length;
    },
    create({ roleCode, name, roleLevel, permissions: rows = [] }) {
      const role = {
        role_id: nextId++,
        role_code: roleCode,
        name,
        role_level: roleLevel,
        is_active: true,
        created_at: new Date(),
      };
      roles.push(role);
      writePermissions(role.role_id, rows.map(toRow));
      return withPermissions(role);
    },
    update(id, { name, roleLevel, isActive, permissions: rows }) {
      const role = roles.find((row) => row.role_id === id);
      if (name !== undefined) role.name = name;
      if (roleLevel !== undefined) role.role_level = roleLevel;
      if (isActive !== undefined) role.is_active = isActive;
      if (rows !== undefined) writePermissions(id, rows.map(toRow));
      return withPermissions(role);
    },
  };
}

/**
 * In-memory stand-in for createPermissionRepository. Grants are kept here (not in the role fake)
 * so a test can revoke a single action without rewriting a role.
 */
const DEFAULT_GRANTS = {
  ADMIN: {
    OVERVIEW: {},
    MASTER: {},
    CUSTOMER: { create: true, edit: true, delete: true },
    COMPANY: { create: true, edit: true, delete: true },
    ADMINISTRATION: {},
    USERS: { create: true, edit: true, delete: true },
    ROLES: { create: true, edit: true },
    MENU_ACCESS: { edit: true },
  },
  EXECUTIVE: { OVERVIEW: {}, CUSTOMER: {}, USERS: {} },
};

export function createFakePermissionRepository() {
  const grants = structuredClone(DEFAULT_GRANTS);
  const menuOwners = {};
  const userFunctions = new Map();

  return {
    listMenusForRole(roleCode) {
      const roleGrants = grants[roleCode] ?? {};
      return MENUS.map((menu) => {
        const actions = roleGrants[menu.menu_code];
        return {
          ...menu,
          menu_function: (menuOwners[menu.menu_code] ?? []).map((id) => ({ function_id: id })),
          menu_role: actions
            ? [
                {
                  is_create: Boolean(actions.create),
                  is_edit: Boolean(actions.edit),
                  is_delete: Boolean(actions.delete),
                },
              ]
            : [],
        };
      });
    },
    listActiveMenus() {
      return MENUS.map((menu) => ({ ...menu }));
    },
    listFunctionIdsForUser(userId) {
      return userFunctions.get(String(userId)) ?? [];
    },
    /** Test helpers: which functions own a menu, and which a login holds. */
    ownMenu(menuCode, functionId) {
      menuOwners[menuCode] = [...(menuOwners[menuCode] ?? []), functionId];
    },
    giveFunction(userId, functionId) {
      userFunctions.set(String(userId), [...(userFunctions.get(String(userId)) ?? []), functionId]);
    },
    /** Gives a role access to a menu; an empty object means view only. */
    grant(roleCode, menuCode, actions = {}) {
      grants[roleCode] = grants[roleCode] || {};
      grants[roleCode][menuCode] = {
        create: Boolean(actions.create),
        edit: Boolean(actions.edit),
        delete: Boolean(actions.delete),
      };
    },
    revoke(roleCode, menuCode) {
      if (grants[roleCode]) delete grants[roleCode][menuCode];
    },
  };
}

/** In-memory stand-in for createMenuAccessRepository, with the same row shapes. */
export function createFakeMenuAccessRepository() {
  const menus = MENUS.map((menu) => ({ ...menu }));
  const roles = [
    { role_id: 1, role_code: 'SUPERADMIN', name: 'superadmin' },
    { role_id: 2, role_code: 'ADMIN', name: 'admin' },
    { role_id: 3, role_code: 'EXECUTIVE', name: 'Executive' },
  ];
  const functions = [
    { parameter_id: 10, code: 'SALES', label: 'Sales' },
    { parameter_id: 11, code: 'OPERATIONS', label: 'Operations' },
    { parameter_id: 12, code: 'STORES', label: 'Stores' },
  ];
  // role id -> menu id -> action flags
  const roleRows = new Map();
  // function id -> menu ids it applies to
  const functionMenus = new Map([
    [10, new Set([3, 4, 7, 8])],
    [11, new Set([3, 4, 7, 8])],
    [12, new Set([3, 7, 8])],
  ]);

  const grant = (roleId, menuId, flags = {}) => {
    if (!roleRows.has(roleId)) roleRows.set(roleId, new Map());
    roleRows.get(roleId).set(menuId, {
      is_create: false,
      is_edit: false,
      is_delete: false,
      ...flags,
    });
  };
  grant(2, 1);
  grant(2, 2);
  grant(2, 3, { is_create: true, is_edit: true, is_delete: true });
  grant(2, 4, { is_create: true, is_edit: true });
  grant(2, 5);
  grant(2, 6);
  grant(2, 7, { is_create: true, is_edit: true, is_delete: true });
  grant(2, 8, { is_create: true, is_edit: true, is_delete: true });
  grant(3, 1);
  grant(3, 3);
  grant(3, 7);

  return {
    roleRows,
    functionMenus,
    listActiveMenus: () => menus,
    findRole: (id) => roles.find((role) => role.role_id === id) ?? null,
    listRoleGrants: (id) =>
      [...(roleRows.get(id) ?? new Map())].map(([menuId, flags]) => ({
        menu_item_id: menuId,
        ...flags,
      })),
    countActiveMenus: (ids) => menus.filter((menu) => ids.includes(menu.menu_item_id)).length,
    replaceRoleMenus(roleId, grants) {
      const rows = new Map();
      for (const grant of grants) {
        rows.set(grant.menuItemId, {
          is_create: grant.create,
          is_edit: grant.edit,
          is_delete: grant.delete,
        });
      }
      roleRows.set(roleId, rows);
    },
    listFunctions: () => functions,
    findFunction: (id) => functions.find((fn) => fn.parameter_id === id) ?? null,
    listFunctionMenuIds: (id) => [...(functionMenus.get(id) ?? [])],
    replaceFunctionMenus(functionId, ids) {
      functionMenus.set(functionId, new Set(ids));
    },
  };
}

/** In-memory stand-in for createCustomerRepository. */
export function createFakeCustomerRepository() {
  const rows = [];
  const relation = (id) => {
    const parameter = PARAMETERS.find((item) => item.parameter_id === id);
    return parameter ? { code: parameter.code, label: parameter.label } : null;
  };
  const build = (data, id) => ({
    public_id: id,
    customer_kind: data.kind,
    customer_code: data.code,
    customer_name: data.name ?? null,
    whatsapp_optin: data.agreedToWhatsapp ?? true,
    created_at: new Date(),
    updated_at: new Date(),
    parameter_customer_status_idToparameter: relation(data.statusId) ?? {
      code: 'ACTIVE',
      label: 'Active',
    },
    customer_profile: [
      {
        is_master: true,
        profile: {
          name: data.contactName || data.name || null,
          email: data.email || null,
          contact_no: data.contactNo || null,
          alt_contact_no: data.altContactNo || null,
          designation: data.designation || null,
        },
      },
      ...(data.contacts ?? []).map((contact, index) => ({
        is_master: false,
        profile: {
          public_id: contact.id ?? `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
          name: contact.name,
          email: contact.email || null,
          contact_no: contact.contactNo || null,
          alt_contact_no: contact.altContactNo || null,
          designation: contact.designation || null,
        },
      })),
    ],
    deleted_at: null,
  });
  const optionsOf = (type) =>
    PARAMETERS.filter((parameter) => parameter.type === type).map(({ code, label }) => ({
      code,
      label,
    }));

  return {
    rows,
    async list({ skip, take, search, status, kind, sortBy, sortOrder }) {
      let found = rows.filter(
        (row) =>
          !row.deleted_at &&
          (!status || row.parameter_customer_status_idToparameter.code === status) &&
          (!kind || row.customer_kind === kind),
      );
      if (search) {
        const term = search.toLowerCase();
        found = found.filter((row) =>
          [
            row.customer_code,
            row.customer_name,
            row.customer_profile?.[0]?.profile.name,
            row.customer_profile?.[0]?.profile.email,
            row.customer_profile?.[0]?.profile.contact_no,
          ].some((value) => value?.toLowerCase().includes(term)),
        );
      }
      const key =
        { createdAt: 'created_at', code: 'customer_code', name: 'customer_name' }[sortBy] ??
        'created_at';
      found = [...found].sort(
        (left, right) =>
          String(left[key] ?? '').localeCompare(String(right[key] ?? '')) *
          (sortOrder === 'desc' ? -1 : 1),
      );
      return { rows: found.slice(skip, skip + take), total: found.length };
    },
    findByPublicId: (id) => rows.find((row) => row.public_id === id && !row.deleted_at) ?? null,
    codeExists: (code, exclude) =>
      rows.some(
        (row) => !row.deleted_at && row.customer_code === code && row.public_id !== exclude,
      ),
    nextCode: () => {
      const top = Math.max(0, ...rows.map((row) => Number(row.customer_code.slice(4)) || 0));
      return `CUS-${String(top + 1).padStart(3, '0')}`;
    },
    companyContactNosTaken: (numbers, exclude) =>
      rows
        .filter(
          (row) => !row.deleted_at && row.customer_kind === 'COMPANY' && row.public_id !== exclude,
        )
        .flatMap((row) => row.customer_profile.map((link) => link.profile.contact_no))
        .filter((number) => number && numbers.includes(number)),
    contactNoTaken: (contactNo, kind, exclude) =>
      rows.some(
        (row) =>
          !row.deleted_at &&
          row.customer_kind === kind &&
          row.public_id !== exclude &&
          row.customer_profile[0].profile.contact_no === contactNo,
      ),
    findParameter: (typeCode, code) =>
      PARAMETERS.find((parameter) => parameter.type === typeCode && parameter.code === code) ??
      null,
    listOptions: () => ({
      kinds: [
        { code: 'INDIVIDUAL', label: 'Individual' },
        { code: 'COMPANY', label: 'Company' },
      ],
      statuses: optionsOf('ACCOUNT_STATUS'),
    }),
    create(data) {
      const row = build(data, randomUUID());
      row._data = data;
      rows.push(row);
      return row;
    },
    update(publicId, data) {
      const row = rows.find((item) => item.public_id === publicId);
      const merged = { ...row._data };
      for (const [key, value] of Object.entries(data)) if (value !== undefined) merged[key] = value;
      Object.assign(row, build(merged, publicId));
      row._data = merged;
      return row;
    },
    softDelete(publicId) {
      const row = rows.find((item) => item.public_id === publicId);
      row.deleted_at = new Date();
    },
  };
}

/** In-memory stand-in for createCompanyRepository. */
export function createFakeCompanyRepository() {
  const rows = [];
  const relation = (id) => {
    const parameter = PARAMETERS.find((item) => item.parameter_id === id);
    return parameter ? { code: parameter.code, label: parameter.label } : null;
  };
  const build = (data, id) => ({
    public_id: id,
    organization_id: data.organizationId ?? 1n,
    company_code: data.code,
    name: data.name,
    contact_name: data.contactName ?? null,
    email: data.email ?? null,
    contact_no: data.contactNo ?? null,
    website: data.website ?? null,
    services: data.services ?? null,
    notes: data.notes ?? null,
    created_at: new Date(),
    updated_at: new Date(),
    parameter_company_company_type_idToparameter: relation(data.companyTypeId),
    parameter_company_status_idToparameter: relation(data.statusId) ?? {
      code: 'ACTIVE',
      label: 'Active',
    },
    parameter_company_payment_term_idToparameter: relation(data.paymentTermId),
    deleted_at: null,
  });
  const optionsOf = (type) =>
    PARAMETERS.filter((parameter) => parameter.type === type).map(({ code, label }) => ({
      code,
      label,
    }));

  return {
    rows,
    async list({ skip, take, search, status, companyType, sortBy, sortOrder, organizationId }) {
      let found = rows.filter(
        (row) =>
          !row.deleted_at &&
          (!organizationId || row.organization_id === organizationId) &&
          (!status || row.parameter_company_status_idToparameter.code === status) &&
          (!companyType || row.parameter_company_company_type_idToparameter?.code === companyType),
      );
      if (search) {
        const term = search.toLowerCase();
        found = found.filter((row) =>
          [row.company_code, row.name, row.contact_name].some((value) =>
            value?.toLowerCase().includes(term),
          ),
        );
      }
      const key =
        { createdAt: 'created_at', code: 'company_code', name: 'name' }[sortBy] ?? 'created_at';
      found = [...found].sort(
        (left, right) =>
          String(left[key] ?? '').localeCompare(String(right[key] ?? '')) *
          (sortOrder === 'desc' ? -1 : 1),
      );
      return { rows: found.slice(skip, skip + take), total: found.length };
    },
    findByPublicId: (id, organizationId) =>
      rows.find(
        (row) =>
          row.public_id === id &&
          !row.deleted_at &&
          (!organizationId || row.organization_id === organizationId),
      ) ?? null,
    codeExists: (code, exclude) =>
      rows.some((row) => !row.deleted_at && row.company_code === code && row.public_id !== exclude),
    findParameter: (typeCode, code) =>
      PARAMETERS.find((parameter) => parameter.type === typeCode && parameter.code === code) ??
      null,
    listOptions: () => ({
      companyTypes: optionsOf('COMPANY_TYPE'),
      statuses: optionsOf('ACCOUNT_STATUS'),
      paymentTerms: optionsOf('PAYMENT_TERM'),
    }),
    create(data) {
      const row = build(data, randomUUID());
      row._data = data;
      rows.push(row);
      return row;
    },
    update(publicId, data) {
      const row = rows.find((item) => item.public_id === publicId);
      const merged = { ...row._data };
      for (const [key, value] of Object.entries(data)) if (value !== undefined) merged[key] = value;
      Object.assign(row, build(merged, publicId));
      row._data = merged;
      return row;
    },
    softDelete(publicId) {
      const row = rows.find((item) => item.public_id === publicId);
      row.deleted_at = new Date();
    },
    async organizationExists(organizationId) {
      return [1, 2].includes(Number(organizationId));
    },
    async employeeCountOf() {
      return 0;
    },
  };
}

/** In-memory stand-ins for the Prisma repositories, returning rows in the same shape. */
/** Test logins: the employee code is the part of the address before the @, upper-cased. */
export const CONTRACTOR_ID = '3f2b8c1e-5d4a-4e7b-9a10-6c2d8e4f1a22';
export const codeFromEmail = (email) =>
  email
    .split('@')[0]
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();

/** The body POST /auth/login expects, built from a { email, password } test account. */
export const loginBody = ({ email, password }) => ({ username: codeFromEmail(email), password });

export function createFakeRepositories() {
  const users = [];
  const sessions = [];
  const roleRepository = createFakeRoleRepository();
  const permissionRepository = createFakePermissionRepository();
  const customerRepository = createFakeCustomerRepository();
  const companyRepository = createFakeCompanyRepository();
  let nextId = 1n;

  const roleById = (id) => ROLES.find((role) => role.role_id === id);
  const statusById = (id) => PARAMETERS.find((parameter) => parameter.parameter_id === id);
  const live = () => users.filter((user) => !user.deleted_at);

  function insert(data) {
    const now = new Date();
    const role = roleById(data.roleId);
    const status = statusById(data.statusId);
    const row = {
      user_id: nextId++,
      public_id: randomUUID(),
      username: data.username ?? data.employeeCode ?? codeFromEmail(data.email),
      password_hash: data.passwordHash,
      can_sign_in: data.canSignIn ?? true,
      can_login: data.canLogin ?? true,
      failed_login_count: 0,
      locked_until: null,
      last_login_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      role: { role_code: role.role_code, name: role.name, role_level: role.role_level },
      status: { code: status.code, label: status.label },
      profile: {
        status: { code: status.code, label: status.label },
        name: data.firstName,
        last_name: data.lastName || null,
        contact_no: data.phone || null,
        designation: data.designation || null,
        email: data.email ?? null,
        public_id: randomUUID(),
        nationality: data.nationalityId
          ? { code: data.nationalityId === 1 ? 'IN' : 'AE', name: 'N' }
          : null,
        address_profile_address_idToaddress: addressRow(data.address),
        employee: {
          employee_code: data.employeeCode ?? codeFromEmail(data.email),
          person_type: data.personType ?? 'SITE_USER',
          // Home organization, as the real repository stores it on the employee row.
          organization_id: data.employeeOrganizationId ?? data.organizationId ?? null,
          organization: null,
          is_outsourced: data.isOutsourced ?? false,
          company: data.contractorCompanyId
            ? { public_id: CONTRACTOR_ID, name: 'Swift Movers' }
            : null,
          employee_organization: (data.organizationIds ?? []).map((id) => ({
            organization_id: id,
          })),
          employee_skill: skillRows(data.skillIds),
          team_member_team_member_leader_profile_idToemployee: crewRows(data.crewProfileIds),
          ...employeeOf(data.functionIds),
        },
      },
    };
    users.push(row);
    return row;
  }

  const inOrganization = (user, organizationId) =>
    (user.profile.employee.organization_id !== null &&
      BigInt(user.profile.employee.organization_id) === organizationId) ||
    user.profile.employee.employee_organization.some(
      (item) => BigInt(item.organization_id) === organizationId,
    );

  const skillRows = (ids) =>
    (ids ?? []).map((id) => {
      const p = PARAMETERS.find((row) => row.parameter_id === id);
      return { parameter: { code: p.code, label: p.label } };
    });

  const addressRow = (address) =>
    address
      ? {
          address_text: address.addressText,
          postal_code: address.postalCode ?? null,
          country: { country_id: address.countryId, name: 'Country ' + address.countryId },
          state: address.stateId
            ? { state_id: address.stateId, name: 'State ' + address.stateId }
            : null,
          city: address.cityId ? { city_id: address.cityId, name: 'City ' + address.cityId } : null,
        }
      : null;

  const crewRows = (profileIds) =>
    (profileIds ?? []).map((profileId) => {
      const member = users.find((user) => user.user_id === profileId);
      return {
        employee_team_member_member_profile_idToemployee: {
          employee_code: member.profile.employee.employee_code,
          profile: {
            public_id: member.profile.public_id,
            name: member.profile.name,
            last_name: member.profile.last_name,
          },
        },
      };
    });

  const employeeOf = (functionIds) => ({
    employee_function: (functionIds ?? []).map((id) => ({
      parameter: { code: PARAMETERS.find((p) => p.parameter_id === id).code },
    })),
  });

  const userRepository = {
    async findLowestRole() {
      return [...ROLES]
        .filter((role) => !['SUPERADMIN', 'ADMIN'].includes(role.role_code))
        .sort((a, b) => b.role_level - a.role_level)[0];
    },
    async listParameters(typeCode, codes) {
      return PARAMETERS.filter((p) => p.type === typeCode && codes.includes(p.code));
    },
    async countOrganizations(ids) {
      return ids.filter((id) => [1, 2, 3].includes(id)).length;
    },
    async findNationalityId(code) {
      return { IN: 1, AE: 2 }[code] ?? null;
    },
    async countryExists(countryId) {
      return countryId === 1;
    },
    // One active contractor company in organization 1.
    async findContractor(publicId) {
      return publicId === CONTRACTOR_ID ? { company_id: 7n, organization_id: 1n } : null;
    },
    // State 10 and city 100 belong to country 1; state 99 belongs elsewhere.
    async locationIsValid({ countryId, stateId, cityId }) {
      return countryId === 1 && (!stateId || stateId === 10) && (!cityId || cityId === 100);
    },
    async listCrewCandidates({ publicIds, organizationIds, skillCode, excludeProfilePublicId }) {
      return live()
        .filter((user) => {
          const employee = user.profile.employee;
          if (employee.person_type !== 'EMPLOYEE' || user.status.code !== 'ACTIVE') return false;
          if (publicIds && !publicIds.includes(user.profile.public_id)) return false;
          if (excludeProfilePublicId && user.profile.public_id === excludeProfilePublicId)
            return false;
          if (!employee.employee_skill.length) return false;
          if (
            skillCode &&
            !employee.employee_skill.some((item) => item.parameter.code === skillCode)
          )
            return false;
          return (
            !organizationIds?.length ||
            organizationIds.some((id) => inOrganization(user, BigInt(id)))
          );
        })
        .map((user) => ({
          profile_id: user.user_id,
          employee_code: user.profile.employee.employee_code,
          profile: user.profile,
          employee_skill: user.profile.employee.employee_skill,
        }));
    },
    async list({ skip, take, search, role, status, sortOrder, organizationId }) {
      let rows = live().filter((user) => !organizationId || inOrganization(user, organizationId));
      if (role) rows = rows.filter((user) => user.role.role_code === role);
      if (status) rows = rows.filter((user) => user.status.code === status);
      if (search) {
        const term = search.toLowerCase();
        rows = rows.filter((user) =>
          [user.username, user.profile.name, user.profile.last_name || ''].some((value) =>
            value.toLowerCase().includes(term),
          ),
        );
      }
      rows = [...rows].sort((a, b) => a.created_at - b.created_at || Number(a.user_id - b.user_id));
      if (sortOrder === 'desc') rows.reverse();
      return { rows: rows.slice(skip, skip + take), total: rows.length };
    },
    async summary({ recentCount, organizationId }) {
      const rows = live().filter((user) => !organizationId || inOrganization(user, organizationId));
      const countBy = (keyOf, labelKey, labelOf) =>
        Object.values(
          rows.reduce((groups, user) => {
            const code = keyOf(user);
            groups[code] = groups[code] || { code, [labelKey]: labelOf(user), count: 0 };
            groups[code].count += 1;
            return groups;
          }, {}),
        );
      return {
        total: rows.length,
        byRole: countBy(
          (user) => user.role.role_code,
          'name',
          (user) => user.role.name,
        ),
        byStatus: countBy(
          (user) => user.status.code,
          'label',
          (user) => user.status.label,
        ),
        recent: [...rows].reverse().slice(0, recentCount),
      };
    },

    async findById(publicId, organizationId) {
      return (
        live().find(
          (user) =>
            user.public_id === publicId &&
            (!organizationId || inOrganization(user, organizationId)),
        ) || null
      );
    },
    async findAuthById(publicId) {
      return live().find((user) => user.public_id === publicId) || null;
    },
    async findAuthByUsername(username) {
      return users.find((user) => user.username.toLowerCase() === username.toLowerCase()) || null;
    },
    async usernameExists(username) {
      return users.some((user) => user.username.toLowerCase() === username.toLowerCase());
    },
    async emailExists(email, excludePublicId) {
      const found = live().find(
        (user) => user.profile.email?.toLowerCase() === email.toLowerCase(),
      );
      return Boolean(found) && found.public_id !== excludePublicId;
    },
    async employeeCodeExists(code) {
      return users.some((user) => user.profile.employee?.employee_code === code);
    },
    async findHeadOfficeId() {
      return 1;
    },
    async findRoleByCode(code) {
      return ROLES.find((role) => role.role_code === code) || null;
    },
    async listRoles() {
      return ROLES;
    },
    async findParameter(typeCode, code) {
      return PARAMETERS.find((p) => p.type === typeCode && p.code === code) || null;
    },
    async create(data) {
      return insert(data);
    },
    async update(publicId, data) {
      const row = users.find((user) => user.public_id === publicId);
      if (data.email !== undefined) row.username = data.email;
      if (data.firstName !== undefined) row.profile.name = data.firstName;
      if (data.lastName !== undefined) row.profile.last_name = data.lastName || null;
      if (data.phone !== undefined) row.profile.contact_no = data.phone || null;
      if (data.designation !== undefined) row.profile.designation = data.designation || null;
      if (data.functionIds !== undefined) {
        row.profile.employee = { ...row.profile.employee, ...employeeOf(data.functionIds) };
      }
      if (data.email !== undefined) row.profile.email = data.email || null;
      if (data.personType !== undefined) row.profile.employee.person_type = data.personType;
      if (data.isOutsourced !== undefined) {
        row.profile.employee.is_outsourced = data.isOutsourced;
        row.profile.employee.company = data.contractorCompanyId
          ? { public_id: CONTRACTOR_ID, name: 'Swift Movers' }
          : null;
      }
      if (data.canSignIn !== undefined) row.can_sign_in = data.canSignIn;
      if (data.canLogin !== undefined) row.can_login = data.canLogin;
      if (data.organizationIds !== undefined) {
        row.profile.employee.employee_organization = data.organizationIds.map((id) => ({
          organization_id: id,
        }));
        row.profile.employee.organization_id =
          data.defaultOrganizationId ?? data.organizationIds[0] ?? null;
      }
      if (data.skillIds !== undefined)
        row.profile.employee.employee_skill = skillRows(data.skillIds);
      if (data.nationalityId !== undefined)
        row.profile.nationality = data.nationalityId
          ? { code: data.nationalityId === 1 ? 'IN' : 'AE', name: 'N' }
          : null;
      if (data.address !== undefined)
        row.profile.address_profile_address_idToaddress = addressRow(data.address);
      if (data.crewProfileIds !== undefined)
        row.profile.employee.team_member_team_member_leader_profile_idToemployee = crewRows(
          data.crewProfileIds,
        );
      if (data.leaveTeams) {
        for (const other of users) {
          other.profile.employee.team_member_team_member_leader_profile_idToemployee =
            other.profile.employee.team_member_team_member_leader_profile_idToemployee.filter(
              (item) =>
                item.employee_team_member_member_profile_idToemployee.profile.public_id !==
                row.profile.public_id,
            );
        }
      }
      if (data.roleId !== undefined) {
        const role = roleById(data.roleId);
        row.role = { role_code: role.role_code, name: role.name, role_level: role.role_level };
      }
      if (data.statusId !== undefined) {
        const status = statusById(data.statusId);
        row.status = { code: status.code, label: status.label };
        row.profile.status = row.status;
      }
      if (data.passwordHash !== undefined) {
        row.password_hash = data.passwordHash;
      }
      row.updated_at = new Date();
      return row;
    },
    async softDelete(publicId) {
      const row = users.find((user) => user.public_id === publicId);
      row.deleted_at = new Date();
      sessions.filter((s) => s.user_id === row.user_id).forEach((s) => (s.revoked_at = new Date()));
    },
    async recordLoginSuccess(userId) {
      const row = users.find((user) => user.user_id === userId);
      row.last_login_at = new Date();
      row.failed_login_count = 0;
      row.locked_until = null;
    },
    async recordLoginFailure(userId, { failedCount, lockedUntil }) {
      const row = users.find((user) => user.user_id === userId);
      row.failed_login_count = failedCount;
      row.locked_until = lockedUntil;
    },
  };

  const authRepository = {
    async createSession({ userId, tokenHash, expiresAt, organizationId = null }) {
      const session = {
        session_id: randomUUID(),
        user_id: userId,
        organization_id: organizationId,
        tokenHash,
        expires_at: expiresAt,
        revoked_at: null,
      };
      sessions.push(session);
      return { session_id: session.session_id };
    },
    async findSessionByHash(tokenHash) {
      const session = sessions.find((s) => s.tokenHash === tokenHash);
      if (!session) return null;
      const owner = users.find((user) => user.user_id === session.user_id);
      return { ...session, app_user: { public_id: owner.public_id } };
    },
    async setSessionOrganization(sessionId, organizationId) {
      const session = sessions.find((s) => s.session_id === sessionId);
      session.organization_id = organizationId;
    },
    async revokeSession(sessionId) {
      const session = sessions.find((s) => s.session_id === sessionId);
      if (!session || session.revoked_at) return { count: 0 };
      session.revoked_at = new Date();
      return { count: 1 };
    },
  };

  /** Adds a user directly, bypassing the service (used to arrange test data). */
  async function seedUser({
    email,
    password,
    role = 'EXECUTIVE',
    status = 'ACTIVE',
    firstName = 'Test',
    lastName = 'User',
    organizationId = 1n,
    personType = 'SITE_USER',
    skills = [],
    organizationIds = [],
    employeeCode,
    canSignIn = true,
    canLogin = true,
  }) {
    return insert({
      organizationId,
      personType,
      employeeCode,
      canSignIn,
      canLogin,
      organizationIds,
      skillIds: skills.map(
        (code) => PARAMETERS.find((p) => p.type === 'SKILL' && p.code === code).parameter_id,
      ),
      email,
      passwordHash: await bcrypt.hash(password, 4),
      firstName,
      lastName,
      roleId: ROLES.find((r) => r.role_code === role).role_id,
      statusId: PARAMETERS.find((p) => p.type === 'ACCOUNT_STATUS' && p.code === status)
        .parameter_id,
    });
  }

  return {
    userRepository,
    authRepository,
    roleRepository,
    permissionRepository,
    customerRepository,
    companyRepository,
    seedUser,
    users,
    sessions,
  };
}
