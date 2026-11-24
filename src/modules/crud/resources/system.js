import { PATTERNS } from '../../../utils/patterns.js';
import { OPERATIONS, f, key } from '../fields.js';
import { FILTER, REQUIRED, SEARCH, SOFT_DELETE, defineResource } from './helpers.js';

const system = (definition) =>
  defineResource({ tag: 'system', menu: 'SYSTEM_LOGS', adminOnly: true, ...definition });
const NEWEST_FIRST = (field) => ({ field, order: 'desc' });

export default [
  system({
    name: 'user-devices',
    model: 'user_device',
    title: 'User devices',
    singular: 'User device',
    audit: 'basic',
    keys: [key.big('user_device_id')],
    fields: {
      userId: f.bigRef('user_id', { ...REQUIRED, immutable: true }),
      deviceIdentifier: f.text('device_identifier', {
        ...REQUIRED,
        min: 4,
        max: 400,
        search: true,
      }),
      platformId: f.param('platform_id', 'DEVICE_TYPE', REQUIRED),
      pushToken: f.text('push_token', { min: 8, max: 500 }),
      appVersion: f.text('app_version', { min: 1, max: 20 }),
      lastSeenAt: f.dateTime('last_seen_at', { readOnly: true, sort: true }),
      isActive: f.bool('is_active', FILTER),
    },
  }),
  system({
    name: 'auth-sessions',
    model: 'auth_session',
    title: 'Sign-in sessions',
    singular: 'Session',
    audit: 'none',
    // "Delete" revokes the session; revoked sessions stay visible for review.
    softDelete: { column: 'revoked_at', hide: false },
    operations: OPERATIONS.readAndDelete,
    keys: [key.uuid('session_id')],
    defaultSort: NEWEST_FIRST('issuedAt'),
    fields: {
      userId: f.bigRef('user_id'),
      issuedAt: f.dateTime('issued_at', { sort: true }),
      expiresAt: f.dateTime('expires_at', { sort: true }),
      revokedAt: f.dateTime('revoked_at'),
      ipAddress: f.text('ip_address', { max: 45 }),
      userAgent: f.text('user_agent', { max: 400 }),
      isMobile: f.bool('is_mobile', FILTER),
    },
  }),
  system({
    name: 'user-activities',
    model: 'user_activity',
    title: 'User activity',
    singular: 'Activity entry',
    audit: 'none',
    operations: OPERATIONS.readOnly,
    keys: [key.big('activity_id')],
    defaultSort: NEWEST_FIRST('occurredAt'),
    fields: {
      occurredAt: f.dateTime('occurred_at', { sort: true }),
      userId: f.bigRef('user_id'),
      organizationId: f.bigRef('organization_id'),
      activityTypeId: f.param('activity_type_id', 'USER_ACTIVITY_TYPE'),
      menuItemId: f.ref('menu_item_id'),
      entityName: f.text('entity_name', { max: 60, ...FILTER }),
      entityId: f.text('entity_id', { max: 40, ...FILTER }),
      result: f.oneOf('result', ['SUCCESS', 'FAILURE', 'DENIED']),
      ipAddress: f.text('ip_address', { max: 45 }),
      userAgent: f.text('user_agent', { max: 400 }),
    },
  }),
  system({
    name: 'audit-logs',
    model: 'audit_log',
    title: 'Audit log',
    singular: 'Audit entry',
    audit: 'none',
    operations: OPERATIONS.readOnly,
    keys: [key.big('audit_id')],
    defaultSort: NEWEST_FIRST('occurredAt'),
    fields: {
      occurredAt: f.dateTime('occurred_at', { sort: true }),
      tableName: f.text('table_name', { max: 63, ...FILTER }),
      recordId: f.text('record_id', { max: 40, ...FILTER }),
      action: f.oneOf('action', ['I', 'U', 'D']),
      changedBy: f.bigRef('changed_by'),
      oldValues: f.json('old_values'),
      newValues: f.json('new_values'),
    },
  }),
  system({
    name: 'files',
    model: 'file_object',
    title: 'Files',
    singular: 'File',
    menu: 'FILES',
    adminOnly: false,
    softDelete: SOFT_DELETE,
    keys: [key.big('file_id')],
    optionLabel: ['original_name'],
    fields: {
      storageProvider: f.oneOf('storage_provider', ['LOCAL', 'AZURE_BLOB', 'S3']),
      storageKey: f.text('storage_key', { ...REQUIRED, min: 3, max: 500, immutable: true }),
      originalName: f.text('original_name', { ...REQUIRED, ...SEARCH, min: 1, max: 255 }),
      mimeType: f.text('mime_type', { min: 3, max: 100, ...FILTER }),
      sizeBytes: f.bigInt('size_bytes', { max: 5368709120 }),
      sha256: f.pattern('sha256', PATTERNS.sha256, { max: 64 }),
    },
  }),
];
