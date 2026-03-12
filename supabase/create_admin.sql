-- Script to create a super admin user directly in the database
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  admin_email text := 'todd@camptlc.com';
  company_record record;
BEGIN
  -- 1. Insert into auth.users (simulating a signed up user)
  -- The password here is just a placeholder hash, the user will still need to sign up or log in via magic link
  INSERT INTO auth.users (
    id, 
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    admin_email,
    crypt('Todd@Camp1122', gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    ''
  ) ON CONFLICT (email) DO UPDATE SET id = auth.users.id
  RETURNING id INTO new_user_id;

  -- 2. Insert the super_admin role for all companies
  FOR company_record IN SELECT id FROM public.companies LOOP
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (new_user_id, 'super_admin', company_record.id)
    ON CONFLICT (user_id, role, company_id) DO NOTHING;
    
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (new_user_id, 'admin', company_record.id)
    ON CONFLICT (user_id, role, company_id) DO NOTHING;
  END LOOP;
  
  -- 3. Ensure they have a profile
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (new_user_id, admin_email, 'Todd', 'Admin', 'super_admin')
  ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
  
END $$;
