import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useCampOperationalDate } from '../hooks/useCampOperationalDate';
import {
  defaultEnrollmentWeekForDate,
  loadEnrollmentWeekCalendar,
  type EnrollmentWeekCalendar,
} from '../lib/enrollmentWeekCalendar';
import { campTimeHHmmFromIso } from '../lib/campTime';
import {
  SCHEDULE_DAY_LABELS,
  areaLabel,
  dayOfWeekFromYmd,
  formatMinutes12,
  hhmmToMinutes,
  minutesToPgTime,
  pgTimeToMinutes,
  sameScheduleLabel,
  scheduleAreaOptions,
  slotMatchesArea,
  slotsAtTime,
  type GroupScheduleDraft,
  type GroupScheduleSlot,
} from '../lib/groupSchedule';
import { scanScheduleContents } from '../lib/groupScheduleScan';
import { loadGroupRoster, type GroupRosterCamper } from '../lib/transportGroupAttendance';
import { showAppAlert } from '../utils/showAppAlert';

const ALL = 'all';

type UploadRow = {
  id: string;
  file_name: string;
  applies_on: string | null;
  created_at: string;
};

function slotFromRow(row: {
  id: string;
  upload_id: string;
  group_name: string;
  day_of_week: number | null;
  applies_on: string | null;
  start_time: string;
  end_time: string;
  activity: string;
  location: string | null;
}): GroupScheduleSlot {
  return {
    id: row.id,
    uploadId: row.upload_id,
    groupName: row.group_name,
    dayOfWeek: row.day_of_week,
    appliesOn: row.applies_on,
    startMinutes: pgTimeToMinutes(row.start_time),
    endMinutes: pgTimeToMinutes(row.end_time),
    activity: row.activity,
    location: row.location ?? '',
  };
}

function periodLabel(slot: GroupScheduleDraft): string {
  return `${formatMinutes12(slot.startMinutes)}–${formatMinutes12(slot.endMinutes)}`;
}

function timeOnDate(ymd: string, hhmm: string): Date {
  const [hour, minute] = hhmm.split(':').map(Number);
  const date = new Date(`${ymd}T12:00:00`);
  date.setHours(hour || 0, minute || 0, 0, 0);
  return date;
}

