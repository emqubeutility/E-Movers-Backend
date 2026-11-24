-- Companies (agents, contractors, suppliers, competitors) belong to one organization.
-- Customers stay global, so customer.organization_id is left unused.
BEGIN;

ALTER TABLE company ADD COLUMN IF NOT EXISTS organization_id bigint;

-- Existing companies, if any, go to the head office. Fails loudly if there is none.
UPDATE company
   SET organization_id = (SELECT organization_id FROM organization WHERE is_head_office ORDER BY organization_id LIMIT 1)
 WHERE organization_id IS NULL;

ALTER TABLE company ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE company ADD CONSTRAINT fk_company_organization_id
    FOREIGN KEY (organization_id) REFERENCES organization (organization_id);
CREATE INDEX IF NOT EXISTS ix_company_organization_id ON company (organization_id);

COMMIT;
