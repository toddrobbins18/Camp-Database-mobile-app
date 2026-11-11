import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { theme } from '../theme/theme';
import { FrontOfficeBackButton } from '../components/FrontOfficeBackButton';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useCampOperationalDate } from '../hooks/useCampOperationalDate';
import { useTransportBoardSnapshot } from '../hooks/useTransportBoardSnapshot';
import { captureMessageMedia } from '../lib/messageMediaCapture';
import {
  reviewPaperAttendance,
  weekdayBubbleIndex,
  type ChangeSheetAttendanceSource,
  type PaperAbsentCamper,
  type PaperAttendanceListKind,
} from '../lib/paperAttendance';
import { loadRgbaFromUri } from '../lib/paperAttendanceImage';
import { analyzePaperAttendanceImage, omrRowsToAbsentFlags } from '../lib/paperAttendanceOmr';
import {
  loadChangeSheetAttendanceSource,
  loadPaperAttendance,
  saveChangeSheetAttendanceSource,
  savePaperAttendanceSheet,
} from '../lib/paperAttendanceStore';
import { campersOnRoute } from '../lib/transportBusAttendance';
import { loadGroupRoster, type GroupRosterCamper } from '../lib/transportGroupAttendance';
import { PARENT_TRANSPORT_CHANGE_SHEET_BUS } from '../lib/transportParentTransport';

type RosterMark = { id: string; name: string; absent: boolean };

function ymdFromDate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

function dateFromYmd(ymd: string) {
  return new Date(`${ymd}T12:00:00`);
}

async function pickScanPhoto(): Promise<string | null> {
  const run = async (action: 'camera_photo' | 'library' | 'file') => {
    const picked = await captureMessageMedia(action);
    return picked?.uri ?? null;
  };
  if (Platform.OS === 'ios') {
    return new Promise((resolve) => {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take photo', 'Photo library'], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) void run('camera_photo').then(resolve);
          else if (index === 2) void run('library').then(resolve);
          else resolve(null);
        },
      );
    });
  }
  return new Promise((resolve) => {
    Alert.alert('Scan sheet', 'Photograph the printed roster', [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      { text: 'Camera', onPress: () => void run('camera_photo').then(resolve) },
      { text: 'Library', onPress: () => void run('library').then(resolve) },
    ]);
  });
}

