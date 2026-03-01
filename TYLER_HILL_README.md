## Tyler Hill Module – API Guide (Mobile)

This document describes **all APIs used by the Tyler Hill module** so a mobile app can implement the same behavior as the web app.

---

## 1. Architecture Overview

- **Backend platform**: Supabase (PostgREST + Auth + Edge Functions).
- **No custom Node/Express server** – all APIs are:
  - **Supabase Edge Functions** under `/functions/v1/*`.
  - **PostgREST** table endpoints under `/rest/v1/*`, protected by **RLS**.
- **Tyler Hill feature flag**:
  - Company slug: **`tyler-hill-camp`** in the `companies` table.
  - Many features are shown only when the current company has this slug.

The mobile app should:

- Use the **Supabase client** (or equivalent HTTP calls) with:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY` (publishable key)
- Authenticate via **Supabase Auth** and attach the JWT to all requests.

---

## 2. Authentication & Headers

### 2.1 Supabase Auth (mobile)

Use the standard Supabase Auth flows:

- **Sign in**: `supabase.auth.signInWithPassword({ email, password })`
- **Sign out**: `supabase.auth.signOut()`
- **Get current session**: `supabase.auth.getSession()`
- **Refresh session**: `supabase.auth.refreshSession()`

Keep the user’s **access token** and send it as:

- `Authorization: Bearer {access_token}`

### 2.2 Required headers (Edge Functions)

All Tyler Hill Edge Functions expect:

- `Authorization: Bearer {access_token}` (user’s JWT)
- `Content-Type: application/json`
- `apikey: {anon_key}` (recommended, depending on your Supabase setup)

Edge functions also send:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

### 2.3 Required headers (PostgREST)

Base URL:

- `https://{SUPABASE_PROJECT_ID}.supabase.co/rest/v1`

Headers for every table request:

- `Authorization: Bearer {access_token}`
- `apikey: {anon_key}`
- `Content-Type: application/json`
- Often: `Prefer: return=representation` (if you want the inserted/updated rows back).

---

## 3. Tyler Hill Detection & Scoping

### 3.1 Detecting Tyler Hill

- Table: `companies`
- Field: `slug`
- Tyler Hill slug: **`tyler-hill-camp`**

**Pattern:**

1. Query `companies` for the company associated with the logged-in user.
2. If `company.slug === 'tyler-hill-camp'`, enable Tyler Hill–specific features.

### 3.2 Common filters

Most Tyler Hill queries are scoped by:

- `company_id` – the current company’s ID (from `companies` / `user_roles`).
- `season` – e.g. `"2025"` or `"2026"`.

Always include these in queries whenever relevant:

- `eq=company_id.{companyId}`
- `eq=season.{season}`

---

## 4. Edge Functions (Custom APIs)

### 4.1 `import-tyler-hill-data`

**Purpose:** Import Tyler Hill campers and awards from legacy JSON data.

- **URL:** `POST {SUPABASE_URL}/functions/v1/import-tyler-hill-data`
- **Source:** `supabase/functions/import-tyler-hill-data/index.ts`

#### 4.1.1 Auth & permissions

- Requires **valid JWT** in `Authorization: Bearer {token}`.
- User must have role **`admin`** or **`super_admin`** in the `user_roles` table for the target `company_id`.
- The function uses the **Supabase service role key** internally but still validates the user and their roles.

#### 4.1.2 Request body

```json
{
  "campersData": [ /* array of camper objects from Tyler Hill JSON */ ],
  "awardsData": [ /* array of award objects from Tyler Hill JSON */ ],
  "companyId": "uuid-of-tyler-hill-company",
  "season": "2025"
}
```

- `campersData`: full list of camper records.
  - `_id`: string or `{ "$oid": "..." }` (legacy ID)
  - `first`: first name
  - `last`: last name
  - `winner_ids`: optional array of award IDs (each ID string or `{ "$oid": "..." }`).
