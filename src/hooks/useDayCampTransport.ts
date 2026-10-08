import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Alert, Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { campDateStringInSeason } from '../lib/campSeasonDate';
import { DEFAULT_SEASON } from '../constants/seasonConstants';
import { parseCSV, pickFirst } from '../lib/sunshineCsv';
import { pickAndReadCsvText } from '../lib/pickCsvDocument';
import {
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
  type TransportException,
} from '../lib/transportDailyOverrides';
import {
  attendanceRecordKey,
  attendanceStatusLabel,
  campersOnRoute,
  buildDigitalBusAttendanceCsvRows,
  loadBusAttendance,
  type DigitalBusAttendanceRider,
} from '../lib/transportBusAttendance';
import { loadGroupRoster, type GroupRosterCamper } from '../lib/transportGroupAttendance';
import {
  camperEnrolledInWeek,
  defaultEnrollmentWeekForDate,
  attendanceEnrollmentWeek,
  enrollmentWeekForDate,
  enrollmentWeekDayColumns,
  formatEnrollmentWeekLabel,
  formatEnrollmentWeekRange,
  getEnrollmentWeekRow,
  loadEnrollmentWeekCalendar,
  type EnrollmentWeekCalendar,
} from '../lib/enrollmentWeekCalendar';
import { buildBusBubbleSheetRoutes } from '../lib/transportCamperBusRun';
import {
  applyEnrollmentWeekToRoutes,
  buildCamperEnrollmentLookup,
  camperEnrolledInWeekByLookup,
  filterUnplottedForWeek,
} from '../lib/transportWeekView';
import {
  DEFAULT_TRANSPORT_BOARD_SETTINGS,
  effectiveStopDwellMinutes,
  normalizeTransportBoardSettings,
  type TransportBoardSettings,
} from '../lib/transportBoardSettings';
import { consolidateRouteStopsByAddress, sanitizeRouteStops } from '../lib/transportRouteStops';
import { reorderRouteForOptimize } from '../lib/transportRouteOptimize';
import {
  type CamperBusRunMode,
  type CamperBusRunSchedules,
  CAMPER_BUS_RUN_MODE_LABELS,
  CAMPER_BUS_RUN_MODE_OPTIONS,
  getCamperBusRunMode,
  normCamperBusRunKey,
} from '../lib/transportCamperBusRun';
import {
  type ParentTransportCamper,
  type ParentTransportWeekday,
  isParentTransportBusAssigned,
  countParentTransportOnRoute,
  formatParentTransportSchedule,
  parentTransportBusLabel,
  parentTransportRidersForRoute,
  stableParentTransportId,
  PARENT_TRANSPORT_NO_BUS_LABEL,
} from '../lib/transportParentTransport';
import {
  loadConfirmedBoardSnapshot,
  persistConfirmedBoardSnapshot,
} from '../lib/transportConfirmedBoardSnapshot';
import {
  buildCarSeatCountByBusCsvRows,
  loadCamperCarSeatLookup,
  summarizeCarSeatsByBus,
} from '../lib/transportCarSeatReport';
import { installTextCodecPolyfill } from '../lib/textCodecPolyfill';
import {
  build2026MappointRouteTemplate,
  loadStopsOnlyTemplateFromSeason,
  normalizeTransportBoardForSeason,
  prepareBoardForPersist,
  type TransportBoardPayload,
  type TransportRouteMeta,
  type TransportRouteStop,
  type TransportRoutesSource,
  type TransportUnplottedCamper,
} from '../lib/transportRoster';
import { campminderIntegrationEnabled, isNestSandboxCompany } from '../constants/camps';
import { SANDBOX_TRANSPORT_BOARD_SEASON } from '../lib/nestSandboxTransport';
import {
  buildApprovedChangeSheetRows,
  changeSheetRowsToCsv,
} from '../lib/transportChangeSheets';
import {
  applyHistoricalAssignments,
  getReferenceDatasetStatus,
  loadCamperPriorMap,
  pickHistoricalBusForCamper,
  reorderStopsByHistoricalPriors,
  syncTransportBoardToRoutingWarehouse,
  type ReferenceDatasetStatus,
} from '../lib/historicalRouteLearning';
import type { CamperRoutingPrior } from '../lib/routeReferenceWarehouse';
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
  { name: 'Master Change Sheet', desc: 'Approved pickup/absence/swim changes by bus for this date & run' },
  {
    name: 'Bus Bubble Sheet',
    desc: 'Per bus: AM & PM bubbles per camper. X = not on that run (mini day, PM-only, or exception)',
  },
  { name: 'Group Bubble Sheet', desc: 'Group attendance bubbles Mon–Fri for enrolled campers' },
  { name: 'Digital Attendance Log', desc: 'Export Present/Absent saved in Bus Attendance for this date & run' },
  { name: 'Bus Report', desc: 'Day camp bus assignments' },
  { name: 'Bus Route Summary', desc: 'Route overview with stops' },
  { name: 'Car Seat Count by Bus', desc: 'Nursery & Pre-K riders per bus (car seats required)' },
  { name: 'Car Report', desc: 'All parent transport (PT) campers — with or without a bus assignment' },
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
  const { companyId, companySlug, season, availableCompanies } = useCompany();
  const companyName = availableCompanies.find((c) => c.id === companyId)?.name ?? 'Day Camp';
  const sandboxTransport = isNestSandboxCompany(companySlug);
  const campminderEnabled = campminderIntegrationEnabled({ slug: companySlug, camp_type: 'day_camp' });

  const [coreStops, setCoreStops] = useState<Record<number, TransportRouteStop[]>>(
    () => (season === '2026' ? initialCoreStops : {}),
  );
  const [routeMeta, setRouteMeta] = useState<TransportRouteMeta[]>(
    () => (season === '2026' ? initialRouteMeta : []),
  );
  const [unplottedCampers, setUnplottedCampers] = useState<TransportUnplottedCamper[]>([]);
  const [parentTransportCampers, setParentTransportCampers] = useState<ParentTransportCamper[]>([]);
  const [camperBusRunSchedules, setCamperBusRunSchedules] = useState<CamperBusRunSchedules>({});
  const [boardSettings, setBoardSettings] = useState<TransportBoardSettings>(DEFAULT_TRANSPORT_BOARD_SETTINGS);
  const [routesDraftMode, setRoutesDraftMode] = useState(false);
  const [routesConfirmed, setRoutesConfirmed] = useState(false);
  const [routesConfigured, setRoutesConfigured] = useState(false);
  const [routesSource, setRoutesSource] = useState<TransportRoutesSource | undefined>();
  const [visibleRoutes, setVisibleRoutes] = useState<number[]>(
    () => (season === '2026' ? initialRouteMeta.map((r) => r.id) : []),
  );
  const [timeOfDay, setTimeOfDay] = useState<'am' | 'pm'>('am');
  const [overrideDate, setOverrideDate] = useState(() =>
    campDateStringInSeason(season || DEFAULT_SEASON),
  );

  useEffect(() => {
    setOverrideDate(campDateStringInSeason(season || DEFAULT_SEASON));
  }, [season]);
  const [todayOverrides, setTodayOverrides] = useState(emptyManualOverrides());
  const [transportExceptions, setTransportExceptions] = useState<TransportException[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(true);
  const [groupRoster, setGroupRoster] = useState<GroupRosterCamper[]>([]);
  const [enrollmentWeekCalendar, setEnrollmentWeekCalendar] = useState<EnrollmentWeekCalendar>([]);
  const [routeEnrollmentWeek, setRouteEnrollmentWeek] = useState<number | 'all'>('all');
  const [attendanceWeekOverride, setAttendanceWeekOverride] = useState<number | null>(null);
  const routeWeekInitRef = useRef(false);
  const [boardLoading, setBoardLoading] = useState(true);
  const [persistLoaded, setPersistLoaded] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [applyingHistorical, setApplyingHistorical] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [referenceStatus, setReferenceStatus] = useState<ReferenceDatasetStatus | null>(null);
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
  const refreshReferenceStatusRef = useRef<(() => Promise<void>) | null>(null);
  const groupLoadedKeyRef = useRef<string | null>(null);
  const geocodeCacheRef = useRef(new TransportGeocodeCache());
  const priorMapRef = useRef<Map<string, CamperRoutingPrior> | null>(null);
  const boardStateRef = useRef({
    coreStops: {} as Record<number, TransportRouteStop[]>,
    routeMeta: [] as TransportRouteMeta[],
    unplottedCampers: [] as TransportUnplottedCamper[],
    parentTransportCampers: [] as ParentTransportCamper[],
    camperBusRunSchedules: {} as CamperBusRunSchedules,
    boardSettings: DEFAULT_TRANSPORT_BOARD_SETTINGS as TransportBoardSettings,
    routesDraftMode: false,
    routesConfirmed: false,
    routesConfigured: false,
    routesSource: undefined as TransportRoutesSource | undefined,
  });

  boardStateRef.current = {
    coreStops,
    routeMeta,
    unplottedCampers,
    parentTransportCampers,
    camperBusRunSchedules,
    boardSettings,
    routesDraftMode,
    routesConfirmed,
    routesConfigured,
    routesSource,
  };

  useEffect(() => {
    void geocodeCacheRef.current.init();
  }, []);

  const refreshReferenceStatus = useCallback(async () => {
    if (!companyId || !season) return;
    const status = await getReferenceDatasetStatus(supabase, companyId, season);
    setReferenceStatus(status);
    priorMapRef.current = await loadCamperPriorMap(supabase, companyId, season);
  }, [companyId, season]);

  useEffect(() => {
    refreshReferenceStatusRef.current = refreshReferenceStatus;
    void refreshReferenceStatus();
  }, [refreshReferenceStatus]);

  const excludedCampers = useMemo(
    () => excludedCamperSet(transportExceptions, timeOfDay),
    [transportExceptions, timeOfDay],
  );

  const buildBoardPayload = useCallback(
    (overrides: Partial<TransportBoardPayload> = {}): TransportBoardPayload => ({
      coreStops,
      routeMeta,
      unplottedCampers,
      parentTransportCampers,
      camperBusRunSchedules,
      settings: boardSettings,
      routesConfigured,
      routesSeason: routesConfigured ? season : undefined,
      routesSource,
      routesDraftMode,
      routesConfirmed,
      ...overrides,
    }),
    [
      coreStops,
      routeMeta,
      unplottedCampers,
      parentTransportCampers,
      camperBusRunSchedules,
      boardSettings,
      routesConfigured,
      routesSource,
      routesDraftMode,
      routesConfirmed,
      season,
    ],
  );

  const markRoutesConfigured = useCallback((source: TransportRoutesSource = 'manual') => {
    setRoutesConfigured(true);
    setRoutesSource(source);
  }, []);

  const persistBoard = useCallback(
    async (payload: TransportBoardPayload) => {
      if (!companyId || !season) return false;
      const ref = boardStateRef.current;
      const complete: TransportBoardPayload = {
        ...payload,
        parentTransportCampers: payload.parentTransportCampers ?? ref.parentTransportCampers,
        camperBusRunSchedules: payload.camperBusRunSchedules ?? ref.camperBusRunSchedules,
        settings: payload.settings ?? ref.boardSettings,
        routesDraftMode: payload.routesDraftMode ?? ref.routesDraftMode,
        routesConfirmed: payload.routesConfirmed ?? ref.routesConfirmed,
      };
      const marked = prepareBoardForPersist(complete, season);
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

        if (
          marked.routesConfigured &&
          marked.routeMeta.length > 0 &&
          countBoardStops(marked.coreStops) > 0
        ) {
          try {
            await syncTransportBoardToRoutingWarehouse(supabase, companyId, {
              referenceSeason: season,
              coreStops: marked.coreStops,
              routeMeta: marked.routeMeta,
              userId: userRes.user?.id,
              excludeAddress: CAMP_LOCATION.address,
            });
          } catch (learnErr) {
            console.warn('[Transport] Routing learn sync failed:', learnErr);
          }
          void refreshReferenceStatusRef.current?.();
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
      setParentTransportCampers(
        Array.isArray(payload.parentTransportCampers) ? payload.parentTransportCampers : [],
      );
      setCamperBusRunSchedules(
        payload.camperBusRunSchedules && typeof payload.camperBusRunSchedules === 'object'
          ? payload.camperBusRunSchedules
          : {},
      );
      setBoardSettings(normalizeTransportBoardSettings(payload.settings));
      setRoutesDraftMode(payload.routesDraftMode === true);
      setRoutesConfirmed(payload.routesConfirmed === true);
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
      setParentTransportCampers([]);
      setCamperBusRunSchedules({});
      setBoardSettings(DEFAULT_TRANSPORT_BOARD_SETTINGS);
      setRoutesDraftMode(false);
      setRoutesConfirmed(false);
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
              parentTransportCampers: Array.isArray(saved.parentTransportCampers)
                ? saved.parentTransportCampers
                : [],
              camperBusRunSchedules:
                saved.camperBusRunSchedules && typeof saved.camperBusRunSchedules === 'object'
                  ? saved.camperBusRunSchedules
                  : {},
              settings: normalizeTransportBoardSettings(saved.settings),
              routesConfigured: saved.routesConfigured,
              routesSeason: saved.routesSeason,
              routesSource: saved.routesSource,
              routesDraftMode: saved.routesDraftMode === true,
              routesConfirmed: saved.routesConfirmed === true,
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
    routeWeekInitRef.current = false;
    setRouteEnrollmentWeek('all');
  }, [companyId, season]);

  useEffect(() => {
    if (routeWeekInitRef.current || enrollmentWeekCalendar.length === 0) return;
    const w = enrollmentWeekForDate(enrollmentWeekCalendar, overrideDate);
    if (w != null) setRouteEnrollmentWeek(w);
    routeWeekInitRef.current = true;
  }, [enrollmentWeekCalendar, overrideDate]);

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
    parentTransportCampers,
    camperBusRunSchedules,
    boardSettings,
    routesConfigured,
    routesSource,
    routesDraftMode,
    routesConfirmed,
    persistLoaded,
    companyId,
    season,
    persistBoard,
    buildBoardPayload,
  ]);

  useEffect(() => {
    return () => {
      if (skipPersistRef.current || importInProgressRef.current || !companyId) return;
      const ref = boardStateRef.current;
      if (countBoardStops(ref.coreStops) === 0 && ref.unplottedCampers.length === 0 && !ref.routesConfigured) {
        return;
      }
      void persistBoard({
        coreStops: ref.coreStops,
        routeMeta: ref.routeMeta,
        unplottedCampers: ref.unplottedCampers,
        parentTransportCampers: ref.parentTransportCampers,
        camperBusRunSchedules: ref.camperBusRunSchedules,
        settings: ref.boardSettings,
        routesConfigured: ref.routesConfigured,
        routesSeason: ref.routesConfigured ? season : undefined,
        routesSource: ref.routesSource,
        routesDraftMode: ref.routesDraftMode,
        routesConfirmed: ref.routesConfirmed,
      });
    };
  }, [companyId, season, persistBoard]);

  const getEffectiveCore = useCallback(
    (routeId: number): TransportRouteStop[] =>
      applyRouteOverrides(coreStops[routeId] || [], routeId, todayOverrides, excludedCampers),
    [coreStops, todayOverrides, excludedCampers],
  );

  const stopDwellMinutes = effectiveStopDwellMinutes(boardSettings);

  const pinnedKeysForRoute = useCallback(
    (routeId: number) => boardSettings.pinnedStopsByRoute?.[routeId] ?? [],
    [boardSettings.pinnedStopsByRoute],
  );

  const isStopPinnedForOptimize = useCallback(
    (routeId: number, address: string) => {
      const key = normalizeAddress(address);
      return pinnedKeysForRoute(routeId).some((p) => normalizeAddress(p) === key);
    },
    [pinnedKeysForRoute],
  );

  const toggleStopPinForOptimize = useCallback((routeId: number, address: string) => {
    const key = normalizeAddress(address);
    if (!key) return;
    setBoardSettings((prev) => {
      const byRoute = { ...(prev.pinnedStopsByRoute ?? {}) };
      const list = [...(byRoute[routeId] ?? [])];
      const idx = list.findIndex((p) => normalizeAddress(p) === key);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(key);
      if (list.length === 0) delete byRoute[routeId];
      else byRoute[routeId] = list;
      return normalizeTransportBoardSettings({
        ...prev,
        pinnedStopsByRoute: Object.keys(byRoute).length > 0 ? byRoute : undefined,
      });
    });
    markRoutesConfigured('manual');
  }, [markRoutesConfigured]);

  const buildRoutes = useCallback(
    (tod: 'am' | 'pm'): TransportDisplayRoute[] =>
      routeMeta.map((meta) => {
        const core = getEffectiveCore(meta.id);
        const timeOpts = { dwellMinutesPerStop: stopDwellMinutes };
        const stops =
          tod === 'am'
            ? buildAMStops(core, meta.departure, timeOpts)
            : buildPMStops(core, meta.departure, timeOpts);
        const campers = core.reduce((sum, s) => sum + s.passengers, 0);
        return {
          ...meta,
          stops,
          campers,
          direction: tod === 'am' ? 'Inbound' : 'Outbound',
        };
      }),
    [getEffectiveCore, routeMeta, stopDwellMinutes],
  );

  const routes = buildRoutes(timeOfDay);

  const camperEnrollmentLookup = useMemo(
    () => buildCamperEnrollmentLookup(groupRoster),
    [groupRoster],
  );

  const activeRouteEnrollmentWeek =
    routeEnrollmentWeek === 'all' ? null : routeEnrollmentWeek;

  const displayRoutes = useMemo(
    () => applyEnrollmentWeekToRoutes(routes, activeRouteEnrollmentWeek, camperEnrollmentLookup),
    [routes, activeRouteEnrollmentWeek, camperEnrollmentLookup],
  );

  const displayedRoutes = displayRoutes.filter((r) => visibleRoutes.includes(r.id));

  const unplottedForWeek = useMemo(
    () => filterUnplottedForWeek(unplottedCampers, activeRouteEnrollmentWeek, camperEnrollmentLookup),
    [unplottedCampers, activeRouteEnrollmentWeek, camperEnrollmentLookup],
  );

  const parentTransportForWeek = useMemo(() => {
    if (activeRouteEnrollmentWeek == null) return parentTransportCampers;
    return parentTransportCampers.filter((c) =>
      camperEnrolledInWeekByLookup(camperEnrollmentLookup, c.name, activeRouteEnrollmentWeek),
    );
  }, [parentTransportCampers, activeRouteEnrollmentWeek, camperEnrollmentLookup]);

  const parentTransportNoBusForWeek = useMemo(
    () => parentTransportForWeek.filter((c) => !isParentTransportBusAssigned(c)),
    [parentTransportForWeek],
  );

  const draftModeAvailable = season !== '2026' && routesConfigured;

  const enterRoutesDraftMode = useCallback(async () => {
    if (!companyId || !season) return;
    if (routesDraftMode) {
      toast('Already in draft mode', 'Confirm or discard when you are done testing.');
      return;
    }
    if (!routesConfigured) {
      toast('Add routes first', 'Apply a route template or add buses before entering draft mode.', true);
      return;
    }
    const baseline = buildBoardPayload({ routesDraftMode: false, routesConfirmed });
    await persistConfirmedBoardSnapshot(companyId, season, baseline);
    const payload = buildBoardPayload({ routesDraftMode: true, routesConfirmed: false });
    setRoutesDraftMode(true);
    setRoutesConfirmed(false);
    await persistBoard(payload);
    toast('Draft mode ON', 'Test edits are safe until you confirm or discard.');
  }, [
    companyId,
    season,
    routesDraftMode,
    routesConfigured,
    routesConfirmed,
    buildBoardPayload,
    persistBoard,
  ]);

  const discardRoutesDraft = useCallback(async () => {
    if (!companyId || !season) return;
    const snapshot = await loadConfirmedBoardSnapshot(companyId, season);
    if (!snapshot) {
      toast('Nothing to restore', 'No pre-draft snapshot found.', true);
      return;
    }
    const restored: TransportBoardPayload = {
      ...snapshot,
      routesDraftMode: false,
      routesConfirmed: snapshot.routesConfirmed === true,
    };
    applyBoardPayload(restored);
    await persistBoard(restored);
    toast('Draft mode OFF', 'Restored routes from before draft mode.');
  }, [companyId, season, applyBoardPayload, persistBoard]);

  const busRunScheduleEntries = useMemo(() => {
    const seen = new Set<string>();
    const rows: { name: string; bus: string; stopName: string }[] = [];
    for (const route of routeMeta) {
      for (const camper of campersOnRoute(route.id, coreStops[route.id] || [])) {
        const key = normCamperBusRunKey(camper.name);
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({ name: camper.name, bus: route.bus, stopName: camper.stopName });
      }
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [routeMeta, coreStops]);

  const setCamperBusRunMode = useCallback((name: string, mode: CamperBusRunMode) => {
    const key = normCamperBusRunKey(name);
    setCamperBusRunSchedules((prev) => {
      if (mode === 'both') {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: mode };
    });
  }, []);

  const handleReorderStop = useCallback(
    (routeId: number, fromDisplayIdx: number, toDisplayIdx: number) => {
      if (fromDisplayIdx === toDisplayIdx) return;
      const effective = getEffectiveCore(routeId);
      if (!effective.length) return;
      const isAM = timeOfDay === 'am';
      const fromCore = displayStopToCoreIndex(fromDisplayIdx, isAM);
      const toCore = displayStopToCoreIndex(toDisplayIdx, isAM);
      if (fromCore < 0 || fromCore >= effective.length || toCore < 0 || toCore >= effective.length) return;

      const next = [...effective];
      const [moved] = next.splice(fromCore, 1);
      next.splice(toCore, 0, moved);

      markRoutesConfigured('manual');
      setCoreStops((prev) => ({ ...prev, [routeId]: next }));
      setTodayOverrides((prev) => ({
        excluded: { ...prev.excluded, [routeId]: [] },
        added: { ...prev.added, [routeId]: [] },
      }));
      toast(
        'Stop reordered',
        `Moved "${moved.camperNames?.join(', ') || moved.name}" on this route.`,
      );
    },
    [getEffectiveCore, timeOfDay, markRoutesConfigured],
  );

  const handleRemoveParentTransport = useCallback(
    (id: number) => {
      setParentTransportCampers((prev) => prev.filter((c) => c.id !== id));
      markRoutesConfigured('manual');
    },
    [markRoutesConfigured],
  );

  const handleAddParentTransport = useCallback(
    (input: {
      childId: string;
      routeId: number | null;
      am: boolean;
      pm: boolean;
      weekdays: ParentTransportWeekday[];
      notes: string;
    }) => {
      const child = groupRoster.find((c) => c.id === input.childId);
      if (!child) {
        toast('Pick a camper', undefined, true);
        return false;
      }
      if (input.routeId != null && !routeMeta.some((r) => r.id === input.routeId)) {
        toast('Invalid bus', 'Choose a bus from the list or PT only.', true);
        return false;
      }
      if (!input.am && !input.pm) {
        toast('Pick AM and/or PM', undefined, true);
        return false;
      }
      if (
        parentTransportCampers.some(
          (c) => c.name.trim().toLowerCase() === child.name.trim().toLowerCase(),
        )
      ) {
        toast('Already on Parent Transport', `${child.name} is already listed.`, true);
        return false;
      }

      const id = stableParentTransportId(
        child.id,
        Math.max(500, ...parentTransportCampers.map((c) => c.id), 0) + 1,
      );
      setParentTransportCampers((prev) => [
        ...prev,
        {
          id,
          childId: child.id,
          name: child.name,
          routeId: input.routeId,
          am: input.am,
          pm: input.pm,
          weekdays: input.weekdays,
          notes: input.notes.trim() || null,
        },
      ]);
      setUnplottedCampers((prev) =>
        prev.filter((c) => c.name.trim().toLowerCase() !== child.name.trim().toLowerCase()),
      );
      markRoutesConfigured('manual');
      const busLabel =
        input.routeId == null
          ? 'PT only (Car Report, no bus)'
          : (routeMeta.find((r) => r.id === input.routeId)?.bus ?? `Bus ${input.routeId}`);
      toast('Parent transport added', `${child.name} · ${busLabel}`);
      return true;
    },
    [groupRoster, parentTransportCampers, routeMeta, markRoutesConfigured],
  );

  const confirmRoutesBoard = useCallback(async () => {
    if (!companyId || !season) return;
    const payload = buildBoardPayload({ routesDraftMode: false, routesConfirmed: true });
    await persistConfirmedBoardSnapshot(companyId, season, payload);
    setRoutesDraftMode(false);
    setRoutesConfirmed(true);
    await persistBoard(payload);
    toast('Routes confirmed', 'Draft mode off — live board saved.');
  }, [companyId, season, buildBoardPayload, persistBoard]);

  const totalCampers = useMemo(() => {
    const assigned = displayRoutes.reduce((sum, r) => sum + r.campers, 0);
    return { total: assigned + unplottedForWeek.length, assigned, unplotted: unplottedForWeek.length };
  }, [displayRoutes, unplottedForWeek]);

  const enrollmentWeekForReport = useMemo(
    () => attendanceEnrollmentWeek(enrollmentWeekCalendar, overrideDate, attendanceWeekOverride),
    [enrollmentWeekCalendar, overrideDate, attendanceWeekOverride],
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

  const handleApplyRouteTemplate = async () => {
    if (!companyId) return;
    setApplyingTemplate(true);
    try {
      let templateStops: TransportBoardPayload['coreStops'];
      let templateMeta: TransportRouteMeta[];
      let routesSource: TransportRoutesSource = 'manual';
      let templateDescription: string;

      if (sandboxTransport) {
        const fromSeed = await loadStopsOnlyTemplateFromSeason(
          supabase,
          companyId,
          SANDBOX_TRANSPORT_BOARD_SEASON,
          ROUTE_COLORS,
        );
        if (!fromSeed?.routeMeta.length) {
          toast(
            'Sandbox routes not seeded',
            'Run seed_nest_sandbox_demo_data.sql in Supabase for 4 demo buses (not North Shore MapPoint).',
            true,
          );
          return;
        }
        templateStops = fromSeed.coreStops;
        templateMeta = fromSeed.routeMeta;
        templateDescription = `${templateMeta.length} demo buses restored from sandbox seed (stops only).`;
      } else {
        const mappoint = await build2026MappointRouteTemplate(ROUTE_COLORS);
        templateStops = mappoint.coreStops;
        templateMeta = mappoint.routeMeta;
        routesSource = 'mappoint2026';
        templateDescription = `${templateMeta.length} buses loaded (stops only). Use learned routes to place campers.`;
      }

      const payload: TransportBoardPayload = {
        coreStops: templateStops,
        routeMeta: templateMeta,
        unplottedCampers,
        routesConfigured: true,
        routesSeason: season,
        routesSource,
      };

      const normalized = await normalizeTransportBoardForSeason(supabase, companyId, season, payload);
      await persistBoard(normalized);
      await finalizeBoardForSeason(normalized);

      toast('Route template applied', templateDescription);
    } catch (e: unknown) {
      toast('Template apply failed', e instanceof Error ? e.message : String(e), true);
    } finally {
      setApplyingTemplate(false);
    }
  };

  const handleApplyHistoricalAssignments = async () => {
    if (!companyId) return;
    setApplyingHistorical(true);
    try {
      const priorMap = priorMapRef.current ?? (await loadCamperPriorMap(supabase, companyId, season));
      priorMapRef.current = priorMap;

      const result = applyHistoricalAssignments({
        coreStops,
        routeMeta,
        unplottedCampers,
        priorMap,
      });

      let nextCore = result.coreStops;
      if (result.placed.length > 0) {
        nextCore = reorderStopsByHistoricalPriors(nextCore, priorMap);
      }

      const payload: TransportBoardPayload = {
        coreStops: nextCore,
        routeMeta,
        unplottedCampers: result.unplottedCampers,
        routesConfigured: true,
        routesSeason: season,
        routesSource: routesSource ?? 'manual',
      };

      await persistBoard(payload);
      await finalizeBoardForSeason(payload);

      toast(
        'Learned assignments applied',
        `${result.placed.length} campers placed on prior buses · ${result.unplottedCampers.length} still unplotted${result.skippedNoBus.length ? ` · ${result.skippedNoBus.length} prior bus not on board` : ''}`,
        result.placed.length === 0,
      );
    } catch (e: unknown) {
      toast('Historical apply failed', e instanceof Error ? e.message : String(e), true);
    } finally {
      setApplyingHistorical(false);
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

  const finalizeProposedCore = useCallback(
    (proposedCore: Record<number, TransportRouteStop[]>, routeIds: number[]) => {
      routeIds.forEach((id) => {
        proposedCore[id] = reorderRouteForOptimize(proposedCore[id] ?? [], {
          pinnedKeys: pinnedKeysForRoute(id),
        });
      });
    },
    [pinnedKeysForRoute],
  );

  const handleOptimizeRouteFromFirstStop = async (targetRouteId: number) => {
    setOptimizing(true);
    try {
      const before = coreStops[targetRouteId] || [];
      const beforeConsolidated = consolidateRouteStopsByAddress(before);
      const optimized = reorderRouteForOptimize(beforeConsolidated, {
        fromFirstStop: true,
        pinnedKeys: pinnedKeysForRoute(targetRouteId),
      });
      const meta = routeMeta.find((r) => r.id === targetRouteId);
      const beforeMi = routeMiles(before);
      const afterMi = routeMiles(optimized);
      const beforeSeq = beforeConsolidated.map((s) => s.address).join('|');
      const afterSeq = optimized.map((s) => s.address).join('|');
      const reordered = beforeSeq !== afterSeq && beforeConsolidated.length > 1;
      setOptimizePreview({
        open: true,
        proposedCore: { [targetRouteId]: optimized },
        proposedUnplotted: [],
        beforeMiles: beforeMi,
        afterMiles: afterMi,
        reassignments: [],
        reorderedRoutes: reordered ? 1 : 0,
        perRoute: [
          {
            id: targetRouteId,
            name: meta?.name || `Route ${targetRouteId}`,
            bus: meta?.bus || `Bus ${targetRouteId}`,
            beforeMi,
            afterMi,
            changed: reordered || beforeMi !== afterMi,
            addedCampers: [],
          },
        ],
        selectedRouteIds: [targetRouteId],
      });
    } catch (e: unknown) {
      toast('Optimization failed', e instanceof Error ? e.message : String(e), true);
    } finally {
      setOptimizing(false);
    }
  };

  const handleOptimizeRoutes = async (targetRouteId?: number) => {
    setOptimizing(true);
    try {
      if (companyId) {
        priorMapRef.current =
          priorMapRef.current ?? (await loadCamperPriorMap(supabase, companyId, '2026'));
      }
      const priorMap = priorMapRef.current ?? new Map<string, CamperRoutingPrior>();

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
          finalizeProposedCore(
            proposedCore,
            targetRoutes.map((r) => r.id),
          );
        }
      }
      let remainingUnplotted: TransportUnplottedCamper[] = [];
      if (!usedORS) {
        targetRoutes.forEach((r) => {
          proposedCore[r.id] = [...(coreStops[r.id] || [])];
        });
        if (targetRouteId === undefined) {
          unplottedCampers.forEach((camper) => {
            let bestRouteId = pickHistoricalBusForCamper(camper, priorMap, routeMeta);
            let bestDist = bestRouteId !== undefined ? 0 : Infinity;

            if (bestRouteId === undefined) {
              bestRouteId = targetRoutes[0]?.id;
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
            }

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
          proposedCore[r.id] = consolidateRouteStopsByAddress(proposedCore[r.id] ?? []);
        });
        finalizeProposedCore(
          proposedCore,
          targetRoutes.map((r) => r.id),
        );
        if (priorMap.size > 0) {
          Object.assign(proposedCore, reorderStopsByHistoricalPriors(proposedCore, priorMap));
          finalizeProposedCore(
            proposedCore,
            targetRoutes.map((r) => r.id),
          );
        }
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
      if (proposed && proposed.length > 0) {
        nextCore[p.id] = sanitizeRouteStops(proposed);
      }
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
    if (reportName === 'Master Change Sheet') {
      if (!companyId) {
        toast('Company not loaded', undefined, true);
        return;
      }
      const [exceptions, manual] = await Promise.all([
        fetchTransportExceptions(supabase, companyId, overrideDate),
        loadManualOverrides(supabase, companyId, season, overrideDate),
      ]);
      const selectedIds = visibleRoutes.length ? visibleRoutes : routeMeta.map((r) => r.id);
      const built = buildApprovedChangeSheetRows({
        overrideDate,
        runPeriod: timeOfDay,
        exceptions,
        manual,
        routeMeta,
        coreStops,
        selectedRouteIds: selectedIds,
      }).filter((r) => !r.camper.startsWith('(No transport'));
      if (!built.length) {
        toast('No changes', 'No approved changes for this date and buses.', true);
        return;
      }
      const csv = changeSheetRowsToCsv(built);
      const filename = `transport-change-sheet-${overrideDate}-${timeOfDay}.csv`;
      const file = new File(Paths.cache, filename);
      if (file.exists) file.delete();
      file.create({ overwrite: true });
      file.write(csv);
      await Share.share({ url: file.uri, title: filename, message: csv });
      return;
    }
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
    if (reportName === 'Bus Bubble Sheet' || reportName === 'Group Bubble Sheet') {
      let calendar = enrollmentWeekCalendar;
      let week = attendanceEnrollmentWeek(calendar, overrideDate, attendanceWeekOverride);
      if (week == null && companyId) {
        calendar = await loadEnrollmentWeekCalendar(supabase, companyId, season);
        setEnrollmentWeekCalendar(calendar);
        groupLoadedKeyRef.current = `${companyId}:${season}`;
        week = attendanceEnrollmentWeek(calendar, overrideDate, attendanceWeekOverride);
      }
      if (week == null) {
        toast(
          'Enrollment week required',
          'Set enrollment week calendar dates on Group Bubble Sheets first.',
          true,
        );
        return;
      }
      const weekRow = getEnrollmentWeekRow(calendar, week);
      const weekLabel = formatEnrollmentWeekLabel(week, calendar);

      try {
        installTextCodecPolyfill();
        if (reportName === 'Group Bubble Sheet') {
          const rosterForWeek = groupRoster.filter((c) =>
            camperEnrolledInWeek(c.enrolledWeeks, c.session, week),
          );
          const groupMap = new Map<string, GroupRosterCamper[]>();
          for (const camper of rosterForWeek) {
            const list = groupMap.get(camper.groupName) ?? [];
            list.push(camper);
            groupMap.set(camper.groupName, list);
          }
          const groups = Array.from(groupMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([groupName, campers]) => ({
              groupName,
              campers: campers.map((c) => ({ name: c.name, detail: groupName })),
            }));
          const { buildGroupBubbleSheetPdf } = await import('../lib/transportBubbleSheetPdf');
          const built = await buildGroupBubbleSheetPdf({
            companyName,
            enrollmentWeek: week,
            weekDateRange: weekRow ? formatEnrollmentWeekRange(weekRow) : undefined,
            weekDays: enrollmentWeekDayColumns(weekRow),
            groups,
          });
          if (!built) {
            toast('No campers to print', undefined, true);
          } else {
            await shareTransportPdf(built);
          }
          return;
        }

        const coreForRun = (routeId: number, period: 'am' | 'pm') =>
          consolidateRouteStopsByAddress(
            applyRouteOverrides(
              coreStops[routeId] || [],
              routeId,
              todayOverrides,
              excludedCamperSet(transportExceptions, period),
            ),
          );

        const mergedBusRoutes = buildBusBubbleSheetRoutes({
          routes: routeMeta.map((route) => ({
            id: route.id,
            bus: route.bus,
            routeName: route.name,
          })),
          baseCoreByRoute: (routeId) => consolidateRouteStopsByAddress(coreStops[routeId] || []),
          coreForRun,
          schedules: camperBusRunSchedules,
          runDate: overrideDate,
          parentTransportCampers,
          enrollmentWeek: week,
          enrollmentLookup: camperEnrollmentLookup,
          includeCamper: (name) => camperEnrolledInWeekByLookup(camperEnrollmentLookup, name, week),
        });

        const { buildDayBusBubbleSheetPdf } = await import('../lib/transportBubbleSheetPdf');
        const built = await buildDayBusBubbleSheetPdf({
          companyName,
          date: overrideDate,
          enrollmentWeek: week,
          weekDateRange: weekRow ? formatEnrollmentWeekRange(weekRow) : undefined,
          routes: mergedBusRoutes,
        });
        if (!built) {
          toast('No campers to print', undefined, true);
        } else {
          await shareTransportPdf(built);
        }
      } catch (err) {
        console.error('[Transport] Bubble sheet PDF failed', err);
        toast('PDF failed', 'Could not generate bubble sheet.', true);
      }
      return;
    }
    if (reportName === 'Car Seat Count by Bus') {
      if (!companyId) {
        toast('Company not loaded', undefined, true);
        return;
      }
      const lookup = await loadCamperCarSeatLookup(supabase, companyId, season);
      const reportRoutes = displayRoutes;
      const coreForRoute = (routeId: number) => {
        const route = reportRoutes.find((r) => r.id === routeId);
        if (!route) return [];
        return route.stops
          .filter((s) => s.address !== CAMP_LOCATION.address)
          .map((s) => ({ name: s.name, camperNames: s.camperNames }));
      };
      const summaries = summarizeCarSeatsByBus(
        reportRoutes.map((r) => ({ id: r.id, bus: r.bus, name: r.name })),
        coreForRoute,
        lookup,
        { includeEmptyBuses: true },
      );
      const rows = buildCarSeatCountByBusCsvRows(summaries, {
        date: overrideDate,
        runPeriod: timeOfDay,
      });
      const filename = `daycamp-car-seats-by-bus-${overrideDate}-${timeOfDay}.csv`;
      await shareCsv(rows, filename);
      return;
    }
    if (reportName === 'Digital Attendance Log') {
      if (!companyId) {
        toast('Company not loaded', undefined, true);
        return;
      }
      const loaded = await loadBusAttendance(supabase, companyId, season, overrideDate, timeOfDay);
      const ptRiders: DigitalBusAttendanceRider[] = displayRoutes.flatMap((route) =>
        parentTransportRidersForRoute(route.id, parentTransportCampers, {
          runDate: overrideDate,
          runPeriod: timeOfDay,
          enrollmentWeek: activeRouteEnrollmentWeek,
          enrollmentLookup: camperEnrollmentLookup,
        }).map((rider) => ({
          routeId: route.id,
          bus: route.bus,
          routeName: route.name,
          camperName: rider.name,
          stopName: rider.stopName,
          transportMode: 'parent' as const,
        })),
      );
      const rows = buildDigitalBusAttendanceCsvRows(
        displayRoutes,
        CAMP_LOCATION.address,
        loaded.records,
        loaded.busSubmissions,
        { date: overrideDate, runPeriod: timeOfDay },
        ptRiders,
      );
      const filename = `daycamp-digital-attendance-${overrideDate}-${timeOfDay}.csv`;
      await shareCsv(rows, filename);
      return;
    }
    const today = overrideDate;
    const safeName = reportName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `daycamp-${safeName}-${today}.csv`;
    let rows: (string | number)[][] = [];
    switch (reportName) {
      case 'Bus Report':
        rows.push([
          'Bus',
          'Route',
          'Direction',
          'Departure',
          'Total Stops',
          'Bus Campers',
          'Parent Transport',
          'Total Campers',
          'Status',
        ]);
        routes.forEach((r) => {
          const ptCount = countParentTransportOnRoute(r.id, parentTransportCampers, {
            runDate: overrideDate,
            runPeriod: timeOfDay,
            enrollmentWeek: activeRouteEnrollmentWeek,
            enrollmentLookup: camperEnrollmentLookup,
          });
          const busCount = Math.max(0, r.campers - ptCount);
          rows.push([
            r.bus,
            r.name,
            r.direction,
            r.departure,
            (coreStops[r.id] || []).length,
            busCount,
            ptCount,
            r.campers,
            r.status,
          ]);
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
        rows.push(['Camper Name', 'Bus assignment', 'Schedule', 'AM', 'PM', 'Notes']);
        parentTransportCampers.forEach((c) => {
          rows.push([
            c.name,
            parentTransportBusLabel(c, routeMeta),
            formatParentTransportSchedule(c),
            c.am ? 'Yes' : 'No',
            c.pm ? 'Yes' : 'No',
            c.notes ?? '',
          ]);
        });
        if (rows.length === 1) rows.push(['(No parent transport campers)', '', '', '', '', '']);
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
    applyingHistorical,
    applyingTemplate,
    referenceStatus,
    regeocoding,
    optimizing,
    overridesLoading,
    timeOfDay,
    setTimeOfDay,
    overrideDate,
    setOverrideDate: (d: string) => {
      overrideLoadedKeyRef.current = null;
      setOverrideDate(d || campDateStringInSeason(season || DEFAULT_SEASON));
    },
    transportExceptions,
    todayOverrides,
    routes: displayRoutes,
    displayedRoutes,
    allRoutes: routes,
    unplottedForWeek,
    routeEnrollmentWeek,
    setRouteEnrollmentWeek,
    enrollmentWeekCalendar,
    activeRouteEnrollmentWeek,
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
    handleApplyRouteTemplate,
    handleApplyHistoricalAssignments,
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
    sandboxTransport,
    campminderEnabled,
    parentTransportCampers,
    parentTransportForWeek,
    parentTransportNoBusForWeek,
    routesDraftMode,
    routesConfirmed,
    draftModeAvailable,
    enterRoutesDraftMode,
    discardRoutesDraft,
    confirmRoutesBoard,
    groupRoster,
    camperBusRunSchedules,
    busRunScheduleEntries,
    setCamperBusRunMode,
    getCamperBusRunMode,
    CAMPER_BUS_RUN_MODE_OPTIONS,
    CAMPER_BUS_RUN_MODE_LABELS,
    handleAddParentTransport,
    handleRemoveParentTransport,
    PARENT_TRANSPORT_NO_BUS_LABEL,
    attendanceWeekOverride,
    setAttendanceWeekOverride,
    enrollmentWeekForReport,
    boardSettings,
    setBoardSettings,
    pinnedKeysForRoute,
    isStopPinnedForOptimize,
    toggleStopPinForOptimize,
    handleReorderStop,
    handleOptimizeRouteFromFirstStop,
  };
}
