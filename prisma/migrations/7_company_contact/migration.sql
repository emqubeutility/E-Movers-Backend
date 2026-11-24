-- A company has a contact person instead of a legal name; coverage and commission are not kept.
BEGIN;

ALTER TABLE company RENAME COLUMN legal_name TO contact_name;
COMMENT ON COLUMN company.contact_name IS 'Name of the person to contact at the company.';
ALTER TABLE company DROP COLUMN coverage;
ALTER TABLE company DROP COLUMN commission_percent;

COMMIT;
