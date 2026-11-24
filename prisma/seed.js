import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PARAMETER_TYPES = [
  { code: 'USER_TYPE', name: 'User Type', description: 'What a profile is', order: 1 },
  {
    code: 'ACCOUNT_STATUS',
    name: 'Account Status',
    description: 'Status of a profile or a login',
    order: 2,
  },
  {
    code: 'MENU_FUNCTION',
    name: 'Menu Function',
    description: 'Business function (department) a screen or employee belongs to',
    order: 3,
  },
  {
    code: 'COMPANY_TYPE',
    name: 'Company Type',
    description: 'What a company is: agent, supplier, contractor or competitor',
    order: 4,
  },
  {
    code: 'PAYMENT_TERM',
    name: 'Payment Term',
    description: 'Payment terms agreed with a customer or company',
    order: 5,
  },
  { code: 'GENDER', name: 'Gender', order: 10, userValues: true },
  { code: 'AGE_GROUP', name: 'Age Group', order: 11, userValues: true },
  { code: 'LEGAL_FORM', name: 'Legal Form', order: 12, userValues: true },
  { code: 'INDUSTRY_TYPE', name: 'Industry Type', order: 13, userValues: true },
  { code: 'BILL_TO', name: 'Bill To', order: 14, userValues: true },
  { code: 'ADDRESS_TYPE', name: 'Address Type', order: 15, userValues: true },
  { code: 'DOCUMENT_CATEGORY', name: 'Document Category', order: 16, userValues: true },
  { code: 'TAX_TYPE', name: 'Tax Type', order: 17, userValues: true },
  { code: 'COMMUNICATION_CHANNEL', name: 'Communication Channel', order: 18, userValues: true },
  { code: 'CONSENT_STATUS', name: 'Consent Status', order: 19, userValues: true },
  { code: 'SKILL', name: 'Skill', order: 22, userValues: true },
  { code: 'DEVICE_TYPE', name: 'Device Type', order: 23, userValues: true },
  { code: 'USER_ACTIVITY_TYPE', name: 'User Activity Type', order: 24, userValues: true },
  { code: 'ENQUIRY_CHANNEL', name: 'Enquiry Channel', order: 26, userValues: true },
  { code: 'RESIDENCE_TYPE', name: 'Residence Type', order: 27, userValues: true },
  { code: 'REFERRAL', name: 'Referral', order: 28, userValues: true },
  { code: 'SURVEY_TYPE', name: 'Survey Type', order: 30, userValues: true },
  { code: 'REQUEST_STAGE', name: 'Request Stage', order: 30, userValues: false, fixedValues: true },
  {
    code: 'REQUEST_STATUS',
    name: 'Request Status',
    order: 31,
    userValues: false,
    fixedValues: true,
    parentType: 'REQUEST_STAGE',
  },
  { code: 'ENQUIRY_DROP_REASON', name: 'Enquiry Drop Reason', order: 33, userValues: true },
  { code: 'SURVEY_DROP_REASON', name: 'Survey Drop Reason', order: 34, userValues: true },
  { code: 'ROOM_TYPE', name: 'Room Type', order: 35, userValues: true },
  { code: 'SPECIAL_REQUISITE', name: 'Special Requisite', order: 36, userValues: true },
  { code: 'SHIPMENT_MODE', name: 'Shipment Mode', order: 37, userValues: true },
  { code: 'FILE_DOC_TYPE', name: 'File Document Type', order: 32, userValues: true },
  {
    code: 'INTERNATIONAL_SERVICE_TYPE',
    name: 'International Service Type',
    order: 29,
    userValues: true,
  },
];

