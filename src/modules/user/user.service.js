import { randomBytes } from 'node:crypto';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../utils/errors.js';
import { toMeta, toPagination } from '../../utils/pagination.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { isAdmin, isAdminRole, isSuperAdmin } from '../../utils/roles.js';
import { orgScopeOf } from '../../utils/scope.js';

export const USER_TYPE_EMPLOYEE = 'EMPLOYEE';
export const STATUS_ACTIVE = 'ACTIVE';
export const STATUS_INACTIVE = 'INACTIVE';
export const SITE_USER = 'SITE_USER';
const RECENT_USERS = 5;

const nameOf = (profile) => [profile.name, profile.last_name].filter(Boolean).join(' ');

/** Home organization first, then the others, as numbers. */
export function organizationIdsOf(row) {
  const ids = [];
  const home = row.profile?.employee?.organization_id;
  if (home !== null && home !== undefined) ids.push(Number(home));
  for (const item of row.profile?.employee?.employee_organization ?? []) {
    const id = Number(item.organization_id);
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** The person's organizations with names: the home one first. */
function organizationsOf(row) {
  const names = new Map();
  const employee = row.profile?.employee;
  if (employee?.organization)
    names.set(Number(employee.organization_id), employee.organization.name);
  for (const item of row.profile?.employee?.employee_organization ?? []) {
    names.set(Number(item.organization_id), item.organization?.name ?? '');
  }
  return organizationIdsOf(row).map((id) => ({ id, name: names.get(id) ?? '' }));
}

function toAddressDto(row) {
  if (!row) return null;
  return {
    countryId: row.country.country_id,
    countryName: row.country.name,
    stateId: row.state?.state_id ?? null,
    stateName: row.state?.name ?? null,
    cityId: row.city?.city_id ?? null,
    cityName: row.city?.name ?? null,
    addressText: row.address_text,
    postalCode: row.postal_code,
  };
}

export function toUserDto(row) {
  return {
    id: row.public_id,
    email: row.profile.email ?? null,
    employeeCode: row.profile.employee?.employee_code ?? row.username,
    username: row.username,
    personType: row.profile.employee?.person_type ?? 'SITE_USER',
    firstName: row.profile.name,
    lastName: row.profile.last_name,
    phone: row.profile.contact_no,
    designation: row.profile.designation,
    role: row.role.role_code,
    roleName: row.role.name,
    status: row.profile.status.code,
    // Home organization (the auth service replaces it with the active one for the signed-in user).
    organizationId: organizationIdsOf(row)[0] ?? null,
    canSignIn: row.can_sign_in ?? true,
    canLogin: row.can_login ?? true,
    profileId: row.profile.public_id ?? null,
    organizationIds: organizationIdsOf(row),
    organizations: organizationsOf(row),
    isOutsourced: row.profile.employee?.is_outsourced ?? false,
    contractor: row.profile.employee?.company
      ? { id: row.profile.employee.company.public_id, name: row.profile.employee.company.name }
      : null,
    nationality: row.profile.nationality
      ? { code: row.profile.nationality.code, name: row.profile.nationality.name }
      : null,
    address: toAddressDto(row.profile.address_profile_address_idToaddress),
    skills: (row.profile.employee?.employee_skill ?? []).map((item) => item.parameter.code),
    crewMembers: (
      row.profile.employee?.team_member_team_member_leader_profile_idToemployee ?? []
    ).map((item) => {
      const member = item.employee_team_member_member_profile_idToemployee;
      return {
        id: member.profile.public_id,
        name: nameOf(member.profile),
        employeeCode: member.employee_code,
      };
    }),
    functions: (row.profile.employee?.employee_function ?? []).map((item) => item.parameter.code),
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createUserService({ userRepository }) {
  async function requireRole(code, actor) {
    const role = await userRepository.findRoleByCode(code);
    if (!role)
      throw new BadRequestError(`Unknown role: ${code}`, [
        { field: 'role', message: 'Unknown role' },
      ]);
    if (role.role_code === 'SUPERADMIN' && actor?.role !== 'SUPERADMIN') {
      throw new ForbiddenError(
        'Only a super administrator can assign the super administrator role',
      );
    }
    // A menu grant is not enough to hand out an administrator role.
    if (isAdminRole(role.role_code) && !isAdmin(actor)) {
      throw new ForbiddenError('Only an administrator can assign an administrator role');
    }
    return role;
  }

  async function requireParameter(typeCode, code) {
    const parameter = await userRepository.findParameter(typeCode, code);
    if (!parameter)
      throw new BadRequestError(`Setup value ${typeCode}.${code} is missing; run the seed script`);
    return parameter;
  }

  /** Business functions by code; unknown codes are refused. `undefined` means "leave as is". */
  async function resolveFunctionIds(codes) {
    if (codes === undefined) return undefined;
    const rows = codes.length ? await userRepository.listParameters('MENU_FUNCTION', codes) : [];
    if (rows.length !== codes.length) {
      throw new BadRequestError('Unknown function', [
        { field: 'functions', message: 'One or more functions do not exist' },
      ]);
    }
    return rows.map((row) => row.parameter_id);
  }

  async function assertEmailFree(email, excludeId) {
    if (email && (await userRepository.emailExists(email, excludeId))) {
      throw new ConflictError('Email is already in use', [
        { field: 'email', message: 'Email is already in use' },
      ]);
    }
  }

  /** The organizations the caller may hand out: `null` = any (super administrator). */
  function allowedOrganizationIds(actor) {
    if (!actor || isSuperAdmin(actor)) return null;
    const own = actor.orgs?.length ? actor.orgs : actor.org ? [actor.org] : [];
    return own.map(Number);
  }

  /** The organizations a new or edited person belongs to; the first one is their home. */
  async function resolveOrganizationIds(input, actor, roleCode) {
    if (roleCode === 'SUPERADMIN') return [];
    const allowed = allowedOrganizationIds(actor);
    const asked = input.organizationIds ?? (input.organizationId ? [input.organizationId] : []);
    let ids = [...new Set(asked.map(Number))];
    // A super administrator working in one organization adds people to it by default.
    if (ids.length === 0 && allowed === null && actor?.org) ids = [Number(actor.org)];
    if (ids.length === 0) {
      if (allowed === null && actor) {
        throw new BadRequestError('Choose at least one organization', [
          { field: 'organizationIds', message: 'Select at least one organization' },
        ]);
      }
      if (allowed) ids = [Number(orgScopeOf(actor))];
    }
    if (allowed && ids.some((id) => !allowed.includes(id))) {
      throw new ForbiddenError('You can only assign organizations you belong to');
    }
    if (ids.length > 0 && (await userRepository.countOrganizations(ids)) !== ids.length) {
      throw new BadRequestError('Unknown organization', [
        { field: 'organizationIds', message: 'One or more organizations do not exist' },
      ]);
    }
    return ids;
  }

  async function resolveSkillIds(codes) {
    if (codes === undefined) return undefined;
    const rows = codes.length ? await userRepository.listParameters('SKILL', codes) : [];
    if (rows.length !== codes.length) {
      throw new BadRequestError('Unknown skill', [
        { field: 'skills', message: 'One or more skills do not exist' },
      ]);
    }
    return rows.map((row) => row.parameter_id);
  }

  async function resolveNationalityId(code) {
    if (code === undefined) return undefined;
    if (!code) return null;
    const id = await userRepository.findNationalityId(code);
    if (id === null) {
      throw new BadRequestError('Unknown nationality', [
        { field: 'nationality', message: 'Select a nationality' },
      ]);
    }
    return id;
  }

  async function resolveAddress(address) {
    if (address === undefined) return undefined;
    if (!(await userRepository.countryExists(address.countryId))) {
      throw new BadRequestError('Unknown country', [
        { field: 'countryId', message: 'Select a valid country' },
      ]);
    }
    if (!(await userRepository.locationIsValid(address))) {
      throw new BadRequestError('The state or city does not belong to the country', [
        { field: 'address', message: 'Choose a state and city that belong to the country' },
      ]);
    }
    const type = await requireParameter('ADDRESS_TYPE', 'HOME');
    return { ...address, typeId: type.parameter_id };
  }

  /** Only a team leader has a crew; every member must be an eligible employee. */
  async function resolveCrew(publicIds, { roleCode, organizationIds, leaderProfileId }) {
    if (publicIds === undefined) return undefined;
    if (publicIds.length > 0 && roleCode !== 'TEAM_LEADER') {
      throw new BadRequestError('Only a team leader has crew members', [
        { field: 'crewMemberIds', message: 'Crew members can only be set for a team leader' },
      ]);
    }
    if (publicIds.length === 0) return [];
    const found = await userRepository.listCrewCandidates({
      publicIds,
      organizationIds,
      excludeProfilePublicId: leaderProfileId,
    });
    if (found.length !== new Set(publicIds).size) {
      throw new BadRequestError('Some crew members cannot be assigned', [
        {
          field: 'crewMemberIds',
          message: 'Pick active employees with a skill from your organizations',
        },
      ]);
    }
    return found.map((row) => row.profile_id);
  }

  async function assertCodeFree(code) {
    if (await userRepository.employeeCodeExists(code)) {
      throw new ConflictError('Employee code is already in use', [
        { field: 'employeeCode', message: 'Employee code is already in use' },
      ]);
    }
  }

  /** An outsourced employee must name an active contractor that belongs to one of their organizations. */
  async function resolveOutsourcing({ isOutsourced, contractorCompanyId }, organizationIds) {
    if (!isOutsourced) return { isOutsourced: false, contractorCompanyId: null };
    const fail = (message) => {
      throw new BadRequestError(message, [{ field: 'contractorCompanyId', message }]);
    };
    if (organizationIds?.length > 1) {
      const message = 'An outsourced person belongs to one organization only';
      throw new BadRequestError(message, [{ field: 'organizationIds', message }]);
    }
    if (!contractorCompanyId) fail('Select the contractor');
    const company = await userRepository.findContractor(contractorCompanyId);
    if (!company) fail('Select an active contractor company');
    if (organizationIds?.length && !organizationIds.includes(Number(company.organization_id))) {
      fail('The contractor must belong to one of the selected organizations');
    }
    return { isOutsourced: true, contractorCompanyId: company.company_id };
  }

  async function assertUsernameFree(username) {
    if (await userRepository.usernameExists(username)) {
      throw new ConflictError('User name is already in use', [
        { field: 'username', message: 'User name is already in use' },
      ]);
    }
  }

  /** A site user must be able to sign in; whoever signs in needs a password and a role. */
  function assertSignInRules({ personType, canSignIn, password, role }) {
    const fail = (field, message) => {
      throw new BadRequestError(message, [{ field, message }]);
    };
    if (!canSignIn && personType === SITE_USER)
      fail('canSignIn', 'A site user must be able to sign in');
    if (canSignIn && !password) fail('password', 'Enter a password');
    if (canSignIn && !role) fail('role', 'Select a role');
  }

  /** A site user always needs an e-mail address; an employee may have none. */
  function assertEmailRule(personType, email) {
    if (personType === SITE_USER && !email) {
      throw new BadRequestError('A site user needs an e-mail address', [
        { field: 'email', message: 'Enter the email address' },
      ]);
    }
  }

  /** Everyone may reach their own record; other records must sit in the caller's organization. */
  async function getExisting(id, actor) {
    const scope = actor && actor.sub !== id ? orgScopeOf(actor) : null;
    const row = await userRepository.findById(id, scope);
    if (!row) throw new NotFoundError('User not found');
    return row;
  }

  /** Only admins may change role, status or another person's details. */
  function assertCanUpdate(actor, id, input) {
    const isSelf = actor.sub === id;
    const admin = isAdmin(actor);
    if (!admin && !isSelf) throw new ForbiddenError();

    const changingAccess = input.role !== undefined || input.status !== undefined;
    if (!changingAccess) return;
    if (!admin) throw new ForbiddenError('Only an administrator can change role or status');
    // Even an admin cannot demote or suspend themselves out of the application.
    if (isSelf) throw new BadRequestError('You cannot change your own role or status');
  }

  async function resolvePassword(actor, id, input) {
    if (input.password === undefined) {
      // A current password without a new one would otherwise be accepted and silently ignored.
      if (input.currentPassword !== undefined) {
        throw new BadRequestError('Enter the new password as well', [
          { field: 'password', message: 'Enter the new password' },
        ]);
      }
      return {};
    }
    const changingOwn = actor.sub === id;
    if (changingOwn) {
      const account = await userRepository.findAuthById(id);
      const matches =
        input.currentPassword &&
        (await verifyPassword(input.currentPassword, account.password_hash));
      if (!matches) throw new UnauthorizedError('Current password is incorrect');
    }
    return { passwordHash: await hashPassword(input.password) };
  }

  return {
    async list(query, actor) {
      const pagination = toPagination(query);
      const { rows, total } = await userRepository.list({
        ...query,
        organizationId: orgScopeOf(actor),
        skip: pagination.skip,
        take: pagination.take,
      });
      return { items: rows.map(toUserDto), meta: toMeta(pagination, total) };
    },

    async summary(actor) {
      const data = await userRepository.summary({
        recentCount: RECENT_USERS,
        organizationId: orgScopeOf(actor),
      });
      return { ...data, recent: data.recent.map(toUserDto) };
    },

    async getById(id, actor) {
      return toUserDto(await getExisting(id, actor));
    },

    async listRoles(actor) {
      const roles = await userRepository.listRoles();
      return roles
        .filter((role) => actor?.role === 'SUPERADMIN' || role.role_code !== 'SUPERADMIN')
        .map((role) => ({
          code: role.role_code,
          name: role.name,
          level: role.role_level,
        }));
    },

    async create(input, actor) {
      const personType = input.personType ?? SITE_USER;
      const employeeCode = input.employeeCode.trim().toUpperCase();
      const canSignIn = input.canSignIn ?? true;
      assertEmailRule(personType, input.email);
      assertSignInRules({ personType, canSignIn, password: input.password, role: input.role });
      if (canSignIn && !input.username) {
        throw new BadRequestError('Enter a user name', [
          { field: 'username', message: 'Enter a user name' },
        ]);
      }
      // Someone who never signs in still needs a unique, unused user name: the employee code.
      const username = (input.username ?? employeeCode).trim();
      await Promise.all([
        assertCodeFree(employeeCode),
        assertUsernameFree(username),
        assertEmailFree(input.email),
      ]);
      // Someone who cannot sign in still needs a role row; they get the least powerful one.
      const [role, status, userType] = await Promise.all([
        input.role ? requireRole(input.role, actor) : userRepository.findLowestRole(),
        requireParameter('ACCOUNT_STATUS', input.status || STATUS_ACTIVE),
        requireParameter('USER_TYPE', USER_TYPE_EMPLOYEE),
      ]);
      const roleCode = role.role_code;
      const organizationIds = await resolveOrganizationIds(input, actor, roleCode);
      const organizationId = organizationIds[0] ?? null;
      const functionIds = await resolveFunctionIds(input.functions);
      // A super administrator has no organization of their own; the employee row uses head office.
      const employeeOrganizationId = organizationId ?? (await userRepository.findHeadOfficeId());
      if (employeeOrganizationId === null) {
        throw new BadRequestError('Create an organization first', [
          { field: 'organizationIds', message: 'Organization is required' },
        ]);
      }
      const [skillIds, nationalityId, address, crewProfileIds] = await Promise.all([
        resolveSkillIds(input.skills),
        resolveNationalityId(input.nationality),
        resolveAddress(input.address),
        resolveCrew(input.crewMemberIds, { roleCode, organizationIds }),
      ]);
      const outsourcing = await resolveOutsourcing(input, organizationIds);
      const row = await userRepository.create({
        ...outsourcing,
        functionIds,
        employeeCode,
        username,
        personType,
        employeeOrganizationId,
        canSignIn,
        canLogin: input.canLogin ?? true,
        email: input.email,
        passwordHash: await hashPassword(
          canSignIn ? input.password : randomBytes(24).toString('hex'),
        ),
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        designation: input.designation,
        roleId: role.role_id,
        statusId: status.parameter_id,
        userTypeId: userType.parameter_id,
        organizationId,
        organizationIds: organizationIds.length ? organizationIds : undefined,
        skillIds,
        nationalityId,
        address,
        crewProfileIds,
        actorId: actor?.uid,
      });
      return toUserDto(row);
    },

    async update(id, input, actor) {
      assertCanUpdate(actor, id, input);
      const existing = await getExisting(id, actor);
      if (input.email !== undefined) await assertEmailFree(input.email, id);
      const nextType = input.personType ?? existing.profile.employee?.person_type ?? SITE_USER;
      assertEmailRule(nextType, input.email !== undefined ? input.email : existing.profile.email);
      const nextRole = input.role ?? existing.role.role_code;
      const wasSignIn = existing.can_sign_in ?? true;
      const nextSignIn = input.canSignIn ?? wasSignIn;
      if (nextType === SITE_USER && !nextSignIn) {
        throw new BadRequestError('A site user must be able to sign in', [
          { field: 'canSignIn', message: 'A site user must be able to sign in' },
        ]);
      }
      if (nextSignIn && !wasSignIn && !input.password) {
        throw new BadRequestError('Enter a password to allow sign-in', [
          { field: 'password', message: 'Enter a password' },
        ]);
      }
      const changesStaff = [
        input.functions,
        input.organizationIds,
        input.skills,
        input.crewMemberIds,
      ];
      if (changesStaff.some((value) => value !== undefined) && !isAdmin(actor)) {
        throw new ForbiddenError(
          'Only an administrator can change organizations, functions, skills or crew',
        );
      }
      const functionIds = await resolveFunctionIds(input.functions);
      if (functionIds?.length && organizationIdsOf(existing).length === 0) {
        throw new BadRequestError('This user has no organization, so functions cannot be assigned');
      }
      const organizationIds =
        input.organizationIds === undefined
          ? undefined
          : await resolveOrganizationIds(input, actor, nextRole);
      const currentIds = organizationIdsOf(existing);
      const effectiveIds = organizationIds ?? currentIds;
      const defaultOrganizationId = organizationIds?.length
        ? organizationIds.includes(currentIds[0])
          ? currentIds[0]
          : organizationIds[0]
        : undefined;
      // Moving someone away from team leader ends their team.
      const leavesLeadership = input.role !== undefined && input.role !== 'TEAM_LEADER';
      const [skillIds, nationalityId, address, crewProfileIds] = await Promise.all([
        resolveSkillIds(input.skills),
        resolveNationalityId(input.nationality),
        resolveAddress(input.address),
        leavesLeadership && input.crewMemberIds === undefined
          ? []
          : resolveCrew(input.crewMemberIds, {
              roleCode: nextRole,
              organizationIds: effectiveIds,
              leaderProfileId: existing.profile.public_id,
            }),
      ]);

      const changes = {
        functionIds,
        personType: input.personType,
        organizationId: organizationIdsOf(existing)[0] ?? null,
        organizationIds,
        defaultOrganizationId,
        skillIds,
        nationalityId,
        address,
        crewProfileIds,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        designation: input.designation,
        email: input.email,
        actorId: actor.uid,
        ...(await resolvePassword(actor, id, input)),
      };
      if (input.isOutsourced !== undefined || input.contractorCompanyId !== undefined) {
        const employee = existing.profile.employee;
        Object.assign(
          changes,
          await resolveOutsourcing(
            {
              isOutsourced: input.isOutsourced ?? employee?.is_outsourced ?? false,
              contractorCompanyId:
                input.contractorCompanyId !== undefined
                  ? input.contractorCompanyId
                  : employee?.company?.public_id,
            },
            effectiveIds,
          ),
        );
      }
      if (input.canSignIn !== undefined) {
        changes.canSignIn = input.canSignIn;
        // Turning sign-in off replaces the password with an unusable value.
        if (!input.canSignIn)
          changes.passwordHash = await hashPassword(randomBytes(24).toString('hex'));
      }
      if (input.canLogin !== undefined) changes.canLogin = input.canLogin;
      if (input.role !== undefined) changes.roleId = (await requireRole(input.role, actor)).role_id;
      if (input.status !== undefined) {
        const next = await requireParameter('ACCOUNT_STATUS', input.status);
        changes.statusId = next.parameter_id;
        // A person who is no longer active leaves every team they were a crew member of.
        changes.leaveTeams = input.status !== STATUS_ACTIVE;
      }
      return toUserDto(await userRepository.update(id, changes));
    },

    /** Employees who can be picked as crew, with their skills. */
    async listCrew(query, actor) {
      const allowed = allowedOrganizationIds(actor);
      const organizationIds =
        allowed ?? (query.organizationId ? [query.organizationId] : undefined);
      const rows = await userRepository.listCrewCandidates({
        organizationIds,
        skillCode: query.skill,
        search: query.search,
        excludeProfilePublicId: query.exclude,
      });
      return rows.map((row) => ({
        id: row.profile.public_id,
        name: nameOf(row.profile),
        employeeCode: row.employee_code,
        skills: row.employee_skill.map((item) => ({
          code: item.parameter.code,
          name: item.parameter.label,
        })),
      }));
    },

    async remove(id, actor) {
      if (actor.sub === id) throw new BadRequestError('You cannot delete your own account');
      const target = await getExisting(id, actor);
      if (isAdminRole(target.role.role_code) && !isAdmin(actor)) {
        throw new ForbiddenError('Only an administrator can delete an administrator account');
      }
      const inactive = await requireParameter('ACCOUNT_STATUS', STATUS_INACTIVE);
      await userRepository.softDelete(id, {
        actorId: actor.uid,
        inactiveStatusId: inactive.parameter_id,
      });
    },
  };
}
