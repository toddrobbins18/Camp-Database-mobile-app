# Mobile App vs Lovable Web – Implementation Plan

**Objective:** Align the mobile app (datacamp-mobile) with the Lovable web app (lovable-web-app) so it shows the same data, search/add flows work, and no screens show a blank/white screen.

**Reference:** `E:\DataCamp\lovable-web-app` (structure, tables, auth, and business logic).  
**Work scope:** `E:\DataCamp\datacamp-mobile` only.

---

## 1. Root causes (why data/search/add/white screens fail)

### 1.1 Different Supabase project / no env

- **Mobile** (`src/lib/supabase.ts`): URL and anon key are **hardcoded** (project `qjbkvnzeejbqxbcbskdu`). The app does **not** read from `.env` (e.g. `EXPO_PUBLIC_SUPABASE_URL`).
- **Web:** Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (project `gdcxtefbarvnrtvacqln` in Lovable).
- **Impact:** If your “single source of truth” is the **new** Supabase project where you ran migrations, both apps must point to that project. Right now mobile is fixed to one project; changing backend requires code change. Also, if mobile points to a different project than the one with migrated data, you will not see the same data and RLS may behave differently.

**Fix:** Use environment variables in mobile for Supabase URL and anon key (e.g. `EXPO_PUBLIC_*` with Expo), and ensure both mobile and web use the **same** project (the one with your migrated data and RLS).

---

### 1.2 Wrong or missing table names (schema mismatch)

| Area | Mobile (current) | Web / migrated schema | Action |
|------|------------------|------------------------|--------|
| **OD Management** | `days_off` | `staff_days_off` | Use `staff_days_off` in mobile. Table `days_off` does not exist in Lovable migrations. |
| **Daily news – meals** | `meals` (with `.single()`) | No `meals` table; web uses `menu_items` (and `special_meals` for special meals) | Fetch “today’s meals” from `menu_items` (by date/company), not `meals`. |
| **Special events** | Stored in `sports_calendar` with `event_type` filter | Dedicated `special_events_activities` + `special_events_divisions` | Align with web: use `special_events_activities` (and junction `special_events_divisions`) for special events so data matches. |
| **Divisions** | `useDivisions()` with **no** `company_id` filter | Web: divisions always filtered by `company_id` (and `is_active`) | Add `company_id` (and optional `is_active`) to divisions query so mobile only sees divisions for current company. |

**Impact:** Wrong table names cause “table does not exist” or empty results; missing `company_id` on divisions can mix companies or break RLS. These explain “not getting the same data” and “add new things fail” or blank lists.

---

### 1.3 Children table column names

- **Web** (AddChildDialog): Uses `name`, `person_id`, `age`, `gender`, `category`, `grade`, `group_name`, `division_id`, `leader_id`, `guardian_email`, `guardian_phone`, `emergency_contact`, `allergies`, `medical_notes`, `company_id`, `season`, `tshirt_size`.
- **Mobile** (campers API / forms): Uses `name` in interface; some screens (e.g. DailyNewsScreen) use `first_name` / `last_name` in code.
- **Action:** Confirm in your migrated DB whether `children` has `name` or `first_name`/`last_name` (or both). Unify mobile to match the actual schema; if the table only has `name`, remove reliance on `first_name`/`last_name` (e.g. in DailyNewsScreen).

---

### 1.4 CompanyContext and white screens

- **Behavior:** If `fetchCompanyData` fails (network, RLS, or no profile), the catch only does `console.error`. It does **not** set a user-visible error or retry. `companyId` can stay `null`, and all hooks that use `enabled: !!companyId` never run, so screens get no data.
- **Screens affected:** Any screen that depends on `companyId` and does not show loading/error UI (e.g. CamperScreen does not render `isLoading`/`isError`), so the user sees a blank or white list.
- **Fix:**  
  - In CompanyContext: on failure, set an error state and/or show a non-blocking retry.  
  - On screens: show loading (spinner/skeleton) and error state when `companyId` is null or when the main query is loading/failed (e.g. CamperScreen, MessagesScreen, ReportsScreen).

---

### 1.5 Search not working (e.g. Campers)

- **CamperScreen:** The main list filters only by division and sort. The placeholder says “Search by name, grade, or division…” but the **search text input is not bound** to any state that filters the list, so typing does nothing.
- **Fix:** Add a search term state and filter the camper list in memory by name (and optionally grade/division) the same way the web does (client-side filter on already-loaded data), or implement server-side search if you add an API later.

---

### 1.6 Messages / profiles query

- **Mobile:** Fetches all profiles for recipient picker: `.from('profiles').select('id, full_name, email').order('full_name')` with **no** `company_id` filter. Web typically restricts to the same company for messaging.
- **Fix:** Restrict profiles for messages to the current company (e.g. `company_id = profile.company_id` or equivalent) so behavior and data match the web and RLS.

---

### 1.7 Admin and audit

- **Web:** Uses both `automated_email_config` and `company_email_config`.  
- **Mobile:** Admin panel uses `automated_email_config` only; that’s fine.  
- **Audit:** Mobile uses `audit_logs`; confirm this table exists in your migrated project and that RLS allows the intended roles to read it.

---

### 1.8 Other gaps (for parity with web)

- **Dashboard:** Web uses `daily_wolf_content`, `daily_notes`, `awards`, `trips`, `menu_items`, `special_events_activities`, `sports_calendar`, `sports_calendar_divisions`, `health_center_admissions`, `children`, `staff`. Mobile dashboard uses a subset (e.g. birthdays, today events, today meals from `menu_items`). To match web “same data”, consider loading the same sources and/or the same “today” logic.
- **Division scoping:** Web uses `getDivisionFilter()` for division_leader/viewer so only allowed divisions are visible. Mobile should apply the same division filter where relevant (roster, health, sports, etc.) so results match.
- **Season:** Web uses SeasonContext (e.g. from localStorage). Mobile uses `season` from CompanyContext; ensure the same season is used in all queries that the web filters by season.

