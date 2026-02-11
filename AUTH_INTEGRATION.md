# Authentication Integration Flow

This guide outlines the modular architecture of the authentication system, explaining how the different components interact to handle registration, login, and validation.

## Module-Wise Flow

### 1. **Infrastructure Layer (`src/lib/`)**
*   **`supabase.ts`**: The starting point. Initializes the Supabase client and configures `AsyncStorage` for session persistence. This ensures the user stays logged in even after closing the app.
*   **`axios.ts`**: Handles external API communication (specifically with Supabase Edge Functions). It uses an **Interceptor** to automatically grab the Supabase JWT from the session and attach it to every outgoing request's headers.
*   **`authSchemas.ts`**: Defines the "Source of Truth" for validation. Using Zod, it ensures that data (like email and password) matches the expected format before it even leaves the device.

### 2. **Service Layer (`src/api/`)**
*   **`auth.ts`**: A clean wrapper around the Supabase Auth methods (`signInWithPassword`, `signUp`, `signOut`) and Database queries (`getProfile`). It doesn't know about UI or state; it only handles raw data and network requests.

### 3. **Logic Layer (`src/hooks/`)**
*   **`useAuth.ts`**: The "Brain" of the integration. Powered by **TanStack Query**, it manages the authentication state.
    *   **Login Flow**: After a successful Suapbase sign-in, this hook automatically fetches the user's profile and performs "Business Logic" checks:
        1.  Is the user **Approved**?
        2.  Is the user **Assigned to a Company**?
        *   If either fails, it triggers an alert and signs the user out immediately.
    *   **Registration Flow**: Handles the sign-up request and provides specific error handling (e.g., catching "User already registered").

### 4. **UI Layer (`src/screens/`)**
*   **`LoginScreen.tsx`** & **`SignUpScreen.tsx`**:
    *   They collect user input via local `useState`.
    *   On submit, they call the Zod schema's `safeParse` for immediate feedback.
    *   If valid, they call the mutations provided by `useAuth.ts`.
    *   They listen for loading (`isPending`) and error states to update the UI (showing spinners or error boxes).

---

## Integration Summary Table

| Step | Module | Responsibility |
| :--- | :--- | :--- |
| **Validate** | `authSchemas.ts` | Check email format and password length. |
| **Request** | `auth.ts` | Call Supabase Auth API. |
| **Authorize** | `axios.ts` | Inject JWT into headers if calling Edge Functions. |
| **Manage** | `useAuth.ts` | Handle loading/success/error and run post-login checks. |
| **Display** | `screens/*.tsx` | Render inputs and show feedback/errors to the user. |
