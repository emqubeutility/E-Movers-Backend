import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { createFakeRepositories, loginBody } from './helpers/fakes.js';

const ADMIN = { email: 'admin@example.com', password: 'Adm1n!Passw0rd' };
const MEMBER = { email: 'member@example.com', password: 'Memb3r!Passw0rd' };
const AUDITOR = { email: 'auditor@example.com', password: 'Aud1tor!Passw0rd' };

describe('master data API (customers and companies)', () => {
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

    app = await buildApp({
      repositories: {
        userRepository: fakes.userRepository,
        authRepository: fakes.authRepository,
        permissionRepository: fakes.permissionRepository,
        customerRepository: fakes.customerRepository,
        companyRepository: fakes.companyRepository,
      },
      checkDatabase: async () => true,
    });
    await app.ready();

    tokens.admin = await login(ADMIN);
    tokens.member = await login(MEMBER);
    tokens.auditor = await login(AUDITOR);
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    expect((await request(app.server).get('/api/v1/customers')).status).toBe(401);
    expect((await request(app.server).get('/api/v1/companies')).status).toBe(401);
  });

  it('enforces each menu grant separately', async () => {
    expect((await as(tokens.auditor)('get', '/api/v1/customers')).status).toBe(403);
    expect((await as(tokens.member)('get', '/api/v1/customers')).status).toBe(200);
    expect((await as(tokens.member)('get', '/api/v1/companies')).status).toBe(403);
  });

  it('creates, lists, updates and soft-deletes a customer', async () => {
    const created = await as(tokens.admin)('post', '/api/v1/customers').send({
      code: 'CUST-100',
      kind: 'COMPANY',
      name: 'Emqube LLC',
      email: 'ops@emqube.example',
      contactNo: '+971501234567',
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      code: 'CUST-100',
      status: 'ACTIVE',
      email: 'ops@emqube.example',
    });

    const list = await as(tokens.admin)('get', '/api/v1/customers?search=emqube');
    expect(list.status).toBe(200);
    expect(list.body.data.meta.total).toBe(1);

    const updated = await as(tokens.admin)('put', `/api/v1/customers/${created.body.data.id}`).send(
      {
        name: 'Emqube FZE',
      },
    );
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe('Emqube FZE');

    const deleted = await as(tokens.admin)('delete', `/api/v1/customers/${created.body.data.id}`);
    expect(deleted.status).toBe(200);
    expect(
      (await as(tokens.admin)('get', `/api/v1/customers/${created.body.data.id}`)).status,
    ).toBe(404);
  });

  it('creates and lists a company', async () => {
    const created = await as(tokens.admin)('post', '/api/v1/companies').send({
      code: 'AGENT-100',
      name: 'Fresco Movers',
      companyType: 'AGENT',
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      code: 'AGENT-100',
      companyType: 'AGENT',
      status: 'ACTIVE',
    });

    const options = await as(tokens.admin)('get', '/api/v1/companies/options');
    expect(options.status).toBe(200);
    expect(options.body.data.companyTypes.map((item) => item.code)).toContain('AGENT');
  });

  it('rejects an unknown field instead of silently dropping it', async () => {
    const response = await as(tokens.admin)('post', '/api/v1/customers').send({
      code: 'CUST-999',
      kind: 'COMPANY',
      name: 'Forged',
      is_active: true,
    });
    expect(response.status).toBe(422);
  });
});
