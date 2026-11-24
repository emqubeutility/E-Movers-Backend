-- The login role (role table) is now each person's only role, from Admin down to Crew Member.
-- Trades such as carpenter or plumber are skills (employee_skill), not roles.

-- 1. New roles; they start with the same menus as Team Leader.
INSERT INTO role (role_code, name, role_level)
VALUES ('DRIVER', 'Driver', 7), ('CREW_MEMBER', 'Crew Member', 7)
ON CONFLICT (role_code) DO NOTHING;

INSERT INTO menu_role (role_id, menu_item_id, page_url, is_create, is_edit, is_delete)
SELECT r.role_id, mr.menu_item_id, mr.page_url, mr.is_create, mr.is_edit, mr.is_delete
FROM menu_role mr
JOIN role tl ON tl.role_id = mr.role_id AND tl.role_code = 'TEAM_LEADER'
CROSS JOIN role r
WHERE r.role_code IN ('DRIVER', 'CREW_MEMBER')
ON CONFLICT (role_id, menu_item_id) DO NOTHING;

-- 2. Drop the employee's separate working role.
ALTER TABLE employee DROP CONSTRAINT IF EXISTS fk_employee_employee_role_id;
DROP INDEX IF EXISTS ix_employee_employee_role_id;
ALTER TABLE employee DROP COLUMN IF EXISTS employee_role_id;

-- 3. Remove the EMPLOYEE_ROLE dropdown and its values.
DELETE FROM parameter
WHERE parameter_type_id IN (SELECT parameter_type_id FROM parameter_type WHERE code = 'EMPLOYEE_ROLE');
DELETE FROM parameter_type WHERE code = 'EMPLOYEE_ROLE';
