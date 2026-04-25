-- Restore baseline web-style Staff permissions across active camps.
-- This aligns role_permissions with current web menu IDs used by AppSidebar/ProtectedRoute.

with active_companies as (
  select id, slug
  from public.companies
  where slug in ('tyler-hill-camp', 'timber-lake-west', 'timber-lake-camp')
),
base_staff_menu_items as (
  select unnest(array[
    'dashboard',
    'roster',
    'staff',
    'messages',
    'activities',
    'calendar',
    'menu',
    'rainy-day',
    'special-events',
    'transportation',
    'tutoring-therapy',
    'od-management',
    'appointments',
    'reports',
    'nurse',
    'awards',
    'incidents',
    'sports-academy',
    'sports-calendar',
    'roster-templates'
  ]) as menu_item
),
conditional_rows as (
  -- Notes for all camps except Timber Lake Camp
  select c.id as company_id, 'notes'::text as menu_item
  from active_companies c
  where c.slug <> 'timber-lake-camp'
  union all
  -- Tyler Hill specific items
  select c.id, 'special-meals'
  from active_companies c
  where c.slug = 'tyler-hill-camp'
  union all
  select c.id, 'owl-pay'
  from active_companies c
  where c.slug = 'tyler-hill-camp'
  union all
  -- Timber Lake Camp specific items
  select c.id, 'daily-schedule'
  from active_companies c
  where c.slug = 'timber-lake-camp'
  union all
  select c.id, 'elective-signup'
  from active_companies c
  where c.slug = 'timber-lake-camp'
  union all
  -- Timber Lake West specific Daily Wolf items
  select c.id, 'daily-wolf-printable'
  from active_companies c
  where c.slug = 'timber-lake-west'
  union all
  select c.id, 'daily-wolf-management'
  from active_companies c
  where c.slug = 'timber-lake-west'
),
target_rows as (
  select c.id as company_id, m.menu_item
  from active_companies c
  cross join base_staff_menu_items m
  union
  select company_id, menu_item from conditional_rows
)
insert into public.role_permissions (company_id, role, menu_item, can_access)
select
  t.company_id,
  'staff'::public.app_role as role,
  t.menu_item,
  true as can_access
from target_rows t
on conflict (company_id, role, menu_item)
do update set can_access = true;