const PARAMETERS = {
  USER_TYPE: [
    ['EMPLOYEE', 'Employee', true],
    ['CONTRACTOR', 'Contractor', false],
    ['CUSTOMER', 'Customer', false],
    ['COMPETITOR', 'Competitor', false],
    ['SUPPLIER', 'Supplier', false],
    ['AGENT', 'Agent', false],
  ],
  ACCOUNT_STATUS: [
    ['ACTIVE', 'Active', true],
    ['INACTIVE', 'Inactive', false],
    ['SUSPENDED', 'Suspended', false],
  ],
  MENU_FUNCTION: [
    ['SALES', 'Sales', false],
    ['OPERATIONS', 'Operations', false],
    ['STORES', 'Stores', false],
    ['FINANCE', 'Finance', false],
    ['ADMIN', 'Admin', false],
    ['CORPORATE', 'Corporate', false],
  ],
  COMPANY_TYPE: [
    ['AGENT', 'Agent', false],
    ['SUPPLIER', 'Supplier', false],
    ['CONTRACTOR', 'Contractor', false],
    ['COMPETITOR', 'Competitor', false],
  ],
  PAYMENT_TERM: [
    ['CREDIT', 'Credit', true],
    ['ADVANCE_100', '100% Advance', false],
    ['ADVANCE_50', '50% Advance', false],
    ['NET_30', 'Net 30', false],
  ],
  GENDER: [
    ['MALE', 'Male', true],
    ['FEMALE', 'Female', false],
    ['OTHER', 'Other', false],
  ],
  AGE_GROUP: [
    ['UNDER_18', 'Under 18', false],
    ['AGE_18_30', '18 - 30', false],
    ['AGE_31_45', '31 - 45', false],
    ['AGE_46_60', '46 - 60', false],
    ['OVER_60', 'Over 60', false],
  ],
  LEGAL_FORM: [
    ['LLC', 'LLC', false],
    ['SOLE_PROPRIETORSHIP', 'Sole Proprietorship', false],
    ['PARTNERSHIP', 'Partnership', false],
    ['FREE_ZONE', 'Free Zone Company', false],
    ['GOVERNMENT', 'Government', false],
  ],
  INDUSTRY_TYPE: [
    ['REAL_ESTATE', 'Real Estate', false],
    ['HOSPITALITY', 'Hospitality', false],
    ['RETAIL', 'Retail', false],
    ['CONSTRUCTION', 'Construction', false],
    ['OTHER', 'Other', false],
  ],
  BILL_TO: [
    ['CUSTOMER', 'Customer', true],
    ['COMPANY', 'Company', false],
    ['THIRD_PARTY', 'Third Party', false],
  ],
  FILE_DOC_TYPE: [
    ['COMPLIANCE_DOC', 'Compliance Doc', false],
    ['ENQUIRY_DOCUMENT', 'Enquiry Document', false],
    ['SURVEY_DOCUMENT', 'Survey Document', false],
    ['SERVICE_GROUP', 'Service Group', false],
    ['SURVEY_ROOM_PHOTO', 'Survey Room Photo', false],
    ['QUOTE_DOCUMENT', 'Quote Document', false],
    ['CHECKLIST_DOC', 'CheckList Doc', false],
    ['JOB_DOC', 'Job Doc', false],
    ['JOB_INVENTORY_SHEET', 'Job Inventory Sheet', false],
    ['QUOTE_HEADER', 'Quote Header', false],
    ['INVOICE', 'Invoice', false],
    ['LOGO', 'Logo', false],
    ['FACING_SHEET', 'Facing Sheet', false],
    ['SURVEY_SHEET', 'Survey Sheet', false],
    ['STORAGE_DOC', 'Storage Doc', false],
    ['CORPORATE_STOCK_PICKUP', 'Corporate Stock Pickup', false],
    ['CORPORATE_PACKING_LIST', 'Corporate Packing List', false],
    ['CORPORATE_DELIVERY_NOTE', 'Corporate Delivery Note', false],
    ['CORPORATE_STOCK_TRANSFER', 'Corporate Stock Transfer', false],
    ['SIGNED_JOB_CARD', 'Signed Job Card', false],
    ['SIGNED_COMPLETION', 'Signed Completion Certificate', false],
  ],
  REQUEST_STATUS: [
    // Order = parameter value (see src/utils/requestStatus.js).
    ['ENQUIRY_NEW', 'Enquiry New', false, 'ENQUIRY'],
    ['ASSIGNED', 'Enquiry Assigned', true, 'ENQUIRY'],
    ['CONTACTED', 'Enquiry Contacted', false, 'ENQUIRY'],
    ['DROPPED', 'Enquiry Dropped', false, 'ENQUIRY'],
    ['ENQUIRY_SCHEDULED', 'Enquiry Scheduled', false, 'ENQUIRY'],
    ['SURVEY_NEW', 'Survey New', false, 'SURVEY'],
    ['SURVEY_COMPLETED', 'Survey Completed', false, 'SURVEY'],
    ['QUOTE_NEW', 'Quote New', false, 'QUOTE'],
    ['QUOTE_REVIEW_REQUIRED', 'Quote Review Required', false, 'QUOTE'],
    ['QUOTE_REVIEW_COMPLETED', 'Quote Review Completed', false, 'QUOTE'],
    ['QUOTE_SENT', 'Quote Sent', false, 'QUOTE'],
    ['QUOTE_CUSTOMER_APPROVED', 'Quote Customer Approved', false, 'QUOTE'],
    ['QUOTE_REVIEW_REJECTED', 'Quote Review Rejected', false, 'QUOTE'],
    ['QUOTE_REVISED', 'Quote Revised', false, 'QUOTE'],
    ['QUOTE_FOLLOW_UP', 'Quote Follow Up', false, 'QUOTE'],
    ['SURVEY_DROPPED', 'Survey Dropped', false, 'SURVEY'],
  ],
  SURVEY_DROP_REASON: [
    ['CUSTOMER_NOT_AVAILABLE', 'Customer Not Available', false],
    ['INVALID_DATA', 'Invalid Data', false],
    ['FUTURE', 'Future', false],
    ['OTHER', 'Other', false],
  ],
  ROOM_TYPE: [
    ['KITCHEN', 'Kitchen', false],
    ['LIVING_FAMILY', 'Living and Family Rooms', false],
    ['DINING', 'Dining Room', false],
    ['OFFICE_ROOM', 'Office Room', false],
    ['BEDROOM', 'Bedroom', false],
    ['LAUNDRY', 'Laundry', false],
    ['OFFICE_MOVE_ITEMS', 'Office Move Items', false],
    ['OUTDOOR', 'Outdoor', false],
    ['PASSAGE', 'Passage', false],
    ['STORE', 'Store', false],
    ['WASH_ROOM', 'Wash Room', false],
    ['DIRECT', 'Direct', false],
  ],
  SPECIAL_REQUISITE: [
    ['VEHICLE_RELOCATION', 'Vehicle Relocation', false],
    ['SAFE', 'Safe', false],
    ['DISMANTLE', 'Dismantle', false],
    ['CRATING', 'Crating Required', false],
    ['LONG_CARRY', 'Long Carry', false],
    ['STAIR_CARRY', 'Stair Carry', false],
    ['FRAGILE_ITEMS', 'Fragile Items', false],
    ['FORKLIFT', 'Forklift Vehicle Required', false],
    ['VIP_CLIENT', 'VIP Client', false],
    ['SCAFFOLDING', 'Scaffolding Required', false],
  ],
  SHIPMENT_MODE: [
    ['ROAD', 'Road', false],
    ['SEA_FCL', 'Sea FCL', false],
    ['SEA_GROUPAGE', 'Sea Groupage', false],
    ['SEA_LCL', 'Sea LCL', false],
    ['AIR', 'Air', false],
  ],
  REQUEST_STAGE: [
    ['ENQUIRY', 'Enquiry', true],
    ['SURVEY', 'Survey', false],
    ['QUOTE', 'Quote', false],
  ],
  ENQUIRY_DROP_REASON: [
    ['INVALID_ENQUIRY', 'Invalid Enquiry', false],
    ['NOT_CONTACTABLE', 'Not Able To Contact Customer', false],
    ['FUTURE', 'Future', false],
    ['OTHER', 'Other', false],
  ],
  SURVEY_TYPE: [
    ['NO_SURVEY', 'No physical survey required', true],
    ['PHOTO', 'Survey by photo', false],
    ['TEAMS', 'Survey by Teams', false],
    ['ZOOM', 'Survey by Zoom', false],
  ],
  INTERNATIONAL_SERVICE_TYPE: [
    ['INBOUND', 'Inbound', true],
    ['OUTBOUND', 'Outbound', false],
    ['THIRD_COUNTRY', 'Third Country', false],
  ],
  REFERRAL: [
    ['INTERNET_SEARCH', 'Internet Search', true],
    ['CUSTOMER_REFERENCE', 'Customer Reference', false],
    ['SOCIAL_MEDIA', 'Social Media', false],
    ['RADIO_ADS', 'Radio Ads', false],
    ['PROMOTIONAL_EMAIL', 'Promotional Email', false],
    ['GOOGLE_ADS', 'Google Ads', false],
    ['EMOVERS_VAN', 'Emovers Van', false],
    ['EXISTING_CUSTOMER', 'I am existing customer', false],
    ['DONT_REMEMBER', "I don't remember", false],
  ],
  RESIDENCE_TYPE: [
    ['STUDIO', 'Studio', true],
    ['ONE_BEDROOM', 'One Bedroom', false],
    ['TWO_BEDROOM', 'Two Bedroom', false],
    ['THREE_BEDROOM', 'Three Bedroom', false],
    ['VILLA', 'Villa', false],
    ['SPECIFIC_ITEM_MOVE', 'Specific Item Move', false],
    ['BOX_DELIVERY', 'Box Delivery', false],
    ['FOUR_BEDROOM', 'Four Bedroom', false],
    ['TOWN_HOUSE', 'Town-house', false],
  ],
  ENQUIRY_CHANNEL: [
    ['WEB', 'Web', true],
    ['PHONE', 'Phone', false],
    ['EMAIL', 'Email', false],
    ['SALES_PERSON', 'Sales Person', false],
    ['EMPLOYEE', 'Employee', false],
    ['WALK_IN', 'Walk In', false],
    ['REF', 'REF', false],
  ],
  ADDRESS_TYPE: [
    ['HOME', 'Home', true],
    ['OFFICE', 'Office', false],
    ['PICKUP', 'Pickup', false],
    ['DELIVERY', 'Delivery', false],
    ['BILLING', 'Billing', false],
  ],
  DOCUMENT_CATEGORY: [
    ['IDENTITY', 'Identity', false],
    ['LEGAL', 'Legal', false],
    ['FINANCIAL', 'Financial', false],
    ['OTHER', 'Other', false],
  ],
  TAX_TYPE: [
    ['VAT', 'VAT', true],
    ['CORPORATE_TAX', 'Corporate Tax', false],
    ['TRADE_LICENSE', 'Trade License', false],
  ],
  COMMUNICATION_CHANNEL: [
    ['EMAIL', 'Email', true],
    ['SMS', 'SMS', false],
    ['WHATSAPP', 'WhatsApp', false],
    ['PHONE', 'Phone Call', false],
  ],
  CONSENT_STATUS: [
    ['GRANTED', 'Granted', false],
    ['REVOKED', 'Revoked', false],
    ['PENDING', 'Pending', true],
  ],
  SKILL: [
    ['DRIVING', 'Driving', false],
    ['PACKING', 'Packing', false],
    ['LIFTING', 'Heavy Lifting', false],
    ['FURNITURE_ASSEMBLY', 'Furniture Assembly', false],
    ['CARPENTER', 'Carpenter', false],
    ['PLUMBER', 'Plumber', false],
    ['ELECTRICIAN', 'Electrician', false],
    ['PAINTER', 'Painter', false],
    ['AC_TECHNICIAN', 'AC Technician', false],
    ['HANDYMAN', 'Handyman', false],
  ],
  DEVICE_TYPE: [
    ['ANDROID', 'Android', false],
    ['IOS', 'iOS', false],
    ['WEB', 'Web', true],
  ],
  USER_ACTIVITY_TYPE: [
    ['LOGIN', 'Login', false],
    ['LOGOUT', 'Logout', false],
    ['CREATE', 'Create', false],
    ['UPDATE', 'Update', false],
    ['DELETE', 'Delete', false],
    ['VIEW', 'View', false],
  ],
};

