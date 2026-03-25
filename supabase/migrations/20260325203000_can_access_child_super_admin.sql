-- SELECT on children allows is_super_admin() to see all rows; can_access_child() did not,
-- so any code path or policy that relied only on can_access_child() excluded super admins.
-- Super admins also have "Super admins can update children"; this keeps the helper consistent
-- if that policy is ever missing on a forked DB.

CREATE OR REPLACE FUNCTION public.can_access_child(_child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.children c
      WHERE c.id = _child_id
        AND c.company_id = get_user_company(auth.uid())
        AND (
          has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'staff'::app_role)
          OR has_role(auth.uid(), 'health_center'::app_role)
          OR (
            (has_role(auth.uid(), 'division_leader'::app_role)
             OR has_role(auth.uid(), 'specialist'::app_role)
             OR has_role(auth.uid(), 'viewer'::app_role))
            AND c.division_id = ANY(get_user_divisions(auth.uid()))
          )
        )
    )
$$;
