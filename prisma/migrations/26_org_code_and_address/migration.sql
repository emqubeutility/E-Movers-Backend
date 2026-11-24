-- Abu Dhabi short name ADB -> ABDB (as in the old system), and Dubai gets the full office address.
UPDATE organization SET organization_code = 'ABDB', updated_at = now()
WHERE organization_code = 'ADB'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE organization_code = 'ABDB');

UPDATE address SET
  address_text = E'P.O.Box 121268\nDubai, U.A.E.\nTel +971 4 341 7042\nFax. +9714 341 7043\nWWW.EMOVERSUAE.COM\nEmirate : Dubai',
  updated_at = now()
WHERE address_id = (SELECT address_id FROM organization WHERE organization_code = 'DXB');
