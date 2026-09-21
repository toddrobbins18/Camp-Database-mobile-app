import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Alert, Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { parseCSV, pickFirst } from '../lib/sunshineCsv';
import { pickAndReadCsvText } from '../lib/pickCsvDocument';
import {
  getBundledMappointRoutesCsv2026,
  mappointRoutesSummary,
  parseMappointRoutesCsv,
  resolveBundledGeocodeResult,
} from '../lib/mappointTransportImport';
import {
  applyRouteOverrides,
  emptyManualOverrides,
  excludedCamperSet,
  buildTransportExceptionsReportRows,
  fetchTransportExceptions,
  fetchTransportExceptionsForReport,
  loadManualOverrides,
  saveManualOverrides,
  todayDateString,
  type TransportException,
} from '../lib/transportDailyOverrides';
import {
  attendanceRecordKey,
  attendanceStatusLabel,
  campersOnRoute,
  loadBusAttendance,
  type BusAttendanceMap,
} from '../lib/transportBusAttendance';
import { loadGroupRoster, type GroupRosterCamper } from '../lib/transportGroupAttendance';
import {
  camperEnrolledInWeek,
  enrollmentWeekForDate,
  formatEnrollmentWeekRange,
  getEnrollmentWeekRow,
  loadEnrollmentWeekCalendar,
  type EnrollmentWeekCalendar,
} from '../lib/enrollmentWeekCalendar';
import { installTextCodecPolyfill } from '../lib/textCodecPolyfill';
import {
  normalizeTransportBoardForSeason,
  prepareBoardForPersist,
  type TransportBoardPayload,
  type TransportRouteMeta,
  type TransportRouteStop,
  type TransportRoutesSource,
  type TransportUnplottedCamper,
} from '../lib/transportRoster';
import {
  loadBoardCache,
  persistBoardCache,
  GEOCODE_CACHE_KEY,
} from '../lib/transportBoardCache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ROUTE_COLORS,
  CAMP_LOCATION,
  buildAMStops,
  buildPMStops,
  displayStopToCoreIndex,
  routeMiles,
  nearestNeighborOrder,
  countBoardStops,
  normalizeAddress,
  type TransportDisplayRoute,
} from '../lib/transportBoardUtils';
import {
  TransportGeocodeCache,
  geocodeBatch,
  geocodeFailureMessage,
  isGeocodePoint,
} from '../lib/transportGeocode';
import type { GeocodeResult } from '../lib/transportBoardCache';

export const DAY_CAMP_REPORTS = [
  { name: 'Transport Exceptions', desc: 'Absences, swim, office changes, and manual route edits for this date' },
  { name: 'Attendance', desc: 'Bubble sheet PDF backup (bus + group)' },
  { name: 'Bus Report', desc: 'Day camp bus assignments' },
  { name: 'Bus Route Summary', desc: 'Route overview with stops' },
  { name: 'Car Report', desc: 'Car pickup/dropoff log' },
  { name: 'Daily Passenger Update', desc: 'Real-time passenger counts' },
  { name: 'Extended Care', desc: 'Before/after care transport' },
] as const;

const initialCoreStops: Record<number, TransportRouteStop[]> = { 1: [], 2: [], 3: [], 4: [] };

const initialRouteMeta: TransportRouteMeta[] = Array.from({ length: 38 }, (_, i) => ({
  id: i + 1,
  name: `Bus ${i + 1} Route`,
  bus: `Bus ${i + 1}`,
  departure: '7:00 AM',
  status: 'Confirmed',
  color: ROUTE_COLORS[i % ROUTE_COLORS.length],
  capacity: 22,
}));

export type EditRouteState = {
  id: number;
  name: string;
  bus: string;
  departure: string;
  status: string;
  color: string;
  capacity: number;
};

export type ScopeDialogState = {
  open: boolean;
  title: string;
  description: string;
  onChoose: (scope: 'today' | 'permanent') => void;
};

export type OptimizePreviewState = {
  open: boolean;
  proposedCore: Record<number, TransportRouteStop[]>;
  proposedUnplotted: TransportUnplottedCamper[];
  beforeMiles: number;
  afterMiles: number;
  reassignments: { name: string; from: string; to: string }[];
  reorderedRoutes: number;
  perRoute: {
    id: number;
    name: string;
    bus: string;
    beforeMi: number;
    afterMi: number;
    changed: boolean;
    addedCampers: string[];
  }[];
  selectedRouteIds: number[];
};

export type BulkImportState = {
  open: boolean;
  target: 'campers' | 'stops' | 'staff';
  routeId: number | null;
  mode: 'append' | 'replace';
  running: boolean;
  progress: { done: number; total: number };
  log: {
    ok: number;
    skipped: number;
    failed: number;
    messages: string[];
    providerCounts?: Record<string, number>;
  };
  failedRows: { name: string; address: string; age: number; session: string; reason: string }[];
};

const toast = (title: string, description?: string, destructive = false) => {
  Alert.alert(title, description, [{ text: 'OK' }], destructive ? { cancelable: true } : undefined);
};

const csvRowsToText = (rows: (string | number)[][]) =>
  rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? '');
          return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\n');

async function shareCsv(rows: (string | number)[][], filename: string) {
  const csv = csvRowsToText(rows);
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create({ overwrite: true });
  file.write(csv);
  await Share.share({ url: file.uri, title: filename, message: csv });
}

async function shareTransportPdf(pdf: { filename: string; bytes: Uint8Array }) {
  const file = new File(Paths.cache, pdf.filename);
  if (file.exists) file.delete();
  file.create({ overwrite: true });
  file.write(pdf.bytes);
  await Share.share({ url: file.uri, title: pdf.filename });
}

