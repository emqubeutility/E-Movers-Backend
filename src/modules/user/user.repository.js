/** Columns safe to read for a user. The password hash is deliberately absent. */
export const USER_SELECT = {
  public_id: true,
  can_sign_in: true,
  can_login: true,
  username: true,
  last_login_at: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
  role: { select: { role_code: true, name: true, role_level: true } },
  profile: {
    select: {
      public_id: true,
      status: { select: { code: true, label: true } },
      nationality: { select: { code: true, name: true } },
      address_profile_address_idToaddress: {
        select: {
          address_text: true,
          postal_code: true,
          country: { select: { country_id: true, name: true } },
          state: { select: { state_id: true, name: true } },
          city: { select: { city_id: true, name: true } },
        },
      },
      name: true,
      last_name: true,
      contact_no: true,
      designation: true,
      email: true,
      employee: {
        select: {
          employee_code: true,
          person_type: true,
          // Home organization; employee_organization lists all of them.
          organization_id: true,
          organization: { select: { name: true } },
          is_outsourced: true,
          company: { select: { public_id: true, name: true } },
          employee_organization: {
            select: { organization_id: true, organization: { select: { name: true } } },
          },
          employee_skill: { select: { parameter: { select: { code: true, label: true } } } },
          team_member_team_member_leader_profile_idToemployee: {
            select: {
              employee_team_member_member_profile_idToemployee: {
                select: {
                  employee_code: true,
                  profile: { select: { public_id: true, name: true, last_name: true } },
                },
              },
            },
          },
          employee_function: { select: { parameter: { select: { code: true } } } },
        },
      },
    },
  },
};

const AUTH_SELECT = {
  ...USER_SELECT,
  user_id: true,
  password_hash: true,
  failed_login_count: true,
  locked_until: true,
};

const SORT_COLUMNS = {
  createdAt: (order) => ({ created_at: order }),
  email: (order) => ({ username: order }),
  firstName: (order) => ({ profile: { name: order } }),
  lastLoginAt: (order) => ({ last_login_at: { sort: order, nulls: 'last' } }),
};

/** A person belongs to an organization as their home one or through the organizations list. */
function orgFilter(organizationId) {
  return {
    OR: [
      { profile: { employee: { organization_id: organizationId } } },
      {
        profile: {
          employee: { employee_organization: { some: { organization_id: organizationId } } },
        },
      },
    ],
  };
}

function buildWhere({ search, role, status, skill, organizationId }) {
  const where = { deleted_at: null };
  if (organizationId) where.AND = [orgFilter(organizationId)];
  if (role) where.role = { role_code: role };
  if (status || skill) where.profile = {};
  if (status) where.profile.status = { code: status };
  // People with this skill (a trade such as CARPENTER).
  if (skill) where.profile.employee = { employee_skill: { some: { parameter: { code: skill } } } };
  if (search) {
    const contains = { contains: search, mode: 'insensitive' };
    where.OR = [
      { username: contains },
      { profile: { name: contains } },
      { profile: { last_name: contains } },
    ];
  }
  return where;
}

function toActorId(actorId) {
  return actorId ? BigInt(actorId) : null;
}

function profileChanges(data) {
  const changes = {};
  if (data.firstName !== undefined) changes.name = data.firstName;
  if (data.lastName !== undefined) changes.last_name = data.lastName || null;
  if (data.phone !== undefined) changes.contact_no = data.phone || null;
  if (data.designation !== undefined) changes.designation = data.designation || null;
  if (data.email !== undefined) changes.email = data.email;
  if (data.statusId !== undefined) changes.status_id = data.statusId;
  if (data.nationalityId !== undefined) changes.nationality_id = data.nationalityId;
  return changes;
}

/**
 * Sets the business functions of a person. The employee row only holds the extra details and
 * shares the profile key, so it is created the first time a function is assigned.
 */
