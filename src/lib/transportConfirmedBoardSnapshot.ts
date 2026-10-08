import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TransportBoardPayload } from './transportRoster';

const confirmedBoardCacheKey = (companyId: string, season: string) =>
  `transport-confirmed-board-v1:${companyId}:${season}`;

export async function loadConfirmedBoardSnapshot(
  companyId: string,
  season: string,
): Promise<TransportBoardPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(confirmedBoardCacheKey(companyId, season));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TransportBoardPayload;
    if (!parsed?.coreStops || !Array.isArray(parsed.routeMeta)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function persistConfirmedBoardSnapshot(
  companyId: string,
  season: string,
  payload: TransportBoardPayload,
): Promise<void> {
  try {
    await AsyncStorage.setItem(confirmedBoardCacheKey(companyId, season), JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}
