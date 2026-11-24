-- The owner (profile, company, customer) keeps address_id; the address table keeps no owner ids.
BEGIN;

-- Safety: link any owned address that is not yet linked.
UPDATE profile p
SET address_id = (
  SELECT a.address_id FROM address a
  WHERE a.profile_id = p.profile_id AND a.deleted_at IS NULL
  ORDER BY a.is_default DESC, a.address_id LIMIT 1
)
WHERE p.address_id IS NULL;

UPDATE company c
SET address_id = (
  SELECT a.address_id FROM address a
  WHERE a.company_id = c.company_id AND a.deleted_at IS NULL
  ORDER BY a.is_default DESC, a.address_id LIMIT 1
)
WHERE c.address_id IS NULL;

UPDATE customer c
SET address_id = (
  SELECT a.address_id FROM address a
  WHERE a.customer_id = c.customer_id AND a.deleted_at IS NULL
  ORDER BY a.is_default DESC, a.address_id LIMIT 1
)
WHERE c.address_id IS NULL;

ALTER TABLE address DROP CONSTRAINT IF EXISTS ck_address_one_owner;

ALTER TABLE address
  DROP COLUMN profile_id,
  DROP COLUMN customer_id,
  DROP COLUMN company_id;

COMMIT;
