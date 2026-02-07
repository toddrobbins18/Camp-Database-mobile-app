# Tyler Hill Authentication Implementation Guide

This guide outlines how to adapt the authentication and permission logic from the **Tyler Hill** project into the **Camp Database Mobile App**.

## 🔑 Core Logic Overview

The authentication system in Tyler Hill is built on Supabase and follows a "Pre-fetched Permissions" model. Instead of checking database permissions on every page load, it fetches all roles and permissions once after sign-in and caches them in a React Context.

### 1. Supabase Client Setup
Ensure your mobile app has a properly configured Supabase client.
- Location: `src/lib/supabase.ts` (or similar)
- Dependencies: `@supabase/supabase-js`, `react-native-url-polyfill`

### 2. The Auth Context (`AuthContext.tsx`)
This is the "Brain" of the auth system. You should create a similar context in your mobile app.

**Key Responsibilities:**
- Listen for auth state changes (`onAuthStateChange`).
- Fetch the user's Profile (`approved`, `company_id`).
- Fetch User Roles (`user_roles` table).
- Fetch Permissions (`role_permissions` and `division_permissions` tables).
- Expose a `hasPagePermission(menuItem)` function.

**Implementation Flow:**
1. Fetch profile (check if `approved` is true).
2. Fetch roles (e.g., admin, staff, division_leader).
3. Fetch role_permissions (cached by `company_id`).
4. Fetch division_permissions (for restricted access roles).

### 3. Permission Hook (`usePermissions.ts`)
A utility hook to simplify permission checks in components.

**Functions to implement:**
- `canAccessPage(pageName)`: Checks against pre-fetched `role_permissions`.
- `canSeeDivision(divisionId)`: Checks if the user has access to a specific camp division.
- `getDivisionFilter()`: Returns a list of accessible division IDs (used for filtering SQL queries).

### 4. Admin Approval Flow
Important security feature in Tyler Hill:
- After login, the system checks the `profiles` table.
- If `approved` is `false`, it triggers an automatic `signOut()` and shows a "Pending Approval" message.
- This prevents new sign-ups from accessing sensitive data until an admin approves them.

## 🛠 Mobile-Specific Adjustments

1. **Auth UI**: Use custom React Native forms for Email/Password instead of the web-only `@supabase/auth-ui-react`.
2. **Storage**: Ensure Expo's `AsyncStorage` is passed to the Supabase client for session persistence.
3. **Navigation**: Use the `loading` state from `AuthContext` to show a splash screen while permissions are being fetched.

## 📁 Recommended File Structure
```
src/
├── contexts/
│   └── AuthContext.tsx       <-- Copy logic from tyler-hill
├── hooks/
│   └── usePermissions.ts     <-- Copy logic from tyler-hill
└── lib/
    └── supabase.ts           <-- Supabase client config
```

## ⚠️ Database Requirements
For this to work, ensure your Supabase instance has the following tables:
- `profiles` (id, email, approved, company_id)
- `user_roles` (user_id, role)
- `role_permissions` (role, menu_item, can_access, company_id)
- `division_permissions` (user_id, division_id, can_access)
