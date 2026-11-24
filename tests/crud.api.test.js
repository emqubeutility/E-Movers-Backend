import { readFileSync } from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { RESOURCES } from '../src/modules/crud/resources/index.js';
import { createFakeRepositories, loginBody } from './helpers/fakes.js';

const ADMIN = { email: 'admin@example.com', password: 'Adm1n!Passw0rd' };
const STAFF = { email: 'staff@example.com', password: 'St4ff!Passw0rd' };
const OWNER = { email: 'owner@example.com', password: '0wner!Passw0rd' };
const VIEWER = { email: 'viewer@example.com', password: 'V1ewer!Passw0rd' };

const MENU_CODES = ['GEOGRAPHY', 'ACCESS_SETUP', 'PARAMETERS', 'ORGANIZATIONS'];
/** Grants per role: [menu, create, edit, delete]. */
const GRANTS = {
  ADMIN: [
    ['GEOGRAPHY', true, true, true],
    ['ACCESS_SETUP', true, true, true],
    ['ORGANIZATIONS', true, true, true],
  ],
  AUDITOR: [['GEOGRAPHY', true, false, false]],
  EXECUTIVE: [],
};

const permissionRepository = {
  listMenusForRole(roleCode) {
    return MENU_CODES.map((code, index) => {
      const grant = (GRANTS[roleCode] ?? []).find(([menu]) => menu === code);
      return {
        menu_item_id: index + 1,
        menu_code: code,
        menu_name: code,
        menu_order: index,
        menu_parent_id: null,
        css_class: null,
        page_url: null,
        menu_role: grant ? [{ is_create: grant[1], is_edit: grant[2], is_delete: grant[3] }] : [],
      };
    });
  },
  listActiveMenus: () => [],
  listFunctionIdsForUser: () => [],
};

const ORGANIZATION_ROW = {
  organization_id: 1n,
  organization_code: 'HO',
  name: 'Head Office',
  is_head_office: true,
  is_active: true,
};

/** One organization (id 1); get, create and update go through modules/organization. */
const organizationRepository = {
  findById: async (id, scope) =>
    BigInt(id) === 1n && (!scope || scope === 1n) ? ORGANIZATION_ROW : null,
  codeExists: async () => false,
  findParameter: async () => ({ parameter_id: 1 }),
  currencyExists: async () => true,
  timeZoneExists: async () => true,
  fileExists: async () => true,
  countryExists: async () => true,
  locationIsValid: async () => true,
  create: async (data) => ({ ...ORGANIZATION_ROW, organization_code: data.organizationCode }),
  update: async (id, data) => ({ ...ORGANIZATION_ROW, name: data.name ?? ORGANIZATION_ROW.name }),
};

const crudRepository = () => ({
  list: async () => ({ rows: [], total: 0 }),
  options: async () => [],
  findOne: async (conditions) =>
    conditions.some((c) => c.column === 'organization_id' && c.value !== 1n)
      ? null
      : ORGANIZATION_ROW,
  create: async (data) => ({ country_id: 1, iso2: data.iso2, iso3: data.iso3, name: data.name }),
  update: async (keys, data) => ({ ...ORGANIZATION_ROW, ...data }),
  remove: async () => ({}),
});

const lookups = {
  parameterTypesOf: async () => new Map(),
  dropdownValues: async () => [
    {
      parameter_id: 1,
      code: 'MALE',
      label: 'Male',
      is_default: true,
      color_hex: null,
      parent_parameter_id: null,
      parameter_type: { code: 'GENDER' },
    },
    {
      parameter_id: 2,
      code: 'FEMALE',
      label: 'Female',
      is_default: false,
      color_hex: null,
      parent_parameter_id: null,
      parameter_type: { code: 'GENDER' },
    },
  ],
  dropdownTypes: async () => [],
};

