import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import {
  createFakeMenuAccessRepository,
  createFakeRepositories,
  loginBody,
} from './helpers/fakes.js';

const ADMIN = { email: 'admin@example.com', password: 'Adm1n!Passw0rd' };
const MEMBER = { email: 'member@example.com', password: 'Memb3r!Passw0rd' };
const OWNER = { email: 'owner@example.com', password: '0wner!Passw0rd' };

describe('menu access API', () => {
  let app;
  let fakes;
  let menuAccessRepository;
  const tokens = {};

  async function login(credentials) {
    const response = await request(app.server)
      .post('/api/v1/auth/login')
      .send(loginBody(credentials));
    return response.body.data.accessToken;
  }

  const as = (token) => (method, url, body) => {
    const call = request(app.server)[method](url).set('Authorization', `Bearer ${token}`);
    return body === undefined ? call : call.send(body);
  };

  beforeAll(async () => {
    fakes = createFakeRepositories();
    menuAccessRepository = createFakeMenuAccessRepository();
    await fakes.seedUser({ ...ADMIN, role: 'ADMIN', firstName: 'Ada' });
    await fakes.seedUser({ ...MEMBER, role: 'EXECUTIVE', firstName: 'Mia' });
    await fakes.seedUser({ ...OWNER, role: 'SUPERADMIN', firstName: 'Sam' });

    app = await buildApp({
      repositories: {
        userRepository: fakes.userRepository,
        authRepository: fakes.authRepository,
        permissionRepository: fakes.permissionRepository,
        menuAccessRepository,
      },
      checkDatabase: async () => true,
    });
    await app.ready();

    tokens.admin = await login(ADMIN);
    tokens.member = await login(MEMBER);
    tokens.owner = await login(OWNER);
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    expect((await request(app.server).get('/api/v1/menu-access/roles/2')).status).toBe(401);
  });

  it('refuses a caller who is not an administrator', async () => {
    const response = await as(tokens.member)('get', '/api/v1/menu-access/roles/2');
    expect(response.status).toBe(403);
  });

  it('returns the menu tree with the role selection', async () => {
    const response = await as(tokens.admin)('get', '/api/v1/menu-access/roles/2');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      role: { id: 2, code: 'ADMIN' },
      isSuperAdmin: false,
    });
    expect(response.body.data.menus.filter((menu) => menu.selected)).toHaveLength(8);
  });

  it('shows every menu as selected for the super administrator', async () => {
    const response = await as(tokens.owner)('get', '/api/v1/menu-access/roles/1');

    expect(response.status).toBe(200);
    expect(response.body.data.isSuperAdmin).toBe(true);
    expect(response.body.data.menus.every((menu) => menu.selected)).toBe(true);
  });

  it('saves a new selection for a role', async () => {
    const response = await as(tokens.admin)('put', '/api/v1/menu-access/roles/2').send({
      grants: [{ menuItemId: 1 }, { menuItemId: 4, create: true }],
    });

    expect(response.status).toBe(200);
    expect(
      response.body.data.menus.filter((menu) => menu.selected).map((menu) => menu.code),
    ).toEqual(['OVERVIEW', 'ROLES']);
    expect(response.body.data.menus.find((menu) => menu.code === 'ROLES').create).toBe(true);
  });

  it('refuses to change the super administrator menus', async () => {
    const response = await as(tokens.owner)('put', '/api/v1/menu-access/roles/1').send({
      grants: [{ menuItemId: 1 }],
    });

    expect(response.status).toBe(403);
  });

  it('rejects an unknown field in the body', async () => {
    const response = await as(tokens.admin)('put', '/api/v1/menu-access/roles/2').send({
      grants: [{ menuItemId: 1 }],
      pageUrl: '/forged',
    });

    expect(response.status).toBe(422);
  });

  it('lists the business functions', async () => {
    const response = await as(tokens.admin)('get', '/api/v1/menu-access/functions');

    expect(response.status).toBe(200);
    expect(response.body.data.map((fn) => fn.code)).toEqual(['SALES', 'OPERATIONS', 'STORES']);
  });

  it('saves a function selection', async () => {
    const response = await as(tokens.admin)('put', '/api/v1/menu-access/functions/12').send({
      menuItemIds: [3, 4],
    });

    expect(response.status).toBe(200);
    expect(
      response.body.data.menus.filter((menu) => menu.selected).map((menu) => menu.code),
    ).toEqual(['USERS', 'ROLES']);
  });
});
