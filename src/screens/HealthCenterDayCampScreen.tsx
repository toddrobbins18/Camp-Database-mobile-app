import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useCampBrandTheme } from '../hooks/useCampBrandTheme';
import { HealthCenterDayCampPanel } from '../components/health/HealthCenterDayCampPanel';

const ROSTER_PAGE_SIZE = 500;

type CamperRow = {
  id: string;
  name: string;
  group_name?: string | null;
  division?: { name?: string | null } | null;
  leader?: { name?: string | null } | null;
  bunk?: { bunk_name?: string | null; bunk_number?: number | null } | null;
};

type StaffRow = { id: string; name: string; role?: string | null };

/** Day camp Health Center — matches web `/day-camp/nurse` (health_center_admissions). */
export function HealthCenterDayCampScreen({ navigation }: { navigation: any }) {
  const { companyId, season } = useCompany();
  const { brand, brandSoft } = useCampBrandTheme();
  const [children, setChildren] = useState<CamperRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChildren = useCallback(async () => {
    if (!companyId || !season) {
      setChildren([]);
      return;
    }
    const rows: CamperRow[] = [];
    let from = 0;
    for (;;) {
      const to = from + ROSTER_PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('children')
        .select(
          `
          id,
          name,
          group_name,
          division:divisions(id, name),
          leader:leader_id(id, name),
          bunk:bunk_id(bunk_name, bunk_number)
        `,
        )
        .neq('status', 'inactive')
        .eq('season', season)
        .eq('company_id', companyId)
        .order('name')
        .range(from, to);
      if (error) {
        console.error('[HealthCenter] campers:', error);
        setChildren([]);
        return;
      }
      const batch = (data ?? []) as CamperRow[];
      rows.push(...batch);
      if (batch.length < ROSTER_PAGE_SIZE) break;
      from += ROSTER_PAGE_SIZE;
    }
    setChildren(rows);
  }, [companyId, season]);

  const fetchStaff = useCallback(async () => {
    if (!companyId || !season) {
      setStaff([]);
      return;
    }
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, role')
      .eq('status', 'active')
      .eq('company_id', companyId)
      .eq('season', season)
      .order('name');
    if (error) {
      console.error('[HealthCenter] staff:', error);
      setStaff([]);
      return;
    }
    setStaff((data ?? []) as StaffRow[]);
  }, [companyId, season]);

  const fetchVisits = useCallback(async () => {
    if (!companyId || !season) {
      setVisits([]);
      return;
    }
    const { data, error } = await supabase
      .from('health_center_admissions')
      .select(
        `
        id,
        admitted_at,
        reason,
        treatment,
        incident_location,
        group_name,
        counselor_name,
        nurse_name,
        sent_home,
        called_home,
        notes,
        child_id,
        staff_id,
        children!fk_health_center_admissions_child_id ( id, name ),
        staff ( id, name )
      `,
      )
      .eq('company_id', companyId)
      .eq('season', season)
      .not('checked_out_at', 'is', null)
      .order('admitted_at', { ascending: false });
    if (error) {
      console.error('[HealthCenter] visits:', error);
      setVisits([]);
      return;
    }
    setVisits(data ?? []);
  }, [companyId, season]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchChildren(), fetchStaff(), fetchVisits()]);
    setLoading(false);
  }, [fetchChildren, fetchStaff, fetchVisits]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel('day-camp-health-visits-mobile')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'health_center_admissions' },
        () => {
          void fetchVisits();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, fetchVisits]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: brandSoft }]}>
          <Ionicons name="medical" size={24} color={brand} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Health Center</Text>
          <Text style={styles.headerSubtitle}>Log visits and track incidents — linked to profiles</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={brand} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {companyId && season ? (
            <HealthCenterDayCampPanel
              companyId={companyId}
              season={season}
              children={children}
              staff={staff}
              visits={visits}
              onVisitLogged={() => void fetchVisits()}
            />
          ) : (
            <Text style={styles.hint}>Select a camp to use Health Center.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  menuButton: { marginRight: 8, padding: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  headerSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  content: { padding: 16, paddingBottom: 32 },
  hint: { textAlign: 'center', color: theme.colors.textSecondary, marginTop: 24 },
});
