-- People linked to a customer were saved as EMPLOYEE by mistake; they are CUSTOMER profiles.
-- Profiles that are also staff (have an employee row) are left as they are.
UPDATE profile p
SET user_type_id = ut.parameter_id
FROM parameter ut
JOIN parameter_type t ON t.parameter_type_id = ut.parameter_type_id
WHERE t.code = 'USER_TYPE'
  AND ut.code = 'CUSTOMER'
  AND p.user_type_id <> ut.parameter_id
  AND EXISTS (SELECT 1 FROM customer_profile cp WHERE cp.profile_id = p.profile_id)
  AND NOT EXISTS (SELECT 1 FROM employee e WHERE e.profile_id = p.profile_id);
