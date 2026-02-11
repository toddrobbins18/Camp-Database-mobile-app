# Integration Status & Guide

This document tracks the status of backend integrations in the **Camp Database Mobile App** and provides a guide for implementing missing integrations.

## 🟢 Completed Integrations

The following features have been successfully integrated with Supabase and React Query:

### 1. Authentication
- **Location**: `src/hooks/useAuth.ts`, `src/api/auth.ts`, `src/lib/supabase.ts`
- **Features**:
  - Login (`signInWithPassword`)
  - Registration (`signUp`)
  - Profile Fetching (`getProfile`)
  - Session Management (AsyncStorage persistence)

### 2. Activities & Field Trips
- **Location**: `src/screens/ActivitiesFieldTripsScreen.tsx`
- **Features**:
  - **Read**: Fetches activities filterable by company, season, and divisions.
  - **Create**: Adds new activities and links them to divisions.
  - **Update**: Edits existing activities and updates division links.
  - **Delete**: Removes activities.
  - **Reference**: Uses `sections` of code that serve as a **Gold Standard** for how to implement other screens.

---

## 🔴 Missing Integrations (To Do)

The following areas currently use **Mock Data** or are static and need to be connected to Supabase.

### 1. Staff Management (High Priority)
- **Location**: `src/screens/StaffScreen.tsx`
- **Current State**: Uses `mockStaff` array.
- **Tasks**:
  - Create `src/api/staff.ts` (or similar hooks).
  - Replace `mockStaff` with `useQuery` fetching from `staff` table.
  - Implement "Add Staff" mutation.
  - Implement "Edit Staff" mutation.
  - Implement "Delete Staff" mutation.
  - Implement "Assign Wristband" logic.

### 2. Dashboard
- **Location**: `src/screens/DashboardScreen.tsx`
- **Current State**: Static UI widgets.
- **Tasks**:
  - Fetch "Today's Menu" from `menus` table.
  - Fetch "Athletics Schedule" from `sports` table (filtered by today).
  - Fetch "Special Events" from `activities_field_trips` (filtered by today).
  - Fetch "Birthdays" from `campers` and `staff` tables.

### 3. Other Screens (Likely Needs Integration)
Based on the file list and pattern, these screens likely need integration:
- **Camper Management**: `CamperScreen.tsx`, `CamperDetailScreen.tsx` (Likely mock data).
- **Sports**: `SportsScreen.tsx`, `SportsCalendarScreen.tsx`.
- **Menu**: `MenuScreen.tsx`.
- **Health**: `HealthScreen.tsx` (Medications, incidents).
- **Transport**: `TransportScreen.tsx`.
- **Admin**: `AdminPanelScreen.tsx` (User approvals, division permissions).

---

## 🛠 Integration Pattern Guide

Follow this pattern when integrating new screens (based on `ActivitiesFieldTripsScreen.tsx`):

### 1. Setup Query Client
Ensure the component (or parent) has access to `QueryClient`:
```typescript
const queryClient = useQueryClient();
```

### 2. Fetching Data (Read)
Use `useQuery` to fetch data. Ensure you include `company_id` in the filter.
```typescript
const { data: items = [], isLoading } = useQuery({
    queryKey: ['table_name', companyId], // Unique key + deps
    queryFn: async () => {
        const { data, error } = await supabase
            .from('table_name')
            .select('*')
            .eq('company_id', companyId);
        
        if (error) throw error;
        return data;
    },
    enabled: !!companyId // Only run if companyId is available
});
```

### 3. Modifying Data (Write)
Use `useMutation` for Create/Update/Delete operations and invalidate queries on success.
```typescript
const mutation = useMutation({
    mutationFn: async (newItem) => {
        const { error } = await supabase
            .from('table_name')
            .insert([newItem]);
        if (error) throw error;
    },
    onSuccess: () => {
        // Refetch the list to show new data
        queryClient.invalidateQueries({ queryKey: ['table_name'] });
        Alert.alert('Success', 'Item added!');
    }
});
```
