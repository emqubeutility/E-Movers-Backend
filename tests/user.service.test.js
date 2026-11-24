import { beforeEach, describe, expect, it } from 'vitest';
import { createUserService } from '../src/modules/user/user.service.js';
import { createFakeRepositories } from './helpers/fakes.js';

const STRONG_PASSWORD = 'Str0ng!Passw0rd';

describe('user service', () => {
  let fakes;
  let service;
  let admin;
  let adminActor;

  beforeEach(async () => {
    fakes = createFakeRepositories();
    service = createUserService({ userRepository: fakes.userRepository });
    admin = await fakes.seedUser({
      email: 'admin@example.com',
      password: STRONG_PASSWORD,
      role: 'ADMIN',
    });
    adminActor = { sub: admin.public_id, uid: admin.user_id.toString(), role: 'ADMIN', org: '1' };
  });

  it('assigns business functions on create and replaces them on update', async () => {
    const created = await service.create(
      {
        employeeCode: 'EMP03',
        username: 'EMP03',
        email: 'sales@example.com',
        password: STRONG_PASSWORD,
        firstName: 'Vishnu',
        role: 'EXECUTIVE',
        functions: ['SALES'],
      },
      adminActor,
    );
    expect(created.functions).toEqual(['SALES']);

    const updated = await service.update(created.id, { functions: ['OPERATIONS'] }, adminActor);
    expect(updated.functions).toEqual(['OPERATIONS']);
    expect((await service.update(created.id, { firstName: 'V' }, adminActor)).functions).toEqual([
      'OPERATIONS',
    ]);
  });

  it('requires an e-mail for a site user but not for an employee', async () => {
    const base = { password: STRONG_PASSWORD, firstName: 'Ravi', role: 'EXECUTIVE' };
    await expect(
      service.create(
        { ...base, employeeCode: 'SU01', username: 'SU01', personType: 'SITE_USER' },
        adminActor,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    const worker = await service.create(
      { ...base, employeeCode: 'EMPL01', username: 'EMPL01', personType: 'EMPLOYEE' },
      adminActor,
    );
    expect(worker).toMatchObject({
      employeeCode: 'EMPL01',
      username: 'EMPL01',
      personType: 'EMPLOYEE',
      email: null,
    });
  });

  it('keeps employee codes unique, ignoring letter case', async () => {
    const input = {
      password: STRONG_PASSWORD,
      firstName: 'A',
      role: 'EXECUTIVE',
      email: 'a1@example.com',
    };
    await service.create({ ...input, employeeCode: 'dup01', username: 'dup01' }, adminActor);
    await expect(
      service.create(
        { ...input, email: 'a2@example.com', employeeCode: 'DUP01', username: 'DUP01' },
        adminActor,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects an unknown function', async () => {
    await expect(
      service.create(
        {
          employeeCode: 'EMP04',
          username: 'EMP04',
          email: 'x@example.com',
          password: STRONG_PASSWORD,
          firstName: 'X',
          role: 'EXECUTIVE',
          functions: ['NOPE'],
        },
        adminActor,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('creates a user and never exposes the password hash', async () => {
    const created = await service.create(
      {
        employeeCode: 'EMP01',
        username: 'EMP01',
        email: 'new@example.com',
        password: STRONG_PASSWORD,
        firstName: 'New',
        role: 'EXECUTIVE',
      },
      adminActor,
    );

    expect(created).toMatchObject({
      email: 'new@example.com',
      firstName: 'New',
      role: 'EXECUTIVE',
      status: 'ACTIVE',
    });
    expect(created).not.toHaveProperty('password');
    expect(created).not.toHaveProperty('password_hash');
  });

  it('stores a hash, not the plain password', async () => {
    await service.create(
      {
        employeeCode: 'EMP05',
        username: 'EMP05',
        email: 'hash@example.com',
        password: STRONG_PASSWORD,
        firstName: 'Hash',
        role: 'EXECUTIVE',
      },
      adminActor,
    );
    const stored = fakes.users.find((user) => user.profile.email === 'hash@example.com');
    expect(stored.password_hash).not.toBe(STRONG_PASSWORD);
    expect(stored.password_hash.startsWith('$2')).toBe(true);
  });

  it('rejects a duplicate e-mail regardless of letter case', async () => {
    await expect(
      service.create(
        {
          employeeCode: 'EMP06',
          username: 'EMP06',
          email: 'ADMIN@example.com',
          password: STRONG_PASSWORD,
          firstName: 'Dup',
          role: 'EXECUTIVE',
        },
        adminActor,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects an unknown role', async () => {
    await expect(
      service.create(
        {
          employeeCode: 'EMP02',
          username: 'EMP02',
          email: 'x@example.com',
          password: STRONG_PASSWORD,
          firstName: 'X',
          role: 'NOPE',
        },
        adminActor,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('paginates and reports totals', async () => {
    for (let i = 0; i < 12; i += 1) {
      await fakes.seedUser({ email: `user${i}@example.com`, password: STRONG_PASSWORD });
    }
    const page = await service.list({ page: 2, limit: 5, sortBy: 'createdAt', sortOrder: 'asc' });

    expect(page.items).toHaveLength(5);
    expect(page.meta).toEqual({ page: 2, limit: 5, total: 13, totalPages: 3 });
  });

  it('filters by search text and role', async () => {
    await fakes.seedUser({
      employeeCode: 'EMP07',
      username: 'EMP07',
      email: 'zara@example.com',
      password: STRONG_PASSWORD,
      firstName: 'Zara',
    });
    const bySearch = await service.list({ search: 'zar' });
    const byRole = await service.list({ role: 'ADMIN' });

    expect(bySearch.items.map((user) => user.email)).toEqual(['zara@example.com']);
    expect(byRole.items.map((user) => user.email)).toEqual(['admin@example.com']);
  });

  it('lets a user edit their own name but not their role', async () => {
    const user = await fakes.seedUser({ email: 'self@example.com', password: STRONG_PASSWORD });
    const actor = { sub: user.public_id, uid: user.user_id.toString(), role: 'EXECUTIVE' };

    const updated = await service.update(user.public_id, { firstName: 'Renamed' }, actor);
    expect(updated.firstName).toBe('Renamed');
    await expect(service.update(user.public_id, { role: 'ADMIN' }, actor)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('stops a non-admin from editing someone else', async () => {
    const user = await fakes.seedUser({ email: 'a@example.com', password: STRONG_PASSWORD });
    const actor = { sub: user.public_id, uid: user.user_id.toString(), role: 'EXECUTIVE' };

    await expect(
      service.update(admin.public_id, { firstName: 'Hacked' }, actor),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('requires the current password to change your own password', async () => {
    await expect(
      service.update(
        admin.public_id,
        { password: 'An0ther!Passw0rd', currentPassword: 'wrong' },
        adminActor,
      ),
    ).rejects.toMatchObject({ statusCode: 401 });

    await expect(
      service.update(
        admin.public_id,
        { password: 'An0ther!Passw0rd', currentPassword: STRONG_PASSWORD },
        adminActor,
      ),
    ).resolves.toBeTruthy();
  });

  it('rejects a current password sent without a new one', async () => {
    await expect(
      service.update(admin.public_id, { currentPassword: STRONG_PASSWORD }, adminActor),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('soft-deletes a user and hides them from lookups', async () => {
    const user = await fakes.seedUser({ email: 'gone@example.com', password: STRONG_PASSWORD });
    await service.remove(user.public_id, adminActor);

    await expect(service.getById(user.public_id)).rejects.toMatchObject({ statusCode: 404 });
    expect(
      fakes.users.find((row) => row.profile.email === 'gone@example.com').deleted_at,
    ).toBeInstanceOf(Date);
  });

  it('does not allow deleting your own account', async () => {
    await expect(service.remove(admin.public_id, adminActor)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