const ROLES = [
  ['SUPERADMIN', 'superadmin', 0],
  ['ADMIN', 'admin', 1],
  ['MANAGERS', 'Managers', 2],
  ['COORDINATOR', 'Coordinator', 4],
  ['EXECUTIVE', 'Executive', 5],
  ['SUPERVISOR', 'Supervisor', 5],
  ['TEAM_LEADER', 'Team Leader', 6],
  ['DRIVER', 'Driver', 7],
  ['CREW_MEMBER', 'Crew Member', 7],
];

/** `menu_code` is also the permission key used by the API routes. */
const MENUS = [
  ['OVERVIEW', 'Overview', '/overview', 1, null, 'layout-dashboard'],
  ['SERVICE_REQUESTS', 'Service requests', '/service-requests', 2, null, 'clipboard-list'],
  ['MASTER', 'Master', null, 2, null, 'boxes'],
  ['CUSTOMER', 'Customers', '/customers', 3, 'MASTER', 'user-round'],
  ['COMPANY', 'Companies', '/companies', 4, 'MASTER', 'building-2'],
  ['ADMINISTRATION', 'Administration', null, 5, null, 'shield-check'],
  ['USERS', 'User/Employee', '/users', 6, 'ADMINISTRATION', 'users'],
  ['ROLES', 'Roles', '/roles', 7, 'ADMINISTRATION', 'shield-check'],
  ['MENU_ACCESS', 'Menu access', '/menu-access', 8, 'ADMINISTRATION', 'key-round'],
  ['SETUP', 'Setup', null, 9, null, 'settings'],
  ['PARAMETERS', 'Parameters', '/parameters', 10, 'SETUP', 'list'],
  ['GEOGRAPHY', 'Geography', '/geography', 5, 'MASTER', 'map'],
  ['SERVICE_TYPES', 'Services', '/service-types', 6, 'MASTER', 'list'],
  ['ORGANIZATIONS', 'Organizations', '/organizations', 12, 'SETUP', 'building'],
  ['DOCUMENT_TYPES', 'Document types', null, 13, 'SETUP', 'file-text'],
  ['PROFILES', 'Profiles', null, 14, 'SETUP', 'users'],
  ['DOCUMENTS', 'Documents', null, 15, 'SETUP', 'file-text'],
  ['FINANCE_DETAILS', 'Bank and tax', null, 16, 'SETUP', 'landmark'],
  ['EMPLOYEES', 'Employees', null, 17, 'SETUP', 'user-cog'],
  ['ACCESS_SETUP', 'Access setup', null, 18, 'SETUP', 'key-round'],
  ['SYSTEM_LOGS', 'System logs', null, 19, 'SETUP', 'history'],
  ['FILES', 'Files', null, 20, 'SETUP', 'file'],
];

