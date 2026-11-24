import {
  ADDRESS_SELECT,
  countryExistsIn,
  locationIsValidIn,
  saveMainAddress,
} from '../../utils/address.js';

const SELECT = {
  organization_id: true,
  organization_code: true,
  name: true,
  is_head_office: true,
  is_active: true,
  contact_no: true,
  lead_email: true,
  lead_cc_email: true,
  logo_file_id: true,
  quote_header_file_id: true,
  base_currency_id: true,
  time_zone_id: true,
  quote_review_min_limit: true,
  workload_min: true,
  workload_max: true,
  job_confirm_min_hours: true,
  employee_cost_per_hour: true,
  vehicle_cost_per_trip: true,
  employee_working_hours: true,
  vat_percent: true,
  profit_percent: true,
  display_color: true,
  invoice_max_delay_days: true,
  created_at: true,
  updated_at: true,
  // The contact person is a profile; the address lives in the address table.
  profile: { select: { profile_id: true, name: true, email: true, contact_no: true } },
  address: { select: ADDRESS_SELECT },
  parameter_organization_volume_uom_idToparameter: { select: { code: true } },
  parameter_organization_furniture_volume_uom_idToparameter: { select: { code: true } },
};

/** API values -> organization columns (only what was sent). */
const COLUMNS = {
  organizationCode: 'organization_code',
  name: 'name',
  isHeadOffice: 'is_head_office',
  isActive: 'is_active',
  contactNo: 'contact_no',
  leadEmail: 'lead_email',
  leadCcEmail: 'lead_cc_email',
  currencyId: 'base_currency_id',
  timeZoneId: 'time_zone_id',
  volumeUomId: 'volume_uom_id',
  furnitureVolumeUomId: 'furniture_volume_uom_id',
  quoteReviewMinLimit: 'quote_review_min_limit',
  workloadMin: 'workload_min',
  workloadMax: 'workload_max',
  jobConfirmMinHours: 'job_confirm_min_hours',
  employeeCostPerHour: 'employee_cost_per_hour',
  vehicleCostPerTrip: 'vehicle_cost_per_trip',
  employeeWorkingHours: 'employee_working_hours',
  vatPercent: 'vat_percent',
  profitPercent: 'profit_percent',
  displayColor: 'display_color',
  invoiceMaxDelayDays: 'invoice_max_delay_days',
};
const FILE_COLUMNS = { logoFileId: 'logo_file_id', quoteHeaderFileId: 'quote_header_file_id' };

function columnsOf(data) {
  const row = {};
  for (const [field, column] of Object.entries(COLUMNS)) {
    if (data[field] !== undefined) row[column] = data[field] === '' ? null : data[field];
  }
  for (const [field, column] of Object.entries(FILE_COLUMNS)) {
    if (data[field] !== undefined) row[column] = data[field] === null ? null : BigInt(data[field]);
  }
  return row;
}

const actorOf = (actorId) => (actorId ? BigInt(actorId) : null);

/** Creates or updates the organization's contact person (a profile). */
async function saveContact(tx, organizationId, contact, ids, actor) {
  const current = await tx.organization.findUnique({
    where: { organization_id: organizationId },
    select: { contact_profile_id: true },
  });
  const values = {
    name: contact.name,
    email: contact.email || null,
    contact_no: contact.contactNo || null,
  };
  if (current?.contact_profile_id) {
    await tx.profile.update({
      where: { profile_id: current.contact_profile_id },
      data: { ...values, updated_by: actor },
    });
    return;
  }
  const created = await tx.profile.create({
    data: { ...values, user_type_id: ids.userTypeId, status_id: ids.statusId, created_by: actor },
    select: { profile_id: true },
  });
  await tx.organization.update({
    where: { organization_id: organizationId },
    data: { contact_profile_id: created.profile_id },
  });
}

export function createOrganizationRepository(prisma) {
  async function save(tx, organizationId, data, actor) {
    // Only one head office.
    if (data.isHeadOffice === true) {
      await tx.organization.updateMany({
        where: { organization_id: { not: organizationId }, is_head_office: true },
        data: { is_head_office: false },
      });
    }
    if (data.contactPerson !== undefined) {
      await saveContact(tx, organizationId, data.contactPerson, data.contactIds, actor);
    }
    if (data.address !== undefined) {
      await saveMainAddress(tx, 'organization', organizationId, data.address, actor);
    }
  }

  return {
    /** `scope` limits an organization admin to their own organization. */
    findById(id, scope) {
      return prisma.organization.findFirst({
        where: { AND: [{ organization_id: BigInt(id) }, scope ? { organization_id: scope } : {}] },
        select: SELECT,
      });
    },

    async codeExists(code) {
      return (await prisma.organization.count({ where: { organization_code: code } })) > 0;
    },

    findParameter(typeCode, code) {
      return prisma.parameter.findFirst({
        where: { code, parameter_type: { code: typeCode } },
        select: { parameter_id: true },
      });
    },

    async currencyExists(id) {
      return (await prisma.currency.count({ where: { currency_id: id } })) > 0;
    },
    async timeZoneExists(id) {
      return (await prisma.time_zone.count({ where: { time_zone_id: id } })) > 0;
    },
    async fileExists(id) {
      return (await prisma.file_doc.count({ where: { file_doc_id: BigInt(id) } })) > 0;
    },

    countryExists: countryExistsIn(prisma),
    locationIsValid: locationIsValidIn(prisma),

    create(data, actorId) {
      const actor = actorOf(actorId);
      return prisma.$transaction(async (tx) => {
        const { organization_id: id } = await tx.organization.create({
          data: { ...columnsOf(data), created_by: actor },
          select: { organization_id: true },
        });
        await save(tx, id, data, actor);
        return tx.organization.findUnique({ where: { organization_id: id }, select: SELECT });
      });
    },

    update(id, data, actorId) {
      const actor = actorOf(actorId);
      const organizationId = BigInt(id);
      return prisma.$transaction(async (tx) => {
        await tx.organization.update({
          where: { organization_id: organizationId },
          data: { ...columnsOf(data), updated_by: actor, updated_at: new Date() },
        });
        await save(tx, organizationId, data, actor);
        return tx.organization.findUnique({
          where: { organization_id: organizationId },
          select: SELECT,
        });
      });
    },
  };
}
