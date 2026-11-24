import {
  ADDRESS_SELECT,
  countryExistsIn,
  locationIsValidIn,
  saveMainAddress,
} from '../../utils/address.js';

const SELECT = {
  public_id: true,
  customer_kind: true,
  customer_code: true,
  customer_name: true,
  whatsapp_optin: true,
  created_at: true,
  updated_at: true,
  parameter_customer_status_idToparameter: { select: { code: true, label: true } },
  // Contact details live on the customer's profiles (master first), not on the customer row.
  customer_profile: {
    where: { deleted_at: null, profile: { deleted_at: null } },
    orderBy: [{ is_master: 'desc' }, { customer_profile_id: 'asc' }],
    select: {
      is_master: true,
      profile: {
        select: {
          public_id: true,
          name: true,
          email: true,
          contact_no: true,
          alt_contact_no: true,
          designation: true,
          parameter_profile_gender_idToparameter: { select: { code: true } },
          parameter_profile_age_group_idToparameter: { select: { code: true } },
          nationality: { select: { code: true } },
          status: { select: { code: true } },
          address_profile_address_idToaddress: { select: ADDRESS_SELECT },
        },
      },
    },
  },
};

const LIVE_LINK = { deleted_at: null, profile: { deleted_at: null } };
const anyProfile = (match) => ({ customer_profile: { some: { ...LIVE_LINK, profile: match } } });

function contactData(contact) {
  return {
    name: contact.name,
    email: contact.email || null,
    contact_no: contact.contactNo || null,
    alt_contact_no: contact.altContactNo || null,
    designation: contact.designation || null,
    gender_id: contact.genderId ?? null,
    age_group_id: contact.ageGroupId ?? null,
    nationality_id: contact.nationalityId ?? null,
    ...(contact.statusId !== undefined && { status_id: contact.statusId }),
  };
}

async function addProfile(tx, customerId, data, isMaster, actorId) {
  const profile = await tx.profile.create({
    data: { ...data, created_by: actorId },
    select: { profile_id: true },
  });
  await tx.customer_profile.create({
    data: {
      customer_id: customerId,
      profile_id: profile.profile_id,
      is_master: isMaster,
      created_by: actorId,
    },
  });
  return profile.profile_id;
}

/**
 * Makes another contact person of this customer the main contact. The customer's address lives
 * on the main contact's profile, so it moves along; the new main follows the customer status.
 */
async function switchMain(tx, customerId, profilePublicId, statusId) {
  const target = await tx.customer_profile.findFirst({
    where: { customer_id: customerId, ...LIVE_LINK, profile: { public_id: profilePublicId } },
    select: { customer_profile_id: true, profile_id: true, is_master: true },
  });
  if (!target || target.is_master) return;
  const current = await tx.customer_profile.findFirst({
    where: { customer_id: customerId, is_master: true, ...LIVE_LINK },
    select: {
      customer_profile_id: true,
      profile: { select: { profile_id: true, address_id: true } },
    },
  });
  // Only one live main per customer (unique index): clear the old one first.
  if (current) {
    await tx.customer_profile.update({
      where: { customer_profile_id: current.customer_profile_id },
      data: { is_master: false },
    });
  }
  await tx.customer_profile.update({
    where: { customer_profile_id: target.customer_profile_id },
    data: { is_master: true },
  });
  const addressId = current?.profile.address_id ?? null;
  await tx.profile.update({
    where: { profile_id: target.profile_id },
    data: { status_id: statusId, ...(addressId && { address_id: addressId }) },
  });
  if (addressId) {
    await tx.profile.update({
      where: { profile_id: current.profile.profile_id },
      data: { address_id: null },
    });
  }
}