/**
 * [menu code, create, edit, delete] - listing a menu is what grants "view". SUPERADMIN gets rows
 * too so the Menu Access screen shows real grants, although the API never limits it.
 */
const ROLE_MENUS = {
  SUPERADMIN: [
    ['OVERVIEW', true, true, true],
    ['MASTER', false, false, false],
    ['CUSTOMER', true, true, true],
    ['COMPANY', true, true, true],
    ['ADMINISTRATION', false, false, false],
    ['USERS', true, true, true],
    ['ROLES', true, true, true],
    ['MENU_ACCESS', true, true, true],
  ],
  ADMIN: [
    ['OVERVIEW', false, false, false],
    ['MASTER', false, false, false],
    ['CUSTOMER', true, true, true],
    ['COMPANY', true, true, true],
    ['ADMINISTRATION', false, false, false],
    ['USERS', true, true, true],
    ['ROLES', true, true, false],
    ['MENU_ACCESS', false, true, false],
  ],
  MANAGERS: [
    ['OVERVIEW', false, false, false],
    ['MASTER', false, false, false],
    ['CUSTOMER', true, true, false],
    ['COMPANY', false, false, false],
    ['USERS', true, true, false],
  ],
  COORDINATOR: [
    ['OVERVIEW', false, false, false],
    ['MASTER', false, false, false],
    ['CUSTOMER', false, false, false],
    ['USERS', true, false, false],
  ],
  EXECUTIVE: [
    ['OVERVIEW', false, false, false],
    ['MASTER', false, false, false],
    ['CUSTOMER', false, false, false],
    ['USERS', false, false, false],
  ],
  SUPERVISOR: [
    ['OVERVIEW', false, false, false],
    ['MASTER', false, false, false],
    ['CUSTOMER', false, false, false],
  ],
  TEAM_LEADER: [
    ['OVERVIEW', false, false, false],
    ['MASTER', false, false, false],
    ['CUSTOMER', false, false, false],
  ],
};
// Drivers and crew members start with the same menus as a team leader.
ROLE_MENUS.DRIVER = [...ROLE_MENUS.TEAM_LEADER];
ROLE_MENUS.CREW_MEMBER = [...ROLE_MENUS.TEAM_LEADER];

// Setup screens: administrators manage everything; other roles can read profiles and geography.
const SETUP_MENU_CODES = [
  'PARAMETERS',
  'GEOGRAPHY',
  'ORGANIZATIONS',
  'DOCUMENT_TYPES',
  'PROFILES',
  'DOCUMENTS',
  'FINANCE_DETAILS',
  'EMPLOYEES',
  'ACCESS_SETUP',
  'SYSTEM_LOGS',
  'FILES',
];
for (const role of ['SUPERADMIN', 'ADMIN']) {
  ROLE_MENUS[role].push(
    ['SETUP', false, false, false],
    ...SETUP_MENU_CODES.map((code) => [code, true, true, true]),
    ['SERVICE_TYPES', true, true, true],
    ['SERVICE_REQUESTS', true, true, true],
  );
}
for (const role of ['MANAGERS', 'COORDINATOR', 'EXECUTIVE']) {
  ROLE_MENUS[role].push(['SERVICE_REQUESTS', true, true, false]);
}
for (const role of ['MANAGERS']) {
  ROLE_MENUS[role].push(['PROFILES', true, true, false], ['GEOGRAPHY', false, false, false]);
}
for (const role of [
  'COORDINATOR',
  'EXECUTIVE',
  'SUPERVISOR',
  'TEAM_LEADER',
  'DRIVER',
  'CREW_MEMBER',
]) {
  ROLE_MENUS[role].push(['PROFILES', false, false, false], ['GEOGRAPHY', false, false, false]);
}

