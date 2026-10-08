import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCampOperationalDate } from '../hooks/useCampOperationalDate';
import { useFilteredBusRoutes } from '../hooks/useFilteredBusRoutes';
import { isRouteBusSubmitted, loadBusAttendance, type BusSubmissionsMap } from '../lib/transportBusAttendance';
import {
  busCheckinKey,
  formatCheckinTime,
  loadBusCheckins,
  saveBusCheckins,
  buildBusArrivalReportRows,
  buildBusArrivalReportCsvRows,
  type BusCheckinMap,
} from '../lib/transportBusCheckins';
import { FrontOfficeBackButton } from '../components/FrontOfficeBackButton';
import { BusLocationSharingSection } from '../components/BusLocationSharingSection';

function ymdFromDate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

function dateFromYmd(ymd: string) {
  return new Date(`${ymd}T12:00:00`);
}

type ScreenTab = 'checkins' | 'report';

function csvRowsToText(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? '');
          return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\n');
}

export function BusCheckInsScreen({ navigation }: any) {
  const { operationalDateString } = useCampOperationalDate();
  const [runDate, setRunDate] = useState(operationalDateString);
  const [timeOfDay, setTimeOfDay] = useState<'am' | 'pm'>('am');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [screenFocused, setScreenFocused] = useState(true);
  const [busCheckins, setBusCheckins] = useState<BusCheckinMap>({});
  const [busSubmissions, setBusSubmissions] = useState<BusSubmissionsMap>({});
  const [checkinsLoading, setCheckinsLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeTab, setActiveTab] = useState<ScreenTab>('checkins');
  const skipCheckinsPersistRef = useRef(true);

  useEffect(() => {
    setRunDate(operationalDateString);
  }, [operationalDateString]);

  const { companyId, season, boardLoading, routes, enrollmentCtx, busScopeLabel, assignedBus } =
    useFilteredBusRoutes(runDate, timeOfDay);

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, []),
  );

  useEffect(() => {
    if (!companyId || !season) return;
    let cancelled = false;
    skipCheckinsPersistRef.current = true;
    setCheckinsLoading(true);
    void (async () => {
      try {
        const [checkins, attendance] = await Promise.all([
          loadBusCheckins(supabase, companyId, season, runDate, timeOfDay),
          loadBusAttendance(supabase, companyId, season, runDate, timeOfDay),
        ]);
        if (cancelled) return;
        setBusCheckins(checkins);
        setBusSubmissions(attendance.busSubmissions);
      } catch (err) {
        console.error('[BusCheckIns] Load error:', err);
      } finally {
        if (!cancelled) {
          skipCheckinsPersistRef.current = false;
          setCheckinsLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [companyId, season, runDate, timeOfDay]);

  useEffect(() => {
    if (!companyId || !season || skipCheckinsPersistRef.current || checkinsLoading) return;
    setSaveState('saving');
    const handle = setTimeout(() => {
      void (async () => {
        const { data: userRes } = await supabase.auth.getUser();
        const ok = await saveBusCheckins(
          supabase,
          companyId,
          season,
          runDate,
          timeOfDay,
          busCheckins,
          userRes.user?.id,
        );
        setSaveState(ok ? 'saved' : 'idle');
      })();
    }, 300);
    return () => clearTimeout(handle);
  }, [busCheckins, companyId, season, runDate, timeOfDay, checkinsLoading]);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const t = setTimeout(() => setSaveState('idle'), 2000);
    return () => clearTimeout(t);
  }, [saveState]);

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

  const markBusReadyToDepart = (routeId: number, busLabel: string) => {
    if (!isRouteBusSubmitted(routeId, busSubmissions)) {
      Alert.alert(
        'Camper attendance not submitted',
        `Submit camper attendance for ${busLabel} on Bus Attendance first.`,
      );
      return;
    }
    const key = busCheckinKey(routeId);
    if (!busCheckins[key]?.arrivedAt) {
      Alert.alert('Mark bus arrived first', `${busLabel} must be checked in before ready to depart.`);
      return;
    }
    const now = new Date().toISOString();
    void supabase.auth.getUser().then(({ data: userRes }) => {
      setBusCheckins((prev) => ({
        ...prev,
        [key]: { ...prev[key], departedAt: now, departedBy: userRes.user?.id ?? null },
      }));
    });
    Alert.alert('Bus ready to depart', `${busLabel} · ${formatCheckinTime(now)}`);
  };

  const toggleNeedsGas = (routeId: number, busLabel: string) => {
    const key = busCheckinKey(routeId);
    void supabase.auth.getUser().then(({ data: userRes }) => {
      setBusCheckins((prev) => {
        const nextFlag = !prev[key]?.needsGas;
        const now = new Date().toISOString();
        return {
          ...prev,
          [key]: {
            ...prev[key],
            needsGas: nextFlag,
            needsGasAt: nextFlag ? now : null,
            needsGasBy: nextFlag ? userRes.user?.id ?? null : null,
          },
        };
      });
      const turningOn = !busCheckins[key]?.needsGas;
      Alert.alert(turningOn ? 'Needs gas flagged' : 'Needs gas cleared', busLabel);
    });
  };

  const reportRows = useMemo(
    () => buildBusArrivalReportRows(routes, busCheckins),
    [routes, busCheckins],
  );
  const arrivedCount = reportRows.filter((r) => r.arrivedAt).length;
  const needsGasCount = reportRows.filter((r) => r.needsGas).length;

  const shareArrivalReportCsv = async () => {
    const rows = buildBusArrivalReportCsvRows(routes, busCheckins, {
      date: runDate,
      runPeriod: timeOfDay,
    });
    const filename = `bus-arrival-report-${runDate}-${timeOfDay}.csv`;
    const file = new File(Paths.cache, filename);
    if (file.exists) file.delete();
    file.create({ overwrite: true });
    file.write(csvRowsToText(rows));
    await Share.share({ url: file.uri, title: filename });
  };

  const weekNote = enrollmentCtx?.weekLabel ?? null;

  const dateRunToolbar = (
    <View style={styles.toolbar}>
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
        <Ionicons name="calendar-outline" size={16} color={theme.colors.secondary} />
        <Text style={styles.dateBtnText}>{runDate}</Text>
      </TouchableOpacity>
      <View style={styles.amPmRow}>
        <TouchableOpacity
          style={[styles.amPmBtn, timeOfDay === 'am' && styles.amPmBtnActive]}
          onPress={() => setTimeOfDay('am')}
        >
          <Text style={[styles.amPmText, timeOfDay === 'am' && styles.amPmTextActive]}>AM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.amPmBtn, timeOfDay === 'pm' && styles.amPmBtnActive]}
          onPress={() => setTimeOfDay('pm')}
        >
          <Text style={[styles.amPmText, timeOfDay === 'pm' && styles.amPmTextActive]}>PM</Text>
        </TouchableOpacity>
      </View>
      {saveState === 'saved' ? <Text style={styles.savedText}>Saved</Text> : null}
      {busScopeLabel ? <Text style={styles.scopeText}>{busScopeLabel} only</Text> : null}
      {weekNote ? <Text style={styles.scopeText}>{weekNote}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FrontOfficeBackButton navigation={navigation} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Ionicons name="time-outline" size={22} color="#fff" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Bus Check-ins</Text>
          <Text style={styles.headerSubtitle}>
            Bus arrived, ready to depart, and needs gas — separate from camper attendance.
          </Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'checkins' && styles.tabBtnActive]}
          onPress={() => setActiveTab('checkins')}
        >
          <Ionicons name="bus-outline" size={14} color={activeTab === 'checkins' ? '#fff' : theme.colors.textSecondary} />
          <Text style={[styles.tabBtnText, activeTab === 'checkins' && styles.tabBtnTextActive]}>Check-ins</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'report' && styles.tabBtnActive]}
          onPress={() => setActiveTab('report')}
        >
          <Ionicons name="document-text-outline" size={14} color={activeTab === 'report' ? '#fff' : theme.colors.textSecondary} />
          <Text style={[styles.tabBtnText, activeTab === 'report' && styles.tabBtnTextActive]}>Arrival report</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {activeTab === 'checkins' ? (
          <>
            {dateRunToolbar}

            <BusLocationSharingSection
              companyId={companyId}
              season={season}
              runDate={runDate}
              timeOfDay={timeOfDay}
              routes={routes}
              assignedBus={assignedBus}
              screenFocused={screenFocused}
            />

            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => navigation.navigate('DayCampModule', { moduleId: 'bus-attendance' })}
            >
              <Text style={styles.linkText}>Camper attendance (P/A) → Bus Attendance</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.secondary} />
            </TouchableOpacity>

            {routes.map((r) => {
              const rec = busCheckins[busCheckinKey(r.id)];
              const submitted = isRouteBusSubmitted(r.id, busSubmissions);
              return (
                <View key={r.id} style={styles.checkinCard}>
                  <View style={styles.checkinCardHeader}>
                    <Ionicons name="bus-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.checkinBusName}>{r.bus}</Text>
                    <Text style={styles.attendanceBadge}>
                      {submitted ? 'Attendance submitted' : 'Attendance pending'}
                    </Text>
                  </View>
                  <Text style={styles.routeNameText} numberOfLines={1}>{r.name}</Text>
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
                      style={[styles.smallPrimaryBtn, (!rec?.arrivedAt || !submitted) && styles.btnDisabled]}
                      onPress={() => markBusReadyToDepart(r.id, r.bus)}
                      disabled={checkinsLoading || !rec?.arrivedAt || !submitted}
                    >
                      <Text style={styles.smallPrimaryBtnText}>Ready to depart</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.gasBtn, rec?.needsGas && styles.gasBtnActive]}
                    onPress={() => toggleNeedsGas(r.id, r.bus)}
                    disabled={checkinsLoading}
                  >
                    <Ionicons name="flash-outline" size={12} color={rec?.needsGas ? '#fff' : theme.colors.text} />
                    <Text style={[styles.gasBtnText, rec?.needsGas && styles.gasBtnTextActive]}>
                      {rec?.needsGas
                        ? `Needs gas · ${rec.needsGasAt ? formatCheckinTime(rec.needsGasAt) : 'flagged'}`
                        : 'Needs gas'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {!boardLoading && !routes.length ? (
              <Text style={styles.emptyText}>No buses available for this date and run.</Text>
            ) : null}
          </>
        ) : (
          <>
            {dateRunToolbar}
            <View style={styles.reportCard}>
              <View style={styles.reportCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportTitle}>Bus arrival report</Text>
                  <Text style={styles.reportDesc}>
                    {runDate} · {timeOfDay.toUpperCase()} · {arrivedCount}/{routes.length} arrived
                    {needsGasCount > 0 ? ` · ${needsGasCount} need gas` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.csvBtn}
                  onPress={() => void shareArrivalReportCsv()}
                  disabled={!routes.length}
                >
                  <Ionicons name="download-outline" size={16} color={theme.colors.secondary} />
                  <Text style={styles.csvBtnText}>CSV</Text>
                </TouchableOpacity>
              </View>
              {!routes.length ? (
                <Text style={styles.emptyText}>No buses for this date and run.</Text>
              ) : (
                reportRows.map((row) => (
                  <View key={`${row.bus}-${row.routeName}`} style={styles.reportRow}>
                    <Text style={styles.reportBus}>{row.bus}</Text>
                    <Text style={styles.reportRoute} numberOfLines={1}>{row.routeName}</Text>
                    <Text style={styles.reportCell}>
                      {row.arrivedAt ? formatCheckinTime(row.arrivedAt) : '—'}
                    </Text>
                    <Text style={styles.reportCell}>
                      {row.departedAt ? formatCheckinTime(row.departedAt) : '—'}
                    </Text>
                    <Text style={[styles.reportCell, row.needsGas && styles.reportGas]}>
                      {row.needsGas ? 'Yes' : '—'}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {showDatePicker ? (
        <DateTimePicker
          value={dateFromYmd(runDate)}
          mode="date"
          onChange={(_, d) => {
            setShowDatePicker(false);
            if (d) setRunDate(ymdFromDate(d));
          }}
        />
      ) : null}
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
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#f8fafc',
  },
  tabBtnActive: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  tabBtnTextActive: { color: '#fff' },
  content: { flex: 1, padding: 12 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  dateBtnText: { fontSize: 13, color: theme.colors.text },
  amPmRow: { flexDirection: 'row', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, overflow: 'hidden' },
  amPmBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  amPmBtnActive: { backgroundColor: theme.colors.secondary },
  amPmText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  amPmTextActive: { color: '#fff' },
  savedText: { fontSize: 11, color: theme.colors.secondary, fontWeight: '600' },
  scopeText: { fontSize: 11, color: theme.colors.textSecondary },
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
  checkinCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  checkinCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkinBusName: { fontSize: 14, fontWeight: '700', color: theme.colors.text, flex: 1 },
  routeNameText: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 4 },
  attendanceBadge: { fontSize: 10, color: theme.colors.textSecondary },
  gasBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 4,
  },
  gasBtnActive: { backgroundColor: '#d97706', borderColor: '#b45309' },
  gasBtnText: { fontSize: 11, color: theme.colors.text, fontWeight: '500' },
  gasBtnTextActive: { color: '#fff' },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  reportCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  reportTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  reportDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  csvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  csvBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.secondary },
  reportRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: 10,
    gap: 2,
  },
  reportBus: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  reportRoute: { fontSize: 11, color: theme.colors.textSecondary },
  reportCell: { fontSize: 12, color: theme.colors.text },
  reportGas: { color: '#d97706', fontWeight: '600' },
  checkinTimeText: { fontSize: 12, color: theme.colors.textSecondary },
  smallOutlineBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  smallOutlineBtnText: { fontSize: 11, color: theme.colors.text },
  smallPrimaryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.secondary,
  },
  smallPrimaryBtnText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  btnDisabled: { opacity: 0.45 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 24 },
});
