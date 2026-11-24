-- Emove new application : USER MODULE schema
-- Generated from the approved design workbook (Emove_User_Module_Setup.xlsx)

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE organization (
    organization_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    organization_code varchar(20) NOT NULL CONSTRAINT uq_organization_organization_code UNIQUE,
    name varchar(150) NOT NULL,
    is_head_office boolean DEFAULT false NOT NULL,
    city_id integer,
    email citext,
    contact_no varchar(20),
    address_text varchar(500),
    base_currency_id integer,
    time_zone_id integer,
    logo_file_id bigint,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    row_version integer NOT NULL DEFAULT 1,
    CONSTRAINT pk_organization PRIMARY KEY (organization_id)
);

CREATE TABLE country (
    country_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    iso2 char(2) NOT NULL CONSTRAINT uq_country_iso2 UNIQUE,
    iso3 char(3) NOT NULL CONSTRAINT uq_country_iso3 UNIQUE,
    name varchar(100) NOT NULL CONSTRAINT uq_country_name UNIQUE,
    dial_code varchar(6),
    default_currency_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    CONSTRAINT pk_country PRIMARY KEY (country_id)
);

CREATE TABLE state (
    state_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    country_id integer NOT NULL,
    code varchar(10),
    name varchar(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    CONSTRAINT pk_state PRIMARY KEY (state_id)
);

CREATE TABLE city (
    city_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    country_id integer NOT NULL,
    state_id integer,
    name varchar(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    CONSTRAINT pk_city PRIMARY KEY (city_id)
);

CREATE TABLE area (
    area_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    city_id integer NOT NULL,
    name varchar(150) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    CONSTRAINT pk_area PRIMARY KEY (area_id)
);

CREATE TABLE currency (
    currency_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    code char(3) NOT NULL CONSTRAINT uq_currency_code UNIQUE,
    name varchar(100) NOT NULL,
    symbol varchar(8),
    decimal_places smallint DEFAULT 2 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    CONSTRAINT pk_currency PRIMARY KEY (currency_id)
);

CREATE TABLE time_zone (
    time_zone_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    iana_name varchar(64) NOT NULL CONSTRAINT uq_time_zone_iana_name UNIQUE,
    utc_offset_minutes smallint,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    CONSTRAINT pk_time_zone PRIMARY KEY (time_zone_id)
);

CREATE TABLE nationality (
    nationality_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    code varchar(10) CONSTRAINT uq_nationality_code UNIQUE,
    name varchar(100) NOT NULL CONSTRAINT uq_nationality_name UNIQUE,
    country_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    CONSTRAINT pk_nationality PRIMARY KEY (nationality_id)
);

CREATE TABLE parameter_type (
    parameter_type_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    code varchar(60) NOT NULL CONSTRAINT uq_parameter_type_code UNIQUE,
    name varchar(150) NOT NULL,
    description text,
    module_code varchar(30) DEFAULT 'SYSTEM' NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    allow_user_values boolean DEFAULT false NOT NULL,
    is_company_scoped boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    CONSTRAINT pk_parameter_type PRIMARY KEY (parameter_type_id)
);

CREATE TABLE parameter (
    parameter_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    parameter_type_id integer NOT NULL,
    code varchar(60) NOT NULL,
    label varchar(250) NOT NULL,
    description text,
    display_order smallint DEFAULT 0 NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_fixed boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    color_hex char(7),
    parent_parameter_id integer,
    organization_id bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    CONSTRAINT pk_parameter PRIMARY KEY (parameter_id)
);

CREATE TABLE document_type (
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
    CONSTRAINT pk_document_type PRIMARY KEY (document_type_id)
);

CREATE TABLE profile (
    profile_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    public_id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT uq_profile_public_id UNIQUE,
    user_type_id integer NOT NULL,
    customer_id bigint,
    company_id bigint,
    is_master_profile boolean DEFAULT false NOT NULL,
    name varchar(150) NOT NULL,
    last_name varchar(150),
    email citext,
    contact_no varchar(20),
    alt_contact_no varchar(20),
    designation varchar(150),
    gender_id integer,
    date_of_birth date,
    age_group_id integer,
    nationality_id integer,
    profession varchar(150),
    photo_file_id bigint,
    status_id integer NOT NULL,
    preferred_language varchar(10),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    deleted_at timestamptz,
    deleted_by bigint,
    row_version integer NOT NULL DEFAULT 1,
    CONSTRAINT pk_profile PRIMARY KEY (profile_id),
    CONSTRAINT ck_profile_one_owner CHECK (num_nonnulls(customer_id, company_id) <= 1),
    CONSTRAINT ck_profile_master_needs_owner CHECK (NOT is_master_profile OR num_nonnulls(customer_id, company_id) = 1)
);

CREATE TABLE customer (
    customer_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    public_id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT uq_customer_public_id UNIQUE,
    customer_kind varchar(10) NOT NULL CONSTRAINT ck_customer_customer_kind CHECK (customer_kind IN ('INDIVIDUAL','COMPANY')),
    customer_code varchar(20) CONSTRAINT uq_customer_customer_code UNIQUE,
    customer_name varchar(250),
    legal_name varchar(250),
    legal_form_id integer,
    industry_type_id integer,
    organization_id bigint,
    bill_to_id integer,
    payment_term_id integer,
    credit_limit numeric(18,2),
    default_currency_id integer,
    is_key_account boolean DEFAULT false NOT NULL,
    account_manager_profile_id bigint,
    email_optin boolean DEFAULT true NOT NULL,
    status_id integer NOT NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    deleted_at timestamptz,
    deleted_by bigint,
    row_version integer NOT NULL DEFAULT 1,
    CONSTRAINT pk_customer PRIMARY KEY (customer_id),
    CONSTRAINT ck_customer_credit_limit CHECK (credit_limit IS NULL OR credit_limit >= 0),
    CONSTRAINT ck_customer_company_has_name CHECK (customer_kind = 'INDIVIDUAL' OR customer_name IS NOT NULL)
);

CREATE TABLE company (
    company_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    public_id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT uq_company_public_id UNIQUE,
    company_type_id integer NOT NULL,
    company_code varchar(20) CONSTRAINT uq_company_company_code UNIQUE,
    name varchar(250) NOT NULL,
    legal_name varchar(250),
    email citext,
    contact_no varchar(20),
    website varchar(255),
    country_id integer,
    services text,
    coverage varchar(500),
    payment_term_id integer,
    commission_percent numeric(5,2),
    currency_id integer,
    status_id integer NOT NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    deleted_at timestamptz,
    deleted_by bigint,
    row_version integer NOT NULL DEFAULT 1,
    CONSTRAINT pk_company PRIMARY KEY (company_id),
    CONSTRAINT ck_company_commission CHECK (commission_percent IS NULL OR commission_percent BETWEEN 0 AND 100)
);

CREATE TABLE address (
    address_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    profile_id bigint,
    customer_id bigint,
    company_id bigint,
    address_type_id integer NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    line1 varchar(255) NOT NULL,
    line2 varchar(255),
    country_id integer NOT NULL,
    state_id integer,
    city_id integer,
    area_id integer,
    postal_code varchar(20),
    latitude numeric(9,6),
    longitude numeric(9,6),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    deleted_at timestamptz,
    deleted_by bigint,
    CONSTRAINT pk_address PRIMARY KEY (address_id),
    CONSTRAINT ck_address_one_owner CHECK (num_nonnulls(profile_id, customer_id, company_id) = 1),
    CONSTRAINT ck_address_lat CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT ck_address_lng CHECK (longitude BETWEEN -180 AND 180)
);

CREATE TABLE document (
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
    CONSTRAINT ck_document_dates CHECK (expiry_date IS NULL OR issue_date IS NULL OR expiry_date >= issue_date)
);

CREATE TABLE tax_registration (
    tax_registration_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    customer_id bigint,
    company_id bigint,
    tax_type_id integer NOT NULL,
    registration_no varchar(30) NOT NULL,
    country_id integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    CONSTRAINT pk_tax_registration PRIMARY KEY (tax_registration_id),
    CONSTRAINT ck_tax_registration_one_owner CHECK (num_nonnulls(customer_id, company_id) = 1)
);

CREATE TABLE bank_account (
    bank_account_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    profile_id bigint,
    customer_id bigint,
    company_id bigint,
    account_holder_name varchar(200) NOT NULL,
    bank_name varchar(150) NOT NULL,
    branch_name varchar(150),
    account_number_enc bytea,
    iban varchar(34),
    swift_bic varchar(11),
    currency_id integer,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    deleted_at timestamptz,
    deleted_by bigint,
    CONSTRAINT pk_bank_account PRIMARY KEY (bank_account_id),
    CONSTRAINT ck_bank_account_one_owner CHECK (num_nonnulls(profile_id, customer_id, company_id) = 1)
);

CREATE TABLE consent (
    consent_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    profile_id bigint NOT NULL,
    channel_id integer NOT NULL,
    status_id integer NOT NULL,
    status_changed_at timestamptz DEFAULT now() NOT NULL,
    source varchar(30),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    CONSTRAINT pk_consent PRIMARY KEY (consent_id)
);

CREATE TABLE employee (
    profile_id bigint NOT NULL,
    employee_code varchar(20) NOT NULL CONSTRAINT uq_employee_employee_code UNIQUE,
    organization_id bigint NOT NULL,
    employee_role_id integer NOT NULL,
    contractor_company_id bigint,
    is_outsourced boolean DEFAULT false NOT NULL,
    join_date date,
    exit_date date,
    billing_rate numeric(12,2),
    ctc_rate numeric(12,2),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    CONSTRAINT pk_employee PRIMARY KEY (profile_id),
    CONSTRAINT ck_employee_dates CHECK (exit_date IS NULL OR join_date IS NULL OR exit_date >= join_date),
    CONSTRAINT ck_employee_rates CHECK (COALESCE(billing_rate, 0) >= 0 AND COALESCE(ctc_rate, 0) >= 0)
);

CREATE TABLE employee_skill (
    profile_id bigint NOT NULL,
    skill_id integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    CONSTRAINT pk_employee_skill PRIMARY KEY (profile_id, skill_id)
);

CREATE TABLE employee_emergency_contact (
    emergency_contact_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    profile_id bigint NOT NULL,
    contact_name varchar(150) NOT NULL,
    relationship_id integer,
    phone varchar(20) NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    CONSTRAINT pk_employee_emergency_contact PRIMARY KEY (emergency_contact_id)
);

CREATE TABLE app_user (
    user_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    public_id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT uq_app_user_public_id UNIQUE,
    profile_id bigint NOT NULL CONSTRAINT uq_app_user_profile_id UNIQUE,
    username citext NOT NULL CONSTRAINT uq_app_user_username UNIQUE,
    password_hash varchar(255) NOT NULL,
    password_changed_at timestamptz,
    must_change_password boolean DEFAULT true NOT NULL,
    role_id integer NOT NULL,
    account_status_id integer NOT NULL,
    failed_login_count smallint DEFAULT 0 NOT NULL,
    locked_until timestamptz,
    last_login_at timestamptz,
    last_login_ip inet,
    mfa_enabled boolean DEFAULT false NOT NULL,
    mfa_secret_enc bytea,
    default_organization_id bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    deleted_at timestamptz,
    deleted_by bigint,
    row_version integer NOT NULL DEFAULT 1,
    CONSTRAINT pk_app_user PRIMARY KEY (user_id)
);

CREATE TABLE auth_session (
    session_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id bigint NOT NULL,
    refresh_token_hash char(64) NOT NULL CONSTRAINT uq_auth_session_refresh_token_hash UNIQUE,
    user_device_id bigint,
    issued_at timestamptz DEFAULT now() NOT NULL,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    ip_address inet,
    user_agent varchar(400),
    is_mobile boolean DEFAULT false NOT NULL,
    CONSTRAINT pk_auth_session PRIMARY KEY (session_id)
);

CREATE TABLE user_device (
    user_device_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    user_id bigint NOT NULL,
    device_identifier varchar(400) NOT NULL,
    platform_id integer NOT NULL,
    push_token varchar(500),
    app_version varchar(20),
    last_seen_at timestamptz,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    CONSTRAINT pk_user_device PRIMARY KEY (user_device_id)
);

CREATE TABLE password_reset_token (
    reset_token_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    user_id bigint NOT NULL,
    token_hash char(64) NOT NULL CONSTRAINT uq_password_reset_token_token_hash UNIQUE,
    purpose varchar(20) DEFAULT 'RESET' NOT NULL CONSTRAINT ck_password_reset_token_purpose CHECK (purpose IN ('RESET','ACTIVATION')),
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    requested_ip inet,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    CONSTRAINT pk_password_reset_token PRIMARY KEY (reset_token_id)
);

CREATE TABLE role (
    role_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    role_code varchar(40) NOT NULL CONSTRAINT uq_role_role_code UNIQUE,
    name varchar(150) NOT NULL,
    role_level smallint DEFAULT 99 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    CONSTRAINT pk_role PRIMARY KEY (role_id)
);

CREATE TABLE menu_item (
    menu_item_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    menu_code varchar(80) NOT NULL CONSTRAINT uq_menu_item_menu_code UNIQUE,
    menu_name varchar(100) NOT NULL,
    menu_parent_id integer,
    menu_order smallint,
    css_class varchar(50),
    page_url varchar(350),
    is_main_menu boolean DEFAULT true NOT NULL,
    organization_id bigint,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    CONSTRAINT pk_menu_item PRIMARY KEY (menu_item_id)
);

CREATE TABLE menu_role (
    menu_role_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    role_id integer NOT NULL,
    menu_item_id integer NOT NULL,
    page_url varchar(350),
    is_create boolean DEFAULT false NOT NULL,
    is_edit boolean DEFAULT false NOT NULL,
    is_delete boolean DEFAULT false NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    CONSTRAINT pk_menu_role PRIMARY KEY (menu_role_id)
);

CREATE TABLE menu_function (
    menu_function_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    menu_item_id integer NOT NULL,
    function_id integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    CONSTRAINT pk_menu_function PRIMARY KEY (menu_function_id)
);

CREATE TABLE employee_function (
    profile_id bigint NOT NULL,
    function_id integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    CONSTRAINT pk_employee_function PRIMARY KEY (profile_id, function_id)
);

CREATE TABLE employee_organization (
    profile_id bigint NOT NULL,
    organization_id bigint NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    CONSTRAINT pk_employee_organization PRIMARY KEY (profile_id, organization_id)
);

CREATE TABLE menu_special_user_access (
    menu_special_user_access_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    profile_id bigint NOT NULL,
    menu_item_id integer NOT NULL,
    organization_id bigint NOT NULL,
    is_include boolean NOT NULL,
    page_url varchar(350),
    is_create boolean DEFAULT false NOT NULL,
    is_edit boolean DEFAULT false NOT NULL,
    is_delete boolean DEFAULT false NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    CONSTRAINT pk_menu_special_user_access PRIMARY KEY (menu_special_user_access_id)
);

CREATE TABLE user_activity (
    activity_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    occurred_at timestamptz DEFAULT now() NOT NULL,
    user_id bigint,
    organization_id bigint,
    activity_type_id integer NOT NULL,
    menu_item_id integer,
    entity_name varchar(60),
    entity_id varchar(40),
    result varchar(10) DEFAULT 'SUCCESS' NOT NULL CONSTRAINT ck_user_activity_result CHECK (result IN ('SUCCESS','FAILURE','DENIED')),
    ip_address inet,
    user_agent varchar(400),
    details jsonb,
    CONSTRAINT pk_user_activity PRIMARY KEY (activity_id)
);

CREATE TABLE file_object (
    file_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    public_id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT uq_file_object_public_id UNIQUE,
    storage_provider varchar(20) DEFAULT 'LOCAL' NOT NULL CONSTRAINT ck_file_object_storage_provider CHECK (storage_provider IN ('LOCAL','AZURE_BLOB','S3')),
    storage_key varchar(500) NOT NULL,
    original_name varchar(255) NOT NULL,
    mime_type varchar(100),
    size_bytes bigint,
    sha256 char(64),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    deleted_at timestamptz,
    deleted_by bigint,
    CONSTRAINT pk_file_object PRIMARY KEY (file_id)
);

CREATE TABLE audit_log (
    audit_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    occurred_at timestamptz DEFAULT now() NOT NULL,
    table_name varchar(63) NOT NULL,
    record_id varchar(40) NOT NULL,
    action char(1) NOT NULL CONSTRAINT ck_audit_log_action CHECK (action IN ('I','U','D')),
    changed_by bigint,
    old_values jsonb,
    new_values jsonb,
    request_id uuid,
    CONSTRAINT pk_audit_log PRIMARY KEY (audit_id)
);

-- ---------- foreign keys
ALTER TABLE organization ADD CONSTRAINT fk_organization_city_id FOREIGN KEY (city_id) REFERENCES city (city_id) ON DELETE RESTRICT;
ALTER TABLE organization ADD CONSTRAINT fk_organization_base_currency_id FOREIGN KEY (base_currency_id) REFERENCES currency (currency_id) ON DELETE RESTRICT;
ALTER TABLE organization ADD CONSTRAINT fk_organization_time_zone_id FOREIGN KEY (time_zone_id) REFERENCES time_zone (time_zone_id) ON DELETE RESTRICT;
ALTER TABLE organization ADD CONSTRAINT fk_organization_logo_file_id FOREIGN KEY (logo_file_id) REFERENCES file_object (file_id) ON DELETE SET NULL;
ALTER TABLE organization ADD CONSTRAINT fk_organization_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE organization ADD CONSTRAINT fk_organization_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE country ADD CONSTRAINT fk_country_default_currency_id FOREIGN KEY (default_currency_id) REFERENCES currency (currency_id) ON DELETE RESTRICT;
ALTER TABLE country ADD CONSTRAINT fk_country_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE state ADD CONSTRAINT fk_state_country_id FOREIGN KEY (country_id) REFERENCES country (country_id) ON DELETE RESTRICT;
ALTER TABLE state ADD CONSTRAINT fk_state_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE city ADD CONSTRAINT fk_city_country_id FOREIGN KEY (country_id) REFERENCES country (country_id) ON DELETE RESTRICT;
ALTER TABLE city ADD CONSTRAINT fk_city_state_id FOREIGN KEY (state_id) REFERENCES state (state_id) ON DELETE RESTRICT;
ALTER TABLE city ADD CONSTRAINT fk_city_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE area ADD CONSTRAINT fk_area_city_id FOREIGN KEY (city_id) REFERENCES city (city_id) ON DELETE RESTRICT;
ALTER TABLE area ADD CONSTRAINT fk_area_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE currency ADD CONSTRAINT fk_currency_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE time_zone ADD CONSTRAINT fk_time_zone_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE nationality ADD CONSTRAINT fk_nationality_country_id FOREIGN KEY (country_id) REFERENCES country (country_id) ON DELETE RESTRICT;
ALTER TABLE nationality ADD CONSTRAINT fk_nationality_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE parameter_type ADD CONSTRAINT fk_parameter_type_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE parameter_type ADD CONSTRAINT fk_parameter_type_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE parameter ADD CONSTRAINT fk_parameter_parameter_type_id FOREIGN KEY (parameter_type_id) REFERENCES parameter_type (parameter_type_id) ON DELETE RESTRICT;
ALTER TABLE parameter ADD CONSTRAINT fk_parameter_parent_parameter_id FOREIGN KEY (parent_parameter_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE parameter ADD CONSTRAINT fk_parameter_organization_id FOREIGN KEY (organization_id) REFERENCES organization (organization_id) ON DELETE RESTRICT;
ALTER TABLE parameter ADD CONSTRAINT fk_parameter_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE parameter ADD CONSTRAINT fk_parameter_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE document_type ADD CONSTRAINT fk_document_type_category_id FOREIGN KEY (category_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE document_type ADD CONSTRAINT fk_document_type_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE document_type ADD CONSTRAINT fk_document_type_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE profile ADD CONSTRAINT fk_profile_user_type_id FOREIGN KEY (user_type_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE profile ADD CONSTRAINT fk_profile_customer_id FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE RESTRICT;
ALTER TABLE profile ADD CONSTRAINT fk_profile_company_id FOREIGN KEY (company_id) REFERENCES company (company_id) ON DELETE RESTRICT;
ALTER TABLE profile ADD CONSTRAINT fk_profile_gender_id FOREIGN KEY (gender_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE profile ADD CONSTRAINT fk_profile_age_group_id FOREIGN KEY (age_group_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE profile ADD CONSTRAINT fk_profile_nationality_id FOREIGN KEY (nationality_id) REFERENCES nationality (nationality_id) ON DELETE RESTRICT;
ALTER TABLE profile ADD CONSTRAINT fk_profile_photo_file_id FOREIGN KEY (photo_file_id) REFERENCES file_object (file_id) ON DELETE SET NULL;
ALTER TABLE profile ADD CONSTRAINT fk_profile_status_id FOREIGN KEY (status_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE profile ADD CONSTRAINT fk_profile_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE profile ADD CONSTRAINT fk_profile_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE profile ADD CONSTRAINT fk_profile_deleted_by FOREIGN KEY (deleted_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE customer ADD CONSTRAINT fk_customer_legal_form_id FOREIGN KEY (legal_form_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE customer ADD CONSTRAINT fk_customer_industry_type_id FOREIGN KEY (industry_type_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE customer ADD CONSTRAINT fk_customer_organization_id FOREIGN KEY (organization_id) REFERENCES organization (organization_id) ON DELETE RESTRICT;
ALTER TABLE customer ADD CONSTRAINT fk_customer_bill_to_id FOREIGN KEY (bill_to_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE customer ADD CONSTRAINT fk_customer_payment_term_id FOREIGN KEY (payment_term_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE customer ADD CONSTRAINT fk_customer_default_currency_id FOREIGN KEY (default_currency_id) REFERENCES currency (currency_id) ON DELETE RESTRICT;
ALTER TABLE customer ADD CONSTRAINT fk_customer_account_manager_profile_id FOREIGN KEY (account_manager_profile_id) REFERENCES employee (profile_id) ON DELETE RESTRICT;
ALTER TABLE customer ADD CONSTRAINT fk_customer_status_id FOREIGN KEY (status_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE customer ADD CONSTRAINT fk_customer_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE customer ADD CONSTRAINT fk_customer_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE customer ADD CONSTRAINT fk_customer_deleted_by FOREIGN KEY (deleted_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE company ADD CONSTRAINT fk_company_company_type_id FOREIGN KEY (company_type_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE company ADD CONSTRAINT fk_company_country_id FOREIGN KEY (country_id) REFERENCES country (country_id) ON DELETE RESTRICT;
ALTER TABLE company ADD CONSTRAINT fk_company_payment_term_id FOREIGN KEY (payment_term_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE company ADD CONSTRAINT fk_company_currency_id FOREIGN KEY (currency_id) REFERENCES currency (currency_id) ON DELETE RESTRICT;
ALTER TABLE company ADD CONSTRAINT fk_company_status_id FOREIGN KEY (status_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE company ADD CONSTRAINT fk_company_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE company ADD CONSTRAINT fk_company_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE company ADD CONSTRAINT fk_company_deleted_by FOREIGN KEY (deleted_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE address ADD CONSTRAINT fk_address_profile_id FOREIGN KEY (profile_id) REFERENCES profile (profile_id) ON DELETE RESTRICT;
ALTER TABLE address ADD CONSTRAINT fk_address_customer_id FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE RESTRICT;
ALTER TABLE address ADD CONSTRAINT fk_address_company_id FOREIGN KEY (company_id) REFERENCES company (company_id) ON DELETE RESTRICT;
ALTER TABLE address ADD CONSTRAINT fk_address_address_type_id FOREIGN KEY (address_type_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE address ADD CONSTRAINT fk_address_country_id FOREIGN KEY (country_id) REFERENCES country (country_id) ON DELETE RESTRICT;
ALTER TABLE address ADD CONSTRAINT fk_address_state_id FOREIGN KEY (state_id) REFERENCES state (state_id) ON DELETE RESTRICT;
ALTER TABLE address ADD CONSTRAINT fk_address_city_id FOREIGN KEY (city_id) REFERENCES city (city_id) ON DELETE RESTRICT;
ALTER TABLE address ADD CONSTRAINT fk_address_area_id FOREIGN KEY (area_id) REFERENCES area (area_id) ON DELETE RESTRICT;
ALTER TABLE address ADD CONSTRAINT fk_address_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE address ADD CONSTRAINT fk_address_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE address ADD CONSTRAINT fk_address_deleted_by FOREIGN KEY (deleted_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE document ADD CONSTRAINT fk_document_profile_id FOREIGN KEY (profile_id) REFERENCES profile (profile_id) ON DELETE RESTRICT;
ALTER TABLE document ADD CONSTRAINT fk_document_customer_id FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE RESTRICT;
ALTER TABLE document ADD CONSTRAINT fk_document_company_id FOREIGN KEY (company_id) REFERENCES company (company_id) ON DELETE RESTRICT;
ALTER TABLE document ADD CONSTRAINT fk_document_document_type_id FOREIGN KEY (document_type_id) REFERENCES document_type (document_type_id) ON DELETE RESTRICT;
ALTER TABLE document ADD CONSTRAINT fk_document_file_id FOREIGN KEY (file_id) REFERENCES file_object (file_id) ON DELETE RESTRICT;
ALTER TABLE document ADD CONSTRAINT fk_document_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE document ADD CONSTRAINT fk_document_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE document ADD CONSTRAINT fk_document_deleted_by FOREIGN KEY (deleted_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE tax_registration ADD CONSTRAINT fk_tax_registration_customer_id FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE RESTRICT;
ALTER TABLE tax_registration ADD CONSTRAINT fk_tax_registration_company_id FOREIGN KEY (company_id) REFERENCES company (company_id) ON DELETE RESTRICT;
ALTER TABLE tax_registration ADD CONSTRAINT fk_tax_registration_tax_type_id FOREIGN KEY (tax_type_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE tax_registration ADD CONSTRAINT fk_tax_registration_country_id FOREIGN KEY (country_id) REFERENCES country (country_id) ON DELETE RESTRICT;
ALTER TABLE tax_registration ADD CONSTRAINT fk_tax_registration_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE tax_registration ADD CONSTRAINT fk_tax_registration_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE bank_account ADD CONSTRAINT fk_bank_account_profile_id FOREIGN KEY (profile_id) REFERENCES profile (profile_id) ON DELETE RESTRICT;
ALTER TABLE bank_account ADD CONSTRAINT fk_bank_account_customer_id FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE RESTRICT;
ALTER TABLE bank_account ADD CONSTRAINT fk_bank_account_company_id FOREIGN KEY (company_id) REFERENCES company (company_id) ON DELETE RESTRICT;
ALTER TABLE bank_account ADD CONSTRAINT fk_bank_account_currency_id FOREIGN KEY (currency_id) REFERENCES currency (currency_id) ON DELETE RESTRICT;
ALTER TABLE bank_account ADD CONSTRAINT fk_bank_account_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE bank_account ADD CONSTRAINT fk_bank_account_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE bank_account ADD CONSTRAINT fk_bank_account_deleted_by FOREIGN KEY (deleted_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE consent ADD CONSTRAINT fk_consent_profile_id FOREIGN KEY (profile_id) REFERENCES profile (profile_id) ON DELETE RESTRICT;
ALTER TABLE consent ADD CONSTRAINT fk_consent_channel_id FOREIGN KEY (channel_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE consent ADD CONSTRAINT fk_consent_status_id FOREIGN KEY (status_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE consent ADD CONSTRAINT fk_consent_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE consent ADD CONSTRAINT fk_consent_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE employee ADD CONSTRAINT fk_employee_profile_id FOREIGN KEY (profile_id) REFERENCES profile (profile_id) ON DELETE CASCADE;
ALTER TABLE employee ADD CONSTRAINT fk_employee_organization_id FOREIGN KEY (organization_id) REFERENCES organization (organization_id) ON DELETE RESTRICT;
ALTER TABLE employee ADD CONSTRAINT fk_employee_employee_role_id FOREIGN KEY (employee_role_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE employee ADD CONSTRAINT fk_employee_contractor_company_id FOREIGN KEY (contractor_company_id) REFERENCES company (company_id) ON DELETE RESTRICT;
ALTER TABLE employee ADD CONSTRAINT fk_employee_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE employee ADD CONSTRAINT fk_employee_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE employee_skill ADD CONSTRAINT fk_employee_skill_profile_id FOREIGN KEY (profile_id) REFERENCES employee (profile_id) ON DELETE CASCADE;
ALTER TABLE employee_skill ADD CONSTRAINT fk_employee_skill_skill_id FOREIGN KEY (skill_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE employee_skill ADD CONSTRAINT fk_employee_skill_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE employee_emergency_contact ADD CONSTRAINT fk_employee_emergency_contact_profile_id FOREIGN KEY (profile_id) REFERENCES employee (profile_id) ON DELETE CASCADE;
ALTER TABLE employee_emergency_contact ADD CONSTRAINT fk_employee_emergency_contact_relationship_id FOREIGN KEY (relationship_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE employee_emergency_contact ADD CONSTRAINT fk_employee_emergency_contact_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE employee_emergency_contact ADD CONSTRAINT fk_employee_emergency_contact_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE app_user ADD CONSTRAINT fk_app_user_profile_id FOREIGN KEY (profile_id) REFERENCES profile (profile_id) ON DELETE RESTRICT;
ALTER TABLE app_user ADD CONSTRAINT fk_app_user_role_id FOREIGN KEY (role_id) REFERENCES role (role_id) ON DELETE RESTRICT;
ALTER TABLE app_user ADD CONSTRAINT fk_app_user_account_status_id FOREIGN KEY (account_status_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE app_user ADD CONSTRAINT fk_app_user_default_organization_id FOREIGN KEY (default_organization_id) REFERENCES organization (organization_id) ON DELETE RESTRICT;
ALTER TABLE app_user ADD CONSTRAINT fk_app_user_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE app_user ADD CONSTRAINT fk_app_user_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE app_user ADD CONSTRAINT fk_app_user_deleted_by FOREIGN KEY (deleted_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE auth_session ADD CONSTRAINT fk_auth_session_user_id FOREIGN KEY (user_id) REFERENCES app_user (user_id) ON DELETE CASCADE;
ALTER TABLE auth_session ADD CONSTRAINT fk_auth_session_user_device_id FOREIGN KEY (user_device_id) REFERENCES user_device (user_device_id) ON DELETE RESTRICT;
ALTER TABLE user_device ADD CONSTRAINT fk_user_device_user_id FOREIGN KEY (user_id) REFERENCES app_user (user_id) ON DELETE CASCADE;
ALTER TABLE user_device ADD CONSTRAINT fk_user_device_platform_id FOREIGN KEY (platform_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE user_device ADD CONSTRAINT fk_user_device_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE password_reset_token ADD CONSTRAINT fk_password_reset_token_user_id FOREIGN KEY (user_id) REFERENCES app_user (user_id) ON DELETE CASCADE;
ALTER TABLE password_reset_token ADD CONSTRAINT fk_password_reset_token_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE role ADD CONSTRAINT fk_role_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE menu_item ADD CONSTRAINT fk_menu_item_menu_parent_id FOREIGN KEY (menu_parent_id) REFERENCES menu_item (menu_item_id) ON DELETE RESTRICT;
ALTER TABLE menu_item ADD CONSTRAINT fk_menu_item_organization_id FOREIGN KEY (organization_id) REFERENCES organization (organization_id) ON DELETE RESTRICT;
ALTER TABLE menu_item ADD CONSTRAINT fk_menu_item_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE menu_role ADD CONSTRAINT fk_menu_role_role_id FOREIGN KEY (role_id) REFERENCES role (role_id) ON DELETE RESTRICT;
ALTER TABLE menu_role ADD CONSTRAINT fk_menu_role_menu_item_id FOREIGN KEY (menu_item_id) REFERENCES menu_item (menu_item_id) ON DELETE RESTRICT;
ALTER TABLE menu_role ADD CONSTRAINT fk_menu_role_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE menu_function ADD CONSTRAINT fk_menu_function_menu_item_id FOREIGN KEY (menu_item_id) REFERENCES menu_item (menu_item_id) ON DELETE RESTRICT;
ALTER TABLE menu_function ADD CONSTRAINT fk_menu_function_function_id FOREIGN KEY (function_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE menu_function ADD CONSTRAINT fk_menu_function_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE employee_function ADD CONSTRAINT fk_employee_function_profile_id FOREIGN KEY (profile_id) REFERENCES employee (profile_id) ON DELETE CASCADE;
ALTER TABLE employee_function ADD CONSTRAINT fk_employee_function_function_id FOREIGN KEY (function_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE employee_function ADD CONSTRAINT fk_employee_function_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE employee_organization ADD CONSTRAINT fk_employee_organization_profile_id FOREIGN KEY (profile_id) REFERENCES employee (profile_id) ON DELETE CASCADE;
ALTER TABLE employee_organization ADD CONSTRAINT fk_employee_organization_organization_id FOREIGN KEY (organization_id) REFERENCES organization (organization_id) ON DELETE RESTRICT;
ALTER TABLE employee_organization ADD CONSTRAINT fk_employee_organization_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE menu_special_user_access ADD CONSTRAINT fk_menu_special_user_access_profile_id FOREIGN KEY (profile_id) REFERENCES profile (profile_id) ON DELETE RESTRICT;
ALTER TABLE menu_special_user_access ADD CONSTRAINT fk_menu_special_user_access_menu_item_id FOREIGN KEY (menu_item_id) REFERENCES menu_item (menu_item_id) ON DELETE RESTRICT;
ALTER TABLE menu_special_user_access ADD CONSTRAINT fk_menu_special_user_access_organization_id FOREIGN KEY (organization_id) REFERENCES organization (organization_id) ON DELETE RESTRICT;
ALTER TABLE menu_special_user_access ADD CONSTRAINT fk_menu_special_user_access_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE menu_special_user_access ADD CONSTRAINT fk_menu_special_user_access_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE user_activity ADD CONSTRAINT fk_user_activity_user_id FOREIGN KEY (user_id) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE user_activity ADD CONSTRAINT fk_user_activity_organization_id FOREIGN KEY (organization_id) REFERENCES organization (organization_id) ON DELETE RESTRICT;
ALTER TABLE user_activity ADD CONSTRAINT fk_user_activity_activity_type_id FOREIGN KEY (activity_type_id) REFERENCES parameter (parameter_id) ON DELETE RESTRICT;
ALTER TABLE user_activity ADD CONSTRAINT fk_user_activity_menu_item_id FOREIGN KEY (menu_item_id) REFERENCES menu_item (menu_item_id) ON DELETE RESTRICT;
ALTER TABLE file_object ADD CONSTRAINT fk_file_object_created_by FOREIGN KEY (created_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE file_object ADD CONSTRAINT fk_file_object_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE file_object ADD CONSTRAINT fk_file_object_deleted_by FOREIGN KEY (deleted_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;
ALTER TABLE audit_log ADD CONSTRAINT fk_audit_log_changed_by FOREIGN KEY (changed_by) REFERENCES app_user (user_id) ON DELETE RESTRICT;

-- ---------- indexes on foreign keys
CREATE INDEX ix_organization_city_id ON organization (city_id);
CREATE INDEX ix_organization_base_currency_id ON organization (base_currency_id);
CREATE INDEX ix_organization_time_zone_id ON organization (time_zone_id);
CREATE INDEX ix_organization_logo_file_id ON organization (logo_file_id);
CREATE INDEX ix_country_default_currency_id ON country (default_currency_id);
CREATE INDEX ix_state_country_id ON state (country_id);
CREATE INDEX ix_city_country_id ON city (country_id);
CREATE INDEX ix_city_state_id ON city (state_id);
CREATE INDEX ix_area_city_id ON area (city_id);
CREATE INDEX ix_nationality_country_id ON nationality (country_id);
CREATE INDEX ix_parameter_parameter_type_id ON parameter (parameter_type_id);
CREATE INDEX ix_parameter_parent_parameter_id ON parameter (parent_parameter_id);
CREATE INDEX ix_parameter_organization_id ON parameter (organization_id);
CREATE INDEX ix_document_type_category_id ON document_type (category_id);
CREATE INDEX ix_profile_user_type_id ON profile (user_type_id);
CREATE INDEX ix_profile_customer_id ON profile (customer_id);
CREATE INDEX ix_profile_company_id ON profile (company_id);
CREATE INDEX ix_profile_gender_id ON profile (gender_id);
CREATE INDEX ix_profile_age_group_id ON profile (age_group_id);
CREATE INDEX ix_profile_nationality_id ON profile (nationality_id);
CREATE INDEX ix_profile_photo_file_id ON profile (photo_file_id);
CREATE INDEX ix_profile_status_id ON profile (status_id);
CREATE INDEX ix_customer_legal_form_id ON customer (legal_form_id);
CREATE INDEX ix_customer_industry_type_id ON customer (industry_type_id);
CREATE INDEX ix_customer_organization_id ON customer (organization_id);
CREATE INDEX ix_customer_bill_to_id ON customer (bill_to_id);
CREATE INDEX ix_customer_payment_term_id ON customer (payment_term_id);
CREATE INDEX ix_customer_default_currency_id ON customer (default_currency_id);
CREATE INDEX ix_customer_account_manager_profile_id ON customer (account_manager_profile_id);
CREATE INDEX ix_customer_status_id ON customer (status_id);
CREATE INDEX ix_company_company_type_id ON company (company_type_id);
CREATE INDEX ix_company_country_id ON company (country_id);
CREATE INDEX ix_company_payment_term_id ON company (payment_term_id);
CREATE INDEX ix_company_currency_id ON company (currency_id);
CREATE INDEX ix_company_status_id ON company (status_id);
CREATE INDEX ix_address_profile_id ON address (profile_id);
CREATE INDEX ix_address_customer_id ON address (customer_id);
CREATE INDEX ix_address_company_id ON address (company_id);
CREATE INDEX ix_address_address_type_id ON address (address_type_id);
CREATE INDEX ix_address_country_id ON address (country_id);
CREATE INDEX ix_address_state_id ON address (state_id);
CREATE INDEX ix_address_city_id ON address (city_id);
CREATE INDEX ix_address_area_id ON address (area_id);
CREATE INDEX ix_document_profile_id ON document (profile_id);
CREATE INDEX ix_document_customer_id ON document (customer_id);
CREATE INDEX ix_document_company_id ON document (company_id);
CREATE INDEX ix_document_document_type_id ON document (document_type_id);
CREATE INDEX ix_document_file_id ON document (file_id);
CREATE INDEX ix_tax_registration_customer_id ON tax_registration (customer_id);
CREATE INDEX ix_tax_registration_company_id ON tax_registration (company_id);
CREATE INDEX ix_tax_registration_tax_type_id ON tax_registration (tax_type_id);
CREATE INDEX ix_tax_registration_country_id ON tax_registration (country_id);
CREATE INDEX ix_bank_account_profile_id ON bank_account (profile_id);
CREATE INDEX ix_bank_account_customer_id ON bank_account (customer_id);
CREATE INDEX ix_bank_account_company_id ON bank_account (company_id);
CREATE INDEX ix_bank_account_currency_id ON bank_account (currency_id);
CREATE INDEX ix_consent_profile_id ON consent (profile_id);
CREATE INDEX ix_consent_channel_id ON consent (channel_id);
CREATE INDEX ix_consent_status_id ON consent (status_id);
CREATE INDEX ix_employee_organization_id ON employee (organization_id);
CREATE INDEX ix_employee_employee_role_id ON employee (employee_role_id);
CREATE INDEX ix_employee_contractor_company_id ON employee (contractor_company_id);
CREATE INDEX ix_employee_skill_skill_id ON employee_skill (skill_id);
CREATE INDEX ix_employee_emergency_contact_profile_id ON employee_emergency_contact (profile_id);
CREATE INDEX ix_employee_emergency_contact_relationship_id ON employee_emergency_contact (relationship_id);
CREATE INDEX ix_app_user_profile_id ON app_user (profile_id);
CREATE INDEX ix_app_user_role_id ON app_user (role_id);
CREATE INDEX ix_app_user_account_status_id ON app_user (account_status_id);
CREATE INDEX ix_app_user_default_organization_id ON app_user (default_organization_id);
CREATE INDEX ix_auth_session_user_id ON auth_session (user_id);
CREATE INDEX ix_auth_session_user_device_id ON auth_session (user_device_id);
CREATE INDEX ix_user_device_user_id ON user_device (user_id);
CREATE INDEX ix_user_device_platform_id ON user_device (platform_id);
CREATE INDEX ix_password_reset_token_user_id ON password_reset_token (user_id);
CREATE INDEX ix_menu_item_menu_parent_id ON menu_item (menu_parent_id);
CREATE INDEX ix_menu_item_organization_id ON menu_item (organization_id);
CREATE INDEX ix_menu_role_role_id ON menu_role (role_id);
CREATE INDEX ix_menu_role_menu_item_id ON menu_role (menu_item_id);
CREATE INDEX ix_menu_function_menu_item_id ON menu_function (menu_item_id);
CREATE INDEX ix_menu_function_function_id ON menu_function (function_id);
CREATE INDEX ix_employee_function_function_id ON employee_function (function_id);
CREATE INDEX ix_employee_organization_organization_id ON employee_organization (organization_id);
CREATE INDEX ix_menu_special_user_access_profile_id ON menu_special_user_access (profile_id);
CREATE INDEX ix_menu_special_user_access_menu_item_id ON menu_special_user_access (menu_item_id);
CREATE INDEX ix_menu_special_user_access_organization_id ON menu_special_user_access (organization_id);
CREATE INDEX ix_user_activity_user_id ON user_activity (user_id);
CREATE INDEX ix_user_activity_organization_id ON user_activity (organization_id);
CREATE INDEX ix_user_activity_activity_type_id ON user_activity (activity_type_id);
CREATE INDEX ix_user_activity_menu_item_id ON user_activity (menu_item_id);
CREATE INDEX ix_audit_log_changed_by ON audit_log (changed_by);

-- ---------- other unique rules and search indexes
CREATE UNIQUE INDEX uq_profile_master_per_customer ON profile (customer_id) WHERE is_master_profile AND deleted_at IS NULL;
CREATE UNIQUE INDEX uq_profile_master_per_company ON profile (company_id) WHERE is_master_profile AND deleted_at IS NULL;
CREATE UNIQUE INDEX uq_organization_head_office ON organization ((true)) WHERE is_head_office;
CREATE UNIQUE INDEX uq_parameter_code_per_type ON parameter (parameter_type_id, code);
CREATE UNIQUE INDEX uq_parameter_default ON parameter (parameter_type_id) WHERE is_default AND is_active;
CREATE UNIQUE INDEX uq_state_country_name ON state (country_id, lower(name));
CREATE UNIQUE INDEX uq_area_city_name ON area (city_id, lower(name));
CREATE UNIQUE INDEX uq_menu_role ON menu_role (role_id, menu_item_id);
CREATE UNIQUE INDEX uq_menu_function ON menu_function (menu_item_id, function_id);
CREATE UNIQUE INDEX uq_menu_special_user_access ON menu_special_user_access (profile_id, menu_item_id, organization_id);
CREATE UNIQUE INDEX uq_user_device ON user_device (user_id, device_identifier);
CREATE INDEX ix_profile_name_trgm ON profile USING gin ((name || ' ' || COALESCE(last_name, '')) gin_trgm_ops);
CREATE INDEX ix_customer_name_trgm ON customer USING gin (customer_name gin_trgm_ops);
CREATE INDEX ix_company_name_trgm ON company USING gin (name gin_trgm_ops);
CREATE INDEX ix_profile_contact_no ON profile (contact_no);
CREATE INDEX ix_profile_email ON profile (email);
CREATE INDEX ix_document_expiry ON document (expiry_date) WHERE is_current AND deleted_at IS NULL;
CREATE INDEX ix_user_activity_user_time ON user_activity (user_id, occurred_at DESC);
CREATE INDEX ix_user_activity_time ON user_activity USING brin (occurred_at);
CREATE INDEX ix_audit_log_record ON audit_log (table_name, record_id, occurred_at DESC);

-- ---------- keep updated_at / row_version current
CREATE FUNCTION fn_touch_row() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    IF to_jsonb(NEW) ? 'row_version' THEN
        NEW := jsonb_populate_record(NEW, jsonb_build_object('row_version', COALESCE((to_jsonb(OLD)->>'row_version')::int, 0) + 1));
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_organization_touch BEFORE UPDATE ON organization FOR EACH ROW EXECUTE FUNCTION fn_touch_row();
CREATE TRIGGER trg_parameter_type_touch BEFORE UPDATE ON parameter_type FOR EACH ROW EXECUTE FUNCTION fn_touch_row();
CREATE TRIGGER trg_parameter_touch BEFORE UPDATE ON parameter FOR EACH ROW EXECUTE FUNCTION fn_touch_row();
CREATE TRIGGER trg_document_type_touch BEFORE UPDATE ON document_type FOR EACH ROW EXECUTE FUNCTION fn_touch_row();
CREATE TRIGGER trg_profile_touch BEFORE UPDATE ON profile FOR EACH ROW EXECUTE FUNCTION fn_touch_row();
CREATE TRIGGER trg_customer_touch BEFORE UPDATE ON customer FOR EACH ROW EXECUTE FUNCTION fn_touch_row();
CREATE TRIGGER trg_company_touch BEFORE UPDATE ON company FOR EACH ROW EXECUTE FUNCTION fn_touch_row();
CREATE TRIGGER trg_address_touch BEFORE UPDATE ON address FOR EACH ROW EXECUTE FUNCTION fn_touch_row();
CREATE TRIGGER trg_document_touch BEFORE UPDATE ON document FOR EACH ROW EXECUTE FUNCTION fn_touch_row();
CREATE TRIGGER trg_tax_registration_touch BEFORE UPDATE ON tax_registration FOR EACH ROW EXECUTE FUNCTION fn_touch_row();
CREATE TRIGGER trg_bank_account_touch BEFORE UPDATE ON bank_account FOR EACH ROW EXECUTE FUNCTION fn_touch_row();
CREATE TRIGGER trg_consent_touch BEFORE UPDATE ON consent FOR EACH ROW EXECUTE FUNCTION fn_touch_row();
CREATE TRIGGER trg_employee_touch BEFORE UPDATE ON employee FOR EACH ROW EXECUTE FUNCTION fn_touch_row();
CREATE TRIGGER trg_employee_emergency_contact_touch BEFORE UPDATE ON employee_emergency_contact FOR EACH ROW EXECUTE FUNCTION fn_touch_row();
CREATE TRIGGER trg_app_user_touch BEFORE UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION fn_touch_row();
CREATE TRIGGER trg_menu_special_user_access_touch BEFORE UPDATE ON menu_special_user_access FOR EACH ROW EXECUTE FUNCTION fn_touch_row();
CREATE TRIGGER trg_file_object_touch BEFORE UPDATE ON file_object FOR EACH ROW EXECUTE FUNCTION fn_touch_row();

-- ---------- column descriptions
COMMENT ON COLUMN organization.organization_id IS 'Unique ID of the organization (our own office / legal entity).';
COMMENT ON COLUMN organization.organization_code IS 'Short code.';
COMMENT ON COLUMN organization.name IS 'Organization name.';
COMMENT ON COLUMN organization.is_head_office IS 'Yes = this is the head office (only one allowed).';
COMMENT ON COLUMN organization.city_id IS 'City where it operates.';
COMMENT ON COLUMN organization.email IS 'Main e-mail of the organization.';
COMMENT ON COLUMN organization.contact_no IS 'Main phone in international format.';
COMMENT ON COLUMN organization.address_text IS 'Address printed on documents.';
COMMENT ON COLUMN organization.base_currency_id IS 'Main currency.';
COMMENT ON COLUMN organization.time_zone_id IS 'Time zone.';
COMMENT ON COLUMN organization.logo_file_id IS 'Logo used on documents.';
COMMENT ON COLUMN organization.is_active IS 'Yes = in use. No = hidden from new entries (old records keep working).';
COMMENT ON COLUMN country.country_id IS 'Surrogate key (small reference table - INTEGER identity is enough).';
COMMENT ON COLUMN country.iso2 IS 'ISO 3166-1 alpha-2 code (NEW - missing today).';
COMMENT ON COLUMN country.iso3 IS 'ISO 3166-1 alpha-3 code.';
COMMENT ON COLUMN country.name IS 'Country name.';
COMMENT ON COLUMN country.dial_code IS 'International dialling prefix incl. ''+'' (replaces the ContactNoCodeId indirection).';
COMMENT ON COLUMN country.default_currency_id IS 'Default currency of the country.';
COMMENT ON COLUMN country.is_active IS 'Hide without deleting.';
COMMENT ON COLUMN state.state_id IS 'Surrogate key.';
COMMENT ON COLUMN state.country_id IS 'Parent country.';
COMMENT ON COLUMN state.code IS 'State/emirate code.';
COMMENT ON COLUMN state.name IS 'State name.';
COMMENT ON COLUMN state.is_active IS 'Active flag.';
COMMENT ON COLUMN city.city_id IS 'Surrogate key.';
COMMENT ON COLUMN city.country_id IS 'Country (mandatory in new design; nullable today).';
COMMENT ON COLUMN city.state_id IS 'State/emirate (optional - some countries have none).';
COMMENT ON COLUMN city.name IS 'City name.';
COMMENT ON COLUMN city.is_active IS 'Active flag.';
COMMENT ON COLUMN area.area_id IS 'Surrogate key.';
COMMENT ON COLUMN area.city_id IS 'Parent city.';
COMMENT ON COLUMN area.name IS 'Area / community name.';
COMMENT ON COLUMN area.is_active IS 'Active flag.';
COMMENT ON COLUMN currency.currency_id IS 'Surrogate key.';
COMMENT ON COLUMN currency.code IS 'ISO 4217 code.';
COMMENT ON COLUMN currency.name IS 'Currency name.';
COMMENT ON COLUMN currency.symbol IS 'Display symbol.';
COMMENT ON COLUMN currency.decimal_places IS 'Minor-unit digits used for rounding/display.';
COMMENT ON COLUMN currency.is_active IS 'Active flag.';
COMMENT ON COLUMN currency.display_order IS 'Sort order in dropdowns.';
COMMENT ON COLUMN time_zone.time_zone_id IS 'Surrogate key.';
COMMENT ON COLUMN time_zone.iana_name IS 'IANA name that PostgreSQL understands (NEW).';
COMMENT ON COLUMN time_zone.utc_offset_minutes IS 'Standard offset from UTC in minutes.';
COMMENT ON COLUMN time_zone.is_active IS 'Active flag.';
COMMENT ON COLUMN nationality.nationality_id IS 'Surrogate key.';
COMMENT ON COLUMN nationality.code IS 'Short code.';
COMMENT ON COLUMN nationality.name IS 'Nationality label.';
COMMENT ON COLUMN nationality.country_id IS 'Related country (to be back-filled).';
COMMENT ON COLUMN nationality.is_active IS 'Active flag.';
COMMENT ON COLUMN parameter_type.parameter_type_id IS 'Surrogate key.';
COMMENT ON COLUMN parameter_type.code IS 'Stable machine code used by code (replaces magic numbers).';
COMMENT ON COLUMN parameter_type.name IS 'Admin-screen label.';
COMMENT ON COLUMN parameter_type.description IS 'What this group controls.';
COMMENT ON COLUMN parameter_type.module_code IS 'Module that owns the group (for admin grouping).';
COMMENT ON COLUMN parameter_type.is_system IS 'TRUE = fixed group: values are set up by the developers and cannot be added / deleted by users.';
COMMENT ON COLUMN parameter_type.allow_user_values IS 'TRUE = administrators may add/edit values (dynamic).';
COMMENT ON COLUMN parameter_type.is_company_scoped IS 'TRUE = values may be restricted to a organization.';
COMMENT ON COLUMN parameter_type.is_active IS 'Active flag.';
COMMENT ON COLUMN parameter_type.display_order IS 'Sort order in admin screen.';
COMMENT ON COLUMN parameter.parameter_id IS 'Surrogate key.';
COMMENT ON COLUMN parameter.parameter_type_id IS 'Dropdown group.';
COMMENT ON COLUMN parameter.code IS 'Stable code used by code instead of numeric ParameterValue.';
COMMENT ON COLUMN parameter.label IS 'Text shown to users.';
COMMENT ON COLUMN parameter.description IS 'Help text / tooltip.';
COMMENT ON COLUMN parameter.display_order IS 'Order in dropdown.';
COMMENT ON COLUMN parameter.is_default IS 'Pre-selected value (max one per type, enforced by partial unique index).';
COMMENT ON COLUMN parameter.is_fixed IS 'TRUE = system-seeded value that cannot be deleted or have its code changed.';
COMMENT ON COLUMN parameter.is_active IS 'FALSE hides the value from new entries but keeps history valid.';
COMMENT ON COLUMN parameter.color_hex IS 'Optional UI colour (replaces Flag Color / Calendar Color types that store hex as text).';
COMMENT ON COLUMN parameter.parent_parameter_id IS 'Parent value for dependent dropdowns (e.g. sub-category).';
COMMENT ON COLUMN parameter.organization_id IS 'Restricts the value to one organization (NULL = all).';
COMMENT ON COLUMN document_type.document_type_id IS 'Surrogate key.';
COMMENT ON COLUMN document_type.code IS 'Stable code.';
COMMENT ON COLUMN document_type.name IS 'Display name.';
COMMENT ON COLUMN document_type.category_id IS 'Document category (IDENTITY, LICENSE, TAX, BANK, CONTRACT, PHOTO, OTHER).';
COMMENT ON COLUMN document_type.applies_to IS '';
COMMENT ON COLUMN document_type.requires_number IS 'Document number is mandatory.';
COMMENT ON COLUMN document_type.requires_expiry IS 'Expiry date is mandatory (drives expiry alerts).';
COMMENT ON COLUMN document_type.requires_file IS 'Scanned copy is mandatory.';
COMMENT ON COLUMN document_type.expiry_alert_days IS 'Days before expiry to alert.';
COMMENT ON COLUMN document_type.is_active IS 'Active flag.';
COMMENT ON COLUMN document_type.display_order IS 'Sort order.';
COMMENT ON COLUMN profile.profile_id IS 'Unique ID of the person.';
COMMENT ON COLUMN profile.public_id IS 'Random public ID used by the application so real row numbers are never exposed.';
COMMENT ON COLUMN profile.user_type_id IS 'What this person is: Customer, Employee, Agent, Supplier, Contractor or Competitor.';
COMMENT ON COLUMN profile.customer_id IS 'For a customer person: the customer this person belongs to. Empty otherwise.';
COMMENT ON COLUMN profile.company_id IS 'For a contact person of an agent / supplier / contractor / competitor: that company. Empty otherwise.';
COMMENT ON COLUMN profile.is_master_profile IS 'Yes = the MASTER (main) person of the customer or company. Exactly one master for each; an individual customer''s only profile is the master.';
COMMENT ON COLUMN profile.name IS 'First name of the person.';
COMMENT ON COLUMN profile.last_name IS 'Last name.';
COMMENT ON COLUMN profile.email IS 'E-mail address of the person.';
COMMENT ON COLUMN profile.contact_no IS 'Main phone number in international format (+971...).';
COMMENT ON COLUMN profile.alt_contact_no IS 'Second phone number.';
COMMENT ON COLUMN profile.designation IS 'Job title.';
COMMENT ON COLUMN profile.gender_id IS 'Gender (dropdown value).';
COMMENT ON COLUMN profile.date_of_birth IS 'Date of birth.';
COMMENT ON COLUMN profile.age_group_id IS 'Age band, used only when the date of birth is unknown.';
COMMENT ON COLUMN profile.nationality_id IS 'Nationality.';
COMMENT ON COLUMN profile.profession IS 'Occupation.';
COMMENT ON COLUMN profile.photo_file_id IS 'Photo.';
COMMENT ON COLUMN profile.status_id IS 'Active, Inactive, Suspended...';
COMMENT ON COLUMN profile.preferred_language IS 'Language for messages (en, ar).';
COMMENT ON COLUMN profile.notes IS 'Internal remarks.';
COMMENT ON COLUMN customer.customer_id IS 'Unique ID of the customer.';
COMMENT ON COLUMN customer.public_id IS 'Random public ID used by the application so real row numbers are never exposed.';
COMMENT ON COLUMN customer.customer_kind IS 'INDIVIDUAL = a private person (exactly one profile). COMPANY = a business customer (many profiles, one master).';
COMMENT ON COLUMN customer.customer_code IS 'Customer number used by the business.';
COMMENT ON COLUMN customer.customer_name IS 'Name of a COMPANY customer. Left empty for an individual customer - their name is read from their profile, so it is never stored twice.';
COMMENT ON COLUMN customer.legal_name IS 'Registered legal name (company customers only).';
COMMENT ON COLUMN customer.legal_form_id IS 'Legal form: LLC, Free Zone... (company customers only).';
COMMENT ON COLUMN customer.industry_type_id IS 'Industry (company customers only).';
COMMENT ON COLUMN customer.organization_id IS 'Our organization that normally serves this customer (empty = any).';
COMMENT ON COLUMN customer.bill_to_id IS 'Who is billed: Self or Company.';
COMMENT ON COLUMN customer.payment_term_id IS 'Payment terms (Credit / 100% Advance ...).';
COMMENT ON COLUMN customer.credit_limit IS 'Approved credit limit.';
COMMENT ON COLUMN customer.default_currency_id IS 'Invoice currency.';
COMMENT ON COLUMN customer.is_key_account IS 'Yes = key account.';
COMMENT ON COLUMN customer.account_manager_profile_id IS 'The sales executive responsible.';
COMMENT ON COLUMN customer.email_optin IS 'Customer agreed to receive e-mails.';
COMMENT ON COLUMN customer.status_id IS 'Active, Inactive, Suspended...';
COMMENT ON COLUMN customer.notes IS 'Internal remarks.';
COMMENT ON COLUMN company.company_id IS 'Unique ID of the company.';
COMMENT ON COLUMN company.public_id IS 'Random public ID used by the application so real row numbers are never exposed.';
COMMENT ON COLUMN company.company_type_id IS 'What the company is: Agent, Supplier, Contractor or Competitor.';
COMMENT ON COLUMN company.company_code IS 'Code used by the business.';
COMMENT ON COLUMN company.name IS 'The actual name of the company.';
COMMENT ON COLUMN company.legal_name IS 'Registered legal name, if different.';
COMMENT ON COLUMN company.email IS 'Main e-mail of the company.';
COMMENT ON COLUMN company.contact_no IS 'Main phone of the company in international format.';
COMMENT ON COLUMN company.website IS 'Website.';
COMMENT ON COLUMN company.country_id IS 'Home country.';
COMMENT ON COLUMN company.services IS 'What the company provides or does.';
COMMENT ON COLUMN company.coverage IS 'Countries / areas the company covers.';
COMMENT ON COLUMN company.payment_term_id IS 'Payment terms agreed with the company.';
COMMENT ON COLUMN company.commission_percent IS 'Commission % (used for agents).';
COMMENT ON COLUMN company.currency_id IS 'Currency used with the company.';
COMMENT ON COLUMN company.status_id IS 'Active, Inactive, Suspended...';
COMMENT ON COLUMN company.notes IS 'Internal remarks.';
COMMENT ON COLUMN address.address_id IS 'Unique ID of the address.';
COMMENT ON COLUMN address.profile_id IS 'The person this belongs to. (Exactly one of profile_id / customer_id / company_id is filled.)';
COMMENT ON COLUMN address.customer_id IS 'The customer this belongs to. (Exactly one of profile_id / customer_id / company_id is filled.)';
COMMENT ON COLUMN address.company_id IS 'The agent / supplier / contractor / competitor company this belongs to. (Exactly one of profile_id / customer_id / company_id is filled.)';
COMMENT ON COLUMN address.address_type_id IS 'Billing, Shipping, Home, Office, Registered, Other.';
COMMENT ON COLUMN address.is_default IS 'Yes = the default address of its type.';
COMMENT ON COLUMN address.line1 IS 'Street / building / unit.';
COMMENT ON COLUMN address.line2 IS 'More address detail.';
COMMENT ON COLUMN address.country_id IS 'Country.';
COMMENT ON COLUMN address.state_id IS 'State / emirate.';
COMMENT ON COLUMN address.city_id IS 'City.';
COMMENT ON COLUMN address.area_id IS 'Area / community.';
COMMENT ON COLUMN address.postal_code IS 'Postal code / PO Box.';
COMMENT ON COLUMN address.latitude IS 'Map latitude.';
COMMENT ON COLUMN address.longitude IS 'Map longitude.';
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
COMMENT ON COLUMN tax_registration.tax_registration_id IS 'Unique ID of the tax record.';
COMMENT ON COLUMN tax_registration.customer_id IS 'The customer this belongs to. (Exactly one of profile_id / customer_id / company_id is filled.)';
COMMENT ON COLUMN tax_registration.company_id IS 'The agent / supplier / contractor / competitor company this belongs to. (Exactly one of profile_id / customer_id / company_id is filled.)';
COMMENT ON COLUMN tax_registration.tax_type_id IS 'Kind of tax (e.g. VAT - registration label TRN).';
COMMENT ON COLUMN tax_registration.registration_no IS 'The tax registration number (TRN).';
COMMENT ON COLUMN tax_registration.country_id IS 'Country of registration.';
COMMENT ON COLUMN bank_account.bank_account_id IS 'Unique ID of the bank account record.';
COMMENT ON COLUMN bank_account.profile_id IS 'The person this belongs to. (Exactly one of profile_id / customer_id / company_id is filled.)';
COMMENT ON COLUMN bank_account.customer_id IS 'The customer this belongs to. (Exactly one of profile_id / customer_id / company_id is filled.)';
COMMENT ON COLUMN bank_account.company_id IS 'The agent / supplier / contractor / competitor company this belongs to. (Exactly one of profile_id / customer_id / company_id is filled.)';
COMMENT ON COLUMN bank_account.account_holder_name IS 'Name on the account.';
COMMENT ON COLUMN bank_account.bank_name IS 'Bank name.';
COMMENT ON COLUMN bank_account.branch_name IS 'Bank branch.';
COMMENT ON COLUMN bank_account.account_number_enc IS 'Account number, stored encrypted.';
COMMENT ON COLUMN bank_account.iban IS 'IBAN.';
COMMENT ON COLUMN bank_account.swift_bic IS 'SWIFT / BIC code.';
COMMENT ON COLUMN bank_account.currency_id IS 'Account currency.';
COMMENT ON COLUMN bank_account.is_default IS 'Yes = the default account.';
COMMENT ON COLUMN bank_account.is_active IS 'Yes = in use. No = hidden from new entries (old records keep working).';
COMMENT ON COLUMN consent.consent_id IS 'Unique ID of the consent record.';
COMMENT ON COLUMN consent.profile_id IS 'The person who gave or refused permission.';
COMMENT ON COLUMN consent.channel_id IS 'SMS, Email or WhatsApp.';
COMMENT ON COLUMN consent.status_id IS 'Pending, Approved or Blocked.';
COMMENT ON COLUMN consent.status_changed_at IS 'When the status last changed.';
COMMENT ON COLUMN consent.source IS 'Where it came from (WhatsApp reply, web form, admin).';
COMMENT ON COLUMN employee.profile_id IS 'The person who is the employee (name, phone, e-mail and status are in profile - not repeated here).';
COMMENT ON COLUMN employee.employee_code IS 'Staff number.';
COMMENT ON COLUMN employee.organization_id IS 'Home organization.';
COMMENT ON COLUMN employee.employee_role_id IS 'Working role: Team Leader, Driver, Crew Member, Supervisor, Manager.';
COMMENT ON COLUMN employee.contractor_company_id IS 'The contractor company that supplies this worker (outsourced staff). Empty = own employee.';
COMMENT ON COLUMN employee.is_outsourced IS 'Yes = supplied by a contractor.';
COMMENT ON COLUMN employee.join_date IS 'Date joined.';
COMMENT ON COLUMN employee.exit_date IS 'Date left. Must not be before the join date.';
COMMENT ON COLUMN employee.billing_rate IS 'Rate charged to customers for this employee.';
COMMENT ON COLUMN employee.ctc_rate IS 'Cost of this employee to the company.';
COMMENT ON COLUMN employee_skill.profile_id IS 'The employee.';
COMMENT ON COLUMN employee_skill.skill_id IS 'The skill (Carpenter, Electrician...).';
COMMENT ON COLUMN employee_emergency_contact.emergency_contact_id IS 'Unique ID of the emergency contact.';
COMMENT ON COLUMN employee_emergency_contact.profile_id IS 'The employee.';
COMMENT ON COLUMN employee_emergency_contact.contact_name IS 'Name of the person to call.';
COMMENT ON COLUMN employee_emergency_contact.relationship_id IS 'Relationship: spouse, parent, sibling...';
COMMENT ON COLUMN employee_emergency_contact.phone IS 'Phone in international format.';
COMMENT ON COLUMN employee_emergency_contact.is_primary IS 'Yes = first person to call.';
COMMENT ON COLUMN app_user.user_id IS 'Surrogate key.';
COMMENT ON COLUMN app_user.public_id IS 'Opaque id for tokens/API.';
COMMENT ON COLUMN app_user.profile_id IS 'The person this login belongs to (one login per person).';
COMMENT ON COLUMN app_user.username IS 'Login name (case-insensitive). Today the login field is the e-mail address.';
COMMENT ON COLUMN app_user.password_hash IS 'Argon2id/bcrypt hash - NEVER plaintext or reversible encryption.';
COMMENT ON COLUMN app_user.password_changed_at IS 'Last change - drives expiry policy.';
COMMENT ON COLUMN app_user.must_change_password IS 'Force a password change at next login (set for new users and after a reset).';
COMMENT ON COLUMN app_user.role_id IS 'The user''s ONE role (same as SiteUser.RoleId in emove_app).';
COMMENT ON COLUMN app_user.account_status_id IS 'ACCOUNT_STATUS: ACTIVE, INACTIVE, SUSPENDED, LOCKED, PENDING_ACTIVATION.';
COMMENT ON COLUMN app_user.failed_login_count IS 'Consecutive failures.';
COMMENT ON COLUMN app_user.locked_until IS 'Temporary lock expiry.';
COMMENT ON COLUMN app_user.last_login_at IS 'Last successful login.';
COMMENT ON COLUMN app_user.last_login_ip IS 'IP of last login.';
COMMENT ON COLUMN app_user.mfa_enabled IS 'Second factor on.';
COMMENT ON COLUMN app_user.mfa_secret_enc IS 'Encrypted TOTP secret.';
COMMENT ON COLUMN app_user.default_organization_id IS 'Organization selected after login.';
COMMENT ON COLUMN auth_session.session_id IS 'Session id.';
COMMENT ON COLUMN auth_session.user_id IS 'User.';
COMMENT ON COLUMN auth_session.refresh_token_hash IS 'SHA-256 of the token.';
COMMENT ON COLUMN auth_session.user_device_id IS 'Device used (mobile).';
COMMENT ON COLUMN auth_session.issued_at IS 'Issue time.';
COMMENT ON COLUMN auth_session.expires_at IS 'Expiry.';
COMMENT ON COLUMN auth_session.revoked_at IS 'Logout / forced revoke.';
COMMENT ON COLUMN auth_session.ip_address IS 'Client IP.';
COMMENT ON COLUMN auth_session.user_agent IS 'Client agent.';
COMMENT ON COLUMN auth_session.is_mobile IS 'Mobile app session.';
COMMENT ON COLUMN user_device.user_device_id IS 'Surrogate key.';
COMMENT ON COLUMN user_device.user_id IS 'User.';
COMMENT ON COLUMN user_device.device_identifier IS 'Vendor device id.';
COMMENT ON COLUMN user_device.platform_id IS 'DEVICE_TYPE (Android / iOS).';
COMMENT ON COLUMN user_device.push_token IS 'FCM/APNS token.';
COMMENT ON COLUMN user_device.app_version IS 'Installed app version.';
COMMENT ON COLUMN user_device.last_seen_at IS 'Last activity.';
COMMENT ON COLUMN user_device.is_active IS 'Active flag.';
COMMENT ON COLUMN password_reset_token.reset_token_id IS 'Surrogate key.';
COMMENT ON COLUMN password_reset_token.user_id IS 'User.';
COMMENT ON COLUMN password_reset_token.token_hash IS 'SHA-256 of the one-time token.';
COMMENT ON COLUMN password_reset_token.purpose IS '';
COMMENT ON COLUMN password_reset_token.expires_at IS 'Short expiry (e.g. 30 min).';
COMMENT ON COLUMN password_reset_token.used_at IS 'Set when consumed.';
COMMENT ON COLUMN password_reset_token.requested_ip IS 'Requesting IP.';
COMMENT ON COLUMN role.role_id IS 'Unique ID of the role.';
COMMENT ON COLUMN role.role_code IS 'Fixed short code used by the application.';
COMMENT ON COLUMN role.name IS 'Role name.';
COMMENT ON COLUMN role.role_level IS '0 = highest authority.';
COMMENT ON COLUMN role.is_active IS 'Yes = in use.';
COMMENT ON COLUMN menu_item.menu_item_id IS 'Unique ID of the menu / screen.';
COMMENT ON COLUMN menu_item.menu_code IS 'Fixed short code used by the application (replaces hard-coded menu numbers).';
COMMENT ON COLUMN menu_item.menu_name IS 'Menu label.';
COMMENT ON COLUMN menu_item.menu_parent_id IS 'Parent menu (empty = top level).';
COMMENT ON COLUMN menu_item.menu_order IS 'Order among its siblings.';
COMMENT ON COLUMN menu_item.css_class IS 'Icon / style.';
COMMENT ON COLUMN menu_item.page_url IS 'Screen address.';
COMMENT ON COLUMN menu_item.is_main_menu IS 'Yes = shown in the main menu; No = side / sub menu.';
COMMENT ON COLUMN menu_item.organization_id IS 'Only for this organization (empty = all).';
COMMENT ON COLUMN menu_item.is_active IS 'Yes = in use.';
COMMENT ON COLUMN menu_role.menu_role_id IS 'Unique ID.';
COMMENT ON COLUMN menu_role.role_id IS 'The role.';
COMMENT ON COLUMN menu_role.menu_item_id IS 'The menu the role may open.';
COMMENT ON COLUMN menu_role.page_url IS 'Optional different screen address for this role.';
COMMENT ON COLUMN menu_role.is_create IS 'Role may create records on this screen.';
COMMENT ON COLUMN menu_role.is_edit IS 'Role may edit records on this screen.';
COMMENT ON COLUMN menu_role.is_delete IS 'Role may delete records on this screen.';
COMMENT ON COLUMN menu_function.menu_function_id IS 'Unique ID.';
COMMENT ON COLUMN menu_function.menu_item_id IS 'The menu.';
COMMENT ON COLUMN menu_function.function_id IS 'The function that gets this menu: Sales, Operations, Stores, Finance, Admin, Corporate.';
COMMENT ON COLUMN employee_function.profile_id IS 'The employee.';
COMMENT ON COLUMN employee_function.function_id IS 'A function the employee works in. An employee can have several.';
COMMENT ON COLUMN employee_organization.profile_id IS 'The employee.';
COMMENT ON COLUMN employee_organization.organization_id IS 'An organization the employee may work in / switch to.';
COMMENT ON COLUMN menu_special_user_access.menu_special_user_access_id IS 'Unique ID.';
COMMENT ON COLUMN menu_special_user_access.profile_id IS 'The user this exception is for.';
COMMENT ON COLUMN menu_special_user_access.menu_item_id IS 'The menu.';
COMMENT ON COLUMN menu_special_user_access.organization_id IS 'The organization in which the exception applies.';
COMMENT ON COLUMN menu_special_user_access.is_include IS 'Yes = give this menu even though role / function do not. No = take this menu away.';
COMMENT ON COLUMN menu_special_user_access.page_url IS 'Optional different screen address.';
COMMENT ON COLUMN menu_special_user_access.is_create IS 'May create.';
COMMENT ON COLUMN menu_special_user_access.is_edit IS 'May edit.';
COMMENT ON COLUMN menu_special_user_access.is_delete IS 'May delete.';
COMMENT ON COLUMN user_activity.activity_id IS 'Surrogate key.';
COMMENT ON COLUMN user_activity.occurred_at IS 'Event time.';
COMMENT ON COLUMN user_activity.user_id IS 'User (NULL for failed login of unknown user).';
COMMENT ON COLUMN user_activity.organization_id IS 'Organization context.';
COMMENT ON COLUMN user_activity.activity_type_id IS 'USER_ACTIVITY_TYPE: LOGIN, LOGOUT, FAILED_LOGIN, PASSWORD_CHANGE, CREATE, UPDATE, DELETE, VIEW, EXPORT, IMPORT, APPROVE, REJECT.';
COMMENT ON COLUMN user_activity.menu_item_id IS 'Screen involved.';
COMMENT ON COLUMN user_activity.entity_name IS 'Entity touched.';
COMMENT ON COLUMN user_activity.entity_id IS 'Entity key.';
COMMENT ON COLUMN user_activity.result IS '';
COMMENT ON COLUMN user_activity.ip_address IS 'Client IP.';
COMMENT ON COLUMN user_activity.user_agent IS 'Client agent.';
COMMENT ON COLUMN user_activity.details IS 'Genuinely free-form extra context (filters used, export name).';
COMMENT ON COLUMN file_object.file_id IS 'Surrogate key.';
COMMENT ON COLUMN file_object.public_id IS 'Opaque id for download URLs.';
COMMENT ON COLUMN file_object.storage_provider IS '';
COMMENT ON COLUMN file_object.storage_key IS 'Relative path / blob key.';
COMMENT ON COLUMN file_object.original_name IS 'Name uploaded by the user.';
COMMENT ON COLUMN file_object.mime_type IS 'Content type.';
COMMENT ON COLUMN file_object.size_bytes IS '';
COMMENT ON COLUMN file_object.sha256 IS 'Checksum for integrity / de-duplication.';
COMMENT ON COLUMN audit_log.audit_id IS 'Surrogate key.';
COMMENT ON COLUMN audit_log.occurred_at IS 'When.';
COMMENT ON COLUMN audit_log.table_name IS 'Table changed.';
COMMENT ON COLUMN audit_log.record_id IS 'Primary key of the row.';
COMMENT ON COLUMN audit_log.action IS '';
COMMENT ON COLUMN audit_log.changed_by IS 'Actor (NULL = system job).';
COMMENT ON COLUMN audit_log.old_values IS 'Row before change (jsonb is appropriate: the shape varies by table).';
COMMENT ON COLUMN audit_log.new_values IS 'Row after change.';
COMMENT ON COLUMN audit_log.request_id IS 'API request correlation id.';

