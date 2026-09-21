import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { DAY_CAMP_ENROLLMENT_WEEKS } from '../lib/enrolledWeeks';
import {
  buildMonFriEnrollmentWeeks,
  enrollmentWeekForDate,
  formatEnrollmentWeekLabel,
  formatEnrollmentWeekRange,
  getEnrollmentWeekRow,
  groupRosterByTeam,
  loadEnrollmentWeekCalendar,
  saveEnrollmentWeekCalendar,
  type EnrollmentWeekCalendar,
} from '../lib/enrollmentWeekCalendar';
import { loadGroupRoster } from '../lib/transportGroupAttendance';
import { buildGroupBubbleSheetPdf } from '../lib/transportBubbleSheetPdf';
import { installTextCodecPolyfill } from '../lib/textCodecPolyfill';

const ALL_GROUPS = '__all__';

async function shareTransportPdf(pdf: { filename: string; bytes: Uint8Array }) {
  const file = new File(Paths.cache, pdf.filename);
  if (file.exists) file.delete();
  file.create({ overwrite: true });
  file.write(pdf.bytes);
  await Share.share({ url: file.uri, title: pdf.filename });
}

function ymdFromDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function GroupBubbleSheetsScreen({ navigation }: any) {
  const { companyId, season, availableCompanies } = useCompany();
  const companyName = availableCompanies.find((c) => c.id === companyId)?.name ?? 'Day Camp';

  const [calendar, setCalendar] = useState<EnrollmentWeekCalendar>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarSaving, setCalendarSaving] = useState(false);
  const [week1Start, setWeek1Start] = useState('');
  const [showWeek1Picker, setShowWeek1Picker] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState(ALL_GROUPS);
  const [roster, setRoster] = useState<Awaited<ReturnType<typeof loadGroupRoster>>>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  const loadCalendar = useCallback(async () => {
    if (!companyId) return;
    setCalendarLoading(true);
    try {
      const loaded = await loadEnrollmentWeekCalendar(supabase, companyId, season);
      setCalendar(loaded);
      const currentWeek = enrollmentWeekForDate(loaded, campTodayDateString());
      if (currentWeek != null) setSelectedWeek(currentWeek);
    } finally {
      setCalendarLoading(false);
    }
  }, [companyId, season]);

  const loadRoster = useCallback(async () => {
    if (!companyId) return;
    setRosterLoading(true);
    try {
      const loaded = await loadGroupRoster(supabase, companyId, season, {
        enrollmentWeek: selectedWeek,
      });
      setRoster(loaded);
    } finally {
      setRosterLoading(false);
    }
  }, [companyId, season, selectedWeek]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  const rosterByGroup = useMemo(() => groupRosterByTeam(roster), [roster]);
  const groupNames = useMemo(() => rosterByGroup.map(([name]) => name), [rosterByGroup]);
  const weekRow = useMemo(() => getEnrollmentWeekRow(calendar, selectedWeek), [calendar, selectedWeek]);

  const handleAutoFill = () => {
    if (!week1Start) {
      Alert.alert('Week 1 start required', 'Pick a Week 1 start date first.');
      return;
    }
    const draft = buildMonFriEnrollmentWeeks(week1Start);
    void (async () => {
      if (!companyId) return;
      setCalendarSaving(true);
      const ok = await saveEnrollmentWeekCalendar(supabase, companyId, season, draft);
      setCalendarSaving(false);
      if (!ok) Alert.alert('Save failed', 'Could not save enrollment week calendar.');
      else {
        Alert.alert('Saved', '8-week calendar auto-filled.');
        void loadCalendar();
      }
    })();
  };

  const handlePrint = async () => {
    const groupsSource =
      selectedGroup === ALL_GROUPS
        ? rosterByGroup
        : rosterByGroup.filter(([name]) => name === selectedGroup);

    const groups = groupsSource.map(([groupName, campers]) => ({
      groupName,
      campers: campers.map((c) => ({ name: c.name, detail: groupName })),
    }));

    setPrinting(true);
    try {
      installTextCodecPolyfill();
      const built = await buildGroupBubbleSheetPdf({
        companyName,
        enrollmentWeek: selectedWeek,
        weekDateRange: weekRow ? formatEnrollmentWeekRange(weekRow) : undefined,
        groups,
      });
      if (!built) {
        Alert.alert('Nothing to print', 'No campers enrolled for this week.');
        return;
      }
      await shareTransportPdf(built);
    } catch (err) {
      console.error('[GroupBubbleSheets] print failed', err);
      Alert.alert('Print failed', 'Could not generate bubble sheet PDF.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Group Bubble Sheets</Text>
            <Text style={styles.subtitle}>Team rosters filtered by enrollment week</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Enrollment week calendar</Text>
          <Text style={styles.cardDesc}>Season {season} · map weeks 1–8 to camp dates</Text>
          {calendarLoading ? (
            <ActivityIndicator style={{ marginTop: 12 }} />
          ) : (
            <>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowWeek1Picker(true)}>
                <Text style={styles.dateBtnLabel}>Week 1 start: {week1Start || 'Pick date'}</Text>
              </TouchableOpacity>
              {showWeek1Picker ? (
                <DateTimePicker
                  value={week1Start ? new Date(`${week1Start}T12:00:00`) : new Date()}
                  mode="date"
                  onChange={(_, date) => {
                    setShowWeek1Picker(false);
                    if (date) {
                      setWeek1Start(ymdFromDate(date));
                    }
                  }}
                />
              ) : null}
              <TouchableOpacity
                style={[styles.primaryBtn, calendarSaving && styles.disabledBtn]}
                onPress={handleAutoFill}
                disabled={calendarSaving}
              >
                <Text style={styles.primaryBtnText}>
                  {calendarSaving ? 'Saving…' : 'Auto-fill 8 Mon–Fri weeks'}
                </Text>
              </TouchableOpacity>
              {calendar.length ? (
                <Text style={styles.metaText}>
                  {calendar.length} week{calendar.length === 1 ? '' : 's'} configured
                </Text>
              ) : (
                <Text style={styles.warnText}>Configure calendar before printing accurate date ranges.</Text>
              )}
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Print bubble sheets</Text>
          <Text style={styles.cardDesc}>Same P/A layout as bus attendance sheets</Text>

          <Text style={styles.fieldLabel}>Enrollment week</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekRow}>
            {Array.from({ length: DAY_CAMP_ENROLLMENT_WEEKS }, (_, i) => i + 1).map((week) => (
              <TouchableOpacity
                key={week}
                style={[styles.chip, selectedWeek === week && styles.chipActive]}
                onPress={() => setSelectedWeek(week)}
              >
                <Text style={[styles.chipText, selectedWeek === week && styles.chipTextActive]}>
                  {week}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.metaText}>{formatEnrollmentWeekLabel(selectedWeek, calendar)}</Text>

          <Text style={styles.fieldLabel}>Team / group</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekRow}>
            <TouchableOpacity
              style={[styles.chip, selectedGroup === ALL_GROUPS && styles.chipActive]}
              onPress={() => setSelectedGroup(ALL_GROUPS)}
            >
              <Text style={[styles.chipText, selectedGroup === ALL_GROUPS && styles.chipTextActive]}>
                All teams
              </Text>
            </TouchableOpacity>
            {groupNames.map((name) => (
              <TouchableOpacity
                key={name}
                style={[styles.chip, selectedGroup === name && styles.chipActive]}
                onPress={() => setSelectedGroup(name)}
              >
                <Text style={[styles.chipText, selectedGroup === name && styles.chipTextActive]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.primaryBtn, (printing || rosterLoading || !roster.length) && styles.disabledBtn]}
            onPress={() => void handlePrint()}
            disabled={printing || rosterLoading || !roster.length}
          >
            <Ionicons name="print-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>{printing ? 'Generating…' : 'Print bubble sheet'}</Text>
          </TouchableOpacity>

          {rosterLoading ? (
            <ActivityIndicator style={{ marginTop: 12 }} />
          ) : (
            <Text style={styles.metaText}>
              {roster.length} campers enrolled · {rosterByGroup.length} teams
            </Text>
          )}

          {rosterByGroup.map(([groupName, campers]) => (
            <View key={groupName} style={styles.groupRow}>
              <Text style={styles.groupName}>{groupName}</Text>
              <Text style={styles.groupCount}>{campers.length}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  cardDesc: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: 8, marginBottom: 6 },
  dateBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  dateBtnLabel: { color: theme.colors.text },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '600' },
  disabledBtn: { opacity: 0.5 },
  metaText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 8 },
  warnText: { fontSize: 12, color: '#b45309', marginTop: 8 },
  weekRow: { marginBottom: 4 },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.text, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  groupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  groupName: { fontSize: 14, color: theme.colors.text },
  groupCount: { fontSize: 13, color: theme.colors.textSecondary },
});
