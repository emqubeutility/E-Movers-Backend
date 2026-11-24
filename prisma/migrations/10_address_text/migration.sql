-- One address text instead of line 1 and line 2; no coordinates, no typed state or city.
BEGIN;

ALTER TABLE address ADD COLUMN address_text varchar(512);

UPDATE address
SET address_text = concat_ws(', ', NULLIF(btrim(line1), ''), NULLIF(btrim(line2), ''));

UPDATE address SET address_text = '-' WHERE address_text IS NULL OR address_text = '';

ALTER TABLE address ALTER COLUMN address_text SET NOT NULL;

ALTER TABLE address
  DROP COLUMN line1,
  DROP COLUMN line2,
  DROP COLUMN state_text,
  DROP COLUMN city_text,
  DROP COLUMN latitude,
  DROP COLUMN longitude;

COMMENT ON COLUMN address.address_text IS 'Full address text (building, street, area).';

COMMIT;
