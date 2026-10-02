import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';

/** When the app may share GPS with the camp (foreground only). */
export type BusLocationSharingMode = 'off' | 'bus_screens' | 'app_open';

export const BUS_LOCATION_SHARING_MODE_KEY = '@bus_location_sharing_mode_v1';

export const BUS_LOCATION_MODE_OPTIONS: { value: BusLocationSharingMode; label: string; description: string }[] = [
    {
        value: 'off',
        label: 'Off',
        description: 'Never share location',
    },
    {
        value: 'bus_screens',
        label: 'On bus screens only',
        description: 'Share while Bus Attendance, Check-ins, or Route Map is open',
    },
    {
        value: 'app_open',
        label: 'While app is open',
        description: 'Share whenever The Nest is in the foreground',
    },
];

/** Locations older than this are hidden on the map. */
export const BUS_LOCATION_STALE_MS = 10 * 60 * 1000;

export const BUS_LOCATION_PING_INTERVAL_MS = 30_000;

export type BusLiveLocation = {
    id: string;
    company_id: string;
    season: string;
    run_date: string;
    time_of_day: 'am' | 'pm';
    route_id: number | null;
    bus_label: string;
    user_id: string;
    user_name: string | null;
    latitude: number;
    longitude: number;
    accuracy_m: number | null;
    updated_at: string;
};

export async function loadBusLocationSharingMode(): Promise<BusLocationSharingMode> {
    try {
        const raw = await AsyncStorage.getItem(BUS_LOCATION_SHARING_MODE_KEY);
        if (raw === 'bus_screens' || raw === 'app_open' || raw === 'off') return raw;
    } catch {
        /* ignore */
    }
    return 'off';
}

export async function saveBusLocationSharingMode(mode: BusLocationSharingMode): Promise<void> {
    await AsyncStorage.setItem(BUS_LOCATION_SHARING_MODE_KEY, mode);
}

function sessionToggleKey(companyId: string, runDate: string, timeOfDay: string) {
    return `@bus_location_session_${companyId}_${runDate}_${timeOfDay}`;
}

export async function loadBusLocationSessionEnabled(
    companyId: string,
    runDate: string,
    timeOfDay: 'am' | 'pm',
): Promise<boolean> {
    try {
        const raw = await AsyncStorage.getItem(sessionToggleKey(companyId, runDate, timeOfDay));
        return raw === '1';
    } catch {
        return false;
    }
}

export async function saveBusLocationSessionEnabled(
    companyId: string,
    runDate: string,
    timeOfDay: 'am' | 'pm',
    enabled: boolean,
): Promise<void> {
    await AsyncStorage.setItem(sessionToggleKey(companyId, runDate, timeOfDay), enabled ? '1' : '0');
}

export async function resolveLoggedByName(
    supabase: SupabaseClient,
    userId: string,
): Promise<string | null> {
    const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .maybeSingle();
    return data?.full_name?.trim() || data?.email?.trim() || null;
}

export async function upsertBusLiveLocation(
    supabase: SupabaseClient,
    row: {
        company_id: string;
        season: string;
        run_date: string;
        time_of_day: 'am' | 'pm';
        route_id: number | null;
        bus_label: string;
        user_id: string;
        user_name: string | null;
        latitude: number;
        longitude: number;
        accuracy_m: number | null;
    },
): Promise<void> {
    const { error } = await supabase.from('bus_route_live_locations').upsert(
        {
            ...row,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id,user_id,run_date,time_of_day' },
    );
    if (error) throw error;
}

export async function clearBusLiveLocation(
    supabase: SupabaseClient,
    companyId: string,
    runDate: string,
    timeOfDay: 'am' | 'pm',
    userId: string,
): Promise<void> {
    await supabase
        .from('bus_route_live_locations')
        .delete()
        .eq('company_id', companyId)
        .eq('run_date', runDate)
        .eq('time_of_day', timeOfDay)
        .eq('user_id', userId);
}

export async function fetchLiveBusLocations(
    supabase: SupabaseClient,
    companyId: string,
    runDate: string,
    timeOfDay: 'am' | 'pm',
): Promise<BusLiveLocation[]> {
    const staleAfter = new Date(Date.now() - BUS_LOCATION_STALE_MS).toISOString();
    const { data, error } = await supabase
        .from('bus_route_live_locations')
        .select('*')
        .eq('company_id', companyId)
        .eq('run_date', runDate)
        .eq('time_of_day', timeOfDay)
        .gte('updated_at', staleAfter)
        .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as BusLiveLocation[];
}
