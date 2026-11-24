import { beforeEach, describe, expect, it } from 'vitest';
import { createCustomerService } from '../src/modules/customer/customer.service.js';
import { createFakeCustomerRepository } from './helpers/fakes.js';

const ACTOR = { uid: '1', role: 'ADMIN' };

describe('customer service', () => {
  let repository;
  let service;

  beforeEach(() => {
    repository = createFakeCustomerRepository();
    service = createCustomerService({ customerRepository: repository });
  });

  it('creates a customer with contact details on its master profile', async () => {
    const created = await service.create(
      {
        code: 'CUST-001',
        kind: 'INDIVIDUAL',
        name: 'Garam Coffee',
        contactName: 'Garam Ali',
        email: 'garam@example.com',
        contactNo: '+971501234567',
        altContactNo: '+971501234568',
        designation: 'Manager',
        status: 'ACTIVE',
        agreedToWhatsapp: true,
      },
      ACTOR,
    );

    expect(created).toMatchObject({
      code: 'CUST-001',
      kind: 'INDIVIDUAL',
      name: 'Garam Coffee',
      contactName: 'Garam Ali',
      email: 'garam@example.com',
      contactNo: '+971501234567',
      altContactNo: '+971501234568',
      designation: 'Manager',
      status: 'ACTIVE',
      statusLabel: 'Active',
      agreedToWhatsapp: true,
    });
    expect(created).not.toHaveProperty('paymentTerm');
    expect(created).not.toHaveProperty('creditLimit');
  });

  it('defaults the status to ACTIVE and Whatsapp opt-in to true', async () => {
    const created = await service.create({ code: 'C-2', kind: 'INDIVIDUAL', name: 'Jane' }, ACTOR);
    expect(created.status).toBe('ACTIVE');
    expect(created.agreedToWhatsapp).toBe(true);
    expect(created.email).toBeNull();
  });

  it('numbers the code when none is sent', async () => {
    await service.create({ code: 'CUS-007', kind: 'INDIVIDUAL', name: 'Ali' }, ACTOR);
    const created = await service.create({ kind: 'INDIVIDUAL', name: 'Sara' }, ACTOR);
    expect(created.code).toBe('CUS-008');
  });

  it('rejects a duplicate code', async () => {
    await service.create({ code: 'CUST-001', kind: 'COMPANY', name: 'One' }, ACTOR);
    await expect(
      service.create({ code: 'CUST-001', kind: 'COMPANY', name: 'Two' }, ACTOR),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects an unknown status', async () => {
    await expect(
      service.create({ code: 'C-3', kind: 'COMPANY', name: 'X', status: 'NOPE' }, ACTOR),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('requires a name for a company customer', async () => {
    await expect(
      service.create({ code: 'C-4', kind: 'COMPANY', name: '' }, ACTOR),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('updates only the fields that were sent', async () => {
    const created = await service.create(
      { code: 'C-5', kind: 'INDIVIDUAL', name: 'Original', email: 'old@example.com' },
      ACTOR,
    );
    const updated = await service.update(created.id, { email: 'new@example.com' }, ACTOR);

    expect(updated).toMatchObject({
      email: 'new@example.com',
      name: 'Original',
      status: 'ACTIVE',
      code: 'C-5',
    });
  });

  it('soft-deletes a customer so it disappears from lists', async () => {
    const created = await service.create({ code: 'C-6', kind: 'INDIVIDUAL', name: 'Gone' }, ACTOR);
    await service.remove(created.id, ACTOR);

    await expect(service.getById(created.id)).rejects.toMatchObject({ statusCode: 404 });
    expect((await service.list({ page: 1, limit: 10, sortOrder: 'desc' })).meta.total).toBe(0);
  });

  it('keeps several contact persons for a company customer', async () => {
    const created = await service.create(
      {
        code: 'C-7',
        kind: 'COMPANY',
        name: 'Acme',
        contactName: 'Main Person',
        contacts: [
          { name: 'Second Person', designation: 'HR', email: 'hr@acme.com' },
          { name: 'Third Person', contactNo: '+971501234569' },
        ],
      },
      ACTOR,
    );
    expect(created.contactName).toBe('Main Person');
    expect(created.contacts.map((item) => item.name)).toEqual(['Second Person', 'Third Person']);
    expect(created.contacts[0]).toMatchObject({ designation: 'HR', email: 'hr@acme.com' });
  });

  it('rejects contact persons on an individual customer', async () => {
    await expect(
      service.create(
        { code: 'C-8', kind: 'INDIVIDUAL', name: 'Jane', contacts: [{ name: 'Other' }] },
        ACTOR,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('keeps the contact number unique within each customer type', async () => {
    const phone = '+971501112233';
    await service.create({ code: 'I-1', kind: 'INDIVIDUAL', name: 'Ali', contactNo: phone }, ACTOR);

    // Same type: rejected.
    await expect(
      service.create({ code: 'I-2', kind: 'INDIVIDUAL', name: 'Sara', contactNo: phone }, ACTOR),
    ).rejects.toMatchObject({ statusCode: 409 });

    // Other type: allowed.
    const company = await service.create(
      { code: 'C-9', kind: 'COMPANY', name: 'Acme', contactName: 'Main', contactNo: phone },
      ACTOR,
    );
    expect(company.contactNo).toBe(phone);

    // Saving a customer with its own number is fine.
    await expect(service.update(company.id, { contactNo: phone }, ACTOR)).resolves.toBeTruthy();
  });

  it('keeps company contact numbers unique within and across company customers', async () => {
    const phone = '+971502223344';
    // Two contact persons of the same company with one number.
    await expect(
      service.create(
        {
          code: 'CO-1',
          kind: 'COMPANY',
          name: 'Emaar',
          contactName: 'Yash',
          contactNo: phone,
          contacts: [{ name: 'Hari', contactNo: phone }],
        },
        ACTOR,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      errors: [{ field: 'contacts.0.contactNo' }],
    });

    // A contact person of another company already has the number.
    await service.create(
      {
        code: 'CO-2',
        kind: 'COMPANY',
        name: 'Nakheel',
        contactName: 'Main',
        contactNo: '+971509990000',
        contacts: [{ name: 'Other', contactNo: phone }],
      },
      ACTOR,
    );
    await expect(
      service.create(
        { code: 'CO-3', kind: 'COMPANY', name: 'Damac', contactName: 'Ann', contactNo: phone },
        ACTOR,
      ),
    ).rejects.toMatchObject({ statusCode: 409, errors: [{ field: 'contactNo' }] });
  });

  it('only switches the main contact to a contact person of the same company', async () => {
    const company = await service.create(
      {
        code: 'CO-4',
        kind: 'COMPANY',
        name: 'Meraas',
        contactName: 'Main',
        contactNo: '+971500000001',
      },
      ACTOR,
    );
    await expect(
      service.update(company.id, { mainContactId: '11111111-1111-4111-8111-111111111111' }, ACTOR),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns the dropdown options', async () => {
    const options = await service.options();
    expect(options.kinds.map((item) => item.code)).toEqual(['INDIVIDUAL', 'COMPANY']);
    expect(options.statuses.map((item) => item.code)).toContain('ACTIVE');
    expect(options).not.toHaveProperty('paymentTerms');
  });
});
