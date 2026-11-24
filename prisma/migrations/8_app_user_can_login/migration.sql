-- Separate flag: is this account allowed to log in (status is not checked at login).
BEGIN;

ALTER TABLE app_user ADD COLUMN can_login boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN app_user.can_login IS 'true = login allowed, false = login restricted.';

COMMIT;
