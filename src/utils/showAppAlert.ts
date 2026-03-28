import { Alert, Platform } from 'react-native';

/** Native Alert is often a no-op or invisible on React Native Web — use a real dialog there. */
export function showAppAlert(title: string, message?: string) {
    const text = message ? `${title}\n\n${message}` : title;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(text);
        return;
    }
    if (message !== undefined) {
        Alert.alert(title, message);
    } else {
        Alert.alert(title);
    }
}

export type ConfirmAppAlertOptions = {
    confirmText?: string;
    cancelText?: string;
    /** Maps to destructive style on iOS (red confirm). */
    destructive?: boolean;
};

/**
 * Yes/No confirmation. On web, `Alert.alert` with multiple buttons is unreliable; use `window.confirm` instead.
 */
export function confirmAppAlert(title: string, message: string, options?: ConfirmAppAlertOptions): Promise<boolean> {
    const confirmText = options?.confirmText ?? 'OK';
    const cancelText = options?.cancelText ?? 'Cancel';

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
        const text = message ? `${title}\n\n${message}` : title;
        return Promise.resolve(window.confirm(text));
    }

    return new Promise((resolve) => {
        Alert.alert(title, message, [
            { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
            {
                text: confirmText,
                style: options?.destructive ? 'destructive' : 'default',
                onPress: () => resolve(true),
            },
        ]);
    });
}
