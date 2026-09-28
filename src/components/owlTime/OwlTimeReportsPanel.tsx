import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { theme } from '../../theme/theme';
import { supabase } from '../../lib/supabase';
import { OwlTimeExportModal } from './OwlTimeExportModal';
import {
  buildAttendanceDetail,
  buildAttendanceSummary,
  buildDailyRollCall,
  buildSignInOutHistory,
  formatOwlTimeCampClock,
  indexPunchesByDateForStaff,
  indexPunchesByStaffDate,
  listScheduledWorkDays,
  loadOwlTimeClosedDates,
  loadOwlTimeSeasonSettings,
  loadSeasonPunches,
  loadSeasonStaff,
  resolveReportDays,
  type DayAttendanceStatus,
  type OwlTimeReportDateMode,
  type OwlTimeSeasonSettings,
} from '../../lib/owlTimeAttendance';
import {
  buildDailyRollCallDataset,
  buildDetailDataset,
  buildHistoryDataset,
  buildSummaryDataset,
  type OwlTimeReportDataset,
} from '../../lib/owlTimeReportExport';

type Props = {
  companyId: string;
  season: string;
  settingsVersion?: number;
};

type StatusFilter = 'all' | DayAttendanceStatus;
type ReportTab = 'daily' | 'summary' | 'detail' | 'history';
type DatePickerKind = 'from' | 'to' | 'day' | null;

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

function dateLabelForExport(
  mode: OwlTimeReportDateMode,
  rangeFrom: string,
  rangeTo: string,
  singleDay: string,
): string {
  if (mode === 'day') return singleDay;
  if (mode === 'range') return `${rangeFrom}_to_${rangeTo}`;
  return 'full-season';
}

function StatusBadge({ status }: { status: DayAttendanceStatus }) {
  const bg =
    status === 'on_time' ? '#15803d' : status === 'late' ? theme.colors.danger : '#6b7280';
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={styles.statusBadgeText}>
        {status === 'on_time' ? 'On Time' : status === 'late' ? 'Late' : 'Missing'}
      </Text>
    </View>
  );
}

function StaffPickerModal({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
  includeAll,
}: {
  visible: boolean;
  title: string;
  options: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  includeAll?: boolean;
}) {
  const items = includeAll ? [{ id: 'all', name: 'All staff' }, ...options] : options;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.pickerModal}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.pickerRow, selectedId === item.id && styles.pickerRowSelected]}
              onPress={() => {
                onSelect(item.id);
                onClose();
              }}
            >
              <Text style={styles.pickerRowText}>{item.name}</Text>
              {selectedId === item.id ? (
                <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
              ) : null}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

