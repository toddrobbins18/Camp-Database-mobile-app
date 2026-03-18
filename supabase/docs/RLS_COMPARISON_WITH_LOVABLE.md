# RLS Comparison: Mobile vs Lovable Web App

**Short answer: No.** The mobile Supabase project does **not** currently have all the same RLS (Row Level Security) as the Lovable web app, unless you have already run the manual sync script `scripts/migrate_from_lovable.sql`.

---

## 1. What’s in Lovable but not in mobile migrations

Lovable has **16 migrations from February 2026** (`202602*`). **None of these exist in the mobile migrations folder.** So everything those migrations do is “Lovable-only” from the mobile migration set.

| Area | Lovable | Mobile |
|------|--------|--------|
| **children SELECT** | "Users can view children from their company" with **division awareness** (`division_leader` / `specialist` / `viewer` + `get_user_divisions`) | Still "Staff can view children from their company" (company-only, no division logic) |
| **Child-scoped tables** | `can_access_child()` used for SELECT on: `daily_notes`, `awards`, `camper_reports`, `appointments`, `sports_academy`, `tutoring_therapy`, `trip_attendees`, `sports_event_roster` | Company-only SELECT policies (no `can_access_child`) |
| **staff_leader_assignments** | Table + RLS (view / manage by company) | Not in migrations; only in `migrate_from_lovable.sql` |
| **user_notification_preferences** | Table + RLS (own prefs + admins view company) | Not in migrations; only in script |
| **division_schedules** | Table + RLS + storage bucket policies | Not in migrations; only in script |
| **kanban_notes** | Table + RLS | Not in migrations; only in script |
| **trip_attachments** | Table + RLS + storage (trip-attachments bucket) | Not in migrations; only in script |
| **message_groups / message_group_members / group_messages** | Tables + RLS + helpers (`get_user_group_ids`, `is_group_creator`) | Not in migrations; only in script |
| **Storage** | Profile photos & daily-wolf & rainy-day: **company-scoped** (folder = company_id) | Older “Company members can view” / “Admins can manage”; script updates to match Lovable |
| **audit_logs** | "Admins can view audit logs from their company" + `company_id` | Script adds this |

So: **same RLS as Lovable is only achieved if** either you port those Feb 2026 migrations into mobile, or you run the manual script (which recreates most of the same objects and policies).

---

## 2. What mobile has that Lovable doesn’t (or did first)

- **Super admin – user approval:** "Admins and super admins can approve users" and "Admins and super admins can insert roles" (mobile migrations `20260313100000_*`).
- **Super admin – children:** "Super admins can insert/update/delete children" (mobile `20260316100000_*`).
- **Super admin – delete profiles:** "Admins and super admins can delete profiles" (mobile `20260315100000_*`).

Lovable may have equivalent behavior via other migrations or scripts; the point is these are explicitly in **mobile** migrations.

---

## 3. Policies that already match (or are close)

- **staff**: View/insert/update/delete by company (same intent).
- **bunks, bunk_staff, staff_days_off, appointments**: View/manage by company.
- **master_calendar**: View/insert/update/delete by company.
- **profiles**: "Users view own profile admins view all" (+ mobile’s super_admin approve/delete).
- **sync_jobs**: Admins/super admins manage; users view by company.
- **medication_logs, health_center_admissions**: Health center + admins view/manage.
- **incident_reports**: "Authorized roles can view incidents".
- **scheduled_notifications**: Admins view; system insert/update.
- **specialist_sport_assignments**: Company + super_admin.
- **company_email_config**: Admins/super_admin.
- **schedule_conflicts, camper_reports, camper_evaluation_questions**: View/manage by company (mobile); Lovable refines some with `can_access_child`.

---

## 4. How to make mobile match Lovable

1. **Run the existing script (if you haven’t):**  
   In the Supabase SQL Editor for the **mobile** project, run:
   - `datacamp-mobile/supabase/scripts/migrate_from_lovable.sql`  
   That will create missing tables (e.g. `division_schedules`, `kanban_notes`, `trip_attachments`, `user_notification_preferences`, `staff_leader_assignments`, `message_groups`, etc.) and add/update RLS and storage policies so they align with Lovable.

2. **Apply the child/division RLS migration:**  
   Run the migration `20260317100000_align_rls_with_lovable_children_division.sql`. It adds:
   - `can_access_child()`
   - Division-aware **children** SELECT policy ("Users can view children from their company"), including `is_super_admin` so mobile super admins still see all
   - Updated SELECT policies for **daily_notes**, **awards**, **camper_reports**, **appointments**, **sports_academy**, **tutoring_therapy**, **trip_attendees**, **sports_event_roster** using `can_access_child` (same logic as Lovable’s `20260204235817`).

After (1) and (2), mobile will have the same RLS as Lovable for the areas above, plus mobile’s extra super_admin policies for approvals, children, and profile delete.

---

## 5. Quick reference: Lovable Feb 2026 migrations

- `20260204234849` – children SELECT (division-aware).
- `20260204235817` – `can_access_child()` + child-scoped SELECT for 8 tables.
- `20260205000932` – user_notification_preferences table + RLS.
- `20260205013049` – trip-attachments storage policy.
- `20260206153226` – staff_leader_assignments table + RLS.
- `20260206193519` – message_groups / message_group_members / group_messages + RLS.
- `20260206194209` / `20260206194247` – messaging policy fixes.
- Plus division_schedules, kanban_notes, trip_attachments table, storage and audit_logs changes in other 202602* files.

None of these filenames exist under `datacamp-mobile/supabase/migrations`; the behavior is replicated in the script and in the new migration described in section 4.
