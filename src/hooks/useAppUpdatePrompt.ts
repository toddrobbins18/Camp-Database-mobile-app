import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, type AppStateStatus, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

const DISMISS_STORE_VERSION_KEY = 'nest_dismissed_store_update_version';
const DISMISS_STORE_VERSION_AT_KEY = 'nest_dismissed_store_update_version_at';
const STORE_REMIND_AFTER_MS = 24 * 60 * 60 * 1000;
/** Brief pause before reload when returning from background (avoids mid-tap restarts). */
const FOREGROUND_RELOAD_DELAY_MS = 900;
/** Minimum time between OTA checks while the app stays open. */
const OTA_CHECK_INTERVAL_MS = 5 * 60 * 1000;

/** Compare semver-like strings ("1.0.10" vs "1.0.9"); returns true if b is newer than a */
function isVersionNewer(a: string, b: string): boolean {
    const pa = a.split('.').map((x) => parseInt(x.replace(/\D/g, ''), 10) || 0);
    const pb = b.split('.').map((x) => parseInt(x.replace(/\D/g, ''), 10) || 0);
    const n = Math.max(pa.length, pb.length);
    for (let i = 0; i < n; i++) {
        const da = pa[i] ?? 0;
        const db = pb[i] ?? 0;
        if (db > da) return true;
        if (db < da) return false;
    }
    return false;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Automatically checks for EAS Update (OTA) bundles on launch and when the app
 * returns to the foreground. When an update exists, downloads it and reloads
 * without asking the user to tap "Reload now".
 *
 * Native App Store / Play Store updates still use a prompt (requires leaving the app).
 *
 * Publish OTA to the same channel as the installed build:
 *   npm run update:production -- --message "your change"
 */
export function useAppUpdatePrompt() {
    const otaBusy = useRef(false);
    const lastOtaCheckAt = useRef(0);
    const hasColdStarted = useRef(false);
    const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<string | null>(null);

    const applyOtaUpdate = useCallback(async (trigger: 'launch' | 'foreground') => {
        if (__DEV__ || !Updates.isEnabled) return false;
        if (otaBusy.current) return false;

        const now = Date.now();
        if (trigger === 'foreground' && now - lastOtaCheckAt.current < OTA_CHECK_INTERVAL_MS) {
            return false;
        }
        lastOtaCheckAt.current = now;

        otaBusy.current = true;
        try {
            setUpdateStatus('Checking for updates…');
            const check = await Updates.checkForUpdateAsync();
            if (!check.isAvailable) {
                setUpdateStatus(null);
                return false;
            }

            setIsApplyingUpdate(true);
            setUpdateStatus('Downloading update…');
            await Updates.fetchUpdateAsync();

            if (trigger === 'foreground') {
                setUpdateStatus('Restarting with latest version…');
                await sleep(FOREGROUND_RELOAD_DELAY_MS);
            } else {
                setUpdateStatus('Applying update…');
            }

            await Updates.reloadAsync();
            return true;
        } catch (error) {
            console.warn('[AppUpdate] OTA update failed:', error);
            setUpdateStatus(null);
            setIsApplyingUpdate(false);
            return false;
        } finally {
            otaBusy.current = false;
        }
    }, []);

    useEffect(() => {
        if (__DEV__) return;
        if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

        const run = async () => {
            const trigger = hasColdStarted.current ? 'foreground' : 'launch';
            hasColdStarted.current = true;

            await applyOtaUpdate(trigger);
            await checkNativeStoreUpdateIfNeeded();
        };

        void run();

        const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
            if (next === 'active') void run();
        });

        return () => sub.remove();
    }, [applyOtaUpdate]);

    return { isApplyingUpdate, updateStatus };
}

async function checkNativeStoreUpdateIfNeeded(): Promise<void> {
    if (Platform.OS === 'ios') {
        await checkAppStoreIosIfNeeded();
        return;
    }
    if (Platform.OS === 'android') {
        await checkPlayStoreAndroidIfNeeded();
    }
}

async function checkAppStoreIosIfNeeded(): Promise<void> {
    const bundleId = Constants.expoConfig?.ios?.bundleIdentifier ?? null;
    if (!bundleId) return;

    const installed =
        Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0';
    if (!installed || installed === '0') return;

    try {
        const res = await fetch(
            `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleId)}`,
            { headers: { Accept: 'application/json' } },
        );
        const json = (await res.json()) as {
            resultCount?: number;
            results?: Array<{ version?: string; trackViewUrl?: string }>;
        };
        const item = json.results?.[0];
        const storeVer = item?.version;
        if (!storeVer || !isVersionNewer(installed, storeVer)) return;

        const [dismissed, dismissedAtRaw] = await Promise.all([
            AsyncStorage.getItem(DISMISS_STORE_VERSION_KEY),
            AsyncStorage.getItem(DISMISS_STORE_VERSION_AT_KEY),
        ]);
        if (dismissed === storeVer) {
            const dismissedAt = parseInt(dismissedAtRaw || '0', 10) || 0;
            if (dismissedAt > 0 && Date.now() - dismissedAt < STORE_REMIND_AFTER_MS) return;
        }

        const url = item?.trackViewUrl;
        Alert.alert(
            'App Store update',
            `Version ${storeVer} is available. You're on ${installed}. Update in the App Store for the latest native build.`,
            [
                {
                    text: 'Later',
                    style: 'cancel',
                    onPress: async () => {
                        await Promise.all([
                            AsyncStorage.setItem(DISMISS_STORE_VERSION_KEY, storeVer),
                            AsyncStorage.setItem(DISMISS_STORE_VERSION_AT_KEY, String(Date.now())),
                        ]);
                    },
                },
                ...(url ? [{ text: 'Open App Store', onPress: () => Linking.openURL(url) }] : []),
            ],
        );
    } catch {
        // Offline / transient
    }
}

async function checkPlayStoreAndroidIfNeeded(): Promise<void> {
    const packageName =
        Application.applicationId ?? Constants.expoConfig?.android?.package ?? null;
    if (!packageName) return;

    const installed =
        Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0';
    if (!installed || installed === '0') return;

    try {
        const res = await fetch(
            `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}&hl=en`,
        );
        const html = await res.text();
        const match = html.match(/\[\[\["([0-9]+\.[0-9]+\.[0-9]+)"\]\]/);
        const storeVer = match?.[1];
        if (!storeVer || !isVersionNewer(installed, storeVer)) return;

        const [dismissed, dismissedAtRaw] = await Promise.all([
            AsyncStorage.getItem(DISMISS_STORE_VERSION_KEY),
            AsyncStorage.getItem(DISMISS_STORE_VERSION_AT_KEY),
        ]);
        if (dismissed === storeVer) {
            const dismissedAt = parseInt(dismissedAtRaw || '0', 10) || 0;
            if (dismissedAt > 0 && Date.now() - dismissedAt < STORE_REMIND_AFTER_MS) return;
        }

        const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}`;
        Alert.alert(
            'Play Store update',
            `Version ${storeVer} is available. You're on ${installed}. Update in the Play Store for the latest native build.`,
            [
                {
                    text: 'Later',
                    style: 'cancel',
                    onPress: async () => {
                        await Promise.all([
                            AsyncStorage.setItem(DISMISS_STORE_VERSION_KEY, storeVer),
                            AsyncStorage.setItem(DISMISS_STORE_VERSION_AT_KEY, String(Date.now())),
                        ]);
                    },
                },
                { text: 'Open Play Store', onPress: () => Linking.openURL(url) },
            ],
        );
    } catch {
        // Offline / transient / scrape blocked
    }
}
