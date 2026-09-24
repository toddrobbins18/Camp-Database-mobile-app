import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import {
  loadStaffTimeClockForDate,
  processStaffTimeClockScan,
  staffTimeClockWorkDate,
} from '../lib/staffTimeClock';

export function StaffTimeClockScreen({ navigation }: { navigation: any }) {
  const { companyId, season } = useCompany();
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [lastPunch, setLastPunch] = useState<{ name: string; action: 'in' | 'out'; at: string } | null>(null);
  const inputRef = useRef<TextInput>(null);
  const workDate = staffTimeClockWorkDate();

  const refresh = useCallback(async () => {
    if (!companyId || !season) return;
    const data = await loadStaffTimeClockForDate(supabase, companyId, season, workDate);
    setRows(data);
  }, [companyId, season, workDate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const handleScan = async (value?: string) => {
    const raw = (value ?? scanInput).trim();
    if (!raw || !companyId || !season) return;
    setScanning(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const result = await processStaffTimeClockScan(supabase, {
        rawScan: raw,
        companyId,
        season,
        userId: userRes.user?.id,
        workDate,
      });
      if (!result.ok) {
        Alert.alert('Scan failed', result.message);
      } else {
        setLastPunch({ name: result.staffName, action: result.action, at: result.at });
        Alert.alert(
          result.action === 'in' ? 'Signed in' : 'Signed out',
          `${result.staffName} · ${format(new Date(result.at), 'h:mm a')}`,
        );
        await refresh();
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setScanInput('');
      setScanning(false);
      inputRef.current?.focus();
    }
  };

  const signedIn = rows.filter((r) => r.signed_in_at && !r.signed_out_at).length;
  const completed = rows.filter((r) => r.signed_in_at && r.signed_out_at).length;
  const formattedDate = format(new Date(`${workDate}T12:00:00`), 'EEEE, MMMM d, yyyy');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Staff Time Clock</Text>
          <Text style={styles.subtitle}>
            Scan QR badge or wristband · {formattedDate} · auto sign-out 4:15 PM
          </Text>
        </View>
        <TouchableOpacity onPress={() => void refresh()}>
          <Ionicons name="refresh" size={22} color={theme.colors.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Signed in now</Text>
          <Text style={[styles.statValue, styles.statValueGreen]}>{signedIn}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Completed today</Text>
          <Text style={styles.statValue}>{completed}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total punches</Text>
          <Text style={styles.statValue}>{rows.length}</Text>
        </View>
      </View>

      {lastPunch ? (
        <View style={styles.lastPunchCard}>
          <Ionicons
            name={lastPunch.action === 'in' ? 'log-in-outline' : 'log-out-outline'}
            size={22}
            color="#15803d"
          />
          <View style={styles.lastPunchText}>
            <Text style={styles.lastPunchName}>{lastPunch.name}</Text>
            <Text style={styles.lastPunchMeta}>
              {lastPunch.action === 'in' ? 'Signed in' : 'Signed out'} at{' '}
              {format(new Date(lastPunch.at), 'h:mm a')}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.scanBox}>
        <View style={styles.scanTitleRow}>
          <Ionicons name="qr-code-outline" size={18} color={theme.colors.text} />
          <Text style={styles.scanTitle}>Scan badge</Text>
        </View>
        <TextInput
          ref={inputRef}
          style={styles.scanInput}
          value={scanInput}
          onChangeText={setScanInput}
          placeholder="Scan QR code or wristband…"
          onSubmitEditing={() => void handleScan()}
          editable={!scanning}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.scanHint}>
          QR badge · RFID wristband · First scan = in · Second scan = out
        </Text>
        <TouchableOpacity style={styles.scanBtn} onPress={() => void handleScan()} disabled={scanning}>
          {scanning ? <ActivityIndicator color="#fff" /> : <Text style={styles.scanBtnText}>Submit scan</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.logTitle}>Today&apos;s log</Text>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {rows.length === 0 ? (
          <Text style={styles.emptyLog}>No punches yet today.</Text>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={styles.row}>
              <Text style={styles.rowName}>{row.staff?.name ?? 'Staff'}</Text>
              <View style={styles.badgeRow}>
                {row.signed_in_at ? (
                  <View style={styles.badge}>
                    <Ionicons name="log-in-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.badgeText}>
                      In {format(new Date(row.signed_in_at), 'h:mm a')}
                      {row.sign_in_method ? ` · ${row.sign_in_method}` : ''}
                    </Text>
                  </View>
                ) : null}
                {row.signed_out_at ? (
                  <View style={[styles.badge, row.auto_signed_out && styles.badgeAuto]}>
                    <Ionicons name="log-out-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.badgeText}>
                      Out {format(new Date(row.signed_out_at), 'h:mm a')}
                      {row.auto_signed_out ? ' · auto' : row.sign_out_method ? ` · ${row.sign_out_method}` : ''}
                    </Text>
                  </View>
                ) : row.signed_in_at ? (
                  <View style={[styles.badge, styles.badgeOnSite]}>
                    <Text style={styles.badgeOnSiteText}>On site</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  headerText: { flex: 1 },
  title: { ...theme.typography.h2, fontSize: 20 },
  subtitle: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: theme.spacing.md, marginBottom: 8 },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary },
  statValue: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  statValueGreen: { color: '#15803d' },
  lastPunchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: theme.spacing.md,
    marginBottom: 8,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  lastPunchText: { flex: 1 },
  lastPunchName: { fontWeight: '700', color: theme.colors.text },
  lastPunchMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  scanBox: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: 8,
    gap: 8,
  },
  scanTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scanTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  scanInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
  },
  scanHint: { fontSize: 11, color: theme.colors.textSecondary },
  scanBtn: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    alignItems: 'center',
  },
  scanBtnText: { color: '#fff', fontWeight: '600' },
  logTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    marginBottom: 4,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: theme.spacing.md, paddingBottom: 24 },
  emptyLog: { fontSize: 13, color: theme.colors.textSecondary, paddingVertical: 12 },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowName: { fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  badgeAuto: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, color: theme.colors.textSecondary },
  badgeOnSite: { backgroundColor: '#15803d', borderColor: '#15803d' },
  badgeOnSiteText: { fontSize: 11, color: '#fff', fontWeight: '600' },
});
