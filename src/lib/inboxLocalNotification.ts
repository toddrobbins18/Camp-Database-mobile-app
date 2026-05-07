import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const ANDROID_CHANNEL = 'inbox-messages';

let handlerRegistered = false;

/** Call once after sign-in so scheduled inbox alerts can present (foreground + background). */
export function registerInboxNotificationPresentation(): void {
    if (handlerRegistered) return;
    handlerRegistered = true;
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

export async function ensureInboxNotificationChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
        name: 'Messages',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
    });
}

export async function requestInboxNotificationPermission(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
}

/** Fire a local notification when the server inserts a row for this user (Realtime path). */
export async function showNewInboxMessageNotification(title: string, bodySnippet: string): Promise<void> {
    try {
        const ok = await requestInboxNotificationPermission();
        if (!ok) return;
        await ensureInboxNotificationChannel();
        const body = (bodySnippet || '').replace(/\s+/g, ' ').trim().slice(0, 200);
        await Notifications.scheduleNotificationAsync({
            content: {
                title: title?.trim() || 'New message',
                body: body || 'You have a new notification.',
                ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
            },
            trigger: null,
        });
    } catch (e) {
        console.warn('[InboxNotify]', e);
    }
}