describe('generic CRUD', () => {
  let app;
  const tokens = {};
  const call = (token, method, url, body) => {
    const req = request(app.server)[method](url);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return body === undefined ? req : req.send(body);
  };

  beforeAll(async () => {
    const fakes = createFakeRepositories();
    await fakes.seedUser({ ...ADMIN, role: 'ADMIN', firstName: 'Ada' });
    await fakes.seedUser({ ...STAFF, role: 'AUDITOR', firstName: 'Max' });
    await fakes.seedUser({ ...OWNER, role: 'SUPERADMIN', firstName: 'Sam', organizationId: null });
    await fakes.seedUser({ ...VIEWER, role: 'EXECUTIVE', firstName: 'Eve' });
    app = await buildApp({
      repositories: {
        userRepository: fakes.userRepository,
        authRepository: fakes.authRepository,
        permissionRepository,
        createCrudRepository: crudRepository,
        organizationRepository,
        lookups,
      },
      checkDatabase: async () => true,
    });
    await app.ready();
    for (const [name, user] of Object.entries({
      admin: ADMIN,
      staff: STAFF,
      viewer: VIEWER,
      owner: OWNER,
    })) {
      tokens[name] = (
        await request(app.server).post('/api/v1/auth/login').send(loginBody(user))
      ).body.data.accessToken;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires a token', async () => {
    expect((await call(null, 'get', '/api/v1/countries')).status).toBe(401);
  });

  it('allows a role with the menu grant and refuses one without it', async () => {
    expect((await call(tokens.staff, 'get', '/api/v1/countries')).status).toBe(200);
    expect((await call(tokens.viewer, 'get', '/api/v1/countries')).status).toBe(403);
  });

  it('checks the action, not just the menu', async () => {
    const body = { iso2: 'AE', iso3: 'ARE', name: 'United Arab Emirates' };
    expect((await call(tokens.staff, 'post', '/api/v1/countries', body)).status).toBe(201);
    expect((await call(tokens.staff, 'put', '/api/v1/countries/1', { name: 'UAE' })).status).toBe(
      403,
    );
    expect((await call(tokens.staff, 'delete', '/api/v1/countries/1')).status).toBe(403);
  });

  it('validates input before touching the database', async () => {
    const response = await call(tokens.admin, 'post', '/api/v1/countries', {
      iso2: 'ae',
      iso3: 'ARE',
      name: 'X',
    });
    expect(response.status).toBe(422);
  });

  it('keeps access-setup tables for administrators even when another role has the grant', async () => {
    expect((await call(tokens.admin, 'get', '/api/v1/menu-items')).status).toBe(200);
    expect((await call(tokens.staff, 'get', '/api/v1/menu-items')).status).toBe(403);
  });

  it('lets an organization admin edit their own organization but not head-office or active flags', async () => {
    expect(
      (await call(tokens.admin, 'put', '/api/v1/organizations/1', { name: 'New name' })).status,
    ).toBe(200);
    expect(
      (await call(tokens.admin, 'put', '/api/v1/organizations/1', { isHeadOffice: false })).status,
    ).toBe(403);
    expect(
      (await call(tokens.admin, 'put', '/api/v1/organizations/1', { isActive: false })).status,
    ).toBe(403);
  });

  it('hides another organization from an organization admin', async () => {
    expect((await call(tokens.admin, 'get', '/api/v1/organizations/1')).status).toBe(200);
    expect((await call(tokens.admin, 'get', '/api/v1/organizations/2')).status).toBe(404);
    expect(
      (await call(tokens.admin, 'put', '/api/v1/organizations/2', { name: 'Other org' })).status,
    ).toBe(404);
  });

  it('keeps creating and deleting organizations for the super administrator', async () => {
    const body = {
      organizationCode: 'NEW-ORG',
      name: 'New Org',
      contactPerson: { name: 'Joshi' },
      leadEmail: 'lead@example.com',
      leadCcEmail: 'cc@example.com',
      volumeUom: 'CBM',
      furnitureVolumeUom: 'CFT',
      currencyId: 1,
      timeZoneId: 1,
      quoteReviewMinLimit: 20000,
      vatPercent: 5,
      profitPercent: 8,
      displayColor: '#800000',
    };
    expect((await call(tokens.admin, 'post', '/api/v1/organizations', body)).status).toBe(403);
    expect((await call(tokens.admin, 'delete', '/api/v1/organizations/1')).status).toBe(403);
    expect((await call(tokens.owner, 'post', '/api/v1/organizations', body)).status).toBe(201);
  });

  it('serves dropdown values to any signed-in user, grouped by type', async () => {
    const response = await call(tokens.viewer, 'get', '/api/v1/dropdowns?types=GENDER');
    expect(response.status).toBe(200);
    expect(response.body.data.GENDER.map((option) => option.label)).toEqual(['Male', 'Female']);
    expect((await call(null, 'get', '/api/v1/dropdowns?types=GENDER')).status).toBe(401);
  });
});

describe('CRUD resource definitions', () => {
  const schema = readFileSync(
    new URL('../prisma/schema.prisma', import.meta.url),
    'utf8',
  ).replaceAll(String.fromCharCode(13), '');
  const NL = String.fromCharCode(10);
  const columnsOf = (model) => {
    const start = schema.indexOf(`model ${model} {`);
    if (start < 0) return null;
    const body = schema.slice(start, schema.indexOf(NL + '}', start));
    return new Set(
      body
        .split(NL)
        .slice(1)
        .map((line) => line.trim().split(' ')[0]),
    );
  };

  it.each(RESOURCES.map((resource) => [resource.name, resource]))(
    '%s matches the database model',
    (name, resource) => {
      const columns = columnsOf(resource.model);
      expect(columns, `model ${resource.model}`).not.toBeNull();
      const used = [
        ...resource.keys.map((k) => k.column),
        ...Object.values(resource.fields).map((d) => d.column),
      ];
      used.forEach((column) =>
        expect(columns.has(column), `${resource.model}.${column}`).toBe(true),
      );
      expect(resource.menu, 'menu code').toBeTruthy();
    },
  );
});
