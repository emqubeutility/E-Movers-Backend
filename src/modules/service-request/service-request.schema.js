import { ADDRESS_INPUT, ADDRESS_RESPONSE } from '../../utils/address.js';
import { MAX_PAGE_SIZE } from '../../utils/pagination.js';
import { envelope } from '../../utils/response.js';
import {
  ERROR_RESPONSES,
  nullableString,
  pageResponse,
  secured,
  uuidParams,
} from '../../utils/schemas.js';

const id = { type: 'integer', minimum: 1 };
const nullableId = { type: ['integer', 'null'] };
const date = { type: 'string', format: 'date' };
const nullableDate = { type: ['string', 'null'] };

export const serviceRequestResponse = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    requestNo: nullableString,
    organizationId: { type: 'integer' },
    customerId: nullableString,
    customerPhone: nullableString,
    customerProfileId: nullableString,
    customerProfileName: nullableString,
    serviceGroupFileId: { type: ['integer', 'null'] },
    customerName: { type: 'string' },
    executiveId: nullableString,
    executiveName: nullableString,
    serviceGroupId: { type: 'integer' },
    serviceGroupCode: nullableString,
    serviceGroupLabel: nullableString,
    serviceTypeId: { type: 'integer' },
    serviceTypeName: nullableString,
    internationalServiceTypeId: nullableId,
    title: { type: 'string' },
    residenceTypeId: nullableId,
    moveDate: nullableDate,
    volumeCbm: { type: ['number', 'null'] },
    fromAddress: ADDRESS_RESPONSE,
    toAddress: ADDRESS_RESPONSE,
    enquiryChannelId: nullableId,
    referralId: nullableId,
    surveyRequired: { type: 'boolean' },
    surveyTypeId: nullableId,
    surveyDate: nullableDate,
    surveyTime: nullableString,
    storageStartDate: nullableDate,
    storageEndDate: nullableDate,
    pickAndPack: { type: 'boolean' },
    remarks: nullableString,
    stageValue: nullableId,
    stageLabel: nullableString,
    statusValue: nullableId,
    statusLabel: nullableString,
    contactedById: nullableString,
    contactedByName: nullableString,
    contactedAt: { type: ['string', 'null'], format: 'date-time' },
    dropReasonId: nullableId,
    dropReasonLabel: nullableString,
    dropRemark: nullableString,
    droppedAt: { type: ['string', 'null'], format: 'date-time' },
    lastAction: {
      type: ['object', 'null'],
      properties: {
        action: { type: 'string' },
        at: { type: 'string', format: 'date-time' },
        byName: nullableString,
        remarks: nullableString,
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const body = {
  type: 'object',
  additionalProperties: false,
  required: ['customerId', 'executiveId', 'serviceGroupId', 'serviceTypeId', 'title'],
  properties: {
    organizationId: id,
    customerId: { type: 'string', format: 'uuid' },
    // Contact person of a company customer (required for a company).
    customerProfileId: { type: 'string', format: 'uuid' },
    executiveId: { type: 'string', format: 'uuid' },
    serviceGroupId: id,
    serviceTypeId: id,
    internationalServiceTypeId: id,
    title: { type: 'string', minLength: 2, maxLength: 250 },
    residenceTypeId: id,
    moveDate: date,
    volumeCbm: { type: 'number', minimum: 0, maximum: 99999999 },
    fromAddress: ADDRESS_INPUT,
    toAddress: ADDRESS_INPUT,
    enquiryChannelId: id,
    referralId: id,
    surveyRequired: { type: 'boolean' },
    surveyTypeId: id,
    surveyDate: date,
    surveyTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
    storageStartDate: date,
    storageEndDate: date,
    pickAndPack: { type: 'boolean' },
    remarks: { type: 'string', maxLength: 2000 },
    // What the save does: just save, or move on to the survey or the quote.
    action: { type: 'string', enum: ['SAVE', 'START_SURVEY', 'START_QUOTE'], default: 'SAVE' },
  },
};

const listQuery = {
  type: 'object',
  additionalProperties: false,
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: MAX_PAGE_SIZE, default: 10 },
    search: { type: 'string', maxLength: 100 },
    serviceGroupId: id,
    // Parameter values of REQUEST_STAGE / REQUEST_STATUS.
    stageValue: id,
    statusValue: id,
    executiveId: { type: 'string', format: 'uuid' },
    sortBy: {
      type: 'string',
      enum: ['createdAt', 'requestNo', 'title', 'moveDate'],
      default: 'createdAt',
    },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
};

const tagged = secured('service-requests');

export const listServiceRequestsSchema = {
  ...tagged,
  summary: 'List service requests with pagination, search, sorting and filters',
  querystring: listQuery,
  response: { 200: pageResponse(serviceRequestResponse), ...ERROR_RESPONSES },
};

export const serviceRequestOptionsSchema = {
  ...tagged,
  summary: 'Executives and services for the service request form',
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: { organizationId: { type: 'integer', minimum: 1 } },
  },
  response: {
    200: envelope({
      type: 'object',
      properties: {
        countryId: { type: ['integer', 'null'] },
        cityId: { type: ['integer', 'null'] },
        serviceGroups: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              code: { type: 'string' },
              name: { type: 'string' },
              fileId: { type: ['integer', 'null'] },
            },
          },
        },
        serviceTypes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              serviceGroupId: { type: 'integer' },
              name: { type: 'string' },
            },
          },
        },
        executives: {
          type: 'array',
          items: {
            type: 'object',
            properties: { id: { type: 'string' }, name: { type: 'string' } },
          },
        },
      },
    }),
    ...ERROR_RESPONSES,
  },
};

