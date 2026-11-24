import { ADDRESS_RESPONSE, CUSTOMER_ADDRESS_INPUT } from '../../utils/address.js';
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
const optionalEmail = {
  anyOf: [
    { type: 'string', format: 'email' },
    { type: 'string', maxLength: 0 },
  ],
};
// A dropdown code (e.g. MALE, ADULT); '' clears it.
const genderField = { type: 'string', maxLength: 30, pattern: '^([A-Z0-9_]+)?$' };
// Contact number of the customer (main contact): always required, never empty.
const requiredPhone = { type: 'string', pattern: '^\\+[1-9][0-9]{7,14}$' };
const phoneField = {
  anyOf: [
    { type: 'string', pattern: '^\\+[1-9][0-9]{7,14}$' },
    { type: 'string', maxLength: 0 },
  ],
};

const contactResponse = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    status: { type: 'string' },
    email: nullableString,
    contactNo: nullableString,
    altContactNo: nullableString,
    designation: nullableString,
    gender: nullableString,
    ageGroup: nullableString,
    nationality: nullableString,
  },
};

const contactInput = {
  type: 'object',
  additionalProperties: false,
  required: ['name'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', minLength: 2, maxLength: 150 },
    status: statusField,
    email: optionalEmail,
    contactNo: phoneField,
    altContactNo: phoneField,
    designation: { type: 'string', maxLength: 150 },
    gender: genderField,
    ageGroup: genderField,
    nationality: { type: 'string', maxLength: 10 },
  },
};

export const customerResponse = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    code: nullableString,
    kind: { type: 'string', enum: ['INDIVIDUAL', 'COMPANY'] },
    name: nullableString,
    contactName: nullableString,
    email: nullableString,
    contactNo: nullableString,
    altContactNo: nullableString,
    designation: nullableString,
    gender: nullableString,
    ageGroup: nullableString,
    nationality: nullableString,
    contacts: { type: 'array', items: contactResponse },
    mainContactId: { type: ['string', 'null'] },
    status: { type: 'string' },
    statusLabel: { type: 'string' },
    agreedToWhatsapp: { type: 'boolean' },
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
    kind: { type: 'string', enum: ['INDIVIDUAL', 'COMPANY'] },
    sortBy: { type: 'string', enum: ['createdAt', 'code', 'name'], default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
};

const fields = {
  name: { type: 'string', minLength: 1, maxLength: 250 },
  contactName: { type: 'string', maxLength: 150 },
  email: optionalEmail,
  contactNo: phoneField,
  altContactNo: phoneField,
  designation: { type: 'string', maxLength: 150 },
  gender: genderField,
  ageGroup: genderField,
  nationality: { type: 'string', maxLength: 10 },
  status: statusField,
  agreedToWhatsapp: { type: 'boolean' },
  address: CUSTOMER_ADDRESS_INPUT,
  // Company only: the contact persons besides the main one. On update the list replaces the old one.
  contacts: { type: 'array', maxItems: 50, items: contactInput },
};

const securedCustomers = secured('customers');

export const listCustomersSchema = {
  ...securedCustomers,
  summary: 'List customers with pagination, search, sorting and filters',
  querystring: listQuery,
  response: { 200: pageResponse(customerResponse), ...ERROR_RESPONSES },
};

export const customerOptionsSchema = {
  ...securedCustomers,
  summary: 'Dropdown values for the customer form',
  response: {
    200: envelope({
      type: 'object',
      properties: {
        kinds: { type: 'array', items: option },
        statuses: { type: 'array', items: option },
      },
    }),
    ...ERROR_RESPONSES,
  },
};

export const getCustomerSchema = {
  ...securedCustomers,
  summary: 'Get one customer',
  params: uuidParams,
  response: { 200: envelope(customerResponse), ...ERROR_RESPONSES },
};

export const createCustomerSchema = {
  ...securedCustomers,
  summary: 'Create a customer',
  body: {
    type: 'object',
    additionalProperties: false,
    // No code: the next CUS-NNN number is given (e.g. an individual added from a service request).
    required: ['kind', 'name', 'contactNo'],
    properties: {
      code: codeField,
      kind: { type: 'string', enum: ['INDIVIDUAL', 'COMPANY'] },
      ...fields,
      contactNo: requiredPhone,
    },
  },
  response: { 201: envelope(customerResponse), ...ERROR_RESPONSES },
};

export const updateCustomerSchema = {
  ...securedCustomers,
  summary: 'Update a customer (the code is immutable)',
  params: uuidParams,
  body: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: {
      ...fields,
      contactNo: requiredPhone,
      // Company: make this contact person (profile id) the main contact.
      mainContactId: { type: 'string', format: 'uuid' },
    },
  },
  response: { 200: envelope(customerResponse), ...ERROR_RESPONSES },
};

export const deleteCustomerSchema = {
  ...securedCustomers,
  summary: 'Soft-delete a customer',
  params: uuidParams,
  response: { 200: envelope({ type: 'null' }), ...ERROR_RESPONSES },
};
