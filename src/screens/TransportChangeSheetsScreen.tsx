import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { File, Paths } from 'expo-file-system';
import { theme } from '../theme/theme';
import { FrontOfficeBackButton } from '../components/FrontOfficeBackButton';
import { supabase } from '../lib/supabase';
import { useTransportBoardSnapshot } from '../hooks/useTransportBoardSnapshot';
import {
  fetchTransportExceptions,
  loadManualOverrides,
  todayDateString,
  type TransportRunPeriod,
} from '../lib/transportDailyOverrides';
import {
  buildApprovedChangeSheetRows,
  changeSheetRowsToCsv,
  type TransportChangeSheetRow,
} from '../lib/transportChangeSheets';

function ymdFromDate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

function dateFromYmd(ymd: string) {
  return new Date(`${ymd}T12:00:00`);
}

export function TransportChangeSheetsScreen({ navigation }: { navigation: any }) {
  const { routeMeta, coreStops, loading: boardLoading, companyId, season } =
    useTransportBoardSnapshot();
  const [sheetDate, setSheetDate] = useState(todayDateString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [runPeriod, setRunPeriod] = useState<TransportRunPeriod>('am');
  const [selectedRouteIds, setSelectedRouteIds] = useState<number[]>([]);
  const [rows, setRows] = useState<TransportChangeSheetRow[]>([]);
  const [loadingSheet, setLoadingSheet] = useState(false);

  const allSelected = selectedRouteIds.length === 0 || selectedRouteIds.length === routeMeta.length;

  const toggleRoute = (routeId: number) => {
    setSelectedRouteIds((prev) =>
      prev.includes(routeId) ? prev.filter((id) => id !== routeId) : [...prev, routeId],
    );
  };

  const selectAllRoutes = () => setSelectedRouteIds([]);
  const clearRoutes = () => setSelectedRouteIds([]);

  const loadSheet = useCallback(async () => {
    if (!companyId || !season) return;
    setLoadingSheet(true);
    try {
      const [exceptions, manual] = await Promise.all([
        fetchTransportExceptions(supabase, companyId, sheetDate),
        loadManualOverrides(supabase, companyId, season, sheetDate),
      ]);
      const built = buildApprovedChangeSheetRows({
        overrideDate: sheetDate,
        runPeriod,
        exceptions,
        manual,
        routeMeta,
        coreStops,
        selectedRouteIds: allSelected ? [] : selectedRouteIds,
      });
      setRows(built.filter((r) => !r.camper.startsWith('(No transport')));
    } finally {
      setLoadingSheet(false);
    }
  }, [
    allSelected,
    companyId,
    coreStops,
    routeMeta,
    runPeriod,
    season,
    selectedRouteIds,
    sheetDate,
  ]);

  useEffect(() => {
    if (!boardLoading) void loadSheet();
  }, [boardLoading, loadSheet]);

  const routeLabel = useMemo(() => {
    if (allSelected) return 'All routes';
    if (selectedRouteIds.length === 1) {
      const r = routeMeta.find((x) => x.id === selectedRouteIds[0]);
      return r ? `${r.bus} · ${r.name}` : '1 route';
    }
    return `${selectedRouteIds.length} routes`;
  }, [allSelected, routeMeta, selectedRouteIds]);

  const shareSheet = async () => {
    const csv = changeSheetRowsToCsv(rows);
    const filename = `transport-change-sheet-${sheetDate}-${runPeriod}.csv`;
    const file = new File(Paths.cache, filename);
    if (file.exists) file.delete();
    file.create({ overwrite: true });
    file.write(csv);
    await Share.share({ url: file.uri, title: filename, message: csv });
  };

  const isToday = sheetDate === todayDateString();

  return (
    <SafeAreaView style={styles.container}>
      <FrontOfficeBackButton navigation={navigation} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Change Sheets</Text>
          <Text style={styles.subtitle}>Approved daily changes for drivers</Text>
        </View>
        <TouchableOpacity
          style={[styles.shareBtn, rows.length === 0 && styles.shareBtnDisabled]}
          onPress={() => void shareSheet()}
          disabled={rows.length === 0}
        >
          <Ionicons name="share-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.secondary} />
          <Text style={styles.dateText}>{sheetDate}</Text>
          {isToday ? <Text style={styles.todayBadge}>Today</Text> : null}
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

      <View style={styles.routeHeader}>
        <Text style={styles.routeHeaderText}>Routes: {routeLabel}</Text>
        <View style={styles.routeActions}>
          <TouchableOpacity onPress={selectAllRoutes}>
            <Text style={styles.linkText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearRoutes}>
            <Text style={styles.linkText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routeScroll}>
        {routeMeta.map((r) => {
          const active = allSelected || selectedRouteIds.includes(r.id);
          return (
            <TouchableOpacity
              key={r.id}
              style={[
                styles.routeChip,
                active && styles.routeChipActive,
                { borderLeftColor: r.color },
              ]}
              onPress={() => toggleRoute(r.id)}
            >
              <Text style={[styles.routeChipText, active && styles.routeChipTextActive]}>
                {r.bus}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {rows.length} approved change{rows.length === 1 ? '' : 's'} · Season {season}
        </Text>
        <TouchableOpacity style={styles.pendingLink} onPress={() => navigation.navigate('DayCampModule', { moduleId: 'pending-transport-changes' })}>
          <Text style={styles.pendingLinkText}>View pending →</Text>
        </TouchableOpacity>
      </View>

      {boardLoading || loadingSheet ? (
        <ActivityIndicator size="large" color={theme.colors.secondary} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView style={styles.list}>
          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={40} color={theme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>No approved changes</Text>
              <Text style={styles.emptySub}>
                Try another date or route filter. Pending items are on the Pending Changes screen.
              </Text>
            </View>
          ) : (
            rows.map((row, i) => (
              <View key={`${row.camper}-${row.source}-${i}`} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardCamper}>{row.camper}</Text>
                  <View style={styles.approvedBadge}>
                    <Text style={styles.approvedBadgeText}>Approved</Text>
                  </View>
                </View>
                <Text style={styles.cardSource}>{row.source}</Text>
                <Text style={styles.cardDesc}>{row.description}</Text>
                <View style={styles.cardMeta}>
                  {row.bus ? (
                    <Text style={styles.metaItem}>
                      {row.bus}
                      {row.route ? ` · ${row.route}` : ''}
                    </Text>
                  ) : null}
                  {row.stop ? <Text style={styles.metaItem}>{row.stop}</Text> : null}
                  {row.notes ? <Text style={styles.metaNotes}>{row.notes}</Text> : null}
                </View>
              </View>
            ))
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
  shareBtn: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnDisabled: { opacity: 0.4 },
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
  runToggle: { flexDirection: 'row', gap: 4 },
  runBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  runBtnActive: { backgroundColor: theme.colors.secondary + '18', borderColor: theme.colors.secondary },
  runBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  runBtnTextActive: { color: theme.colors.secondary },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  routeHeaderText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  routeActions: { flexDirection: 'row', gap: 12 },
  linkText: { fontSize: 12, color: theme.colors.secondary, fontWeight: '600' },
  routeScroll: { maxHeight: 44, marginTop: 6, paddingHorizontal: theme.spacing.md },
  routeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 3,
  },
  routeChipActive: { backgroundColor: theme.colors.secondary + '12', borderColor: theme.colors.secondary },
  routeChipText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },
  routeChipTextActive: { color: theme.colors.secondary, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: 4,
  },
  statsText: { fontSize: 11, color: theme.colors.textSecondary },
  pendingLink: { paddingVertical: 4 },
  pendingLinkText: { fontSize: 11, color: theme.colors.secondary, fontWeight: '600' },
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
    borderColor: theme.colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardCamper: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flex: 1 },
  approvedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  approvedBadgeText: { fontSize: 10, fontWeight: '700', color: '#166534' },
  cardSource: { fontSize: 11, color: theme.colors.secondary, fontWeight: '600', marginTop: 4 },
  cardDesc: { fontSize: 13, color: theme.colors.text, marginTop: 2 },
  cardMeta: { marginTop: 6, gap: 2 },
  metaItem: { fontSize: 12, color: theme.colors.textSecondary },
  metaNotes: { fontSize: 12, color: theme.colors.text, fontStyle: 'italic' },
});
