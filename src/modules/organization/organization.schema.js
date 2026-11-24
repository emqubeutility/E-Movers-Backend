import { ADDRESS_INPUT, ADDRESS_RESPONSE } from '../../utils/address.js';
import { envelope } from '../../utils/response.js';
import { ERROR_RESPONSES, nullableString, secured } from '../../utils/schemas.js';

const tagged = { ...secured, tags: ['organizations'] };

const phone = { type: 'string', pattern: '^(\\+[1-9][0-9]{7,14})?$' };
const email = {
  anyOf: [
    { type: 'string', format: 'email', maxLength: 150 },
    { type: 'string', maxLength: 0 },
  ],
};
const requiredEmail = { type: 'string', format: 'email', maxLength: 150 };
const amount = { type: ['number', 'null'], minimum: 0, maximum: 999999999999 };
const percent = { type: 'number', minimum: 0, maximum: 100 };
const fileId = { type: ['integer', 'null'], minimum: 1 };
const uom = { type: 'string', pattern: '^[A-Z0-9_]{2,60}$' };

const fields = {
  name: { type: 'string', minLength: 2, maxLength: 150 },
  isHeadOffice: { type: 'boolean' },
  isActive: { type: 'boolean' },
  contactNo: phone,
  contactPerson: {
    type: 'object',
    additionalProperties: false,
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 150 },
      email,
      contactNo: phone,
    },
  },
  leadEmail: requiredEmail,
  leadCcEmail: requiredEmail,
  logoFileId: fileId,
  quoteHeaderFileId: fileId,
  volumeUom: uom,
  furnitureVolumeUom: uom,
  currencyId: { type: 'integer', minimum: 1 },
  timeZoneId: { type: 'integer', minimum: 1 },
  quoteReviewMinLimit: { type: 'number', minimum: 0, maximum: 999999999999 },
  workloadMin: amount,
  workloadMax: amount,
  jobConfirmMinHours: { type: ['integer', 'null'], minimum: 0, maximum: 720 },
  employeeCostPerHour: amount,
  vehicleCostPerTrip: amount,
  employeeWorkingHours: { type: ['number', 'null'], minimum: 0, maximum: 24 },
  vatPercent: percent,
  profitPercent: percent,
  displayColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
  invoiceMaxDelayDays: { type: ['integer', 'null'], minimum: 0, maximum: 365 },
  address: ADDRESS_INPUT,
};

const numberOrNull = { type: ['number', 'null'] };
const integerOrNull = { type: ['integer', 'null'] };

const organizationResponse = {
  type: 'object',
  properties: {
    organizationId: { type: 'integer' },
    organizationCode: { type: 'string' },
    name: { type: 'string' },
    isHeadOffice: { type: 'boolean' },
    isActive: { type: 'boolean' },
    contactNo: nullableString,
    contactPerson: {
      type: ['object', 'null'],
      properties: { name: { type: 'string' }, email: nullableString, contactNo: nullableString },
    },
    leadEmail: nullableString,
    leadCcEmail: nullableString,
    logoFileId: integerOrNull,
    quoteHeaderFileId: integerOrNull,
    volumeUom: nullableString,
    furnitureVolumeUom: nullableString,
    currencyId: integerOrNull,
    timeZoneId: integerOrNull,
    quoteReviewMinLimit: numberOrNull,
    workloadMin: numberOrNull,
    workloadMax: numberOrNull,
    jobConfirmMinHours: integerOrNull,
    employeeCostPerHour: numberOrNull,
    vehicleCostPerTrip: numberOrNull,
    employeeWorkingHours: numberOrNull,
    vatPercent: numberOrNull,
    profitPercent: numberOrNull,
    displayColor: nullableString,
    invoiceMaxDelayDays: integerOrNull,
    address: ADDRESS_RESPONSE,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const idParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer', minimum: 1 } },
};

export const getOrganizationSchema = {
  ...tagged,
  summary: 'Get one organization with its contact person, address and settings',
  params: idParams,
  response: { 200: envelope(organizationResponse), ...ERROR_RESPONSES },
};

export const createOrganizationSchema = {
  ...tagged,
  summary: 'Create an organization (super administrator)',
  body: {
    type: 'object',
    additionalProperties: false,
    required: [
      'organizationCode',
      'name',
      'contactPerson',
      'leadEmail',
      'leadCcEmail',
      'volumeUom',
      'furnitureVolumeUom',
      'currencyId',
      'timeZoneId',
      'quoteReviewMinLimit',
      'vatPercent',
      'profitPercent',
      'displayColor',
    ],
    properties: {
      organizationCode: { type: 'string', pattern: '^[A-Z0-9][A-Z0-9-]{1,19}$' },
      ...fields,
    },
  },
  response: { 201: envelope(organizationResponse), ...ERROR_RESPONSES },
};

export const updateOrganizationSchema = {
  ...tagged,
  summary: 'Update an organization (only the fields sent)',
  params: idParams,
  body: { type: 'object', additionalProperties: false, properties: fields },
  response: { 200: envelope(organizationResponse), ...ERROR_RESPONSES },
};