---

## 2. Implementation plan (phased)

### Phase 1 – Critical: Same backend and schema alignment

1. **Supabase config (mobile)**  
   - Read Supabase URL and anon key from env (e.g. `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).  
   - Use the **same** project as the web (the one with migrated data and RLS).  
   - Document in README which env vars to set.

2. **OD Management**  
   - Replace every use of `days_off` with `staff_days_off` in `ODManagementScreen.tsx` (queries, inserts, updates, deletes).  
   - Align column names with web/types if needed (e.g. `staff_id`, `company_id`, date, check-in/check-out fields).

3. **DailyNewsScreen – “today’s meals”**  
   - Stop using table `meals`.  
   - Load today’s meals from `menu_items` (filter by company and date), similar to web/dashboard.  
   - If you need “special meals” for the day, use `special_meals` as on the web.

4. **Divisions**  
   - In `src/api/campers.ts` (or wherever `useDivisions` lives), add `company_id` (and optionally `is_active`) to the divisions query, using `companyId` from context so mobile only sees divisions for the current company.

5. **CompanyContext**  
   - On `fetchCompanyData` failure: set an error state and/or allow retry; avoid leaving the app in a state where `companyId` is null indefinitely with no feedback.  
   - Optionally show a global “Could not load company; retry?” when error is set.

6. **Loading and error UI**  
   - **CamperScreen:** Show loading (e.g. spinner) when `isLoading` and an error message when `isError`; avoid blank list.  
   - **MessagesScreen:** Handle “auth not ready” (e.g. `currentUserId === null`) with a short loading or “Loading…” so the screen isn’t white.  
   - **ReportsScreen:** Add loading state while profile/user is being resolved.  
   - Any other screen that depends on `companyId` or a single main query: show loading and error states.

---

### Phase 2 – Search and add flows

7. **Camper search**  
   - Add search-by-name (and optionally grade/division) on the main camper list: bind the search input to state and filter the list client-side (same pattern as web Roster).

8. **Special events (optional but recommended)**  
   - To fully match web data: use `special_events_activities` (and `special_events_divisions`) for special events instead of storing them only in `sports_calendar`.  
   - Update SpecialEventsScreen (and any calendar merge logic) to read/write from these tables so “add new” and list view match the web.

9. **Messages – restrict recipients**  
   - Filter profiles in the message recipient list by current company (e.g. `company_id` = user’s company) so only same-company users appear.

10. **Children insert shape**  
    - Ensure add-camper/child insert in mobile uses the same columns as the web (e.g. `name`, `person_id`, `division_id`, `leader_id`, `company_id`, `season`, `tshirt_size`, etc.). If your DB has only `name` (no `first_name`/`last_name`), ensure forms and display use `name` and that DailyNewsScreen doesn’t rely on `first_name`/`last_name` if they don’t exist.

---

### Phase 3 – Parity and polish

11. **Dashboard data sources**  
    - Optionally align with web: same tables and “today” logic (e.g. `daily_wolf_content`, `daily_notes`, counts, today’s menu from `menu_items`).

12. **Division-based access**  
    - Where the web uses `getDivisionFilter()` (division_leader, viewer), apply the same division filter in mobile (e.g. pass division IDs into Supabase queries) so lists and “add” respect the same permissions.

13. **Season**  
    - Ensure season is taken from context and passed to every query that the web filters by season (roster, staff, trips, etc.).

14. **Env and docs**  
    - Add a short “Environment variables” section to README (Supabase URL, anon key, and that they must match the project used by the web app).

---

## 3. Checklist summary

| # | Item | Priority |
|---|------|----------|
| 1 | Use env for Supabase URL/anon key; same project as web | P1 |
| 2 | OD: use `staff_days_off` instead of `days_off` | P1 |
| 3 | DailyNewsScreen: use `menu_items` (and optionally `special_meals`) instead of `meals` | P1 |
| 4 | Divisions query: add `company_id` (and `is_active`) | P1 |
| 5 | CompanyContext: error state + retry; avoid silent failure | P1 |
| 6 | CamperScreen (and others): loading + error UI to prevent white screens | P1 |
| 7 | MessagesScreen / ReportsScreen: loading while auth/profile resolve | P1 |
| 8 | Camper list: wire search input to client-side filter by name/grade/division | P2 |
| 9 | Special events: use `special_events_activities` (+ divisions) to match web | P2 |
| 10 | Messages: restrict recipient list by company | P2 |
| 11 | Children: confirm `name` vs `first_name`/`last_name` and unify | P2 |
| 12 | Dashboard and division/season parity (optional) | P3 |

---

## 4. Implemented (mobile = new Supabase as main)

- **Supabase:** `src/lib/supabase.ts` uses env (`EXPO_PUBLIC_*` or `VITE_*`). See `.env.example`.
- **OD:** `staff_days_off` + bunks (bunk_number, bunk_name, season).
- **DailyNews:** `menu_items` for today’s meals.
- **Divisions:** Filter by `company_id` and `is_active`.
- **CompanyContext:** `loadError` + `retryLoad()`; drawer error banner.
- **CamperScreen:** Loading/error UI; search by name/grade/division.
- **Messages:** Recipients filtered by company.

## 5. Next step

Start with **Phase 1** (items 1–6). After that, “same data”, “search/add”, and “white screen” issues should be largely addressed. Then proceed to Phase 2 and 3 as needed for full parity with the Lovable web app.
