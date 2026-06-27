-- SCRIPT 3: Role permissions matrix (Lovable-style – all roles × menu items)
-- Run only if role_permissions and app_role already exist. Fills missing rows only.

WITH all_menu_items AS (
  SELECT unnest(ARRAY[
    'activities', 'admin', 'appointments', 'athletics', 'awards', 'calendar',
    'daily-schedule', 'daily-wolf-management', 'daily-wolf-printable', 'dashboard',
    'division-permissions', 'evaluation-questions', 'incidents', 'menu', 'messages',
    'notes', 'notification-preferences', 'nurse', 'od-management', 'rainy-day',
    'reports', 'role-permissions', 'roster', 'roster-templates', 'special-events',
    'special-meals', 'specialist-sport-assignments', 'sports-academy', 'sports-calendar',
    'staff', 'transportation', 'tutoring-therapy', 'user-approvals'
  ]) AS menu_item
),
all_roles AS (
  SELECT unnest(ARRAY[
    'admin', 'staff', 'viewer', 'division_leader', 'specialist', 'super_admin', 'health_center'
  ]::app_role[]) AS role
),
all_companies AS (
  SELECT id AS company_id FROM public.companies WHERE is_active = true
),
full_matrix AS (
  SELECT
    c.company_id,
    r.role,
    m.menu_item,
    CASE
      WHEN m.menu_item IN ('admin', 'role-permissions', 'division-permissions',
                           'evaluation-questions', 'user-approvals', 'specialist-sport-assignments')
           AND r.role IN ('admin'::app_role, 'super_admin'::app_role) THEN true
      WHEN m.menu_item IN ('dashboard', 'roster', 'staff', 'calendar', 'menu', 'messages',
                           'activities', 'athletics', 'sports-calendar', 'transportation',
                           'notes', 'awards', 'incidents', 'nurse', 'sports-academy',
                           'rainy-day', 'special-events', 'tutoring-therapy', 'roster-templates',
                           'od-management', 'appointments', 'daily-schedule', 'reports',
                           'daily-wolf-printable', 'daily-wolf-management', 'special-meals',
                           'notification-preferences')
           AND r.role IN ('admin'::app_role, 'super_admin'::app_role, 'staff'::app_role) THEN true
      WHEN m.menu_item IN ('nurse', 'appointments', 'od-management', 'roster', 'staff', 'dashboard')
           AND r.role = 'health_center'::app_role THEN true
      WHEN m.menu_item IN ('dashboard', 'roster', 'calendar', 'menu', 'athletics',
                           'sports-calendar', 'activities', 'special-events', 'awards',
                           'notification-preferences')
           AND r.role IN ('division_leader'::app_role, 'specialist'::app_role, 'viewer'::app_role) THEN true
      ELSE false
    END AS can_access
  FROM all_companies c
  CROSS JOIN all_roles r
  CROSS JOIN all_menu_items m
)
INSERT INTO public.role_permissions (company_id, role, menu_item, can_access)
SELECT fm.company_id, fm.role, fm.menu_item, fm.can_access
FROM full_matrix fm
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.company_id = fm.company_id
    AND rp.role = fm.role
    AND rp.menu_item = fm.menu_item
)
ON CONFLICT (company_id, role, menu_item) DO NOTHING;
