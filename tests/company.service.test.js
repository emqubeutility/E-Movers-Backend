import { beforeEach, describe, expect, it } from 'vitest';
import { createCompanyService } from '../src/modules/company/company.service.js';
import { createFakeCompanyRepository } from './helpers/fakes.js';

const ACTOR = { uid: '1', role: 'ADMIN', org: '1' };

describe('company service', () => {
  let repository;
  let service;

  beforeEach(() => {
    repository = createFakeCompanyRepository();
    service = createCompanyService({ companyRepository: repository });
  });

  it('creates a company, resolving the type and status from codes', async () => {
    const created = await service.create(
      {
        code: 'AGENT-01',
        name: 'Fresco Movers',
        companyType: 'AGENT',
        status: 'ACTIVE',
        paymentTerm: 'CREDIT',
        email: 'ops@fresco.example',
        contactNo: '+971501234567',
        contactName: 'Ravi Kumar',
      },
      ACTOR,
    );

    expect(created).toMatchObject({
      code: 'AGENT-01',
      name: 'Fresco Movers',
      companyType: 'AGENT',
      companyTypeLabel: 'Agent',
      status: 'ACTIVE',
      paymentTerm: 'CREDIT',
      contactName: 'Ravi Kumar',
    });
  });

  it('rejects an unknown company type', async () => {
    await expect(
      service.create({ code: 'X-1', name: 'X', companyType: 'NOPE' }, ACTOR),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a duplicate code', async () => {
    await service.create({ code: 'AGENT-01', name: 'One', companyType: 'AGENT' }, ACTOR);
    await expect(
      service.create({ code: 'AGENT-01', name: 'Two', companyType: 'SUPPLIER' }, ACTOR),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('updates only the fields that were sent', async () => {
    const created = await service.create(
      { code: 'C-5', name: 'Original', companyType: 'AGENT', status: 'ACTIVE' },
      ACTOR,
    );
    const updated = await service.update(created.id, { contactName: 'Sara Ali' }, ACTOR);

    expect(updated).toMatchObject({
      contactName: 'Sara Ali',
      companyType: 'AGENT',
      name: 'Original',
    });
  });

  it('lets only a super administrator move a company to another organization', async () => {
    const created = await service.create(
      { code: 'C-9', name: 'Mover', companyType: 'AGENT' },
      ACTOR,
    );
    const superAdmin = { uid: '1', role: 'SUPERADMIN', org: null };

    // An organization admin cannot move it, but may resend its own organization.
    await expect(service.update(created.id, { organizationId: 2 }, ACTOR)).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(service.update(created.id, { organizationId: 1 }, ACTOR)).resolves.toMatchObject({
      organizationId: 1,
    });

    await expect(
      service.update(created.id, { organizationId: 99 }, superAdmin),
    ).rejects.toMatchObject({ statusCode: 422 });
    const moved = await service.update(created.id, { organizationId: 2 }, superAdmin);
    expect(moved.organizationId).toBe(2);
  });

  it('soft-deletes a company', async () => {
    const created = await service.create(
      { code: 'C-6', name: 'Gone', companyType: 'AGENT' },
      ACTOR,
    );
    await service.remove(created.id, ACTOR);

    await expect(service.getById(created.id)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns the dropdown options', async () => {
    const options = await service.options();
    expect(options.companyTypes.map((item) => item.code)).toContain('AGENT');
    expect(options.statuses.map((item) => item.code)).toContain('ACTIVE');
    expect(options.paymentTerms.map((item) => item.code)).toContain('CREDIT');
  });
  describe('organization scope', () => {
    const ORG_A = { uid: '1', sub: 'a', role: 'ADMIN', org: '1' };
    const ORG_B = { uid: '2', sub: 'b', role: 'ADMIN', org: '2' };
    const SUPER = { uid: '3', sub: 's', role: 'SUPERADMIN', org: null };
    const input = (code) => ({ code, name: `Company ${code}`, companyType: 'AGENT' });

    it('stamps the caller organization and keeps each organization to its own companies', async () => {
      const own = await service.create(input('A-1'), ORG_A);
      await service.create(input('B-1'), ORG_B);

      expect(own.organizationId).toBe(1);
      const list = await service.list({ skip: 0, take: 10 }, ORG_A);
      expect(list.items.map((item) => item.code)).toEqual(['A-1']);
    });

    it('reports another organization company as not found for read, edit and delete', async () => {
      const other = await service.create(input('B-2'), ORG_B);

      await expect(service.getById(other.id, ORG_A)).rejects.toMatchObject({ statusCode: 404 });
      await expect(service.update(other.id, { name: 'Hijacked' }, ORG_A)).rejects.toMatchObject({
        statusCode: 404,
      });
      await expect(service.remove(other.id, ORG_A)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('ignores an organizationId sent by an organization admin', async () => {
      const created = await service.create({ ...input('A-2'), organizationId: 2 }, ORG_A);
      expect(created.organizationId).toBe(1);
    });

    it('lets the super administrator see every organization but requires one on create', async () => {
      await service.create(input('A-3'), ORG_A);
      await service.create(input('B-3'), ORG_B);

      expect((await service.list({ skip: 0, take: 10 }, SUPER)).items).toHaveLength(2);
      await expect(service.create(input('S-1'), SUPER)).rejects.toMatchObject({ statusCode: 422 });
      const made = await service.create({ ...input('S-2'), organizationId: 2 }, SUPER);
      expect(made.organizationId).toBe(2);
    });

    it('refuses a non-super account that is not linked to an organization', async () => {
      await expect(
        service.list({ skip: 0, take: 10 }, { uid: '9', role: 'ADMIN', org: null }),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });
});
