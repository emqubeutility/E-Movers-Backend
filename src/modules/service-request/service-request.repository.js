import { ADDRESS_SELECT, countryExistsIn, locationIsValidIn } from '../../utils/address.js';

const SORT_COLUMNS = {
  createdAt: 'created_at',
  requestNo: 'request_no',
  title: 'title',
  moveDate: 'move_date',
};

const actorIdOf = (actorId) => (actorId ? BigInt(actorId) : null);
const toDate = (value) => (value ? new Date(`${value}T00:00:00Z`) : null);
const toTime = (value) => (value ? new Date(`1970-01-01T${value}:00Z`) : null);

function buildWhere({
  search,
  serviceGroupId,
  stageValue,
  statusValue,
  executiveId,
  executiveUserId,
  organizationId,
}) {
  const where = { deleted_at: null };
  if (organizationId) where.organization_id = organizationId;
  if (serviceGroupId) where.service_group_id = serviceGroupId;
  // Stage and status are filtered by parameter value.
  if (stageValue)
    where.parameter_service_request_stage_idToparameter = { parameter_value: stageValue };
  if (statusValue)
    where.parameter_service_request_status_idToparameter = { parameter_value: statusValue };
  if (executiveId) where.employee = { profile: { public_id: executiveId } };
  // An executive sees only the requests assigned to them.
  if (executiveUserId) {
    where.employee = {
      profile: {
        app_user_app_user_profile_idToprofile: { is: { user_id: BigInt(executiveUserId) } },
      },
    };
  }
  if (search) {
    const contains = { contains: search, mode: 'insensitive' };
    where.OR = [{ title: contains }, { request_no: contains }];
  }
  return where;
}

/** Columns written for a request; `data` is the validated, resolved input. */
function toColumns(data) {
  return {
    organization_id: data.organizationId,
    customer_id: data.customerId,
    customer_profile_id: data.customerProfileId ?? null,
    executive_profile_id: data.executiveProfileId ?? null,
    service_group_id: data.serviceGroupId,
    service_type_id: data.serviceTypeId,
    international_service_type_id: data.internationalServiceTypeId ?? null,
    title: data.title,
    residence_type_id: data.residenceTypeId ?? null,
    move_date: toDate(data.moveDate),
    volume_cbm: data.volumeCbm ?? null,
    enquiry_channel_id: data.enquiryChannelId ?? null,
    referral_id: data.referralId ?? null,
    survey_required: Boolean(data.surveyRequired),
    survey_type_id: data.surveyTypeId ?? null,
    survey_date: toDate(data.surveyDate),
    survey_time: toTime(data.surveyTime),
    storage_start_date: toDate(data.storageStartDate),
    storage_end_date: toDate(data.storageEndDate),
    pick_and_pack: Boolean(data.pickAndPack),
    remarks: data.remarks || null,
    status_id: data.statusId,
    stage_id: data.stageId,
  };
}

/** Updates the address row that is already linked, or creates one; returns its id. */
async function saveAddress(tx, currentId, address, actorId) {
  const values = {
    country_id: address.countryId,
    state_id: address.stateId ?? null,
    city_id: address.cityId ?? null,
    area_id: address.areaId ?? null,
    address_text: address.addressText,
    postal_code: address.postalCode || null,
  };
  if (currentId) {
    await tx.address.update({
      where: { address_id: currentId },
      data: { ...values, updated_by: actorId },
    });
    return currentId;
  }
  const created = await tx.address.create({
    data: { ...values, address_type_id: address.typeId, created_by: actorId },
    select: { address_id: true },
  });
  return created.address_id;
}

// Live staff who are not super administrators.
const notSuperAdmin = {
  deleted_at: null,
  NOT: { app_user_app_user_profile_idToprofile: { is: { role: { role_code: 'SUPERADMIN' } } } },
};

/** Executives who work in the organization (home or extra organization); null = all. */
function executiveWhere(organizationId) {
  return {
    profile: notSuperAdmin,
    ...(organizationId && {
      OR: [
        { organization_id: organizationId },
        { employee_organization: { some: { organization_id: organizationId } } },
      ],
    }),
  };
}

