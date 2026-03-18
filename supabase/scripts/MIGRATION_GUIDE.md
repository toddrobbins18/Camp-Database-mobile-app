# Running migrations and CSV seed data in Supabase

This guide covers how to get **Transportation (trips)**, **Sports Calendar**, and **Activities & Field Trips** data from the exported CSVs into your Supabase project so the mobile app shows the same data as the main app.

---

## Prerequisites

- Node.js installed (to run the seed generator).
- The three CSV files in the project root (or paths updated in the script):
  - `trips-export-2026-03-16_21-01-35.csv`
  - `sports_calendar-export-2026-03-16_20-57-27.csv`
  - `activities_field_trips-export-2026-03-16_20-56-09.csv`

---

## Step 1: Apply Supabase migrations (if needed)

Ensure your database has the tables and columns used by the mobile app. From the **datacamp-mobile** project root:

```bash
npx supabase db push
```

Or apply migrations manually in **Supabase Dashboard → SQL Editor** by running each file in `supabase/migrations/` in order (oldest first). The mobile app expects:

- **`trips`** – with columns such as: id, name, type, destination, date, departure_time, return_time, chaperone, capacity, status, created_at, meal, event_type, event_length, transportation_type, driver, sports_event_id, season, company_id, end_date, is_multi_day
- **`sports_calendar`** – with division_id, company_id, season, etc.
- **`activities_field_trips`** – with division_id, company_id, season, meal_options, home_away, depart_from_camp, depart_from_activity, end_date, is_multi_day, etc.
- **`sports_calendar_divisions`** – junction (sports_event_id, division_id, company_id)
- **`activities_field_trips_divisions`** – junction (activity_id, division_id, company_id)

If you’ve already run the full migration set (including `run_in_sql_editor.sql` and `migrate_from_lovable.sql` as in MIGRATION_COMPARISON.md), the schema is ready.

---

## Step 2: Generate the seed SQL from CSVs

From the **datacamp-mobile** directory:

```bash
node supabase/scripts/generate_seed_from_csv.js
```

This reads the three semicolon-delimited CSVs and writes:

**`supabase/scripts/seed_imported_data.sql`**

- Inserts into `trips`, `sports_calendar`, and `activities_field_trips` with `ON CONFLICT (id) DO NOTHING`.
- Backfills `activities_field_trips_divisions` and `sports_calendar_divisions` from rows that have `division_id` set.

You should see output like:

```
Written: E:\DataCamp\datacamp-mobile\supabase\scripts\seed_imported_data.sql
Trips: 79 Sports: 49 Activities: 35
```

---

## Step 3: Run the seed SQL in Supabase

1. Open **Supabase Dashboard** → your project → **SQL Editor**.
2. Open the file **`supabase/scripts/seed_imported_data.sql`** in your editor and copy its full contents.
3. Paste into the SQL Editor and click **Run**.

The script is idempotent: safe to run more than once. Existing rows (by `id`) are skipped.

---

## Step 4: Verify in the mobile app

- **Transportation** – Uses `trips` (see `src/api/transport.ts`). You should see the imported trips.
- **Sports Calendar** – Uses `sports_calendar` (and `sports_calendar_divisions` for division links). Events should appear.
- **Activities & Field Trips** – Uses `activities_field_trips` (and `activities_field_trips_divisions`). Activities should appear.

Ensure the app is pointed at the same Supabase project (env / config) and that the logged-in user’s company matches the `company_id` values in the seed data so RLS allows the rows to be visible.

---

## Regenerating the seed after CSV changes

If you export new CSVs from the main app:

1. Replace (or update paths in the script for) the three CSV files.
2. Run again:  
   `node supabase/scripts/generate_seed_from_csv.js`
3. Run the new **`seed_imported_data.sql`** in Supabase SQL Editor as in Step 3.

No need to re-run schema migrations unless the main app adds new columns; in that case, add a migration or run the appropriate DDL before re-running the seed.

---

## Troubleshooting: "No trips / events / activities" after running the seed

The app only shows data for **your current company** and **season 2026**. The seed file uses `company_id` values from the main app export (e.g. Timber Lake Camp, Tyler Hill). If your logged-in user’s **profile** has a different `company_id`, you will see no rows.

**1. Confirm that rows exist (SQL Editor, run as `postgres`):**

```sql
SELECT COUNT(*) AS trip_count, company_id FROM public.trips GROUP BY company_id;
SELECT COUNT(*) AS activities_count, company_id FROM public.activities_field_trips GROUP BY company_id;
SELECT COUNT(*) AS sports_count, company_id FROM public.sports_calendar GROUP BY company_id;
```

If you see counts and `company_id` UUIDs, the seed ran correctly.

**2. See which company your user is using:**

In the SQL Editor you usually run as `postgres`, so `auth.uid()` may be null. List profiles and their company to find your user:

```sql
SELECT p.id, p.full_name, p.company_id, c.name AS company_name, c.slug
FROM public.profiles p
LEFT JOIN public.companies c ON c.id = p.company_id
ORDER BY p.created_at DESC
LIMIT 20;
```

Find your row and note its `company_id`. If that UUID is not one of the `company_id` values from step 1, the app will show no seed data.

**3. Point your user at a company that has seed data**

Pick one of the `company_id` values from step 1 (e.g. the one with the most trips). Then set your profile to that company (replace `YOUR_USER_ID` and `COMPANY_ID_FROM_STEP_1`):

```sql
UPDATE public.profiles
SET company_id = 'COMPANY_ID_FROM_STEP_1'
WHERE id = 'YOUR_USER_ID';
```

Then log out and back in (or refresh the app) so the app reloads company context. You should see Transportation, Sports Calendar, and Activities & Field Trips data for that company and season 2026.