/** Contact persons (not the master): update the ones sent with an id, add new, remove the rest. */
async function syncContacts(tx, customerId, contacts, base, actorId) {
  const links = await tx.customer_profile.findMany({
    where: { customer_id: customerId, is_master: false, ...LIVE_LINK },
    select: {
      customer_profile_id: true,
      profile_id: true,
      profile: { select: { public_id: true } },
    },
  });
  const byPublicId = new Map(links.map((link) => [link.profile.public_id, link]));
  const kept = new Set();
  for (const contact of contacts) {
    const link = contact.id && byPublicId.get(contact.id);
    if (link) {
      kept.add(link.customer_profile_id);
      await tx.profile.update({
        where: { profile_id: link.profile_id },
        data: {
          ...contactData(contact),
          updated_by: actorId,
          updated_at: new Date(),
          row_version: { increment: 1 },
        },
      });
    } else {
      await addProfile(tx, customerId, { ...base, ...contactData(contact) }, false, actorId);
    }
  }
  const now = new Date();
  for (const link of links.filter((item) => !kept.has(item.customer_profile_id))) {
    await tx.customer_profile.update({
      where: { customer_profile_id: link.customer_profile_id },
      data: { deleted_at: now, deleted_by: actorId },
    });
    await tx.profile.update({
      where: { profile_id: link.profile_id },
      data: { deleted_at: now, deleted_by: actorId },
    });
  }
}

const SORT_COLUMNS = {
  createdAt: 'created_at',
  code: 'customer_code',
  name: 'customer_name',
};

function buildWhere({ search, status, kind }) {
  const where = { deleted_at: null };
  if (status) where.parameter_customer_status_idToparameter = { code: status };
  if (kind) where.customer_kind = kind;
  if (search) {
    const contains = { contains: search, mode: 'insensitive' };
    where.OR = [
      { customer_code: contains },
      { customer_name: contains },
      anyProfile({ name: contains }),
      anyProfile({ email: contains }),
      anyProfile({ contact_no: contains }),
    ];
  }
  return where;
}

const actorIdOf = (actorId) => (actorId ? BigInt(actorId) : null);

function profileChanges(data) {
  return {
    ...(data.contactName !== undefined && { name: data.contactName }),
    ...(data.email !== undefined && { email: data.email || null }),
    ...(data.contactNo !== undefined && { contact_no: data.contactNo || null }),
    ...(data.altContactNo !== undefined && { alt_contact_no: data.altContactNo || null }),
    ...(data.designation !== undefined && { designation: data.designation || null }),
    ...(data.genderId !== undefined && { gender_id: data.genderId }),
    ...(data.ageGroupId !== undefined && { age_group_id: data.ageGroupId }),
    ...(data.nationalityId !== undefined && { nationality_id: data.nationalityId }),
    ...(data.statusId !== undefined && { status_id: data.statusId }),
    updated_by: actorIdOf(data.actorId),
    row_version: { increment: 1 },
  };
}

