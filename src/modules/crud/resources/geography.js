import { PATTERNS } from '../../../utils/patterns.js';
import { f, key } from '../fields.js';
import { FILTER, REQUIRED, SEARCH, SORT, defineResource } from './helpers.js';

const master = (definition) =>
  defineResource({
    tag: 'geography',
    menu: 'GEOGRAPHY',
    audit: 'basic',
    activeColumn: 'is_active',
    ...definition,
  });
const NAME = { ...REQUIRED, ...SEARCH, min: 2, max: 100 };
const BY_NAME = { field: 'name', order: 'asc' };

export default [
  master({
    name: 'countries',
    model: 'country',
    title: 'Countries',
    singular: 'Country',
    keys: [key.int('country_id')],
    optionLabel: ['name'],
    defaultSort: BY_NAME,
    fields: {
      iso2: f.pattern('iso2', PATTERNS.iso2, { ...REQUIRED, ...SEARCH, max: 2 }),
      iso3: f.pattern('iso3', PATTERNS.iso3, { ...SEARCH, max: 3 }),
      name: f.label('name', NAME),
      dialCode: f.pattern('dial_code', PATTERNS.dialCode, { max: 6 }),
      defaultCurrencyId: f.ref('default_currency_id'),
      isActive: f.bool('is_active', FILTER),
    },
  }),
  master({
    name: 'states',
    model: 'state',
    title: 'States',
    singular: 'State',
    keys: [key.int('state_id')],
    optionLabel: ['name'],
    defaultSort: BY_NAME,
    fields: {
      countryId: f.ref('country_id', { ...REQUIRED, ...FILTER }),
      code: f.text('code', { min: 1, max: 10, ...SEARCH }),
      name: f.label('name', NAME),
      isActive: f.bool('is_active', FILTER),
    },
  }),
  master({
    name: 'cities',
    model: 'city',
    title: 'Cities',
    singular: 'City',
    keys: [key.int('city_id')],
    optionLabel: ['name'],
    defaultSort: BY_NAME,
    fields: {
      countryId: f.ref('country_id', { ...REQUIRED, ...FILTER }),
      stateId: f.ref('state_id', FILTER),
      name: f.label('name', NAME),
      isActive: f.bool('is_active', FILTER),
    },
  }),
  master({
    name: 'areas',
    model: 'area',
    title: 'Areas',
    singular: 'Area',
    keys: [key.int('area_id')],
    optionLabel: ['name'],
    defaultSort: BY_NAME,
    fields: {
      cityId: f.ref('city_id', { ...REQUIRED, ...FILTER }),
      name: f.label('name', { ...NAME, max: 150 }),
      isActive: f.bool('is_active', FILTER),
    },
  }),
  master({
    name: 'currencies',
    model: 'currency',
    title: 'Currencies',
    singular: 'Currency',
    keys: [key.int('currency_id')],
    optionLabel: ['code'],
    defaultSort: { field: 'displayOrder', order: 'asc' },
    fields: {
      code: f.pattern('code', PATTERNS.iso3, { ...REQUIRED, ...SEARCH, max: 3 }),
      name: f.label('name', NAME),
      symbol: f.text('symbol', { min: 1, max: 8 }),
      decimalPlaces: f.int('decimal_places', { min: 0, max: 4 }),
      isActive: f.bool('is_active', FILTER),
      displayOrder: f.int('display_order', { max: 9999, ...SORT }),
    },
  }),
  master({
    name: 'time-zones',
    model: 'time_zone',
    title: 'Time zones',
    singular: 'Time zone',
    keys: [key.int('time_zone_id')],
    optionLabel: ['iana_name'],
    defaultSort: { field: 'ianaName', order: 'asc' },
    fields: {
      ianaName: f.pattern('iana_name', PATTERNS.ianaZone, { ...REQUIRED, ...SEARCH, max: 64 }),
      utcOffsetMinutes: f.int('utc_offset_minutes', { min: -720, max: 840, ...SORT }),
      isActive: f.bool('is_active', FILTER),
    },
  }),
  master({
    name: 'nationalities',
    model: 'nationality',
    title: 'Nationalities',
    singular: 'Nationality',
    keys: [key.int('nationality_id')],
    optionLabel: ['name'],
    defaultSort: BY_NAME,
    fields: {
      code: f.text('code', { min: 2, max: 10, ...SEARCH }),
      name: f.label('name', NAME),
      countryId: f.ref('country_id'),
      isActive: f.bool('is_active', FILTER),
    },
  }),
];
