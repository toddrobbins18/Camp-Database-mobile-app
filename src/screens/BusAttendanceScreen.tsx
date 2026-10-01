import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { File, Paths } from 'expo-file-system';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useCampOperationalDate } from '../hooks/useCampOperationalDate';
import {
  allRoutesBusSubmitted,
  busSubmissionKey,
  isRouteBusSubmitted,
  loadBusAttendance,
  saveBusAttendance,
  type BusAttendanceMap,
  type BusAttendanceStatus,
  type BusSubmissionsMap,
} from '../lib/transportBusAttendance';
import { campersOnRouteForWeek, weekContextForNumber } from '../lib/transportBusRunContext';
import { formatEnrollmentWeekLabel } from '../lib/enrollmentWeekCalendar';
import { getEffectiveCoreStops } from '../lib/transportRunBoard';
import { useFilteredBusRoutes } from '../hooks/useFilteredBusRoutes';
import { installTextCodecPolyfill } from '../lib/textCodecPolyfill';
import { FrontOfficeBackButton } from '../components/FrontOfficeBackButton';

function ymdFromDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function dateFromYmd(ymd: string): Date {
  return new Date(`${ymd}T12:00:00`);
}

async function shareTransportPdf(pdf: { filename: string; bytes: Uint8Array }) {
  const file = new File(Paths.cache, pdf.filename);
  if (file.exists) file.delete();
  file.create({ overwrite: true });
  file.write(pdf.bytes);
  await Share.share({ url: file.uri, title: pdf.filename });
}

