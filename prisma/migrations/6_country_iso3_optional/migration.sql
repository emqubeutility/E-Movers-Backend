-- A country needs only a name and a 2-letter code; the 3-letter code becomes optional.
-- The unique rule stays: two countries still cannot share one, but any number may leave it empty.
ALTER TABLE country ALTER COLUMN iso3 DROP NOT NULL;
