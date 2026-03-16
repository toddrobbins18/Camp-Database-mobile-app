# SQL scripts for Supabase (run in SQL Editor)

Use these in **Supabase Dashboard → SQL Editor** so the app behaves like Lovable’s (super_admin, approvals, role permissions).

## Order

1. **01_allow_super_admin_approve_users.sql**  
   - Lets super_admins approve users (update `profiles`, insert `user_roles`).  
   - Run first. Safe to run again.

2. **02_ensure_todd_super_admin.sql**  
   - Gives Todd (todd@camptlc.com or todd@camptic.com) the `super_admin` role and a company.  
   - Run **after** Todd has signed up at least once. Safe to run again.

3. **03_role_permissions_matrix_lovable.sql**  
   - Fills `role_permissions` with the Lovable-style matrix (all roles × menu items).  
   - Run only if `role_permissions` and `app_role` already exist. Only inserts missing rows.

## One-shot option

You can run everything in one go using **run_in_sql_editor.sql** (scripts 1, 2, and 3 in order).  
Run **02** only after Todd has an account in `auth.users`.