export function OwlTimeReportsPanel({ companyId, season, settingsVersion = 0 }: Props) {
  const [settings, setSettings] = useState<OwlTimeSeasonSettings | null>(null);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loading, setLoading] = useState(true);

  const [dateMode, setDateMode] = useState<OwlTimeReportDateMode>('season');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [singleDay, setSingleDay] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [summaryStaffFilter, setSummaryStaffFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportDataset, setExportDataset] = useState<OwlTimeReportDataset | null>(null);
  const [datePicker, setDatePicker] = useState<DatePickerKind>(null);
  const [staffPicker, setStaffPicker] = useState<'summary' | 'detail' | null>(null);

  const openExport = (dataset: OwlTimeReportDataset) => {
    setExportDataset(dataset);
    setExportOpen(true);
  };

  useEffect(() => {
    if (dateMode === 'day') {
      setActiveTab('daily');
    } else if (activeTab === 'daily') {
      setActiveTab('summary');
    }
  }, [dateMode, activeTab]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [loadedSettings, loadedClosed, loadedStaff] = await Promise.all([
      loadOwlTimeSeasonSettings(supabase, companyId, season),
      loadOwlTimeClosedDates(supabase, companyId, season),
      loadSeasonStaff(supabase, companyId, season),
    ]);

    setSettings(loadedSettings);
    setClosedDates(loadedClosed.map((d) => d.closed_date));
    setStaff(loadedStaff);
    setSelectedStaffId((prev) =>
      prev && loadedStaff.some((s) => s.id === prev) ? prev : loadedStaff[0]?.id ?? '',
    );
    setRangeFrom(loadedSettings.start_date);
    setRangeTo(loadedSettings.end_date);
    setSingleDay(loadedSettings.start_date);
    setLoading(false);
  }, [companyId, season]);

  useEffect(() => {
    void refresh();
  }, [refresh, settingsVersion]);

  const allScheduledDays = useMemo(() => {
    if (!settings) return [];
    return listScheduledWorkDays(settings.start_date, settings.end_date, closedDates);
  }, [settings, closedDates]);

  const filteredDays = useMemo(
    () => resolveReportDays(allScheduledDays, dateMode, rangeFrom, rangeTo, singleDay),
    [allScheduledDays, dateMode, rangeFrom, rangeTo, singleDay],
  );

  const exportDateLabel = dateLabelForExport(dateMode, rangeFrom, rangeTo, singleDay);

  const [punches, setPunches] = useState<Awaited<ReturnType<typeof loadSeasonPunches>>>([]);

  useEffect(() => {
    if (!settings) return;
    void loadSeasonPunches(
      supabase,
      companyId,
      season,
      settings.start_date,
      settings.end_date,
    ).then(setPunches);
  }, [companyId, season, settings, settingsVersion]);

  const punchesByStaffDate = useMemo(() => indexPunchesByStaffDate(punches), [punches]);

  const summaryRows = useMemo(() => {
    if (!settings) return [];
    const rows = buildAttendanceSummary(staff, filteredDays, punchesByStaffDate, settings);
    if (summaryStaffFilter === 'all') return rows;
    return rows.filter((row) => row.staffId === summaryStaffFilter);
  }, [staff, filteredDays, punchesByStaffDate, settings, summaryStaffFilter]);

  const dailyRollCallRows = useMemo(() => {
    if (!settings || dateMode !== 'day' || !singleDay) return [];
    return buildDailyRollCall(staff, singleDay, punchesByStaffDate, settings.expected_sign_in_time);
  }, [staff, dateMode, singleDay, punchesByStaffDate, settings]);

  const filteredDailyRollCallRows = useMemo(() => {
    if (statusFilter === 'all') return dailyRollCallRows;
    return dailyRollCallRows.filter((row) => row.status === statusFilter);
  }, [dailyRollCallRows, statusFilter]);

  const selectedStaff = staff.find((s) => s.id === selectedStaffId);

  const detailRows = useMemo(() => {
    if (!settings || !selectedStaffId) return [];
    const byDate = indexPunchesByDateForStaff(punches, selectedStaffId);
    return buildAttendanceDetail(filteredDays, byDate, settings.expected_sign_in_time);
  }, [settings, selectedStaffId, punches, filteredDays]);

  const filteredDetailRows = useMemo(() => {
    if (statusFilter === 'all') return detailRows;
    return detailRows.filter((row) => row.status === statusFilter);
  }, [detailRows, statusFilter]);

  const historyRows = useMemo(() => {
    if (!settings || !selectedStaffId) return [];
    const byDate = indexPunchesByDateForStaff(punches, selectedStaffId);
    return buildSignInOutHistory(filteredDays, byDate, settings);
  }, [settings, selectedStaffId, punches, filteredDays]);

  const filterDescription = useMemo(() => {
    if (dateMode === 'season') return 'Full season';
    if (dateMode === 'day' && singleDay) {
      return format(parseISO(singleDay), 'EEEE, MMM d, yyyy');
    }
    if (rangeFrom && rangeTo) {
      return `${format(parseISO(rangeFrom), 'MMM d')} – ${format(parseISO(rangeTo), 'MMM d, yyyy')}`;
    }
    return 'Custom range';
  }, [dateMode, singleDay, rangeFrom, rangeTo]);

  const currentExportDataset = useMemo((): OwlTimeReportDataset | null => {
    if (!settings) return null;
    if (activeTab === 'daily') {
      return buildDailyRollCallDataset(filteredDailyRollCallRows, season, singleDay, filterDescription);
    }
    if (activeTab === 'summary') {
      return buildSummaryDataset(summaryRows, season, exportDateLabel, filterDescription);
    }
    if (activeTab === 'detail') {
      return buildDetailDataset(
        filteredDetailRows,
        selectedStaff?.name ?? 'Staff',
        season,
        exportDateLabel,
        filterDescription,
      );
    }
    if (activeTab === 'history') {
      return buildHistoryDataset(
        historyRows,
        selectedStaff?.name ?? 'Staff',
        season,
        exportDateLabel,
        filterDescription,
      );
    }
    return null;
  }, [
    settings,
    activeTab,
    filteredDailyRollCallRows,
    season,
    singleDay,
    filterDescription,
    summaryRows,
    exportDateLabel,
    filteredDetailRows,
    selectedStaff?.name,
    historyRows,
  ]);

  const datePickerValue = (): Date => {
    if (datePicker === 'from') return dateFromYmd(rangeFrom || (settings?.start_date ?? ''));
    if (datePicker === 'to') return dateFromYmd(rangeTo || (settings?.end_date ?? ''));
    if (datePicker === 'day') return dateFromYmd(singleDay || (settings?.start_date ?? ''));
    return new Date();
  };

  const onDateChange = (_: unknown, d?: Date) => {
    if (Platform.OS === 'android') setDatePicker(null);
    if (!d) return;
    const ymd = ymdFromDate(d);
    if (datePicker === 'from') setRangeFrom(ymd);
    if (datePicker === 'to') setRangeTo(ymd);
    if (datePicker === 'day') setSingleDay(ymd);
  };

  if (loading || !settings) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.secondary} />
        <Text style={styles.loadingText}>Loading reports…</Text>
      </View>
    );
  }

  const summaryStaffLabel =
    summaryStaffFilter === 'all'
      ? 'All staff'
      : staff.find((s) => s.id === summaryStaffFilter)?.name ?? 'Staff';

  const reportTabs: { id: ReportTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    ...(dateMode === 'day' ? [{ id: 'daily' as const, label: 'By Day', icon: 'people-outline' as const }] : []),
    { id: 'summary', label: 'Summary', icon: 'bar-chart-outline' },
    { id: 'detail', label: 'Detail', icon: 'list-outline' },
    { id: 'history', label: 'Sign-In/Out', icon: 'time-outline' },
  ];

  return (
    <View style={styles.container}>
      <OwlTimeExportModal
        visible={exportOpen}
        onClose={() => setExportOpen(false)}
        dataset={exportDataset}
      />

      <StaffPickerModal
        visible={staffPicker === 'summary'}
        title="Filter by staff"
        options={staff}
        selectedId={summaryStaffFilter}
        includeAll
        onSelect={setSummaryStaffFilter}
        onClose={() => setStaffPicker(null)}
      />
      <StaffPickerModal
        visible={staffPicker === 'detail'}
        title="Select staff"
        options={staff}
        selectedId={selectedStaffId}
        onSelect={setSelectedStaffId}
        onClose={() => setStaffPicker(null)}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.seasonInfo}>
          Season {season}: {format(parseISO(settings.start_date), 'MMM d')} –{' '}
          {format(parseISO(settings.end_date), 'MMM d, yyyy')} · {allScheduledDays.length} work days ·
          on-time by {settings.expected_sign_in_time.slice(0, 5)}
        </Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Filters</Text>
              <Text style={styles.cardDesc}>
                {filteredDays.length} work day{filteredDays.length !== 1 ? 's' : ''} · {filterDescription}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.exportBtn, !currentExportDataset?.rows.length && styles.exportBtnDisabled]}
              disabled={!currentExportDataset?.rows.length}
              onPress={() => currentExportDataset && openExport(currentExportDataset)}
            >
              <Ionicons name="download-outline" size={16} color="#fff" />
              <Text style={styles.exportBtnText}>Export</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Date filter</Text>
          <View style={styles.chipRow}>
            {(['season', 'range', 'day'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.chip, dateMode === mode && styles.chipActive]}
                onPress={() => setDateMode(mode)}
              >
                <Text style={[styles.chipText, dateMode === mode && styles.chipTextActive]}>
                  {mode === 'season' ? 'Full season' : mode === 'range' ? 'Date range' : 'Single day'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {dateMode === 'range' ? (
            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setDatePicker('from')}>
                <Text style={styles.dateBtnLabel}>From</Text>
                <Text style={styles.dateBtnValue}>{rangeFrom}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setDatePicker('to')}>
                <Text style={styles.dateBtnLabel}>To</Text>
                <Text style={styles.dateBtnValue}>{rangeTo}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {dateMode === 'day' ? (
            <TouchableOpacity style={styles.dateBtnFull} onPress={() => setDatePicker('day')}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.secondary} />
              <Text style={styles.dateBtnValue}>{singleDay}</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.chipRow}>
            {(['all', 'on_time', 'late', 'missing'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.chip, statusFilter === status && styles.chipActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[styles.chipText, statusFilter === status && styles.chipTextActive]}>
                  {status === 'all'
                    ? 'All'
                    : status === 'on_time'
                      ? 'On time'
                      : status === 'late'
                        ? 'Late'
                        : 'Missing'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {reportTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.reportTab, activeTab === tab.id && styles.reportTabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={activeTab === tab.id ? '#fff' : theme.colors.textSecondary}
              />
              <Text style={[styles.reportTabText, activeTab === tab.id && styles.reportTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {activeTab === 'daily' && dateMode === 'day' ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Daily Roll Call</Text>
                <Text style={styles.cardDesc}>{filterDescription}</Text>
              </View>
              <TouchableOpacity
                style={styles.exportOutlineBtn}
                disabled={filteredDailyRollCallRows.length === 0}
                onPress={() =>
                  openExport(
                    buildDailyRollCallDataset(filteredDailyRollCallRows, season, singleDay, filterDescription),
                  )
                }
              >
                <Ionicons name="download-outline" size={14} color={theme.colors.secondary} />
              </TouchableOpacity>
            </View>
            {filteredDailyRollCallRows.length === 0 ? (
              <Text style={styles.emptyText}>
                {allScheduledDays.includes(singleDay)
                  ? 'No staff match this filter.'
                  : 'Selected date is not a scheduled work day.'}
              </Text>
            ) : (
              filteredDailyRollCallRows.map((row) => (
                <View key={row.staffId} style={styles.dataRow}>
                  <Text style={styles.dataRowTitle}>{row.staffName}</Text>
                  <View style={styles.dataRowMeta}>
                    <Text style={styles.dataRowSub}>
                      {row.signedInAt ? formatOwlTimeCampClock(row.signedInAt) : '—'}
                    </Text>
                    <StatusBadge status={row.status} />
                    {row.status === 'late' ? (
                      <Text style={styles.lateMeta}>+{row.minutesLate} min</Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {activeTab === 'summary' ? (
          <View style={styles.card}>
            <TouchableOpacity style={styles.staffSelect} onPress={() => setStaffPicker('summary')}>
              <Text style={styles.staffSelectLabel}>Staff</Text>
              <Text style={styles.staffSelectValue}>{summaryStaffLabel}</Text>
              <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Attendance Summary</Text>
                <Text style={styles.cardDesc}>
                  {filterDescription} · {season}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.exportOutlineBtn}
                disabled={summaryRows.length === 0}
                onPress={() =>
                  openExport(buildSummaryDataset(summaryRows, season, exportDateLabel, filterDescription))
                }
              >
                <Ionicons name="download-outline" size={14} color={theme.colors.secondary} />
              </TouchableOpacity>
            </View>
            {summaryRows.length === 0 ? (
              <Text style={styles.emptyText}>No staff in roster for this season.</Text>
            ) : (
              summaryRows.map((row) => (
                <View key={row.staffId} style={styles.summaryRow}>
                  <Text style={styles.dataRowTitle}>{row.staffName}</Text>
                  <View style={styles.summaryGrid}>
                    <Text style={styles.summaryStat}>Scheduled: {row.scheduledDays}</Text>
                    <Text style={styles.summaryStat}>Signed in: {row.daysSignedIn}</Text>
                    <Text style={styles.summaryStat}>Missing: {row.daysMissing}</Text>
                    <Text style={styles.summaryStat}>Late: {row.daysLate}</Text>
                    <Text style={styles.summaryStat}>On time: {row.daysOnTime}</Text>
                    <Text style={styles.summaryStat}>Attendance: {row.attendancePct}%</Text>
                    <Text style={styles.summaryStat}>Min late: {row.totalMinutesLate}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {activeTab === 'detail' ? (
          <View style={styles.card}>
            <TouchableOpacity style={styles.staffSelect} onPress={() => setStaffPicker('detail')}>
              <Text style={styles.staffSelectLabel}>Staff</Text>
              <Text style={styles.staffSelectValue}>{selectedStaff?.name ?? 'Select staff'}</Text>
              <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Attendance Detail</Text>
                <Text style={styles.cardDesc}>
                  {selectedStaff?.name ?? 'Staff'} · {filterDescription}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.exportOutlineBtn}
                disabled={filteredDetailRows.length === 0}
                onPress={() =>
                  openExport(
                    buildDetailDataset(
                      filteredDetailRows,
                      selectedStaff?.name ?? 'Staff',
                      season,
                      exportDateLabel,
                      filterDescription,
                    ),
                  )
                }
              >
                <Ionicons name="download-outline" size={14} color={theme.colors.secondary} />
              </TouchableOpacity>
            </View>
            {filteredDetailRows.length === 0 ? (
              <Text style={styles.emptyText}>No days match this filter.</Text>
            ) : (
              filteredDetailRows.map((row) => (
                <View key={row.date} style={styles.dataRow}>
                  <Text style={styles.dataRowTitle}>{format(parseISO(row.date), 'EEE, MMM d')}</Text>
                  <View style={styles.dataRowMeta}>
                    <Text style={styles.dataRowSub}>
                      {row.signedInAt ? formatOwlTimeCampClock(row.signedInAt) : '—'}
                    </Text>
                    <StatusBadge status={row.status} />
                    {row.status === 'late' ? (
                      <Text style={styles.lateMeta}>+{row.minutesLate} min</Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {activeTab === 'history' ? (
          <View style={styles.card}>
            <TouchableOpacity style={styles.staffSelect} onPress={() => setStaffPicker('detail')}>
              <Text style={styles.staffSelectLabel}>Staff</Text>
              <Text style={styles.staffSelectValue}>{selectedStaff?.name ?? 'Select staff'}</Text>
              <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Sign-In/Out History</Text>
                <Text style={styles.cardDesc}>
                  {selectedStaff?.name ?? 'Staff'} · {filterDescription}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.exportOutlineBtn}
                disabled={historyRows.length === 0}
                onPress={() =>
                  openExport(
                    buildHistoryDataset(
                      historyRows,
                      selectedStaff?.name ?? 'Staff',
                      season,
                      exportDateLabel,
                      filterDescription,
                    ),
                  )
                }
              >
                <Ionicons name="download-outline" size={14} color={theme.colors.secondary} />
              </TouchableOpacity>
            </View>
            {historyRows.length === 0 ? (
              <Text style={styles.emptyText}>No sign-ins recorded for this filter.</Text>
            ) : (
              historyRows.map((row) => (
                <View key={row.date} style={styles.historyRow}>
                  <Text style={styles.dataRowTitle}>{format(parseISO(row.date), 'EEE, MMM d')}</Text>
                  <Text style={styles.historyLine}>
                    In: {row.signedInAt ? formatOwlTimeCampClock(row.signedInAt) : '—'} · Out:{' '}
                    {row.signedOutAt ? formatOwlTimeCampClock(row.signedOutAt) : '—'}
                  </Text>
                  <Text style={styles.historyLine}>
                    Hours: {row.totalHours != null ? row.totalHours.toFixed(2) : '—'} · Late:{' '}
                    {row.isLate ? `Yes (+${row.minutesLate}m)` : 'No'} · Early:{' '}
                    {row.isEarlyDeparture ? 'Yes' : 'No'}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>

      {datePicker ? (
        <DateTimePicker
          value={datePickerValue()}
          mode="date"
          display="default"
          minimumDate={dateFromYmd(settings.start_date)}
          maximumDate={dateFromYmd(settings.end_date)}
          onChange={onDateChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: theme.spacing.md, paddingBottom: 32, gap: 12 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  loadingText: { fontSize: 13, color: theme.colors.textSecondary },
  seasonInfo: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  cardDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
  },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  exportOutlineBtn: {
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  chipActive: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  chipText: { fontSize: 12, color: theme.colors.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateBtn: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
  },
  dateBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
  },
  dateBtnLabel: { fontSize: 11, color: theme.colors.textSecondary },
  dateBtnValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  tabScroll: { marginHorizontal: -4 },
  reportTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  reportTabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  reportTabText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  reportTabTextActive: { color: '#fff' },
  staffSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
  },
  staffSelectLabel: { fontSize: 12, color: theme.colors.textSecondary },
  staffSelectValue: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.text },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, paddingVertical: 8 },
  dataRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  dataRowTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  dataRowMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dataRowSub: { fontSize: 13, color: theme.colors.textSecondary },
  lateMeta: { fontSize: 11, color: theme.colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  summaryRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  summaryStat: { fontSize: 12, color: theme.colors.textSecondary, width: '45%' },
  historyRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 4,
  },
  historyLine: { fontSize: 12, color: theme.colors.textSecondary },
  pickerModal: { flex: 1, backgroundColor: theme.colors.background },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pickerRowSelected: { backgroundColor: '#eff6ff' },
  pickerRowText: { fontSize: 15, color: theme.colors.text },
});
