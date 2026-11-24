import access from './access.js';
import employee from './employee.js';
import geography from './geography.js';
import people from './people.js';
import service from './service.js';
import setup from './setup.js';
import system from './system.js';

/**
 * Every table exposed through the generic CRUD engine.
 * Not here on purpose: app_user (own /users module), role (own /roles module), customer and
 * company (own modules with their profile logic) and password_reset_token (never exposed).
 */
export const RESOURCES = [
  ...setup,
  ...geography,
  ...service,
  ...people,
  ...employee,
  ...access,
  ...system,
];