/**
 * Business functions and the screens each owns. A screen owned by no function is open to every
 * role that has it; Admin and Super Admin roles see every function.
 */
const ALL_MENU_CODES = MENUS.map(([code]) => code);
const FUNCTION_MENUS = {
  SALES: ['OVERVIEW', 'MASTER', 'CUSTOMER', 'SERVICE_REQUESTS'],
  OPERATIONS: ['OVERVIEW', 'MASTER', 'CUSTOMER', 'SERVICE_REQUESTS'],
  STORES: ['OVERVIEW'],
  FINANCE: ['OVERVIEW', 'MASTER', 'CUSTOMER', 'COMPANY'],
  ADMIN: ALL_MENU_CODES,
  CORPORATE: ['OVERVIEW'],
};
// The add/edit/delete/print/export values this type held before it became business functions.
const RETIRED_ACTIONS = ['ADD', 'EDIT', 'DELETE', 'PRINT', 'EXPORT'];

async function seedParameters() {
  for (const type of PARAMETER_TYPES) {
    const saved = await prisma.parameter_type.upsert({
      where: { code: type.code },
      update: {},
      create: {
        code: type.code,
        name: type.name,
        description: type.description,
        module_code: type.userValues ? 'SETUP' : 'USER',
        is_system: !type.userValues,
        allow_user_values: Boolean(type.userValues),
        display_order: type.order,
      },
      select: { parameter_type_id: true },
    });
    for (const [index, [code, label, isDefault, parentCode]] of PARAMETERS[type.code].entries()) {
      const exists = await prisma.parameter.findFirst({
        where: { parameter_type_id: saved.parameter_type_id, code },
        select: { parameter_id: true },
      });
      if (exists) continue;
      // e.g. a status under its stage (parent type seeded first).
      const parent = parentCode
        ? await prisma.parameter.findFirst({
            where: { code: parentCode, parameter_type: { code: type.parentType } },
            select: { parameter_id: true },
          })
        : null;
      await prisma.parameter.create({
        data: {
          parameter_type_id: saved.parameter_type_id,
          code,
          label,
          // Types code refers to by value get their position (1, 2, 3...); others are numbered
          // automatically.
          ...(type.fixedValues && { parameter_value: index + 1 }),
          parent_parameter_id: parent?.parameter_id ?? null,
          display_order: index + 1,
          is_default: isDefault,
          is_fixed: !type.userValues,
        },
      });
    }
  }
}

const SERVICE_TYPES = {
  HOME_RELOCATION: [
    'Home Relocation',
    'Home Relocation with Handy man',
    'Home Relocation with Disposal',
    'Home Relocation with Storage',
    'Home Relocation without Pack or Unpack',
    'Painting',
    'Cleaning',
    'Painting & Cleaning',
    'Man with Van- Home',
  ],
  OFFICE_RELOCATION: [
    'Office Relocation with Furniture',
    'Office Relocation without Furniture',
    'Office Relocation with Furniture(Storage Included)',
    'Office Relocation with Furniture(Handyman Included)',
    'Office Relocation with Furniture(Disposal Included)',
    'Office Relocation without Furniture(Storage Included)',
    'Office Relocation without Furniture(Handyman Included)',
    'Office Relocation without Furniture(Disposal Included)',
    'Office Relocation',
    'Office Relocation - Handy Man Services',
    'Event Arrangement',
    'Exhibition Items Delivery',
    'Exhibition Items Pick Up, Delivery And Pick Up',
    'Other Item Move',
    'Man with Van-Office',
  ],
  INTERNATIONAL_RELOCATION: [
    'Import Port To Door Groupage',
    'Import Port To Door Road',
    'Import Port To Door Sea FCL',
    'Import Port To Door LCL',
    'Import Port To Door Air',
    'Export Door To Door Sea FCL',
    'Export Door To Port Sea FCL',
    'Export Door To Door Air',
    'Export Door To Door Groupage',
    'Export Door To Door Road',
    'Export Door To Door LCL',
    'Export Door To Port LCL',
    'Controlled Sea FCL',
    'Controlled LCL',
    'Controlled Groupage',
    'Controlled Road',
    'Export Door To Port Air',
    'Export Packing & Loading',
    'Export Door To Port FCL-Agent',
    'Import Port to Door Innovation',
    'Export Door to Port Innovation',
    'Controlled Door to Door Air',
    'Third Country',
    'Controlled Door to Door FCL',
    'Controlled Door to Door LCL',
    'Export Warehouse to Door Groupage',
    'Controlled Door to Door Road',
    'Import Door to Door FCL',
    'Import Door to Door LCL',
    'Import Door To Door Road',
    'Import Door To Door Groupage',
    'Import Door To Door Air',
  ],
  FURNITURE_INSTALLATION: [
    'Furniture Delivery And Installation',
    'Furniture Pick Up And Delivery',
    'Furniture & Chandelier Delivery And Fixing',
    'Furniture & Chandelier Installation',
    'Furniture Checking',
    'Furniture Delivery',
    'Furniture Dismantling',
    'Furniture Installation',
    'Furniture Offloading',
    'Furniture Offloading And Installation',
    'Furniture Pick Up, Delivery And Installation',
    'Furniture Pickup',
    'Furniture Segregation',
    'Furniture Unloading, Delivery And Installation',
  ],
  STORAGE_SERVICES: [
    'Storage Delivery & Unpacking',
    'Storage Delivery & Pickup',
    'Storage Furniture Move',
    'Storage Packing',
    'Storage Pickup',
    'Storage Delivery',
    'Storage',
    'Storage Direct',
    'Storage Direct with Quote',
    'Storage External',
    'Corporate Storage',
  ],
};
// Inactive in the old system.
const INACTIVE_SERVICE_TYPES = new Set([
  'Controlled Sea FCL',
  'Controlled LCL',
  'Controlled Groupage',
  'Controlled Road',
  'Export Door To Port FCL-Agent',
]);

