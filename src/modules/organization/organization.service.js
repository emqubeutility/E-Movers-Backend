import { resolveAddress, toAddressDto } from '../../utils/address.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors.js';
import { requireParameter } from '../../utils/lookups.js';
import { isSuperAdmin } from '../../utils/roles.js';
import { orgScopeOf } from '../../utils/scope.js';

const numberOrNull = (value) => (value === null || value === undefined ? null : Number(value));

export function toOrganizationDto(row) {
  const contact = row.profile;
  return {
    organizationId: Number(row.organization_id),
    organizationCode: row.organization_code,
    name: row.name,
    isHeadOffice: row.is_head_office,
    isActive: row.is_active,
    contactNo: row.contact_no ?? null,
    contactPerson: contact
      ? { name: contact.name, email: contact.email ?? null, contactNo: contact.contact_no ?? null }
      : null,
    leadEmail: row.lead_email ?? null,
    leadCcEmail: row.lead_cc_email ?? null,
    logoFileId: numberOrNull(row.logo_file_id),
    quoteHeaderFileId: numberOrNull(row.quote_header_file_id),
    volumeUom: row.parameter_organization_volume_uom_idToparameter?.code ?? null,
    furnitureVolumeUom: row.parameter_organization_furniture_volume_uom_idToparameter?.code ?? null,
    currencyId: row.base_currency_id ?? null,
    timeZoneId: row.time_zone_id ?? null,
    quoteReviewMinLimit: numberOrNull(row.quote_review_min_limit),
    workloadMin: numberOrNull(row.workload_min),
    workloadMax: numberOrNull(row.workload_max),
    jobConfirmMinHours: row.job_confirm_min_hours ?? null,
    employeeCostPerHour: numberOrNull(row.employee_cost_per_hour),
    vehicleCostPerTrip: numberOrNull(row.vehicle_cost_per_trip),
    employeeWorkingHours: numberOrNull(row.employee_working_hours),
    vatPercent: numberOrNull(row.vat_percent),
    profitPercent: numberOrNull(row.profit_percent),
    displayColor: row.display_color ?? null,
    invoiceMaxDelayDays: row.invoice_max_delay_days ?? null,
    address: toAddressDto(row.address),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const fail = (field, message, Error = BadRequestError) => {
  throw new Error(message, [{ field, message }]);
};

export function createOrganizationService({ organizationRepository: repository }) {
  // A super admin manages every organization (whatever is picked in the menu); others only theirs.
  const scopeOf = (actor) => (isSuperAdmin(actor) ? null : orgScopeOf(actor));

  async function getExisting(id, actor) {
    const row = await repository.findById(id, scopeOf(actor));
    if (!row) throw new NotFoundError('Organization not found');
    return row;
  }

  /** Checks lookups and turns dropdown codes into ids. */
  async function resolve(input, existing) {
    const data = { ...input };
    if (input.volumeUom !== undefined)
      data.volumeUomId = await requireParameter(
        repository,
        'VOLUME_UOM',
        input.volumeUom,
        'volumeUom',
      );
    if (input.furnitureVolumeUom !== undefined)
      data.furnitureVolumeUomId = await requireParameter(
        repository,
        'VOLUME_UOM',
        input.furnitureVolumeUom,
        'furnitureVolumeUom',
      );
    if (input.currencyId && !(await repository.currencyExists(input.currencyId)))
      fail('currencyId', 'Select a valid currency');
    if (input.timeZoneId && !(await repository.timeZoneExists(input.timeZoneId)))
      fail('timeZoneId', 'Select a valid time zone');
    for (const field of ['logoFileId', 'quoteHeaderFileId']) {
      if (input[field] && !(await repository.fileExists(input[field])))
        fail(field, 'Upload the file again');
    }
    const min = input.workloadMin ?? numberOrNull(existing?.workload_min);
    const max = input.workloadMax ?? numberOrNull(existing?.workload_max);
    if (min !== null && max !== null && min > max)
      fail('workloadMax', 'The maximum cannot be below the minimum');
    if (input.contactPerson !== undefined) {
      data.contactIds = {
        userTypeId: await requireParameter(repository, 'USER_TYPE', 'ORG_CONTACT', 'contactPerson'),
        statusId: await requireParameter(repository, 'ACCOUNT_STATUS', 'ACTIVE', 'contactPerson'),
      };
    }
    data.address = await resolveAddress(repository, input.address, 'OFFICE');
    return data;
  }

  return {
    async getById(id, actor) {
      return toOrganizationDto(await getExisting(id, actor));
    },

    async create(input, actor) {
      if (await repository.codeExists(input.organizationCode))
        fail('organizationCode', 'This short name is already in use', ConflictError);
      const row = await repository.create(await resolve(input), actor.uid);
      return toOrganizationDto(row);
    },

    async update(id, input, actor) {
      const existing = await getExisting(id, actor);
      if (
        !isSuperAdmin(actor) &&
        (input.isHeadOffice !== undefined || input.isActive !== undefined)
      ) {
        throw new ForbiddenError(
          'Only a super administrator can change the head office or active status',
        );
      }
      const row = await repository.update(id, await resolve(input, existing), actor.uid);
      return toOrganizationDto(row);
    },
  };
}
