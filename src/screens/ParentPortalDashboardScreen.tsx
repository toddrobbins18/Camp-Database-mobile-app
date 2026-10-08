import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { CampUpdatesEditor } from '../components/parentPortal/CampUpdatesEditor';
import { NestSandboxParentFlowGuide } from '../components/parentPortal/NestSandboxParentFlowGuide';
import { isNestSandboxParentTraining } from '../lib/nestSandboxParentDemo';
import { linkFamilyChildrenByGuardianEmail } from '../lib/parentFamilyLink';
import {
  ABSENCE_TYPES,
  CHANGE_TYPES,
  PICKUP_STATUSES,
  ABSENCE_STATUSES,
  statusBadgeStyle,
  statusDisplayLabel,
} from '../constants/parentPortalConstants';
import { formatCampDateTime } from '../lib/campTime';
import { approveDismissalSwim, DISMISSAL_REALTIME_TABLES } from '../lib/dismissalDashboard';

type TabId = 'families' | 'pickups' | 'absences' | 'authorized' | 'swim';

type LinkedChild = { id: string; name: string };

type FamilyRow = {
  id: string;
  family_name: string;
  primary_contact_name: string | null;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  linkedChildren: LinkedChild[];
};

type PickupRow = {
  id: string;
  family_id: string;
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
  family_id: string;
  absence_date: string;
  absence_type: string;
  reason: string | null;
  status: string;
  familyName: string;
  camperName: string;
};

