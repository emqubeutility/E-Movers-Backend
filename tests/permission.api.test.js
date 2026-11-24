import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { createFakeRepositories, loginBody } from './helpers/fakes.js';

const ADMIN = { email: 'admin@example.com', password: 'Adm1n!Passw0rd' };
const MEMBER = { email: 'member@example.com', password: 'Memb3r!Passw0rd' };
const AUDITOR = { email: 'auditor@example.com', password: 'Aud1tor!Passw0rd' };
const OWNER = { email: 'owner@example.com', password: '0wner!Passw0rd' };

describe('permission API', () => {
  let app;
  let fakes;
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
    await fakes.seedUser({ ...ADMIN, role: 'ADMIN', firstName: 'Ada' });
    await fakes.seedUser({ ...MEMBER, role: 'EXECUTIVE', firstName: 'Mia' });
    await fakes.seedUser({ ...AUDITOR, role: 'AUDITOR', firstName: 'Ari' });
    await fakes.seedUser({ ...OWNER, role: 'SUPERADMIN', firstName: 'Sam' });

    app = await buildApp({
      repositories: {
        userRepository: fakes.userRepository,
        authRepository: fakes.authRepository,
        permissionRepository: fakes.permissionRepository,
      },
      checkDatabase: async () => true,
    });
    await app.ready();

    tokens.admin = await login(ADMIN);
    tokens.member = await login(MEMBER);
    tokens.auditor = await login(AUDITOR);
    tokens.owner = await login(OWNER);
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    expect((await request(app.server).get('/api/v1/permissions')).status).toBe(401);
  });

  it('returns only the menus a role was granted, with the actions on each', async () => {
    const call = as(tokens.member);
    const response = await call('get', '/api/v1/permissions');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ role: 'EXECUTIVE', isSuperAdmin: false });
    expect(response.body.data.menus.map((menu) => menu.code)).toEqual([
      'OVERVIEW',
      'USERS',
      'CUSTOMER',
    ]);
    expect(response.body.data.menus[1]).toMatchObject({
      code: 'USERS',
      pageUrl: '/users',
      view: true,
      create: false,
      edit: false,
      delete: false,
    });
  });

  it('gives a super administrator every menu and action', async () => {
    const call = as(tokens.owner);
    const response = await call('get', '/api/v1/permissions');

    expect(response.status).toBe(200);
    expect(response.body.data.isSuperAdmin).toBe(true);
    expect(response.body.data.menus.map((menu) => menu.code)).toEqual([
      'OVERVIEW',
      'ADMINISTRATION',
      'USERS',
      'ROLES',
      'MENU_ACCESS',
      'MASTER',
      'CUSTOMER',
      'COMPANY',
    ]);
    expect(response.body.data.menus.every((menu) => menu.create && menu.edit && menu.delete)).toBe(
      true,
    );
  });

  it('blocks a role with no grant while self-service still works', async () => {
    const call = as(tokens.auditor);
    const me = await call('get', '/api/v1/users/me');
    expect(me.status).toBe(200);

    const self = await call('put', `/api/v1/users/${me.body.data.id}`, { firstName: 'Ariana' });
    expect(self.status).toBe(200);

    expect((await call('get', '/api/v1/users')).status).toBe(403);
    expect((await call('get', '/api/v1/users/summary')).status).toBe(403);

    const own = await call('get', '/api/v1/permissions');
    expect(own.body.data.menus).toEqual([]);
  });

  it('separates view from the write actions for the same menu', async () => {
    fakes.permissionRepository.grant('AUDITOR', 'USERS', {});
    try {
      const call = as(tokens.auditor);
      expect((await call('get', '/api/v1/users')).status).toBe(200);
      expect(
        (
          await call('post', '/api/v1/users', {
            employeeCode: 'NOTALLOWED',
            email: 'not-allowed@example.com',
            password: 'N0pe!Passw0rd',
            firstName: 'Nope',
            role: 'EXECUTIVE',
          })
        ).status,
      ).toBe(403);
    } finally {
      fakes.permissionRepository.revoke('AUDITOR', 'USERS');
    }
  });

  it('applies a revoked grant on the very next request', async () => {
    const target = await fakes.seedUser({
      email: 'delete-me@example.com',
      password: 'T4rget!Passw0rd',
    });
    const call = as(tokens.admin);

    fakes.permissionRepository.revoke('ADMIN', 'USERS');
    try {
      expect((await call('delete', `/api/v1/users/${target.public_id}`)).status).toBe(403);
    } finally {
      fakes.permissionRepository.grant('ADMIN', 'USERS', {
        create: true,
        edit: true,
        delete: true,
      });
    }

    expect((await call('delete', `/api/v1/users/${target.public_id}`)).status).toBe(200);
  });
});
