-- =============================================================================
-- CHECK: Todd (Super Admin) division permissions in Supabase
-- Run in Supabase Dashboard → SQL Editor. No changes made.
-- =============================================================================

-- 1) Todd's user id and profile
SELECT
  u.id AS user_id,
  u.email,
  p.full_name,
  p.company_id AS profile_company_id
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE LOWER(TRIM(u.email)) IN ('todd@camptlc.com', 'todd@camptic.com');

-- 2) Count of division_permissions rows for Todd (should equal total active divisions)
WITH todd AS (
  SELECT id FROM auth.users
  WHERE LOWER(TRIM(email)) IN ('todd@camptlc.com', 'todd@camptic.com')
  LIMIT 1
),
division_count AS (
  SELECT COUNT(*) AS total FROM public.divisions WHERE is_active = true
),
todd_perm_count AS (
  SELECT COUNT(*) AS cnt FROM public.division_permissions dp
  JOIN todd t ON dp.user_id = t.id
  WHERE dp.can_access = true
)
SELECT
  (SELECT total FROM division_count) AS total_divisions,
  (SELECT cnt FROM todd_perm_count) AS todd_can_access_count,
  (SELECT total FROM division_count) - (SELECT cnt FROM todd_perm_count) AS missing_count;

-- 3) List divisions Todd can access (by company)
WITH todd AS (
  SELECT id FROM auth.users
  WHERE LOWER(TRIM(email)) IN ('todd@camptlc.com', 'todd@camptic.com')
  LIMIT 1
)
SELECT
  c.name AS company_name,
  d.name AS division_name,
  dp.can_access
FROM public.division_permissions dp
JOIN todd t ON dp.user_id = t.id
JOIN public.divisions d ON d.id = dp.division_id
JOIN public.companies c ON c.id = dp.company_id
ORDER BY c.name, d.sort_order, d.name;

-- 4) Divisions that exist but Todd has NO permission row (missing = should be true)
WITH todd AS (
  SELECT id FROM auth.users
  WHERE LOWER(TRIM(email)) IN ('todd@camptlc.com', 'todd@camptic.com')
  LIMIT 1
)
SELECT d.id AS division_id, d.name, d.company_id, c.name AS company_name
FROM public.divisions d
JOIN public.companies c ON c.id = d.company_id
WHERE d.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.division_permissions dp
    JOIN todd t ON dp.user_id = t.id
    WHERE dp.division_id = d.id
  )
ORDER BY c.name, d.sort_order, d.name;
