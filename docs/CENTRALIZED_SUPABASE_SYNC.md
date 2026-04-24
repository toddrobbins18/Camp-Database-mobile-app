# Centralized Supabase — Web ↔ Mobile Parity Checklist

This doc captures the final steps to safely point the **web app** (`tyler-hill`) at the **mobile Supabase project** (`qjbkvnzeejbqxbcbskdu`) so both apps share one backend.

The web app is the **source of truth**. Mobile's UI / SQL has been brought into line with web's expectations (not the other way around).

---

## 1. Apply the new migrations

Seven migration files under `supabase/migrations/` bring the mobile Supabase project to parity with web behavior:

| File | What it does |
|------|--------------|
| `20260424120000_align_company_backfill_with_web.sql` | Re-maps every row still pinned to the legacy "Default Organization" → Tyler Hill Camp, and deactivates the default org so it stops appearing in CompanyContext pickers. |
| `20260424120500_align_profile_visibility_with_web.sql` | Lets company admins (not just super_admins) SELECT pending profiles whose `company_id` is NULL (matches web's `20260128195649`). Without this, web's `UserApprovals` page is empty. |
| `20260424121000_port_web_division_schedules.sql` | Creates the `division_schedules` table + RLS (from web's `20260130000534`) so web's `DivisionScheduleUploader` works. |
| `20260424121500_port_web_profile_photos_bucket.sql` | Creates the private `profile-photos` storage bucket + authenticated-only policies and adds `photo_url` to `children` / `staff`. |
| `20260424122000_port_web_audit_logs_company_scope.sql` | Adds `audit_logs.company_id`, scopes admin SELECT to their company, refreshes `log_audit()` to capture company. |
| `20260424122500_user_roles_unique_per_company.sql` | Drops the legacy `UNIQUE(user_id, role)` on `user_roles`, adds `UNIQUE(user_id, company_id)` + `UNIQUE(user_id, role, company_id)` so web's `upsert({onConflict:'user_id,company_id'})` in `UserApprovals.tsx` works, and updates `apply_lovable_user_sync()` to the new conflict target. |
| `20260424123000_sync_profile_company_from_tyler_hill_roles.sql` | Sets `profiles.company_id` to Tyler Hill for every user who already has a `user_roles` row for Tyler Hill but whose profile still points at another camp or `NULL`. **Without this, division leaders and other staff often never appear** in User Roles, because both apps only query `profiles` filtered by `company_id` (they do not infer camp membership from `user_roles` alone). |

### How to apply

Push them to the mobile Supabase project the same way you pushed earlier migrations:

```bash
cd datacamp-mobile
# If you use the Supabase CLI:
supabase link --project-ref qjbkvnzeejbqxbcbskdu
supabase db push

# Or paste each .sql file into the Supabase Dashboard → SQL Editor, in
# filename order (alphabetical by timestamp).
```

> The migrations are all idempotent (`IF NOT EXISTS` / `DROP POLICY IF EXISTS` / dedupe-before-constraint). They can be re-run.

### Admin panel still shows only a few users?

Both `tyler-hill` (`UserRoleManagement.tsx`) and mobile (`useAdminUsers` in `src/api/admin.ts`) load staff with:

`profiles.company_id = <selected camp>` — **not** “everyone with a `user_roles` row for that camp.”

Run this in the SQL Editor to see mismatches (users who have a Tyler Hill role but the wrong / empty profile camp):

```sql
-- Tyler Hill Camp id (from 20251104203205_insert_companies)
SELECT p.id, p.email, p.full_name, p.company_id AS profile_company_id, ur.role
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE ur.company_id = '0d0b7f4f-327e-4497-83ff-3aa501ffc295'
  AND p.company_id IS DISTINCT FROM ur.company_id;
```

If this returns rows, apply migration `20260424123000_sync_profile_company_from_tyler_hill_roles.sql` (or run the `UPDATE` it contains).

**Division leaders with no `user_roles` row:** the UI derives the badge only from `user_roles`. If someone only has `division_permissions` and no `division_leader` row in `user_roles`, they will list as **Staff** or **Viewer** until you add the role, or they may be missing entirely if their `profiles.company_id` is wrong — fix profile + insert `user_roles` as needed.

---

## 2. Flip the mobile Supabase Auth setting

Mobile was set up with **email confirmation ON**, which is why `useApproveUser` had to call the `confirm-user-email` edge function after approving users. Web does not expect this step.

In the Supabase Dashboard for project `qjbkvnzeejbqxbcbskdu`:

**Authentication → Providers → Email → "Confirm email"** → turn **OFF**.

(Or, equivalently, enable `mailer_autoconfirm` / `enable_confirmations = false` in `auth.config`.)

After this change:

- The `confirm-user-email` edge function is no longer needed for the approval flow. The function file is kept in the repo (`supabase/functions/confirm-user-email/index.ts`) as a read-only utility for edge cases; it does not need to be deployed to the shared Supabase project.
- Mobile's `useApproveUser` no longer calls it (see `src/api/admin.ts`, the block under "NOTE: We intentionally do NOT call...").

---

## 3. Align existing user rows via the parity snapshot

The DB-level backfill in migration #1 only re-maps rows that literally point at the legacy "default" company. Users who were created with a NULL `company_id` (email self-signup + never approved) still need a role + company. Use the pre-existing snapshot pipeline from `20260423103000_admin_role_parity_sync.sql`:

```sql
-- 1) Populate the staging snapshot from whatever source (Lovable export,
--    CSV, manual insert…). At minimum each row needs email + role_text.
INSERT INTO public.lovable_user_sync_snapshot
  (email, full_name, approved, role_text, company_slug)
VALUES
  ('alice.admin@camptlc.com',       'Alice Admin',   true, 'admin',           'tyler-hill-camp'),
  ('bob.dleader@camptlc.com',       'Bob Leader',    true, 'division_leader', 'tyler-hill-camp'),
  -- ...etc.
;

-- 2) Apply it (idempotent; SECURITY DEFINER checks you are admin/super_admin).
SELECT public.apply_lovable_user_sync('tyler-hill-camp', true);

-- 3) Inspect result
SELECT * FROM public.lovable_user_sync_snapshot ORDER BY created_at DESC;
```

After step 2 completes, every matched profile will have:

- `profiles.company_id` = Tyler Hill Camp UUID
- `profiles.approved` = true/false from snapshot
- Exactly one row in `user_roles` per (user_id, company_id), with the correct role — including `division_leader`.

This is what makes division leaders re-appear in the web Admin panel.

---

## 4. Point the web app at the mobile Supabase

Once the migrations and the auth settings are in place, swap `tyler-hill/.env` to use the mobile project:

```
VITE_SUPABASE_PROJECT_ID="qjbkvnzeejbqxbcbskdu"
VITE_SUPABASE_PUBLISHABLE_KEY="<mobile anon key>"
VITE_SUPABASE_URL="https://qjbkvnzeejbqxbcbskdu.supabase.co"
```

Expected behavior after the swap:

- Company theme colors appear correctly for all three camps (Tyler Hill red, Timber Lake blue, Timber Lake West green). This works because:
  - Users' `profiles.company_id` now points at a real camp (fix #1 + #3).
  - `companies` rows already have the correct hex `theme_color` (mobile migration `20251104203205_insert_companies.sql`).
  - `CompanyContext.tsx` reads `profile.companies.theme_color` and calls `applyThemeColor()`.
- Admin panel (`/admin`) lists all admins + division leaders for the currently selected camp, because `UserRoleManagement.fetchUsers()` filters `profiles` by `currentCompany.id`, which now matches.
- User Approvals page (`/user-approvals`) shows pending accounts even when they have no `company_id` yet (fix #2).
- Approving a pending user via web's upsert succeeds against `UNIQUE(user_id, company_id)` (fix #6).

---

## 5. Optional follow-ups

These are recommended but not blockers for centralization:

1. **Port `cleanup-campminder`, `notify-staff-assignment`, `populate-guardian-emails`** edge functions from web → mobile Supabase, if you plan to use CampMinder sync or staff-assignment notifications from the web app against the centralized project. Web's `config.toml` references them; they must be deployed to the mobile project or the web calls will 404.
2. Consider porting web's `20260324184846_*` (campminder_transactions + `increment_camper_balance()` RPC) and `20260324182007_*` (web-variant `owl_pay_*` shape) only if a web feature requires them. Mobile's `20260326101500_owlpay_core_schema.sql` already covers the owlpay core.
3. Keep an eye on the `cleanup-campminder` / `notify-staff-assignment` entries in `tyler-hill/supabase/config.toml`: if the web app is configured to call them and they are missing on the centralized project, you will see 404s in the browser console.

---

## 6. File reference

| Side | Path | Role |
|------|------|------|
| Web | `tyler-hill/src/pages/Auth.tsx` | Signs users out if `profile.company_id` is NULL. |
| Web | `tyler-hill/src/contexts/CompanyContext.tsx` | Loads `profile.companies` join + applies theme. |
| Web | `tyler-hill/src/components/admin/UserRoleManagement.tsx` | Filters `profiles` by `currentCompany.id`. |
| Web | `tyler-hill/src/pages/UserApprovals.tsx` | Upsert with `onConflict: 'user_id,company_id'`. |
| Mobile | `datacamp-mobile/src/api/admin.ts` | `useApproveUser` no longer calls `confirm-user-email`. |
| Mobile | `datacamp-mobile/supabase/migrations/20260424*.sql` | New parity migrations. |
| Mobile | `datacamp-mobile/supabase/migrations/20260423103000_admin_role_parity_sync.sql` | Snapshot + `apply_lovable_user_sync()`. |
| Mobile | `datacamp-mobile/supabase/functions/confirm-user-email/` | Kept in repo, no longer called by client. |