type AuthorizedRow = {
  id: string;
  full_name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
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

function pickStatus(
  title: string,
  current: string,
  options: readonly string[],
  onPick: (v: string) => void,
) {
  Alert.alert(title, undefined, [
    ...options.map((s) => ({
      text: s,
      onPress: () => onPick(s),
    })),
    { text: 'Cancel', style: 'cancel' },
  ]);
}

export function ParentPortalDashboardScreen({ navigation }: { navigation: any }) {
  const { companyId, companySlug, season, availableCompanies } = useCompany();
  const companyName = useMemo(
    () => availableCompanies.find((c) => c.id === companyId)?.name ?? 'your camp',
    [availableCompanies, companyId],
  );
  const [activeTab, setActiveTab] = useState<TabId>('families');
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [pickups, setPickups] = useState<PickupRow[]>([]);
  const [absences, setAbsences] = useState<AbsenceRow[]>([]);
  const [authorized, setAuthorized] = useState<AuthorizedRow[]>([]);
  const [swimLessons, setSwimLessons] = useState<SwimRow[]>([]);
  const [rosterChildren, setRosterChildren] = useState<LinkedChild[]>([]);
  const [approving, setApproving] = useState<string | null>(null);

  const [linkModal, setLinkModal] = useState<{ familyId: string; familyName: string; linkedIds: Set<string> } | null>(
    null,
  );
  const [linkSearch, setLinkSearch] = useState('');
  const [linkChildId, setLinkChildId] = useState<string | null>(null);
  const [linkSaving, setLinkSaving] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [
        { data: familyData, error: familyErr },
        { data: pickupData, error: pickupErr },
        { data: absenceData, error: absenceErr },
        { data: authData, error: authErr },
        { data: swimData, error: swimErr },
        { data: childData, error: childErr },
      ] = await Promise.all([
        supabase
          .from('families')
          .select(`
            id, family_name, primary_contact_name, email, phone, user_id,
            family_children(child_id, children:child_id(id, name))
          `)
          .eq('company_id', companyId)
          .order('family_name'),
        supabase
          .from('pickup_changes')
          .select(`
            id, family_id, change_date, change_type, pickup_time, pickup_person_name, notes, status,
            families:family_id(family_name),
            children:camper_id(name)
          `)
          .eq('company_id', companyId)
          .order('change_date', { ascending: false }),
        supabase
          .from('absences')
          .select(`
            id, family_id, absence_date, absence_type, reason, status,
            families:family_id(family_name),
            children:camper_id(name)
          `)
          .eq('company_id', companyId)
          .order('absence_date', { ascending: false }),
        supabase
          .from('authorized_pickups')
          .select(`
            id, full_name, relationship, phone, email, is_active,
            families:family_id(family_name),
            children:camper_id(name)
          `)
          .eq('company_id', companyId)
          .order('full_name'),
        supabase
          .from('swim_lessons')
          .select(`
            id, scheduled_at, instructor, parent_confirmed, transport_status,
            children:camper_id(name)
          `)
          .eq('company_id', companyId)
          .order('scheduled_at', { ascending: true }),
        supabase
          .from('children')
          .select('id, name')
          .eq('company_id', companyId)
          .eq('season', season)
          .neq('status', 'inactive')
          .order('name'),
      ]);

      const err = familyErr || pickupErr || absenceErr || authErr || swimErr || childErr;
      if (err) console.error('[PortalDashboard]', err.message);

      setFamilies(
        (familyData ?? []).map((f: any) => ({
          id: f.id,
          family_name: f.family_name,
          primary_contact_name: f.primary_contact_name,
          email: f.email,
          phone: f.phone,
          user_id: f.user_id,
          linkedChildren: (f.family_children ?? [])
            .map((fc: { children: LinkedChild | null }) => fc.children)
            .filter((c: LinkedChild | null): c is LinkedChild => !!c),
        })),
      );

      setPickups(
        (pickupData ?? []).map((p: any) => ({
          id: p.id,
          family_id: p.family_id,
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
          family_id: a.family_id,
          absence_date: a.absence_date,
          absence_type: a.absence_type,
          reason: a.reason,
          status: a.status,
          familyName: a.families?.family_name ?? '—',
          camperName: a.children?.name ?? '—',
        })),
      );

      setAuthorized(
        (authData ?? []).map((a: any) => ({
          id: a.id,
          full_name: a.full_name,
          relationship: a.relationship,
          phone: a.phone,
          email: a.email,
          is_active: a.is_active,
          familyName: a.families?.family_name ?? '—',
          camperName: a.children?.name ?? 'All campers',
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

      setRosterChildren((childData ?? []) as LinkedChild[]);
    } finally {
      setLoading(false);
    }
  }, [companyId, season]);

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
        () => void load(),
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
    () => swimLessons.filter((l) => l.parent_confirmed && (l.transport_status ?? 'submitted') === 'submitted').length,
    [swimLessons],
  );
  const activeAuthorized = useMemo(() => authorized.filter((a) => a.is_active).length, [authorized]);

  const updatePickupStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('pickup_changes').update({ status }).eq('id', id);
    if (error) Alert.alert('Update failed', error.message);
    else await load();
  };

  const updateAbsenceStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('absences').update({ status }).eq('id', id);
    if (error) Alert.alert('Update failed', error.message);
    else await load();
  };

  const approveSwim = async (id: string) => {
    setApproving(id);
    try {
      const { error } = await approveDismissalSwim(supabase, id);
      if (error) Alert.alert('Approve failed', error.message);
      else await load();
    } finally {
      setApproving(null);
    }
  };

  const autoLinkFamily = async (familyId: string, familyName: string) => {
    try {
      const linked = await linkFamilyChildrenByGuardianEmail(supabase, familyId);
      if (linked > 0) {
        Alert.alert('Linked', `Linked ${linked} camper${linked === 1 ? '' : 's'} to ${familyName}`);
      } else {
        Alert.alert('No matches', `No new campers matched ${familyName}'s email on the roster`);
      }
      await load();
    } catch (err) {
      Alert.alert('Auto-link failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const unlinkChild = async (familyId: string, childId: string) => {
    const { error } = await supabase.from('family_children').delete().eq('family_id', familyId).eq('child_id', childId);
    if (error) Alert.alert('Unlink failed', error.message);
    else await load();
  };

  const submitLinkCamper = async () => {
    if (!linkModal || !linkChildId || !companyId) return;
    setLinkSaving(true);
    const { error } = await supabase.from('family_children').insert({
      company_id: companyId,
      family_id: linkModal.familyId,
      child_id: linkChildId,
    });
    setLinkSaving(false);
    if (error) Alert.alert('Link failed', error.message);
    else {
      setLinkModal(null);
      setLinkSearch('');
      setLinkChildId(null);
      await load();
    }
  };

  const availableToLink = useMemo(() => {
    if (!linkModal) return [];
    const q = linkSearch.trim().toLowerCase();
    return rosterChildren
      .filter((c) => !linkModal.linkedIds.has(c.id))
      .filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [linkModal, linkSearch, rosterChildren]);

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'families', label: 'Families', count: families.length },
    { id: 'pickups', label: 'Pickups', count: pendingPickups || undefined },
    { id: 'absences', label: 'Absences', count: pendingAbsences || undefined },
    { id: 'authorized', label: 'Authorized' },
    { id: 'swim', label: 'Swim', count: pendingSwim || undefined },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Portal Dashboard</Text>
          <Text style={styles.subtitle}>
            Review and approve parent submissions for {companyName ?? 'your camp'}
          </Text>
        </View>
      </View>

      <ScrollView style={{ maxHeight: 420 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {companyId && isNestSandboxParentTraining(companySlug) ? (
          <View style={{ paddingHorizontal: theme.spacing.md }}>
            <NestSandboxParentFlowGuide companyId={companyId} companySlug={companySlug!} staffSignedIn />
          </View>
        ) : null}
        {companyId ? <CampUpdatesEditor companyId={companyId} season={season} /> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow}>
          {[
            { n: families.length, label: 'Families' },
            { n: pendingPickups, label: 'Pending pickups' },
            { n: pendingAbsences, label: 'Pending absences' },
            { n: pendingSwim, label: 'Pending swim' },
            { n: activeAuthorized, label: 'Authorized adults' },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statNum}>{s.n}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
              {tab.count != null && tab.count > 0 ? ` (${tab.count})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.secondary} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView style={styles.list}>
          {activeTab === 'families' &&
            (families.length === 0 ? (
              <Text style={styles.empty}>No parent families registered yet.</Text>
            ) : (
              families.map((f) => (
                <View key={f.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{f.family_name}</Text>
                  <Text style={styles.meta}>
                    {[f.primary_contact_name, f.email, f.phone].filter(Boolean).join(' · ') || '—'}
                  </Text>
                  <Text style={styles.meta}>
                    Login: {f.user_id ? 'Active' : 'No login'}
                  </Text>
                  <Text style={[styles.detail, { marginTop: 6 }]}>Linked campers</Text>
                  {f.linkedChildren.length === 0 ? (
                    <Text style={styles.meta}>None — link a camper</Text>
                  ) : (
                    f.linkedChildren.map((c) => (
                      <View key={c.id} style={styles.chipRow}>
                        <Text style={styles.chip}>{c.name}</Text>
                        <TouchableOpacity onPress={() => void unlinkChild(f.id, c.id)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={16} color="#dc2626" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                  <View style={styles.rowActions}>
                    <TouchableOpacity style={styles.smallBtn} onPress={() => void autoLinkFamily(f.id, f.family_name)}>
                      <Ionicons name="link-outline" size={14} color={theme.colors.secondary} />
                      <Text style={styles.smallBtnText}>Match by email</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.smallBtn}
                      onPress={() => {
                        setLinkModal({
                          familyId: f.id,
                          familyName: f.family_name,
                          linkedIds: new Set(f.linkedChildren.map((c) => c.id)),
                        });
                        setLinkSearch('');
                        setLinkChildId(null);
                      }}
                    >
                      <Ionicons name="person-add-outline" size={14} color={theme.colors.secondary} />
                      <Text style={styles.smallBtnText}>Link camper</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ))}

          {activeTab === 'pickups' && renderSubmissionList(pickups, 'pickup', approving, {
            onStatus: (id, status) => void updatePickupStatus(id, status),
            onApprove: (id) => void updatePickupStatus(id, 'acknowledged'),
            statusOptions: PICKUP_STATUSES,
          })}

          {activeTab === 'absences' && renderSubmissionList(absences, 'absence', approving, {
            onStatus: (id, status) => void updateAbsenceStatus(id, status),
            onApprove: (id) => void updateAbsenceStatus(id, 'acknowledged'),
            statusOptions: ABSENCE_STATUSES,
          })}

          {activeTab === 'authorized' &&
            (authorized.length === 0 ? (
              <Text style={styles.empty}>No authorized adults on file.</Text>
            ) : (
              authorized.map((a) => (
                <View key={a.id} style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {a.full_name}
                    {a.relationship ? ` · ${a.relationship}` : ''}
                  </Text>
                  <Text style={styles.meta}>{a.familyName} · {a.camperName}</Text>
                  <Text style={styles.meta}>{[a.phone, a.email].filter(Boolean).join(' · ') || '—'}</Text>
                  <TouchableOpacity
                    style={[styles.toggleBtn, { backgroundColor: a.is_active ? '#dbeafe' : '#f1f5f9' }]}
                    onPress={async () => {
                      const { error } = await supabase
                        .from('authorized_pickups')
                        .update({ is_active: !a.is_active })
                        .eq('id', a.id);
                      if (error) Alert.alert('Update failed', error.message);
                      else await load();
                    }}
                  >
                    <Text style={styles.toggleBtnText}>{a.is_active ? 'Active' : 'Inactive'}</Text>
                  </TouchableOpacity>
                </View>
              ))
            ))}

          {activeTab === 'swim' &&
            (swimLessons.length === 0 ? (
              <Text style={styles.empty}>No swim lessons scheduled.</Text>
            ) : (
              swimLessons.map((l) => (
                <View key={l.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{l.camperName}</Text>
                  <Text style={styles.meta}>{formatCampDateTime(l.scheduled_at)}</Text>
                  {l.instructor ? <Text style={styles.detail}>{l.instructor}</Text> : null}
                  <Text style={styles.meta}>
                    Parent: {l.parent_confirmed ? 'Confirmed' : 'Awaiting parent'}
                  </Text>
                  <Text style={styles.meta}>
                    Transport:{' '}
                    {!l.parent_confirmed
                      ? '—'
                      : l.transport_status === 'acknowledged'
                        ? 'Approved'
                        : 'Pending approval'}
                  </Text>
                  {l.parent_confirmed && l.transport_status !== 'acknowledged' ? (
                    <TouchableOpacity style={styles.approveBtn} onPress={() => void approveSwim(l.id)} disabled={approving === l.id}>
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

      <Modal visible={!!linkModal} transparent animationType="slide" onRequestClose={() => setLinkModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Link camper to {linkModal?.familyName}</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search roster…"
              value={linkSearch}
              onChangeText={setLinkSearch}
            />
            <FlatList
              data={availableToLink}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 220 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.linkRow, linkChildId === item.id && styles.linkRowActive]}
                  onPress={() => setLinkChildId(item.id)}
                >
                  <Text>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.meta}>No campers available to link</Text>}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setLinkModal(null)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveBtn, { flex: 1, opacity: linkChildId ? 1 : 0.5 }]}
                disabled={!linkChildId || linkSaving}
                onPress={() => void submitLinkCamper()}
              >
                <Text style={styles.approveBtnText}>{linkSaving ? 'Linking…' : 'Link camper'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function renderSubmissionList(
  rows: PickupRow[] | AbsenceRow[],
  kind: 'pickup' | 'absence',
  approving: string | null,
  handlers: {
    onStatus: (id: string, status: string) => void;
    onApprove: (id: string) => void;
    statusOptions: readonly string[];
  },
) {
  if (rows.length === 0) {
    return (
      <Text style={styles.empty}>
        {kind === 'pickup' ? 'No pickup changes submitted.' : 'No absences reported.'}
      </Text>
    );
  }

  return rows.map((row) => {
    const badge = statusBadgeStyle(row.status);
    const title = kind === 'pickup' ? (row as PickupRow).camperName : (row as AbsenceRow).camperName;
    const meta =
      kind === 'pickup'
        ? `${(row as PickupRow).change_date} · ${changeTypeLabel((row as PickupRow).change_type)} · ${(row as PickupRow).familyName}`
        : `${(row as AbsenceRow).absence_date} · ${absenceTypeLabel((row as AbsenceRow).absence_type)} · ${(row as AbsenceRow).familyName}`;

    return (
      <View key={row.id} style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{title}</Text>
          <TouchableOpacity
            onPress={() =>
              pickStatus('Update status', row.status, handlers.statusOptions, (s) => handlers.onStatus(row.id, s))
            }
          >
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>{statusDisplayLabel(row.status)}</Text>
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.meta}>{meta}</Text>
        {kind === 'pickup' && ((row as PickupRow).pickup_time || (row as PickupRow).pickup_person_name || (row as PickupRow).notes) ? (
          <Text style={styles.detail}>
            {[(row as PickupRow).pickup_time, (row as PickupRow).pickup_person_name, (row as PickupRow).notes]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
        {kind === 'absence' && (row as AbsenceRow).reason ? (
          <Text style={styles.detail}>{(row as AbsenceRow).reason}</Text>
        ) : null}
        {row.status === 'submitted' ? (
          <TouchableOpacity
            style={styles.approveBtn}
            onPress={() => handlers.onApprove(row.id)}
            disabled={approving === row.id}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  });
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
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  statCard: {
    width: 120,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  statNum: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2, textAlign: 'center' },
  tabs: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    maxHeight: 44,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
  },
  tabActive: { backgroundColor: '#dbeafe', borderColor: theme.colors.secondary },
  tabText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.secondary },
  list: { flex: 1, paddingHorizontal: theme.spacing.md },
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
  badgeText: { fontSize: 10, fontWeight: '700' },
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
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  chip: {
    fontSize: 12,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  smallBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.secondary },
  toggleBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnText: { fontWeight: '600', fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  searchInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  linkRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  linkRowActive: { backgroundColor: '#eff6ff' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
});
