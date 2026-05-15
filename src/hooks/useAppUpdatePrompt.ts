import { useEffect, useRef } from 'react';
import { Alert, AppState, type AppStateStatus, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

const DISMISS_STORE_VERSION_KEY = 'nest_dismissed_store_update_version';
const DISMISS_STORE_VERSION_AT_KEY = 'nest_dismissed_store_update_version_at';
const STORE_REMIND_AFTER_MS = 24 * 60 * 60 * 1000; // 24 hours

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

/**
 * Runs on cold start + when returning to foreground:
 * 1) EAS Update (OTA JS) — prompts to reload when a newer bundle exists for this native binary / runtimeVersion.
 * 2) Apple App Store — compares iTunes "version" to installed native CFBundleShortVersionString; opens listing if newer.
 *
 * Promotion of an EAS Update must publish to the same **channel** the build uses (e.g. `production`).
 * `runtimeVersion: appVersion` in app.json ties OTA bundles to the **marketing version** baked into native builds:
 * bump `expo.version` when you ship a new binary, then publish OTA targeting that runtime.
 */
export function useAppUpdatePrompt() {
    const otaBusy = useRef(false);

    useEffect(() => {
        if (__DEV__) return;
        if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

        const run = async () => {
            if (otaBusy.current) return;
            otaBusy.current = true;

            try {
                if (Updates.isEnabled) {
                    const check = await Updates.checkForUpdateAsync();
                    if (check.isAvailable) {
                        Alert.alert(
                            'Update available',
                            'A newer release is ready from EAS Update. Reload to apply (JavaScript and assets — same App Store install).',
                            [
                                { text: 'Not now', style: 'cancel' },
                                {
                                    text: 'Reload now',
                                    onPress: async () => {
                                        try {
                                            await Updates.fetchUpdateAsync();
                                            await Updates.reloadAsync();
                                        } catch (e: unknown) {
                                            const m = e instanceof Error ? e.message : String(e);
                                            Alert.alert('Update failed', m);
                                        }
                                    },
                                },
                            ],
                        );
                    }
                }

                await checkAppStoreIosIfNeeded();
            } finally {
                otaBusy.current = false;
            }
        };

        void run();

        const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
            if (next === 'active') void run();
        });

        return () => sub.remove();
    }, []);
}

async function checkAppStoreIosIfNeeded(): Promise<void> {
    if (Platform.OS !== 'ios') return;

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
        const json = (await res.json()) as { resultCount?: number; results?: Array<{ version?: string; trackViewUrl?: string }> };
        const item = json.results?.[0];
        const storeVer = item?.version;
        if (!storeVer) return;

        if (!isVersionNewer(installed, storeVer)) return;

        const [dismissed, dismissedAtRaw] = await Promise.all([
            AsyncStorage.getItem(DISMISS_STORE_VERSION_KEY),
            AsyncStorage.getItem(DISMISS_STORE_VERSION_AT_KEY),
        ]);
        if (dismissed === storeVer) {
            const dismissedAt = parseInt(dismissedAtRaw || '0', 10) || 0;
            const elapsed = Date.now() - dismissedAt;
            if (dismissedAt > 0 && elapsed < STORE_REMIND_AFTER_MS) return;
        }

        const url = item.trackViewUrl;
        Alert.alert(
            'App Store update',
            `Version ${storeVer} is available. You’re on ${installed}. Update in the App Store for the latest fixes.`,
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
                ...(url
                    ? [
                          {
                              text: 'Open App Store',
                              onPress: () => Linking.openURL(url),
                          },
                      ]
                    : []),
            ],
        );
    } catch {
        // Offline / transient — ignore
    }
}
