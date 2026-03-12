-- Insert admin and super_admin roles for todd@camptlc.com
-- This bypasses RLS policies using service role privileges

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' 
FROM auth.users 
WHERE email = 'todd@camptlc.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin' 
FROM auth.users 
WHERE email = 'todd@camptlc.com'
ON CONFLICT (user_id, role) DO NOTHING;