import { describe, expect, it } from 'vitest';
import { createPermissionService } from '../src/modules/permission/permission.service.js';
import { createFakePermissionRepository } from './helpers/fakes.js';

const SALES = 10;
const STORES = 12;

function setup() {
  const repository = createFakePermissionRepository();
  return { repository, service: createPermissionService({ permissionRepository: repository }) };
}

const codes = (menus) => menus.map((menu) => menu.code);

describe('permission service with business functions', () => {
  it('keeps a menu with no owning function open to every role that has it', async () => {
    const { service } = setup();
    expect(codes(await service.listFor('EXECUTIVE', '7'))).toContain('CUSTOMER');
  });

  it('hides a function-owned menu from a person who holds none of its functions', async () => {
    const { repository, service } = setup();
    repository.ownMenu('CUSTOMER', SALES);

    expect(codes(await service.listFor('EXECUTIVE', '7'))).not.toContain('CUSTOMER');
  });

  it('shows it once the person holds one of its functions', async () => {
    const { repository, service } = setup();
    repository.ownMenu('CUSTOMER', SALES);
    repository.ownMenu('CUSTOMER', STORES);
    repository.giveFunction('7', STORES);

    expect(codes(await service.listFor('EXECUTIVE', '7'))).toContain('CUSTOMER');
    expect(codes(await service.listFor('EXECUTIVE', '8'))).not.toContain('CUSTOMER');
  });

  it('gives Admin every function', async () => {
    const { repository, service } = setup();
    repository.ownMenu('CUSTOMER', SALES);

    expect(codes(await service.listFor('ADMIN', '1'))).toContain('CUSTOMER');
  });
});
