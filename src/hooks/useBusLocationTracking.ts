import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import {
    BUS_LOCATION_PING_INTERVAL_MS,
    BusLocationSharingMode,
    clearBusLiveLocation,
    loadBusLocationSessionEnabled,
    loadBusLocationSharingMode,
    resolveLoggedByName,
    upsertBusLiveLocation,
} from '../lib/busLocationSharing';

type Params = {
    companyId: string | null;
    season: string | null;
    runDate: string;
    timeOfDay: 'am' | 'pm';
    routeId: number | null;
    busLabel: string | null;
    userId: string | null;
    /** Screen is focused (for bus_screens mode). */
    screenFocused: boolean;
};

function shouldTrackNow(mode: BusLocationSharingMode, screenFocused: boolean, appState: AppStateStatus): boolean {
    if (mode === 'off') return false;
    if (appState !== 'active') return false;
    if (mode === 'app_open') return true;
    return screenFocused;
}

export function useBusLocationTracking({
    companyId,
    season,
    runDate,
    timeOfDay,
    routeId,
    busLabel,
    userId,
    screenFocused,
}: Params) {
    const [tracking, setTracking] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);

    useEffect(() => {
        const sub = AppState.addEventListener('change', (next) => {
            appStateRef.current = next;
        });
        return () => sub.remove();
    }, []);

    useEffect(() => {
        let cancelled = false;

        const stopInterval = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setTracking(false);
        };

        const pingOnce = async () => {
            if (
                !companyId ||
                !season ||
                !userId ||
                routeId == null ||
                !busLabel?.trim()
            ) {
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const userName = await resolveLoggedByName(supabase, userId);

            await upsertBusLiveLocation(supabase, {
                company_id: companyId,
                season,
                run_date: runDate,
                time_of_day: timeOfDay,
                route_id: routeId,
                bus_label: busLabel.trim(),
                user_id: userId,
                user_name: userName,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy_m: location.coords.accuracy ?? null,
            });
        };

        const evaluate = async () => {
            if (cancelled) return;

            const [mode, sessionOn] = await Promise.all([
                loadBusLocationSharingMode(),
                companyId
                    ? loadBusLocationSessionEnabled(companyId, runDate, timeOfDay)
                    : Promise.resolve(false),
            ]);

            const eligible =
                sessionOn &&
                shouldTrackNow(mode, screenFocused, appStateRef.current) &&
                !!companyId &&
                !!season &&
                !!userId &&
                routeId != null &&
                !!busLabel?.trim();

            if (!eligible) {
                stopInterval();
                if (sessionOn && companyId && userId) {
                    try {
                        await clearBusLiveLocation(supabase, companyId, runDate, timeOfDay, userId);
                    } catch {
                        /* ignore cleanup errors */
                    }
                }
                return;
            }

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setPermissionDenied(true);
                stopInterval();
                return;
            }
            setPermissionDenied(false);

            if (intervalRef.current) return;

            setTracking(true);
            setLastError(null);

            try {
                await pingOnce();
            } catch (err: any) {
                if (!cancelled) setLastError(err?.message || 'Location update failed');
            }

            intervalRef.current = setInterval(() => {
                void pingOnce().catch((err: any) => {
                    if (!cancelled) setLastError(err?.message || 'Location update failed');
                });
            }, BUS_LOCATION_PING_INTERVAL_MS);
        };

        void evaluate();
        const poll = setInterval(() => void evaluate(), 5_000);

        return () => {
            cancelled = true;
            clearInterval(poll);
            stopInterval();
        };
    }, [
        companyId,
        season,
        runDate,
        timeOfDay,
        routeId,
        busLabel,
        userId,
        screenFocused,
    ]);

    return { tracking, permissionDenied, lastError };
}
