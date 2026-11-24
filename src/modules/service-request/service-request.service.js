import { resolveAddress, toAddressDto } from '../../utils/address.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors.js';
import { toMeta, toPagination } from '../../utils/pagination.js';
import { CLOSED_STATUSES, REQUEST_STAGE, REQUEST_STATUS } from '../../utils/requestStatus.js';
import { chosenOrganizationOf, orgScopeOf } from '../../utils/scope.js';

const dateText = (value) => (value ? value.toISOString().slice(0, 10) : null);
const timeText = (value) => (value ? value.toISOString().slice(11, 16) : null);
const fullName = (profile) => [profile.name, profile.last_name].filter(Boolean).join(' ');

/** Which optional parts of the form each service group uses. */
const GROUP_RULES = {
  HOME_RELOCATION: { residence: true, addresses: true },
  OFFICE_RELOCATION: { addresses: true },
  INTERNATIONAL_RELOCATION: { residence: true, addresses: true, international: true },
  FURNITURE_INSTALLATION: { addresses: true },
  STORAGE_SERVICES: { storage: true },
};

export function toServiceRequestDto(context, row) {
  const parameter = (id) => {
    const found = id == null ? null : context.parameters.get(id);
    return found ? { id: found.parameter_id, code: found.code, label: found.label } : null;
  };
  const customer = context.customers.get(row.customer_id);
  const executive = row.executive_profile_id && context.executives.get(row.executive_profile_id);
  const group = context.groups.get(row.service_group_id);
  const status = context.parameters.get(row.status_id);
  const stage = context.parameters.get(row.stage_id);
  const contact = row.customer_profile_id && context.executives.get(row.customer_profile_id);
  const contactedBy =
    row.contacted_by_profile_id && context.executives.get(row.contacted_by_profile_id);
  const lastLog = context.lastLogs?.get(row.service_request_id);
  const lastByProfile = lastLog?.created_by && context.userProfiles.get(lastLog.created_by);
  const lastBy = lastByProfile && context.executives.get(lastByProfile);
  return {
    id: row.public_id,
    requestNo: row.request_no,
    organizationId: Number(row.organization_id),
    customerId: customer?.public_id ?? null,
    customerName: customer ? (customer.customer_name ?? customer.customer_code ?? '') : '',
    customerProfileId: contact ? contact.public_id : null,
    customerProfileName: contact ? fullName(contact) : null,
    // The request's contact person's number, else the customer's main number.
    customerPhone:
      contact?.contact_no ?? customer?.customer_profile?.[0]?.profile.contact_no ?? null,
    executiveId: executive ? executive.public_id : null,
    executiveName: executive ? fullName(executive) : null,
    serviceGroupId: row.service_group_id,
    serviceGroupCode: group?.code ?? null,
    serviceGroupLabel: group?.name ?? null,
    serviceGroupFileId: group?.file_id == null ? null : Number(group.file_id),
    serviceTypeId: row.service_type_id,
    serviceTypeName: context.serviceTypes.get(row.service_type_id)?.name ?? null,
    internationalServiceTypeId: row.international_service_type_id,
    title: row.title,
    residenceTypeId: row.residence_type_id,
    moveDate: dateText(row.move_date),
    volumeCbm: row.volume_cbm == null ? null : Number(row.volume_cbm),
    fromAddress: toAddressDto(context.addresses.get(row.from_address_id)),
    toAddress: toAddressDto(context.addresses.get(row.to_address_id)),
    enquiryChannelId: row.enquiry_channel_id,
    referralId: row.referral_id,
    surveyRequired: row.survey_required,
    surveyTypeId: row.survey_type_id,
    surveyDate: dateText(row.survey_date),
    surveyTime: timeText(row.survey_time),
    storageStartDate: dateText(row.storage_start_date),
    storageEndDate: dateText(row.storage_end_date),
    pickAndPack: row.pick_and_pack,
    remarks: row.remarks,
    // Stage and status are given by parameter value.
    stageValue: stage?.parameter_value ?? null,
    stageLabel: stage?.label ?? null,
    statusValue: status?.parameter_value ?? null,
    statusLabel: status?.label ?? null,
    contactedById: contactedBy ? contactedBy.public_id : null,
    contactedByName: contactedBy ? fullName(contactedBy) : null,
    contactedAt: row.contacted_at ?? null,
    dropReasonId: row.drop_reason_id ?? null,
    dropReasonLabel: parameter(row.drop_reason_id)?.label ?? null,
    dropRemark: row.drop_remark ?? null,
    droppedAt: row.dropped_at ?? null,
    lastAction: lastLog
      ? {
          action: lastLog.action,
          at: lastLog.created_at,
          byName: lastBy ? fullName(lastBy) : null,
          remarks: lastLog.remarks,
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** "2026-11-24" -> "24/11/2026". */
const dayText = (value) => (value ? value.split('-').reverse().join('/') : null);
const addressText = (address) =>
  address
    ? [address.addressText, address.areaName, address.cityName, address.countryName]
        .filter(Boolean)
        .join(', ')
    : null;

/** The request as the person sees it on the form: field label -> shown text. */
function describe(context, row) {
  const dto = toServiceRequestDto(context, row);
  const label = (id) => (id == null ? null : (context.parameters.get(id)?.label ?? null));
  return {
    Organization: context.organizations?.get(row.organization_id) ?? null,
    Customer: dto.customerName || null,
    'Contact person': dto.customerProfileName,
    Executive: dto.executiveName,
    'Service group': dto.serviceGroupLabel,
    Service: dto.serviceTypeName,
    'International service type': label(row.international_service_type_id),
    Title: dto.title,
    'Residence type': label(row.residence_type_id),
    'Move date': dayText(dto.moveDate),
    'Volume (CBM)': dto.volumeCbm == null ? null : String(dto.volumeCbm),
    'From address': addressText(dto.fromAddress),
    'To address': addressText(dto.toAddress),
    'Enquiry channel': label(row.enquiry_channel_id),
    'How did you find us': label(row.referral_id),
    'Survey required': dto.surveyRequired ? 'Yes' : 'No',
    'Survey type': label(row.survey_type_id),
    'Survey date': dayText(dto.surveyDate),
    'Survey time': dto.surveyTime,
    'Storage start date': dayText(dto.storageStartDate),
    'Storage end date': dayText(dto.storageEndDate),
    'Pick and pack': dto.pickAndPack ? 'Yes' : 'No',
    Remarks: dto.remarks,
  };
}

const oneLine = (value) =>
  value == null || value === '' ? '—' : String(value).replace(/\s+/g, ' ');

/** One line per changed field: "Title: Old → New" (at most 2000 characters). */
function changesBetween(before, after) {
  const lines = Object.keys(after)
    .filter((key) => (before[key] ?? null) !== (after[key] ?? null))
    // Values are kept on one line each (remarks may have line breaks).
    .map((key) => `${key}: ${oneLine(before[key])} → ${oneLine(after[key])}`);
  const text = lines.join('\n');
  return text.length > 2000 ? `${text.slice(0, 1997)}...` : text;
}

const fail = (field, message) => {
  throw new ValidationError([{ field, message }]);
};

export function createServiceRequestService({ serviceRequestRepository: repository }) {
  async function getExisting(id, actor) {
    const found = await repository.findByPublicId(id, orgScopeOf(actor));
    if (!found) throw new NotFoundError('Service request not found');
    return found;
  }

  async function checkParameter(id, typeCode, field) {
    if (id === undefined || id === null) return null;
    const found = await repository.findParameterOfType(id, typeCode);
    if (!found) fail(field, 'Choose a valid value');
    return found;
  }

  /** Validates the form against the chosen service group and resolves the ids it points at. */
  async function resolveInput(input, actor, current) {
    // The office picked on the form (one the person works in), else the active one.
    const organizationId =
      chosenOrganizationOf(actor, input.organizationId) ?? current?.organization_id ?? null;
    if (organizationId === null) fail('organizationId', 'Choose the office for this request');
    if (!(await repository.organizationExists(organizationId)))
      fail('organizationId', 'Choose a valid office');

    const customer = await repository.findCustomerByPublicId(input.customerId);
    if (!customer) fail('customerId', 'Choose a valid customer');
    // A company picks one of its contact persons; an individual is their own (main) contact.
    const isCompany = customer.customer_kind === 'COMPANY';
    if (isCompany && !input.customerProfileId)
      fail('customerProfileId', 'Select the contact person');
    const customerProfileId = await repository.findCustomerProfile(
      customer.customer_id,
      isCompany ? input.customerProfileId : null,
    );
    if (isCompany && !customerProfileId)
      fail('customerProfileId', 'Choose a contact person of this customer');
    // Every request is handled by an executive of its organization.
    if (!input.executiveId) fail('executiveId', 'Select the executive');
    const executive = await repository.findExecutiveByPublicId(input.executiveId, organizationId);
    if (!executive) fail('executiveId', 'Choose an executive of this organization');

    const group = await repository.findServiceGroup(input.serviceGroupId);
    if (!group) fail('serviceGroupId', 'Choose a valid service group');
    const rules = GROUP_RULES[group.code] ?? {};
    const serviceType = await repository.findServiceType(input.serviceTypeId);
    if (!serviceType || serviceType.service_group_id !== group.service_group_id)
      fail('serviceTypeId', 'Choose a service of this service group');

    if (rules.international)
      await checkParameter(
        input.internationalServiceTypeId,
        'INTERNATIONAL_SERVICE_TYPE',
        'internationalServiceTypeId',
      );
    if (rules.residence)
      await checkParameter(input.residenceTypeId, 'RESIDENCE_TYPE', 'residenceTypeId');
    await checkParameter(input.enquiryChannelId, 'ENQUIRY_CHANNEL', 'enquiryChannelId');
    await checkParameter(input.referralId, 'REFERRAL', 'referralId');

    // Survey: when (date and time) and how (survey type).
    if (input.surveyRequired) {
      if (!input.surveyDate) fail('surveyDate', 'Enter the survey date');
      if (!input.surveyTime) fail('surveyTime', 'Enter the survey time');
      if (!input.surveyTypeId) fail('surveyTypeId', 'Select the survey type');
      await checkParameter(input.surveyTypeId, 'SURVEY_TYPE', 'surveyTypeId');
    }

    if (rules.storage) {
      if (!input.storageStartDate) fail('storageStartDate', 'Enter the storage start date');
      if (input.storageEndDate && input.storageEndDate < input.storageStartDate)
        fail('storageEndDate', 'The end date cannot be before the start date');
    }

    // Storage with pick and pack collects the goods from one pick-up address.
    const pickUp = rules.storage && input.pickAndPack;
    if (pickUp && !input.fromAddress) fail('fromAddress', 'Enter the pick-up address');
    const fromAddress =
      rules.addresses || pickUp
        ? await resolveAddress(repository, input.fromAddress, 'PICKUP')
        : undefined;
    const toAddress = rules.addresses
      ? await resolveAddress(repository, input.toAddress, 'DELIVERY')
      : undefined;

    return {
      title: input.title,
      remarks: input.remarks,
      moveDate: input.moveDate,
      volumeCbm: input.volumeCbm,
      enquiryChannelId: input.enquiryChannelId,
      referralId: input.referralId,
      statusId: input.statusId,
      surveyRequired: Boolean(input.surveyRequired),
      organizationId,
      customerId: customer.customer_id,
      customerProfileId,
      executiveProfileId: executive?.profile_id,
      serviceGroupId: group.service_group_id,
      serviceTypeId: serviceType.service_type_id,
      internationalServiceTypeId: rules.international ? input.internationalServiceTypeId : null,
      residenceTypeId: rules.residence ? input.residenceTypeId : null,
      surveyTypeId: input.surveyRequired ? input.surveyTypeId : null,
      surveyDate: input.surveyRequired ? input.surveyDate : null,
      surveyTime: input.surveyRequired ? input.surveyTime : null,
      storageStartDate: rules.storage ? input.storageStartDate : null,
      storageEndDate: rules.storage ? input.storageEndDate : null,
      pickAndPack: rules.storage ? Boolean(input.pickAndPack) : false,
      fromAddress,
      toAddress,
    };
  }

  /** Parameter id of a status / stage, from its parameter value. */
  async function statusIdOf(value) {
    const found = await repository.findParameterByValue('REQUEST_STATUS', value);
    return found?.parameter_id;
  }
  async function stageIdOf(value) {
    const found = await repository.findParameterByValue('REQUEST_STAGE', value);
    return found?.parameter_id;
  }

  /** The request, if it is still open (and, with `allowed`, in one of those statuses). */
  async function getOpen(id, actor, allowed) {
    const found = await getExisting(id, actor);
    const status = found.parameters.get(found.row.status_id);
    if (CLOSED_STATUSES.includes(status?.parameter_value))
      throw new ConflictError(`This request is ${status.label.toLowerCase()} and is closed`);
    if (allowed && !allowed.includes(status?.parameter_value))
      throw new ConflictError(`A request in "${status?.label}" cannot be changed this way`);
    return found;
  }

  /**
   * Stage and status after saving, from the form's action:
   * - SAVE: an enquiry is Scheduled when a survey is required, else Assigned. A contacted
   *   enquiry, or a request already past the enquiry stage, keeps its status.
   * - START_SURVEY: needs a survey; moves to Survey New.
   * - START_QUOTE: only without a survey; moves to Quote New.
   */
  function nextStep(input, current) {
    const action = input.action ?? 'SAVE';
    const inEnquiry = !current || current.stage === REQUEST_STAGE.ENQUIRY;
    if (action !== 'SAVE' && !inEnquiry)
      throw new ConflictError('Only an enquiry can start a survey or a quote');
    if (action === 'START_SURVEY') {
      if (!input.surveyRequired)
        fail('surveyRequired', 'Turn on "Survey required" to start a survey');
      return { stage: REQUEST_STAGE.SURVEY, status: REQUEST_STATUS.SURVEY_NEW };
    }
    if (action === 'START_QUOTE') {
      if (input.surveyRequired)
        fail('surveyRequired', 'A request that needs a survey starts the survey first');
      return { stage: REQUEST_STAGE.QUOTE, status: REQUEST_STATUS.QUOTE_NEW };
    }
    if (!inEnquiry || current?.status === REQUEST_STATUS.CONTACTED) return current;
    return {
      stage: REQUEST_STAGE.ENQUIRY,
      status: input.surveyRequired ? REQUEST_STATUS.ENQUIRY_SCHEDULED : REQUEST_STATUS.ASSIGNED,
    };
  }

  /**
   * A planned survey must not be in the past (checked when it is new or moved) and must be on
   * or before the move date.
   */
  function checkSurveyPlan(input, current) {
    if (!input.surveyRequired || !input.surveyDate || !input.surveyTime) return;
    const changed =
      !current ||
      dateText(current.survey_date) !== input.surveyDate ||
      timeText(current.survey_time) !== input.surveyTime;
    // Times are entered in the organization's local time; allow a day for time zones.
    const planned = new Date(`${input.surveyDate}T${input.surveyTime}:00Z`);
    if (changed && planned.getTime() < Date.now() - 86400000)
      fail('surveyDate', 'The survey cannot be in the past');
    if (input.moveDate && input.surveyDate > input.moveDate)
      fail('surveyDate', 'The survey date must be on or before the move date');
  }

  /** Must not be in the future (a minute's leeway for clocks). */
  function checkNotFuture(value, field) {
    if (value.getTime() > Date.now() + 60000) fail(field, 'This cannot be in the future');
  }
  /** `at` is on or before the given day (a date column), allowing for time zones. */
  const onOrBefore = (at, day) => at.getTime() < day.getTime() + 86400000 + 14 * 3600000;

  return {
    async list(query, actor) {
      const pagination = toPagination(query);
      const result = await repository.list({
        ...query,
        organizationId: orgScopeOf(actor),
        executiveUserId: actor.role === 'EXECUTIVE' ? actor.uid : undefined,
        skip: pagination.skip,
        take: pagination.take,
      });
      return {
        items: result.rows.map((row) => toServiceRequestDto(result, row)),
        meta: toMeta(pagination, result.total),
      };
    },

    async options(actor, query = {}) {
      // Executives of the office picked on the form, else of the active organization.
      const officeId = chosenOrganizationOf(actor, query.organizationId);
      const [executives, serviceTypes, serviceGroups, place] = await Promise.all([
        repository.listExecutives(officeId),
        repository.listServiceTypes(),
        repository.listServiceGroups(),
        officeId ? repository.findOrganizationPlace(officeId) : null,
      ]);
      return {
        // Local moves (all but international) stay inside the organization's country.
        countryId: place?.countryId ?? null,
        cityId: place?.cityId ?? null,
        serviceGroups: serviceGroups.map((row) => ({
          id: row.service_group_id,
          code: row.code,
          name: row.name,
          fileId: row.file_id == null ? null : Number(row.file_id),
        })),
        executives: executives.map((profile) => ({
          id: profile.public_id,
          name: fullName(profile),
        })),
        serviceTypes: serviceTypes.map((row) => ({
          id: row.service_type_id,
          serviceGroupId: row.service_group_id,
          name: row.name,
        })),
      };
    },

    async getById(id, actor) {
      const found = await getExisting(id, actor);
      return toServiceRequestDto(found, found.row);
    },

    // The form sends one action; the stage and status come from it (see nextStep).
    async create(input, actor) {
      const data = await resolveInput(input, actor, null);
      checkSurveyPlan(input, null);
      const step = nextStep(input, null);
      data.statusId = await statusIdOf(step.status);
      data.stageId = await stageIdOf(step.stage);
      const publicId = await repository.create(data, actor.uid);
      return this.getById(publicId, actor);
    },

    async update(id, input, actor) {
      const found = await getOpen(id, actor);
      const data = await resolveInput(input, actor, found.row);
      const current = {
        stage: found.parameters.get(found.row.stage_id)?.parameter_value,
        status: found.parameters.get(found.row.status_id)?.parameter_value,
      };
      checkSurveyPlan(input, found.row);
      const step = nextStep(input, current);
      data.statusId = await statusIdOf(step.status);
      data.stageId = await stageIdOf(step.stage);
      await repository.update(id, data, found.row, actor.uid);
      // The log keeps what changed, field by field, and any status change.
      const saved = await getExisting(id, actor);
      const changes = changesBetween(describe(found, found.row), describe(saved, saved.row));
      if (changes || data.statusId !== found.row.status_id)
        await repository.addLog(found.row, 'UPDATED', changes, actor.uid, data.statusId);
      return toServiceRequestDto(saved, saved.row);
    },

    /** Everything that happened to the request, newest first. */
    async logs(id, actor) {
      const found = await getExisting(id, actor);
      const { row } = found;
      const { logs, users, statuses } = await repository.listLogs(row.service_request_id);
      const dto = toServiceRequestDto(found, row);
      return logs.map((log) => {
        const by = log.created_by && users.get(log.created_by);
        const details = [];
        if (log.action === 'CREATED' && dto.executiveName)
          details.push(`Assigned to ${dto.executiveName}`);
        if (log.action === 'CONTACTED' && dto.contactedByName)
          details.push(`Contacted by ${dto.contactedByName}`);
        if (log.action === 'DROPPED' && dto.dropReasonLabel)
          details.push(`Reason: ${dto.dropReasonLabel}`);
        return {
          id: Number(log.log_id),
          action: log.action,
          at: log.created_at,
          // When the customer was actually contacted (may be earlier than the entry).
          contactedAt: log.action === 'CONTACTED' ? dto.contactedAt : null,
          byName: by ? fullName(by) : null,
          fromStatus: statuses.get(log.from_status_id) ?? null,
          toStatus: statuses.get(log.to_status_id) ?? null,
          details,
          remarks: log.remarks,
        };
      });
    },

    /** Assigned -> Contacted: who called the customer and when. */
    async markContacted(id, input, actor) {
      const found = await getOpen(id, actor, [
        REQUEST_STATUS.ASSIGNED,
        REQUEST_STATUS.ENQUIRY_SCHEDULED,
      ]);
      const { row } = found;

      // An executive is always recorded as themselves.
      let contactedById;
      if (actor.role === 'EXECUTIVE') {
        contactedById = await repository.profileIdOfUser(actor.uid);
      } else {
        if (!input.contactedById) fail('contactedById', 'Select who contacted the customer');
        const person = await repository.findExecutiveByPublicId(
          input.contactedById,
          row.organization_id,
        );
        if (!person) fail('contactedById', 'Choose an executive of this organization');
        contactedById = person.profile_id;
      }

      const at = new Date(input.contactedAt);
      if (Number.isNaN(at.getTime())) fail('contactedAt', 'Enter the contacted date and time');
      checkNotFuture(at, 'contactedAt');
      if (row.move_date && !onOrBefore(at, row.move_date))
        fail('contactedAt', 'The contacted date cannot be after the move date');
      if (row.survey_required && row.survey_date && !onOrBefore(at, row.survey_date))
        fail('contactedAt', 'The survey date cannot be before the contacted date');

      await repository.changeStatus(
        row,
        {
          action: 'CONTACTED',
          statusId: await statusIdOf(REQUEST_STATUS.CONTACTED),
          columns: { contacted_by_profile_id: contactedById, contacted_at: at },
          remarks: input.remarks,
        },
        actor.uid,
      );
      return this.getById(id, actor);
    },

    /** Assigned or Contacted -> Dropped (final). Admins, or the request's own executive. */
    async drop(id, input, actor) {
      const found = await getOpen(id, actor, [
        REQUEST_STATUS.ASSIGNED,
        REQUEST_STATUS.ENQUIRY_SCHEDULED,
        REQUEST_STATUS.CONTACTED,
      ]);
      const { row } = found;
      if (!['SUPERADMIN', 'ADMIN'].includes(actor.role)) {
        const me = await repository.profileIdOfUser(actor.uid);
        if (!me || me !== row.executive_profile_id)
          throw new ForbiddenError('Only an admin or the assigned executive can drop a request');
      }
      if (!input.dropReasonId) fail('dropReasonId', 'Select the drop reason');
      await checkParameter(input.dropReasonId, 'ENQUIRY_DROP_REASON', 'dropReasonId');
      const remark = input.dropRemark?.trim();
      if (!remark) fail('dropRemark', 'Enter the remarks');

      await repository.changeStatus(
        row,
        {
          action: 'DROPPED',
          statusId: await statusIdOf(REQUEST_STATUS.DROPPED),
          columns: {
            drop_reason_id: input.dropReasonId,
            drop_remark: remark,
            dropped_at: new Date(),
            dropped_by: BigInt(actor.uid),
          },
          remarks: remark,
        },
        actor.uid,
      );
      return this.getById(id, actor);
    },

    async remove(id, actor) {
      await getOpen(id, actor);
      await repository.softDelete(id, actor.uid);
    },
  };
}
