import { beforeEach, describe, expect, it } from 'vitest';
import { createRoleService } from '../src/modules/role/role.service.js';
import { createFakeRoleRepository } from './helpers/fakes.js';

const ACTOR = { uid: '1', role: 'ADMIN' };

describe('role service', () => {
  let repository;
  let service;

  beforeEach(() => {
    repository = createFakeRoleRepository();
    service = createRoleService({ roleRepository: repository });
  });

  it('creates a role and returns its permissions in the API shape', async () => {
    const role = await service.create(
      {
        code: 'SALES',
        name: 'Sales',
        level: 5,
        permissions: [{ menuItemId: 3, create: true, edit: false, delete: false }],
      },
      ACTOR,
    );

    expect(role).toMatchObject({ code: 'SALES', name: 'Sales', level: 5, isActive: true });
    expect(role.permissions).toEqual([
      { menuItemId: 3, pageUrl: '/users', create: true, edit: false, delete: false },
    ]);
  });

  it('upper-cases the code and rejects a duplicate', async () => {
    await service.create({ code: 'sales', name: 'Sales', level: 5 }, ACTOR);

    await expect(
      service.create({ code: 'SALES', name: 'Sales again', level: 5 }, ACTOR),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(repository.findByCode('SALES')).toBeTruthy();
  });

  it('refuses to create a reserved role code', async () => {
    await expect(
      service.create({ code: 'ADMIN', name: 'Fake admin', level: 1 }, ACTOR),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects a menu that appears twice', async () => {
    await expect(
      service.create(
        {
          code: 'SALES',
          name: 'Sales',
          level: 5,
          permissions: [
            { menuItemId: 1, create: false, edit: false, delete: false },
            { menuItemId: 1, create: true, edit: false, delete: false },
          ],
        },
        ACTOR,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects an unknown menu instead of letting the foreign key fail', async () => {
    await expect(
      service.create(
        {
          code: 'SALES',
          name: 'Sales',
          level: 5,
          permissions: [{ menuItemId: 99, create: false, edit: false, delete: false }],
        },
        ACTOR,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('replaces the permission set on update', async () => {
    const role = await service.create(
      {
        code: 'SALES',
        name: 'Sales',
        level: 5,
        permissions: [{ menuItemId: 1, create: true, edit: true, delete: false }],
      },
      ACTOR,
    );

    const updated = await service.update(
      role.id,
      { permissions: [{ menuItemId: 3, create: false, edit: true, delete: false }] },
      ACTOR,
    );
    expect(updated.permissions).toEqual([
      { menuItemId: 3, pageUrl: '/users', create: false, edit: true, delete: false },
    ]);
  });

  it('keeps the permissions when the update does not send any', async () => {
    const role = await service.create(
      {
        code: 'SALES',
        name: 'Sales',
        level: 5,
        permissions: [{ menuItemId: 1, create: true, edit: true, delete: false }],
      },
      ACTOR,
    );

    const updated = await service.update(role.id, { name: 'Sales team' }, ACTOR);
    expect(updated.name).toBe('Sales team');
    expect(updated.permissions).toHaveLength(1);
  });

  it('does not allow editing a built-in admin role', async () => {
    const admin = repository.findByCode('ADMIN');

    await expect(service.update(admin.role_id, { name: 'Renamed' }, ACTOR)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('refuses to deactivate a role that still has users', async () => {
    const role = await service.create({ code: 'SALES', name: 'Sales', level: 5 }, ACTOR);
    repository.roles.find((row) => row.role_id === role.id).assigned = 2;

    await expect(service.update(role.id, { isActive: false }, ACTOR)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('maps menus to the options the role form renders', async () => {
    expect(await service.listMenus()).toEqual([
      {
        id: 1,
        code: 'OVERVIEW',
        name: 'Overview',
        parentId: null,
        order: 1,
        pageUrl: '/overview',
      },
      {
        id: 2,
        code: 'ADMINISTRATION',
        name: 'Administration',
        parentId: null,
        order: 5,
        pageUrl: null,
      },
      { id: 3, code: 'USERS', name: 'Users', parentId: 2, order: 6, pageUrl: '/users' },
      { id: 4, code: 'ROLES', name: 'Roles', parentId: 2, order: 7, pageUrl: '/roles' },
      {
        id: 5,
        code: 'MENU_ACCESS',
        name: 'Menu access',
        parentId: 2,
        order: 8,
        pageUrl: '/menu-access',
      },
      {
        id: 6,
        code: 'MASTER',
        name: 'Master',
        parentId: null,
        order: 2,
        pageUrl: null,
      },
      { id: 7, code: 'CUSTOMER', name: 'Customers', parentId: 6, order: 3, pageUrl: '/customers' },
      { id: 8, code: 'COMPANY', name: 'Companies', parentId: 6, order: 4, pageUrl: '/companies' },
    ]);
  });

  it('returns 404 for an unknown role', async () => {
    await expect(service.get(999)).rejects.toMatchObject({ statusCode: 404 });
  });
});
