import {
  ADDRESS_SELECT,
  countryExistsIn,
  locationIsValidIn,
  saveMainAddress,
} from '../../utils/address.js';

const SELECT = {
  public_id: true,
  organization_id: true,
  company_code: true,
  name: true,
  contact_name: true,
  email: true,
  contact_no: true,
  website: true,
  services: true,
  notes: true,
  created_at: true,
  updated_at: true,
  address_company_address_idToaddress: { select: ADDRESS_SELECT },
  parameter_company_company_type_idToparameter: { select: { code: true, label: true } },
  parameter_company_status_idToparameter: { select: { code: true, label: true } },
  parameter_company_payment_term_idToparameter: { select: { code: true, label: true } },
};

const SORT_COLUMNS = {
  createdAt: 'created_at',
  code: 'company_code',
  name: 'name',
};

function buildWhere({ search, status, companyType, organizationId }) {
  const where = { deleted_at: null };
  if (organizationId) where.organization_id = organizationId;
  if (status) where.parameter_company_status_idToparameter = { code: status };
  if (companyType) where.parameter_company_company_type_idToparameter = { code: companyType };
  if (search) {
    const contains = { contains: search, mode: 'insensitive' };
    where.OR = [{ company_code: contains }, { name: contains }, { contact_name: contains }];
  }
  return where;
}

const actorIdOf = (actorId) => (actorId ? BigInt(actorId) : null);

export function createCompanyRepository(prisma) {
  return {
    async list({ skip, take, search, status, companyType, sortBy, sortOrder, organizationId }) {
      const where = buildWhere({ search, status, companyType, organizationId });
      const [rows, total] = await Promise.all([
        prisma.company.findMany({
          where,
          orderBy: { [SORT_COLUMNS[sortBy] || SORT_COLUMNS.createdAt]: sortOrder },
          skip,
          take,
          select: SELECT,
        }),
        prisma.company.count({ where }),
      ]);
      return { rows, total };
    },

    findByPublicId(publicId, organizationId) {
      return prisma.company.findFirst({
        where: {
          public_id: publicId,
          deleted_at: null,
          ...(organizationId && { organization_id: organizationId }),
        },
        select: SELECT,
      });
    },

    async organizationExists(organizationId) {
      const found = await prisma.organization.findUnique({
        where: { organization_id: BigInt(organizationId) },
        select: { organization_id: true },
      });
      return Boolean(found);
    },

    /** Employees supplied by this contractor. */
    employeeCountOf(publicId) {
      return prisma.employee.count({ where: { company: { public_id: publicId } } });
    },

    codeExists(code, excludePublicId) {
      return prisma.company.count({
        where: {
          company_code: code,
          deleted_at: null,
          ...(excludePublicId && { public_id: { not: excludePublicId } }),
        },
      });
    },

    countryExists: countryExistsIn(prisma),

    locationIsValid: locationIsValidIn(prisma),

    findParameter(typeCode, code) {
      return prisma.parameter.findFirst({
        where: { code, parameter_type: { code: typeCode } },
        select: { parameter_id: true },
      });
    },

    async listOptions() {
      const [companyTypes, statuses, paymentTerms] = await Promise.all([
        prisma.parameter.findMany({
          where: { parameter_type: { code: 'COMPANY_TYPE' }, is_active: true },
          orderBy: { display_order: 'asc' },
          select: { code: true, label: true },
        }),
        prisma.parameter.findMany({
          where: { parameter_type: { code: 'ACCOUNT_STATUS' }, is_active: true },
          orderBy: { display_order: 'asc' },
          select: { code: true, label: true },
        }),
        prisma.parameter.findMany({
          where: { parameter_type: { code: 'PAYMENT_TERM' }, is_active: true },
          orderBy: { display_order: 'asc' },
          select: { code: true, label: true },
        }),
      ]);
      return { companyTypes, statuses, paymentTerms };
    },

    create(data, actorId) {
      return prisma.$transaction(async (tx) => {
        const created = await tx.company.create({
          data: {
            organization_id: data.organizationId,
            company_type_id: data.companyTypeId,
            company_code: data.code,
            name: data.name,
            contact_name: data.contactName || null,
            email: data.email || null,
            contact_no: data.contactNo || null,
            website: data.website || null,
            services: data.services || null,
            payment_term_id: data.paymentTermId,
            status_id: data.statusId,
            notes: data.notes || null,
            created_by: actorIdOf(actorId),
          },
          select: { company_id: true, public_id: true },
        });
        if (data.address)
          await saveMainAddress(
            tx,
            'company',
            created.company_id,
            data.address,
            actorIdOf(actorId),
          );
        return tx.company.findUnique({ where: { public_id: created.public_id }, select: SELECT });
      });
    },

    update(publicId, data, actorId) {
      return prisma.$transaction(async (tx) => {
        const row = await tx.company.update({
          where: { public_id: publicId },
          data: {
            ...(data.organizationId !== undefined && {
              organization_id: BigInt(data.organizationId),
            }),
            ...(data.companyTypeId !== undefined && { company_type_id: data.companyTypeId }),
            ...(data.name !== undefined && { name: data.name }),
            ...(data.contactName !== undefined && { contact_name: data.contactName || null }),
            ...(data.email !== undefined && { email: data.email || null }),
            ...(data.contactNo !== undefined && { contact_no: data.contactNo || null }),
            ...(data.website !== undefined && { website: data.website || null }),
            ...(data.services !== undefined && { services: data.services || null }),
            ...(data.paymentTermId !== undefined && { payment_term_id: data.paymentTermId }),
            ...(data.statusId !== undefined && { status_id: data.statusId }),
            ...(data.notes !== undefined && { notes: data.notes || null }),
            updated_by: actorIdOf(actorId),
            row_version: { increment: 1 },
          },
          select: { company_id: true },
        });
        if (data.address)
          await saveMainAddress(tx, 'company', row.company_id, data.address, actorIdOf(actorId));
        return tx.company.findUnique({ where: { public_id: publicId }, select: SELECT });
      });
    },

    softDelete(publicId, actorId) {
      return prisma.company.update({
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
