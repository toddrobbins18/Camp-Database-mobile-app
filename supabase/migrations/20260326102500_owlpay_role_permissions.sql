-- Grant OwlPay page permission to staff-facing roles for Tyler Hill Camp.
-- Aligns with web sidebar behavior where Owl Pay is shown for Tyler Hill.

INSERT INTO public.role_permissions (company_id, role, menu_item, can_access)
SELECT
  c.id AS company_id,
  t.role::app_role AS role,
  'owl-pay' AS menu_item,
  true AS can_access
FROM public.companies c
CROSS JOIN (
  VALUES ('admin'), ('staff'), ('specialist')
) AS t(role)
WHERE c.slug = 'tyler-hill-camp'
ON CONFLICT (company_id, role, menu_item)
DO UPDATE SET can_access = EXCLUDED.can_access;
