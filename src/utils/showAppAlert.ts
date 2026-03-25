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