export function useDayCampTransport() {
  const { companyId, season, availableCompanies } = useCompany();
  const companyName = availableCompanies.find((c) => c.id === companyId)?.name ?? 'Day Camp';

  const [coreStops, setCoreStops] = useState<Record<number, TransportRouteStop[]>>(
    () => (season === '2026' ? initialCoreStops : {}),
  );
  const [routeMeta, setRouteMeta] = useState<TransportRouteMeta[]>(
    () => (season === '2026' ? initialRouteMeta : []),
  );
  const [unplottedCampers, setUnplottedCampers] = useState<TransportUnplottedCamper[]>([]);
  const [routesConfigured, setRoutesConfigured] = useState(false);
  const [routesSource, setRoutesSource] = useState<TransportRoutesSource | undefined>();
  const [visibleRoutes, setVisibleRoutes] = useState<number[]>(
    () => (season === '2026' ? initialRouteMeta.map((r) => r.id) : []),
  );
  const [timeOfDay, setTimeOfDay] = useState<'am' | 'pm'>('am');
  const [overrideDate, setOverrideDate] = useState(todayDateString);
  const [todayOverrides, setTodayOverrides] = useState(emptyManualOverrides());
  const [transportExceptions, setTransportExceptions] = useState<TransportException[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(true);
  const [groupRoster, setGroupRoster] = useState<GroupRosterCamper[]>([]);
  const [enrollmentWeekCalendar, setEnrollmentWeekCalendar] = useState<EnrollmentWeekCalendar>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [persistLoaded, setPersistLoaded] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [mappointImporting, setMappointImporting] = useState(false);
  const [regeocoding, setRegeocoding] = useState(false);

  const [addRouteOpen, setAddRouteOpen] = useState(false);
  const [addCamperOpen, setAddCamperOpen] = useState(false);
  const [newUnplotted, setNewUnplotted] = useState({ name: '', address: '', age: 10, session: 'Session 1' });
  const [newRoute, setNewRoute] = useState({ name: '', bus: '', departure: '', capacity: 50 });
  const [editRoute, setEditRoute] = useState<EditRouteState | null>(null);
  const [scopeDialog, setScopeDialog] = useState<ScopeDialogState>({
    open: false,
    title: '',
    description: '',
    onChoose: () => {},
  });
  const [optimizePreview, setOptimizePreview] = useState<OptimizePreviewState>({
    open: false,
    proposedCore: {},
    proposedUnplotted: [],
    beforeMiles: 0,
    afterMiles: 0,
    reassignments: [],
    reorderedRoutes: 0,
    perRoute: [],
    selectedRouteIds: [],
  });
  const [bulkImport, setBulkImport] = useState<BulkImportState>({
    open: false,
    target: 'campers',
    routeId: null,
    mode: 'append',
    running: false,
    progress: { done: 0, total: 0 },
    log: { ok: 0, skipped: 0, failed: 0, messages: [], providerCounts: {} },
    failedRows: [],
  });
  const [stopAction, setStopAction] = useState<{
    routeId: number;
    stopIndex: number;
    stop: TransportRouteStop;
  } | null>(null);
  const [assignCamperId, setAssignCamperId] = useState<number | null>(null);

  const skipOverridePersistRef = useRef(true);
  const overrideLoadedKeyRef = useRef<string | null>(null);
  const skipPersistRef = useRef(true);
  const importInProgressRef = useRef(false);
  const loadedScopeRef = useRef<string | null>(null);
  const lastKnownStopCountRef = useRef(0);
  const groupLoadedKeyRef = useRef<string | null>(null);
  const geocodeCacheRef = useRef(new TransportGeocodeCache());
  const boardStateRef = useRef({
    coreStops: {} as Record<number, TransportRouteStop[]>,
    routeMeta: [] as TransportRouteMeta[],
    unplottedCampers: [] as TransportUnplottedCamper[],
    routesConfigured: false,
    routesSource: undefined as TransportRoutesSource | undefined,
  });

  boardStateRef.current = { coreStops, routeMeta, unplottedCampers, routesConfigured, routesSource };

  useEffect(() => {
    void geocodeCacheRef.current.init();
  }, []);

  const excludedCampers = useMemo(
    () => excludedCamperSet(transportExceptions, timeOfDay),
    [transportExceptions, timeOfDay],
  );

  const buildBoardPayload = useCallback(
    (overrides: Partial<TransportBoardPayload> = {}): TransportBoardPayload => ({
      coreStops,
      routeMeta,
      unplottedCampers,
      routesConfigured,
      routesSeason: routesConfigured ? season : undefined,
      routesSource,
      ...overrides,
    }),
    [coreStops, routeMeta, unplottedCampers, routesConfigured, routesSource, season],
  );

  const markRoutesConfigured = useCallback((source: TransportRoutesSource = 'manual') => {
    setRoutesConfigured(true);
    setRoutesSource(source);
  }, []);

  const persistBoard = useCallback(
    async (payload: TransportBoardPayload) => {
      if (!companyId || !season) return false;
      const marked = prepareBoardForPersist(payload, season);
      await persistBoardCache(companyId, season, marked);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const { error } = await supabase.from('transport_boards').upsert({
          company_id: companyId,
          season,
          data: marked,
          updated_by: userRes.user?.id ?? null,
          updated_at: new Date().toISOString(),
        });
        if (error) {
          console.error('[Transport] Save board failed:', error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.error('[Transport] Save board error:', err);
        return false;
      }
    },
    [companyId, season],
  );

  const normalizeRouteMeta = (meta: TransportRouteMeta[]) =>
    meta.map((r, i) => ({
      ...r,
      id: Number(r.id),
      color: r.color || ROUTE_COLORS[i % ROUTE_COLORS.length],
    }));

  const applyBoardPayload = useCallback(
    (payload: TransportBoardPayload, source?: 'supabase' | 'cache') => {
      const normalizedMeta = normalizeRouteMeta(payload.routeMeta);
      setCoreStops(payload.coreStops);
      setRouteMeta(normalizedMeta);
      setVisibleRoutes(normalizedMeta.map((r) => r.id));
      setUnplottedCampers(payload.unplottedCampers);
      setRoutesConfigured(payload.routesConfigured === true);
      setRoutesSource(payload.routesSource);
      lastKnownStopCountRef.current = countBoardStops(payload.coreStops);
      if (companyId && season) {
        void persistBoardCache(companyId, season, prepareBoardForPersist(payload, season));
      }
      if (source) {
        console.info(
          `[Transport] Board loaded (${source}): ${lastKnownStopCountRef.current} stops, ${normalizedMeta.length} routes, ${payload.unplottedCampers.length} unplotted · season ${season}`,
        );
      }
    },
    [companyId, season],
  );

  const finalizeBoardForSeason = useCallback(
    async (payload: TransportBoardPayload, source?: 'supabase' | 'cache') => {
      if (!companyId || !season) return;
      const normalized = await normalizeTransportBoardForSeason(supabase, companyId, season, payload);
      const strippedLegacyRoutes =
        season !== '2026' && countBoardStops(payload.coreStops) > 0 && !payload.routesConfigured;
      applyBoardPayload(normalized, source);
      if (strippedLegacyRoutes) {
        await persistBoard({
          ...normalized,
          routesConfigured: false,
          routesSeason: undefined,
          routesSource: undefined,
        });
      }
    },
    [companyId, season, applyBoardPayload, persistBoard],
  );

  const restoreBoardFromCache = useCallback(async () => {
    if (!companyId || !season) return false;
    const cached = await loadBoardCache(companyId, season);
    if (!cached) return false;
    await finalizeBoardForSeason(cached, 'cache');
    return true;
  }, [companyId, season, finalizeBoardForSeason]);

  useEffect(() => {
    if (!companyId) {
      setBoardLoading(true);
      return;
    }
    const scope = `${companyId}:${season}`;
    if (loadedScopeRef.current === scope) {
      setBoardLoading(false);
      return;
    }
    let cancelled = false;
    skipPersistRef.current = true;
    setPersistLoaded(false);
    setBoardLoading(true);
    if (season !== '2026') {
      setCoreStops({});
      setRouteMeta([]);
      setVisibleRoutes([]);
      setRoutesConfigured(false);
      setRoutesSource(undefined);
    }
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('transport_boards')
          .select('data')
          .eq('company_id', companyId)
          .eq('season', season)
          .maybeSingle();
        if (cancelled) return;
        if (importInProgressRef.current) {
          loadedScopeRef.current = scope;
          return;
        }
        if (error) {
          console.error('[Transport] Failed to load board:', error.message);
          if (!(await restoreBoardFromCache())) {
            toast('Could not load transport board', error.message, true);
          }
        } else if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
          const saved = data.data as TransportBoardPayload;
          const restoredStops: Record<number, TransportRouteStop[]> =
            saved.coreStops && typeof saved.coreStops === 'object'
              ? Object.fromEntries(
                  Object.entries(saved.coreStops).map(([k, v]) => [Number(k), v as TransportRouteStop[]]),
                )
              : {};
          const meta = Array.isArray(saved.routeMeta)
            ? saved.routeMeta.map((r, i) => ({
                ...r,
                id: Number(r.id),
                color: r.color || ROUTE_COLORS[i % ROUTE_COLORS.length],
              }))
            : [];
          await finalizeBoardForSeason(
            {
              coreStops: restoredStops,
              routeMeta: meta,
              unplottedCampers: Array.isArray(saved.unplottedCampers) ? saved.unplottedCampers : [],
              routesConfigured: saved.routesConfigured,
              routesSeason: saved.routesSeason,
              routesSource: saved.routesSource,
            },
            'supabase',
          );
        } else if (!(await restoreBoardFromCache()) && lastKnownStopCountRef.current === 0) {
          const emptyPayload: TransportBoardPayload =
            season === '2026'
              ? { coreStops: initialCoreStops, routeMeta: initialRouteMeta, unplottedCampers: [] }
              : { coreStops: {}, routeMeta: [], unplottedCampers: [] };
          await finalizeBoardForSeason(emptyPayload);
        }
      } catch (err) {
        console.error('[Transport] Load board error:', err);
      } finally {
        if (!cancelled) {
          loadedScopeRef.current = scope;
          skipPersistRef.current = false;
          setPersistLoaded(true);
          setBoardLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, season, finalizeBoardForSeason, restoreBoardFromCache]);

  useEffect(() => {
    if (!companyId) {
      setOverridesLoading(true);
      return;
    }
    const key = `${companyId}:${season}:${overrideDate}`;
    if (overrideLoadedKeyRef.current === key) {
      setOverridesLoading(false);
      return;
    }
    let cancelled = false;
    skipOverridePersistRef.current = true;
    setOverridesLoading(true);
    void (async () => {
      try {
        const [manual, exceptions] = await Promise.all([
          loadManualOverrides(supabase, companyId, season, overrideDate),
          fetchTransportExceptions(supabase, companyId, overrideDate),
        ]);
        if (cancelled) return;
        setTodayOverrides(manual);
        setTransportExceptions(exceptions);
        overrideLoadedKeyRef.current = key;
      } catch (err) {
        console.error('[Transport] Load daily overrides error:', err);
      } finally {
        if (!cancelled) {
          skipOverridePersistRef.current = false;
          setOverridesLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, season, overrideDate]);

  useEffect(() => {
    if (!companyId || skipOverridePersistRef.current || overridesLoading) return;
    const handle = setTimeout(() => {
      void (async () => {
        const { data: userRes } = await supabase.auth.getUser();
        await saveManualOverrides(
          supabase,
          companyId,
          season,
          overrideDate,
          todayOverrides,
          userRes.user?.id,
        );
      })();
    }, 600);
    return () => clearTimeout(handle);
  }, [todayOverrides, companyId, season, overrideDate, overridesLoading]);

  useEffect(() => {
    if (!companyId) return;
    const key = `${companyId}:${season}`;
    if (groupLoadedKeyRef.current === key) return;
    let cancelled = false;
    void (async () => {
      try {
        const [roster, calendar] = await Promise.all([
          loadGroupRoster(supabase, companyId, season),
          loadEnrollmentWeekCalendar(supabase, companyId, season),
        ]);
        if (!cancelled) {
          setGroupRoster(roster);
          setEnrollmentWeekCalendar(calendar);
          groupLoadedKeyRef.current = key;
        }
      } catch (err) {
        console.error('[Transport] Load group roster error:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, season]);

  useEffect(() => {
    if (!persistLoaded || !companyId || skipPersistRef.current || importInProgressRef.current) return;
    const stopCount = countBoardStops(coreStops);
    const payload = buildBoardPayload();
    if (stopCount === 0 && unplottedCampers.length === 0 && !routesConfigured) {
      if (lastKnownStopCountRef.current > 0) {
        void persistBoard(payload).then((ok) => {
          if (ok) lastKnownStopCountRef.current = 0;
        });
      }
      return;
    }
    const handle = setTimeout(() => {
      void persistBoard(payload).then((ok) => {
        if (ok) lastKnownStopCountRef.current = countBoardStops(coreStops);
      });
    }, stopCount === 0 ? 600 : 600);
    return () => clearTimeout(handle);
  }, [
    coreStops,
    routeMeta,
    unplottedCampers,
    routesConfigured,
    routesSource,
    persistLoaded,
    companyId,
    season,
    persistBoard,
    buildBoardPayload,
  ]);

  useEffect(() => {
    return () => {
      if (skipPersistRef.current || importInProgressRef.current || !companyId) return;
      const {
        coreStops: stops,
        routeMeta: meta,
        unplottedCampers: unplotted,
        routesConfigured: configured,
        routesSource: source,
      } = boardStateRef.current;
      if (countBoardStops(stops) === 0 && unplotted.length === 0 && !configured) return;
      void persistBoard({
        coreStops: stops,
        routeMeta: meta,
        unplottedCampers: unplotted,
        routesConfigured: configured,
        routesSeason: configured ? season : undefined,
        routesSource: source,
      });
    };
  }, [companyId, season, persistBoard]);

  const getEffectiveCore = useCallback(
    (routeId: number): TransportRouteStop[] =>
      applyRouteOverrides(coreStops[routeId] || [], routeId, todayOverrides, excludedCampers),
    [coreStops, todayOverrides, excludedCampers],
  );

  const buildRoutes = useCallback(
    (tod: 'am' | 'pm'): TransportDisplayRoute[] =>
      routeMeta.map((meta) => {
        const core = getEffectiveCore(meta.id);
        const stops = tod === 'am' ? buildAMStops(core) : buildPMStops(core);
        const campers = core.reduce((sum, s) => sum + s.passengers, 0);
        return {
          ...meta,
          stops,
          campers,
          direction: tod === 'am' ? 'Inbound' : 'Outbound',
        };
      }),
    [getEffectiveCore, routeMeta],
  );

  const routes = buildRoutes(timeOfDay);
  const displayedRoutes = routes.filter((r) => visibleRoutes.includes(r.id));

  const totalCampers = useMemo(() => {
    const assigned = Object.values(coreStops).reduce(
      (sum, stops) => sum + stops.reduce((s, st) => s + (st.passengers || 0), 0),
      0,
    );
    return { total: assigned + unplottedCampers.length, assigned, unplotted: unplottedCampers.length };
  }, [coreStops, unplottedCampers]);

  const enrollmentWeekForReport = useMemo(
    () => enrollmentWeekForDate(enrollmentWeekCalendar, overrideDate),
    [enrollmentWeekCalendar, overrideDate],
  );

  const groupRosterForReport = useMemo(() => {
    if (enrollmentWeekForReport == null) return groupRoster;
    return groupRoster.filter((c) =>
      camperEnrolledInWeek(c.enrolledWeeks, c.session, enrollmentWeekForReport),
    );
  }, [groupRoster, enrollmentWeekForReport]);

  const groupRosterByGroup = useMemo(() => {
    const map = new Map<string, GroupRosterCamper[]>();
    for (const c of groupRosterForReport) {
      const list = map.get(c.groupName) ?? [];
      list.push(c);
      map.set(c.groupName, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [groupRosterForReport]);

  const hideAllRoutes = () => setVisibleRoutes([]);
  const showAllRoutes = () => setVisibleRoutes(routeMeta.map((r) => r.id));
  const selectRouteOnMap = (id: number) => {
    setVisibleRoutes((prev) => (prev.length === 1 && prev[0] === id ? [] : [id]));
  };

  const handleAddRoute = () => {
    if (!newRoute.name || !newRoute.bus) {
      toast('Missing info', 'Route name and bus are required.', true);
      return;
    }
    const id = Math.max(0, ...routeMeta.map((r) => r.id)) + 1;
    setRouteMeta((prev) => [
      ...prev,
      {
        id,
        name: newRoute.name,
        bus: newRoute.bus,
        departure: newRoute.departure || 'TBD',
        status: 'Pending',
        color: ROUTE_COLORS[prev.length % ROUTE_COLORS.length],
        capacity: Math.max(1, newRoute.capacity || 50),
      },
    ]);
    setCoreStops((prev) => ({ ...prev, [id]: [] }));
    setVisibleRoutes((prev) => [...prev, id]);
    markRoutesConfigured('manual');
    setAddRouteOpen(false);
    setNewRoute({ name: '', bus: '', departure: '', capacity: 50 });
    toast('Route added', `"${newRoute.name}" has been created for both AM and PM runs.`);
  };

  const handleAssignCamperToRoute = useCallback(
    (camperId: number, routeId: number) => {
      const camper = unplottedCampers.find((c) => c.id === camperId);
      if (!camper) return;
      const meta = routeMeta.find((r) => r.id === routeId);
      const currentLoad =
        (coreStops[routeId] || []).reduce((sum, s) => sum + s.passengers, 0) +
        (todayOverrides.added[routeId] || []).reduce((sum, s) => sum + s.passengers, 0);
      if (meta && currentLoad >= meta.capacity) {
        toast(
          'Bus over capacity',
          `${meta.bus} is already at ${currentLoad}/${meta.capacity}. Adding ${camper.name} will exceed the limit.`,
          true,
        );
      }
      const newStop: TransportRouteStop = {
        name: camper.name,
        address: camper.address,
        lat: camper.lat,
        lng: camper.lng,
        pickupTime: 'TBD',
        passengers: 1,
        camperNames: [camper.name],
      };
      const mergeIntoStops = (stops: TransportRouteStop[]) => {
        const idx = stops.findIndex((s) => normalizeAddress(s.address) === normalizeAddress(camper.address));
        if (idx === -1) return { merged: false, next: [...stops, newStop] };
        const existing = stops[idx];
        const updated: TransportRouteStop = {
          ...existing,
          passengers: existing.passengers + 1,
          camperNames: [...(existing.camperNames || [existing.name]), camper.name],
        };
        const next = [...stops];
        next[idx] = updated;
        return { merged: true, next };
      };
      setScopeDialog({
        open: true,
        title: 'Assign camper',
        description: `Add ${camper.name} to this route for today only, or permanently (both AM & PM, every day)?`,
        onChoose: (scope) => {
          if (scope === 'today') {
            setTodayOverrides((prev) => {
              const existingAdded = prev.added[routeId] || [];
              const tryAdded = mergeIntoStops(existingAdded);
              if (tryAdded.merged) {
                return { ...prev, added: { ...prev.added, [routeId]: tryAdded.next } };
              }
              const coreMatch = (coreStops[routeId] || []).find(
                (s) => normalizeAddress(s.address) === normalizeAddress(camper.address),
              );
              if (coreMatch) {
                return { ...prev, added: { ...prev.added, [routeId]: [...existingAdded, newStop] } };
              }
              return { ...prev, added: { ...prev.added, [routeId]: [...existingAdded, newStop] } };
            });
            setUnplottedCampers((prev) => prev.filter((c) => c.id !== camperId));
            toast('Added for today', `${camper.name} added to today's run only.`);
          } else {
            markRoutesConfigured('manual');
            setCoreStops((cs) => {
              const { next } = mergeIntoStops(cs[routeId] || []);
              return { ...cs, [routeId]: next };
            });
            setUnplottedCampers((prev) => prev.filter((c) => c.id !== camperId));
            toast('Camper assigned', `${camper.name} added permanently (AM & PM).`);
          }
          setScopeDialog((prev) => ({ ...prev, open: false }));
          setAssignCamperId(null);
        },
      });
    },
    [unplottedCampers, routeMeta, coreStops, todayOverrides, markRoutesConfigured],
  );

  const handleAddUnplottedCamper = async () => {
    if (!newUnplotted.name.trim() || !newUnplotted.address.trim()) {
      toast('Missing info', 'Name and address are required.', true);
      return;
    }
    let lat = 40.85 + (Math.random() - 0.5) * 0.1;
    let lng = -73.65 + (Math.random() - 0.5) * 0.1;
    try {
      const { data } = await supabase.functions.invoke('route-optimizer', {
        body: { action: 'geocode', address: newUnplotted.address.trim() },
      });
      if (data?.found) {
        lat = data.lat;
        lng = data.lng;
      }
    } catch {
      /* fallback */
    }
    const id = Math.max(300, ...unplottedCampers.map((c) => c.id)) + 1;
    setUnplottedCampers((prev) => [
      ...prev,
      {
        id,
        name: newUnplotted.name.trim(),
        address: newUnplotted.address.trim(),
        lat,
        lng,
        age: Number(newUnplotted.age) || 10,
        session: newUnplotted.session,
      },
    ]);
    setAddCamperOpen(false);
    setNewUnplotted({ name: '', address: '', age: 10, session: 'Session 1' });
    toast('Camper added', 'Address geocoded and pinned on the map.');
  };

  const handleRemoveUnplotted = (id: number) => {
    setUnplottedCampers((prev) => prev.filter((c) => c.id !== id));
  };

  const handleCSVImport = async (text: string) => {
    try {
      const rows = parseCSV(text);
      if (!rows.length) {
        toast('Empty CSV', undefined, true);
        return;
      }
      let skipped = 0;
      const newOnes: TransportUnplottedCamper[] = [];
      let nextId = Math.max(300, ...unplottedCampers.map((c) => c.id));
      for (const r of rows) {
        const name = pickFirst(r, ['name', 'camper', 'full name']).trim();
        const street = pickFirst(r, ['address', 'home address', 'street']).trim();
        const city = pickFirst(r, ['city', 'town']).trim();
        const state = pickFirst(r, ['state']).trim();
        const zip = pickFirst(r, ['zip', 'zipcode', 'postal', 'postal code']).trim();
        const address = [street, city, state, zip].filter(Boolean).join(', ');
        if (!name || !street) {
          skipped++;
          continue;
        }
        const age = parseInt(pickFirst(r, ['age']) || '10', 10) || 10;
        const session = pickFirst(r, ['session']) || 'Session 1';
        let lat = 40.85 + (Math.random() - 0.5) * 0.1;
        let lng = -73.65 + (Math.random() - 0.5) * 0.1;
        try {
          const { data } = await supabase.functions.invoke('route-optimizer', {
            body: { action: 'geocode', address },
          });
          if (data?.found) {
            lat = data.lat;
            lng = data.lng;
          }
        } catch {
          /* fallback */
        }
        nextId++;
        newOnes.push({ id: nextId, name, address, lat, lng, age, session });
      }
      setUnplottedCampers((prev) => [...prev, ...newOnes]);
      toast('Import complete', `Added ${newOnes.length}${skipped ? `, skipped ${skipped}` : ''} (addresses geocoded).`);
    } catch (e: unknown) {
      toast('Import error', e instanceof Error ? e.message : String(e), true);
    }
  };

  const handleBulkImportFile = async (text: string) => {
    const { target, routeId, mode } = bulkImport;
    try {
      const rows = parseCSV(text);
      if (!rows.length) {
        toast('Empty CSV', undefined, true);
        return;
      }
      setBulkImport((prev) => ({
        ...prev,
        running: true,
        progress: { done: 0, total: rows.length },
        log: { ok: 0, skipped: 0, failed: 0, messages: [] },
        failedRows: [],
      }));
      let ok = 0;
      let skipped = 0;
      let failed = 0;
      const messages: string[] = [];
      const providerCounts: Record<string, number> = { ors: 0, nominatim: 0, census: 0, unknown: 0 };
      const failedRows: BulkImportState['failedRows'] = [];
      let geocodingInterrupted = false;
      const cache = geocodeCacheRef.current;

      if (target === 'campers') {
        if (mode === 'replace') setUnplottedCampers([]);
        const existingKeys =
          mode === 'replace'
            ? new Set<string>()
            : new Set(unplottedCampers.map((c) => `${c.name.toLowerCase()}|${normalizeAddress(c.address)}`));
        let nextId = Math.max(300, ...unplottedCampers.map((c) => c.id));
        type Pending = { rowIdx: number; name: string; fullAddress: string; age: number; session: string };
        const pending: Pending[] = [];
        const seen = new Set<string>();
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const name = pickFirst(r, ['name', 'camper', 'full name']).trim();
          const street = pickFirst(r, ['address', 'home address', 'street']).trim();
          const city = pickFirst(r, ['city', 'town']).trim();
          const state = pickFirst(r, ['state']).trim();
          const zip = pickFirst(r, ['zip', 'zipcode', 'postal', 'postal code']).trim();
          const fullAddress = [street, city, state, zip].filter(Boolean).join(', ');
          if (!name || !street) {
            skipped++;
            messages.push(`Row ${i + 2}: missing name/address`);
            continue;
          }
          const dedupKey = `${name.toLowerCase()}|${normalizeAddress(fullAddress)}`;
          if (seen.has(dedupKey) || existingKeys.has(dedupKey)) {
            skipped++;
            messages.push(`Row ${i + 2}: duplicate (${name})`);
            continue;
          }
          seen.add(dedupKey);
          const age = parseInt(pickFirst(r, ['age']) || '10', 10) || 10;
          const session = pickFirst(r, ['session']) || 'Session 1';
          pending.push({ rowIdx: i, name, fullAddress, age, session });
        }
        const newOnes: TransportUnplottedCamper[] = [];
        let done = 0;
        const geos = await geocodeBatch(
          pending.map((p) => p.fullAddress),
          8,
          cache,
          () => {
            done++;
            setBulkImport((prev) => ({ ...prev, progress: { done, total: pending.length } }));
          },
        );
        for (let k = 0; k < pending.length; k++) {
          const p = pending[k];
          const geo = geos[k];
          if (!isGeocodePoint(geo)) {
            failed++;
            messages.push(`Row ${p.rowIdx + 2}: ${geocodeFailureMessage(geo, p.fullAddress)}`);
            failedRows.push({ name: p.name, address: p.fullAddress, age: p.age, session: p.session, reason: geocodeFailureMessage(geo, p.fullAddress) });
            if (geo && 'error' in geo && geo.retryable) geocodingInterrupted = true;
          } else {
            nextId++;
            newOnes.push({ id: nextId, name: p.name, address: p.fullAddress, lat: geo.lat, lng: geo.lng, age: p.age, session: p.session });
            providerCounts[geo.provider ?? 'unknown'] = (providerCounts[geo.provider ?? 'unknown'] ?? 0) + 1;
            ok++;
          }
        }
        if (mode === 'replace') setUnplottedCampers(newOnes);
        else if (newOnes.length) setUnplottedCampers((prev) => [...prev, ...newOnes]);
      } else if (target === 'stops') {
        if (!routeId) {
          toast('Pick a route', undefined, true);
          setBulkImport((prev) => ({ ...prev, running: false }));
          return;
        }
        if (mode === 'replace') setCoreStops((prev) => ({ ...prev, [routeId]: [] }));
        type PendingStop = { rowIdx: number; stopName: string; fullAddress: string };
        const pending: PendingStop[] = [];
        const seen = new Set<string>();
        const existingKeys =
          mode === 'replace'
            ? new Set<string>()
            : new Set((coreStops[routeId] || []).map((s) => `${s.name.toLowerCase()}|${normalizeAddress(s.address)}`));
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const stopName = pickFirst(r, ['stop_name', 'name', 'stop']).trim();
          const street = pickFirst(r, ['address', 'street']).trim();
          const city = pickFirst(r, ['city', 'town']).trim();
          const state = pickFirst(r, ['state']).trim();
          const zip = pickFirst(r, ['zip', 'zipcode', 'postal', 'postal code']).trim();
          const fullAddress = [street, city, state, zip].filter(Boolean).join(', ');
          if (!stopName || !street) {
            skipped++;
            continue;
          }
          const dedupKey = `${stopName.toLowerCase()}|${normalizeAddress(fullAddress)}`;
          if (seen.has(dedupKey) || existingKeys.has(dedupKey)) {
            skipped++;
            continue;
          }
          seen.add(dedupKey);
          pending.push({ rowIdx: i, stopName, fullAddress });
        }
        const newStops: TransportRouteStop[] = [];
        let done = 0;
        const geos = await geocodeBatch(
          pending.map((p) => p.fullAddress),
          8,
          cache,
          () => {
            done++;
            setBulkImport((prev) => ({ ...prev, progress: { done, total: pending.length } }));
          },
        );
        for (let k = 0; k < pending.length; k++) {
          const p = pending[k];
          const geo = geos[k];
          if (!isGeocodePoint(geo)) {
            failed++;
            if (geo && 'error' in geo && geo.retryable) geocodingInterrupted = true;
          } else {
            newStops.push({ name: p.stopName, address: p.fullAddress, lat: geo.lat, lng: geo.lng, pickupTime: '', passengers: 0 });
            ok++;
          }
        }
        if (mode === 'replace') setCoreStops((prev) => ({ ...prev, [routeId]: newStops }));
        else if (newStops.length) setCoreStops((prev) => ({ ...prev, [routeId]: [...(prev[routeId] || []), ...newStops] }));
        if (newStops.length) markRoutesConfigured('manual');
      } else if (target === 'staff') {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const first_name = pickFirst(r, ['first_name', 'first name', 'first']).trim();
          const last_name = pickFirst(r, ['last_name', 'last name', 'last']).trim();
          const address = pickFirst(r, ['address', 'home address']).trim();
          if (!first_name || !last_name) {
            skipped++;
          } else {
            if (address) await geocodeBatch([address], 1, cache);
            const payload = {
              first_name,
              last_name,
              email: pickFirst(r, ['email']).trim() || null,
              phone: pickFirst(r, ['phone']).trim() || null,
              position: pickFirst(r, ['position', 'role', 'title']).trim() || null,
            };
            const { error } = await supabase.from('staff').insert(payload as never);
            if (error) {
              failed++;
              messages.push(`Row ${i + 2}: ${error.message}`);
            } else ok++;
          }
          setBulkImport((prev) => ({ ...prev, progress: { done: i + 1, total: rows.length } }));
        }
      }

      setBulkImport((prev) => ({
        ...prev,
        running: false,
        log: { ok, skipped, failed, messages, providerCounts },
        failedRows,
      }));
      toast(
        geocodingInterrupted ? 'Import paused' : 'Bulk import done',
        `${ok} added · ${skipped} skipped · ${failed} failed`,
      );
    } catch (e: unknown) {
      setBulkImport((prev) => ({ ...prev, running: false }));
      toast('Import error', e instanceof Error ? e.message : String(e), true);
    }
  };

  const handleLoadMappointRoutes = async () => {
    setMappointImporting(true);
    importInProgressRef.current = true;
    skipPersistRef.current = true;
    try {
      const csv = await getBundledMappointRoutesCsv2026();
      const routes = parseMappointRoutesCsv(csv, { direction: 'AM' });
      const summary = mappointRoutesSummary(routes);
      if (!routes.length) {
        toast('No routes found', 'MapPoint CSV had no AM routes.', true);
        return;
      }
      const uniqueAddresses = Array.from(new Set(routes.flatMap((r) => r.stops.map((s) => s.address))));
      const cache = geocodeCacheRef.current;
      const geos: (GeocodeResult | null)[] = uniqueAddresses.map((addr) => {
        const bundled = resolveBundledGeocodeResult(addr);
        if (isGeocodePoint(bundled)) {
          cache.set(addr, bundled);
          return bundled;
        }
        return cache.get(addr) ?? null;
      });
      const stillMissing = uniqueAddresses
        .map((addr, i) => ({ addr, i }))
        .filter(({ i }) => !isGeocodePoint(geos[i]));
      if (stillMissing.length > 0) {
        const missResults = await geocodeBatch(
          stillMissing.map((m) => m.addr),
          2,
          cache,
        );
        stillMissing.forEach(({ i }, j) => {
          geos[i] = missResults[j] ?? null;
        });
      }
      const geoByAddress = new Map<string, (typeof geos)[0]>();
      uniqueAddresses.forEach((addr, i) => geoByAddress.set(addr, geos[i] ?? null));
      const geocodedCount = geos.filter(isGeocodePoint).length;
      const nextCore: Record<number, TransportRouteStop[]> = {};
      const nextMeta: TransportRouteMeta[] = [];
      let geocodeFailed = 0;
      for (const route of routes) {
        const stops: TransportRouteStop[] = [];
        for (const stop of route.stops) {
          const geo = geoByAddress.get(stop.address) ?? null;
          if (!isGeocodePoint(geo)) {
            geocodeFailed++;
            continue;
          }
          stops.push({
            name: stop.label,
            address: stop.address,
            lat: geo.lat,
            lng: geo.lng,
            pickupTime: '',
            passengers: stop.camperNames.length,
            camperNames: stop.camperNames,
          });
        }
        if (!stops.length) continue;
        nextCore[route.busNumber] = stops;
        nextMeta.push({
          id: route.busNumber,
          name: `${route.routeName} · Bus ${route.busNumber}`,
          bus: route.busCounselor ? `Bus ${route.busNumber} (${route.busCounselor})` : `Bus ${route.busNumber}`,
          departure: '7:00 AM',
          status: 'Confirmed',
          color: ROUTE_COLORS[(route.busNumber - 1) % ROUTE_COLORS.length],
          capacity: Math.max(22, stops.reduce((n, s) => n + (s.passengers || 0), 0)),
        });
      }
      const importPayload: TransportBoardPayload = {
        coreStops: nextCore,
        routeMeta: nextMeta,
        unplottedCampers: [],
        routesConfigured: true,
        routesSeason: season,
        routesSource: 'mappoint2026',
      };
      const saved = await persistBoard(importPayload);
      if (saved) {
        lastKnownStopCountRef.current = countBoardStops(nextCore);
        loadedScopeRef.current = companyId ? `${companyId}:${season}` : null;
      }
      await finalizeBoardForSeason(importPayload);
      setTodayOverrides(emptyManualOverrides());
      overrideLoadedKeyRef.current = null;
      toast(
        geocodeFailed ? '2026 MapPoint routes applied (partial)' : '2026 MapPoint routes applied',
        geocodeFailed
          ? `${nextMeta.length} buses · ${geocodedCount}/${uniqueAddresses.length} geocoded · ${geocodeFailed} stops skipped`
          : `${nextMeta.length} buses from 2026 · ${summary.camperCount} historical camper assignments`,
        !!(geocodeFailed || !saved),
      );
    } catch (e: unknown) {
      toast('MapPoint import failed', e instanceof Error ? e.message : String(e), true);
    } finally {
      importInProgressRef.current = false;
      skipPersistRef.current = false;
      setMappointImporting(false);
    }
  };

  const handleRegeocodeAll = async () => {
    const stopEntries = Object.entries(coreStops)
      .flatMap(([routeId, stops]) =>
        (stops || []).map((stop, index) => ({ routeId: Number(routeId), index, address: stop.address })),
      )
      .filter((e) => e.address && e.address !== CAMP_LOCATION.address);
    const camperEntries = unplottedCampers.filter((c) => c.address);
    const addresses = Array.from(new Set([...camperEntries.map((c) => c.address), ...stopEntries.map((s) => s.address)]));
    if (addresses.length === 0) {
      toast('Nothing to re-geocode', 'No camper or stop addresses on the board yet.');
      return;
    }
    setRegeocoding(true);
    geocodeCacheRef.current.clear();
    try {
      await AsyncStorage.removeItem(GEOCODE_CACHE_KEY);
    } catch {
      /* ignore */
    }
    try {
      const results = await geocodeBatch(addresses, 6, geocodeCacheRef.current);
      const resolved = new Map<string, { lat: number; lng: number }>();
      let failed = 0;
      addresses.forEach((address, i) => {
        const r = results[i];
        if (isGeocodePoint(r)) resolved.set(address, { lat: r.lat, lng: r.lng });
        else failed++;
      });
      let moved = 0;
      const changed = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
        Math.abs(a.lat - b.lat) > 0.0002 || Math.abs(a.lng - b.lng) > 0.0002;
      setUnplottedCampers((prev) =>
        prev.map((c) => {
          const hit = resolved.get(c.address);
          if (hit && changed(c, hit)) {
            moved++;
            return { ...c, lat: hit.lat, lng: hit.lng };
          }
          return c;
        }),
      );
      setCoreStops((prev) => {
        const next: typeof prev = {};
        Object.entries(prev).forEach(([routeId, stops]) => {
          next[Number(routeId)] = (stops || []).map((stop) => {
            const hit = resolved.get(stop.address);
            if (hit && changed(stop, hit)) {
              moved++;
              return { ...stop, lat: hit.lat, lng: hit.lng };
            }
            return stop;
          });
        });
        return next;
      });
      toast(
        'Re-geocode complete',
        `${moved} pin${moved === 1 ? '' : 's'} repositioned · ${addresses.length - failed} matched${failed ? ` · ${failed} could not be geocoded` : ''}.`,
      );
    } catch (e: unknown) {
      toast('Re-geocode failed', e instanceof Error ? e.message : String(e), true);
    } finally {
      setRegeocoding(false);
    }
  };

  const handleMoveStop = (fromRouteId: number, stopIndex: number, toRouteId: number) => {
    const effective = getEffectiveCore(fromRouteId);
    const coreIndex = displayStopToCoreIndex(stopIndex, timeOfDay === 'am');
    if (coreIndex < 0 || coreIndex >= effective.length) return;
    const stop = effective[coreIndex];
    setScopeDialog({
      open: true,
      title: 'Move stop',
      description: `Move "${stop.name}" to a different route for today only, or permanently (both AM & PM, every day)?`,
      onChoose: (scope) => {
        if (scope === 'today') {
          setTodayOverrides((prev) => {
            const fromAdded = prev.added[fromRouteId] || [];
            const addedIdx = fromAdded.findIndex((s) => s.address === stop.address);
            if (addedIdx >= 0) {
              const newFromAdded = fromAdded.filter((_, i) => i !== addedIdx);
              const newToAdded = [...(prev.added[toRouteId] || []), stop];
              return { ...prev, added: { ...prev.added, [fromRouteId]: newFromAdded, [toRouteId]: newToAdded } };
            }
            return {
              excluded: { ...prev.excluded, [fromRouteId]: [...(prev.excluded[fromRouteId] || []), stop.address] },
              added: { ...prev.added, [toRouteId]: [...(prev.added[toRouteId] || []), stop] },
            };
          });
          toast('Moved for today', `"${stop.name}" moved on today's run only.`);
        } else {
          markRoutesConfigured('manual');
          setCoreStops((prev) => {
            const newFrom = (prev[fromRouteId] || []).filter((s) => s.address !== stop.address);
            const newTo = [...(prev[toRouteId] || []), stop];
            return { ...prev, [fromRouteId]: newFrom, [toRouteId]: newTo };
          });
          setTodayOverrides((prev) => ({
            excluded: {
              ...prev.excluded,
              [fromRouteId]: (prev.excluded[fromRouteId] || []).filter((a) => a !== stop.address),
            },
            added: {
              ...prev.added,
              [fromRouteId]: (prev.added[fromRouteId] || []).filter((s) => s.address !== stop.address),
              [toRouteId]: (prev.added[toRouteId] || []).filter((s) => s.address !== stop.address),
            },
          }));
          toast('Stop moved', 'Moved permanently on both AM and PM runs.');
        }
        setScopeDialog((prev) => ({ ...prev, open: false }));
        setStopAction(null);
      },
    });
  };

  const handleRemoveStop = (routeId: number, stopIndex: number) => {
    const effective = getEffectiveCore(routeId);
    const coreIndex = displayStopToCoreIndex(stopIndex, timeOfDay === 'am');
    if (coreIndex < 0 || coreIndex >= effective.length) return;
    const stop = effective[coreIndex];
    setScopeDialog({
      open: true,
      title: 'Unpin stop',
      description: `Unpin "${stop.name}" from this route for today only, or permanently (both AM & PM, every day)?`,
      onChoose: (scope) => {
        if (scope === 'today') {
          setTodayOverrides((prev) => {
            const added = prev.added[routeId] || [];
            const addedIdx = added.findIndex((s) => s.address === stop.address);
            if (addedIdx >= 0) {
              return { ...prev, added: { ...prev.added, [routeId]: added.filter((_, i) => i !== addedIdx) } };
            }
            return {
              ...prev,
              excluded: { ...prev.excluded, [routeId]: [...(prev.excluded[routeId] || []), stop.address] },
            };
          });
          toast('Unpinned for today', `"${stop.name}" removed from today's run only.`);
        } else {
          markRoutesConfigured('manual');
          setCoreStops((prev) => ({
            ...prev,
            [routeId]: (prev[routeId] || []).filter((s) => s.address !== stop.address),
          }));
          setTodayOverrides((prev) => ({
            excluded: { ...prev.excluded, [routeId]: (prev.excluded[routeId] || []).filter((a) => a !== stop.address) },
            added: { ...prev.added, [routeId]: (prev.added[routeId] || []).filter((s) => s.address !== stop.address) },
          }));
          toast('Stop removed', 'Removed permanently from both AM and PM runs.');
        }
        setScopeDialog((prev) => ({ ...prev, open: false }));
        setStopAction(null);
      },
    });
  };

  const handleOptimizeRoutes = async (targetRouteId?: number) => {
    setOptimizing(true);
    try {
      const targetRoutes =
        targetRouteId !== undefined
          ? routeMeta.filter((r) => r.id === targetRouteId)
          : [...routeMeta].sort((a, b) => {
              const aHasStops = (coreStops[a.id] || []).length > 0 ? 0 : 1;
              const bHasStops = (coreStops[b.id] || []).length > 0 ? 0 : 1;
              return aHasStops - bHasStops || a.id - b.id;
            });
      const proposedCore: Record<number, TransportRouteStop[]> = {};
      targetRoutes.forEach((r) => {
        proposedCore[r.id] = [];
      });
      type JobRef = { kind: 'stop'; stop: TransportRouteStop } | { kind: 'camper'; camper: TransportUnplottedCamper };
      const jobRefs: JobRef[] = [];
      targetRoutes.forEach((r) => {
        (coreStops[r.id] || []).forEach((stop) => jobRefs.push({ kind: 'stop', stop }));
      });
      if (targetRouteId === undefined) {
        unplottedCampers.forEach((camper) => jobRefs.push({ kind: 'camper', camper }));
      }
      const jobs = jobRefs.map((ref, i) => ({
        id: i + 1,
        location:
          ref.kind === 'stop'
            ? ([ref.stop.lng, ref.stop.lat] as [number, number])
            : ([ref.camper.lng, ref.camper.lat] as [number, number]),
        amount: ref.kind === 'stop' ? [Math.max(1, ref.stop.passengers || 1)] : [1],
      }));
      const vehicles = targetRoutes.map((r) => ({
        id: r.id,
        start: [CAMP_LOCATION.lng, CAMP_LOCATION.lat] as [number, number],
        end: [CAMP_LOCATION.lng, CAMP_LOCATION.lat] as [number, number],
        capacity: [r.capacity],
      }));
      let usedORS = false;
      const reassignments: { name: string; from: string; to: string }[] = [];
      if (jobs.length > 0 && vehicles.length > 0) {
        const { data, error } = await supabase.functions.invoke('route-optimizer', {
          body: { action: 'optimize', vehicles, jobs },
        });
        if (!error && data?.routes) {
          usedORS = true;
          for (const orsRoute of data.routes) {
            const vehicleId = orsRoute.vehicle as number;
            const ordered: TransportRouteStop[] = [];
            for (const step of orsRoute.steps || []) {
              if (step.type !== 'job') continue;
              const ref = jobRefs[(step.job as number) - 1];
              if (!ref) continue;
              if (ref.kind === 'stop') ordered.push(ref.stop);
              else {
                const c = ref.camper;
                ordered.push({
                  name: c.name,
                  address: c.address,
                  lat: c.lat,
                  lng: c.lng,
                  pickupTime: 'TBD',
                  passengers: 1,
                  camperNames: [c.name],
                });
                const routeName = routeMeta.find((r) => r.id === vehicleId)?.name || `Route ${vehicleId}`;
                reassignments.push({ name: c.name, from: 'Unplotted', to: routeName });
              }
            }
            proposedCore[vehicleId] = ordered;
          }
          targetRoutes.forEach((r) => {
            if (!proposedCore[r.id]) proposedCore[r.id] = [];
          });
        }
      }
      let remainingUnplotted: TransportUnplottedCamper[] = [];
      if (!usedORS) {
        targetRoutes.forEach((r) => {
          proposedCore[r.id] = [...(coreStops[r.id] || [])];
        });
        if (targetRouteId === undefined) {
          unplottedCampers.forEach((camper) => {
            let bestRouteId = targetRoutes[0]?.id;
            let bestDist = Infinity;
            targetRoutes.forEach((r) => {
              const stops = proposedCore[r.id];
              const refPoints =
                stops.length > 0
                  ? stops.map((s) => ({ lat: s.lat, lng: s.lng }))
                  : [{ lat: CAMP_LOCATION.lat, lng: CAMP_LOCATION.lng }];
              const minD = Math.min(...refPoints.map((p) => Math.hypot(camper.lat - p.lat, camper.lng - p.lng)));
              if (minD < bestDist) {
                bestDist = minD;
                bestRouteId = r.id;
              }
            });
            if (bestRouteId !== undefined) {
              proposedCore[bestRouteId].push({
                name: camper.name,
                address: camper.address,
                lat: camper.lat,
                lng: camper.lng,
                pickupTime: 'TBD',
                passengers: 1,
                camperNames: [camper.name],
              });
              const routeName = routeMeta.find((r) => r.id === bestRouteId)?.name || `Route ${bestRouteId}`;
              reassignments.push({ name: camper.name, from: 'Unplotted', to: routeName });
            } else {
              remainingUnplotted.push(camper);
            }
          });
        }
        targetRoutes.forEach((r) => {
          proposedCore[r.id] = nearestNeighborOrder(proposedCore[r.id]);
        });
      }
      let beforeMiles = 0;
      let afterMiles = 0;
      let reorderedRoutes = 0;
      const perRoute: OptimizePreviewState['perRoute'] = [];
      targetRoutes.forEach((r) => {
        const before = coreStops[r.id] || [];
        const beforeMi = routeMiles(before);
        const afterMi = routeMiles(proposedCore[r.id]);
        beforeMiles += beforeMi;
        afterMiles += afterMi;
        const beforeAddrs = new Set(before.map((s) => s.address));
        const afterAddresses = proposedCore[r.id].map((s) => s.address);
        const afterSeq = afterAddresses.filter((address) => beforeAddrs.has(address)).join('|');
        const beforeSeq = before.map((s) => s.address).join('|');
        const beforeSet = new Set(before.map((s) => s.address));
        const removedOrMoved = before.some((s) => !afterAddresses.includes(s.address));
        const reordered = (beforeSeq !== afterSeq && before.length > 1) || removedOrMoved;
        if (reordered) reorderedRoutes++;
        const addedCampers = proposedCore[r.id]
          .filter((s) => !beforeSet.has(s.address))
          .flatMap((s) => s.camperNames || [s.name]);
        perRoute.push({
          id: r.id,
          name: r.name,
          bus: r.bus,
          beforeMi,
          afterMi,
          changed: reordered || addedCampers.length > 0,
          addedCampers,
        });
      });
      setOptimizePreview({
        open: true,
        proposedCore,
        proposedUnplotted: remainingUnplotted,
        beforeMiles,
        afterMiles,
        reassignments,
        reorderedRoutes,
        perRoute,
        selectedRouteIds: perRoute.filter((p) => p.changed).map((p) => p.id),
      });
      if (!usedORS && unplottedCampers.length > 0) {
        toast('Used local optimizer', "Couldn't reach OpenRouteService — fell back to haversine optimization.");
      }
    } catch (e: unknown) {
      toast('Optimization failed', e instanceof Error ? e.message : String(e), true);
    } finally {
      setOptimizing(false);
    }
  };

  const applyOptimization = () => {
    const selected = new Set(optimizePreview.selectedRouteIds);
    if (selected.size === 0) {
      toast('No routes selected', 'Pick at least one route to apply.', true);
      return;
    }
    const nextCore: Record<number, TransportRouteStop[]> = { ...coreStops };
    let savedMi = 0;
    let appliedReassignments = 0;
    optimizePreview.perRoute.forEach((p) => {
      if (!selected.has(p.id)) return;
      const proposed = optimizePreview.proposedCore[p.id];
      if (proposed && proposed.length > 0) nextCore[p.id] = proposed;
      savedMi += Math.max(0, p.beforeMi - p.afterMi);
      appliedReassignments += p.addedCampers.length;
    });
    const reassignedNames = new Set<string>();
    optimizePreview.perRoute.forEach((p) => {
      if (selected.has(p.id)) p.addedCampers.forEach((n) => reassignedNames.add(n));
    });
    const nextUnplotted = unplottedCampers.filter((c) => !reassignedNames.has(c.name));
    markRoutesConfigured('manual');
    setCoreStops(nextCore);
    setUnplottedCampers(nextUnplotted);
    setTodayOverrides((prev) => {
      const excluded = { ...prev.excluded };
      const added = { ...prev.added };
      selected.forEach((id) => {
        delete excluded[id];
        delete added[id];
      });
      return { excluded, added };
    });
    setOptimizePreview((prev) => ({ ...prev, open: false }));
    toast(
      `Optimized ${selected.size} route${selected.size === 1 ? '' : 's'}`,
      `Saved ${savedMi.toFixed(1)} mi/run · ${appliedReassignments} camper${appliedReassignments === 1 ? '' : 's'} assigned.`,
    );
  };

  const handleClearAllCampers = () => {
    Alert.alert(
      'Remove all campers?',
      'This will remove every camper from the transport board — both unplotted campers and all stops assigned to routes. Routes themselves will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove all',
          style: 'destructive',
          onPress: () => {
            const totalUnplotted = unplottedCampers.length;
            const totalStops = Object.values(coreStops).reduce((sum, s) => sum + (s?.length || 0), 0);
            setUnplottedCampers([]);
            setCoreStops({});
            setTodayOverrides(emptyManualOverrides());
            overrideLoadedKeyRef.current = null;
            toast('All campers removed', `Cleared ${totalUnplotted} unplotted and ${totalStops} routed campers.`);
          },
        },
      ],
    );
  };

  const handleSaveEditRoute = () => {
    if (!editRoute) return;
    if (!editRoute.name.trim() || !editRoute.bus.trim()) {
      toast('Missing info', 'Route name and bus are required.', true);
      return;
    }
    if (!editRoute.capacity || editRoute.capacity < 1) {
      toast('Invalid capacity', 'Max capacity must be at least 1.', true);
      return;
    }
    setRouteMeta((prev) =>
      prev.map((r) =>
        r.id === editRoute.id
          ? {
              ...r,
              name: editRoute.name.trim(),
              bus: editRoute.bus.trim(),
              departure: editRoute.departure.trim() || 'TBD',
              status: editRoute.status,
              color: editRoute.color,
              capacity: editRoute.capacity,
            }
          : r,
      ),
    );
    setEditRoute(null);
    toast('Route updated', 'Changes applied to AM & PM runs.');
  };

  const handleDeleteEditRoute = () => {
    if (!editRoute) return;
    if (routeMeta.length <= 1) {
      toast("Can't delete", 'At least one route must remain.', true);
      return;
    }
    const name = editRoute.name;
    setRouteMeta((prev) => prev.filter((r) => r.id !== editRoute.id));
    setCoreStops((prev) => {
      const next = { ...prev };
      delete next[editRoute.id];
      return next;
    });
    setVisibleRoutes((prev) => prev.filter((id) => id !== editRoute.id));
    setTodayOverrides((prev) => {
      const excluded = { ...prev.excluded };
      delete excluded[editRoute.id];
      const added = { ...prev.added };
      delete added[editRoute.id];
      return { excluded, added };
    });
    setEditRoute(null);
    toast('Route deleted', `"${name}" has been removed.`);
  };

  const handleGenerateReport = async (reportName: string) => {
    if (reportName === 'Transport Exceptions') {
      if (!companyId) {
        toast('Company not loaded', undefined, true);
        return;
      }
      const exceptions = await fetchTransportExceptionsForReport(supabase, companyId, overrideDate);
      const rows = buildTransportExceptionsReportRows({
        overrideDate,
        exceptions,
        manual: todayOverrides,
        routeMeta: routeMeta.map((r) => ({ id: r.id, name: r.name, bus: r.bus })),
        coreStops,
      });
      const filename = `daycamp-transport-exceptions-${overrideDate}.csv`;
      await shareCsv(rows, filename);
      return;
    }
    if (reportName === 'Attendance') {
      try {
        const sheetRoutes = routes
          .map((r) => ({
            bus: r.bus,
            routeName: r.name,
            campers: campersOnRoute(r.id, getEffectiveCore(r.id)).map((c) => ({
              name: c.name,
              detail: c.stopName,
            })),
          }))
          .filter((r) => r.campers.length > 0);
        const groups = groupRosterByGroup.map(([groupName, campers]) => ({
          groupName,
          campers: campers.map((c) => ({ name: c.name, detail: groupName })),
        }));
        const weekRow =
          enrollmentWeekForReport != null
            ? getEnrollmentWeekRow(enrollmentWeekCalendar, enrollmentWeekForReport)
            : null;
        installTextCodecPolyfill();
        const { buildCombinedAttendanceBubbleSheetPdf } = await import('../lib/transportBubbleSheetPdf');
        const built = await buildCombinedAttendanceBubbleSheetPdf({
          companyName,
          date: overrideDate,
          runPeriod: timeOfDay,
          enrollmentWeek: enrollmentWeekForReport ?? undefined,
          weekDateRange: weekRow ? formatEnrollmentWeekRange(weekRow) : undefined,
          busRoutes: sheetRoutes,
          groups,
        });
        if (!built) {
          toast('No campers to print', undefined, true);
        } else {
          await shareTransportPdf(built);
        }
      } catch (err) {
        console.error('[Transport] Attendance PDF failed', err);
        toast('PDF failed', 'Could not generate attendance bubble sheet.', true);
      }
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const safeName = reportName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `daycamp-${safeName}-${today}.csv`;
    let reportBusAttendance: BusAttendanceMap = {};
    if (reportName === 'Attendance' && companyId) {
      const loaded = await loadBusAttendance(supabase, companyId, season, overrideDate, timeOfDay);
      reportBusAttendance = loaded.records;
    }
    let rows: (string | number)[][] = [];
    switch (reportName) {
      case 'Bus Report':
        rows.push(['Bus', 'Route', 'Direction', 'Departure', 'Total Stops', 'Total Campers', 'Status']);
        routes.forEach((r) => {
          rows.push([r.bus, r.name, r.direction, r.departure, (coreStops[r.id] || []).length, r.campers, r.status]);
        });
        break;
      case 'Bus Route Summary':
        rows.push(['Route', 'Bus', 'Stop #', 'Stop Name', 'Address', 'Time', 'Passengers']);
        routes.forEach((r) => {
          r.stops.forEach((s, i) => {
            rows.push([r.name, r.bus, i + 1, s.name, s.address, s.pickupTime, s.passengers]);
          });
        });
        break;
      case 'Car Report':
        rows.push(['Camper Name', 'Address', 'Age', 'Session', 'Notes']);
        unplottedCampers.forEach((c) => {
          rows.push([c.name, c.address, c.age, c.session, 'Private car / unassigned']);
        });
        if (rows.length === 1) rows.push(['(No private car / unassigned campers today)', '', '', '', '']);
        break;
      case 'Daily Passenger Update':
        rows.push(['Date', 'Route', 'Bus', 'Direction', 'Passengers', 'Capacity Used']);
        routes.forEach((r) => {
          rows.push([today, r.name, r.bus, r.direction, r.campers, `${Math.round((r.campers / r.capacity) * 100)}%`]);
        });
        break;
      case 'Extended Care':
        rows.push(['Camper Name', 'Route', 'Care Type', 'Time', 'Notes']);
        routes.forEach((r) => {
          r.stops.forEach((s) => {
            if (s.address === CAMP_LOCATION.address) return;
            (s.camperNames || [s.name]).forEach((name) => {
              rows.push([name, r.name, 'After-care', s.pickupTime, '']);
            });
          });
        });
        break;
      default:
        rows.push(['Report', reportName]);
        rows.push(['Generated', today]);
    }
    await shareCsv(rows, filename);
  };

  const openBulkImport = () => {
    setBulkImport((prev) => ({
      ...prev,
      open: true,
      log: { ok: 0, skipped: 0, failed: 0, messages: [], providerCounts: {} },
      progress: { done: 0, total: 0 },
      failedRows: [],
    }));
  };

  const pickBulkCsv = async () => {
    const picked = await pickAndReadCsvText();
    if (!picked.ok) {
      if (picked.error !== 'canceled') toast('Import error', picked.message, true);
      return;
    }
    await handleBulkImportFile(picked.text);
  };

  const pickUnplottedCsv = async () => {
    const picked = await pickAndReadCsvText();
    if (!picked.ok) {
      if (picked.error !== 'canceled') toast('Import error', picked.message, true);
      return;
    }
    await handleCSVImport(picked.text);
  };

  return {
    season,
    boardLoading,
    mappointImporting,
    regeocoding,
    optimizing,
    overridesLoading,
    timeOfDay,
    setTimeOfDay,
    overrideDate,
    setOverrideDate: (d: string) => {
      overrideLoadedKeyRef.current = null;
      setOverrideDate(d || todayDateString());
    },
    transportExceptions,
    todayOverrides,
    routes,
    displayedRoutes,
    allRoutes: routes,
    routeMeta,
    coreStops,
    unplottedCampers,
    visibleRoutes,
    totalCampers,
    addRouteOpen,
    setAddRouteOpen,
    addCamperOpen,
    setAddCamperOpen,
    newRoute,
    setNewRoute,
    newUnplotted,
    setNewUnplotted,
    editRoute,
    setEditRoute,
    scopeDialog,
    setScopeDialog,
    optimizePreview,
    setOptimizePreview,
    bulkImport,
    setBulkImport,
    stopAction,
    setStopAction,
    assignCamperId,
    setAssignCamperId,
    hideAllRoutes,
    showAllRoutes,
    selectRouteOnMap,
    handleAddRoute,
    handleAssignCamperToRoute,
    handleAddUnplottedCamper,
    handleRemoveUnplotted,
    handleLoadMappointRoutes,
    handleRegeocodeAll,
    handleMoveStop,
    handleRemoveStop,
    handleOptimizeRoutes,
    applyOptimization,
    handleClearAllCampers,
    handleSaveEditRoute,
    handleDeleteEditRoute,
    handleGenerateReport,
    openBulkImport,
    pickBulkCsv,
    pickUnplottedCsv,
    getEffectiveCore,
  };
}