export function createCustomerRepository(prisma) {
  return {
    async list({ skip, take, search, status, kind, sortBy, sortOrder }) {
      const where = buildWhere({ search, status, kind });
      const [rows, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          orderBy: { [SORT_COLUMNS[sortBy] || SORT_COLUMNS.createdAt]: sortOrder },
          skip,
          take,
          select: SELECT,
        }),
        prisma.customer.count({ where }),
      ]);
      return { rows, total };
    },

    findByPublicId(publicId) {
      return prisma.customer.findFirst({
        where: { public_id: publicId, deleted_at: null },
        select: SELECT,
      });
    },

    /** The next free CUS-NNN code (deleted customers count too, so codes are never reused). */
    async nextCode() {
      const rows = await prisma.customer.findMany({
        where: { customer_code: { startsWith: 'CUS-' } },
        select: { customer_code: true },
      });
      const top = Math.max(0, ...rows.map((row) => Number(row.customer_code.slice(4)) || 0));
      return `CUS-${String(top + 1).padStart(3, '0')}`;
    },

    codeExists(code, excludePublicId) {
      return prisma.customer.count({
        where: {
          customer_code: code,
          deleted_at: null,
          ...(excludePublicId && { public_id: { not: excludePublicId } }),
        },
      });
    },

    /** Which of these numbers a contact person of another live company customer already uses. */
    async companyContactNosTaken(numbers, excludePublicId) {
      if (!numbers.length) return [];
      const rows = await prisma.profile.findMany({
        where: {
          deleted_at: null,
          contact_no: { in: numbers },
          customer_profile: {
            some: {
              deleted_at: null,
              customer: {
                deleted_at: null,
                customer_kind: 'COMPANY',
                ...(excludePublicId && { public_id: { not: excludePublicId } }),
              },
            },
          },
        },
        select: { contact_no: true },
      });
      return rows.map((row) => row.contact_no);
    },

    /** Another live customer of the same type already uses this main contact number. */
    contactNoTaken(contactNo, kind, excludePublicId) {
      return prisma.customer.count({
        where: {
          deleted_at: null,
          customer_kind: kind,
          ...(excludePublicId && { public_id: { not: excludePublicId } }),
          customer_profile: {
            some: {
              is_master: true,
              ...LIVE_LINK,
              profile: { deleted_at: null, contact_no: contactNo },
            },
          },
        },
      });
    },

    countryExists: countryExistsIn(prisma),

    async findNationalityId(code) {
      const row = await prisma.nationality.findUnique({
        where: { code },
        select: { nationality_id: true },
      });
      return row?.nationality_id ?? null;
    },

    locationIsValid: locationIsValidIn(prisma),

    findParameter(typeCode, code) {
      return prisma.parameter.findFirst({
        where: { code, parameter_type: { code: typeCode } },
        select: { parameter_id: true },
      });
    },

    listOptions() {
      return prisma.parameter
        .findMany({
          where: { parameter_type: { code: 'ACCOUNT_STATUS' }, is_active: true },
          orderBy: { display_order: 'asc' },
          select: { code: true, label: true },
        })
        .then((statuses) => ({
          kinds: [
            { code: 'INDIVIDUAL', label: 'Individual' },
            { code: 'COMPANY', label: 'Company' },
          ],
          statuses,
        }));
    },

    create(data, actorId) {
      return prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({
          data: {
            customer_kind: data.kind,
            customer_code: data.code,
            customer_name: data.name,
            status_id: data.statusId,
            whatsapp_optin: data.agreedToWhatsapp ?? true,
            created_by: actorIdOf(actorId),
          },
          select: { customer_id: true, public_id: true },
        });
        const actor = actorIdOf(actorId);
        const base = { user_type_id: data.userTypeId, status_id: data.statusId };
        const masterId = await addProfile(
          tx,
          customer.customer_id,
          {
            ...base,
            ...contactData({ ...data, name: data.contactName || data.name }),
          },
          true,
          actor,
        );
        for (const contact of data.contacts ?? []) {
          await addProfile(
            tx,
            customer.customer_id,
            { ...base, ...contactData(contact) },
            false,
            actor,
          );
        }
        // The customer's address is kept on its main contact's profile.
        if (data.address) await saveMainAddress(tx, 'profile', masterId, data.address, actor);
        return tx.customer.findUnique({ where: { public_id: customer.public_id }, select: SELECT });
      });
    },

    async update(publicId, data, actorId) {
      return prisma.$transaction(async (tx) => {
        const customer = await tx.customer.update({
          where: { public_id: publicId },
          data: {
            ...(data.name !== undefined && { customer_name: data.name }),
            ...(data.statusId !== undefined && { status_id: data.statusId }),
            ...(data.agreedToWhatsapp !== undefined && { whatsapp_optin: data.agreedToWhatsapp }),
            updated_by: actorIdOf(actorId),
            row_version: { increment: 1 },
          },
          select: { customer_id: true, status_id: true },
        });
        const changes = profileChanges({ ...data, actorId });
        const actor = actorIdOf(actorId);
        if (data.mainContactId) {
          await switchMain(tx, customer.customer_id, data.mainContactId, customer.status_id);
        }
        const master = await tx.customer_profile.findFirst({
          where: { customer_id: customer.customer_id, is_master: true, ...LIVE_LINK },
          select: { profile_id: true },
        });
        let masterId = master?.profile_id;
        if (master) {
          await tx.profile.update({ where: { profile_id: master.profile_id }, data: changes });
        } else {
          const fresh = { ...changes };
          delete fresh.row_version;
          delete fresh.updated_by;
          masterId = await addProfile(
            tx,
            customer.customer_id,
            {
              user_type_id: data.userTypeId,
              name: data.contactName || data.name || 'Contact',
              ...fresh,
              status_id: customer.status_id,
            },
            true,
            actor,
          );
        }
        if (data.contacts !== undefined) {
          await syncContacts(
            tx,
            customer.customer_id,
            data.contacts,
            { user_type_id: data.userTypeId, status_id: customer.status_id },
            actor,
          );
        }
        if (data.address) await saveMainAddress(tx, 'profile', masterId, data.address, actor);
        return tx.customer.findUnique({ where: { public_id: publicId }, select: SELECT });
      });
    },

    softDelete(publicId, actorId) {
      return prisma.customer.update({
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
