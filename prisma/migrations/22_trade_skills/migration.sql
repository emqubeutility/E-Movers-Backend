-- Trades are skills of a person (employee_skill); their login role stays Driver, Crew Member, etc.
WITH skill_type AS (
  SELECT parameter_type_id FROM parameter_type WHERE code = 'SKILL'
),
trades (code, label, n) AS (
  VALUES
    ('CARPENTER', 'Carpenter', 1),
    ('PLUMBER', 'Plumber', 2),
    ('ELECTRICIAN', 'Electrician', 3),
    ('PAINTER', 'Painter', 4),
    ('AC_TECHNICIAN', 'AC Technician', 5),
    ('HANDYMAN', 'Handyman', 6)
),
base AS (
  SELECT COALESCE(MAX(p.parameter_value), 0) AS max_value,
         COALESCE(MAX(p.display_order), 0) AS max_order
  FROM parameter p
  WHERE p.parameter_type_id = (SELECT parameter_type_id FROM skill_type)
)
INSERT INTO parameter (parameter_type_id, code, label, parameter_value, display_order)
SELECT st.parameter_type_id, t.code, t.label, b.max_value + t.n, b.max_order + t.n
FROM trades t
CROSS JOIN skill_type st
CROSS JOIN base b
WHERE NOT EXISTS (
  SELECT 1 FROM parameter p WHERE p.parameter_type_id = st.parameter_type_id AND p.code = t.code
);
