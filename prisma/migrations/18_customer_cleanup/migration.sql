-- Customer: drop columns the application does not use; the WhatsApp consent gets its real name.
BEGIN;

ALTER TABLE customer DROP CONSTRAINT IF EXISTS fk_customer_account_manager_profile_id;
ALTER TABLE customer DROP CONSTRAINT IF EXISTS fk_customer_default_currency_id;
ALTER TABLE customer DROP CONSTRAINT IF EXISTS fk_customer_industry_type_id;
ALTER TABLE customer DROP CONSTRAINT IF EXISTS fk_customer_legal_form_id;
ALTER TABLE customer DROP CONSTRAINT IF EXISTS fk_customer_payment_term_id;

DROP INDEX IF EXISTS ix_customer_account_manager_profile_id;
DROP INDEX IF EXISTS ix_customer_default_currency_id;
DROP INDEX IF EXISTS ix_customer_industry_type_id;
DROP INDEX IF EXISTS ix_customer_legal_form_id;
DROP INDEX IF EXISTS ix_customer_payment_term_id;

ALTER TABLE customer
  DROP COLUMN legal_name,
  DROP COLUMN legal_form_id,
  DROP COLUMN industry_type_id,
  DROP COLUMN payment_term_id,
  DROP COLUMN credit_limit,
  DROP COLUMN default_currency_id,
  DROP COLUMN is_key_account,
  DROP COLUMN account_manager_profile_id;

-- The customer's address moves to its main contact's profile (profile.address_id).
UPDATE profile p
SET address_id = c.address_id
FROM customer_profile cp
JOIN customer c ON c.customer_id = cp.customer_id
WHERE cp.profile_id = p.profile_id
  AND cp.is_master
  AND cp.deleted_at IS NULL
  AND c.address_id IS NOT NULL
  AND p.address_id IS NULL;

ALTER TABLE customer DROP CONSTRAINT IF EXISTS fk_customer_address_id;
DROP INDEX IF EXISTS ix_customer_address_id;
ALTER TABLE customer DROP COLUMN address_id;

ALTER TABLE customer RENAME COLUMN email_optin TO whatsapp_optin;
COMMENT ON COLUMN customer.whatsapp_optin IS 'Yes = the customer agreed to be contacted on WhatsApp.';

COMMIT;
