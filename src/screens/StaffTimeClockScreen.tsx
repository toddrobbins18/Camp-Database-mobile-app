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

  const handleScan = async () => {
    const raw = scanInput.trim();
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Staff Time Clock</Text>
          <Text style={styles.subtitle}>Auto sign-out 4:15 PM · {workDate}</Text>
        </View>
        <TouchableOpacity onPress={() => void refresh()}>
          <Ionicons name="refresh" size={22} color={theme.colors.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Signed in</Text>
          <Text style={styles.statValue}>{signedIn}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{rows.length}</Text>
        </View>
      </View>

      <View style={styles.scanBox}>
        <TextInput
          ref={inputRef}
          style={styles.scanInput}
          value={scanInput}
          onChangeText={setScanInput}
          placeholder="Scan QR or wristband…"
          onSubmitEditing={() => void handleScan()}
          editable={!scanning}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.scanBtn} onPress={() => void handleScan()} disabled={scanning}>
          {scanning ? <ActivityIndicator color="#fff" /> : <Text style={styles.scanBtnText}>Submit</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {rows.map((row) => (
          <View key={row.id} style={styles.row}>
            <Text style={styles.rowName}>{row.staff?.name ?? 'Staff'}</Text>
            <Text style={styles.rowMeta}>
              {row.signed_in_at ? `In ${format(new Date(row.signed_in_at), 'h:mm a')}` : ''}
              {row.signed_out_at
                ? ` · Out ${format(new Date(row.signed_out_at), 'h:mm a')}${row.auto_signed_out ? ' (auto)' : ''}`
                : row.signed_in_at
                  ? ' · On site'
                  : ''}
            </Text>
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
  scanBox: { paddingHorizontal: theme.spacing.md, marginBottom: 8, gap: 8 },
  scanInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
  },
  scanBtn: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    alignItems: 'center',
  },
  scanBtnText: { color: '#fff', fontWeight: '600' },
  list: { flex: 1, paddingHorizontal: theme.spacing.md },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowName: { fontWeight: '600', color: theme.colors.text },
  rowMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
});
