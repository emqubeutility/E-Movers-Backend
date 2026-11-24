-- What kind of document each stored file is (a FILE_DOC_TYPE parameter).
BEGIN;

ALTER TABLE file_doc ADD COLUMN file_doc_type_id integer;

ALTER TABLE file_doc
  ADD CONSTRAINT fk_file_doc_file_doc_type_id FOREIGN KEY (file_doc_type_id) REFERENCES parameter (parameter_id);

CREATE INDEX ix_file_doc_type ON file_doc (file_doc_type_id);

COMMENT ON COLUMN file_doc.file_doc_type_id IS 'parameter of type FILE_DOC_TYPE';

COMMIT;
