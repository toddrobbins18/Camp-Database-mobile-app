-- Insert first admin user bypassing RLS
-- This is necessary to bootstrap the admin system
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' 
FROM auth.users 
WHERE email = 'todd@camptlc.com'
ON CONFLICT (user_id, role) DO NOTHING;