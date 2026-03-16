# User approval flow and login (schema and troubleshooting)

## Schema (main application)

### Sign-up and approval

1. **auth.users** (Supabase Auth)  
   - New user signs up → row created in `auth.users`.  
   - If **Confirm email** is enabled in Supabase → user must confirm email before they can sign in.

2. **public.profiles** (trigger on sign-up)  
   - Trigger `handle_new_user` runs after INSERT on `auth.users`.  
   - Inserts one row into `profiles`: `id` (same as auth user), `full_name`, `email`, `approved = false`, `approval_requested_at = NOW()`, `company_id = NULL`.  
   - So every new sign-up gets a **pending** profile (approved = false, approval_requested_at set).

3. **User Approvals screen**  
   - Shows users from `profiles` where `approved` is not true (pending).  
   - **Approve**: UPDATE `profiles` SET `approved = true`, `company_id = <chosen camp>`; INSERT into `user_roles` (user_id, company_id, role = 'staff').  
   - **Reject**: DELETE from `profiles` for that user (so they disappear from the list).  
   - Reject only works if the signed-in admin/super_admin has RLS permission to DELETE from `profiles` (see scripts).

4. **user_roles**  
   - One row per (user, company, role).  
   - After approval there is at least one row for that user (e.g. staff for the assigned company).

### Login after approval

1. User signs in with **signInWithPassword**.  
2. App loads **profile** with `getProfile(user.id)` (SELECT from `profiles` where `id = user.id`).  
3. App checks `profile.approved === true` and `profile.company_id` is set.  
4. If either is missing → user is shown “Pending Approval” or “Company Assignment Pending” and is signed out.  
5. If both are set → user is taken into the app.

So for an approved user to sign in successfully:

- `profiles` must have `approved = true` and `company_id` set (done by Approve).  
- **Email confirmation**: if the project has “Confirm email” enabled, the user must also confirm their email before sign-in succeeds; otherwise they may see an error like “Email not confirmed”.

---

## Why “Reject” didn’t work

- Only users with the **admin** role were allowed to DELETE from `profiles`.  
- **Super_admin** was not included, so when Todd (super_admin) tapped Reject, the delete was blocked by RLS and the user stayed on the list.

**Fix:** Run the SQL that allows **super_admins** to delete profiles (in `supabase/scripts/run_in_sql_editor.sql` or `04_allow_super_admin_delete_profiles_reject.sql`). After that, Reject will remove the user from User Approvals.

---

## Why no “notification” when you signed up

- The app does not send an in-app notification to admins when someone signs up.  
- Pending users **do** appear on the **User Approvals** screen (they are just rows in `profiles` with `approved = false`).  
- There is a DB trigger `notify_user_approval` that can call an edge function to send an **email**; that depends on the edge function and Supabase project config (e.g. vault keys, function deployed).  
- So “no notification” usually means: no email was sent; the in-app list is the place to see new sign-ups (User Approvals).

---

## Why afaqziyam couldn’t sign in after super admin approved

Common causes:

1. **Email not confirmed**  
   - If Supabase Auth has **Confirm email** enabled, the user must open the confirmation link in the email first.  
   - Until then, sign-in can fail or behave as if the account isn’t ready.  
   - **Check:** Supabase Dashboard → Authentication → Providers → Email → “Confirm email”.  
   - **Options:** Turn it off for simpler flow, or ensure the user clicks the confirmation link before signing in.

2. **Wrong project**  
   - Approval is stored in **your** Supabase project. If the app is pointed at a different project (e.g. different URL/keys in `.env`), the app won’t see the updated profile.  
   - Ensure the app uses the same Supabase project where Todd approved the user.

3. **Profile not updated**  
   - If the Approve action failed (e.g. RLS blocked it before you ran the scripts), `profiles` would still have `approved = false` or `company_id = NULL`.  
   - Run the scripts that allow super_admins to UPDATE `profiles` and INSERT into `user_roles`, then approve again.

4. **Caching**  
   - Unlikely, but if the app or Supabase client caches the profile, try signing out and back in, or restarting the app.

After fixing RLS (and email confirmation if needed), approving afaqziyam should set `approved = true` and `company_id`, and then sign-in should succeed.
