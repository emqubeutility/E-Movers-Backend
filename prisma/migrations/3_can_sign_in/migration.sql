-- Employees without a sign-in (drivers, crew): the person exists, but cannot log in.
BEGIN;

ALTER TABLE app_user ADD COLUMN IF NOT EXISTS can_sign_in boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN app_user.can_sign_in IS 'FALSE = the person has no login (the password is an unusable random value).';

COMMIT;
