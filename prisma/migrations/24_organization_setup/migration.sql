-- Organization setup: contact person (profile), address (address table), lead e-mails, quote and
-- costing settings. Drops the old free-text address, city and e-mail columns.

-- 1. Lookups the setup uses.
INSERT INTO parameter_type (code, name, description, module_code, is_system, allow_user_values, display_order)
VALUES ('VOLUME_UOM', 'Volume Unit', 'Unit for volumes (CBM, CFT)', 'SETUP', true, false, 25)
ON CONFLICT (code) DO NOTHING;

INSERT INTO parameter (parameter_type_id, code, label, display_order, is_default, is_fixed)
SELECT t.parameter_type_id, v.code, v.label, v.n, v.is_default, true
FROM parameter_type t
CROSS JOIN (VALUES ('CBM', 'CBM', 1, true), ('CFT', 'CFT', 2, false)) AS v (code, label, n, is_default)
WHERE t.code = 'VOLUME_UOM'
  AND NOT EXISTS (
    SELECT 1 FROM parameter p WHERE p.parameter_type_id = t.parameter_type_id AND p.code = v.code
  );

-- The contact person of an organization is a profile of this type.
INSERT INTO parameter (parameter_type_id, code, label, display_order, is_fixed)
SELECT t.parameter_type_id, 'ORG_CONTACT', 'Organization contact',
       (SELECT COALESCE(MAX(display_order), 0) + 1 FROM parameter WHERE parameter_type_id = t.parameter_type_id),
       true
FROM parameter_type t
WHERE t.code = 'USER_TYPE'
  AND NOT EXISTS (
    SELECT 1 FROM parameter p WHERE p.parameter_type_id = t.parameter_type_id AND p.code = 'ORG_CONTACT'
  );