export function GroupSchedulesScreen({ navigation }: { navigation: { openDrawer: () => void } }) {
  const { companyId, season } = useCompany();
  const { operationalDateString } = useCampOperationalDate();
  const [lookupDate, setLookupDate] = useState(operationalDateString);
  const [lookupTime, setLookupTime] = useState(() => campTimeHHmmFromIso(new Date().toISOString()));
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [groupFilter, setGroupFilter] = useState(ALL);
  const [areaFilter, setAreaFilter] = useState(ALL);
  const [slots, setSlots] = useState<GroupScheduleSlot[]>([]);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<GroupRosterCamper[]>([]);
  const [calendar, setCalendar] = useState<EnrollmentWeekCalendar>([]);
  const [preview, setPreview] = useState<GroupScheduleDraft[]>([]);
  const [previewName, setPreviewName] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [overrideDate, setOverrideDate] = useState('');
  const [showOverride, setShowOverride] = useState(false);

  useEffect(() => {
    setLookupDate(operationalDateString);
  }, [operationalDateString]);

  useEffect(() => {
    if (!companyId || !season) return;
    void loadEnrollmentWeekCalendar(supabase, companyId, season).then(setCalendar);
  }, [companyId, season]);

  const enrollmentWeek = useMemo(
    () => defaultEnrollmentWeekForDate(calendar, lookupDate),
    [calendar, lookupDate],
  );

  useEffect(() => {
    if (!companyId || !season) return;
    void loadGroupRoster(supabase, companyId, season, {
      enrollmentWeek: enrollmentWeek ?? undefined,
    }).then(setRoster);
  }, [companyId, season, enrollmentWeek]);

  const loadSchedules = async () => {
    if (!companyId || !season) return;
    setLoading(true);
    const [slotRes, uploadRes] = await Promise.all([
      supabase
        .from('group_schedule_slots')
        .select('id, upload_id, group_name, day_of_week, applies_on, start_time, end_time, activity, location')
        .eq('company_id', companyId)
        .eq('season', season)
        .limit(5000),
      supabase
        .from('group_schedule_uploads')
        .select('id, file_name, applies_on, created_at')
        .eq('company_id', companyId)
        .eq('season', season)
        .order('created_at', { ascending: false }),
    ]);
    if (slotRes.error || uploadRes.error) {
      showAppAlert('Schedules', 'Could not load schedules. The database update may still need to be applied.');
      setSlots([]);
      setUploads([]);
    } else {
      setSlots((slotRes.data ?? []).map((row) => slotFromRow(row as never)));
      setUploads((uploadRes.data ?? []) as UploadRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadSchedules();
  }, [companyId, season]);

  const minutes = hhmmToMinutes(lookupTime) ?? 0;
  const atTime = useMemo(
    () => (lookupDate ? slotsAtTime(slots, lookupDate, minutes) : []),
    [slots, lookupDate, minutes],
  );
  const visible = useMemo(
    () =>
      atTime.filter((slot) => {
        if (groupFilter !== ALL && !sameScheduleLabel(slot.groupName, groupFilter)) return false;
        if (areaFilter !== ALL && !slotMatchesArea(slot, areaFilter)) return false;
        return true;
      }),
    [atTime, groupFilter, areaFilter],
  );

  const campersByGroup = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const camper of roster) {
      const key = camper.groupName.trim().toLowerCase();
      const names = map.get(key) ?? [];
      names.push(camper.name);
      map.set(key, names);
    }
    for (const names of map.values()) names.sort((a, b) => a.localeCompare(b));
    return map;
  }, [roster]);

  const groupOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const slot of slots) names.set(slot.groupName.trim().toLowerCase(), slot.groupName.trim());
    for (const camper of roster) {
      if (camper.groupName === 'Unassigned') continue;
      names.set(camper.groupName.trim().toLowerCase(), camper.groupName.trim());
    }
    return [...names.values()].sort((a, b) => a.localeCompare(b));
  }, [slots, roster]);

  const areaOptions = useMemo(() => scheduleAreaOptions(slots), [slots]);
  const lookupDay = lookupDate ? SCHEDULE_DAY_LABELS[dayOfWeekFromYmd(lookupDate)] : '';
  const previewDays = useMemo(() => new Set(preview.map((slot) => slot.dayOfWeek)), [preview]);
  const canUseOneDay = preview.length > 0 && preview.every((slot) => !slot.appliesOn) && previewDays.size === 1;
  const previewGroups = useMemo(
    () => [...new Set(preview.map((slot) => slot.groupName))].sort((a, b) => a.localeCompare(b)),
    [preview],
  );

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: [
          'text/csv',
          'text/plain',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const asset = result.assets[0];
      const name = asset.name || 'schedule.csv';
      setScanning(true);
      setOverrideDate('');
      const response = await fetch(asset.uri);
      const lower = name.toLowerCase();
      const scanned =
        lower.endsWith('.csv') || lower.endsWith('.txt')
          ? scanScheduleContents(name, await response.text())
          : scanScheduleContents(name, await response.arrayBuffer());
      setPreview(scanned.slots);
      setWarnings(scanned.warnings);
      setPreviewName(name);
      if (scanned.slots.length === 0) {
        showAppAlert('Schedules', 'No periods were found in that file.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read that file.';
      showAppAlert('Schedules', message);
    } finally {
      setScanning(false);
    }
  };

  const savePreview = async () => {
    if (!companyId || !season || preview.length === 0) return;
    let rows = preview;
    if (overrideDate) {
      const day = dayOfWeekFromYmd(overrideDate);
      rows = preview.map((slot) => ({ ...slot, appliesOn: overrideDate, dayOfWeek: day }));
    }
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const weekly = rows.filter((slot) => !slot.appliesOn);
      const byDate = new Map<string, GroupScheduleDraft[]>();
      for (const slot of rows) {
        if (!slot.appliesOn) continue;
        const list = byDate.get(slot.appliesOn) ?? [];
        list.push(slot);
        byDate.set(slot.appliesOn, list);
      }
      if (weekly.length > 0) {
        const { error } = await supabase
          .from('group_schedule_uploads')
          .delete()
          .eq('company_id', companyId)
          .eq('season', season)
          .is('applies_on', null);
        if (error) throw error;
      }
      for (const date of byDate.keys()) {
        const { error } = await supabase
          .from('group_schedule_uploads')
          .delete()
          .eq('company_id', companyId)
          .eq('season', season)
          .eq('applies_on', date);
        if (error) throw error;
      }
      const batches: { appliesOn: string | null; rows: GroupScheduleDraft[] }[] = [];
      if (weekly.length > 0) batches.push({ appliesOn: null, rows: weekly });
      for (const [date, datedRows] of byDate) batches.push({ appliesOn: date, rows: datedRows });

      for (const batch of batches) {
        const { data: upload, error: uploadError } = await supabase
          .from('group_schedule_uploads')
          .insert({
            company_id: companyId,
            season,
            file_name: previewName || 'Schedule',
            applies_on: batch.appliesOn,
            created_by: userRes.user?.id ?? null,
          })
          .select('id')
          .single();
        if (uploadError || !upload) throw uploadError ?? new Error('Upload was not saved');
        try {
          for (let index = 0; index < batch.rows.length; index += 400) {
            const chunk = batch.rows.slice(index, index + 400).map((slot) => ({
              upload_id: upload.id,
              company_id: companyId,
              season,
              group_name: slot.groupName,
              day_of_week: slot.dayOfWeek,
              applies_on: slot.appliesOn,
              start_time: minutesToPgTime(slot.startMinutes),
              end_time: minutesToPgTime(slot.endMinutes),
              activity: slot.activity,
              location: slot.location,
            }));
            const { error: slotError } = await supabase.from('group_schedule_slots').insert(chunk);
            if (slotError) throw slotError;
          }
        } catch (slotError) {
          await supabase.from('group_schedule_uploads').delete().eq('id', upload.id);
          throw slotError;
        }
      }
      setPreview([]);
      setWarnings([]);
      setPreviewName('');
      setOverrideDate('');
      await loadSchedules();
      showAppAlert('Schedules', 'Schedule saved.');
    } catch (error) {
      console.error(error);
      showAppAlert('Schedules', 'Could not save the schedule.');
    } finally {
      setSaving(false);
    }
  };

  const deleteUpload = (upload: UploadRow) => {
    const label = upload.applies_on ? upload.applies_on : 'the weekly schedule';
    Alert.alert('Delete schedule', `Remove ${label} from ${upload.file_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const { error } = await supabase.from('group_schedule_uploads').delete().eq('id', upload.id);
            if (error) {
              showAppAlert('Schedules', 'Could not delete that schedule.');
              return;
            }
            await loadSchedules();
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Schedules</Text>
          <Text style={styles.subtitle}>Where a group is, or who is at an activity.</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => setShowDate(true)} style={styles.dateBtn}>
            <Text style={styles.dateBtnText}>{lookupDate}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowTime(true)} style={styles.dateBtn}>
            <Text style={styles.dateBtnText}>{formatMinutes12(minutes)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setLookupDate(operationalDateString);
              setLookupTime(campTimeHHmmFromIso(new Date().toISOString()));
            }}
            style={styles.nowBtn}
          >
            <Text style={styles.nowText}>Now</Text>
          </TouchableOpacity>
          {lookupDay ? <Text style={styles.weekBadge}>{lookupDay}</Text> : null}
          {loading ? <ActivityIndicator size="small" /> : null}
        </View>
        {showDate ? (
          <DateTimePicker
            value={new Date(`${lookupDate}T12:00:00`)}
            mode="date"
            onChange={(_, date) => {
              setShowDate(false);
              if (date) {
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                setLookupDate(`${date.getFullYear()}-${month}-${day}`);
              }
            }}
          />
        ) : null}
        {showTime ? (
          <DateTimePicker
            value={timeOnDate(lookupDate, lookupTime)}
            mode="time"
            onChange={(_, date) => {
              setShowTime(false);
              if (date) {
                setLookupTime(
                  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
                );
              }
            }}
          />
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          <TouchableOpacity
            style={[styles.chip, groupFilter === ALL && styles.chipActive]}
            onPress={() => setGroupFilter(ALL)}
          >
            <Text style={styles.chipText}>All groups</Text>
          </TouchableOpacity>
          {groupOptions.map((name) => (
            <TouchableOpacity
              key={name}
              style={[styles.chip, groupFilter === name && styles.chipActive]}
              onPress={() => setGroupFilter(name)}
            >
              <Text style={styles.chipText} numberOfLines={1}>
                {name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          <TouchableOpacity
            style={[styles.chip, areaFilter === ALL && styles.chipActive]}
            onPress={() => setAreaFilter(ALL)}
          >
            <Text style={styles.chipText}>All areas</Text>
          </TouchableOpacity>
          {areaOptions.map((name) => (
            <TouchableOpacity
              key={name}
              style={[styles.chip, areaFilter === name && styles.chipActive]}
              onPress={() => setAreaFilter(name)}
            >
              <Text style={styles.chipText} numberOfLines={1}>
                {name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {slots.length === 0 && !loading ? (
          <Text style={styles.empty}>No schedule saved for this season yet.</Text>
        ) : null}
        {groupFilter !== ALL ? (
          <Text style={styles.callout}>
            {groupFilter}{' '}
            {visible.length === 0
              ? 'has nothing scheduled at this time.'
              : visible.length === 1
                ? `is at ${areaLabel(visible[0])} (${periodLabel(visible[0])}).`
                : `has ${visible.length} activities at this time.`}
          </Text>
        ) : null}
        {visible.map((slot) => {
          const names = campersByGroup.get(slot.groupName.trim().toLowerCase()) ?? [];
          return (
            <View key={slot.id} style={styles.card}>
              <Text style={styles.cardTitle}>{slot.groupName}</Text>
              <Text style={styles.cardBody}>
                {slot.activity}
                {slot.location ? ` · ${areaLabel(slot)}` : ''} · {periodLabel(slot)}
              </Text>
              <Text style={styles.cardMeta}>
                {names.length === 0 ? 'No campers on the roster' : `${names.length} · ${names.join(', ')}`}
              </Text>
            </View>
          );
        })}
        {slots.length > 0 && visible.length === 0 ? (
          <Text style={styles.empty}>Nobody is scheduled for that time.</Text>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload</Text>
          <Text style={styles.subtitle}>Excel or CSV. Same grids as the website.</Text>
          <TouchableOpacity onPress={() => void pickFile()} style={styles.saveBtn} disabled={scanning}>
            <Text style={styles.saveText}>{scanning ? 'Scanning…' : 'Choose schedule file'}</Text>
          </TouchableOpacity>
          {warnings.map((warning) => (
            <Text key={warning} style={styles.warning}>
              {warning}
            </Text>
          ))}
          {preview.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {preview.length} periods · {previewName}
              </Text>
              <Text style={styles.cardMeta}>{previewGroups.join(', ')}</Text>
              {canUseOneDay ? (
                <TouchableOpacity onPress={() => setShowOverride(true)} style={styles.dateBtn}>
                  <Text style={styles.dateBtnText}>
                    {overrideDate ? `One day: ${overrideDate}` : 'Save as weekly (tap for one day)'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.cardMeta}>Saving replaces the weekly schedule.</Text>
              )}
              {showOverride ? (
                <DateTimePicker
                  value={new Date(`${overrideDate || lookupDate}T12:00:00`)}
                  mode="date"
                  onChange={(_, date) => {
                    setShowOverride(false);
                    if (!date) return;
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    setOverrideDate(`${date.getFullYear()}-${month}-${day}`);
                  }}
                />
              ) : null}
              <TouchableOpacity
                onPress={() => void savePreview()}
                style={[styles.saveBtn, saving && styles.btnDisabled]}
                disabled={saving}
              >
                <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save schedule'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {uploads.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saved</Text>
            {uploads.map((upload) => {
              const count = slots.filter((slot) => slot.uploadId === upload.id).length;
              return (
                <View key={upload.id} style={styles.savedRow}>
                  <Text style={styles.cardBody}>
                    {upload.file_name} · {upload.applies_on || 'Weekly'} · {count}
                  </Text>
                  <TouchableOpacity onPress={() => deleteUpload(upload)}>
                    <Text style={styles.delete}>Delete</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 8 },
  menuBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  scroll: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 },
  dateBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
  },
  dateBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  nowBtn: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nowText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  weekBadge: { fontSize: 12, color: theme.colors.textSecondary },
  chips: { marginBottom: 8, maxHeight: 40 },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    backgroundColor: theme.colors.surface,
  },
  chipActive: { borderColor: theme.colors.secondary, backgroundColor: theme.colors.secondary + '18' },
  chipText: { fontSize: 12, color: theme.colors.text, maxWidth: 140 },
  empty: { fontSize: 13, color: theme.colors.textSecondary, marginVertical: 12 },
  callout: { fontSize: 15, color: theme.colors.text, marginBottom: 8, fontWeight: '600' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  cardBody: { fontSize: 14, color: theme.colors.text, marginTop: 2, flex: 1 },
  cardMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  section: { marginTop: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  saveBtn: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  warning: { fontSize: 12, color: '#b45309', marginTop: 6 },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  delete: { color: theme.colors.danger, fontWeight: '700', fontSize: 13 },
});