const SERVICE_GROUPS = [
  ['HOME_RELOCATION', 'Home Relocation'],
  ['OFFICE_RELOCATION', 'Office Relocation'],
  ['INTERNATIONAL_RELOCATION', 'International Relocation'],
  ['FURNITURE_INSTALLATION', 'Furniture Installation'],
  ['STORAGE_SERVICES', 'Storage Services'],
];

async function seedServiceTypes() {
  for (const [index, [code, name]] of SERVICE_GROUPS.entries()) {
    await prisma.$executeRaw`
      INSERT INTO service_group (code, name, display_order)
      VALUES (${code}, ${name}, ${index + 1})
      ON CONFLICT (code) DO NOTHING`;
  }
  for (const [groupCode, names] of Object.entries(SERVICE_TYPES)) {
    for (const [index, name] of names.entries()) {
      await prisma.$executeRaw`
        INSERT INTO service_type (service_group_id, name, display_order, is_active)
        SELECT g.service_group_id, ${name}, ${index + 1}, ${!INACTIVE_SERVICE_TYPES.has(name)}
        FROM service_group g
        WHERE g.code = ${groupCode}
        ON CONFLICT (service_group_id, name) DO NOTHING`;
    }
  }
  // Images uploaded before files had a type are service group images.
  await prisma.$executeRaw`
    UPDATE file_doc f SET file_doc_type_id = p.parameter_id
    FROM parameter p JOIN parameter_type t ON t.parameter_type_id = p.parameter_type_id
    WHERE t.code = 'FILE_DOC_TYPE' AND p.code = 'SERVICE_GROUP'
      AND f.file_doc_type_id IS NULL
      AND f.file_doc_id IN (SELECT file_id FROM service_group WHERE file_id IS NOT NULL)`;
}

async function seedRoles() {
  for (const [role_code, name, role_level] of ROLES) {
    await prisma.role.upsert({
      where: { role_code },
      update: {},
      create: { role_code, name, role_level },
    });
  }
}

async function seedMenus() {
  const menuIds = new Map();
  for (const [menu_code, menu_name, page_url, menu_order, parentCode, icon] of MENUS) {
    const menu = await prisma.menu_item.upsert({
      where: { menu_code },
      update: {
        menu_name,
        page_url,
        menu_order,
        is_active: true,
        menu_parent_id: parentCode ? (menuIds.get(parentCode)?.id ?? null) : null,
        css_class: icon,
        is_main_menu: parentCode === null,
      },
      create: {
        menu_code,
        menu_name,
        page_url,
        menu_order,
        is_active: true,
        menu_parent_id: parentCode ? (menuIds.get(parentCode)?.id ?? null) : null,
        css_class: icon,
        is_main_menu: parentCode === null,
      },
      select: { menu_item_id: true },
    });
    menuIds.set(menu_code, { id: menu.menu_item_id, pageUrl: page_url });
  }
  return menuIds;
}

async function seedRoleMenus(menuIds) {
  for (const [role_code, grants] of Object.entries(ROLE_MENUS)) {
    const role = await prisma.role.findUnique({
      where: { role_code },
      select: { role_id: true },
    });
    if (!role) continue;
    for (const [menuCode, create = false, edit = false, remove = false] of grants) {
      const menu = menuIds.get(menuCode);
      if (!menu) continue;
      const grant = { is_create: create, is_edit: edit, is_delete: remove };
      await prisma.menu_role.upsert({
        where: { role_id_menu_item_id: { role_id: role.role_id, menu_item_id: menu.id } },
        update: grant,
        create: {
          role_id: role.role_id,
          menu_item_id: menu.id,
          page_url: menu.pageUrl,
          ...grant,
        },
      });
    }
  }
}

async function findParameterId(typeCode, code) {
  const parameter = await prisma.parameter.findFirst({
    where: { code, parameter_type: { code: typeCode } },
    select: { parameter_id: true },
  });
  return parameter.parameter_id;
}

/** Drops the retired action values, then ties each business function to its screens. */
async function seedMenuFunctions(menuIds) {
  const retired = await prisma.parameter.findMany({
    where: { code: { in: RETIRED_ACTIONS }, parameter_type: { code: 'MENU_FUNCTION' } },
    select: { parameter_id: true },
  });
  const retiredIds = retired.map((row) => row.parameter_id);
  if (retiredIds.length > 0) {
    await prisma.menu_function.deleteMany({ where: { function_id: { in: retiredIds } } });
    await prisma.employee_function.deleteMany({ where: { function_id: { in: retiredIds } } });
    await prisma.parameter.deleteMany({ where: { parameter_id: { in: retiredIds } } });
  }
  for (const [functionCode, menuCodes] of Object.entries(FUNCTION_MENUS)) {
    const functionId = await findParameterId('MENU_FUNCTION', functionCode);
    for (const menuCode of menuCodes) {
      const menu = menuIds.get(menuCode);
      if (!menu) continue;
      await prisma.menu_function.upsert({
        where: { menu_item_id_function_id: { menu_item_id: menu.id, function_id: functionId } },
        update: {},
        create: { menu_item_id: menu.id, function_id: functionId },
      });
    }
  }
}

