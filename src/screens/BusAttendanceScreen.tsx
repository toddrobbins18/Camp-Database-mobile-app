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
import { campTodayDateString } from '../lib/parentPortalCutoff';
import {
  allRoutesBusSubmitted,
  busSubmissionKey,
  campersOnRoute,
  isRouteBusSubmitted,
  loadBusAttendance,
  saveBusAttendance,
  type BusAttendanceMap,
  type BusAttendanceStatus,
  type BusSubmissionsMap,
} from '../lib/transportBusAttendance';
import {
  busCheckinKey,
  formatCheckinTime,
  loadBusCheckins,
  saveBusCheckins,
  type BusCheckinMap,
} from '../lib/transportBusCheckins';
import { buildRunRoutes, getEffectiveCoreStops, loadTransportRunBoard, type TransportRunBoard } from '../lib/transportRunBoard';
import { installTextCodecPolyfill } from '../lib/textCodecPolyfill';

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
  const { companyId, season, availableCompanies } = useCompany();
  const companyName =
    availableCompanies.find((c) => c.id === companyId)?.name ?? 'Day Camp';

  const [runDate, setRunDate] = useState(campTodayDateString());
  const [timeOfDay, setTimeOfDay] = useState<'am' | 'pm'>('am');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [board, setBoard] = useState<TransportRunBoard | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [busAttendance, setBusAttendance] = useState<BusAttendanceMap>({});
  const [busSubmissions, setBusSubmissions] = useState<BusSubmissionsMap>({});
  const [attendanceSubmittedAt, setAttendanceSubmittedAt] = useState<string | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [busCheckins, setBusCheckins] = useState<BusCheckinMap>({});
  const [checkinsLoading, setCheckinsLoading] = useState(true);

  const skipAttendancePersistRef = useRef(true);
  const skipCheckinsPersistRef = useRef(true);

  const routes = useMemo(
    () => (board ? buildRunRoutes(board, timeOfDay) : []),
    [board, timeOfDay],
  );
  const routeIdsWithRoster = useMemo(() => routes.map((r) => r.id), [routes]);
  const allBusesSubmitted = useMemo(
    () => allRoutesBusSubmitted(routeIdsWithRoster, busSubmissions),
    [routeIdsWithRoster, busSubmissions],
  );
  const submittedCount = routes.filter((r) => isRouteBusSubmitted(r.id, busSubmissions)).length;
  const isToday = runDate === campTodayDateString();

  useEffect(() => {
    if (!companyId || !season) return;
    let cancelled = false;
    setBoardLoading(true);
    void (async () => {
      try {
        const loaded = await loadTransportRunBoard(supabase, companyId, season, runDate);
        if (!cancelled) setBoard(loaded);
      } catch (err) {
        console.error('[BusAttendance] Load board error:', err);
      } finally {
        if (!cancelled) setBoardLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, season, runDate]);

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
    if (!companyId || !season) return;
    let cancelled = false;
    skipCheckinsPersistRef.current = true;
    setCheckinsLoading(true);
    void (async () => {
      try {
        const loaded = await loadBusCheckins(supabase, companyId, season, runDate, timeOfDay);
        if (!cancelled) setBusCheckins(loaded);
      } catch (err) {
        console.error('[BusAttendance] Load check-ins error:', err);
      } finally {
        if (!cancelled) {
          skipCheckinsPersistRef.current = false;
          setCheckinsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, season, runDate, timeOfDay]);

  useEffect(() => {
    if (!companyId || !season || skipAttendancePersistRef.current || attendanceLoading) return;
    const handle = setTimeout(() => {
      void (async () => {
        const { data: userRes } = await supabase.auth.getUser();
        await saveBusAttendance(supabase, companyId, season, runDate, timeOfDay, busAttendance, {
          busSubmissions,
          allRoutesSubmitted: allBusesSubmitted,
          userId: userRes.user?.id,
        });
      })();
    }, 600);
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
    if (!companyId || !season || skipCheckinsPersistRef.current || checkinsLoading) return;
    const handle = setTimeout(() => {
      void (async () => {
        const { data: userRes } = await supabase.auth.getUser();
        await saveBusCheckins(supabase, companyId, season, runDate, timeOfDay, busCheckins, userRes.user?.id);
      })();
    }, 600);
    return () => clearTimeout(handle);
  }, [busCheckins, companyId, season, runDate, timeOfDay, checkinsLoading]);

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
    const core = getEffectiveCoreStops(board, routeId, timeOfDay);
    const campers = campersOnRoute(routeId, core);
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

  const markBusArrived = async (routeId: number) => {
    const key = busCheckinKey(routeId);
    const now = new Date().toISOString();
    const { data: userRes } = await supabase.auth.getUser();
    setBusCheckins((prev) => ({
      ...prev,
      [key]: { ...prev[key], arrivedAt: now, arrivedBy: userRes.user?.id ?? null },
    }));
    Alert.alert('Bus marked arrived', formatCheckinTime(now));
  };

  const markBusReadyToDepart = async (routeId: number, busLabel: string) => {
    if (!isRouteBusSubmitted(routeId, busSubmissions)) {
      Alert.alert(
        'Submit this bus first',
        `Mark attendance for ${busLabel}, then submit before departing.`,
      );
      return;
    }
    const key = busCheckinKey(routeId);
    if (!busCheckins[key]?.arrivedAt) {
      Alert.alert('Mark bus arrived first', `${busLabel} must be checked in before ready to depart.`);
      return;
    }
    const now = new Date().toISOString();
    const { data: userRes } = await supabase.auth.getUser();
    setBusCheckins((prev) => ({
      ...prev,
      [key]: { ...prev[key], departedAt: now, departedBy: userRes.user?.id ?? null },
    }));
    Alert.alert('Bus ready to depart', `${busLabel} · ${formatCheckinTime(now)}`);
  };

  const handleBubbleSheet = useCallback(async () => {
    if (!board) return;
    const sheetRoutes = routes.map((r) => ({
      bus: r.bus,
      routeName: r.name,
      campers: campersOnRoute(r.id, getEffectiveCoreStops(board, r.id, timeOfDay)).map((c) => ({
        name: c.name,
        detail: c.stopName,
      })),
    }));

    try {
      installTextCodecPolyfill();
      const { buildBusBubbleSheetsPdf } = await import('../lib/transportBubbleSheetPdf');
      const built = await buildBusBubbleSheetsPdf({
        companyName,
        date: runDate,
        runPeriod: timeOfDay,
        routes: sheetRoutes,
      });
      if (!built) {
        Alert.alert('No campers to print', 'No campers scheduled on buses for this run.');
        return;
      }
      await shareTransportPdf(built);
    } catch {
      Alert.alert('Bubble sheet', 'Could not share PDF.');
    }
  }, [board, routes, companyName, runDate, timeOfDay]);

  return (
    <SafeAreaView style={styles.container}>
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
            Take attendance by bus — submit each bus when done.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.bubbleBtn, !routes.length && styles.btnDisabled]}
          onPress={() => void handleBubbleSheet()}
          disabled={!routes.length}
        >
          <Ionicons name="print-outline" size={14} color={theme.colors.text} />
          <Text style={styles.bubbleBtnText}>Bubble sheet</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
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
            onPress={() => setRunDate(campTodayDateString())}
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

        <View style={styles.checkinSection}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="time-outline" size={16} color={theme.colors.text} />
            <Text style={styles.sectionTitle}>Bus check-in / check-out</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Per bus — submit attendance before ready to depart.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.checkinScroll}>
            {routes.map((r) => {
              const rec = busCheckins[busCheckinKey(r.id)];
              const submitted = isRouteBusSubmitted(r.id, busSubmissions);
              return (
                <View key={`checkin-${r.id}`} style={styles.checkinCard}>
                  <View style={styles.checkinCardHeader}>
                    <Ionicons name="bus-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.checkinBusName}>{r.bus}</Text>
                    {submitted ? (
                      <View style={styles.miniBadge}>
                        <Text style={styles.miniBadgeText}>Submitted</Text>
                      </View>
                    ) : null}
                  </View>
                  {rec?.arrivedAt ? (
                    <Text style={styles.checkinTimeText}>Arrived {formatCheckinTime(rec.arrivedAt)}</Text>
                  ) : (
                    <TouchableOpacity
                      style={styles.smallOutlineBtn}
                      onPress={() => void markBusArrived(r.id)}
                      disabled={checkinsLoading}
                    >
                      <Text style={styles.smallOutlineBtnText}>Mark arrived</Text>
                    </TouchableOpacity>
                  )}
                  {rec?.departedAt ? (
                    <Text style={styles.checkinTimeText}>Departed {formatCheckinTime(rec.departedAt)}</Text>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.smallPrimaryBtn,
                        (!rec?.arrivedAt || !submitted) && styles.btnDisabled,
                      ]}
                      onPress={() => void markBusReadyToDepart(r.id, r.bus)}
                      disabled={checkinsLoading || !rec?.arrivedAt || !submitted}
                    >
                      <Text style={styles.smallPrimaryBtnText}>Ready to depart</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {!boardLoading && !routes.length ? (
          <Text style={styles.emptyText}>No campers scheduled on buses for this date and run.</Text>
        ) : null}

        {routes.map((r) => {
          if (!board) return null;
          const core = getEffectiveCoreStops(board, r.id, timeOfDay);
          const campers = campersOnRoute(r.id, core);
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
                    {r.name} · {campers.length} campers
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
                ) : (
                  <>
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
                  </>
                )}
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
                          disabled={submitted}
                        >
                          <Text style={[styles.paBtnText, status === 'present' && styles.paBtnTextActive]}>P</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.paBtn, status === 'absent' && styles.paBtnAbsent]}
                          onPress={() => setCamperAttendance(r.id, c.key, 'absent')}
                          disabled={submitted}
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
  btnDisabled: { opacity: 0.45 },
  content: { flex: 1, padding: 12 },
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
