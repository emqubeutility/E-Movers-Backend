-- Staff identity: employee code sign-in, site user / employee type, main address link, teams.
BEGIN;

-- 1. Person type. A site user is office staff (email required); an employee is field staff.
ALTER TABLE employee ADD COLUMN IF NOT EXISTS person_type varchar(12) NOT NULL DEFAULT 'EMPLOYEE';
ALTER TABLE employee ADD CONSTRAINT ck_employee_person_type CHECK (person_type IN ('SITE_USER', 'EMPLOYEE'));
COMMENT ON COLUMN employee.person_type IS 'SITE_USER = office staff with a login and an e-mail. EMPLOYEE = field staff (e-mail optional).';

-- 2. Every login gets an employee row, so every login has an employee code.
--    The super administrator gets the code ADMIN; everyone else EMP<profile id>.
INSERT INTO employee (profile_id, employee_code, organization_id, employee_role_id, person_type)
SELECT u.profile_id,
       CASE WHEN r.role_code = 'SUPERADMIN' THEN 'ADMIN' ELSE 'EMP' || u.profile_id END,
       COALESCE(u.default_organization_id,
                (SELECT organization_id FROM organization WHERE is_head_office ORDER BY organization_id LIMIT 1)),
       (SELECT p.parameter_id
          FROM parameter p JOIN parameter_type t ON t.parameter_type_id = p.parameter_type_id
         WHERE t.code = 'EMPLOYEE_ROLE'
           AND p.code = CASE WHEN r.role_code IN ('SUPERADMIN', 'ADMIN') THEN 'MANAGER' ELSE 'HELPER' END),
       'SITE_USER'
  FROM app_user u
  JOIN role r ON r.role_id = u.role_id
 WHERE u.deleted_at IS NULL
   AND NOT EXISTS (SELECT 1 FROM employee e WHERE e.profile_id = u.profile_id);

-- Existing people with a login: team leaders and supervisors are field staff, the rest are site users.
UPDATE employee e
   SET person_type = CASE WHEN r.role_code IN ('TEAM_LEADER', 'SUPERVISOR') THEN 'EMPLOYEE' ELSE 'SITE_USER' END
  FROM app_user u JOIN role r ON r.role_id = u.role_id
 WHERE u.profile_id = e.profile_id AND u.deleted_at IS NULL;

-- 3. The employee code is the sign-in name from now on (the e-mail stays on the profile).
UPDATE app_user u SET username = e.employee_code FROM employee e WHERE e.profile_id = u.profile_id;
COMMENT ON COLUMN app_user.username IS 'Login name (case-insensitive) = the employee code.';

ALTER TABLE employee ADD CONSTRAINT ck_employee_code_format CHECK (employee_code ~ '^[A-Z0-9][A-Z0-9-]{1,19}$');

-- 4. Main address of a person. The country / state / city live only on the address row.
ALTER TABLE profile ADD COLUMN IF NOT EXISTS address_id bigint;
ALTER TABLE profile ADD CONSTRAINT fk_profile_address_id
    FOREIGN KEY (address_id) REFERENCES address (address_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_profile_address_id ON profile (address_id);
COMMENT ON COLUMN profile.address_id IS 'The person''s main address (country, state and city are read from the address).';

-- 5. Teams: a team leader and the crew members assigned to them. A person can be in many teams.
CREATE TABLE IF NOT EXISTS team_member (
    leader_profile_id bigint NOT NULL,
    member_profile_id bigint NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    created_by        bigint,
    CONSTRAINT pk_team_member PRIMARY KEY (leader_profile_id, member_profile_id),
    CONSTRAINT ck_team_member_not_self CHECK (leader_profile_id <> member_profile_id),
    CONSTRAINT fk_team_member_leader FOREIGN KEY (leader_profile_id) REFERENCES employee (profile_id) ON DELETE CASCADE,
    CONSTRAINT fk_team_member_member FOREIGN KEY (member_profile_id) REFERENCES employee (profile_id) ON DELETE CASCADE,
    CONSTRAINT fk_team_member_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS ix_team_member_member ON team_member (member_profile_id);
COMMENT ON TABLE team_member IS 'Crew members assigned to a team leader.';

-- 6. Two staff profiles cannot share an e-mail address.
CREATE OR REPLACE FUNCTION fn_check_staff_email() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.email IS NOT NULL AND NEW.deleted_at IS NULL
       AND NEW.user_type_id = (SELECT p.parameter_id
                                 FROM parameter p JOIN parameter_type t ON t.parameter_type_id = p.parameter_type_id
                                WHERE t.code = 'USER_TYPE' AND p.code = 'EMPLOYEE')
       AND EXISTS (SELECT 1 FROM profile o
                    WHERE o.email = NEW.email AND o.user_type_id = NEW.user_type_id
                      AND o.deleted_at IS NULL AND o.profile_id <> COALESCE(NEW.profile_id, -1)) THEN
        RAISE EXCEPTION 'E-mail is already used by another staff member' USING ERRCODE = '23505';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_profile_staff_email
    BEFORE INSERT OR UPDATE OF email, user_type_id, deleted_at ON profile
    FOR EACH ROW EXECUTE FUNCTION fn_check_staff_email();

COMMIT;