/** Creates the first administrator only when credentials are supplied and the login does not exist. */
async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return 'skipped (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set)';

  const existing = await prisma.app_user.findUnique({
    where: { username: email },
    select: { user_id: true },
  });
  if (existing) return 'already exists';

  const [statusId, userTypeId, role] = await Promise.all([
    findParameterId('ACCOUNT_STATUS', 'ACTIVE'),
    findParameterId('USER_TYPE', 'EMPLOYEE'),
    prisma.role.findUnique({ where: { role_code: 'SUPERADMIN' }, select: { role_id: true } }),
  ]);
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 12));

  await prisma.$transaction(async (tx) => {
    const profile = await tx.profile.create({
      data: {
        user_type_id: userTypeId,
        status_id: statusId,
        name: 'Super',
        last_name: 'Admin',
        email,
        designation: 'Super Admin',
      },
      select: { profile_id: true },
    });
    await tx.app_user.create({
      data: {
        profile_id: profile.profile_id,
        username: email,
        password_hash: passwordHash,
        must_change_password: false,
        role_id: role.role_id,
        account_status_id: statusId,
      },
    });
  });
  return 'created';
}

/** [iso2, iso3, name, dial code, nationality] - the countries staff and customers come from. */
const COUNTRIES = [
  ['AE', 'ARE', 'United Arab Emirates', '+971', 'Emirati'],
  ['SA', 'SAU', 'Saudi Arabia', '+966', 'Saudi'],
  ['QA', 'QAT', 'Qatar', '+974', 'Qatari'],
  ['KW', 'KWT', 'Kuwait', '+965', 'Kuwaiti'],
  ['BH', 'BHR', 'Bahrain', '+973', 'Bahraini'],
  ['OM', 'OMN', 'Oman', '+968', 'Omani'],
  ['IN', 'IND', 'India', '+91', 'Indian'],
  ['PK', 'PAK', 'Pakistan', '+92', 'Pakistani'],
  ['BD', 'BGD', 'Bangladesh', '+880', 'Bangladeshi'],
  ['LK', 'LKA', 'Sri Lanka', '+94', 'Sri Lankan'],
  ['NP', 'NPL', 'Nepal', '+977', 'Nepalese'],
  ['PH', 'PHL', 'Philippines', '+63', 'Filipino'],
  ['ID', 'IDN', 'Indonesia', '+62', 'Indonesian'],
  ['EG', 'EGY', 'Egypt', '+20', 'Egyptian'],
  ['JO', 'JOR', 'Jordan', '+962', 'Jordanian'],
  ['LB', 'LBN', 'Lebanon', '+961', 'Lebanese'],
  ['SY', 'SYR', 'Syria', '+963', 'Syrian'],
  ['IQ', 'IRQ', 'Iraq', '+964', 'Iraqi'],
  ['IR', 'IRN', 'Iran', '+98', 'Iranian'],
  ['YE', 'YEM', 'Yemen', '+967', 'Yemeni'],
  ['SD', 'SDN', 'Sudan', '+249', 'Sudanese'],
  ['MA', 'MAR', 'Morocco', '+212', 'Moroccan'],
  ['TN', 'TUN', 'Tunisia', '+216', 'Tunisian'],
  ['KE', 'KEN', 'Kenya', '+254', 'Kenyan'],
  ['NG', 'NGA', 'Nigeria', '+234', 'Nigerian'],
  ['GH', 'GHA', 'Ghana', '+233', 'Ghanaian'],
  ['ET', 'ETH', 'Ethiopia', '+251', 'Ethiopian'],
  ['UG', 'UGA', 'Uganda', '+256', 'Ugandan'],
  ['GB', 'GBR', 'United Kingdom', '+44', 'British'],
  ['US', 'USA', 'United States', '+1', 'American'],
  ['CA', 'CAN', 'Canada', '+1', 'Canadian'],
  ['AU', 'AUS', 'Australia', '+61', 'Australian'],
  ['DE', 'DEU', 'Germany', '+49', 'German'],
  ['FR', 'FRA', 'France', '+33', 'French'],
  ['RU', 'RUS', 'Russia', '+7', 'Russian'],
  ['CN', 'CHN', 'China', '+86', 'Chinese'],
  ['TR', 'TUR', 'Turkey', '+90', 'Turkish'],
];

