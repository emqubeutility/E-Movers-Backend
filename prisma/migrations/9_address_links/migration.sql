-- Company and customer keep the id of their main address, like profile.address_id.
BEGIN;

ALTER TABLE company ADD COLUMN address_id bigint;
ALTER TABLE customer ADD COLUMN address_id bigint;

ALTER TABLE company
  ADD CONSTRAINT fk_company_address_id FOREIGN KEY (address_id) REFERENCES address (address_id);
ALTER TABLE customer
  ADD CONSTRAINT fk_customer_address_id FOREIGN KEY (address_id) REFERENCES address (address_id);

CREATE INDEX ix_company_address_id ON company (address_id);
CREATE INDEX ix_customer_address_id ON customer (address_id);

-- Existing addresses: point each owner at its default (or first) address.
UPDATE company c
SET address_id = (
  SELECT a.address_id FROM address a
  WHERE a.company_id = c.company_id AND a.deleted_at IS NULL
  ORDER BY a.is_default DESC, a.address_id LIMIT 1
);
UPDATE customer c
SET address_id = (
  SELECT a.address_id FROM address a
  WHERE a.customer_id = c.customer_id AND a.deleted_at IS NULL
  ORDER BY a.is_default DESC, a.address_id LIMIT 1
);

COMMENT ON COLUMN company.address_id IS 'Main address (row in address).';
COMMENT ON COLUMN customer.address_id IS 'Main address (row in address).';

COMMIT;
