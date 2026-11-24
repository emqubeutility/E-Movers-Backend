import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors.js';
import {
  CLOSED_STATUSES,
  CFT_PER_CBM,
  REQUEST_STAGE,
  REQUEST_STATUS,
} from '../../utils/requestStatus.js';
import { orgScopeOf } from '../../utils/scope.js';
import { toServiceRequestDto } from '../service-request/service-request.service.js';

const fail = (field, message) => {
  throw new ValidationError([{ field, message }]);
};
const fullName = (profile) =>
  profile ? [profile.name, profile.last_name].filter(Boolean).join(' ') : null;
const num = (value) => (value == null ? null : Number(value));
/** `at` is on or before the given day (a date column), allowing for time zones. */
const onOrBefore = (at, day) => at.getTime() < day.getTime() + 86400000 + 14 * 3600000;
const oneLine = (value) =>
  value == null || value === '' ? '—' : String(value).replace(/\s+/g, ' ');

/** The survey as people see it: field label -> shown text (for the change log). */
function describe(survey, names, labels) {
  const cbm = (cft) => (cft == null ? null : `${(Number(cft) / CFT_PER_CBM).toFixed(3)} CBM`);
  return {
    Executive: names.executive,
    'Surveyed by': fullName(names.profiles.get(survey?.surveyed_by_profile_id)),
    'Survey done at': survey?.surveyed_at ? survey.surveyed_at.toISOString() : null,
    'Scanned survey sheet': survey?.scan_file_id ? 'Uploaded' : null,
    'Time to complete (hours)': num(survey?.time_to_complete_hours),
    'Storage days': survey?.storage_days ?? null,
    'No. of days': survey?.no_of_days ?? null,
    'People required': survey?.people_required ?? null,
    'People description': survey?.people_description ?? null,
    'Packing material remarks': survey?.packing_material_remarks ?? null,
    'Insurance required': survey?.insurance_required ? 'Yes' : 'No',
    'Insurance value': num(survey?.insurance_value),
    'Estimated volume': cbm(survey?.estimated_volume_cft),
    // "Safe (2 safes, 1st floor), Stair Carry".
    'Special requisites':
      (survey?.survey_special_requisite ?? [])
        .map((item) =>
          item.remark
            ? `${labels.get(item.requisite_id)} (${item.remark})`
            : labels.get(item.requisite_id),
        )
        .sort()
        .join(', ') || null,
    Remarks: survey?.remarks ?? null,
    'Amount quoted to customer': num(survey?.amount_quoted),
    'Quote instructions': survey?.quote_instruction ?? null,
  };
}

function changesBetween(before, after) {
  const text = Object.keys(after)
    .filter((key) => String(before[key] ?? '') !== String(after[key] ?? ''))
    .map((key) => `${key}: ${oneLine(before[key])} → ${oneLine(after[key])}`)
    .join('\n');
  return text.length > 2000 ? `${text.slice(0, 1997)}...` : text;
}

