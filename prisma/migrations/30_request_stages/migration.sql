-- Stages of a service request (Enquiry, Survey, Quote) and the statuses under each stage.
-- Code refers to both by parameter_value, so the values below are fixed.

-- 1. Stages.
INSERT INTO parameter_type (code, name, description, module_code, is_system, allow_user_values, display_order)
VALUES ('REQUEST_STAGE', 'Request Stage', 'Stage of a service request', 'SALES', true, false, 30)
ON CONFLICT (code) DO NOTHING;

INSERT INTO parameter (parameter_type_id, code, label, parameter_value, display_order, is_default, is_fixed)
SELECT t.parameter_type_id, v.code, v.label, v.n, v.n, v.n = 1, true
FROM parameter_type t
CROSS JOIN (VALUES ('ENQUIRY', 'Enquiry', 1), ('SURVEY', 'Survey', 2), ('QUOTE', 'Quote', 3))
  AS v (code, label, n)
WHERE t.code = 'REQUEST_STAGE'
  AND NOT EXISTS (
    SELECT 1 FROM parameter p WHERE p.parameter_type_id = t.parameter_type_id AND p.code = v.code
  );

-- 2. Statuses: move the current values out of the way, then give every status its value and stage.
UPDATE parameter p SET parameter_value = -p.parameter_value
FROM parameter_type t
WHERE p.parameter_type_id = t.parameter_type_id AND t.code = 'REQUEST_STATUS';

CREATE TEMP TABLE wanted_status (code varchar(60), label varchar(250), n int, stage varchar(60));
INSERT INTO wanted_status VALUES
  ('ENQUIRY_NEW', 'Enquiry New', 1, 'ENQUIRY'),
  ('ASSIGNED', 'Enquiry Assigned', 2, 'ENQUIRY'),
  ('CONTACTED', 'Enquiry Contacted', 3, 'ENQUIRY'),
  ('DROPPED', 'Enquiry Dropped', 4, 'ENQUIRY'),
  ('ENQUIRY_SCHEDULED', 'Enquiry Scheduled', 5, 'ENQUIRY'),
  ('SURVEY_NEW', 'Survey New', 6, 'SURVEY'),
  ('SURVEY_COMPLETED', 'Survey Completed', 7, 'SURVEY'),
  ('QUOTE_NEW', 'Quote New', 8, 'QUOTE'),
  ('QUOTE_REVIEW_REQUIRED', 'Quote Review Required', 9, 'QUOTE'),
  ('QUOTE_REVIEW_COMPLETED', 'Quote Review Completed', 10, 'QUOTE'),
  ('QUOTE_SENT', 'Quote Sent', 11, 'QUOTE'),
  ('QUOTE_CUSTOMER_APPROVED', 'Quote Customer Approved', 12, 'QUOTE'),
  ('QUOTE_REVIEW_REJECTED', 'Quote Review Rejected', 13, 'QUOTE'),
  ('QUOTE_REVISED', 'Quote Revised', 14, 'QUOTE'),
  ('QUOTE_FOLLOW_UP', 'Quote Follow Up', 15, 'QUOTE');

-- Existing statuses (Assigned, Contacted, Dropped) keep their ids.
UPDATE parameter p
SET label = w.label, parameter_value = w.n, display_order = w.n, is_fixed = true,
    is_default = (w.code = 'ASSIGNED'),
    parent_parameter_id = (SELECT s.parameter_id FROM parameter s JOIN parameter_type st USING (parameter_type_id)
                           WHERE st.code = 'REQUEST_STAGE' AND s.code = w.stage)
FROM parameter_type t, wanted_status w
WHERE p.parameter_type_id = t.parameter_type_id AND t.code = 'REQUEST_STATUS' AND p.code = w.code;

INSERT INTO parameter (parameter_type_id, code, label, parameter_value, display_order, is_default, is_fixed, parent_parameter_id)
SELECT t.parameter_type_id, w.code, w.label, w.n, w.n, false, true,
       (SELECT s.parameter_id FROM parameter s JOIN parameter_type st USING (parameter_type_id)
        WHERE st.code = 'REQUEST_STAGE' AND s.code = w.stage)
FROM parameter_type t
CROSS JOIN wanted_status w
WHERE t.code = 'REQUEST_STATUS'
  AND NOT EXISTS (
    SELECT 1 FROM parameter p WHERE p.parameter_type_id = t.parameter_type_id AND p.code = w.code
  );

DROP TABLE wanted_status;

-- 3. The stage of each request (all current requests are enquiries).
ALTER TABLE service_request ADD COLUMN stage_id int;
UPDATE service_request SET stage_id = (
  SELECT p.parameter_id FROM parameter p JOIN parameter_type t USING (parameter_type_id)
  WHERE t.code = 'REQUEST_STAGE' AND p.code = 'ENQUIRY');
ALTER TABLE service_request
  ALTER COLUMN stage_id SET NOT NULL,
  ADD CONSTRAINT fk_service_request_stage_id FOREIGN KEY (stage_id) REFERENCES parameter (parameter_id);
CREATE INDEX ix_service_request_stage ON service_request (stage_id);
COMMENT ON COLUMN service_request.stage_id IS 'REQUEST_STAGE (Enquiry, Survey, Quote).';
