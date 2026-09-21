import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import {
  ABSENCE_TYPES,
  CHANGE_TYPES,
  statusBadgeStyle,
} from '../constants/parentPortalConstants';
import { formatCampDateTime } from '../lib/campTime';
import { approveDismissalSwim, DISMISSAL_REALTIME_TABLES } from '../lib/dismissalDashboard';

type TabId = 'pickups' | 'absences' | 'swim';

type PickupRow = {
  id: string;
  change_date: string;
  change_type: string;
  pickup_time: string | null;
  pickup_person_name: string | null;
  notes: string | null;
  status: string;
  familyName: string;
  camperName: string;
};

type AbsenceRow = {
  id: string;
  absence_date: string;
  absence_type: string;
  reason: string | null;
  status: string;
  familyName: string;
  camperName: string;
};

type SwimRow = {
  id: string;
  scheduled_at: string;
  instructor: string | null;
  parent_confirmed: boolean;
  transport_status: string | null;
  camperName: string;
};

const changeTypeLabel = (v: string) => CHANGE_TYPES.find((t) => t.v === v)?.l ?? v;
const absenceTypeLabel = (v: string) => ABSENCE_TYPES.find((t) => t.v === v)?.l ?? v;

export function ParentPortalDashboardScreen({ navigation }: { navigation: any }) {
  const { companyId } = useCompany();
  const [activeTab, setActiveTab] = useState<TabId>('pickups');
  const [loading, setLoading] = useState(true);
  const [pickups, setPickups] = useState<PickupRow[]>([]);
  const [absences, setAbsences] = useState<AbsenceRow[]>([]);
  const [swimLessons, setSwimLessons] = useState<SwimRow[]>([]);
  const [approving, setApproving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [{ data: pickupData }, { data: absenceData }, { data: swimData }] = await Promise.all([
        supabase
          .from('pickup_changes')
          .select(`
            id, change_date, change_type, pickup_time, pickup_person_name, notes, status,
            families:family_id(family_name),
            children:camper_id(name)
          `)
          .eq('company_id', companyId)
          .order('change_date', { ascending: false }),
        supabase
          .from('absences')
          .select(`
            id, absence_date, absence_type, reason, status,
            families:family_id(family_name),
            children:camper_id(name)
          `)
          .eq('company_id', companyId)
          .order('absence_date', { ascending: false }),
        supabase
          .from('swim_lessons')
          .select(`
            id, scheduled_at, instructor, parent_confirmed, transport_status,
            children:camper_id(name)
          `)
          .eq('company_id', companyId)
          .order('scheduled_at', { ascending: true }),
      ]);

      setPickups(
        (pickupData ?? []).map((p: any) => ({
          id: p.id,
          change_date: p.change_date,
          change_type: p.change_type,
          pickup_time: p.pickup_time,
          pickup_person_name: p.pickup_person_name,
          notes: p.notes,
          status: p.status,
          familyName: p.families?.family_name ?? '—',
          camperName: p.children?.name ?? '—',
        })),
      );

      setAbsences(
        (absenceData ?? []).map((a: any) => ({
          id: a.id,
          absence_date: a.absence_date,
          absence_type: a.absence_type,
          reason: a.reason,
          status: a.status,
          familyName: a.families?.family_name ?? '—',
          camperName: a.children?.name ?? '—',
        })),
      );

      setSwimLessons(
        (swimData ?? []).map((l: any) => ({
          id: l.id,
          scheduled_at: l.scheduled_at,
          instructor: l.instructor,
          parent_confirmed: l.parent_confirmed,
          transport_status: l.transport_status ?? null,
          camperName: l.children?.name ?? '—',
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!companyId) return;
    const channel = supabase.channel(`portal-dashboard-mobile-${companyId}`);
    for (const table of DISMISSAL_REALTIME_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `company_id=eq.${companyId}` },
        () => {
          void load();
        },
      );
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, load]);

  const pendingPickups = useMemo(() => pickups.filter((p) => p.status === 'submitted').length, [pickups]);
  const pendingAbsences = useMemo(() => absences.filter((a) => a.status === 'submitted').length, [absences]);
  const pendingSwim = useMemo(
    () =>
      swimLessons.filter(
        (l) => l.parent_confirmed && (l.transport_status ?? 'submitted') === 'submitted',
      ).length,
    [swimLessons],
  );

  const approvePickup = async (id: string) => {
    setApproving(id);
    try {
      const { error } = await supabase.from('pickup_changes').update({ status: 'acknowledged' }).eq('id', id);
      if (error) {
        Alert.alert('Approve failed', error.message);
        return;
      }
      Alert.alert('Approved', 'This note will appear on approved change sheets and routes when applicable.');
      await load();
    } finally {
      setApproving(null);
    }
  };

  const approveAbsence = async (id: string) => {
    setApproving(id);
    try {
      const { error } = await supabase.from('absences').update({ status: 'acknowledged' }).eq('id', id);
      if (error) {
        Alert.alert('Approve failed', error.message);
        return;
      }
      Alert.alert('Approved', 'This absence will appear on approved change sheets and routes.');
      await load();
    } finally {
      setApproving(null);
    }
  };

  const approveSwim = async (id: string) => {
    setApproving(id);
    try {
      const { error } = await approveDismissalSwim(supabase, id);
      if (error) {
        Alert.alert('Approve failed', error.message);
        return;
      }
      Alert.alert('Approved', 'Swim lesson will appear on change sheets and routes.');
      await load();
    } finally {
      setApproving(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Portal Dashboard</Text>
          <Text style={styles.subtitle}>Approve parent notes before routes & paperwork</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{pendingPickups}</Text>
          <Text style={styles.statLabel}>Pending pickups</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{pendingAbsences}</Text>
          <Text style={styles.statLabel}>Pending absences</Text>
        </View>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('DayCampModule', { moduleId: 'pending-transport-changes' })}
        >
          <Ionicons name="time-outline" size={18} color={theme.colors.warning} />
          <Text style={styles.statLink}>Pending queue</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {([
          { id: 'pickups' as const, label: 'Pickups', count: pendingPickups },
          { id: 'absences' as const, label: 'Absences', count: pendingAbsences },
          { id: 'swim' as const, label: 'Swim', count: pendingSwim },
        ]).map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}{tab.count ? ` (${tab.count})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.secondary} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView style={styles.list}>
          {activeTab === 'pickups' &&
            (pickups.length === 0 ? (
              <Text style={styles.empty}>No pickup changes submitted.</Text>
            ) : (
              pickups.map((p) => {
                const badge = statusBadgeStyle(p.status);
                return (
                  <View key={p.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle}>{p.camperName}</Text>
                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.text }]}>{p.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.meta}>{p.change_date} · {changeTypeLabel(p.change_type)}</Text>
                    <Text style={styles.meta}>{p.familyName}</Text>
                    {(p.pickup_time || p.pickup_person_name || p.notes) ? (
                      <Text style={styles.detail}>
                        {[p.pickup_time, p.pickup_person_name, p.notes].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                    {p.status === 'submitted' ? (
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => void approvePickup(p.id)}
                        disabled={approving === p.id}
                      >
                        {approving === p.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                            <Text style={styles.approveBtnText}>Approve</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })
            ))}

          {activeTab === 'absences' &&
            (absences.length === 0 ? (
              <Text style={styles.empty}>No absences reported.</Text>
            ) : (
              absences.map((a) => {
                const badge = statusBadgeStyle(a.status);
                return (
                  <View key={a.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle}>{a.camperName}</Text>
                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.text }]}>{a.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.meta}>{a.absence_date} · {absenceTypeLabel(a.absence_type)}</Text>
                    <Text style={styles.meta}>{a.familyName}</Text>
                    {a.reason ? <Text style={styles.detail}>{a.reason}</Text> : null}
                    {a.status === 'submitted' ? (
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => void approveAbsence(a.id)}
                        disabled={approving === a.id}
                      >
                        {approving === a.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                            <Text style={styles.approveBtnText}>Approve</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })
            ))}

          {activeTab === 'swim' &&
            (swimLessons.length === 0 ? (
              <Text style={styles.empty}>No swim lessons scheduled.</Text>
            ) : (
              swimLessons.map((l) => (
                <View key={l.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{l.camperName}</Text>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: l.parent_confirmed ? '#dbeafe' : '#fef3c7' },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: l.parent_confirmed ? '#1d4ed8' : '#b45309' }]}>
                        {l.parent_confirmed ? 'Confirmed' : 'Awaiting parent'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.meta}>{formatCampDateTime(l.scheduled_at)}</Text>
                  {l.instructor ? <Text style={styles.detail}>{l.instructor}</Text> : null}
                  {l.parent_confirmed && l.transport_status !== 'acknowledged' ? (
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => void approveSwim(l.id)}
                      disabled={approving === l.id}
                    >
                      {approving === l.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                          <Text style={styles.approveBtnText}>Approve transport</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))
            ))}
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
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  statNum: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2, textAlign: 'center' },
  statLink: { fontSize: 10, color: theme.colors.warning, fontWeight: '600', marginTop: 4 },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#dbeafe', borderColor: theme.colors.secondary },
  tabText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.secondary },
  list: { flex: 1, paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.sm },
  empty: { textAlign: 'center', color: theme.colors.textSecondary, marginTop: 32 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  meta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  detail: { fontSize: 13, color: theme.colors.text, marginTop: 4 },
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
});
