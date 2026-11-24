-- A person's organizations: employee_organization (all of them) + employee.organization_id (home).
-- The organization being worked in lives on the sign-in session, not on app_user.

-- 1. Make sure every home organization is also in the person's organization list.
INSERT INTO employee_organization (profile_id, organization_id)
SELECT e.profile_id, e.organization_id
FROM employee e
WHERE NOT EXISTS (
  SELECT 1 FROM employee_organization eo
  WHERE eo.profile_id = e.profile_id AND eo.organization_id = e.organization_id
);

-- 2. Active organization per sign-in (NULL for a super admin = all organizations).
ALTER TABLE auth_session ADD COLUMN organization_id bigint;
ALTER TABLE auth_session ADD CONSTRAINT fk_auth_session_organization_id
  FOREIGN KEY (organization_id) REFERENCES organization (organization_id) ON DELETE SET NULL;
COMMENT ON COLUMN auth_session.organization_id IS
  'Organization chosen in the menu for this sign-in; NULL = all organizations (super admin only).';

-- 3. Unused or replaced login columns.
ALTER TABLE app_user DROP CONSTRAINT IF EXISTS fk_app_user_default_organization_id;
DROP INDEX IF EXISTS ix_app_user_default_organization_id;
ALTER TABLE app_user
  DROP COLUMN IF EXISTS default_organization_id,
  DROP COLUMN IF EXISTS must_change_password,
  DROP COLUMN IF EXISTS mfa_enabled,
  DROP COLUMN IF EXISTS mfa_secret_enc;

-- 4. Employee emergency contacts and their "relationship" dropdown are not used.
DROP TABLE IF EXISTS employee_emergency_contact;
DELETE FROM parameter
WHERE parameter_type_id IN (
  SELECT parameter_type_id FROM parameter_type WHERE code = 'RELATIONSHIP_TO_EMPLOYEE'
);
DELETE FROM parameter_type WHERE code = 'RELATIONSHIP_TO_EMPLOYEE';

-- 5. The Users screen covers employees too.
UPDATE menu_item SET menu_name = 'User/Employee' WHERE menu_code = 'USERS';
