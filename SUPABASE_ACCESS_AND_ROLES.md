# Supabase Access & Role Setup (New Project)

## What I Need From You to Work With Your Supabase Project

I can’t log into your Supabase project directly. Here’s how we can still get everything done.

### Option A: You run migrations (recommended)

1. **Supabase Dashboard**  
   - Go to [Supabase Dashboard](https://supabase.com/dashboard) → your **new** project.  
   - Open **SQL Editor**.  
   - Run the migration files from `supabase/migrations/` in **order by filename** (oldest first).  
   - For the “Todd super_admin” step, run the SQL from the section below.

2. **What to share with me (no secrets)**  
   - **Project reference** (e.g. `abcdefghijklmnop`) from Project Settings → General.  
   - **Supabase URL** (e.g. `https://xxxxx.supabase.co`).  
   - Confirm that you’ve run all migrations and the “Todd super_admin” script.  
   - You do **not** need to share anon key or password; keep those private.

### Option B: Supabase CLI (if you use it)

1. Install and log in:
   ```bash
   npx supabase login
   ```
2. Link this repo to your new project (from the `datacamp-mobile` folder):
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   Get `YOUR_PROJECT_REF` from Dashboard → Project Settings → General.

3. Push migrations:
   ```bash
   npx supabase db push
   ```
4. Run the “Todd super_admin” SQL once in the Dashboard SQL Editor (see below).

---

## Role Model (Lovable vs Mobile – we follow Lovable)

| Role          | Access |
|---------------|--------|
| **super_admin** | Full app access; Role/Division Permissions, User Approvals, all companies. |
| **admin**       | Most screens + Administration; typically no Role/Division Permissions management. |
| **staff**       | Operational screens (Activities, Sports, Nurse, etc.). |
| **viewer**      | Read-only: Dashboard, Camper, Calendar, Menu, Messages. |

- Roles are stored in **`user_roles`** (`user_id`, `role`, `company_id`).  
- **Division permissions** only restrict **non–super_admin** users (e.g. division_leader, specialist, viewer).  
- **Todd@camptlc.com** must be **super_admin** and have access to the whole application.

---

## Ensure Todd@camptlc.com Is Super Admin (run once on new project)

Run this in **SQL Editor** after migrations (and after Todd has signed up at least once so his row exists in `auth.users` and `profiles`):

```sql
-- Ensure Todd@camptlc.com is super_admin and has a company
DO $$
DECLARE
  _user_id uuid;
  _company_id uuid;
BEGIN
  SELECT id INTO _user_id FROM auth.users WHERE LOWER(email) = 'todd@camptlc.com' LIMIT 1;
  SELECT id INTO _company_id FROM public.companies WHERE is_active = true ORDER BY created_at LIMIT 1;

  IF _user_id IS NOT NULL AND _company_id IS NOT NULL THEN
    UPDATE public.profiles SET company_id = _company_id WHERE id = _user_id;

    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (_user_id, 'super_admin', _company_id)
    ON CONFLICT (user_id, role) DO UPDATE SET company_id = EXCLUDED.company_id;
  END IF;
END $$;
```

If your email is different (e.g. `Todd@camptic.com`), change the `LOWER(email) = 'todd@camptlc.com'` to match (e.g. `LOWER(email) = 'todd@camptic.com'`).

---

## What We Fixed in the App

1. **Division Permissions screen**  
   - Previously every user was shown as “staff”.  
   - It now loads **real roles from `user_roles`** and shows **super_admin**, **admin**, **staff**, **viewer**, etc.  
   - Super admins have full access; the screen is for assigning division access to other roles.

2. **User list on Division Permissions**  
   - Aligned with Lovable: only **approved** users in the **current company** are listed.

3. **Migrations**  
   - `20260313100000_allow_super_admin_approve_users.sql` – lets super_admins approve users.  
   - New migration ensures Todd (or your super-admin email) gets `super_admin` and a company on the new project (you run the SQL above once).

After you run migrations and the Todd script, Todd should see himself as **Super Admin** and have full access everywhere, including the Division Permissions screen.
