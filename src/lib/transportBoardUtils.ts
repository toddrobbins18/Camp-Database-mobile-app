import type { TransportRouteStop } from './transportRoster';

export const ROUTE_COLORS = [
  '#3eb8a0', '#4a9eff', '#f59e0b', '#ef4444', '#a855f7',
  '#ec4899', '#22c55e', '#eab308', '#06b6d4', '#f97316',
  '#8b5cf6', '#14b8a6', '#6366f1', '#84cc16', '#d946ef',
  '#0ea5e9', '#dc2626', '#facc15', '#10b981', '#f43f5e',
  '#7c3aed', '#0891b2', '#65a30d', '#ea580c', '#be123c',
  '#2563eb', '#16a34a', '#ca8a04', '#9333ea', '#0d9488',
  '#db2777', '#4f46e5', '#059669', '#b45309', '#9f1239',
  '#1d4ed8', '#15803d', '#a16207', '#7e22ce', '#0f766e',
  '#be185d', '#4338ca', '#047857', '#92400e', '#881337',
  '#1e40af', '#166534', '#854d0e', '#6b21a8', '#134e4a',
];

export const CAMP_LOCATION = {
  name: 'Camp — 85 Crescent Beach Rd',
  address: '85 Crescent Beach Road, Glen Cove, NY 11542',
  lat: 40.879993,
  lng: -73.642634,
  pickupTime: '',
  passengers: 0,
};

export type TransportRouteMeta = {
  id: number;
  name: string;
  bus: string;
  departure: string;
  status: string;
  color: string;
  capacity: number;
};

export type TransportDisplayRoute = TransportRouteMeta & {
  stops: TransportRouteStop[];
  campers: number;
  direction: string;
};

export const haversineMiles = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const drivingMinutes = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const miles = haversineMiles(lat1, lng1, lat2, lng2) * 1.4;
  return Math.round((miles / 25) * 60);
};

const assignDrivingTimes = (stops: TransportRouteStop[]): TransportRouteStop[] => {
  if (stops.length === 0) return stops;
  let cumulativeMin = 0;
  return stops.map((stop, i) => {
    if (i === 0) return { ...stop, pickupTime: 'Start' };
    const prev = stops[i - 1];
    const legMin = Math.max(drivingMinutes(prev.lat, prev.lng, stop.lat, stop.lng), 2);
    cumulativeMin += legMin;
    return { ...stop, pickupTime: `+${cumulativeMin} min` };
  });
};

export const buildAMStops = (stops: TransportRouteStop[]): TransportRouteStop[] =>
  assignDrivingTimes([...stops, { ...CAMP_LOCATION, pickupTime: '', passengers: 0 }]);

export const buildPMStops = (stops: TransportRouteStop[]): TransportRouteStop[] =>
  assignDrivingTimes([{ ...CAMP_LOCATION, pickupTime: '', passengers: 0 }, ...stops]);

export const displayStopToCoreIndex = (displayIdx: number, isAM: boolean): number =>
  isAM ? displayIdx : displayIdx - 1;

export const routeMiles = (stops: TransportRouteStop[]): number => {
  if (stops.length === 0) return 0;
  const seq = [...stops, { lat: CAMP_LOCATION.lat, lng: CAMP_LOCATION.lng } as TransportRouteStop];
  let total = 0;
  let prev = seq[0];
  for (let i = 1; i < seq.length; i++) {
    total += haversineMiles(prev.lat, prev.lng, seq[i].lat, seq[i].lng) * 1.4;
    prev = seq[i];
  }
  return total;
};

export const nearestNeighborOrder = (stops: TransportRouteStop[]): TransportRouteStop[] => {
  if (stops.length <= 1) return [...stops];
  const remaining = [...stops];
  const ordered: TransportRouteStop[] = [];
  let curLat = CAMP_LOCATION.lat;
  let curLng = CAMP_LOCATION.lng;
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
  return ordered.reverse();
};

export const countBoardStops = (stops: Record<number, TransportRouteStop[]>) =>
  Object.values(stops).reduce((sum, arr) => sum + (arr?.length || 0), 0);

export const normAddr = (a: string) =>
  a.toLowerCase().replace(/[.,#]/g, ' ').replace(/\s+/g, ' ').trim();

const STREET_SUFFIX_MAP: Record<string, string> = {
  st: 'street', str: 'street', street: 'street',
  rd: 'road', road: 'road',
  ln: 'lane', lane: 'lane',
  ave: 'avenue', av: 'avenue', avenue: 'avenue',
  blvd: 'boulevard', boulevard: 'boulevard',
  dr: 'drive', drive: 'drive',
  ct: 'court', court: 'court',
  pl: 'place', place: 'place',
  pkwy: 'parkway', parkway: 'parkway',
  hwy: 'highway', highway: 'highway',
  ter: 'terrace', terr: 'terrace', terrace: 'terrace',
  cir: 'circle', circle: 'circle',
  trl: 'trail', trail: 'trail',
  way: 'way',
  sq: 'square', square: 'square',
  hl: 'hill', hill: 'hill',
  hts: 'heights', heights: 'heights',
  pt: 'point', point: 'point',
  cv: 'cove', cove: 'cove',
  xing: 'crossing', crossing: 'crossing',
  n: 'north', s: 'south', e: 'east', w: 'west',
  north: 'north', south: 'south', east: 'east', west: 'west',
  ne: 'northeast', nw: 'northwest', se: 'southeast', sw: 'southwest',
};

/** Normalize address tokens so abbreviations match full words (Ln↔Lane, etc.). */
export const normalizeAddress = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((tok) => STREET_SUFFIX_MAP[tok] ?? tok)
    .join(' ');

export const isCampStop = (stop: TransportRouteStop) =>
  normAddr(stop.address) === normAddr(CAMP_LOCATION.address);