export function createServiceRequestRepository(prisma) {
  /** Adds the names the screens show: parameters, addresses, customer, executive, service type. */
  async function hydrate(rows) {
    const ids = (key) => [...new Set(rows.map((row) => row[key]).filter((id) => id != null))];
    const parameterIds = [
      ...new Set(
        [
          'international_service_type_id',
          'residence_type_id',
          'enquiry_channel_id',
          'referral_id',
          'survey_type_id',
          'status_id',
          'stage_id',
          'drop_reason_id',
        ].flatMap(ids),
      ),
    ];
    // The latest entry of each request's log, for "last action".
    const logs = await prisma.service_request_log.findMany({
      where: { service_request_id: { in: ids('service_request_id') } },
      orderBy: [{ service_request_id: 'asc' }, { created_at: 'desc' }, { log_id: 'desc' }],
      distinct: ['service_request_id'],
    });
    const users = await prisma.app_user.findMany({
      where: { user_id: { in: [...new Set(logs.map((log) => log.created_by).filter(Boolean))] } },
      select: { user_id: true, profile_id: true },
    });
    const profileIds = [
      ...new Set([
        ...ids('executive_profile_id'),
        ...ids('contacted_by_profile_id'),
        ...ids('customer_profile_id'),
        ...users.map((user) => user.profile_id),
      ]),
    ];
    const organizations = await prisma.organization.findMany({
      where: { organization_id: { in: ids('organization_id') } },
      select: { organization_id: true, name: true },
    });
    const [parameters, addresses, customers, executives, serviceTypes, groups] = await Promise.all([
      prisma.parameter.findMany({
        where: { parameter_id: { in: parameterIds } },
        select: { parameter_id: true, code: true, label: true, parameter_value: true },
      }),
      prisma.address.findMany({
        where: {
          address_id: { in: [...new Set([...ids('from_address_id'), ...ids('to_address_id')])] },
        },
        select: { address_id: true, ...ADDRESS_SELECT },
      }),
      prisma.customer.findMany({
        where: { customer_id: { in: ids('customer_id') } },
        select: {
          customer_id: true,
          public_id: true,
          customer_name: true,
          customer_code: true,
          // The main contact's number is shown in the list.
          customer_profile: {
            where: { is_master: true, deleted_at: null },
            select: { profile: { select: { contact_no: true } } },
            take: 1,
          },
        },
      }),
      prisma.profile.findMany({
        where: { profile_id: { in: profileIds } },
        select: {
          profile_id: true,
          public_id: true,
          name: true,
          last_name: true,
          contact_no: true,
        },
      }),
      prisma.service_type.findMany({
        where: { service_type_id: { in: ids('service_type_id') } },
        select: { service_type_id: true, name: true },
      }),
      prisma.service_group.findMany({
        where: { service_group_id: { in: ids('service_group_id') } },
        select: { service_group_id: true, code: true, name: true, file_id: true },
      }),
    ]);
    return {
      rows,
      parameters: new Map(parameters.map((item) => [item.parameter_id, item])),
      addresses: new Map(addresses.map((item) => [item.address_id, item])),
      customers: new Map(customers.map((item) => [item.customer_id, item])),
      executives: new Map(executives.map((item) => [item.profile_id, item])),
      serviceTypes: new Map(serviceTypes.map((item) => [item.service_type_id, item])),
      groups: new Map(groups.map((item) => [item.service_group_id, item])),
      lastLogs: new Map(logs.map((log) => [log.service_request_id, log])),
      organizations: new Map(organizations.map((item) => [item.organization_id, item.name])),
      userProfiles: new Map(users.map((user) => [user.user_id, user.profile_id])),
    };
  }

  const logEntry = (tx, serviceRequestId, action, fromStatusId, toStatusId, actor, remarks) =>
    tx.service_request_log.create({
      data: {
        service_request_id: serviceRequestId,
        action,
        from_status_id: fromStatusId ?? null,
        to_status_id: toStatusId ?? null,
        remarks: remarks || null,
        created_by: actor,
      },
    });

  return {
    async list({ skip, take, sortBy, sortOrder, ...filters }) {
      const where = buildWhere(filters);
      const [rows, total] = await Promise.all([
        prisma.service_request.findMany({
          where,
          orderBy: { [SORT_COLUMNS[sortBy] || SORT_COLUMNS.createdAt]: sortOrder },
          skip,
          take,
        }),
        prisma.service_request.count({ where }),
      ]);
      return { ...(await hydrate(rows)), total };
    },

    async findByPublicId(publicId, organizationId) {
      const row = await prisma.service_request.findFirst({
        where: {
          public_id: publicId,
          deleted_at: null,
          ...(organizationId && { organization_id: organizationId }),
        },
      });
      return row ? { ...(await hydrate([row])), row } : null;
    },

    async organizationExists(organizationId) {
      const found = await prisma.organization.findUnique({
        where: { organization_id: BigInt(organizationId) },
        select: { organization_id: true },
      });
      return Boolean(found);
    },

    findCustomerByPublicId(publicId) {
      return prisma.customer.findFirst({
        where: { public_id: publicId, deleted_at: null },
        select: { customer_id: true, customer_kind: true },
      });
    },

    /** A live contact person of the customer: the given one, or the main one. */
    async findCustomerProfile(customerId, profilePublicId) {
      const link = await prisma.customer_profile.findFirst({
        where: {
          customer_id: customerId,
          deleted_at: null,
          profile: {
            deleted_at: null,
            ...(profilePublicId && { public_id: profilePublicId }),
          },
          ...(!profilePublicId && { is_master: true }),
        },
        select: { profile_id: true },
      });
      return link?.profile_id ?? null;
    },

    findExecutiveByPublicId(publicId, organizationId) {
      return prisma.employee.findFirst({
        where: {
          ...executiveWhere(organizationId),
          profile: { ...notSuperAdmin, public_id: publicId },
        },
        select: { profile_id: true },
      });
    },

    /** The parameter with this id, if it belongs to the type; returns its code. */
    findParameterOfType(parameterId, typeCode) {
      return prisma.parameter.findFirst({
        where: { parameter_id: parameterId, is_active: true, parameter_type: { code: typeCode } },
        select: { parameter_id: true, code: true },
      });
    },

    /** The parameter of a type with this code (used by the address helper, e.g. PICKUP). */
    findParameter(typeCode, code) {
      return prisma.parameter.findFirst({
        where: { code, parameter_type: { code: typeCode } },
        select: { parameter_id: true },
      });
    },

    /** The parameter of a type with this parameter value (stage, status...). */
    findParameterByValue(typeCode, value) {
      return prisma.parameter.findFirst({
        where: { parameter_value: value, parameter_type: { code: typeCode } },
        select: { parameter_id: true },
      });
    },

    findServiceGroup(serviceGroupId) {
      return prisma.service_group.findFirst({
        where: { service_group_id: serviceGroupId, is_active: true },
        select: { service_group_id: true, code: true },
      });
    },

    listServiceGroups() {
      return prisma.service_group.findMany({
        where: { is_active: true },
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
        select: { service_group_id: true, code: true, name: true, file_id: true },
      });
    },

    findServiceType(serviceTypeId) {
      return prisma.service_type.findFirst({
        where: { service_type_id: serviceTypeId, is_active: true },
        select: { service_type_id: true, service_group_id: true },
      });
    },

    /** Country and city of the organization's address (where its local moves happen). */
    async findOrganizationPlace(organizationId) {
      const row = await prisma.organization.findUnique({
        where: { organization_id: organizationId },
        select: { address: { select: { country_id: true, city_id: true } } },
      });
      return { countryId: row?.address?.country_id ?? null, cityId: row?.address?.city_id ?? null };
    },

    countryExists: countryExistsIn(prisma),
    locationIsValid: locationIsValidIn(prisma),

    /** Executives the caller may choose: employees of the organization. */
    async listExecutives(organizationId) {
      const rows = await prisma.employee.findMany({
        where: executiveWhere(organizationId),
        select: { profile: { select: { public_id: true, name: true, last_name: true } } },
        orderBy: { profile: { name: 'asc' } },
        take: 200,
      });
      return rows.map((row) => row.profile);
    },

    listServiceTypes() {
      return prisma.service_type.findMany({
        where: { is_active: true },
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
        select: { service_type_id: true, service_group_id: true, name: true },
      });
    },

    create(data, actorId) {
      const actor = actorIdOf(actorId);
      return prisma.$transaction(async (tx) => {
        const created = await tx.service_request.create({
          data: { ...toColumns(data), created_by: actor },
          select: { service_request_id: true, public_id: true },
        });
        const links = {
          request_no: `SR-${String(created.service_request_id).padStart(6, '0')}`,
        };
        if (data.fromAddress)
          links.from_address_id = await saveAddress(tx, null, data.fromAddress, actor);
        if (data.toAddress)
          links.to_address_id = await saveAddress(tx, null, data.toAddress, actor);
        await tx.service_request.update({
          where: { service_request_id: created.service_request_id },
          data: links,
        });
        await logEntry(tx, created.service_request_id, 'CREATED', null, data.statusId, actor);
        return created.public_id;
      });
    },

    update(publicId, data, current, actorId) {
      const actor = actorIdOf(actorId);
      return prisma.$transaction(async (tx) => {
        const links = {
          from_address_id: data.fromAddress
            ? await saveAddress(tx, current.from_address_id, data.fromAddress, actor)
            : null,
          to_address_id: data.toAddress
            ? await saveAddress(tx, current.to_address_id, data.toAddress, actor)
            : null,
        };
        await tx.service_request.update({
          where: { public_id: publicId },
          data: {
            ...toColumns(data),
            ...links,
            updated_by: actor,
            row_version: { increment: 1 },
          },
        });
      });
    },

    /** Adds one log entry (e.g. "updated", with what changed and the new status). */
    addLog(current, action, remarks, actorId, toStatusId = current.status_id) {
      return logEntry(
        prisma,
        current.service_request_id,
        action,
        current.status_id,
        toStatusId,
        actorIdOf(actorId),
        remarks,
      );
    },

    /** The whole history of a request, newest first, with names and status labels. */
    async listLogs(serviceRequestId) {
      const logs = await prisma.service_request_log.findMany({
        where: { service_request_id: serviceRequestId },
        orderBy: [{ created_at: 'desc' }, { log_id: 'desc' }],
        take: 500,
      });
      const userIds = [...new Set(logs.map((log) => log.created_by).filter(Boolean))];
      const statusIds = [
        ...new Set(logs.flatMap((log) => [log.from_status_id, log.to_status_id]).filter(Boolean)),
      ];
      const [users, statuses] = await Promise.all([
        prisma.app_user.findMany({
          where: { user_id: { in: userIds } },
          select: { user_id: true, profile: { select: { name: true, last_name: true } } },
        }),
        prisma.parameter.findMany({
          where: { parameter_id: { in: statusIds } },
          select: { parameter_id: true, label: true },
        }),
      ]);
      return {
        logs,
        users: new Map(users.map((user) => [user.user_id, user.profile])),
        statuses: new Map(statuses.map((status) => [status.parameter_id, status.label])),
      };
    },

    /** The profile of a login (who "I" am when contacting a customer). */
    async profileIdOfUser(userId) {
      const found = await prisma.app_user.findUnique({
        where: { user_id: BigInt(userId) },
        select: { profile_id: true },
      });
      return found?.profile_id ?? null;
    },

    /** Moves the request to a new status with the given columns, and logs it. */
    changeStatus(current, { action, statusId, columns, remarks }, actorId) {
      const actor = actorIdOf(actorId);
      return prisma.$transaction(async (tx) => {
        await tx.service_request.update({
          where: { service_request_id: current.service_request_id },
          data: {
            ...columns,
            status_id: statusId,
            updated_by: actor,
            row_version: { increment: 1 },
          },
        });
        await logEntry(
          tx,
          current.service_request_id,
          action,
          current.status_id,
          statusId,
          actor,
          remarks,
        );
      });
    },

    softDelete(publicId, actorId) {
      return prisma.service_request.update({
        where: { public_id: publicId },
        data: {
          deleted_at: new Date(),
          deleted_by: actorIdOf(actorId),
          row_version: { increment: 1 },
        },
      });
    },
  };
}
