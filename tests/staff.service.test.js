import { beforeEach, describe, expect, it } from 'vitest';
import { createUserService } from '../src/modules/user/user.service.js';
import { CONTRACTOR_ID, createFakeRepositories } from './helpers/fakes.js';

const PASSWORD = 'Str0ng!Passw0rd';

describe('staff: organizations, address, skills and crew', () => {
  let fakes;
  let service;
  let orgAdmin;
  const superAdmin = { sub: 'super', uid: '1', role: 'SUPERADMIN', org: null, orgs: [] };

  const person = (code, extra = {}) => ({
    employeeCode: code,
    username: code,
    email: `${code.toLowerCase()}@example.com`,
    password: PASSWORD,
    firstName: code,
    role: 'EXECUTIVE',
    ...extra,
  });

  beforeEach(async () => {
    fakes = createFakeRepositories();
    service = createUserService({ userRepository: fakes.userRepository });
    const admin = await fakes.seedUser({
      email: 'admin@example.com',
      password: PASSWORD,
      role: 'ADMIN',
    });
    orgAdmin = {
      sub: admin.public_id,
      uid: admin.user_id.toString(),
      role: 'ADMIN',
      org: '1',
      orgs: ['1', '2'],
    };
  });

  it('lets a super administrator give a person several organizations, home first', async () => {
    const created = await service.create(person('MULTI', { organizationIds: [2, 1] }), superAdmin);
    expect(created.organizationIds).toEqual([2, 1]);
  });

  it('requires a super administrator to name an organization', async () => {
    await expect(service.create(person('NOORG'), superAdmin)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('keeps an organization admin to the organizations they belong to', async () => {
    await expect(
      service.create(person('FOREIGN', { organizationIds: [3] }), orgAdmin),
    ).rejects.toMatchObject({ statusCode: 403 });

    const own = await service.create(person('OWNORG'), orgAdmin);
    expect(own.organizationIds).toEqual([1]);
    const both = await service.create(person('BOTH', { organizationIds: [1, 2] }), orgAdmin);
    expect(both.organizationIds).toEqual([1, 2]);
  });

  it('shows a person in the list of each organization they belong to', async () => {
    await service.create(person('SHARED', { organizationIds: [1, 2] }), superAdmin);
    const second = await service.list(
      { page: 1, limit: 10 },
      { ...orgAdmin, org: '2', orgs: ['2'] },
    );
    expect(second.items.map((item) => item.employeeCode)).toContain('SHARED');
  });

  it('stores nationality, address and skills', async () => {
    const created = await service.create(
      person('FULL', {
        organizationIds: [1],
        nationality: 'IN',
        address: { countryId: 1, stateId: 10, cityId: 100, addressText: '12 Marina Walk' },
        skills: ['DRIVING', 'PACKING'],
      }),
      orgAdmin,
    );
    expect(created.nationality).toMatchObject({ code: 'IN' });
    expect(created.address).toMatchObject({
      countryId: 1,
      stateId: 10,
      cityId: 100,
      addressText: '12 Marina Walk',
    });
    expect(created.skills.sort()).toEqual(['DRIVING', 'PACKING']);
  });

  it('rejects an unknown country, skill and nationality', async () => {
    const base = person('BAD');
    await expect(
      service.create({ ...base, address: { countryId: 99, addressText: 'x' } }, orgAdmin),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.create({ ...base, skills: ['NOPE'] }, orgAdmin)).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(service.create({ ...base, nationality: 'ZZ' }, orgAdmin)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('lets an employee exist without a sign-in, password or role', async () => {
    const worker = await service.create(
      {
        employeeCode: 'DRV9',
        username: 'DRV9',
        firstName: 'Dan',
        personType: 'EMPLOYEE',
        canSignIn: false,
        organizationIds: [1],
      },
      orgAdmin,
    );
    expect(worker).toMatchObject({ canSignIn: false, personType: 'EMPLOYEE', role: 'AUDITOR' });
  });

  it('needs an active contractor from the same organization for an outsourced employee', async () => {
    const base = { ...person('OUT1'), organizationIds: [1] };
    await expect(service.create({ ...base, isOutsourced: true }, orgAdmin)).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(
      service.create(
        {
          ...base,
          isOutsourced: true,
          contractorCompanyId: '00000000-0000-4000-8000-000000000000',
        },
        orgAdmin,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    const outsourced = await service.create(
      { ...base, isOutsourced: true, contractorCompanyId: CONTRACTOR_ID },
      orgAdmin,
    );
    expect(outsourced).toMatchObject({
      isOutsourced: true,
      contractor: { id: CONTRACTOR_ID, name: 'Swift Movers' },
    });

    // Switching it off clears the contractor.
    const own = await service.update(outsourced.id, { isOutsourced: false }, orgAdmin);
    expect(own).toMatchObject({ isOutsourced: false, contractor: null });
  });

  it('keeps sign-in compulsory for site users and asks for a password and role otherwise', async () => {
    const base = {
      employeeCode: 'SIGN1',
      username: 'SIGN1',
      firstName: 'S',
      email: 's1@example.com',
      organizationIds: [1],
    };
    await expect(
      service.create({ ...base, personType: 'SITE_USER', canSignIn: false }, orgAdmin),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.create({ ...base, role: 'EXECUTIVE' }, orgAdmin)).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(service.create({ ...base, password: PASSWORD }, orgAdmin)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('needs a password to switch sign-in on and removes it when switched off', async () => {
    const worker = await service.create(
      {
        employeeCode: 'DRV8',
        username: 'DRV8',
        firstName: 'Dee',
        personType: 'EMPLOYEE',
        canSignIn: false,
        organizationIds: [1],
      },
      orgAdmin,
    );
    await expect(service.update(worker.id, { canSignIn: true }, orgAdmin)).rejects.toMatchObject({
      statusCode: 400,
    });
    const on = await service.update(worker.id, { canSignIn: true, password: PASSWORD }, orgAdmin);
    expect(on.canSignIn).toBe(true);
    expect((await service.update(worker.id, { canSignIn: false }, orgAdmin)).canSignIn).toBe(false);
  });

  describe('crew', () => {
    let driver;

    beforeEach(async () => {
      driver = await fakes.seedUser({
        email: 'driver@example.com',
        password: PASSWORD,
        personType: 'EMPLOYEE',
        skills: ['DRIVING'],
        employeeCode: 'DRV1',
        username: 'DRV1',
      });
    });

    it('assigns eligible employees to a team leader and lists them', async () => {
      const leader = await service.create(
        person('LEAD1', { role: 'TEAM_LEADER', crewMemberIds: [driver.profile.public_id] }),
        orgAdmin,
      );
      expect(leader.crewMembers).toEqual([
        expect.objectContaining({ id: driver.profile.public_id, employeeCode: 'DRV1' }),
      ]);
    });

    it('lets one person be in several teams', async () => {
      const crewMemberIds = [driver.profile.public_id];
      const first = await service.create(
        person('LEAD2', { role: 'TEAM_LEADER', crewMemberIds }),
        orgAdmin,
      );
      const second = await service.create(
        person('LEAD3', { role: 'TEAM_LEADER', crewMemberIds }),
        orgAdmin,
      );
      expect(first.crewMembers).toHaveLength(1);
      expect(second.crewMembers).toHaveLength(1);
    });

    it('refuses crew for anyone who is not a team leader', async () => {
      await expect(
        service.create(person('NOTLEAD', { crewMemberIds: [driver.profile.public_id] }), orgAdmin),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('refuses a crew member without a skill or who is not an employee', async () => {
      const noSkill = await fakes.seedUser({
        email: 'noskill@example.com',
        password: PASSWORD,
        personType: 'EMPLOYEE',
        employeeCode: 'NSK1',
        username: 'NSK1',
      });
      const office = await fakes.seedUser({
        email: 'office@example.com',
        password: PASSWORD,
        skills: ['DRIVING'],
        employeeCode: 'OFF1',
        username: 'OFF1',
      });
      for (const member of [noSkill, office]) {
        await expect(
          service.create(
            person(`L${member.user_id}`, {
              role: 'TEAM_LEADER',
              crewMemberIds: [member.profile.public_id],
            }),
            orgAdmin,
          ),
        ).rejects.toMatchObject({ statusCode: 400 });
      }
    });

    it('ends the team when the leader gets another role', async () => {
      const leader = await service.create(
        person('LEAD4', { role: 'TEAM_LEADER', crewMemberIds: [driver.profile.public_id] }),
        orgAdmin,
      );
      const updated = await service.update(leader.id, { role: 'EXECUTIVE' }, orgAdmin);
      expect(updated.crewMembers).toEqual([]);
    });

    it('removes a deactivated crew member from every team', async () => {
      const leader = await service.create(
        person('LEAD5', { role: 'TEAM_LEADER', crewMemberIds: [driver.profile.public_id] }),
        orgAdmin,
      );
      await service.update(driver.public_id, { status: 'INACTIVE' }, orgAdmin);
      expect((await service.getById(leader.id, orgAdmin)).crewMembers).toEqual([]);
    });

    it('lists only active employees with a skill, filtered by skill', async () => {
      const all = await service.listCrew({}, orgAdmin);
      expect(all.map((item) => item.employeeCode)).toEqual(['DRV1']);
      expect(await service.listCrew({ skill: 'PACKING' }, orgAdmin)).toEqual([]);
    });
  });
});
