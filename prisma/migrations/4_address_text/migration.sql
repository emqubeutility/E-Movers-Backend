-- State and city of a person's address are typed text (any country), not picked from lists.
BEGIN;

ALTER TABLE address ADD COLUMN IF NOT EXISTS state_text varchar(100);
ALTER TABLE address ADD COLUMN IF NOT EXISTS city_text varchar(100);
COMMENT ON COLUMN address.state_text IS 'State / province / emirate as typed (used when the state is not picked from the state list).';
COMMENT ON COLUMN address.city_text IS 'City as typed (used when the city is not picked from the city list).';

COMMIT;