- `awardsData`: full list of award definitions.
  - `_id`: string or `{ "$oid": "..." }`
  - `year`: string/number year (e.g. `"2024"`)
  - `type`: e.g. `"cw"`, `"starfish"`, `"eoy"`, or a custom type.
  - `description`: text for the award.
- `companyId`: UUID of the Tyler Hill company.
- `season` (optional): defaults to `"2025"` if omitted.

#### 4.1.3 Behavior

1. **Auth & role check**:
   - Validates JWT via `supabase.auth.getUser(token)`.
   - Verifies user has `admin` or `super_admin` role in `user_roles` for the given company.
2. **Existing campers**:
   - Gathers all `person_id` values from `campersData`.
   - Queries `children` table:
     - `company_id = companyId`
     - `season = season`
     - `person_id IN (...)`
   - Builds `existingPersonIdMap` for quick lookups.
3. **New campers insert**:
   - For each camper in `campersData`:
     - Build `personId` from `_id` / `_id.$oid`.
     - Build `name` from `first` + `last`.
     - Skip if missing ID or name or already exists.
   - Collects new campers and inserts them into `children` in **batches of 50**:
     - `person_id`, `name`, `company_id`, `season`, `status = 'active'`.
   - Records how many were imported vs. skipped.
4. **Awards processing**:
   - Builds an in-memory **award map** from `awardsData` keyed by award ID.
   - For each camper, looks at `winner_ids` and resolves them via the award map.
   - Builds a list of awards to insert into `awards` table:
     - `child_id` (mapped from `person_id`)
     - `title` (derived from `type` and `description`):
       - `cw` → `"Color War - {description}"`
       - `starfish` → `"Starfish Award - {description}"`
       - `eoy` → `"End of Year Award - {description}"`
       - default → `"{type || 'Award'} - {description}"`
     - `category` = `type` or `"award"`
     - `description`
     - `date` = `"${year}-07-01"` (July 1st of award year)
     - `season`
     - `company_id`
   - Skips awards where the award ID is not in `awardsData` and tracks them as `awardsSkipped`.
5. **Duplicate award prevention**:
   - Fetches existing awards for `company_id` + `season`.
   - Builds a set of keys:
     - `child_id|title|category|description|date`
   - Filters out awards that already exist based on that key.
6. **Awards insert**:
   - Inserts new awards into `awards` table in **batches of 100**.
   - Tracks created vs. skipped counts.

#### 4.1.4 Success response (200)

```json
{
  "success": true,
  "results": {
    "campersImported": 0,
    "campersSkipped": 0,
    "awardsCreated": 0,
    "awardsSkipped": 0,
    "errors": ["string"]
  }
}
```

- `errors` contains human-readable error messages (validation or insert issues).

#### 4.1.5 Error response (400)

```json
{
  "success": false,
  "error": "Error message"
}
```

- For example: missing data, unauthorized, or database issues.

---

### 4.2 `send-appointment-notification`

**Purpose:** Notify Tyler Hill staff via email when an appointment is created or updated, and schedule a “day-before” reminder.

- **URL:** `POST {SUPABASE_URL}/functions/v1/send-appointment-notification`
- **Source:** `supabase/functions/send-appointment-notification/index.ts`

#### 4.2.1 Auth & permissions

- Uses the Supabase **service role key** internally.
- Typically invoked from the authenticated app via `supabase.functions.invoke`.
- You should still pass:
  - `Authorization: Bearer {access_token}`
  - `apikey: {anon_key}`

#### 4.2.2 Request body

```json
{
  "appointment_id": "uuid-of-appointment",
  "action": "create" // or "update"
}
```

- `appointment_id`: ID of the row in `appointments` table.
- `action`:
  - `"create"` – send immediate email and schedule a day-before reminder.
  - `"update"` – update any existing scheduled reminder; may not always send email immediately.

#### 4.2.3 Behavior

1. **Load appointment** from `appointments`:
   - Includes related child and staff:
     - `child:child_id(id, name, division_id)`
     - `staff:staff_id(id, name, department)`
2. **If not found**:
   - Returns `404` with:
     - `{ "error": "Appointment not found" }`
