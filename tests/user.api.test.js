import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { createFakeRepositories, loginBody } from './helpers/fakes.js';

const ADMIN = { email: 'admin@example.com', password: 'Adm1n!Passw0rd' };
const MEMBER = { email: 'member@example.com', password: 'Memb3r!Passw0rd' };

describe('user API', () => {
  let app;
  let fakes;
  let adminToken;
  let memberToken;
  let memberId;

  async function login(credentials) {
    return request(app.server).post('/api/v1/auth/login').send(loginBody(credentials));
  }

  beforeAll(async () => {
    fakes = createFakeRepositories();
    await fakes.seedUser({ ...ADMIN, role: 'ADMIN', firstName: 'Ada' });
    const member = await fakes.seedUser({ ...MEMBER, role: 'EXECUTIVE', firstName: 'Mia' });
    memberId = member.public_id;

    app = await buildApp({
      repositories: {
        userRepository: fakes.userRepository,
        authRepository: fakes.authRepository,
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

  it('GET /health reports the service as healthy', async () => {
    const response = await request(app.server).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('POST /auth/login returns a token, a refresh cookie and no password', async () => {
    const response = await login(ADMIN);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, errors: null });
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(JSON.stringify(response.body)).not.toMatch(
      /"password"|password_hash|passwordHash|user_id/i,
    );
    const cookie = response.headers['set-cookie'][0];
    expect(cookie).toMatch(/^refresh_token=/);
    expect(cookie).toMatch(/HttpOnly/);
  });

  it('POST /auth/login rejects a wrong password with a generic message', async () => {
    const response = await login({ email: ADMIN.email, password: 'wrong-password' });
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Invalid user name or password',
    });
  });

  it('POST /auth/login does not reveal that a blocked account exists, and ignores status', async () => {
    await fakes.seedUser({
      email: 'off@example.com',
      password: '0ff!Passw0rd',
      status: 'INACTIVE',
      canLogin: false,
    });
    await fakes.seedUser({
      email: 'inactive-ok@example.com',
      password: '0ff!Passw0rd',
      status: 'INACTIVE',
    });

    const wrong = await login({ email: 'off@example.com', password: 'wrong-password' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.message).toBe('Invalid user name or password');

    // The reason is only shown once the password proves the caller owns the account.
    const right = await login({ email: 'off@example.com', password: '0ff!Passw0rd' });
    expect(right.status).toBe(403);

    // Status is not checked at sign-in; only the can-sign-in flag decides.
    const allowed = await login({ email: 'inactive-ok@example.com', password: '0ff!Passw0rd' });
    expect(allowed.status).toBe(200);
  });

  it('POST /auth/refresh rotates the refresh token', async () => {
    const signIn = await login(ADMIN);
    const cookie = signIn.headers['set-cookie'][0].split(';')[0];

    const refreshed = await request(app.server).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toEqual(expect.any(String));

    const reused = await request(app.server).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(reused.status).toBe(401);
  });

  it('POST /auth/logout revokes the session', async () => {
    const signIn = await login(MEMBER);
    const cookie = signIn.headers['set-cookie'][0].split(';')[0];

    const out = await request(app.server).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(200);
    const refresh = await request(app.server).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(refresh.status).toBe(401);
  });

  it('POST /auth/register no longer exists', async () => {
    const response = await request(app.server)
      .post('/api/v1/auth/register')
      .send({ email: 'weak@example.com', password: 'Fr3sh!Passw0rd', firstName: 'Fresh' });
    expect(response.status).toBe(404);
  });

  it('GET /users requires authentication', async () => {
    const response = await request(app.server).get('/api/v1/users');
    expect(response.status).toBe(401);
  });

  it('GET /users returns a paginated list without sensitive fields', async () => {
    const response = await request(app.server)
      .get('/api/v1/users?page=1&limit=2&sortBy=createdAt&sortOrder=asc')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.meta).toMatchObject({ page: 1, limit: 2 });
    expect(JSON.stringify(response.body)).not.toMatch(
      /"password"|password_hash|passwordHash|user_id/i,
    );
  });

  it('GET /users rejects a page size above the maximum', async () => {
    const response = await request(app.server)
      .get('/api/v1/users?limit=1000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(422);
  });

  it('GET /users/summary returns counts without sensitive fields', async () => {
    const response = await request(app.server)
      .get('/api/v1/users/summary')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(response.status).toBe(200);
    const { total, byRole, byStatus, recent } = response.body.data;
    expect(total).toBeGreaterThanOrEqual(2);
    expect(byRole.reduce((sum, row) => sum + row.count, 0)).toBe(total);
    expect(byStatus.reduce((sum, row) => sum + row.count, 0)).toBe(total);
    expect(recent.length).toBeGreaterThan(0);
    expect(JSON.stringify(response.body)).not.toMatch(/password_hash|passwordHash|user_id/i);
  });

  it('GET /users/me returns the signed-in user', async () => {
    const response = await request(app.server)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe(MEMBER.email);
  });

  it('POST /users is forbidden for non-admins', async () => {
    const response = await request(app.server)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        employeeCode: 'NOPE01',
        username: 'NOPE01',
        email: 'nope@example.com',
        password: 'N0pe!Passw0rd',
        firstName: 'Nope',
        role: 'EXECUTIVE',
      });
    expect(response.status).toBe(403);
  });

  it('POST /users creates a user for admins and rejects a duplicate e-mail', async () => {
    const body = {
      employeeCode: 'CREATED01',
      username: 'CREATED01',
      email: 'created@example.com',
      password: 'Cr3ated!Passw0rd',
      firstName: '<b>Cara</b>',
      role: 'EXECUTIVE',
    };
    const created = await request(app.server)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

    expect(created.status).toBe(201);
    expect(created.body.data.firstName).toBe('Cara'); // HTML tags are stripped on input
    expect(created.body.data).not.toHaveProperty('password');

    const duplicate = await request(app.server)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);
    expect(duplicate.status).toBe(409);
  });

  it('PUT /users/:id lets a member edit themselves but not others', async () => {
    const own = await request(app.server)
      .put(`/api/v1/users/${memberId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ firstName: 'Maya' });
    expect(own.status).toBe(200);
    expect(own.body.data.firstName).toBe('Maya');

    const admin = fakes.users.find((user) => user.profile.email === ADMIN.email);
    const other = await request(app.server)
      .put(`/api/v1/users/${admin.public_id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ firstName: 'Hacked' });
    expect(other.status).toBe(403);
  });

  it('GET /users/:id validates the id format and returns 404 for unknown users', async () => {
    const invalid = await request(app.server)
      .get('/api/v1/users/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(invalid.status).toBe(422);

    const missing = await request(app.server)
      .get('/api/v1/users/7b0f5f0e-5a52-4f3a-9d0b-3a3f1f1b2c3d')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(missing.status).toBe(404);
  });

  it('DELETE /users/:id soft-deletes for admins only', async () => {
    const target = await fakes.seedUser({
      email: 'target@example.com',
      password: 'T4rget!Passw0rd',
    });

    const forbidden = await request(app.server)
      .delete(`/api/v1/users/${target.public_id}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(forbidden.status).toBe(403);

    const deleted = await request(app.server)
      .delete(`/api/v1/users/${target.public_id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleted.status).toBe(200);

    const after = await request(app.server)
      .get(`/api/v1/users/${target.public_id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(after.status).toBe(404);
  });

  it('returns the standard envelope for unknown routes', async () => {
    const response = await request(app.server).get('/api/v1/nope');
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false, data: null });
  });
});
