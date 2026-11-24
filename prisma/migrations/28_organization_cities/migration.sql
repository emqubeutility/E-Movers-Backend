-- Each organization's address gets its city, so local moves start there.
UPDATE address a SET
  city_id = c.city_id,
  state_id = c.state_id,
  updated_at = now()
FROM organization o
JOIN city c ON c.name = CASE o.organization_code WHEN 'DXB' THEN 'Dubai' WHEN 'ABDB' THEN 'Abu Dhabi' END
WHERE a.address_id = o.address_id
  AND o.organization_code IN ('DXB', 'ABDB')
  AND c.country_id = a.country_id;
