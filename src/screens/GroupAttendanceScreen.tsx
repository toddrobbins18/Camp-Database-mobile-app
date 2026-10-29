import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useCampOperationalDate } from '../hooks/useCampOperationalDate';
import {
  defaultEnrollmentWeekForDate,
  formatEnrollmentWeekLabel,
  loadEnrollmentWeekCalendar,
  type EnrollmentWeekCalendar,
} from '../lib/enrollmentWeekCalendar';
import {
  loadGroupAttendance,
  loadGroupRoster,
  saveGroupAttendance,
  type GroupAttendanceMap,
  type GroupAttendanceStatus,
  type GroupRosterCamper,
} from '../lib/transportGroupAttendance';
import { FrontOfficeBackButton } from '../components/FrontOfficeBackButton';

const ALL_GROUPS = '__all__';

function ymdFromDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function GroupAttendanceScreen({ navigation }: any) {
  const { companyId, season } = useCompany();
  const { operationalDateString } = useCampOperationalDate();
  const [attendanceDate, setAttendanceDate] = useState(operationalDateString);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendar, setCalendar] = useState<EnrollmentWeekCalendar>([]);
  const [roster, setRoster] = useState<GroupRosterCamper[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [attendance, setAttendance] = useState<GroupAttendanceMap>({});
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [groupFilter, setGroupFilter] = useState(ALL_GROUPS);
  const [search, setSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const skipPersistRef = useRef(true);

  useEffect(() => {
    setAttendanceDate(operationalDateString);
  }, [operationalDateString]);

  const enrollmentWeek = useMemo(
    () => defaultEnrollmentWeekForDate(calendar, attendanceDate),
    [attendanceDate, calendar],
  );

  useEffect(() => {
    if (!companyId || !season) return;
    void loadEnrollmentWeekCalendar(supabase, companyId, season).then(setCalendar);
  }, [companyId, season]);

  useEffect(() => {
    if (!companyId || !season) return;
    setRosterLoading(true);
    void loadGroupRoster(supabase, companyId, season, {
      enrollmentWeek: enrollmentWeek ?? undefined,
    }).then((rows) => {
      setRoster(rows);
      setRosterLoading(false);
    });
  }, [companyId, season, enrollmentWeek]);

  useEffect(() => {
    if (!companyId || !season) return;
    skipPersistRef.current = true;
    setAttendanceLoading(true);
    void loadGroupAttendance(supabase, companyId, season, attendanceDate).then((loaded) => {
      setAttendance(loaded.records);
      setAttendanceLoading(false);
      setSelectedKeys(new Set());
    });
  }, [companyId, season, attendanceDate]);

  useEffect(() => {
    if (!companyId || !season || attendanceLoading) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    setSaveState('saving');
    const handle = setTimeout(() => {
      void (async () => {
        const { data: userRes } = await supabase.auth.getUser();
        const ok = await saveGroupAttendance(
          supabase,
          companyId,
          season,
          attendanceDate,
          attendance,
          { userId: userRes.user?.id ?? null },
        );
        setSaveState(ok ? 'saved' : 'idle');
      })();
    }, 300);
    return () => clearTimeout(handle);
  }, [attendance, companyId, season, attendanceDate, attendanceLoading]);

  const groupNames = useMemo(() => {
    const set = new Set(roster.map((c) => c.groupName));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [roster]);

  const filteredRoster = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roster.filter((c) => {
      if (groupFilter !== ALL_GROUPS && c.groupName !== groupFilter) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.groupName.toLowerCase().includes(q);
    });
  }, [roster, groupFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, GroupRosterCamper[]>();
    for (const c of filteredRoster) {
      const list = map.get(c.groupName) ?? [];
      list.push(c);
      map.set(c.groupName, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredRoster]);

  const visibleKeys = useMemo(() => filteredRoster.map((c) => c.key), [filteredRoster]);

  const toggleSelected = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const applyStatusToKeys = useCallback((keys: string[], status: GroupAttendanceStatus) => {
    if (!keys.length) return;
    setAttendance((prev) => {
      const next = { ...prev };
      for (const key of keys) next[key] = status;
      return next;
    });
  }, []);

  const applyToSelected = useCallback(
    (status: GroupAttendanceStatus) => {
      applyStatusToKeys([...selectedKeys], status);
      setSelectedKeys(new Set());
    },
    [applyStatusToKeys, selectedKeys],
  );

  const weekLabel =
    enrollmentWeek != null ? formatEnrollmentWeekLabel(enrollmentWeek, calendar) : null;

  return (
    <SafeAreaView style={styles.container}>
      <FrontOfficeBackButton navigation={navigation} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Group Attendance</Text>
          <Text style={styles.subtitle}>Select multiple campers, then mark P or A together.</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
            <Text style={styles.dateBtnText}>{attendanceDate}</Text>
          </TouchableOpacity>
          {weekLabel ? <Text style={styles.weekBadge}>{weekLabel}</Text> : null}
          {(rosterLoading || attendanceLoading) && <ActivityIndicator size="small" />}
          {saveState === 'saved' ? <Text style={styles.saved}>Saved</Text> : null}
        </View>

        {showDatePicker ? (
          <DateTimePicker
            value={new Date(`${attendanceDate}T12:00:00`)}
            mode="date"
            onChange={(_, d) => {
              setShowDatePicker(false);
              if (d) setAttendanceDate(ymdFromDate(d));
            }}
          />
        ) : null}

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search camper or group…"
          style={styles.search}
          placeholderTextColor={theme.colors.textSecondary}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupChips}>
          <TouchableOpacity
            style={[styles.chip, groupFilter === ALL_GROUPS && styles.chipActive]}
            onPress={() => setGroupFilter(ALL_GROUPS)}
          >
            <Text style={styles.chipText}>All groups</Text>
          </TouchableOpacity>
          {groupNames.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, groupFilter === g && styles.chipActive]}
              onPress={() => setGroupFilter(g)}
            >
              <Text style={styles.chipText} numberOfLines={1}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.bulkRow}>
          <TouchableOpacity onPress={() => setSelectedKeys(new Set(visibleKeys))}>
            <Text style={styles.link}>Select all ({visibleKeys.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedKeys(new Set())}>
            <Text style={styles.link}>Clear</Text>
          </TouchableOpacity>
          <Text style={styles.muted}>{selectedKeys.size} selected</Text>
        </View>
        <View style={styles.bulkRow}>
          <TouchableOpacity
            style={[styles.bulkBtn, selectedKeys.size === 0 && styles.btnDisabled]}
            disabled={selectedKeys.size === 0}
            onPress={() => applyToSelected('present')}
          >
            <Text style={styles.bulkBtnText}>Present</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkBtn, styles.bulkBtnDanger, selectedKeys.size === 0 && styles.btnDisabled]}
            disabled={selectedKeys.size === 0}
            onPress={() => applyToSelected('absent')}
          >
            <Text style={[styles.bulkBtnText, styles.dangerText]}>Absent</Text>
          </TouchableOpacity>
        </View>

        {!rosterLoading && filteredRoster.length === 0 ? (
          <Text style={styles.empty}>No campers for this date / enrollment week.</Text>
        ) : null}

        {grouped.map(([groupName, campers]) => (
          <View key={groupName} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{groupName}</Text>
              <TouchableOpacity
                onPress={() => applyStatusToKeys(campers.map((c) => c.key), 'present')}
              >
                <Text style={styles.link}>All present</Text>
              </TouchableOpacity>
            </View>
            {campers.map((c) => {
              const status = attendance[c.key];
              const checked = selectedKeys.has(c.key);
              return (
                <View key={c.key} style={[styles.row, checked && styles.rowSelected]}>
                  <TouchableOpacity onPress={() => toggleSelected(c.key)} style={styles.checkHit}>
                    <Ionicons
                      name={checked ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={checked ? theme.colors.secondary : theme.colors.icon}
                    />
                  </TouchableOpacity>
                  <Text style={styles.name} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <TouchableOpacity
                    style={[styles.pa, status === 'present' && styles.paActive]}
                    onPress={() => setAttendance((p) => ({ ...p, [c.key]: 'present' }))}
                  >
                    <Text style={styles.paText}>P</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pa, status === 'absent' && styles.paAbsent]}
                    onPress={() => setAttendance((p) => ({ ...p, [c.key]: 'absent' }))}
                  >
                    <Text style={styles.paText}>A</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
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
  saved: { fontSize: 10, color: theme.colors.secondary, fontWeight: '600' },
  search: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
    color: theme.colors.text,
  },
  groupChips: { marginBottom: 8, maxHeight: 36 },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  chipActive: { borderColor: theme.colors.secondary, backgroundColor: theme.colors.secondary + '12' },
  chipText: { fontSize: 11, color: theme.colors.text, maxWidth: 120 },
  bulkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' },
  link: { fontSize: 12, color: theme.colors.secondary, fontWeight: '600' },
  muted: { fontSize: 11, color: theme.colors.textSecondary },
  bulkBtn: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkBtnDanger: { backgroundColor: '#fee2e2' },
  bulkBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  dangerText: { color: '#b91c1c' },
  btnDisabled: { opacity: 0.4 },
  empty: { fontSize: 13, color: theme.colors.textSecondary, marginVertical: 16 },
  groupCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
  },
  groupTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 6,
  },
  rowSelected: { backgroundColor: theme.colors.secondary + '10' },
  checkHit: { padding: 4 },
  name: { flex: 1, fontSize: 13, fontWeight: '500', color: theme.colors.text },
  pa: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paActive: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  paAbsent: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  paText: { fontSize: 11, fontWeight: '700', color: theme.colors.text },
});
