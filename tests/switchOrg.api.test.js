import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { createFakeRepositories, loginBody } from './helpers/fakes.js';

const MULTI = { email: 'multi@example.com', password: 'Mult1!Passw0rd' };

describe('POST /auth/switch-organization', () => {
  let app;
  let token;
  let fakes;

  beforeAll(async () => {
    fakes = createFakeRepositories();
    await fakes.seedUser({ ...MULTI, role: 'ADMIN', organizationId: 1n, organizationIds: [1, 2] });
    app = await buildApp({
      repositories: {
        userRepository: fakes.userRepository,
        authRepository: fakes.authRepository,
        permissionRepository: fakes.permissionRepository,
      },
      checkDatabase: async () => true,
    });
    await app.ready();
    const login = await request(app.server).post('/api/v1/auth/login').send(loginBody(MULTI));
    token = login.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const switchTo = (organizationId, bearer = token) =>
    request(app.server)
      .post('/api/v1/auth/switch-organization')
      .set('Authorization', `Bearer ${bearer}`)
      .send({ organizationId });

  it('puts both organizations in the token and the user', async () => {
    const decoded = app.jwt.decode(token);
    expect(decoded).toMatchObject({ org: '1', orgs: ['1', '2'] });
  });

  it('switches to another organization the person belongs to', async () => {
    const response = await switchTo(2);
    expect(response.status).toBe(200);
    expect(app.jwt.decode(response.body.data.accessToken)).toMatchObject({ org: '2' });
    // The home organization stays first; the one being worked in is `organizationId`.
    expect(response.body.data.user.organizationId).toBe(2);
    expect(response.body.data.user.organizationIds[0]).toBe(1);
  });

  it('refuses an organization the person does not belong to', async () => {
    expect((await switchTo(3)).status).toBe(403);
  });

  it('refuses "all organizations" for anyone but a super admin', async () => {
    expect((await switchTo(null)).status).toBe(403);
  });

  it('lets a super admin pick any organization, or all of them', async () => {
    const SUPER = { email: 'super@example.com', password: 'Sup3r!Passw0rd' };
    await fakes.seedUser({ ...SUPER, role: 'SUPERADMIN' });
    const login = await request(app.server).post('/api/v1/auth/login').send(loginBody(SUPER));
    const bearer = login.body.data.accessToken;

    const one = await switchTo(3, bearer);
    expect(one.status).toBe(200);
    expect(app.jwt.decode(one.body.data.accessToken)).toMatchObject({ org: '3' });

    const all = await switchTo(null, bearer);
    expect(all.status).toBe(200);
    expect(app.jwt.decode(all.body.data.accessToken).org).toBeNull();

    expect((await switchTo(99, bearer)).status).toBe(404);
  });

  it('needs a signed-in caller', async () => {
    const response = await request(app.server)
      .post('/api/v1/auth/switch-organization')
      .send({ organizationId: 1 });
    expect(response.status).toBe(401);
  });
});
