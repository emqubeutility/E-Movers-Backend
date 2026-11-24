const actorIdOf = (actorId) => (actorId ? BigInt(actorId) : null);

const SURVEY_SELECT = {
  survey_id: true,
  public_id: true,
  surveyed_by_profile_id: true,
  surveyed_at: true,
  scan_file_id: true,
  time_to_complete_hours: true,
  storage_days: true,
  no_of_days: true,
  people_required: true,
  people_description: true,
  packing_material_remarks: true,
  insurance_required: true,
  insurance_value: true,
  remarks: true,
  amount_quoted: true,
  quote_instruction: true,
  computed_volume_cft: true,
  estimated_volume_cft: true,
  version_no: true,
  completed_at: true,
  drop_reason_id: true,
  drop_remark: true,
  dropped_at: true,
  updated_at: true,
  survey_special_requisite: { select: { requisite_id: true, remark: true } },
};

/** Survey columns from the validated input. */
function toColumns(data) {
  return {
    surveyed_by_profile_id: data.surveyedByProfileId ?? null,
    surveyed_at: data.surveyedAt ?? null,
    scan_file_id: data.scanFileId ?? null,
    time_to_complete_hours: data.timeToCompleteHours ?? null,
    storage_days: data.storageDays ?? null,
    no_of_days: data.noOfDays ?? null,
    people_required: data.peopleRequired ?? null,
    people_description: data.peopleDescription || null,
    packing_material_remarks: data.packingMaterialRemarks || null,
    insurance_required: Boolean(data.insuranceRequired),
    insurance_value: data.insuranceRequired ? (data.insuranceValue ?? null) : null,
    remarks: data.remarks || null,
    amount_quoted: data.amountQuoted ?? null,
    quote_instruction: data.quoteInstruction || null,
    estimated_volume_cft: data.estimatedVolumeCft ?? null,
  };
}

export function createSurveyRepository(prisma) {
  /** Creates the survey row if it does not exist yet; returns its id. */
  async function ensureSurvey(tx, serviceRequestId, actor) {
    const found = await tx.survey.findUnique({
      where: { service_request_id: serviceRequestId },
      select: { survey_id: true },
    });
    if (found) return found.survey_id;
    const created = await tx.survey.create({
      data: { service_request_id: serviceRequestId, created_by: actor },
      select: { survey_id: true },
    });
    return created.survey_id;
  }

  const logEntry = (tx, request, action, toStatusId, actor, remarks) =>
    tx.service_request_log.create({
      data: {
        service_request_id: request.service_request_id,
        action,
        from_status_id: request.status_id,
        to_status_id: toStatusId ?? request.status_id,
        remarks: remarks || null,
        created_by: actor,
      },
    });

  return {
    findByRequest(serviceRequestId) {
      return prisma.survey.findFirst({
        where: { service_request_id: serviceRequestId, deleted_at: null },
        select: SURVEY_SELECT,
      });
    },

    /** Names of these profiles (surveyed by), by profile id. */
    async profileNames(profileIds) {
      const rows = await prisma.profile.findMany({
        where: { profile_id: { in: profileIds.filter(Boolean) } },
        select: { profile_id: true, public_id: true, name: true, last_name: true },
      });
      return new Map(rows.map((row) => [row.profile_id, row]));
    },

    /** Labels of these parameters (special requisites, drop reason), by id. */
    async parameterLabels(ids) {
      const rows = await prisma.parameter.findMany({
        where: { parameter_id: { in: ids.filter((id) => id != null) } },
        select: { parameter_id: true, label: true },
      });
      return new Map(rows.map((row) => [row.parameter_id, row.label]));
    },

    /** The organization's volume units (codes such as CBM, CFT). */
    async volumeUnits(organizationId) {
      const row = await prisma.organization.findUnique({
        where: { organization_id: organizationId },
        select: {
          parameter_organization_volume_uom_idToparameter: { select: { code: true } },
          parameter_organization_furniture_volume_uom_idToparameter: { select: { code: true } },
        },
      });
      return {
        volumeUnit: row?.parameter_organization_volume_uom_idToparameter?.code ?? 'CBM',
        furnitureUnit:
          row?.parameter_organization_furniture_volume_uom_idToparameter?.code ?? 'CFT',
      };
    },

    /** True when every id is a live value of the type. */
    async parametersOfType(ids, typeCode) {
      if (ids.length === 0) return true;
      const count = await prisma.parameter.count({
        where: { parameter_id: { in: ids }, is_active: true, parameter_type: { code: typeCode } },
      });
      return count === new Set(ids).size;
    },

    async fileExists(fileId) {
      const found = await prisma.file_doc.findUnique({
        where: { file_doc_id: BigInt(fileId) },
        select: { file_doc_id: true },
      });
      return Boolean(found);
    },

    /** Saves the survey details and its special requisites (replaced), and the executive. */
    save(request, data, actorId, changes) {
      const actor = actorIdOf(actorId);
      return prisma.$transaction(async (tx) => {
        const surveyId = await ensureSurvey(tx, request.service_request_id, actor);
        await tx.survey.update({
          where: { survey_id: surveyId },
          data: {
            ...toColumns(data),
            updated_at: new Date(),
            updated_by: actor,
            row_version: { increment: 1 },
          },
        });
        await tx.survey_special_requisite.deleteMany({ where: { survey_id: surveyId } });
        if (data.requisites.length)
          await tx.survey_special_requisite.createMany({
            data: data.requisites.map((item) => ({
              survey_id: surveyId,
              requisite_id: item.requisiteId,
              remark: item.remark?.trim() || null,
              created_by: actor,
            })),
          });
        if (data.executiveProfileId !== request.executive_profile_id)
          await tx.service_request.update({
            where: { service_request_id: request.service_request_id },
            data: { executive_profile_id: data.executiveProfileId, updated_by: actor },
          });
        if (changes) await logEntry(tx, request, 'SURVEY_UPDATED', null, actor, changes);
      });
    },

    /** Survey New -> Completed (or -> Dropped): the survey row, the request status and the log. */
    changeStatus(request, { action, statusId, columns, remarks }, actorId) {
      const actor = actorIdOf(actorId);
      return prisma.$transaction(async (tx) => {
        const surveyId = await ensureSurvey(tx, request.service_request_id, actor);
        await tx.survey.update({
          where: { survey_id: surveyId },
          data: { ...columns, updated_at: new Date(), updated_by: actor },
        });
        await tx.service_request.update({
          where: { service_request_id: request.service_request_id },
          data: { status_id: statusId, updated_by: actor, row_version: { increment: 1 } },
        });
        await logEntry(tx, request, action, statusId, actor, remarks);
      });
    },
  };
}
