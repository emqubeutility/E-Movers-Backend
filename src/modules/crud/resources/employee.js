import { PATTERNS } from '../../../utils/patterns.js';
import { OPERATIONS, f, key } from '../fields.js';
import { FILTER, REQUIRED, SEARCH, defineResource } from './helpers.js';

const staff = (definition) =>
  defineResource({ tag: 'employees', menu: 'EMPLOYEES', ...definition });

export default [
  staff({
    name: 'employees',
    model: 'employee',
    title: 'Employees',
    singular: 'Employee',
    // The employee row shares its key with the person's profile, so the id is supplied on create.
    keys: [key.big('profile_id', 'profileId', { assigned: true })],
    defaultSort: { field: 'employeeCode', order: 'asc' },
    fields: {
      employeeCode: f.pattern('employee_code', PATTERNS.code, { ...REQUIRED, ...SEARCH, max: 20 }),
      organizationId: f.bigRef('organization_id', REQUIRED),
      contractorCompanyId: f.bigRef('contractor_company_id'),
      isOutsourced: f.bool('is_outsourced', FILTER),
      joinDate: f.date('join_date', { sort: true }),
      exitDate: f.date('exit_date'),
      billingRate: f.decimal('billing_rate', { max: 99999999 }),
      ctcRate: f.decimal('ctc_rate', { max: 99999999 }),
    },
  }),
  staff({
    name: 'employee-skills',
    model: 'employee_skill',
    title: 'Employee skills',
    singular: 'Employee skill',
    audit: 'basic',
    operations: OPERATIONS.link,
    keys: [
      key.big('profile_id', 'profileId', { assigned: true, filter: true }),
      key.int('skill_id', 'skillId', { assigned: true, filter: true }),
    ],
    fields: {},
  }),
];
