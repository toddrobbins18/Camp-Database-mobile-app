# Migration comparison: Lovable (main) vs datacamp-mobile

## Overview

- **Lovable (main):** 159 migration files (through `20260208201201`).
- **Mobile:** 138 migration files + 4 mobile-specific (e.g. `20260313100000`, `20260315100000`).
- **Gap:** 21 Lovable migrations from **20260128** through **20260208** are not in mobile by filename. Many schema changes from those migrations were partially added in mobile via `20260311000000_add_missing_columns.sql` (columns only). This doc lists what’s missing and what the sync script does.

---

## Migrations in Lovable that are NOT in mobile (by name)

| Migration (Lovable) | Purpose |
|---------------------|--------|
| `20260128160846` | division_permissions UNIQUE(user_id, division_id) |
| `20260128195649` | profiles SELECT: admins see pending (approved=false, company_id IS NULL) |
| `20260129130616` | children/staff photo_url; profile-photos bucket + storage policies |
| `20260129130915` | profile-photos bucket private; authenticated read policy |
| `20260129151128` | staff_days_off late_override*; children guardian_name_p2; special_events file_url/name; staff gender |
| `20260129152737` | Drop "Users can view all profiles"; audit_logs company_id + log_audit + RLS; company-scoped storage (daily-wolf, rainy-day, profile-photos) |
| `20260130000534` | division_schedules table + RLS; staff person_id |
| `20260130000547` | division-schedules bucket + storage policies |
| `20260130182218` | kanban_notes table + RLS + trigger |
| `20260130185741` | trip_attachments table + RLS + bucket + storage |
| `20260204234849` | children SELECT: division_leader/specialist/viewer via get_user_divisions |
| `20260204235817` | can_access_child(); daily_notes, awards, camper_reports, appointments, sports_academy, tutoring_therapy, trip_attendees, sports_event_roster SELECT policies |
| `20260205000100` | staff_days_off checked_out_by, checked_in_by |
| `20260205000932` | children/staff tshirt_size; user_notification_preferences table |
| `20260205003504` | role_permissions specialist-sport-assignments, notification-preferences |
| `20260205003623` | role_permissions full matrix (all companies/roles/menu items) |
| `20260205005130` | automated_email_config toothfairy; specific_recipient_id |
| `20260205005329` | automated_email_config specific_recipient_id column |
| `20260205010643` | staff division_id + index |
| `20260205013049` | trip-attachments bucket private + company-scoped SELECT |
| `20260206152801` | special_events_activities chaperone |
| `20260206153226` | staff_leader_assignments table + RLS + migrate from staff.leader_id |
| `20260206193519` | messages parent_message_id; message_groups, message_group_members, group_messages + RLS |
| `20260206194209` | get_user_group_ids(); is_group_creator(); fix message_group_members/group_messages RLS |
| `20260206194247` | message_groups SELECT using get_user_group_ids; message_group_members INSERT using is_group_creator |
| `20260208201201` | messages group_id column + index |

---

## Already present in mobile (no script change)

- **Columns:** guardian_name_p2, photo_url, tshirt_size (children); division_id, gender, photo_url, tshirt_size (staff); chaperone, file_url, file_name (special_events_activities); specific_recipient_id (automated_email_config); messages group_id, parent_message_id — all added in `20260311000000_add_missing_columns.sql`.
- **Auth/approvals:** profiles SELECT/UPDATE/DELETE and user_roles INSERT (super_admin) and Todd seed are in `run_in_sql_editor.sql` (run that first).
- **Functions:** get_user_divisions, update_updated_at_column exist in mobile.
- **Tables:** staff_days_off, camper_reports, audit_logs, messages exist.

---

## What the sync script does (`migrate_from_lovable.sql`)

The script is idempotent (safe to run more than once). It:

1. **division_permissions** – Adds UNIQUE(user_id, division_id) if not exists.
2. **profiles** – Drops "Users can view all profiles" if exists (security).
3. **profile-photos** – Creates bucket if missing; storage policies (authenticated read, then company-scoped view/upload/update/delete).
4. **staff_days_off** – Adds late_override, late_override_reason, late_override_approved_by, late_override_approved_at, checked_out_by, checked_in_by (IF NOT EXISTS).
5. **audit_logs** – Adds company_id + index; drops old "Admins can view audit logs"; creates company-scoped SELECT; replaces log_audit() to set company_id.
6. **Storage** – Drops old “Company members…” policies for daily-wolf and rainy-day; creates “Users can view/upload/update/delete their company…” for daily-wolf-documents, rainy-day-documents, profile-photos.
7. **division_schedules** – Creates table + RLS + indexes; creates bucket + storage policies.
8. **staff** – Adds person_id + index if not exists.
9. **kanban_notes** – Creates table + RLS + update trigger.
10. **trip_attachments** – Creates table + RLS + indexes; creates bucket; storage policies; then makes bucket private + company-scoped SELECT.
11. **user_notification_preferences** – Creates table + RLS + trigger.
12. **staff** – Adds division_id + index if not exists (no-op if already there).
13. **staff_leader_assignments** – Creates table + RLS; migrates staff.leader_id into it; indexes.
14. **message_groups / message_group_members / group_messages** – Creates tables + indexes; get_user_group_ids(), is_group_creator(); RLS for all three (non-recursive).
15. **messages** – Adds parent_message_id, group_id + indexes if not exists (no-op if already there).
16. **can_access_child()** – Creates/updates function.
17. **children** – Drops "Staff can view children from their company"; creates "Users can view children from their company" (admin/staff/health_center + division_leader/specialist/viewer via get_user_divisions).
18. **daily_notes, awards, camper_reports, appointments, sports_academy, tutoring_therapy, trip_attendees, sports_event_roster** – Drops old SELECT policies if exist; creates SELECT using can_access_child / company + role.
19. **role_permissions** – Inserts specialist-sport-assignments, notification-preferences; full matrix (all companies × roles × menu items) with ON CONFLICT DO NOTHING.
20. **automated_email_config** – Adds toothfairy rows for companies that don’t have it; specific_recipient_id column if not exists.
21. **Realtime** – Adds group_messages to supabase_realtime publication if applicable.

---

## How to run

1. **First:** Run **`run_in_sql_editor.sql`** in Supabase Dashboard → SQL Editor (auth, profiles, user_roles, Todd, role_permissions matrix).
2. **Then:** Run **`migrate_from_lovable.sql`** in the same SQL Editor. Execute the whole file. If a statement fails (e.g. missing table like `trips`), fix or skip that part and re-run from the next section; the script is ordered so later sections don’t depend on earlier ones failing.

No need to run Lovable migrations one-by-one; these two scripts bring your mobile Supabase in line with the main app schema and RLS.
