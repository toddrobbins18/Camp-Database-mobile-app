# Supabase: one-step fix (no credentials needed)

**I can’t connect to your Supabase from here.** You run one script in your project; that’s enough.

---

## What to do (about 1 minute)

1. Open **Supabase Dashboard**: https://supabase.com/dashboard → your **DataCamp/mobile** project.
2. Go to **SQL Editor**.
3. Open this file in your repo: **`supabase/scripts/run_in_sql_editor.sql`**.
4. **Copy all** of its contents and **paste** into the SQL Editor.
5. Click **Run**.

That script:

- Lets **super_admin** approve users (profiles + user_roles).
- Lets **super_admin** reject users (delete profile so they disappear from User Approvals).
- Ensures **Todd** (todd@camptlc.com / todd@camptic.com) is super_admin with a company.
- Fills **role_permissions** to match the main app (Lovable) so menu access is correct.

---

## If you use Supabase CLI

From the **datacamp-mobile** folder:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Then still run **`run_in_sql_editor.sql`** once in the Dashboard SQL Editor (the scripts there include policy fixes that may not be in migration files).

---

## Delete user (Admin Panel) and Reject (User Approvals)

- **Reject:** Works after you run `run_in_sql_editor.sql` (super_admin can delete profiles). If the **delete-user** edge function is deployed, Reject uses it; otherwise the app falls back to deleting the profile so the pending user disappears.
- **Delete (Admin Panel):** Requires the **delete-user** edge function to be deployed to the **same** Supabase project the app uses. Deploy from the **datacamp-mobile** folder:

```bash
cd datacamp-mobile
npx supabase functions deploy delete-user
```

Use the same project as in your app (`.env`: `EXPO_PUBLIC_SUPABASE_URL`). If Delete still fails, the app will show the real error (e.g. "Unauthorized: Admin access required" means your user has no admin/super_admin row in **user_roles**; run the SQL script and ensure Todd’s user has a **user_roles** row with role `super_admin`).

---

## Create User (Admin Panel → Add User → Create User tab)

- **Requires** the **create-user** edge function to be deployed (same Supabase project as the app). Deploy: `npx supabase functions deploy create-user` from the **datacamp-mobile** folder.
- Select a camp from the menu first; the new user is assigned to that company. If creation fails, an alert will show the error (e.g. "Deploy the create-user edge function and try again" if the function is not deployed).

---

## Dashboard: Weather

- The dashboard shows **Weather** (TODAY + TOMORROW) and **Today's Birthdays** like the original app. For weather to load: deploy the **get-weather** edge function and set the **WEATHER_API_KEY** secret in Supabase (e.g. from [weatherapi.com](https://www.weatherapi.com/)). Deploy: `npx supabase functions deploy get-weather`. The app uses the selected camp’s `zip_code` from the companies table (or 18469 if missing).

---

## After running

- Approve/Reject in User Approvals will work for Todd (super_admin).
- Todd will show as Super Admin in Division Permissions.
- New users can sign up and appear in User Approvals; after you approve them they can sign in (and confirm email if your project has “Confirm email” on).

No credentials need to be shared; running that one script is enough.