3. **Notification content**:
   - Builds a text body:
     - `Camper/Staff: {name}`
     - `Type: {appointment_type}`
     - `Date: {appointment_date} [at {appointment_time}]`
     - Optional `Provider`, `Location`, `Notes`.
4. **Recipients**:
   - Uses shared helper `getRecipientsForEmailTypeWithFilters`:
     - Email type: `'appointment'`
     - `companyId` from the appointment.
     - Filters by `divisionIds` when the appointment is for a camper.
   - If no recipients:
     - Returns `200` and `{ "message": "No recipients configured" }`.
5. **Immediate email (on create)**:
   - When `action === 'create'`, subject:
     - `"New Appointment: {personName} - {appointment_type}"`
   - Sends email to all recipients.
6. **Day-before reminder**:
   - Computes `sendAt` using `calculateSendTime(..., 'day_before')`.
   - Checks `scheduled_notifications` table:
     - If an unsent `day_before` notification for this `appointment_id` already exists:
       - Updates it with new timing and payload.
     - Otherwise:
       - Inserts a new `scheduled_notifications` row with:
         - `company_id`
         - `email_type = 'appointment'`
         - `event_id = appointment_id`
         - `event_date`, `event_time`
         - `send_at`
         - `timing_type = 'day_before'`
         - `event_data` including title, content with timing context, divisionIds, personName, personType.

#### 4.2.4 Success response (200)

```json
{
  "success": true,
  "recipientCount": 3,
  "scheduledReminder": true
}
```

- `recipientCount`: number of email addresses notified (for `action: "create"`).
- `scheduledReminder`: whether a day-before reminder has been created/updated.

#### 4.2.5 Error response (404/500)

- **404** (appointment not found):

  ```json
  { "error": "Appointment not found" }
  ```

- **500** (unexpected exception):

  ```json
  { "error": "Error message" }
  ```

---

## 5. PostgREST Tables Used by Tyler Hill

All of these are **standard Supabase table APIs** under `/rest/v1/*`.  
You call them either via the Supabase JS client or via direct HTTP.

### 5.1 Common Tyler Hill tables

Below is a non-exhaustive but **module-complete** list of tables used by the Tyler Hill features.

- **`companies`**
  - Contains metadata for each company.
  - Tyler Hill is identified by `slug = 'tyler-hill-camp'`.

- **`user_roles`**
  - Roles per user and company (e.g. `admin`, `super_admin`, `staff`, `viewer`).
  - Used for permission checks (including `import-tyler-hill-data`).

- **`children`**
  - Campers for each company/season.
  - Imported by `import-tyler-hill-data`.
  - Key fields:
    - `id`
    - `person_id` (legacy Tyler Hill ID)
    - `name`
    - `company_id`
    - `season`
    - `status` (e.g. `'active'`)
    - `division_id` (link to divisions, if modeled).

- **`awards`**
  - Awards associated with children.
  - Populated by `import-tyler-hill-data`.
  - Key fields:
    - `id`
    - `child_id`
    - `title`
    - `category`
    - `description`
    - `date`
    - `company_id`
    - `season`

- **`appointments`**
  - Tyler Hill appointments for campers/staff.
  - Used by the Appointments feature and `send-appointment-notification`.
  - Key fields:
    - `id`
    - `company_id`
    - `child_id` or `staff_id`
    - `appointment_type`
    - `appointment_date`
    - `appointment_time`
    - `provider_name`
    - `location`
    - `notes`

- **`scheduled_notifications`**
  - Stores scheduled emails for future sending.
  - `send-appointment-notification` uses this for day-before reminders.
  - Key fields:
    - `id`
    - `company_id`
    - `email_type`
    - `event_id` (here: `appointment_id`)
    - `event_date`, `event_time`
    - `send_at`
    - `timing_type` (e.g. `'day_before'`)
    - `event_data` (JSON)
    - `sent` (boolean)

- **`roster_templates`**
  - Tyler Hill roster templates (for bunk/OD planning, etc.).

- **`roster_template_children`**
  - Join table: which children belong to which roster template.