async function saveFunctions(tx, profileId, data) {
  if (data.functionIds === undefined) return;
  const existing = await tx.employee.findUnique({
    where: { profile_id: profileId },
    select: { profile_id: true },
  });
  if (!existing) {
    if (data.functionIds.length === 0) return;
    await tx.employee.create({
      data: {
        profile_id: profileId,
        employee_code: `EMP${profileId}`,
        person_type: 'EMPLOYEE',
        organization_id: data.organizationId,
        created_by: toActorId(data.actorId),
      },
    });
  }
  await tx.employee_function.deleteMany({ where: { profile_id: profileId } });
  if (data.functionIds.length > 0) {
    await tx.employee_function.createMany({
      data: data.functionIds.map((functionId) => ({
        profile_id: profileId,
        function_id: functionId,
        created_by: toActorId(data.actorId),
      })),
    });
  }
}

/** Organizations, skills, main address and crew of a person: each part is replaced only when sent. */
async function saveExtras(tx, profileId, data) {
  const actor = toActorId(data.actorId);
  if (data.organizationIds !== undefined) {
    await tx.employee_organization.deleteMany({ where: { profile_id: profileId } });
    if (data.organizationIds.length > 0) {
      await tx.employee_organization.createMany({
        data: data.organizationIds.map((id) => ({
          profile_id: profileId,
          organization_id: BigInt(id),
          created_by: actor,
        })),
      });
      await tx.employee.update({
        where: { profile_id: profileId },
        data: { organization_id: BigInt(data.defaultOrganizationId ?? data.organizationIds[0]) },
      });
    }
  }
  if (data.skillIds !== undefined) {
    await tx.employee_skill.deleteMany({ where: { profile_id: profileId } });
    if (data.skillIds.length > 0) {
      await tx.employee_skill.createMany({
        data: data.skillIds.map((skillId) => ({
          profile_id: profileId,
          skill_id: skillId,
          created_by: actor,
        })),
      });
    }
  }
  if (data.address !== undefined) {
    const { address_id: addressId } = await tx.profile.findUnique({
      where: { profile_id: profileId },
      select: { address_id: true },
    });
    const values = {
      country_id: data.address.countryId,
      state_id: data.address.stateId ?? null,
      city_id: data.address.cityId ?? null,
      address_text: data.address.addressText,
      postal_code: data.address.postalCode || null,
    };
    if (addressId) {
      await tx.address.update({
        where: { address_id: addressId },
        data: { ...values, updated_by: actor },
      });
    } else {
      const created = await tx.address.create({
        data: {
          ...values,
          address_type_id: data.address.typeId,
          is_default: true,
          created_by: actor,
        },
        select: { address_id: true },
      });
      await tx.profile.update({
        where: { profile_id: profileId },
        data: { address_id: created.address_id },
      });
    }
  }
  if (data.crewProfileIds !== undefined) {
    await tx.team_member.deleteMany({ where: { leader_profile_id: profileId } });
    if (data.crewProfileIds.length > 0) {
      await tx.team_member.createMany({
        data: data.crewProfileIds.map((memberId) => ({
          leader_profile_id: profileId,
          member_profile_id: memberId,
          created_by: actor,
        })),
      });
    }
  }
  if (data.leaveTeams) {
    await tx.team_member.deleteMany({ where: { member_profile_id: profileId } });
  }
}

/** [value, count] pairs in ascending value order. */
function countBy(values) {
  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((left, right) => left[0] - right[0]);
}

function accountChanges(data) {
  const changes = {};
  if (data.roleId !== undefined) changes.role_id = data.roleId;
  if (data.canSignIn !== undefined) changes.can_sign_in = data.canSignIn;
  if (data.canLogin !== undefined) changes.can_login = data.canLogin;
  if (data.passwordHash !== undefined) {
    changes.password_hash = data.passwordHash;
    changes.password_changed_at = new Date();
  }
  return changes;
}

