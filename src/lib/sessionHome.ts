import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { userIsCampStaff } from '../constants/parentPortalConstants';

const SESSION_HOME_CHOICE_KEY = 'session_home_choice';

/** Parent sign-in stays on the family portal, even when that person is also camp staff. */
export async function rememberSessionHome(home: 'staff' | 'parent') {
  await AsyncStorage.setItem(SESSION_HOME_CHOICE_KEY, home);
}

export async function clearSessionHomeChoice() {
  await AsyncStorage.removeItem(SESSION_HOME_CHOICE_KEY);
}

/** Where a signed-in person belongs. An explicit Parent or Staff choice wins over their other role. */
export async function resolveSessionHome(): Promise<'staff' | 'parent' | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const choice = await AsyncStorage.getItem(SESSION_HOME_CHOICE_KEY);
  if (choice === 'parent' || choice === 'staff') return choice;

  const [{ data: roleRows }, { data: profile }] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', userId),
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
  ]);

  const roles = [
    ...(roleRows ?? []).map((row) => String(row.role)),
    profile?.role ? String(profile.role) : '',
  ].filter(Boolean);

  return userIsCampStaff(roles) ? 'staff' : 'parent';
}
