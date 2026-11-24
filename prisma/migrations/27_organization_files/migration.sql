-- Organization logo and quote header are uploaded files (file_doc, like service group images).
ALTER TABLE organization DROP CONSTRAINT IF EXISTS fk_organization_logo_file_id;
ALTER TABLE organization DROP CONSTRAINT IF EXISTS organization_quote_header_file_id_fkey;

UPDATE organization SET logo_file_id = NULL
WHERE logo_file_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM file_doc WHERE file_doc_id = organization.logo_file_id);
UPDATE organization SET quote_header_file_id = NULL
WHERE quote_header_file_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM file_doc WHERE file_doc_id = organization.quote_header_file_id);

ALTER TABLE organization
  ADD CONSTRAINT fk_organization_logo_file_id
    FOREIGN KEY (logo_file_id) REFERENCES file_doc (file_doc_id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_organization_quote_header_file_id
    FOREIGN KEY (quote_header_file_id) REFERENCES file_doc (file_doc_id) ON DELETE SET NULL;

-- Document type for organization logos (QUOTE_HEADER already exists).
INSERT INTO parameter (parameter_type_id, code, label, display_order)
SELECT t.parameter_type_id, 'ORG_LOGO', 'Organization Logo',
       (SELECT COALESCE(MAX(display_order), 0) + 1 FROM parameter WHERE parameter_type_id = t.parameter_type_id)
FROM parameter_type t
WHERE t.code = 'FILE_DOC_TYPE'
  AND NOT EXISTS (
    SELECT 1 FROM parameter p WHERE p.parameter_type_id = t.parameter_type_id AND p.code = 'ORG_LOGO'
  );