/** Main states and cities per country (by ISO2): [state code, state name, [cities]]. */
const STATES_BY_COUNTRY = {
  AE: [
    ['AZ', 'Abu Dhabi', ['Abu Dhabi', 'Al Ain', 'Madinat Zayed']],
    ['DU', 'Dubai', ['Dubai']],
    ['SH', 'Sharjah', ['Sharjah', 'Khor Fakkan', 'Kalba']],
    ['AJ', 'Ajman', ['Ajman']],
    ['UQ', 'Umm Al Quwain', ['Umm Al Quwain']],
    ['RK', 'Ras Al Khaimah', ['Ras Al Khaimah']],
    ['FU', 'Fujairah', ['Fujairah', 'Dibba Al-Fujairah']],
  ],
  IN: [
    ['KL', 'Kerala', ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kannur']],
    ['TN', 'Tamil Nadu', ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem']],
    ['KA', 'Karnataka', ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi']],
    ['MH', 'Maharashtra', ['Mumbai', 'Pune', 'Nagpur', 'Nashik']],
    ['DL', 'Delhi', ['New Delhi']],
    ['TG', 'Telangana', ['Hyderabad', 'Warangal']],
    ['AP', 'Andhra Pradesh', ['Visakhapatnam', 'Vijayawada', 'Tirupati']],
    ['GJ', 'Gujarat', ['Ahmedabad', 'Surat', 'Vadodara']],
    ['WB', 'West Bengal', ['Kolkata', 'Howrah']],
    ['UP', 'Uttar Pradesh', ['Lucknow', 'Kanpur', 'Noida']],
    ['PB', 'Punjab', ['Ludhiana', 'Amritsar']],
    ['RJ', 'Rajasthan', ['Jaipur', 'Jodhpur', 'Udaipur']],
  ],
  SA: [
    ['RI', 'Riyadh', ['Riyadh']],
    ['MK', 'Makkah', ['Makkah', 'Jeddah', 'Taif']],
    ['MD', 'Madinah', ['Madinah']],
    ['EP', 'Eastern Province', ['Dammam', 'Khobar', 'Dhahran']],
  ],
  QA: [
    ['DA', 'Doha', ['Doha']],
    ['RA', 'Al Rayyan', ['Al Rayyan']],
    ['WA', 'Al Wakrah', ['Al Wakrah']],
  ],
  KW: [
    ['KU', 'Al Asimah', ['Kuwait City']],
    ['HA', 'Hawalli', ['Hawalli', 'Salmiya']],
    ['AH', 'Al Ahmadi', ['Al Ahmadi', 'Fahaheel']],
  ],
  BH: [
    ['CA', 'Capital', ['Manama']],
    ['MU', 'Muharraq', ['Muharraq']],
    ['SO', 'Southern', ['Riffa']],
  ],
  OM: [
    ['MA', 'Muscat', ['Muscat', 'Seeb']],
    ['DH', 'Dhofar', ['Salalah']],
    ['BA', 'Al Batinah North', ['Sohar']],
  ],
  PK: [
    ['SD', 'Sindh', ['Karachi', 'Hyderabad']],
    ['PJ', 'Punjab', ['Lahore', 'Faisalabad', 'Rawalpindi']],
    ['IS', 'Islamabad Capital Territory', ['Islamabad']],
    ['KP', 'Khyber Pakhtunkhwa', ['Peshawar']],
  ],
  BD: [
    ['DH', 'Dhaka', ['Dhaka', 'Gazipur']],
    ['CH', 'Chattogram', ['Chattogram', "Cox's Bazar"]],
  ],
  LK: [
    ['WP', 'Western', ['Colombo', 'Negombo']],
    ['CP', 'Central', ['Kandy']],
  ],
  NP: [
    ['BA', 'Bagmati', ['Kathmandu', 'Lalitpur']],
    ['GA', 'Gandaki', ['Pokhara']],
  ],
  PH: [
    ['NCR', 'Metro Manila', ['Manila', 'Quezon City', 'Makati']],
    ['CEB', 'Cebu', ['Cebu City']],
    ['DAV', 'Davao del Sur', ['Davao City']],
  ],
  EG: [
    ['C', 'Cairo', ['Cairo']],
    ['GZ', 'Giza', ['Giza']],
    ['ALX', 'Alexandria', ['Alexandria']],
  ],
  GB: [
    ['ENG', 'England', ['London', 'Manchester', 'Birmingham']],
    ['SCT', 'Scotland', ['Edinburgh', 'Glasgow']],
    ['WLS', 'Wales', ['Cardiff']],
  ],
  US: [
    ['NY', 'New York', ['New York City', 'Buffalo']],
    ['CA', 'California', ['Los Angeles', 'San Francisco', 'San Diego']],
    ['TX', 'Texas', ['Houston', 'Dallas', 'Austin']],
    ['FL', 'Florida', ['Miami', 'Orlando']],
  ],
};

/** Countries, nationalities, UAE emirates and cities. Safe to run again: existing rows are kept. */
async function seedGeography() {
  for (const [iso2, iso3, name, dial, nationality] of COUNTRIES) {
    const country = await prisma.country.upsert({
      where: { iso2 },
      update: {},
      create: { iso2, iso3, name, dial_code: dial },
      select: { country_id: true },
    });
    await prisma.nationality.upsert({
      where: { code: iso2 },
      update: {},
      create: { code: iso2, name: nationality, country_id: country.country_id },
    });
  }

  for (const [iso2, states] of Object.entries(STATES_BY_COUNTRY)) {
    const country = await prisma.country.findUnique({
      where: { iso2 },
      select: { country_id: true },
    });
    for (const [code, name, cities] of states) {
      const existing = await prisma.state.findFirst({
        where: { country_id: country.country_id, name },
        select: { state_id: true },
      });
      const state =
        existing ??
        (await prisma.state.create({
          data: { country_id: country.country_id, code, name },
          select: { state_id: true },
        }));
      for (const city of cities) {
        const found = await prisma.city.findFirst({
          where: { country_id: country.country_id, state_id: state.state_id, name: city },
          select: { city_id: true },
        });
        if (!found) {
          await prisma.city.create({
            data: { country_id: country.country_id, state_id: state.state_id, name: city },
          });
        }
      }
    }
  }
}

async function main() {
  await seedParameters();
  await seedServiceTypes();
  await seedRoles();
  const menuIds = await seedMenus();
  await seedRoleMenus(menuIds);
  await seedMenuFunctions(menuIds);
  await seedGeography();
  const admin = await seedAdmin();
  // eslint-disable-next-line no-console
  console.log(
    `Seed complete. Roles: ${ROLES.length}. Menus: ${MENUS.length}. Admin login: ${admin}.`,
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
