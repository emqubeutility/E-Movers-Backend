-- A stable number for each value of a dropdown: 1, 2, 3 ... within its parameter type.
BEGIN;

ALTER TABLE parameter ADD COLUMN parameter_value integer;

-- Number the existing values in display order.
UPDATE parameter p
SET parameter_value = n.rn
FROM (
  SELECT parameter_id,
         row_number() OVER (PARTITION BY parameter_type_id ORDER BY display_order, parameter_id) AS rn
  FROM parameter
) n
WHERE n.parameter_id = p.parameter_id;

ALTER TABLE parameter ALTER COLUMN parameter_value SET NOT NULL;
ALTER TABLE parameter
  ADD CONSTRAINT uq_parameter_type_value UNIQUE (parameter_type_id, parameter_value);

-- New values get the next number of their type when none is given.
CREATE OR REPLACE FUNCTION fn_parameter_next_value() RETURNS trigger AS $$
BEGIN
  IF NEW.parameter_value IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('parameter_value'), NEW.parameter_type_id);
    SELECT COALESCE(MAX(parameter_value), 0) + 1 INTO NEW.parameter_value
    FROM parameter WHERE parameter_type_id = NEW.parameter_type_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_parameter_next_value
  BEFORE INSERT ON parameter
  FOR EACH ROW EXECUTE FUNCTION fn_parameter_next_value();

COMMENT ON COLUMN parameter.parameter_value IS 'Number of the value within its type (unique per type); set automatically when not given.';

COMMIT;