export function createSurveyService({ serviceRequestRepository: requests, surveyRepository }) {
  const valueOf = (found, id) => found.parameters.get(id)?.parameter_value;

  /** The request (in scope) and its survey; the request must be in the survey stage. */
  async function load(id, actor) {
    const found = await requests.findByPublicId(id, orgScopeOf(actor));
    if (!found) throw new NotFoundError('Service request not found');
    if (valueOf(found, found.row.stage_id) !== REQUEST_STAGE.SURVEY)
      throw new ConflictError('This request has not started its survey');
    const survey = await surveyRepository.findByRequest(found.row.service_request_id);
    return { found, survey };
  }

  /** Like load, but the survey must still be open (and in one of `allowed`, if given). */
  async function loadOpen(id, actor, allowed) {
    const loaded = await load(id, actor);
    const { found } = loaded;
    const status = found.parameters.get(found.row.status_id);
    if (CLOSED_STATUSES.includes(status?.parameter_value))
      throw new ConflictError(`This request is ${status.label.toLowerCase()} and is closed`);
    if (allowed && !allowed.includes(status?.parameter_value))
      throw new ConflictError(`A request in "${status?.label}" cannot be changed this way`);
    return loaded;
  }

  async function statusIdOf(value) {
    const found = await requests.findParameterByValue('REQUEST_STATUS', value);
    return found?.parameter_id;
  }

  /** A staff member of the request's organization (executive, surveyor); returns profile id. */
  async function staffOf(publicId, organizationId, field, label) {
    if (!publicId) fail(field, `Select the ${label}`);
    const person = await requests.findExecutiveByPublicId(publicId, organizationId);
    if (!person) fail(field, `Choose a ${label} of this organization`);
    return person.profile_id;
  }

  /** When the survey was done: not in the future and not after the move date. */
  function checkSurveyedAt(at, row) {
    if (Number.isNaN(at.getTime())) fail('surveyedAt', 'Enter the survey date and time');
    if (at.getTime() > Date.now() + 60000) fail('surveyedAt', 'The survey cannot be in the future');
    if (row.move_date && !onOrBefore(at, row.move_date))
      fail('surveyedAt', 'The survey date cannot be after the move date');
  }

  async function toDto(found, survey) {
    const { row } = found;
    const [names, labels, units] = await Promise.all([
      surveyRepository.profileNames([survey?.surveyed_by_profile_id]),
      surveyRepository.parameterLabels([survey?.drop_reason_id]),
      surveyRepository.volumeUnits(row.organization_id),
    ]);
    const surveyedBy = names.get(survey?.surveyed_by_profile_id);
    return {
      request: toServiceRequestDto(found, row),
      volumeUnit: units.volumeUnit,
      furnitureUnit: units.furnitureUnit,
      survey: {
        id: survey?.public_id ?? null,
        surveyedById: surveyedBy?.public_id ?? null,
        surveyedByName: fullName(surveyedBy),
        surveyedAt: survey?.surveyed_at ?? null,
        scanFileId: survey?.scan_file_id == null ? null : Number(survey.scan_file_id),
        timeToCompleteHours: num(survey?.time_to_complete_hours),
        storageDays: survey?.storage_days ?? null,
        noOfDays: survey?.no_of_days ?? null,
        peopleRequired: survey?.people_required ?? null,
        peopleDescription: survey?.people_description ?? null,
        packingMaterialRemarks: survey?.packing_material_remarks ?? null,
        insuranceRequired: survey?.insurance_required ?? false,
        insuranceValue: num(survey?.insurance_value),
        remarks: survey?.remarks ?? null,
        amountQuoted: num(survey?.amount_quoted),
        quoteInstruction: survey?.quote_instruction ?? null,
        computedVolumeCft: num(survey?.computed_volume_cft),
        estimatedVolumeCft: num(survey?.estimated_volume_cft),
        versionNo: survey?.version_no ?? 0,
        completedAt: survey?.completed_at ?? null,
        dropReasonId: survey?.drop_reason_id ?? null,
        dropReasonLabel: labels.get(survey?.drop_reason_id) ?? null,
        dropRemark: survey?.drop_remark ?? null,
        droppedAt: survey?.dropped_at ?? null,
        requisites: (survey?.survey_special_requisite ?? []).map((item) => ({
          requisiteId: item.requisite_id,
          remark: item.remark,
        })),
      },
    };
  }

  /** Names and labels the change log needs for a survey version. */
  async function namesFor(found, survey) {
    const executive = found.executives.get(found.row.executive_profile_id);
    return {
      executive: fullName(executive),
      profiles: await surveyRepository.profileNames([survey?.surveyed_by_profile_id]),
    };
  }

  return {
    async get(id, actor) {
      const { found, survey } = await load(id, actor);
      return toDto(found, survey);
    },

    /** Saves the survey details. The status changes only through complete / drop. */
    async save(id, input, actor) {
      const { found, survey } = await loadOpen(id, actor);
      const { row } = found;
      const executiveProfileId = await staffOf(
        input.executiveId,
        row.organization_id,
        'executiveId',
        'executive',
      );
      const surveyedByProfileId = await staffOf(
        input.surveyedById,
        row.organization_id,
        'surveyedById',
        'surveyor',
      );
      let surveyedAt = null;
      if (input.surveyedAt) {
        surveyedAt = new Date(input.surveyedAt);
        checkSurveyedAt(surveyedAt, row);
      }
      if (input.insuranceRequired && !input.insuranceValue)
        fail('insuranceValue', 'Enter the insurance value');
      // One entry per requisite (the last note wins if one is sent twice).
      const requisites = [
        ...new Map(
          (input.requisites ?? []).map((item) => [
            item.requisiteId,
            { requisiteId: item.requisiteId, remark: item.remark?.trim() || null },
          ]),
        ).values(),
      ];
      const requisiteIds = requisites.map((item) => item.requisiteId);
      if (!(await surveyRepository.parametersOfType(requisiteIds, 'SPECIAL_REQUISITE')))
        fail('requisites', 'Choose valid special requisites');
      if (input.scanFileId && !(await surveyRepository.fileExists(input.scanFileId)))
        fail('scanFileId', 'Upload the survey sheet again');

      const data = { ...input, executiveProfileId, surveyedByProfileId, surveyedAt, requisites };

      // What changed, for the timeline.
      const after = {
        ...survey,
        surveyed_by_profile_id: surveyedByProfileId,
        surveyed_at: surveyedAt,
        scan_file_id: input.scanFileId ?? null,
        time_to_complete_hours: input.timeToCompleteHours ?? null,
        storage_days: input.storageDays ?? null,
        no_of_days: input.noOfDays ?? null,
        people_required: input.peopleRequired ?? null,
        people_description: input.peopleDescription || null,
        packing_material_remarks: input.packingMaterialRemarks || null,
        insurance_required: Boolean(input.insuranceRequired),
        insurance_value: input.insuranceRequired ? (input.insuranceValue ?? null) : null,
        estimated_volume_cft: input.estimatedVolumeCft ?? null,
        survey_special_requisite: requisites.map((item) => ({
          requisite_id: item.requisiteId,
          remark: item.remark,
        })),
        remarks: input.remarks || null,
        amount_quoted: input.amountQuoted ?? null,
        quote_instruction: input.quoteInstruction || null,
      };
      const labels = await surveyRepository.parameterLabels([
        ...requisiteIds,
        ...(survey?.survey_special_requisite ?? []).map((item) => item.requisite_id),
      ]);
      const beforeNames = await namesFor(found, survey);
      const afterNames = {
        executive:
          executiveProfileId === row.executive_profile_id
            ? beforeNames.executive
            : fullName(
                (await surveyRepository.profileNames([executiveProfileId])).get(executiveProfileId),
              ),
        profiles: await surveyRepository.profileNames([surveyedByProfileId]),
      };
      const changes = changesBetween(
        describe(survey, beforeNames, labels),
        describe(after, afterNames, labels),
      );

      await surveyRepository.save(row, data, actor.uid, changes);
      return this.get(id, actor);
    },

    /** Survey New -> Survey Completed: who surveyed and when. */
    async complete(id, input, actor) {
      const { found } = await loadOpen(id, actor, [REQUEST_STATUS.SURVEY_NEW]);
      const { row } = found;
      const surveyedByProfileId = await staffOf(
        input.surveyedById,
        row.organization_id,
        'surveyedById',
        'surveyor',
      );
      const at = new Date(input.surveyedAt);
      checkSurveyedAt(at, row);
      const names = await surveyRepository.profileNames([surveyedByProfileId]);
      const by = fullName(names.get(surveyedByProfileId));
      await surveyRepository.changeStatus(
        row,
        {
          action: 'SURVEY_COMPLETED',
          statusId: await statusIdOf(REQUEST_STATUS.SURVEY_COMPLETED),
          columns: {
            surveyed_by_profile_id: surveyedByProfileId,
            surveyed_at: at,
            completed_at: new Date(),
            completed_by: BigInt(actor.uid),
          },
          remarks: [`Surveyed by ${by}`, input.remarks?.trim()].filter(Boolean).join('\n'),
        },
        actor.uid,
      );
      return this.get(id, actor);
    },

    /** Survey New or Completed -> Survey Dropped (final). Admins, or the request's executive. */
    async drop(id, input, actor) {
      const { found } = await loadOpen(id, actor, [
        REQUEST_STATUS.SURVEY_NEW,
        REQUEST_STATUS.SURVEY_COMPLETED,
      ]);
      const { row } = found;
      if (!['SUPERADMIN', 'ADMIN'].includes(actor.role)) {
        const me = await requests.profileIdOfUser(actor.uid);
        if (!me || me !== row.executive_profile_id)
          throw new ForbiddenError('Only an admin or the assigned executive can drop a survey');
      }
      if (!(await surveyRepository.parametersOfType([input.dropReasonId], 'SURVEY_DROP_REASON')))
        fail('dropReasonId', 'Select the drop reason');
      const remark = input.dropRemark?.trim();
      if (!remark) fail('dropRemark', 'Enter the remarks');
      const reason = (await surveyRepository.parameterLabels([input.dropReasonId])).get(
        input.dropReasonId,
      );
      await surveyRepository.changeStatus(
        row,
        {
          action: 'SURVEY_DROPPED',
          statusId: await statusIdOf(REQUEST_STATUS.SURVEY_DROPPED),
          columns: {
            drop_reason_id: input.dropReasonId,
            drop_remark: remark,
            dropped_at: new Date(),
            dropped_by: BigInt(actor.uid),
          },
          remarks: `Reason: ${reason}\n${remark}`,
        },
        actor.uid,
      );
      return this.get(id, actor);
    },
  };
}