- **`days_off`**
  - Used by **OD Management** feature for staff days off and coverage.

- **`bunks`**, **`bunk_staff`**
  - Bunk definitions and staff assignments to bunks.

- **`staff`**, **`staff_notes`**
  - Staff profiles and internal notes.
  - Appointments tab on staff profile is Tyler Hill–specific.

- **`schedule_conflicts`**
  - Tracks conflicts for children/staff (e.g. overlapping activities/appointments).

- **`sports_calendar`**
  - Data for the **3‑day outlook** on the Tyler Hill dashboard.

> **Note:** Exact schemas are defined in Supabase and mirrored in your generated TypeScript types (e.g. `src/integrations/supabase/types.ts`).  
> On mobile, you should follow the same columns and constraints that the web app uses.

---

## 6. Tyler Hill–Specific Features (Front-End Contract)

The following routes/pages in the web app are **Tyler Hill only** and rely on the APIs listed above:

- **`/appointments`** – Appointments management (children/staff).
- **`/od-management`** – OD Management / days off and coverage.
- **`/special-meals`** – Special meals planning (company/season scoped).
- **`/roster-templates`** – Roster templates and assignments.
- **`/notes`** – Daily News / notes.
- **Dashboard** – Tyler Hill dashboard widgets (including sports 3‑day outlook).
- **Staff/Child profiles** – Appointments tab and Tyler Hill–specific data.

On mobile, you should:

- Only expose these features when `company.slug === 'tyler-hill-camp'`.
- Use the same tables (`appointments`, `days_off`, `roster_templates`, etc.) and filters (`company_id`, `season`) as the web app.

---

## 7. Mobile Integration Checklist

Use this checklist to ensure you’ve covered all Tyler Hill behaviors:

- **Supabase setup**
  - [ ] Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the mobile app.
  - [ ] Use Supabase Auth for sign-in/sign-out and keep the user’s session.
  - [ ] Attach `Authorization: Bearer {access_token}` and `apikey` to all HTTP calls.

- **Company & feature flag**
  - [ ] Fetch the user’s companies and find the one with `slug === 'tyler-hill-camp'`.
  - [ ] Store `company_id` and `season` in app state.
  - [ ] Only show Tyler Hill pages/features when that slug is active.

- **Data import (admin-only)**
  - [ ] For admin flows, call `POST /functions/v1/import-tyler-hill-data` with:
    - `campersData`, `awardsData`, `companyId`, `season`.
  - [ ] Handle success/validation errors using the response shape described above.

- **Appointments**
  - [ ] Use the `appointments` table for CRUD operations, filtered by `company_id` and `season`.
  - [ ] After creating/updating an appointment, call `POST /functions/v1/send-appointment-notification` with:
    - `{ "appointment_id": "uuid", "action": "create" | "update" }`.
  - [ ] Display any relevant errors back to the user.

- **Other Tyler Hill data**
  - [ ] Use `children` + `awards` for camper profiles and awards history.
  - [ ] Use `roster_templates` + `roster_template_children` for rosters.
  - [ ] Use `days_off`, `bunks`, `bunk_staff`, `staff`, `staff_notes`, `schedule_conflicts`, `sports_calendar` as needed for OD Management and dashboard features.

---

## 8. Key File References (Web App)

These files in the web app show how the APIs are used. You can mirror this behavior in mobile:

- Edge Functions:
  - `supabase/functions/import-tyler-hill-data/index.ts`
  - `supabase/functions/send-appointment-notification/index.ts`
- Supabase client & types:
  - `src/integrations/supabase/client.ts`
  - `src/integrations/supabase/types.ts`
- Tyler Hill feature UIs (approximate names, may vary slightly):
  - `Appointments` page
  - `ODManagement` page
  - `RosterTemplates` page
  - `DailyNotes` / `Notes` page
  - `Dashboard` (Tyler Hill widgets)
  - Child & Staff profile screens (appointments, awards, etc.)

Use this README as the **single source of truth** when wiring up Tyler Hill in the mobile app. If you add new Tyler Hill features or edge functions, document them here in the same format.

