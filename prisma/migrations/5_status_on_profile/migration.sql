-- The status of a person lives on profile.status_id only; app_user no longer keeps a copy.
BEGIN;

-- Where the two ever differed, the login's status was the one that decided access.
UPDATE profile p
SET status_id = u.account_status_id
FROM app_user u
WHERE u.profile_id = p.profile_id AND p.status_id <> u.account_status_id;

DROP INDEX IF EXISTS ix_app_user_account_status_id;
ALTER TABLE app_user DROP COLUMN account_status_id;

COMMIT;
