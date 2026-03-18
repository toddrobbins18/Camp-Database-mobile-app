-- Undo: Restore Todd (super_admin) profile to the "first" company
-- Use this if you accidentally set Todd's company_id to a seed company and the app broke.
-- Run in Supabase Dashboard → SQL Editor.

-- Option A: Restore Todd's profile to the first company (same as ensure_super_admin_todd logic)
UPDATE public.profiles
SET company_id = (SELECT id FROM public.companies WHERE is_active = true ORDER BY created_at LIMIT 1)
WHERE id = 'dbd16291-b87d-4484-ae1a-f4a504874acb';

-- If your Todd UUID has a different typo (e.g. aela vs ae1a), fix it in the WHERE above.
-- Option B: Or restore by email (finds Todd by auth and updates profile)
-- UPDATE public.profiles p
-- SET company_id = (SELECT id FROM public.companies WHERE is_active = true ORDER BY created_at LIMIT 1)
-- FROM auth.users u
-- WHERE u.id = p.id AND LOWER(TRIM(u.email)) IN ('todd@camptlc.com', 'todd@camptic.com');
