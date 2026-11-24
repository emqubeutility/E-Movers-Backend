-- Abu Dhabi organization settings (from the old system's Org Setup screen).
DO $$
DECLARE
  adb bigint := (SELECT organization_id FROM organization WHERE organization_code = 'ADB');
  contact_id bigint;
  current_address bigint;
  office_type integer := (SELECT p.parameter_id FROM parameter p JOIN parameter_type t USING (parameter_type_id)
                          WHERE t.code = 'ADDRESS_TYPE' AND p.code = 'OFFICE');
  uae integer := (SELECT country_id FROM country WHERE iso2 = 'AE');
  address_lines text := E'P.O.Box 121268\nDubai, U.A.E.\nTel +971 4 341 7042\nFax. +9714 341 7043\nWWW.EMOVERSUAE.COM\nEmirate : Dubai';
BEGIN
  IF adb IS NULL THEN RETURN; END IF;

  INSERT INTO profile (user_type_id, name, status_id)
  VALUES (
    (SELECT p.parameter_id FROM parameter p JOIN parameter_type t USING (parameter_type_id)
      WHERE t.code = 'USER_TYPE' AND p.code = 'ORG_CONTACT'),
    'Suresh',
    (SELECT p.parameter_id FROM parameter p JOIN parameter_type t USING (parameter_type_id)
      WHERE t.code = 'ACCOUNT_STATUS' AND p.code = 'ACTIVE')
  )
  RETURNING profile_id INTO contact_id;

  SELECT address_id INTO current_address FROM organization WHERE organization_id = adb;
  IF current_address IS NULL THEN
    INSERT INTO address (address_type_id, is_default, country_id, address_text)
    VALUES (office_type, true, uae, address_lines)
    RETURNING address_id INTO current_address;
  ELSE
    UPDATE address SET address_text = address_lines, country_id = uae, updated_at = now()
    WHERE address_id = current_address;
  END IF;

  UPDATE organization SET
    name = 'Abudhabi',
    is_head_office = false,
    is_active = true,
    contact_profile_id = contact_id,
    address_id = current_address,
    lead_email = 'harish@emoversuae.com',
    lead_cc_email = 'harish@emoversuae.com',
    volume_uom_id = (SELECT p.parameter_id FROM parameter p JOIN parameter_type t USING (parameter_type_id)
                     WHERE t.code = 'VOLUME_UOM' AND p.code = 'CBM'),
    furniture_volume_uom_id = (SELECT p.parameter_id FROM parameter p JOIN parameter_type t USING (parameter_type_id)
                               WHERE t.code = 'VOLUME_UOM' AND p.code = 'CFT'),
    base_currency_id = (SELECT currency_id FROM currency WHERE code = 'AED'),
    time_zone_id = (SELECT time_zone_id FROM time_zone WHERE iana_name = 'Asia/Dubai'),
    quote_review_min_limit = 20000,
    workload_min = 94,
    workload_max = 100,
    job_confirm_min_hours = 48,
    employee_cost_per_hour = 20,
    vehicle_cost_per_trip = 100,
    employee_working_hours = 8,
    vat_percent = 5,
    profit_percent = 8,
    display_color = '#004D00',
    invoice_max_delay_days = 5
  WHERE organization_id = adb;
END $$;