INSERT INTO currency (code, name, symbol, decimal_places)
VALUES ('AED', 'UAE Dirham', 'AED', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO time_zone (iana_name, utc_offset_minutes)
VALUES ('Asia/Dubai', 240)
ON CONFLICT (iana_name) DO NOTHING;

-- 2. New columns.
ALTER TABLE organization
  ADD COLUMN contact_profile_id bigint REFERENCES profile (profile_id) ON DELETE SET NULL,
  ADD COLUMN address_id bigint REFERENCES address (address_id) ON DELETE SET NULL,
  ADD COLUMN lead_email citext,
  ADD COLUMN lead_cc_email citext,
  ADD COLUMN quote_header_file_id bigint REFERENCES file_object (file_id),
  ADD COLUMN volume_uom_id integer REFERENCES parameter (parameter_id),
  ADD COLUMN furniture_volume_uom_id integer REFERENCES parameter (parameter_id),
  ADD COLUMN quote_review_min_limit numeric(14, 2),
  ADD COLUMN workload_min numeric(10, 2),
  ADD COLUMN workload_max numeric(10, 2),
  ADD COLUMN job_confirm_min_hours integer,
  ADD COLUMN employee_cost_per_hour numeric(12, 2),
  ADD COLUMN vehicle_cost_per_trip numeric(12, 2),
  ADD COLUMN employee_working_hours numeric(4, 1),
  ADD COLUMN vat_percent numeric(5, 2),
  ADD COLUMN profit_percent numeric(5, 2),
  ADD COLUMN display_color char(7),
  ADD COLUMN invoice_max_delay_days integer;

ALTER TABLE organization
  ADD CONSTRAINT ck_organization_workload CHECK (workload_min IS NULL OR workload_max IS NULL OR workload_min <= workload_max),
  ADD CONSTRAINT ck_organization_percents CHECK (
    (vat_percent IS NULL OR vat_percent BETWEEN 0 AND 100)
    AND (profit_percent IS NULL OR profit_percent BETWEEN 0 AND 100)
  ),
  ADD CONSTRAINT ck_organization_color CHECK (display_color IS NULL OR display_color ~ '^#[0-9A-Fa-f]{6}$');

CREATE INDEX ix_organization_contact_profile_id ON organization (contact_profile_id);
CREATE INDEX ix_organization_address_id ON organization (address_id);

-- 3. Move the free-text addresses into the address table (UAE; office address).
DO $$
DECLARE
  org record;
  new_id bigint;
BEGIN
  FOR org IN
    SELECT organization_id, address_text, city_id FROM organization
    WHERE address_text IS NOT NULL AND btrim(address_text) <> ''
  LOOP
    INSERT INTO address (address_type_id, is_default, country_id, city_id, address_text)
    VALUES (
      (SELECT p.parameter_id FROM parameter p JOIN parameter_type t USING (parameter_type_id)
        WHERE t.code = 'ADDRESS_TYPE' AND p.code = 'OFFICE'),
      true,
      COALESCE((SELECT country_id FROM city WHERE city_id = org.city_id),
               (SELECT country_id FROM country WHERE iso2 = 'AE')),
      org.city_id,
      org.address_text
    )
    RETURNING address_id INTO new_id;
    UPDATE organization SET address_id = new_id WHERE organization_id = org.organization_id;
  END LOOP;
END $$;

-- The old single e-mail becomes the lead e-mail.
UPDATE organization SET lead_email = email WHERE lead_email IS NULL AND email IS NOT NULL;

ALTER TABLE organization
  DROP COLUMN city_id,
  DROP COLUMN email,
  DROP COLUMN address_text;

-- 4. Dubai Head Office settings.
DO $$
DECLARE
  dxb bigint := (SELECT organization_id FROM organization WHERE organization_code = 'DXB');
  contact_id bigint;
  address_new bigint;
BEGIN
  IF dxb IS NULL THEN RETURN; END IF;

  INSERT INTO profile (user_type_id, name, status_id)
  VALUES (
    (SELECT p.parameter_id FROM parameter p JOIN parameter_type t USING (parameter_type_id)
      WHERE t.code = 'USER_TYPE' AND p.code = 'ORG_CONTACT'),
    'Joshi',
    (SELECT p.parameter_id FROM parameter p JOIN parameter_type t USING (parameter_type_id)
      WHERE t.code = 'ACCOUNT_STATUS' AND p.code = 'ACTIVE')
  )
  RETURNING profile_id INTO contact_id;

  INSERT INTO address (address_type_id, is_default, country_id, address_text)
  VALUES (
    (SELECT p.parameter_id FROM parameter p JOIN parameter_type t USING (parameter_type_id)
      WHERE t.code = 'ADDRESS_TYPE' AND p.code = 'OFFICE'),
    true,
    (SELECT country_id FROM country WHERE iso2 = 'AE'),
    'P.O.Box 121268'
  )
  RETURNING address_id INTO address_new;

  UPDATE organization SET
    name = 'Dubai Head Office',
    is_head_office = true,
    is_active = true,
    contact_profile_id = contact_id,
    address_id = address_new,
    lead_email = 'harish@emoversuae.com',
    lead_cc_email = 'harish@emoversuae.com',
    volume_uom_id = (SELECT p.parameter_id FROM parameter p JOIN parameter_type t USING (parameter_type_id)
                     WHERE t.code = 'VOLUME_UOM' AND p.code = 'CBM'),
    furniture_volume_uom_id = (SELECT p.parameter_id FROM parameter p JOIN parameter_type t USING (parameter_type_id)
                               WHERE t.code = 'VOLUME_UOM' AND p.code = 'CFT'),
    base_currency_id = (SELECT currency_id FROM currency WHERE code = 'AED'),
    time_zone_id = (SELECT time_zone_id FROM time_zone WHERE iana_name = 'Asia/Dubai'),
    quote_review_min_limit = 20000,
    workload_min = 95,
    workload_max = 100,
    job_confirm_min_hours = 48,
    employee_cost_per_hour = 20,
    vehicle_cost_per_trip = 100,
    employee_working_hours = 8,
    vat_percent = 5,
    profit_percent = 8,
    display_color = '#800000',
    invoice_max_delay_days = 5
  WHERE organization_id = dxb;
END $$;
