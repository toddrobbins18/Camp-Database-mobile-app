import { normalizeTransportAddress } from './transportAddressNormalize';
import {
  consolidateRouteStopsByAddress,
  isValidRouteCoordinate,
  sanitizeRouteStops,
} from './transportRouteStops';
import type { TransportRouteStop } from './transportRoster';
import { haversineMiles, nearestNeighborOrder } from './transportBoardUtils';

/**
 * Re-order stops 2…N for shortest drive starting at stop #1 (stop #1 stays fixed).
 */
export function optimizeStopsFromFirstStop(stops: TransportRouteStop[]): TransportRouteStop[] {
  if (stops.length <= 1) return [...stops];

  const [first, ...rest] = stops.filter((s) => isValidRouteCoordinate(s.lat, s.lng));
  if (!first) return [...stops];
  if (rest.length === 0) return [first];

  const remaining = [...rest];
  const ordered: TransportRouteStop[] = [];
  let curLat = first.lat;
  let curLng = first.lng;

  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMiles(curLat, curLng, remaining[i].lat, remaining[i].lng);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    curLat = next.lat;
    curLng = next.lng;
  }

  const invalid = stops.filter((s) => !isValidRouteCoordinate(s.lat, s.lng));
  return [first, ...ordered, ...invalid];
}

const nearestNeighborFromPoint = (
  startLat: number,
  startLng: number,
  stops: TransportRouteStop[],
): TransportRouteStop[] => {
  const remaining = [...stops];
  const ordered: TransportRouteStop[] = [];
  let curLat = startLat;
  let curLng = startLng;

  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMiles(curLat, curLng, remaining[i].lat, remaining[i].lng);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    curLat = next.lat;
    curLng = next.lng;
  }

  return ordered;
};

const addressKey = (stop: TransportRouteStop) => normalizeTransportAddress(stop.address || '');

/** Pinned pickups stay in route order; unpinned stops between them are re-optimized. */
export function optimizeStopsWithPinned(
  stops: TransportRouteStop[],
  pinnedAddressKeys: string[],
): TransportRouteStop[] {
  const consolidated = consolidateRouteStopsByAddress(stops);
  if (consolidated.length <= 1) return consolidated;

  const pinSet = new Set(pinnedAddressKeys.filter(Boolean).map((k) => normalizeTransportAddress(k)));
  if (pinSet.size === 0) return optimizeStopsFromFirstStop(consolidated);

  const isPinned = (stop: TransportRouteStop) => {
    const key = addressKey(stop);
    return key.length > 0 && pinSet.has(key);
  };

  const result: TransportRouteStop[] = [];
  let pending: TransportRouteStop[] = [];
  let anchor: TransportRouteStop | null = null;

  const flushPending = () => {
    if (pending.length === 0) return;

    if (!anchor) {
      if (pending.length === 1) {
        result.push(pending[0]);
      } else {
        const [first, ...rest] = pending;
        result.push(first, ...nearestNeighborFromPoint(first.lat, first.lng, rest));
      }
    } else {
      result.push(...nearestNeighborFromPoint(anchor.lat, anchor.lng, pending));
    }
    pending = [];
  };

  for (const stop of consolidated) {
    if (isPinned(stop)) {
      flushPending();
      result.push(stop);
      anchor = stop;
    } else {
      pending.push(stop);
    }
  }
  flushPending();

  return result;
}

export function reorderRouteForOptimize(
  stops: TransportRouteStop[],
  options?: { fromFirstStop?: boolean; pinnedKeys?: string[] },
): TransportRouteStop[] {
  const consolidated = consolidateRouteStopsByAddress(stops);
  let pins = [...(options?.pinnedKeys ?? [])];
  if (options?.fromFirstStop && pins.length === 0 && consolidated[0]?.address) {
    pins = [normalizeTransportAddress(consolidated[0].address)];
  }
  if (pins.length > 0) {
    return sanitizeRouteStops(optimizeStopsWithPinned(consolidated, pins));
  }
  if (options?.fromFirstStop) {
    return sanitizeRouteStops(optimizeStopsFromFirstStop(consolidated));
  }
  return sanitizeRouteStops(nearestNeighborOrder(consolidated));
}
