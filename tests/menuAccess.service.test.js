import { describe, expect, it } from 'vitest';
import { createMenuAccessService } from '../src/modules/menu-access/menuAccess.service.js';
import { createFakeMenuAccessRepository } from './helpers/fakes.js';

const ACTOR = { uid: '1' };

function setup() {
  const menuAccessRepository = createFakeMenuAccessRepository();
  return {
    menuAccessRepository,
    service: createMenuAccessService({ menuAccessRepository }),
  };
}

const selectedCodes = (result) =>
  result.menus.filter((menu) => menu.selected).map((menu) => menu.code);

describe('menu access service', () => {
  it('returns every active menu, flagged with the role selection', async () => {
    const { service } = setup();
    const result = await service.roleMenus(2);

    expect(result.role).toMatchObject({ id: 2, code: 'ADMIN' });
    expect(result.isSuperAdmin).toBe(false);
    expect(selectedCodes(result)).toEqual([
      'OVERVIEW',
      'ADMINISTRATION',
      'USERS',
      'ROLES',
      'MENU_ACCESS',
      'MASTER',
      'CUSTOMER',
      'COMPANY',
    ]);
  });

  it('marks every menu selected for the super administrator', async () => {
    const { service } = setup();
    const result = await service.roleMenus(1);

    expect(result.isSuperAdmin).toBe(true);
    expect(result.menus.every((menu) => menu.selected)).toBe(true);
  });

  it('never lets the super administrator lose a menu', async () => {
    const { service } = setup();
    await expect(service.saveRoleMenus(1, [{ menuItemId: 1 }], ACTOR)).rejects.toThrow(
      'The super administrator always has every menu',
    );
  });

  it('replaces a role selection and stores the add / edit / delete flags sent', async () => {
    const { menuAccessRepository, service } = setup();
    const result = await service.saveRoleMenus(
      2,
      [{ menuItemId: 1 }, { menuItemId: 4, create: true, edit: true }],
      ACTOR,
    );

    expect(selectedCodes(result)).toEqual(['OVERVIEW', 'ROLES']);
    expect(menuAccessRepository.roleRows.get(2).get(4)).toEqual({
      is_create: true,
      is_edit: true,
      is_delete: false,
    });
    expect(result.menus.find((menu) => menu.code === 'ROLES')).toMatchObject({
      create: true,
      edit: true,
      delete: false,
    });
  });

  it('rejects an unknown menu', async () => {
    const { service } = setup();
    await expect(
      service.saveRoleMenus(2, [{ menuItemId: 1 }, { menuItemId: 99 }], ACTOR),
    ).rejects.toThrow('One or more menus do not exist');
  });

  it('treats a repeated menu id as a single selection', async () => {
    const { service } = setup();
    const result = await service.saveRoleMenus(
      2,
      [{ menuItemId: 1 }, { menuItemId: 1 }, { menuItemId: 4 }],
      ACTOR,
    );

    expect(selectedCodes(result)).toEqual(['OVERVIEW', 'ROLES']);
  });

  it('returns the business functions', async () => {
    const { service } = setup();

    expect(await service.listFunctions()).toEqual([
      { id: 10, code: 'SALES', name: 'Sales' },
      { id: 11, code: 'OPERATIONS', name: 'Operations' },
      { id: 12, code: 'STORES', name: 'Stores' },
    ]);
  });

  it('returns the menus a function owns', async () => {
    const { service } = setup();
    const result = await service.functionMenus(10);

    expect(result.function).toMatchObject({ code: 'SALES' });
    expect(selectedCodes(result)).toEqual(['USERS', 'ROLES', 'CUSTOMER', 'COMPANY']);
  });

  it('saves a function selection without touching role grants', async () => {
    const { menuAccessRepository, service } = setup();
    const before = structuredClone([...menuAccessRepository.roleRows.get(2)]);
    const result = await service.saveFunctionMenus(12, [3, 4], ACTOR);

    expect(selectedCodes(result)).toEqual(['USERS', 'ROLES']);
    expect([...menuAccessRepository.roleRows.get(2)]).toEqual(before);
  });

  it('rejects an unknown function', async () => {
    const { service } = setup();
    await expect(service.functionMenus(99)).rejects.toThrow('Menu function not found');
  });
});