export function ConflictReviewScreen({ navigation }: { navigation: any }) {
  const { companyId, season } = useCompany();
  const { operationalDateString } = useCampOperationalDate();
  const { routeMeta, coreStops, parentTransportCampers, loading: boardLoading } = useTransportBoardSnapshot();

  const [sheetDate, setSheetDate] = useState(operationalDateString);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [listKind, setListKind] = useState<PaperAttendanceListKind>('bus');
  const [sheetLabel, setSheetLabel] = useState('');
  const [groupRoster, setGroupRoster] = useState<GroupRosterCamper[]>([]);
  const [marks, setMarks] = useState<RosterMark[]>([]);
  const [scanWarning, setScanWarning] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busAbsents, setBusAbsents] = useState<PaperAbsentCamper[]>([]);
  const [groupAbsents, setGroupAbsents] = useState<PaperAbsentCamper[]>([]);
  const [attendanceSource, setAttendanceSource] = useState<ChangeSheetAttendanceSource>('paperless');

  useEffect(() => {
    setSheetDate(operationalDateString);
  }, [operationalDateString]);

  const weekdayIndex = weekdayBubbleIndex(sheetDate);
  const review = useMemo(
    () => reviewPaperAttendance(busAbsents, groupAbsents),
    [busAbsents, groupAbsents],
  );

  const busOptions = useMemo(() => {
    const buses = routeMeta.map((r) => r.bus);
    if (parentTransportCampers.length) buses.push(PARENT_TRANSPORT_CHANGE_SHEET_BUS);
    return [...new Set(buses)];
  }, [parentTransportCampers.length, routeMeta]);

  const groupOptions = useMemo(() => {
    return [...new Set(groupRoster.map((c) => c.groupName))].sort((a, b) => a.localeCompare(b));
  }, [groupRoster]);

  const sheetOptions = listKind === 'bus' ? busOptions : groupOptions;

  const loadLists = useCallback(async () => {
    if (!companyId || !season) return;
    const [paper, source] = await Promise.all([
      loadPaperAttendance(supabase, companyId, season, sheetDate),
      loadChangeSheetAttendanceSource(supabase, companyId, season),
    ]);
    setBusAbsents(paper.bus);
    setGroupAbsents(paper.group);
    setAttendanceSource(source);
  }, [companyId, season, sheetDate]);

  useEffect(() => {
    if (!companyId || !season) return;
    void loadGroupRoster(supabase, companyId, season).then(setGroupRoster);
  }, [companyId, season]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (!sheetOptions.length) {
      setSheetLabel('');
      return;
    }
    if (!sheetOptions.includes(sheetLabel)) setSheetLabel(sheetOptions[0]);
  }, [sheetLabel, sheetOptions]);

  const rosterForSheet = useCallback((): RosterMark[] => {
    if (!sheetLabel) return [];
    if (listKind === 'group') {
      return groupRoster
        .filter((c) => c.groupName === sheetLabel)
        .map((c) => ({ id: c.id, name: c.name, absent: false }));
    }
    if (sheetLabel === PARENT_TRANSPORT_CHANGE_SHEET_BUS) {
      return parentTransportCampers.map((c, i) => ({
        id: `pt-${i}-${c.name}`,
        name: c.name,
        absent: false,
      }));
    }
    const route = routeMeta.find((r) => r.bus === sheetLabel);
    if (!route) return [];
    return campersOnRoute(route.id, coreStops[route.id] ?? []).map((c) => ({
      id: c.key,
      name: c.name,
      absent: false,
    }));
  }, [coreStops, groupRoster, listKind, parentTransportCampers, routeMeta, sheetLabel]);

  useEffect(() => {
    setMarks(rosterForSheet());
    setScanWarning(null);
  }, [rosterForSheet]);

  const handleScan = async () => {
    if (weekdayIndex == null) {
      Alert.alert('Weekday only', 'Bus and group sheets are Monday–Friday.');
      return;
    }
    if (!marks.length) {
      Alert.alert('Pick a sheet', 'Choose the bus or group that matches this page.');
      return;
    }
    const uri = await pickScanPhoto();
    if (!uri) return;
    setScanning(true);
    try {
      const image = await loadRgbaFromUri(uri);
      const result = analyzePaperAttendanceImage(image, {
        kind: listKind,
        weekdayIndex,
        camperCount: marks.length,
      });
      const flags = new Map(omrRowsToAbsentFlags(result.rows, listKind).map((row) => [row.camperIndex, row.absent]));
      setMarks((prev) => prev.map((row, index) => ({ ...row, absent: flags.get(index) === true })));
      setScanWarning(result.warning ?? null);
    } catch (err) {
      Alert.alert('Could not read that photo', err instanceof Error ? err.message : 'Mark names by hand.');
    } finally {
      setScanning(false);
    }
  };

  const saveSheet = async () => {
    if (!companyId || !season || !sheetLabel) return;
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const absents = marks
        .filter((row) => row.absent)
        .map((row) => ({ camperId: row.id, camperName: row.name, sheetLabel }));
      const ok = await savePaperAttendanceSheet(supabase, {
        companyId,
        season,
        attendanceDate: sheetDate,
        listKind,
        sheetLabel,
        absents,
        userId: userRes.user?.id ?? null,
      });
      if (!ok) {
        Alert.alert('Save failed');
        return;
      }
      await loadLists();
    } finally {
      setSaving(false);
    }
  };

  const setSource = async (source: ChangeSheetAttendanceSource) => {
    setAttendanceSource(source);
    if (!companyId || !season) return;
    const ok = await saveChangeSheetAttendanceSource(supabase, companyId, season, source);
    if (!ok) {
      Alert.alert('Could not save toggle', 'Open Transportation once so the board exists, then try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FrontOfficeBackButton navigation={navigation} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Conflict Review</Text>
          <Text style={styles.subtitle}>Scan bus + group sheets. Both lists = really absent.</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateBtnText}>{sheetDate}</Text>
          </TouchableOpacity>
          <Text style={styles.weekBadge}>
            {weekdayIndex == null
              ? 'Weekend — no bubbles'
              : `${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][weekdayIndex]} column`}
          </Text>
        </View>
        {showDatePicker ? (
          <DateTimePicker
            value={dateFromYmd(sheetDate)}
            mode="date"
            display="default"
            onChange={(_, d) => {
              setShowDatePicker(false);
              if (d) setSheetDate(ymdFromDate(d));
            }}
          />
        ) : null}

        <Text style={styles.section}>Change sheet absents</Text>
        <View style={styles.rowBtns}>
          {(['paperless', 'paper_scan'] as const).map((source) => (
            <TouchableOpacity
              key={source}
              style={[styles.chip, attendanceSource === source && styles.chipOn]}
              onPress={() => void setSource(source)}
            >
              <Text style={[styles.chipText, attendanceSource === source && styles.chipTextOn]}>
                {source === 'paperless' ? 'Paperless' : 'Paper scan'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Scan a sheet</Text>
        <View style={styles.rowBtns}>
          {(['bus', 'group'] as const).map((kind) => (
            <TouchableOpacity
              key={kind}
              style={[styles.chip, listKind === kind && styles.chipOn]}
              onPress={() => setListKind(kind)}
            >
              <Text style={[styles.chipText, listKind === kind && styles.chipTextOn]}>
                {kind === 'bus' ? 'Bus roster' : 'Group report'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {sheetOptions.map((name) => (
            <TouchableOpacity
              key={name}
              style={[styles.chip, sheetLabel === name && styles.chipOn]}
              onPress={() => setSheetLabel(name)}
            >
              <Text style={[styles.chipText, sheetLabel === name && styles.chipTextOn]}>{name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.rowBtns}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => void handleScan()} disabled={scanning}>
            {scanning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Camera / photo</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => void saveSheet()} disabled={saving || !sheetLabel}>
            <Text style={styles.secondaryBtnText}>{saving ? 'Saving…' : `Save ${listKind} list`}</Text>
          </TouchableOpacity>
        </View>
        {scanWarning ? <Text style={styles.warn}>{scanWarning}</Text> : null}

        {boardLoading ? <ActivityIndicator style={{ marginVertical: 8 }} /> : null}
        {marks.map((row, index) => (
          <TouchableOpacity
            key={`${row.id}-${index}`}
            style={styles.markRow}
            onPress={() =>
              setMarks((prev) =>
                prev.map((item, i) => (i === index ? { ...item, absent: !item.absent } : item)),
              )
            }
          >
            <Ionicons
              name={row.absent ? 'checkbox' : 'square-outline'}
              size={20}
              color={row.absent ? theme.colors.danger : theme.colors.icon}
            />
            <Text style={[styles.markName, row.absent && styles.markAbsent]}>{row.name}</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.section}>Bus list ({busAbsents.length})</Text>
        {busAbsents.length === 0 ? <Text style={styles.empty}>None yet.</Text> : null}
        {busAbsents.map((row) => (
          <Text key={`b-${row.camperName}`} style={styles.listLine}>
            {row.camperName} · {row.sheetLabel}
          </Text>
        ))}
        <Text style={styles.section}>Group list ({groupAbsents.length})</Text>
        {groupAbsents.length === 0 ? <Text style={styles.empty}>None yet.</Text> : null}
        {groupAbsents.map((row) => (
          <Text key={`g-${row.camperName}`} style={styles.listLine}>
            {row.camperName} · {row.sheetLabel}
          </Text>
        ))}
        <Text style={styles.section}>Confirmed absent ({review.confirmed.length})</Text>
        {review.confirmed.length === 0 ? <Text style={styles.empty}>No matches yet.</Text> : null}
        {review.confirmed.map((row) => (
          <Text key={`c-${row.camperName}`} style={styles.listLine}>
            {row.camperName}
          </Text>
        ))}
        <Text style={styles.section}>Conflicts</Text>
        {review.busOnly.length === 0 && review.groupOnly.length === 0 ? (
          <Text style={styles.empty}>No conflicts.</Text>
        ) : null}
        {review.busOnly.map((row) => (
          <Text key={`bo-${row.camperName}`} style={styles.listLine}>
            {row.camperName} · bus only
          </Text>
        ))}
        {review.groupOnly.map((row) => (
          <Text key={`go-${row.camperName}`} style={styles.listLine}>
            {row.camperName} · group only
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  menuBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  scroll: { flex: 1, paddingHorizontal: 12 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  dateBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dateBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  weekBadge: { fontSize: 10, color: theme.colors.textSecondary },
  section: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginTop: 12, marginBottom: 6 },
  rowBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    marginRight: 6,
  },
  chipOn: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  chipText: { fontSize: 12, color: theme.colors.text },
  chipTextOn: { color: '#fff', fontWeight: '700' },
  primaryBtn: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  warn: { fontSize: 12, color: '#b45309', marginBottom: 8 },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  markName: { fontSize: 14, color: theme.colors.text },
  markAbsent: { fontWeight: '700' },
  empty: { fontSize: 13, color: theme.colors.textSecondary },
  listLine: { fontSize: 13, color: theme.colors.text, paddingVertical: 2 },
});