export function createUserRepository(prisma) {
  return {
    async list({ skip, take, search, role, status, skill, sortBy, sortOrder, organizationId }) {
      const where = buildWhere({ search, role, status, skill, organizationId });
      const orderBy = (SORT_COLUMNS[sortBy] || SORT_COLUMNS.createdAt)(sortOrder);
      // Page and total are fetched side by side; relations come from joins, not per-row queries.
      const [rows, total] = await Promise.all([
        prisma.app_user.findMany({ where, orderBy, skip, take, select: USER_SELECT }),
        prisma.app_user.count({ where }),
      ]);
      return { rows, total };
    },

    /** Counts for the overview page: totals by role and status plus the newest users. */
    async summary({ recentCount, organizationId }) {
      const where = {
        deleted_at: null,
        ...(organizationId && { AND: [orgFilter(organizationId)] }),
      };
      // Read-only counts: run side by side rather than one after another in a transaction.
      const [total, byRole, byStatus, roles, statuses, recent] = await Promise.all([
        prisma.app_user.count({ where }),
        prisma.app_user.groupBy({
          by: ['role_id'],
          where,
          _count: { _all: true },
          orderBy: { role_id: 'asc' },
        }),
        // The status is kept on the person's profile, so it is counted here rather than in SQL.
        prisma.app_user.findMany({ where, select: { profile: { select: { status_id: true } } } }),
        prisma.role.findMany({ select: { role_id: true, role_code: true, name: true } }),
        prisma.parameter.findMany({
          where: { parameter_type: { code: 'ACCOUNT_STATUS' } },
          select: { parameter_id: true, code: true, label: true },
        }),
        prisma.app_user.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: recentCount,
          select: USER_SELECT,
        }),
      ]);
      const roleById = new Map(roles.map((role) => [role.role_id, role]));
      const statusById = new Map(statuses.map((status) => [status.parameter_id, status]));
      return {
        total,
        byRole: byRole.map((row) => ({
          code: roleById.get(row.role_id)?.role_code ?? String(row.role_id),
          name: roleById.get(row.role_id)?.name ?? 'Unknown',
          count: row._count._all,
        })),
        byStatus: countBy(byStatus.map((row) => row.profile.status_id)).map(([id, count]) => ({
          code: statusById.get(id)?.code ?? String(id),
          label: statusById.get(id)?.label ?? 'Unknown',
          count,
        })),
        recent,
      };
    },

    findById(publicId, organizationId) {
      return prisma.app_user.findFirst({
        where: {
          public_id: publicId,
          deleted_at: null,
          ...(organizationId && { AND: [orgFilter(organizationId)] }),
        },
        select: USER_SELECT,
      });
    },

    findAuthById(publicId) {
      return prisma.app_user.findFirst({
        where: { public_id: publicId, deleted_at: null },
        select: AUTH_SELECT,
      });
    },

    /** Makes the organization the active one and returns the refreshed account. */
    findAuthByUsername(username) {
      return prisma.app_user.findUnique({ where: { username }, select: AUTH_SELECT });
    },

    async countOrganizations(ids) {
      return prisma.organization.count({ where: { organization_id: { in: ids.map(BigInt) } } });
    },

    async findNationalityId(code) {
      const row = await prisma.nationality.findUnique({
        where: { code },
        select: { nationality_id: true },
      });
      return row?.nationality_id ?? null;
    },

    /** The state must belong to the country, and the city to the country and (if given) the state. */
    async locationIsValid({ countryId, stateId, cityId }) {
      if (stateId) {
        const state = await prisma.state.findFirst({
          where: { state_id: stateId, country_id: countryId, is_active: true },
          select: { state_id: true },
        });
        if (!state) return false;
      }
      if (cityId) {
        const city = await prisma.city.findFirst({
          where: {
            city_id: cityId,
            country_id: countryId,
            is_active: true,
            ...(stateId && { state_id: stateId }),
          },
          select: { city_id: true },
        });
        if (!city) return false;
      }
      return true;
    },

    /** An active contractor company, or null. */
    findContractor(publicId) {
      return prisma.company.findFirst({
        where: {
          public_id: publicId,
          deleted_at: null,
          parameter_company_company_type_idToparameter: { code: 'CONTRACTOR' },
          parameter_company_status_idToparameter: { code: 'ACTIVE' },
        },
        select: { company_id: true, organization_id: true },
      });
    },

    async countryExists(countryId) {
      const row = await prisma.country.findUnique({
        where: { country_id: countryId },
        select: { country_id: true },
      });
      return Boolean(row);
    },

    /** Employees who can join a team: active, employee type, in the organizations, with a skill. */
    listCrewCandidates({ publicIds, organizationIds, skillCode, search, excludeProfilePublicId }) {
      const contains = search ? { contains: search, mode: 'insensitive' } : null;
      return prisma.employee.findMany({
        where: {
          person_type: 'EMPLOYEE',
          profile: {
            deleted_at: null,
            status: { code: 'ACTIVE' },
            ...(publicIds && { public_id: { in: publicIds } }),
            ...(excludeProfilePublicId && { public_id: { not: excludeProfilePublicId } }),
            ...(contains && { OR: [{ name: contains }, { last_name: contains }] }),
          },
          employee_skill: skillCode ? { some: { parameter: { code: skillCode } } } : { some: {} },
          ...(organizationIds?.length && {
            OR: [
              { organization_id: { in: organizationIds.map(BigInt) } },
              {
                employee_organization: {
                  some: { organization_id: { in: organizationIds.map(BigInt) } },
                },
              },
            ],
          }),
        },
        orderBy: { employee_code: 'asc' },
        take: 200,
        select: {
          profile_id: true,
          employee_code: true,
          profile: { select: { public_id: true, name: true, last_name: true } },
          employee_skill: { select: { parameter: { select: { code: true, label: true } } } },
        },
      });
    },

    /** Two staff profiles cannot share an e-mail address (the database enforces this too). */
    async emailExists(email, excludePublicId) {
      const found = await prisma.profile.findFirst({
        where: {
          email,
          deleted_at: null,
          userType: { code: 'EMPLOYEE' },
          ...(excludePublicId && {
            NOT: { app_user_app_user_profile_idToprofile: { is: { public_id: excludePublicId } } },
          }),
        },
        select: { profile_id: true },
      });
      return Boolean(found);
    },

    async usernameExists(username) {
      const found = await prisma.app_user.findUnique({
        where: { username },
        select: { user_id: true },
      });
      return Boolean(found);
    },

    async employeeCodeExists(code) {
      const found = await prisma.employee.findUnique({
        where: { employee_code: code },
        select: { profile_id: true },
      });
      return Boolean(found);
    },

    async findHeadOfficeId() {
      const org = await prisma.organization.findFirst({
        where: { is_head_office: true },
        select: { organization_id: true },
      });
      return org ? Number(org.organization_id) : null;
    },

    findRoleByCode(code) {
      return prisma.role.findFirst({
        where: { role_code: code, is_active: true },
        select: { role_id: true, role_code: true, role_level: true },
      });
    },

    /** The role with the least authority; used for people who cannot sign in. */
    findLowestRole() {
      return prisma.role.findFirst({
        where: { is_active: true, role_code: { notIn: ['SUPERADMIN', 'ADMIN'] } },
        orderBy: { role_level: 'desc' },
        select: { role_id: true, role_code: true, role_level: true },
      });
    },

    listRoles() {
      return prisma.role.findMany({
        where: { is_active: true },
        orderBy: { role_level: 'asc' },
        select: { role_code: true, name: true, role_level: true },
      });
    },

    listParameters(typeCode, codes) {
      return prisma.parameter.findMany({
        where: { code: { in: codes }, is_active: true, parameter_type: { code: typeCode } },
        select: { parameter_id: true, code: true },
      });
    },

    findParameter(typeCode, code) {
      return prisma.parameter.findFirst({
        where: { code, is_active: true, parameter_type: { code: typeCode } },
        select: { parameter_id: true, code: true },
      });
    },

    /** Person and login are created together so a failure never leaves a profile without a login. */
    create(data) {
      const actor = toActorId(data.actorId);
      return prisma.$transaction(async (tx) => {
        const profile = await tx.profile.create({
          data: {
            user_type_id: data.userTypeId,
            status_id: data.statusId,
            name: data.firstName,
            last_name: data.lastName || null,
            email: data.email,
            contact_no: data.phone || null,
            designation: data.designation || null,
            nationality_id: data.nationalityId ?? null,
            created_by: actor,
          },
          select: { profile_id: true },
        });
        // Every login has an employee row: it holds the employee code and the person type.
        await tx.employee.create({
          data: {
            profile_id: profile.profile_id,
            employee_code: data.employeeCode,
            person_type: data.personType,
            is_outsourced: data.isOutsourced ?? false,
            contractor_company_id: data.contractorCompanyId ?? null,
            organization_id: data.employeeOrganizationId,
            created_by: actor,
          },
        });
        await saveFunctions(tx, profile.profile_id, data);
        await saveExtras(tx, profile.profile_id, data);
        return tx.app_user.create({
          data: {
            profile_id: profile.profile_id,
            username: data.username,
            password_hash: data.passwordHash,
            can_sign_in: data.canSignIn ?? true,
            can_login: data.canLogin ?? true,
            role_id: data.roleId,
            created_by: actor,
          },
          select: USER_SELECT,
        });
      });
    },

    update(publicId, data) {
      const actor = toActorId(data.actorId);
      return prisma.$transaction(async (tx) => {
        const account = await tx.app_user.update({
          where: { public_id: publicId },
          data: { ...accountChanges(data), updated_by: actor },
          select: { user_id: true, profile_id: true },
        });
        // A new role or status takes effect at the next sign-in, so end the old sessions.
        if (
          data.roleId !== undefined ||
          data.statusId !== undefined ||
          data.canSignIn !== undefined ||
          data.canLogin !== undefined
        ) {
          await tx.auth_session.updateMany({
            where: { user_id: account.user_id, revoked_at: null },
            data: { revoked_at: new Date() },
          });
        }
        const employeeChanges = {
          ...(data.personType !== undefined && { person_type: data.personType }),
          ...(data.isOutsourced !== undefined && {
            is_outsourced: data.isOutsourced,
            contractor_company_id: data.contractorCompanyId ?? null,
          }),
        };
        if (Object.keys(employeeChanges).length > 0) {
          await tx.employee.updateMany({
            where: { profile_id: account.profile_id },
            data: { ...employeeChanges, updated_by: actor },
          });
        }
        await saveFunctions(tx, account.profile_id, data);
        await saveExtras(tx, account.profile_id, data);
        const profile = profileChanges(data);
        if (Object.keys(profile).length > 0) {
          await tx.profile.update({
            where: { profile_id: account.profile_id },
            data: { ...profile, updated_by: actor },
          });
        }
        return tx.app_user.findUnique({ where: { public_id: publicId }, select: USER_SELECT });
      });
    },

    softDelete(publicId, { actorId, inactiveStatusId }) {
      const actor = toActorId(actorId);
      const now = new Date();
      return prisma.$transaction(async (tx) => {
        const account = await tx.app_user.update({
          where: { public_id: publicId },
          data: { deleted_at: now, deleted_by: actor },
          select: { user_id: true, profile_id: true },
        });
        await tx.profile.update({
          where: { profile_id: account.profile_id },
          data: { deleted_at: now, deleted_by: actor, status_id: inactiveStatusId },
        });
        await tx.auth_session.updateMany({
          where: { user_id: account.user_id, revoked_at: null },
          data: { revoked_at: now },
        });
        await tx.team_member.deleteMany({
          where: {
            OR: [
              { leader_profile_id: account.profile_id },
              { member_profile_id: account.profile_id },
            ],
          },
        });
      });
    },

    recordLoginSuccess(userId, ip) {
      return prisma.app_user.update({
        where: { user_id: userId },
        data: {
          last_login_at: new Date(),
          last_login_ip: ip,
          failed_login_count: 0,
          locked_until: null,
        },
        select: { user_id: true },
      });
    },

    recordLoginFailure(userId, { failedCount, lockedUntil }) {
      return prisma.app_user.update({
        where: { user_id: userId },
        data: { failed_login_count: failedCount, locked_until: lockedUntil },
        select: { user_id: true },
      });
    },
  };
}
