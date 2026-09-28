import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { theme } from '../../theme/theme';
import { supabase } from '../../lib/supabase';
import {
  defaultOwlTimeSettings,
  listScheduledWorkDays,
  loadOwlTimeClosedDates,
  loadOwlTimeSeasonSettings,
  saveOwlTimeClosedDates,
  saveOwlTimeSeasonSettings,
  type OwlTimeClosedDate,
  type OwlTimeSeasonSettings,
} from '../../lib/owlTimeAttendance';

type Props = {
  companyId: string;
  season: string;
  onSaved?: () => void;
};

type DateField = 'start' | 'end' | 'closed' | null;
type TimeField = 'signIn' | 'signOut' | null;

function ymdFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateFromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function timeInputValue(dbTime: string): string {
  return dbTime.slice(0, 5);
}

function timeDbValue(input: string): string {
  return input.length === 5 ? `${input}:00` : input;
}

function timeFromHm(hm: string): Date {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function hmFromDate(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function OwlTimeSeasonSettingsPanel({ companyId, season, onSaved }: Props) {
  const [settings, setSettings] = useState<OwlTimeSeasonSettings>(() =>
    defaultOwlTimeSettings(companyId, season),
  );
  const [closedDates, setClosedDates] = useState<OwlTimeClosedDate[]>([]);
  const [newClosedDate, setNewClosedDate] = useState('');
  const [newClosedLabel, setNewClosedLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSavedSettings, setHasSavedSettings] = useState(false);
  const [dateField, setDateField] = useState<DateField>(null);
  const [timeField, setTimeField] = useState<TimeField>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [loadedSettings, loadedClosed] = await Promise.all([
      loadOwlTimeSeasonSettings(supabase, companyId, season),
      loadOwlTimeClosedDates(supabase, companyId, season),
    ]);

    const { data: existing } = await supabase
      .from('owl_time_season_settings')
      .select('company_id')
      .eq('company_id', companyId)
      .eq('season', season)
      .maybeSingle();

    setHasSavedSettings(!!existing);
    setSettings(loadedSettings);
    setClosedDates(loadedClosed);
    setLoading(false);
  }, [companyId, season]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const scheduledDays = listScheduledWorkDays(
    settings.start_date,
    settings.end_date,
    closedDates.map((d) => d.closed_date),
  );

  const addClosedDate = () => {
    if (!newClosedDate) return;
    if (closedDates.some((d) => d.closed_date === newClosedDate)) {
      Alert.alert('Date already listed');
      return;
    }
    setClosedDates((prev) =>
      [...prev, { closed_date: newClosedDate, label: newClosedLabel.trim() || null }].sort((a, b) =>
        a.closed_date.localeCompare(b.closed_date),
      ),
    );
    setNewClosedDate('');
    setNewClosedLabel('');
  };

  const handleSave = async () => {
    if (settings.end_date < settings.start_date) {
      Alert.alert('Invalid dates', 'End date must be on or after start date.');
      return;
    }

    setSaving(true);
    const settingsResult = await saveOwlTimeSeasonSettings(supabase, settings);
    if (!settingsResult.ok) {
      Alert.alert('Save failed', settingsResult.message);
      setSaving(false);
      return;
    }

    const closedResult = await saveOwlTimeClosedDates(supabase, companyId, season, closedDates);
    setSaving(false);

    if (!closedResult.ok) {
      Alert.alert('Closed dates save failed', closedResult.message);
      return;
    }

    setHasSavedSettings(true);
    Alert.alert('Saved', 'Season settings saved.');
    onSaved?.();
  };

  const datePickerValue = (): Date => {
    if (dateField === 'start') return dateFromYmd(settings.start_date);
    if (dateField === 'end') return dateFromYmd(settings.end_date);
    if (dateField === 'closed' && newClosedDate) return dateFromYmd(newClosedDate);
    return new Date();
  };

  const onDateChange = (_: unknown, d?: Date) => {
    if (Platform.OS === 'android') setDateField(null);
    if (!d) return;
    const ymd = ymdFromDate(d);
    if (dateField === 'start') setSettings((s) => ({ ...s, start_date: ymd }));
    if (dateField === 'end') setSettings((s) => ({ ...s, end_date: ymd }));
    if (dateField === 'closed') setNewClosedDate(ymd);
  };

  const onTimeChange = (_: unknown, d?: Date) => {
    if (Platform.OS === 'android') setTimeField(null);
    if (!d) return;
    const hm = hmFromDate(d);
    if (timeField === 'signIn') {
      setSettings((s) => ({ ...s, expected_sign_in_time: timeDbValue(hm) }));
    }
    if (timeField === 'signOut') {
      setSettings((s) => ({ ...s, expected_sign_out_time: timeDbValue(hm) }));
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.secondary} />
        <Text style={styles.loadingText}>Loading season settings…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!hasSavedSettings ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Set your season dates and save — reports use Mon–Fri weekdays in this range (minus closed days).
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Season dates</Text>
        <Text style={styles.cardDesc}>
          {scheduledDays.length} scheduled work days (Mon–Fri, excluding closed dates)
        </Text>

        <Text style={styles.label}>Start date</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setDateField('start')}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.secondary} />
          <Text style={styles.dateBtnText}>{settings.start_date}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>End date</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setDateField('end')}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.secondary} />
          <Text style={styles.dateBtnText}>{settings.end_date}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>On-time sign-in by</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setTimeField('signIn')}>
          <Ionicons name="time-outline" size={16} color={theme.colors.secondary} />
          <Text style={styles.dateBtnText}>{timeInputValue(settings.expected_sign_in_time)}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Expected sign-out (early if before)</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setTimeField('signOut')}>
          <Ionicons name="time-outline" size={16} color={theme.colors.secondary} />
          <Text style={styles.dateBtnText}>{timeInputValue(settings.expected_sign_out_time)}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Closed / holiday dates</Text>
        <Text style={styles.cardDesc}>Weekdays when camp is closed — not counted as missing</Text>

        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setDateField('closed')}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.secondary} />
          <Text style={styles.dateBtnText}>{newClosedDate || 'Pick a date'}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Label (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="July 4"
          value={newClosedLabel}
          onChangeText={setNewClosedLabel}
        />

        <TouchableOpacity style={styles.addBtn} onPress={addClosedDate}>
          <Ionicons name="add" size={18} color={theme.colors.secondary} />
          <Text style={styles.addBtnText}>Add closed date</Text>
        </TouchableOpacity>

        {closedDates.length === 0 ? (
          <Text style={styles.emptyText}>No closed dates added.</Text>
        ) : (
          closedDates.map((row) => (
            <View key={row.closed_date} style={styles.closedRow}>
              <Text style={styles.closedRowText}>
                {format(parseISO(row.closed_date), 'EEE, MMM d, yyyy')}
                {row.label ? ` · ${row.label}` : ''}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setClosedDates((prev) => prev.filter((d) => d.closed_date !== row.closed_date))
                }
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={() => void handleSave()} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Save season settings</Text>
          </>
        )}
      </TouchableOpacity>

      {dateField ? (
        <DateTimePicker
          value={datePickerValue()}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      ) : null}

      {timeField ? (
        <DateTimePicker
          value={timeFromHm(
            timeField === 'signIn'
              ? timeInputValue(settings.expected_sign_in_time)
              : timeInputValue(settings.expected_sign_out_time),
          )}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: theme.spacing.md, paddingBottom: 32, gap: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  loadingText: { fontSize: 13, color: theme.colors.textSecondary },
  banner: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: theme.borderRadius.md,
    padding: 12,
  },
  bannerText: { fontSize: 13, color: '#92400e' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  cardDesc: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 4 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
  },
  dateBtnText: { fontSize: 14, color: theme.colors.text },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    fontSize: 14,
    backgroundColor: theme.colors.background,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginTop: 4,
  },
  addBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.secondary },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 8 },
  closedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  closedRowText: { flex: 1, fontSize: 13, color: theme.colors.text },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.md,
    padding: 14,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
