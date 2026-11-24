import { envelope } from '../../utils/response.js';
import { ERROR_RESPONSES, nullableString, secured, uuidParams } from '../../utils/schemas.js';
import { serviceRequestResponse } from '../service-request/service-request.schema.js';

const nullableNumber = { type: ['number', 'null'] };
const nullableInt = { type: ['integer', 'null'] };
const nullableTime = { type: ['string', 'null'], format: 'date-time' };
const count = { type: 'integer', minimum: 0, maximum: 9999 };
const money = { type: 'number', minimum: 0, maximum: 9999999999 };
const text = (max) => ({ type: 'string', maxLength: max });

const surveyResponse = {
  type: 'object',
  properties: {
    request: serviceRequestResponse,
    volumeUnit: { type: 'string' },
    furnitureUnit: { type: 'string' },
    survey: {
      type: 'object',
      properties: {
        id: nullableString,
        surveyedById: nullableString,
        surveyedByName: nullableString,
        surveyedAt: nullableTime,
        scanFileId: nullableInt,
        timeToCompleteHours: nullableNumber,
        storageDays: nullableInt,
        noOfDays: nullableInt,
        peopleRequired: nullableInt,
        peopleDescription: nullableString,
        packingMaterialRemarks: nullableString,
        insuranceRequired: { type: 'boolean' },
        insuranceValue: nullableNumber,
        remarks: nullableString,
        amountQuoted: nullableNumber,
        quoteInstruction: nullableString,
        computedVolumeCft: nullableNumber,
        estimatedVolumeCft: nullableNumber,
        versionNo: { type: 'integer' },
        completedAt: nullableTime,
        dropReasonId: nullableInt,
        dropReasonLabel: nullableString,
        dropRemark: nullableString,
        droppedAt: nullableTime,
        requisites: {
          type: 'array',
          items: {
            type: 'object',
            properties: { requisiteId: { type: 'integer' }, remark: nullableString },
          },
        },
      },
    },
  },
};

const reply = { 200: envelope(surveyResponse), ...ERROR_RESPONSES };
const tagged = secured('surveys');

export const getSurveySchema = {
  ...tagged,
  summary: 'The survey of a request (request in the survey stage)',
  params: uuidParams,
  response: reply,
};

export const saveSurveySchema = {
  ...tagged,
  summary: 'Save the survey details (volumes in CFT)',
  params: uuidParams,
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['executiveId', 'surveyedById'],
    properties: {
      executiveId: { type: 'string', format: 'uuid' },
      surveyedById: { type: 'string', format: 'uuid' },
      surveyedAt: { type: 'string', format: 'date-time' },
      scanFileId: { type: 'integer', minimum: 1 },
      timeToCompleteHours: { type: 'number', minimum: 0, maximum: 9999 },
      storageDays: count,
      noOfDays: count,
      peopleRequired: count,
      peopleDescription: text(500),
      packingMaterialRemarks: text(2000),
      insuranceRequired: { type: 'boolean' },
      insuranceValue: money,
      estimatedVolumeCft: { type: 'number', minimum: 0, maximum: 99999999 },
      // Ticked special requisites, each with an optional note.
      requisites: {
        type: 'array',
        maxItems: 50,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['requisiteId'],
          properties: {
            requisiteId: { type: 'integer', minimum: 1 },
            remark: text(500),
          },
        },
      },
      remarks: text(2000),
      amountQuoted: money,
      quoteInstruction: text(2000),
    },
  },
  response: reply,
};

export const completeSurveySchema = {
  ...tagged,
  summary: 'Mark the survey as completed',
  params: uuidParams,
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['surveyedById', 'surveyedAt'],
    properties: {
      surveyedById: { type: 'string', format: 'uuid' },
      surveyedAt: { type: 'string', format: 'date-time' },
      remarks: text(2000),
    },
  },
  response: reply,
};

export const dropSurveySchema = {
  ...tagged,
  summary: 'Drop the survey (final)',
  params: uuidParams,
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['dropReasonId', 'dropRemark'],
    properties: {
      dropReasonId: { type: 'integer', minimum: 1 },
      dropRemark: { type: 'string', minLength: 1, maxLength: 2000 },
    },
  },
  response: reply,
};
