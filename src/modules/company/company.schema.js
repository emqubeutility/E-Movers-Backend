import { ADDRESS_INPUT, ADDRESS_RESPONSE } from '../../utils/address.js';
import { envelope } from '../../utils/response.js';
import { MAX_PAGE_SIZE } from '../../utils/pagination.js';
import {
  ERROR_RESPONSES,
  nullableString,
  pageResponse,
  secured,
  uuidParams,
} from '../../utils/schemas.js';

const statusField = { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] };
const codeField = { type: 'string', pattern: '^[A-Z0-9][A-Z0-9-]{1,19}$' };

export const companyResponse = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    organizationId: { type: 'integer' },
    code: nullableString,
    name: { type: 'string' },
    contactName: nullableString,
    companyType: { type: 'string' },
    companyTypeLabel: { type: 'string' },
    email: nullableString,
    contactNo: nullableString,
    website: nullableString,
    services: nullableString,
    paymentTerm: nullableString,
    status: { type: 'string' },
    statusLabel: { type: 'string' },
    notes: nullableString,
    address: ADDRESS_RESPONSE,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const option = {
  type: 'object',
  properties: { code: { type: 'string' }, label: { type: 'string' } },
};

const listQuery = {
  type: 'object',
  additionalProperties: false,
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: MAX_PAGE_SIZE, default: 10 },
    search: { type: 'string', maxLength: 100 },
    status: statusField,
    companyType: { type: 'string', maxLength: 60 },
    sortBy: { type: 'string', enum: ['createdAt', 'code', 'name'], default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
};

const fields = {
  name: { type: 'string', minLength: 1, maxLength: 250 },
  contactName: { type: 'string', maxLength: 250 },
  companyType: { type: 'string', maxLength: 60 },
  email: { type: 'string', format: 'email', maxLength: 150 },
  contactNo: { type: 'string', maxLength: 20 },
  website: { type: 'string', maxLength: 255 },
  services: { type: 'string', maxLength: 2000 },
  paymentTerm: { type: 'string', maxLength: 60 },
  status: statusField,
  notes: { type: 'string', maxLength: 2000 },
  address: ADDRESS_INPUT,
};

const securedCompanies = secured('companies');

export const listCompaniesSchema = {
  ...securedCompanies,
  summary: 'List companies with pagination, search, sorting and filters',
  querystring: listQuery,
  response: { 200: pageResponse(companyResponse), ...ERROR_RESPONSES },
};

export const companyOptionsSchema = {
  ...securedCompanies,
  summary: 'Dropdown values for the company form',
  response: {
    200: envelope({
      type: 'object',
      properties: {
        companyTypes: { type: 'array', items: option },
        statuses: { type: 'array', items: option },
        paymentTerms: { type: 'array', items: option },
      },
    }),
    ...ERROR_RESPONSES,
  },
};

export const getCompanySchema = {
  ...securedCompanies,
  summary: 'Get one company',
  params: uuidParams,
  response: { 200: envelope(companyResponse), ...ERROR_RESPONSES },
};

export const createCompanySchema = {
  ...securedCompanies,
  summary: 'Create a company',
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['code', 'name', 'companyType'],
    properties: { code: codeField, organizationId: { type: 'integer', minimum: 1 }, ...fields },
  },
  response: { 201: envelope(companyResponse), ...ERROR_RESPONSES },
};

export const updateCompanySchema = {
  ...securedCompanies,
  summary: 'Update a company (the code is immutable)',
  params: uuidParams,
  body: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: { ...fields, organizationId: { type: 'integer', minimum: 1 } },
  },
  response: { 200: envelope(companyResponse), ...ERROR_RESPONSES },
};

export const deleteCompanySchema = {
  ...securedCompanies,
  summary: 'Soft-delete a company',
  params: uuidParams,
  response: { 200: envelope({ type: 'null' }), ...ERROR_RESPONSES },
};
