-- document_type and document went missing on the database (dropped outside the migrations).
-- Recreate them exactly as 0_init defined them; they start empty.
BEGIN;

CREATE TABLE IF NOT EXISTS document_type (
    document_type_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    code varchar(40) NOT NULL CONSTRAINT uq_document_type_code UNIQUE,
    name varchar(150) NOT NULL,
    category_id integer NOT NULL,
    applies_to varchar(15) DEFAULT 'ANY' NOT NULL CONSTRAINT ck_document_type_applies_to CHECK (applies_to IN ('PROFILE','COMPANY','ANY','TRANSACTION')),
    requires_number boolean DEFAULT false NOT NULL,
    requires_expiry boolean DEFAULT false NOT NULL,
    requires_file boolean DEFAULT true NOT NULL,
    expiry_alert_days smallint,
    is_active boolean DEFAULT true NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    CONSTRAINT pk_document_type PRIMARY KEY (document_type_id),
    CONSTRAINT fk_document_type_category_id FOREIGN KEY (category_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT,
    CONSTRAINT fk_document_type_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_document_type_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS ix_document_type_category_id ON document_type (category_id);
DROP TRIGGER IF EXISTS trg_document_type_touch ON document_type;
CREATE TRIGGER trg_document_type_touch BEFORE UPDATE ON document_type FOR EACH ROW EXECUTE FUNCTION fn_touch_row();

CREATE TABLE IF NOT EXISTS document (
    document_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    profile_id bigint,
    customer_id bigint,
    company_id bigint,
    document_type_id integer NOT NULL,
    document_number varchar(80),
    issue_date date,
    expiry_date date,
    file_id bigint,
    is_verified boolean DEFAULT false NOT NULL,
    is_current boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    deleted_at timestamptz,
    deleted_by bigint,
    CONSTRAINT pk_document PRIMARY KEY (document_id),
    CONSTRAINT ck_document_one_owner CHECK (num_nonnulls(profile_id, customer_id, company_id) = 1),
    CONSTRAINT ck_document_dates CHECK (expiry_date IS NULL OR issue_date IS NULL OR expiry_date >= issue_date),
    CONSTRAINT fk_document_profile_id FOREIGN KEY (profile_id) REFERENCES profile (profile_id) ON DELETE RESTRICT,
    CONSTRAINT fk_document_customer_id FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE RESTRICT,
    CONSTRAINT fk_document_company_id FOREIGN KEY (company_id) REFERENCES company (company_id) ON DELETE RESTRICT,
    CONSTRAINT fk_document_document_type_id FOREIGN KEY (document_type_id) REFERENCES document_type (document_type_id) ON DELETE RESTRICT,
    CONSTRAINT fk_document_file_id FOREIGN KEY (file_id) REFERENCES file_object (file_id) ON DELETE RESTRICT,
    CONSTRAINT fk_document_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_document_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_document_deleted_by FOREIGN KEY (deleted_by) REFERENCES app_user (user_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS ix_document_profile_id ON document (profile_id);
CREATE INDEX IF NOT EXISTS ix_document_customer_id ON document (customer_id);
CREATE INDEX IF NOT EXISTS ix_document_company_id ON document (company_id);
CREATE INDEX IF NOT EXISTS ix_document_document_type_id ON document (document_type_id);
CREATE INDEX IF NOT EXISTS ix_document_file_id ON document (file_id);
CREATE INDEX IF NOT EXISTS ix_document_expiry ON document (expiry_date) WHERE is_current AND deleted_at IS NULL;
DROP TRIGGER IF EXISTS trg_document_touch ON document;
CREATE TRIGGER trg_document_touch BEFORE UPDATE ON document FOR EACH ROW EXECUTE FUNCTION fn_touch_row();

COMMENT ON COLUMN document_type.document_type_id IS 'Surrogate key.';
COMMENT ON COLUMN document_type.code IS 'Stable code.';
COMMENT ON COLUMN document_type.name IS 'Display name.';
COMMENT ON COLUMN document_type.category_id IS 'Document category (IDENTITY, LICENSE, TAX, BANK, CONTRACT, PHOTO, OTHER).';
COMMENT ON COLUMN document_type.requires_number IS 'Document number is mandatory.';
COMMENT ON COLUMN document_type.requires_expiry IS 'Expiry date is mandatory (drives expiry alerts).';
COMMENT ON COLUMN document_type.requires_file IS 'Scanned copy is mandatory.';
COMMENT ON COLUMN document_type.expiry_alert_days IS 'Days before expiry to alert.';
COMMENT ON COLUMN document_type.is_active IS 'Active flag.';
COMMENT ON COLUMN document_type.display_order IS 'Sort order.';
COMMENT ON COLUMN document.document_id IS 'Unique ID of the document record.';
COMMENT ON COLUMN document.profile_id IS 'The person this belongs to. (Exactly one of profile_id / customer_id / company_id is filled.)';
COMMENT ON COLUMN document.customer_id IS 'The customer this belongs to. (Exactly one of profile_id / customer_id / company_id is filled.)';
COMMENT ON COLUMN document.company_id IS 'The agent / supplier / contractor / competitor company this belongs to. (Exactly one of profile_id / customer_id / company_id is filled.)';
COMMENT ON COLUMN document.document_type_id IS 'What kind of document it is.';
COMMENT ON COLUMN document.document_number IS 'ID / licence / passport number.';
COMMENT ON COLUMN document.issue_date IS 'Date issued.';
COMMENT ON COLUMN document.expiry_date IS 'Expiry date (used for expiry alerts).';
COMMENT ON COLUMN document.file_id IS 'Scanned copy.';
COMMENT ON COLUMN document.is_verified IS 'Yes = checked against the original.';
COMMENT ON COLUMN document.is_current IS 'No = an old version that was replaced (e.g. after a renewal).';
COMMENT ON COLUMN document.notes IS 'Remarks.';

COMMIT;
