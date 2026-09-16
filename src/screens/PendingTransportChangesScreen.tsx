import React, { useCallback, useEffect, useState } from 'react';
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
import { format } from 'date-fns';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useTransportBoardSnapshot } from '../hooks/useTransportBoardSnapshot';
import {
  fetchTransportExceptionsForReport,
  todayDateString,
  type TransportRunPeriod,
} from '../lib/transportDailyOverrides';
import { buildPendingChangeSheetRows, type TransportChangeSheetRow } from '../lib/transportChangeSheets';
import { CHANGE_TYPES } from '../constants/parentPortalConstants';

function ymdFromDate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

function dateFromYmd(ymd: string) {
  return new Date(`${ymd}T12:00:00`);
}

type PendingAction =
  | { kind: 'absence'; id: string; camper: string }
  | { kind: 'pickup'; id: string; camper: string; changeType: string };

export function PendingTransportChangesScreen({ navigation }: { navigation: any }) {
  const { routeMeta, coreStops, loading: boardLoading, companyId } = useTransportBoardSnapshot();
  const [sheetDate, setSheetDate] = useState(todayDateString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [runPeriod, setRunPeriod] = useState<TransportRunPeriod>('am');
  const [rows, setRows] = useState<TransportChangeSheetRow[]>([]);
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    if (!companyId) return;
    setLoadingSheet(true);
    try {
      const [exceptions, absenceRes, pickupRes] = await Promise.all([
        fetchTransportExceptionsForReport(supabase, companyId, sheetDate),
        supabase
          .from('absences')
          .select('id, status, children:camper_id(name)')
          .eq('company_id', companyId)
          .eq('absence_date', sheetDate)
          .eq('status', 'submitted'),
        supabase
          .from('pickup_changes')
          .select('id, status, change_type, children:camper_id(name)')
          .eq('company_id', companyId)
          .eq('change_date', sheetDate)
          .eq('status', 'submitted'),
      ]);

      const pendingActions: PendingAction[] = [];
      for (const row of absenceRes.data ?? []) {
        const name = (row as { children?: { name?: string } }).children?.name?.trim();
        if (name) pendingActions.push({ kind: 'absence', id: row.id, camper: name });
      }
      for (const row of pickupRes.data ?? []) {
        const name = (row as { children?: { name?: string } }).children?.name?.trim();
        const changeType = (row as { change_type?: string }).change_type ?? 'other';
        if (name) pendingActions.push({ kind: 'pickup', id: row.id, camper: name, changeType });
      }
      setActions(pendingActions);

      const built = buildPendingChangeSheetRows({
        overrideDate: sheetDate,
        runPeriod,
        exceptions,
        routeMeta,
        coreStops,
        selectedRouteIds: [],
      });
      setRows(built.filter((r) => !r.camper.startsWith('(No transport')));
    } finally {
      setLoadingSheet(false);
    }
  }, [companyId, coreStops, routeMeta, runPeriod, sheetDate]);

  useEffect(() => {
    if (!boardLoading) void loadPending();
  }, [boardLoading, loadPending]);

  const approve = async (action: PendingAction) => {
    setApproving(action.id);
    try {
      const table = action.kind === 'absence' ? 'absences' : 'pickup_changes';
      const { error } = await supabase
        .from(table)
        .update({ status: 'acknowledged' })
        .eq('id', action.id);
      if (error) {
        Alert.alert('Approve failed', error.message);
        return;
      }
      Alert.alert('Approved', `${action.camper} will appear on approved change sheets.`);
      await loadPending();
    } finally {
      setApproving(null);
    }
  };

  const findAction = (row: TransportChangeSheetRow): PendingAction | undefined =>
    actions.find((a) => {
      if (a.camper.toLowerCase() !== row.camper.toLowerCase()) return false;
      if (a.kind === 'absence') return row.source.toLowerCase().includes('absence');
      const label = CHANGE_TYPES.find((t) => t.v === a.changeType)?.l ?? a.changeType.replace(/_/g, ' ');
      return row.description.toLowerCase().includes(label.toLowerCase());
    });

  const isToday = sheetDate === todayDateString();
  const isFuture = sheetDate > todayDateString();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Pending Changes</Text>
          <Text style={styles.subtitle}>Awaiting approval — not on driver sheets yet</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.warning} />
          <Text style={styles.dateText}>{sheetDate}</Text>
          {isToday ? (
            <Text style={styles.todayBadge}>Today</Text>
          ) : isFuture ? (
            <Text style={styles.upcomingBadge}>Upcoming</Text>
          ) : null}
        </TouchableOpacity>
        <View style={styles.runToggle}>
          {(['am', 'pm'] as const).map((run) => (
            <TouchableOpacity
              key={run}
              style={[styles.runBtn, runPeriod === run && styles.runBtnActive]}
              onPress={() => setRunPeriod(run)}
            >
              <Text style={[styles.runBtnText, runPeriod === run && styles.runBtnTextActive]}>
                {run.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={dateFromYmd(sheetDate)}
          mode="date"
          display="default"
          onChange={(_, d) => {
            setShowDatePicker(false);
            if (d) setSheetDate(ymdFromDate(d));
          }}
        />
      )}

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>{rows.length} pending item{rows.length === 1 ? '' : 's'}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('DayCampModule', { moduleId: 'change-sheets' })}>
          <Text style={styles.linkText}>Approved sheets →</Text>
        </TouchableOpacity>
      </View>

      {boardLoading || loadingSheet ? (
        <ActivityIndicator size="large" color={theme.colors.warning} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView style={styles.list}>
          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={40} color={theme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>No pending changes</Text>
              <Text style={styles.emptySub}>
                Parent submissions and unconfirmed swim lessons for this date will appear here.
              </Text>
            </View>
          ) : (
            rows.map((row, i) => {
              const action = findAction(row);
              const canApprove = !!action;
              return (
                <View key={`${row.camper}-${row.source}-${i}`} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardCamper}>{row.camper}</Text>
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>Pending</Text>
                    </View>
                  </View>
                  <Text style={styles.cardSource}>{row.source}</Text>
                  <Text style={styles.cardDesc}>{row.description}</Text>
                  {row.notes ? <Text style={styles.metaNotes}>{row.notes}</Text> : null}
                  {canApprove ? (
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => void approve(action!)}
                      disabled={approving === action!.id}
                    >
                      {approving === action!.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.waitHint}>
                      {row.source.includes('Swim')
                        ? 'Waiting for parent confirmation on swim lesson'
                        : 'Approve in Portal Dashboard or here'}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  menuBtn: { padding: theme.spacing.xs },
  headerText: { flex: 1 },
  title: { ...theme.typography.h2, fontSize: 22 },
  subtitle: { ...theme.typography.bodySmall, marginTop: 2 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    gap: 8,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dateText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  todayBadge: { fontSize: 10, color: theme.colors.secondary, fontWeight: '600' },
  upcomingBadge: { fontSize: 10, color: theme.colors.warning, fontWeight: '600' },
  runToggle: { flexDirection: 'row', gap: 4 },
  runBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  runBtnActive: { backgroundColor: '#fef3c7', borderColor: theme.colors.warning },
  runBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  runBtnTextActive: { color: '#b45309' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: 4,
  },
  statsText: { fontSize: 11, color: theme.colors.textSecondary },
  linkText: { fontSize: 11, color: theme.colors.secondary, fontWeight: '600' },
  list: { flex: 1, paddingHorizontal: theme.spacing.md },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  emptySub: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardCamper: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flex: 1 },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingBadgeText: { fontSize: 10, fontWeight: '700', color: '#b45309' },
  cardSource: { fontSize: 11, color: theme.colors.warning, fontWeight: '600', marginTop: 4 },
  cardDesc: { fontSize: 13, color: theme.colors.text, marginTop: 2 },
  metaNotes: { fontSize: 12, color: theme.colors.text, fontStyle: 'italic', marginTop: 4 },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 8,
    marginTop: 10,
  },
  approveBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  waitHint: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 8, fontStyle: 'italic' },
});