export function BusAttendanceScreen({ navigation }: any) {
  const { availableCompanies } = useCompany();
  const { operationalDateString } = useCampOperationalDate();

  const [runDate, setRunDate] = useState(operationalDateString);

  useEffect(() => {
    setRunDate(operationalDateString);
  }, [operationalDateString]);
  const [timeOfDay, setTimeOfDay] = useState<'am' | 'pm'>('am');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const {
    companyId,
    season,
    board,
    boardLoading,
    routes,
    enrollmentCtx,
    busScopeLabel,
  } = useFilteredBusRoutes(runDate, timeOfDay);

  const companyName =
    availableCompanies.find((c) => c.id === companyId)?.name ?? 'Day Camp';

  const [busAttendance, setBusAttendance] = useState<BusAttendanceMap>({});
  const [busSubmissions, setBusSubmissions] = useState<BusSubmissionsMap>({});
  const [attendanceSubmittedAt, setAttendanceSubmittedAt] = useState<string | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const skipAttendancePersistRef = useRef(true);
  const [selectedRouteIds, setSelectedRouteIds] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  useEffect(() => {
    if (!enrollmentCtx?.defaultWeek) return;
    setSelectedWeek(enrollmentCtx.defaultWeek);
  }, [enrollmentCtx?.defaultWeek, runDate]);

  const activeWeek = selectedWeek ?? enrollmentCtx?.defaultWeek ?? null;
  const activeWeekContext = useMemo(() => {
    if (!enrollmentCtx || activeWeek == null) return null;
    return weekContextForNumber(enrollmentCtx.calendar, activeWeek);
  }, [enrollmentCtx, activeWeek]);

  const campersForRoute = useCallback(
    (routeId: number) => {
      if (!board || !enrollmentCtx) return [];
      return campersOnRouteForWeek(
        routeId,
        getEffectiveCoreStops(board, routeId, timeOfDay),
        activeWeek,
        enrollmentCtx.enrollmentLookup,
      );
    },
    [board, enrollmentCtx, timeOfDay, activeWeek],
  );
  const routeIdsWithRoster = useMemo(() => routes.map((r) => r.id), [routes]);
  const routeIdsKey = routeIdsWithRoster.join(',');

  useEffect(() => {
    setSelectedRouteIds(routeIdsWithRoster);
  }, [routeIdsKey, routeIdsWithRoster]);

  const selectedRoutes = useMemo(
    () => routes.filter((r) => selectedRouteIds.includes(r.id)),
    [routes, selectedRouteIds],
  );

  const toggleBubbleSheetRoute = (routeId: number) => {
    setSelectedRouteIds((prev) =>
      prev.includes(routeId) ? prev.filter((id) => id !== routeId) : [...prev, routeId],
    );
  };
  const allBusesSubmitted = useMemo(
    () => allRoutesBusSubmitted(routeIdsWithRoster, busSubmissions),
    [routeIdsWithRoster, busSubmissions],
  );
  const submittedCount = routes.filter((r) => isRouteBusSubmitted(r.id, busSubmissions)).length;
  const isToday = runDate === operationalDateString;

  useEffect(() => {
    if (!companyId || !season) return;
    let cancelled = false;
    skipAttendancePersistRef.current = true;
    setAttendanceLoading(true);
    void (async () => {
      try {
        const loaded = await loadBusAttendance(supabase, companyId, season, runDate, timeOfDay);
        if (cancelled) return;
        setBusAttendance(loaded.records);
        setBusSubmissions(loaded.busSubmissions);
        setAttendanceSubmittedAt(loaded.submittedAt);
      } catch (err) {
        console.error('[BusAttendance] Load attendance error:', err);
      } finally {
        if (!cancelled) {
          skipAttendancePersistRef.current = false;
          setAttendanceLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, season, runDate, timeOfDay]);

  useEffect(() => {
    if (!companyId || !season || skipAttendancePersistRef.current || attendanceLoading) return;
    setSaveState('saving');
    const handle = setTimeout(() => {
      void (async () => {
        const { data: userRes } = await supabase.auth.getUser();
        const ok = await saveBusAttendance(supabase, companyId, season, runDate, timeOfDay, busAttendance, {
          busSubmissions,
          allRoutesSubmitted: allBusesSubmitted,
          userId: userRes.user?.id,
        });
        setSaveState(ok ? 'saved' : 'idle');
      })();
    }, 300);
    return () => clearTimeout(handle);
  }, [
    busAttendance,
    busSubmissions,
    allBusesSubmitted,
    companyId,
    season,
    runDate,
    timeOfDay,
    attendanceLoading,
  ]);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const t = setTimeout(() => setSaveState('idle'), 2000);
    return () => clearTimeout(t);
  }, [saveState]);

  const setCamperAttendance = (routeId: number, key: string, status: BusAttendanceStatus) => {
    setBusAttendance((prev) => ({ ...prev, [key]: status }));
    setBusSubmissions((prev) => {
      const next = { ...prev };
      delete next[busSubmissionKey(routeId)];
      return next;
    });
    setAttendanceSubmittedAt(null);
  };

  const markBusPresent = (routeId: number, keys: string[]) => {
    setBusAttendance((prev) => {
      const next = { ...prev };
      for (const key of keys) next[key] = 'present';
      return next;
    });
    setBusSubmissions((prev) => {
      const next = { ...prev };
      delete next[busSubmissionKey(routeId)];
      return next;
    });
    setAttendanceSubmittedAt(null);
  };

  const handleSubmitBus = async (routeId: number, busLabel: string) => {
    if (!companyId || !season || !board) return;
    const campers = campersForRoute(routeId);
    if (!campers.length) return;

    const { data: userRes } = await supabase.auth.getUser();
    const nextSubmissions = {
      ...busSubmissions,
      [busSubmissionKey(routeId)]: {
        submittedAt: new Date().toISOString(),
        submittedBy: userRes.user?.id ?? null,
      },
    };
    const allDone = allRoutesBusSubmitted(routeIdsWithRoster, nextSubmissions);

    const ok = await saveBusAttendance(
      supabase,
      companyId,
      season,
      runDate,
      timeOfDay,
      busAttendance,
      {
        busSubmissions: nextSubmissions,
        submittedRouteId: routeId,
        allRoutesSubmitted: allDone,
        userId: userRes.user?.id,
      },
    );

    if (!ok) {
      Alert.alert('Error', 'Could not submit attendance');
      return;
    }

    setBusSubmissions(nextSubmissions);
    if (allDone) setAttendanceSubmittedAt(new Date().toISOString());

    let present = 0;
    let absent = 0;
    for (const c of campers) {
      if (busAttendance[c.key] === 'present') present++;
      else if (busAttendance[c.key] === 'absent') absent++;
    }

    Alert.alert(
      `${busLabel} submitted`,
      `${present} present · ${absent} absent · ${campers.length - present - absent} unmarked`,
    );
  };

  const handleBubbleSheet = useCallback(async () => {
    if (!board || !selectedRoutes.length) {
      Alert.alert('No buses selected');
      return;
    }
    if (activeWeek == null || !activeWeekContext) {
      Alert.alert(
        'Enrollment week calendar required',
        'Set week start/end dates under Group Bubble Sheets, then pick a week.',
      );
      return;
    }
    const sheetRoutes = selectedRoutes.map((r) => ({
      bus: r.bus,
      routeName: r.name,
      campers: campersForRoute(r.id).map((c) => ({
        name: c.name,
        detail: c.stopName,
      })),
    }));

    try {
      installTextCodecPolyfill();
      const { buildBusBubbleSheetsPdf } = await import('../lib/transportBubbleSheetPdf');
      const built = await buildBusBubbleSheetsPdf({
        companyName,
        enrollmentWeek: activeWeek,
        weekDateRange: activeWeekContext.weekDateRange ?? undefined,
        weekDays: activeWeekContext.weekDays,
        routes: sheetRoutes,
      });
      if (!built) {
        Alert.alert('No campers to print', 'No enrolled campers on selected buses this week.');
        return;
      }
      await shareTransportPdf(built);
    } catch {
      Alert.alert('Bubble sheet', 'Could not share PDF.');
    }
  }, [board, selectedRoutes, activeWeek, activeWeekContext, campersForRoute, companyName]);

  const runDateOutsideWeek =
    enrollmentCtx?.enrollmentWeek == null &&
    activeWeek != null &&
    (enrollmentCtx?.configuredWeeks.length ?? 0) > 0;

  return (
    <SafeAreaView style={styles.container}>
      <FrontOfficeBackButton navigation={navigation} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Ionicons name="clipboard-outline" size={22} color="#fff" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Bus Attendance</Text>
          <Text style={styles.headerSubtitle}>
            Present / Absent per camper (siblings separate). Saves live when you tap P or A.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.bubbleBtn, !selectedRoutes.length && styles.btnDisabled]}
          onPress={() => void handleBubbleSheet()}
          disabled={!selectedRoutes.length}
        >
          <Ionicons name="print-outline" size={14} color={theme.colors.text} />
          <Text style={styles.bubbleBtnText}>Print</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {routes.length > 0 ? (
          <View style={styles.busPickCard}>
            <Text style={styles.busPickTitle}>Bubble sheet buses</Text>
            <Text style={styles.busPickSub}>Select bus numbers to include in the PDF.</Text>
            <View style={styles.busPickActions}>
              <TouchableOpacity onPress={() => setSelectedRouteIds(routeIdsWithRoster)}>
                <Text style={styles.busPickLink}>Select all</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedRouteIds([])}>
                <Text style={styles.busPickLink}>Clear</Text>
              </TouchableOpacity>
              <Text style={styles.busPickCount}>
                {selectedRouteIds.length}/{routes.length}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {routes.map((r) => {
                const checked = selectedRouteIds.includes(r.id);
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.busChip, checked && styles.busChipActive, { borderLeftColor: r.color }]}
                    onPress={() => toggleBubbleSheetRoute(r.id)}
                  >
                    <Ionicons
                      name={checked ? 'checkbox' : 'square-outline'}
                      size={16}
                      color={checked ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[styles.busChipText, checked && styles.busChipTextActive]}>{r.bus}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {enrollmentCtx && enrollmentCtx.configuredWeeks.length > 0 ? (
          <View style={styles.weekRow}>
            <Text style={styles.filterLabel}>Enrollment week</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              {enrollmentCtx.configuredWeeks.map((row) => {
                const active = activeWeek === row.weekNumber;
                return (
                  <TouchableOpacity
                    key={row.weekNumber}
                    style={[styles.weekChip, active && styles.weekChipActive]}
                    onPress={() => setSelectedWeek(row.weekNumber)}
                  >
                    <Text style={[styles.weekChipText, active && styles.weekChipTextActive]}>
                      {formatEnrollmentWeekLabel(row.weekNumber, enrollmentCtx.calendar)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
        {activeWeekContext?.weekLabel ? (
          <Text style={styles.weekNote}>Roster: {activeWeekContext.weekLabel}</Text>
        ) : null}
        {runDateOutsideWeek ? (
          <Text style={styles.weekWarning}>
            Run date outside week — using selected week for roster &amp; print
          </Text>
        ) : null}

        <View style={styles.filtersRow}>
          <Text style={styles.filterLabel}>Run date</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.dateBtnText}>{format(dateFromYmd(runDate), 'dd/MM/yyyy')}</Text>
          </TouchableOpacity>
          {isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>Today</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.todayQuickBtn}
            onPress={() => setRunDate(operationalDateString)}
          >
            <Text style={styles.todayQuickBtnText}>Today</Text>
          </TouchableOpacity>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={dateFromYmd(runDate)}
            mode="date"
            display="default"
            onChange={(_e, picked) => {
              setShowDatePicker(false);
              if (picked) setRunDate(ymdFromDate(picked));
            }}
          />
        )}

        <View style={styles.runToggleRow}>
          <TouchableOpacity
            style={[styles.runToggleBtn, timeOfDay === 'am' && styles.runToggleBtnActive]}
            onPress={() => setTimeOfDay('am')}
          >
            <Ionicons
              name="sunny-outline"
              size={16}
              color={timeOfDay === 'am' ? theme.colors.text : theme.colors.textSecondary}
            />
            <Text style={[styles.runToggleText, timeOfDay === 'am' && styles.runToggleTextActive]}>AM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.runToggleBtn, timeOfDay === 'pm' && styles.runToggleBtnActive]}
            onPress={() => setTimeOfDay('pm')}
          >
            <Ionicons
              name="moon-outline"
              size={16}
              color={timeOfDay === 'pm' ? theme.colors.text : theme.colors.textSecondary}
            />
            <Text style={[styles.runToggleText, timeOfDay === 'pm' && styles.runToggleTextActive]}>PM</Text>
          </TouchableOpacity>
          {(boardLoading || attendanceLoading) && (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: 8 }} />
          )}
          <View style={styles.submittedBadge}>
            <Text style={styles.submittedBadgeText}>
              {submittedCount} / {routes.length} buses submitted
            </Text>
          </View>
        </View>

        {allBusesSubmitted && attendanceSubmittedAt ? (
          <View style={styles.allDoneBadge}>
            <Text style={styles.allDoneBadgeText}>All buses submitted</Text>
          </View>
        ) : null}

        {board && board.transportExceptions.length > 0 ? (
          <View style={styles.exceptionsBox}>
            <Text style={styles.exceptionsTitle}>Today&apos;s exceptions</Text>
            {board.transportExceptions.slice(0, 8).map((ex, i) => (
              <Text key={`${ex.source}-${ex.camperName}-${i}`} style={styles.exceptionLine} numberOfLines={2}>
                <Text style={styles.exceptionName}>{ex.camperName}</Text>
                {' · '}
                {ex.label}
              </Text>
            ))}
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate('DayCampModule', { moduleId: 'bus-check-ins' })}
        >
          <Text style={styles.linkText}>Bus arrived / depart → Bus Check-ins</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.secondary} />
        </TouchableOpacity>

        {!boardLoading && !routes.length ? (
          <Text style={styles.emptyText}>No campers scheduled on buses for this date and run.</Text>
        ) : null}

        {routes.map((r) => {
          if (!board) return null;
          const campers = campersForRoute(r.id);
          const submitted = isRouteBusSubmitted(r.id, busSubmissions);
          let present = 0;
          let absent = 0;
          for (const c of campers) {
            if (busAttendance[c.key] === 'present') present++;
            else if (busAttendance[c.key] === 'absent') absent++;
          }

          return (
            <View key={r.id} style={styles.routeCard}>
              <View style={styles.routeCardHeader}>
                <View style={[styles.routeDot, { backgroundColor: r.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeBusTitle}>{r.bus}</Text>
                  <Text style={styles.routeMeta}>
                    {r.name} · {campers.length} campers this week
                  </Text>
                </View>
                <View style={styles.countBadges}>
                  <Text style={styles.countBadge}>{present} P</Text>
                  <Text style={styles.countBadge}>{absent} A</Text>
                </View>
              </View>

              <View style={styles.routeActions}>
                {submitted ? (
                  <View style={styles.submittedPill}>
                    <Text style={styles.submittedPillText}>Submitted</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.outlineActionBtn}
                  onPress={() => markBusPresent(r.id, campers.map((c) => c.key))}
                  disabled={!campers.length}
                >
                  <Text style={styles.outlineActionBtnText}>Mark all present</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => void handleSubmitBus(r.id, r.bus)}
                  disabled={!campers.length || attendanceLoading}
                >
                  <Text style={styles.primaryActionBtnText}>Submit {r.bus}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.camperGrid}>
                {campers.map((c) => {
                  const status = busAttendance[c.key];
                  return (
                    <View key={c.key} style={styles.camperRow}>
                      <View style={styles.camperInfo}>
                        <Text style={styles.camperName} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={styles.camperStop} numberOfLines={1}>
                          {c.stopName}
                        </Text>
                      </View>
                      <View style={styles.paButtons}>
                        <TouchableOpacity
                          style={[styles.paBtn, status === 'present' && styles.paBtnPresent]}
                          onPress={() => setCamperAttendance(r.id, c.key, 'present')}
                        >
                          <Text style={[styles.paBtnText, status === 'present' && styles.paBtnTextActive]}>P</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.paBtn, status === 'absent' && styles.paBtnAbsent]}
                          onPress={() => setCamperAttendance(r.id, c.key, 'absent')}
                        >
                          <Text style={[styles.paBtnText, status === 'absent' && styles.paBtnTextAbsent]}>A</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  menuButton: { marginRight: 8, padding: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTextContainer: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  headerSubtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  bubbleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  bubbleBtnText: { fontSize: 11, fontWeight: '600', color: theme.colors.text },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  linkText: { fontSize: 13, color: theme.colors.secondary, fontWeight: '500' },
  busPickCard: {
    margin: 12,
    marginBottom: 0,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  busPickTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  busPickSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2, marginBottom: 8 },
  busPickActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  busPickLink: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  busPickCount: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 'auto' },
  busChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 3,
    backgroundColor: '#fafafa',
  },
  busChipActive: { backgroundColor: '#eff6ff', borderColor: theme.colors.primary },
  busChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  busChipTextActive: { color: theme.colors.primary },
  btnDisabled: { opacity: 0.45 },
  content: { flex: 1, padding: 12 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  weekNote: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 6 },
  weekWarning: { fontSize: 11, color: '#92400e', marginBottom: 8 },
  weekChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  weekChipActive: { borderColor: theme.colors.primary, backgroundColor: '#eff6ff' },
  weekChipText: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
  weekChipTextActive: { color: theme.colors.primary },
  filtersRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  filterLabel: { fontSize: 12, color: theme.colors.textSecondary },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  dateBtnText: { fontSize: 13, color: theme.colors.text },
  todayBadge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  todayBadgeText: { fontSize: 10, fontWeight: '600', color: theme.colors.textSecondary },
  todayQuickBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  todayQuickBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  runToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  runToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#f8fafc',
  },
  runToggleBtnActive: { backgroundColor: '#fff', borderColor: theme.colors.primary },
  runToggleText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  runToggleTextActive: { color: theme.colors.text },
  submittedBadge: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  submittedBadgeText: { fontSize: 10, color: theme.colors.textSecondary },
  allDoneBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  allDoneBadgeText: { fontSize: 11, fontWeight: '600', color: '#166534' },
  exceptionsBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  exceptionsTitle: { fontSize: 12, fontWeight: '600', color: '#92400e', marginBottom: 4 },
  exceptionLine: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 2 },
  exceptionName: { fontWeight: '600', color: theme.colors.text },
  checkinSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 14,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  sectionSubtitle: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2, marginBottom: 10 },
  checkinScroll: { gap: 8 },
  checkinCard: {
    width: 180,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fafafa',
    gap: 6,
  },
  checkinCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkinBusName: { fontSize: 12, fontWeight: '600', color: theme.colors.text, flex: 1 },
  miniBadge: { backgroundColor: '#e2e8f0', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  miniBadgeText: { fontSize: 9, fontWeight: '600', color: theme.colors.textSecondary },
  checkinTimeText: { fontSize: 10, color: theme.colors.textSecondary },
  smallOutlineBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  smallOutlineBtnText: { fontSize: 10, fontWeight: '600', color: theme.colors.text },
  smallPrimaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  smallPrimaryBtnText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
    overflow: 'hidden',
  },
  routeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 8,
  },
  routeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  routeBusTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  routeMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  countBadges: { flexDirection: 'row', gap: 6 },
  countBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  routeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
    paddingBottom: 8,
  },
  outlineActionBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  outlineActionBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  primaryActionBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryActionBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  submittedPill: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  submittedPillText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  camperGrid: { padding: 12, paddingTop: 0, gap: 8 },
  camperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  camperInfo: { flex: 1, minWidth: 0 },
  camperName: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  camperStop: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 },
  paButtons: { flexDirection: 'row', gap: 6 },
  paBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  paBtnPresent: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  paBtnAbsent: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  paBtnText: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  paBtnTextActive: { color: '#fff' },
  paBtnTextAbsent: { color: '#fff' },
});
