import { PATTERNS } from '../../../utils/patterns.js';
import { ValidationError } from '../../../utils/errors.js';
import { f, key } from '../fields.js';
import { FILTER, REQUIRED, SEARCH, SOFT_DELETE, defineResource } from './helpers.js';

const people = (definition) => defineResource({ tag: 'people', ...definition });
const today = () => new Date().toISOString().slice(0, 10);

/** The three possible owners of an address, document or bank account. */
const owners = () => ({
  profileId: f.bigRef('profile_id'),
  customerId: f.bigRef('customer_id'),
  companyId: f.bigRef('company_id'),
});

function assertBirthDateInPast(body) {
  if (body.dateOfBirth && body.dateOfBirth > today()) {
    throw new ValidationError([{ field: 'dateOfBirth', message: 'cannot be in the future' }]);
  }
}

export default [
  people({
    name: 'profiles',
    model: 'profile',
    title: 'Profiles',
    singular: 'Profile',
    menu: 'PROFILES',
    keys: [key.big('profile_id')],
    softDelete: SOFT_DELETE,
    optionLabel: ['name', 'last_name'],
    defaultSort: { field: 'createdAt', order: 'desc' },
    fields: {
      userTypeId: f.param('user_type_id', 'USER_TYPE', REQUIRED),
      companyId: f.bigRef('company_id'),
      name: f.personName('name', { ...REQUIRED, ...SEARCH }),
      lastName: f.personName('last_name', SEARCH),
      email: f.email('email', SEARCH),
      contactNo: f.phone('contact_no', SEARCH),
      altContactNo: f.phone('alt_contact_no'),
      designation: f.text('designation', { min: 2, max: 150 }),
      genderId: f.param('gender_id', 'GENDER'),
      dateOfBirth: f.date('date_of_birth'),
      ageGroupId: f.param('age_group_id', 'AGE_GROUP'),
      nationalityId: f.ref('nationality_id'),
      profession: f.text('profession', { min: 2, max: 150 }),
      statusId: f.param('status_id', 'ACCOUNT_STATUS', REQUIRED),
      createdAt: f.dateTime('created_at', { readOnly: true, sort: true }),
    },
    rules: {
      beforeCreate: assertBirthDateInPast,
      beforeUpdate: (existing, body) => assertBirthDateInPast(body),
    },
  }),
  people({
    name: 'addresses',
    model: 'address',
    title: 'Addresses',
    singular: 'Address',
    menu: 'PROFILES',
    keys: [key.big('address_id')],
    softDelete: SOFT_DELETE,
    fields: {
      addressTypeId: f.param('address_type_id', 'ADDRESS_TYPE', REQUIRED),
      isDefault: f.bool('is_default', FILTER),
      addressText: f.text('address_text', { ...REQUIRED, ...SEARCH, min: 3, max: 512 }),
      countryId: f.ref('country_id', REQUIRED),
      stateId: f.ref('state_id'),
      cityId: f.ref('city_id'),
      areaId: f.ref('area_id'),
      postalCode: f.pattern('postal_code', PATTERNS.postalCode, { max: 20 }),
    },
  }),
  people({
    name: 'consents',
    model: 'consent',
    title: 'Consents',
    singular: 'Consent',
    menu: 'PROFILES',
    keys: [key.big('consent_id')],
    fields: {
      profileId: f.bigRef('profile_id', REQUIRED),
      channelId: f.param('channel_id', 'COMMUNICATION_CHANNEL', REQUIRED),
      statusId: f.param('status_id', 'CONSENT_STATUS', REQUIRED),
      statusChangedAt: f.dateTime('status_changed_at', { readOnly: true, sort: true }),
      source: f.pattern('source', PATTERNS.code, { max: 30 }),
    },
  }),
  people({
    name: 'documents',
    model: 'document',
    title: 'Documents',
    singular: 'Document',
    menu: 'DOCUMENTS',
    keys: [key.big('document_id')],
    softDelete: SOFT_DELETE,
    defaultSort: { field: 'expiryDate', order: 'asc' },
    fields: {
      ...owners(),
      documentTypeId: f.ref('document_type_id', REQUIRED),
      documentNumber: f.text('document_number', { min: 3, max: 80, ...SEARCH }),
      issueDate: f.date('issue_date'),
      expiryDate: f.date('expiry_date', { sort: true }),
      fileId: f.bigRef('file_id', { filter: false }),
      isVerified: f.bool('is_verified', FILTER),
      isCurrent: f.bool('is_current', FILTER),
      notes: f.text('notes', { max: 2000 }),
    },
  }),
  people({
    name: 'tax-registrations',
    model: 'tax_registration',
    title: 'Tax registrations',
    singular: 'Tax registration',
    menu: 'FINANCE_DETAILS',
    keys: [key.big('tax_registration_id')],
    fields: {
      customerId: f.bigRef('customer_id'),
      companyId: f.bigRef('company_id'),
      taxTypeId: f.param('tax_type_id', 'TAX_TYPE', REQUIRED),
      registrationNo: f.pattern('registration_no', PATTERNS.taxNumber, {
        ...REQUIRED,
        ...SEARCH,
        max: 30,
      }),
      countryId: f.ref('country_id'),
    },
  }),
  people({
    name: 'bank-accounts',
    model: 'bank_account',
    title: 'Bank accounts',
    singular: 'Bank account',
    menu: 'FINANCE_DETAILS',
    keys: [key.big('bank_account_id')],
    softDelete: SOFT_DELETE,
    fields: {
      ...owners(),
      accountHolderName: f.label('account_holder_name', {
        ...REQUIRED,
        ...SEARCH,
        min: 2,
        max: 200,
      }),
      bankName: f.label('bank_name', { ...REQUIRED, ...SEARCH, min: 2, max: 150 }),
      branchName: f.text('branch_name', { min: 2, max: 150 }),
      iban: f.pattern('iban', PATTERNS.iban, { max: 34 }),
      swiftBic: f.pattern('swift_bic', PATTERNS.swift, { max: 11 }),
      currencyId: f.ref('currency_id'),
      isDefault: f.bool('is_default', FILTER),
      isActive: f.bool('is_active', FILTER),
    },
  }),
];
