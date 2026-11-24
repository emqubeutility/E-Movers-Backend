import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { createFakeRepositories, loginBody } from './helpers/fakes.js';

const ADMIN = { email: 'admin@example.com', password: 'Adm1n!Passw0rd' };
const MEMBER = { email: 'member@example.com', password: 'Memb3r!Passw0rd' };

describe('role API', () => {
  let app;
  let fakes;
  let adminToken;
  let memberToken;

  async function login(credentials) {
    return request(app.server).post('/api/v1/auth/login').send(loginBody(credentials));
  }

  beforeAll(async () => {
    fakes = createFakeRepositories();
    await fakes.seedUser({ ...ADMIN, role: 'ADMIN', firstName: 'Ada' });
    await fakes.seedUser({ ...MEMBER, role: 'EXECUTIVE', firstName: 'Mia' });

    app = await buildApp({
      repositories: {
        userRepository: fakes.userRepository,
        authRepository: fakes.authRepository,
        roleRepository: fakes.roleRepository,
        permissionRepository: fakes.permissionRepository,
      },
      checkDatabase: async () => true,
    });
    await app.ready();

    adminToken = (await login(ADMIN)).body.data.accessToken;
    memberToken = (await login(MEMBER)).body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication and an administrator role', async () => {
    expect((await request(app.server).get('/api/v1/roles')).status).toBe(401);

    const forbidden = await request(app.server)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(forbidden.status).toBe(403);
  });

  it('lists roles with their permissions and the menu options', async () => {
    const roles = await request(app.server)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(roles.status).toBe(200);
    expect(roles.body.data.map((role) => role.code)).toEqual(['SUPERADMIN', 'ADMIN']);
    expect(roles.body.data[0].permissions).toEqual([]);

    const menus = await request(app.server)
      .get('/api/v1/roles/menus')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(menus.status).toBe(200);
    expect(menus.body.data).toHaveLength(8);
    expect(menus.body.data.find((menu) => menu.code === 'USERS')).toMatchObject({
      id: 3,
      parentId: 2,
      pageUrl: '/users',
    });
  });

  it('creates a role, deriving the menu URL from the menu itself', async () => {
    const response = await request(app.server)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'SALES',
        name: 'Sales',
        level: 5,
        permissions: [{ menuItemId: 3, create: true, edit: false, delete: false }],
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ code: 'SALES', name: 'Sales', level: 5 });
    expect(response.body.data.permissions).toEqual([
      { menuItemId: 3, pageUrl: '/users', create: true, edit: false, delete: false },
    ]);
  });

  it('rejects a duplicate code, a reserved code and an unknown menu', async () => {
    const body = { code: 'SALES', name: 'Sales', level: 5 };
    const duplicate = await request(app.server)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);
    expect(duplicate.status).toBe(409);

    const reserved = await request(app.server)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'ADMIN', name: 'Fake admin', level: 1 });
    expect(reserved.status).toBe(403);

    const unknownMenu = await request(app.server)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'OPS',
        name: 'Operations',
        level: 6,
        permissions: [{ menuItemId: 99, create: false, edit: false, delete: false }],
      });
    expect(unknownMenu.status).toBe(400);
  });

  it('rejects a page URL in the request body', async () => {
    const response = await request(app.server)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'OPS',
        name: 'Operations',
        level: 6,
        permissions: [
          { menuItemId: 1, pageUrl: '/overview', create: false, edit: false, delete: false },
        ],
      });
    expect(response.status).toBe(422);
  });

  it('updates a role and replaces its permissions', async () => {
    const created = await request(app.server)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'OPS', name: 'Operations', level: 6 });
    const id = created.body.data.id;

    const updated = await request(app.server)
      .put(`/api/v1/roles/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Operations team',
        permissions: [{ menuItemId: 1, create: false, edit: true, delete: false }],
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ code: 'OPS', name: 'Operations team', level: 6 });
    expect(updated.body.data.permissions).toEqual([
      { menuItemId: 1, pageUrl: '/overview', create: false, edit: true, delete: false },
    ]);
  });

  it('validates the id and returns 404 for an unknown role', async () => {
    const invalid = await request(app.server)
      .put('/api/v1/roles/not-a-number')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Nope' });
    expect(invalid.status).toBe(422);

    const missing = await request(app.server)
      .get('/api/v1/roles/999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(missing.status).toBe(404);
  });

  it('protects the built-in administrator roles', async () => {
    const builtIn = fakes.roleRepository.findByCode('ADMIN');
    const response = await request(app.server)
      .put(`/api/v1/roles/${builtIn.role_id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Renamed' });
    expect(response.status).toBe(403);
  });
});
