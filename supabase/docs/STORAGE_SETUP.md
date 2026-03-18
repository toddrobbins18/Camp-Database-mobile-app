# Storage Setup (Lovable → Supabase)

This doc describes the five storage buckets that match the Lovable web app and how the mobile app uses them.

## Buckets (all private)

| Bucket | Purpose | Path convention | Mobile usage |
|--------|---------|-----------------|--------------|
| **profile-photos** | Camper & staff profile pictures | `company_id/entity_type/entity_id/timestamp.ext` | Not yet wired in UI; use `src/api/storage.ts` `uploadProfilePhoto()` when you add photo upload to staff/camper screens. |
| **daily-wolf-documents** | Daily Wolf PDFs | `company_id/season/date-timestamp-filename` | **Daily News** screen: “Daily Wolf PDFs” section → Upload PDF + list with View. |
| **rainy-day-documents** | Rainy day schedule PDFs | `company_id/season/date-timestamp-filename` | **Rainy Day Schedule** screen: upload + list with “View PDF”. |
| **division-schedules** | Division schedule files | `company_id/division_id/yyyy-MM-dd-timestamp.ext` | Use `uploadDivisionSchedule()` from `src/api/storage.ts` when you add a Division Schedules upload screen (e.g. in Admin or Divisions). |
| **trip-attachments** | Trip/transportation file attachments | `company_id/trip_id/timestamp.ext` | **Transport** screen: when editing a trip, “Attachments” section → Add file + list with View. |

## Applying storage in Supabase

1. **Run migrations**  
   The migration `20260317110000_storage_buckets_lovable.sql` creates all five buckets (private) and their RLS policies. Apply it with your usual process (e.g. `supabase db push` or run the SQL in the Supabase SQL Editor).

2. **If you use the full Lovable sync script**  
   `scripts/migrate_from_lovable.sql` also creates/updates these buckets and policies. You can use either the migration or the script; the migration is enough for storage.

## What you can provide

- **Empty buckets are fine.** The Lovable cloud screenshot showed the same five buckets; many were empty. No need to migrate existing files from Lovable storage unless you want to.
- **If you do have files in Lovable storage** you can:
  - Re-upload them through the mobile or web app after pointing the app at this Supabase project, or
  - Use a one-off script to copy objects from Lovable storage into Supabase storage (same bucket names and path conventions above).

## Path conventions (match web)

- **profile-photos:** `{company_id}/{camper|staff}/{entity_id}/{timestamp}.{ext}` — store the returned path in `children.photo_url` or `staff.photo_url`; use signed URLs to display (bucket is private).
- **daily-wolf-documents / rainy-day-documents:** `{company_id}/{season}/{date}-{timestamp}-{filename}` — date is `YYYY-MM-DD`.
- **division-schedules:** `{company_id}/{division_id}/{schedule_date}-{timestamp}.{ext}` — schedule_date is `YYYY-MM-DD`.
- **trip-attachments:** `{company_id}/{trip_id}/{timestamp}.{ext}` — first path segment is company_id so RLS “view by company” works.

## Mobile API

- **Upload helpers:** `src/api/storage.ts` — `uploadProfilePhoto`, `uploadDailyWolfDocument`, `uploadRainyDayDocument`, `uploadDivisionSchedule`, `uploadTripAttachment`.
- **Viewing (private buckets):** use `getSignedUrl(bucketKey, path)` from the same file; then open the URL in the browser or in-app webview.
- **Deleting:** `removeStorageFile(bucketKey, path)`; also delete the DB row (e.g. `daily_wolf_documents`, `rainy_day_documents`, `trip_attachments`, etc.) if applicable.

## Division schedules and profile photos

- **Division schedules:** Table `division_schedules` and bucket `division-schedules` are created by the migration (or script). Mobile does not yet have a dedicated “Division Schedules” upload screen; add one (e.g. under Admin or Divisions) and call `uploadDivisionSchedule()` then insert into `division_schedules`.
- **Profile photos:** Table columns `children.photo_url` and `staff.photo_url` store the storage path (or full URL). Use `uploadProfilePhoto()` when the user picks a photo, then update the row. Display via `getSignedUrl('profilePhotos', path)`.