export const getServiceRequestSchema = {
  ...tagged,
  summary: 'Get one service request',
  params: uuidParams,
  response: { 200: envelope(serviceRequestResponse), ...ERROR_RESPONSES },
};

export const createServiceRequestSchema = {
  ...tagged,
  summary: 'Create a service request',
  body,
  response: { 201: envelope(serviceRequestResponse), ...ERROR_RESPONSES },
};

export const updateServiceRequestSchema = {
  ...tagged,
  summary: 'Replace a service request (send the whole form)',
  params: uuidParams,
  body,
  response: { 200: envelope(serviceRequestResponse), ...ERROR_RESPONSES },
};

export const logsSchema = {
  ...tagged,
  summary: 'The history (timeline) of a request, newest first',
  params: uuidParams,
  response: {
    200: envelope({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          action: { type: 'string' },
          at: { type: 'string', format: 'date-time' },
          contactedAt: { type: ['string', 'null'], format: 'date-time' },
          byName: nullableString,
          fromStatus: nullableString,
          toStatus: nullableString,
          details: { type: 'array', items: { type: 'string' } },
          remarks: nullableString,
        },
      },
    }),
    ...ERROR_RESPONSES,
  },
};

export const contactedSchema = {
  ...tagged,
  summary: 'Mark an assigned request as contacted',
  params: uuidParams,
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['contactedAt'],
    properties: {
      contactedById: { type: 'string', format: 'uuid' },
      contactedAt: { type: 'string', format: 'date-time' },
      remarks: { type: 'string', maxLength: 2000 },
    },
  },
  response: { 200: envelope(serviceRequestResponse), ...ERROR_RESPONSES },
};

export const dropSchema = {
  ...tagged,
  summary: 'Drop a request (final)',
  params: uuidParams,
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['dropReasonId', 'dropRemark'],
    properties: {
      dropReasonId: id,
      dropRemark: { type: 'string', minLength: 1, maxLength: 2000 },
    },
  },
  response: { 200: envelope(serviceRequestResponse), ...ERROR_RESPONSES },
};

export const deleteServiceRequestSchema = {
  ...tagged,
  summary: 'Soft-delete a service request',
  params: uuidParams,
  response: { 200: envelope({ type: 'null' }), ...ERROR_RESPONSES },
};
