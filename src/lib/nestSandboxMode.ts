import AsyncStorage from '@react-native-async-storage/async-storage';
import { CAMP_SLUG, isNestSandboxCompany } from '../constants/camps';

const NEST_SANDBOX_MODE_KEY = '@the_nest_sandbox_mode';

export async function isNestSandboxModeActive(): Promise<boolean> {
  const v = await AsyncStorage.getItem(NEST_SANDBOX_MODE_KEY);
  return v === '1';
}

export async function setNestSandboxModeActive(active: boolean): Promise<void> {
  if (active) {
    await AsyncStorage.setItem(NEST_SANDBOX_MODE_KEY, '1');
  } else {
    await AsyncStorage.removeItem(NEST_SANDBOX_MODE_KEY);
  }
}

export function nestSandboxSlug(): string {
  return CAMP_SLUG.NEST_SANDBOX_DAY_CAMP;
}

export function shouldHideSandboxFromCampSwitcher(options: {
  sandboxMode: boolean;
  currentSlug: string | null;
}): boolean {
  if (options.sandboxMode) return true;
  return isNestSandboxCompany(options.currentSlug);
}
