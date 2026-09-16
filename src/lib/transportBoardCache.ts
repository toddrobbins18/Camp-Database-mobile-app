import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TransportBoardPayload } from './transportRoster';
import type { TransportRouteStop } from './transportRoster';

const boardCacheKey = (companyId: string, season: string) => `transport-board-v1:${companyId}:${season}`;
export const GEOCODE_CACHE_KEY = 'transport-geocode-cache-v1';

export async function loadBoardCache(companyId: string, season: string): Promise<TransportBoardPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(boardCacheKey(companyId, season));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TransportBoardPayload;
    if (!parsed?.coreStops || !Array.isArray(parsed.routeMeta)) return null;
    const coreStops = Object.fromEntries(
      Object.entries(parsed.coreStops).map(([k, v]) => [Number(k), v as TransportRouteStop[]]),
    );
    return { ...parsed, coreStops };
  } catch {
    return null;
  }
}

export async function persistBoardCache(companyId: string, season: string, payload: TransportBoardPayload) {
  try {
    await AsyncStorage.setItem(boardCacheKey(companyId, season), JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

export type GeocodeResult =
  | { lat: number; lng: number; provider?: string; label?: string }
  | { error: string; retryable?: boolean; message?: string };

export async function loadPersistedGeocodeCache(): Promise<Map<string, GeocodeResult | null>> {
  try {
    const raw = await AsyncStorage.getItem(GEOCODE_CACHE_KEY);
    if (!raw) return new Map();
    const entries = JSON.parse(raw) as [string, GeocodeResult | null][];
    return new Map(entries);
  } catch {
    return new Map();
  }
}

export async function persistGeocodeCache(cache: Map<string, GeocodeResult | null>) {
  try {
    const entries = [...cache.entries()].slice(-2500);
    await AsyncStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}
