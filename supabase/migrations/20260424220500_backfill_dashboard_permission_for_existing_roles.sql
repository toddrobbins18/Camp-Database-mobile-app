-- Prevent web login lockout for non-super-admin users.
-- Web ProtectedRoute requires role_permissions access for "/" => menu_item='dashboard'.
-- If a (company_id, role, 'dashboard') row is missing, users can authenticate
-- but immediately hit "Access Denied" on dashboard.

insert into public.role_permissions (company_id, role, menu_item, can_access)
select distinct
  ur.company_id,
  ur.role,
  'dashboard' as menu_item,
  true as can_access
from public.user_roles ur
join public.companies c
  on c.id = ur.company_id
where c.slug in ('tyler-hill-camp', 'timber-lake-west', 'timber-lake-camp')
on conflict (company_id, role, menu_item)
do update set can_access = true;
