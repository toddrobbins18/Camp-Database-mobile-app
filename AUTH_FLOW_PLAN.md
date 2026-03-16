# Authentication flow: main app (Lovable) vs mobile – plan and alignment

## 1. Main application (Lovable) – auth flow

### Sign-up
- **API:** `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`
- **DB:** Trigger `handle_new_user` on `auth.users` INSERT → inserts into `profiles` (id, full_name, email, approved=false, approval_requested_at=NOW(), company_id=NULL)
- **Result:** User exists in `auth.users`; one row in `profiles` with `approved = false` (pending)

### Login
- **API:** `supabase.auth.signInWithPassword({ email, password })`
- **After sign-in:** App reads `profiles` (approved, company_id) for current user
- **Rules:** If `!profile.approved` → toast "Pending Approval", signOut. If `!profile.company_id` → toast "Company Assignment Pending", signOut. Else → navigate to app

### User Approvals (admin)
- **Pending list:** `profiles` WHERE `approved = false` (super_admin sees all; company admin sees own company OR company_id IS NULL)
- **Approve:** UPDATE `profiles` SET approved=true, company_id=selected; UPSERT `user_roles` (user_id, role='staff', company_id) ON CONFLICT (user_id, company_id)
- **Reject:** DELETE from `profiles` WHERE id=userId

### RLS (main app)
- **profiles SELECT:** Own row OR super_admin OR (admin AND (company_id = get_user_company OR (approved=false AND company_id IS NULL)))
- **profiles UPDATE:** Admin or super_admin (for approval)
- **profiles DELETE:** Admin or super_admin (for reject)
- **user_roles INSERT:** Admin or super_admin (for approval)

### Roles and permissions
- **AuthContext:** Fetches user_roles (role), division_permissions, role_permissions; builds allPermissions map; hasPagePermission(companyId, menuItem); isSuperAdmin

---

## 2. Mobile app – current behavior vs main

| Area | Main (Lovable) | Mobile (datacamp-mobile) | Aligned? |
|------|----------------|--------------------------|----------|
| Sign-up | signUp + handle_new_user → profile with approved=false, approval_requested_at | Same (authApi.signUp, trigger) | Yes |
| Login check | profiles.approved + company_id after signIn | Same (useLogin → getProfile) | Yes |
| Pending list | profiles approved=false; admins see company_id IS NULL | usePendingUsers: approved=false; filter approved!==true | Yes |
| Approve | UPDATE profiles; UPSERT user_roles (user_id, company_id, role) | UPDATE profiles; INSERT user_roles (user_id, company_id, role) | Yes* |
| Reject | DELETE profiles | DELETE profiles | Yes (after RLS fix) |
| RLS profiles SELECT | Admins see pending (company_id IS NULL) | May miss clause for company_id IS NULL for company admins | Script adds it |
| RLS profiles UPDATE/DELETE | Admin or super_admin | Was admin only; script adds super_admin | Script fixes |
| RLS user_roles INSERT | Admin or super_admin | Was admin only; script adds super_admin | Script fixes |
| role_permissions | Matrix per company/role/menu | Script fills same matrix | Script fixes |

\* Main uses upsert on (user_id, company_id); mobile uses insert. If unique is (user_id, role) one row per role per user; if (user_id, company_id) then upsert is needed. Our migrations use UNIQUE(user_id, role) so insert is correct.

---

## 3. What the single SQL script does (`supabase/scripts/run_in_sql_editor.sql`)

Run the whole file once in **Supabase Dashboard → SQL Editor**. Safe to re-run.

1. **profiles SELECT** – Drop old policies; create "Users view own profile admins view all" with Lovable logic so admins see pending users (`approved = false AND company_id IS NULL`).
2. **profiles UPDATE** – Drop old/new; create "Admins and super admins can approve users".
3. **profiles DELETE** – Drop old/new; create "Admins and super admins can delete profiles" (Reject).
4. **user_roles INSERT** – Drop old/new; create "Admins and super admins can insert roles".
5. **Todd seed** – DO block: ensure todd@camptlc.com / todd@camptic.com has company_id and super_admin in user_roles.
6. **role_permissions** – Insert missing (company_id, role, menu_item, can_access) to match main app; uses `WHERE NOT EXISTS` and `ON CONFLICT (company_id, role, menu_item) DO NOTHING`.

---

## 4. APIs used (main vs mobile)

| Flow | Main (Lovable) | Mobile |
|------|----------------|--------|
| Sign-up | supabase.auth.signUp | authApi.signUp (same) |
| Login | signInWithPassword then profiles select | authApi.signIn then authApi.getProfile |
| Pending users | supabase.from('profiles').select().eq('approved',false) | usePendingUsers (same) |
| Approve | profiles.update + user_roles.upsert | useApproveUser: profiles.update + user_roles.insert |
| Reject | profiles.delete | useRejectUser: profiles.delete |
| Session/roles | AuthContext: user_roles, role_permissions, division_permissions | useRole: user_roles by company_id from profile |

---

## 5. Migrations to have (schema parity)

- Tables: auth.users (Supabase), profiles, user_roles, companies, role_permissions, division_permissions
- Trigger: handle_new_user on auth.users
- Functions: get_user_company, is_super_admin, has_role (app_role)
- RLS: As in the script above (profiles SELECT/UPDATE/DELETE; user_roles INSERT)

The single script does not create tables or triggers; it only fixes policies and seeds. Base schema is assumed from existing migrations.
