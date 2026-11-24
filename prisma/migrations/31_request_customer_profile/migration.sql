-- The customer's contact person for a request (a company has several; an individual has one).
ALTER TABLE service_request
  ADD COLUMN customer_profile_id bigint,
  ADD CONSTRAINT fk_service_request_customer_profile_id FOREIGN KEY (customer_profile_id)
    REFERENCES profile (profile_id);
COMMENT ON COLUMN service_request.customer_profile_id IS 'Contact person of the customer for this request.';

-- Existing requests use the customer's main contact.
UPDATE service_request sr SET customer_profile_id = cp.profile_id
FROM customer_profile cp
WHERE cp.customer_id = sr.customer_id AND cp.is_master AND cp.deleted_at IS NULL;
