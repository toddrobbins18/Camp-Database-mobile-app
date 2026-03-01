# Lovable Cloud Connection Guide

## Overview

This mobile app connects directly to your **Lovable Cloud** Supabase instance. No additional backend, API gateway, or custom server is needed.

---

## Architecture

```
React Native App
  └── @supabase/supabase-js client
        └── HTTPS → https://gdcxtefbarvnrtvacqln.supabase.co
              └── PostgreSQL (managed by Lovable Cloud)
```

## Connection Details

| Setting | Value | File |
|---------|-------|------|
| **Supabase URL** | `https://gdcxtefbarvnrtvacqln.supabase.co` | `src/lib/supabase.ts` |
| **Anon Key** | Starts with `eyJhbGciOi...` | `src/lib/supabase.ts` + `.env` |
| **Project ID** | `gdcxtefbarvnrtvacqln` | `.env` |

## How It Works

1. **Authentication**: Users sign in via `supabase.auth.signInWithPassword()`. The Supabase client stores the JWT in `AsyncStorage` and auto-refreshes tokens.

2. **Data Fetching**: React Query hooks in `src/api/` call `supabase.from('table_name').select(...)` which sends REST requests to the Lovable Cloud Supabase URL.

3. **Row-Level Security (RLS)**: All tables have RLS policies that:
   - Scope data by `company_id` using `get_user_company(auth.uid())`
   - Check roles via `has_role(auth.uid(), 'admin'::app_role)`

4. **Mutations**: Create/update/delete operations use `supabase.from('table').insert/update/delete(...)` and React Query's `useMutation` + `invalidateQueries` for cache freshness.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase client initialization |
| `src/api/*.ts` | React Query hooks for each data domain |
| `src/hooks/useRole.ts` | Fetches user roles from `user_roles` table |
| `src/contexts/CompanyContext.tsx` | Provides `companyId` and `season` to all screens |
| `.env` | Environment variables (Supabase URL, keys) |

---

## How to Change Lovable Cloud Connection

If you need to point to a **different** Supabase project:

1. Update `src/lib/supabase.ts`:
   ```ts
   const supabaseUrl = 'https://YOUR_NEW_PROJECT_ID.supabase.co';
   const supabaseAnonKey = 'YOUR_NEW_ANON_KEY';
   ```

2. Update `.env`:
   ```
   VITE_SUPABASE_PROJECT_ID="YOUR_NEW_PROJECT_ID"
   VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_NEW_ANON_KEY"
   VITE_SUPABASE_URL="https://YOUR_NEW_PROJECT_ID.supabase.co"
   ```

3. Run the database migrations in `supabase/migrations/` on the new project.

---

## Role System

| Role | Access Level |
|------|-------------|
| `super_admin` | Full access — all screens, Role/Division Permissions, User Approvals |
| `admin` | Most screens + Administration section (no Role/Division Permissions) |
| `staff` | Operational screens (Activities, Sports, Nurse, etc.) |
| `viewer` | Read-only: Dashboard, Camper, Calendar, Menu, Messages |

Roles are stored in the `user_roles` table and fetched via the `useRole()` hook.
