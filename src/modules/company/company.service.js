import { resolveAddress, toAddressDto } from '../../utils/address.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors.js';
import { requireParameter, resolveOptionalParameter } from '../../utils/lookups.js';
import { toMeta, toPagination } from '../../utils/pagination.js';
import { orgScopeOf } from '../../utils/scope.js';

export function toCompanyDto(row) {
  const type = row.parameter_company_company_type_idToparameter;
  const status = row.parameter_company_status_idToparameter;
  const paymentTerm = row.parameter_company_payment_term_idToparameter;
  return {
    id: row.public_id,
    organizationId: Number(row.organization_id),
    code: row.company_code,
    name: row.name,
    contactName: row.contact_name,
    companyType: type.code,
    companyTypeLabel: type.label,
    email: row.email,
    contactNo: row.contact_no,
    website: row.website,
    services: row.services,
    paymentTerm: paymentTerm?.code ?? null,
    status: status.code,
    statusLabel: status.label,
    notes: row.notes,
    address: toAddressDto(row.address_company_address_idToaddress),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createCompanyService({ companyRepository }) {
  /** A company outside the caller's organization is reported as missing, not forbidden. */
  async function getExisting(id, actor) {
    const row = await companyRepository.findByPublicId(id, orgScopeOf(actor));
    if (!row) throw new NotFoundError('Company not found');
    return row;
  }

  async function assertCodeFree(code, excludeId) {
    if (await companyRepository.codeExists(code, excludeId)) {
      throw new ConflictError('Company code is already in use', [
        { field: 'code', message: 'Company code is already in use' },
      ]);
    }
  }

  async function resolveLookups(input, defaultStatus) {
    const status = input.status ?? defaultStatus;
    return {
      companyTypeId: input.companyType
        ? await requireParameter(
            companyRepository,
            'COMPANY_TYPE',
            input.companyType,
            'companyType',
          )
        : undefined,
      statusId: status
        ? await requireParameter(companyRepository, 'ACCOUNT_STATUS', status, 'status')
        : undefined,
      paymentTermId:
        input.paymentTerm === undefined
          ? undefined
          : await resolveOptionalParameter(
              companyRepository,
              'PAYMENT_TERM',
              input.paymentTerm,
              'paymentTerm',
            ),
    };
  }

  return {
    async list(query, actor) {
      const pagination = toPagination(query);
      const { rows, total } = await companyRepository.list({
        ...query,
        organizationId: orgScopeOf(actor),
        skip: pagination.skip,
        take: pagination.take,
      });
      return { items: rows.map(toCompanyDto), meta: toMeta(pagination, total) };
    },

    options() {
      return companyRepository.listOptions();
    },

    async getById(id, actor) {
      return toCompanyDto(await getExisting(id, actor));
    },

    async create(input, actor) {
      // The caller's organization is stamped; only the super administrator chooses one.
      const organizationId =
        orgScopeOf(actor) ?? (input.organizationId ? BigInt(input.organizationId) : null);
      if (organizationId === null) {
        throw new ValidationError([
          { field: 'organizationId', message: 'Choose the organization for this company' },
        ]);
      }
      await assertCodeFree(input.code);
      const lookups = await resolveLookups(input, 'ACTIVE');
      const address = await resolveAddress(companyRepository, input.address, 'OFFICE');
      const row = await companyRepository.create(
        {
          ...input,
          ...lookups,
          organizationId,
          paymentTermId: lookups.paymentTermId ?? null,
          address,
        },
        actor.uid,
      );
      return toCompanyDto(row);
    },

    async update(id, input, actor) {
      const existing = await getExisting(id, actor);
      if (
        input.organizationId !== undefined &&
        input.organizationId !== Number(existing.organization_id)
      ) {
        // Moving a company between organizations is for the super administrator only.
        if (orgScopeOf(actor) !== null) {
          throw new ForbiddenError(
            'Only the super administrator can move a company to another organization',
          );
        }
        if (!(await companyRepository.organizationExists(input.organizationId))) {
          throw new ValidationError([
            { field: 'organizationId', message: 'Choose a valid organization' },
          ]);
        }
        if ((await companyRepository.employeeCountOf(id)) > 0) {
          throw new BadRequestError('Employees are assigned to this contractor', [
            {
              field: 'organizationId',
              message: 'Move or reassign the employees of this contractor first',
            },
          ]);
        }
      }
      const lookups = await resolveLookups(input);
      const address = await resolveAddress(companyRepository, input.address, 'OFFICE');
      const row = await companyRepository.update(id, { ...input, ...lookups, address }, actor.uid);
      return toCompanyDto(row);
    },

    async remove(id, actor) {
      await getExisting(id, actor);
      await companyRepository.softDelete(id, actor.uid);
    },
  };
}
