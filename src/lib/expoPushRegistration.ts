import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function registerExpoPushToken(supabase: SupabaseClient): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    if (!projectId) {
      console.warn('[expo-push] missing EAS projectId in app config');
      return;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token.data) return;

    const { error } = await supabase.rpc('upsert_expo_push_token', { _token: token.data });
    if (error) console.warn('[expo-push] upsert failed:', error.message);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Camp notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  } catch (e) {
    console.warn('[expo-push] register failed:', e);
  }
}
