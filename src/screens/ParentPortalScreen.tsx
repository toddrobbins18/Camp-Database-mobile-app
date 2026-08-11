import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import {
  ABSENCE_TYPES,
  CHANGE_TYPES,
  PARENT_PORTAL_COMPANY_SLUG_KEY,
  statusBadgeStyle,
  type Absence,
  type AuthorizedPickup,
  type ParentCamper,
  type PickupChange,
  type SwimLesson,
} from '../constants/parentPortalConstants';
import { ParentAuthScreen } from './ParentAuthScreen';

type TabId = 'pickups' | 'absences' | 'authorized' | 'swim';
type FormKind = 'pickup' | 'absence' | 'authorized' | null;

export function ParentPortalScreen({ navigation }: any) {
  const { companySlug } = useCompany();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('pickups');
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState('');
  const [campers, setCampers] = useState<ParentCamper[]>([]);
  const [pickups, setPickups] = useState<PickupChange[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [authPickups, setAuthPickups] = useState<AuthorizedPickup[]>([]);
  const [swimLessons, setSwimLessons] = useState<SwimLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [formKind, setFormKind] = useState<FormKind>(null);
  const [saving, setSaving] = useState(false);

  const [camperId, setCamperId] = useState('');
  const [changeDate, setChangeDate] = useState(new Date().toISOString().slice(0, 10));
  const [changeType, setChangeType] = useState('early_pickup');
  const [pickupTime, setPickupTime] = useState('');
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [absenceType, setAbsenceType] = useState('absent');
  const [arrivalTime, setArrivalTime] = useState('');
  const [reason, setReason] = useState('');
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [appliesTo, setAppliesTo] = useState('all');

  useEffect(() => {
    const init = async () => {
      const slug = companySlug ?? (await AsyncStorage.getItem(PARENT_PORTAL_COMPANY_SLUG_KEY));
      if (slug) await AsyncStorage.setItem(PARENT_PORTAL_COMPANY_SLUG_KEY, slug);
      if (slug) {
        const { data } = await supabase.from('companies').select('id').eq('slug', slug).maybeSingle();
        setCompanyId(data?.id ?? null);
      }
      const { data: { session } } = await supabase.auth.getSession();
      setAuthed(!!session);
    };
    void init();
  }, [companySlug]);

  const loadAll = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    const { data: fam } = await supabase
      .from('families')
      .select('id, family_name')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .maybeSingle();
    if (!fam) {
      setFamilyId(null);
      setLoading(false);
      return;
    }
    setFamilyId(fam.id);
    setFamilyName(fam.family_name);

    const { data: fc } = await supabase
      .from('family_children')
      .select('child_id, children:child_id(id, name)')
      .eq('family_id', fam.id);

    const linked: ParentCamper[] = (fc ?? [])
      .map((row: any) => row.children)
      .filter(Boolean)
      .sort((a: ParentCamper, b: ParentCamper) => a.name.localeCompare(b.name));

    const ids = linked.map((c) => c.id);
    const swimPromise =
      ids.length > 0
        ? supabase.from('swim_lessons').select('*').in('camper_id', ids).order('scheduled_at', { ascending: true })
        : Promise.resolve({ data: [] as SwimLesson[] });

    const [{ data: p }, { data: a }, { data: ap }, { data: sl }] = await Promise.all([
      supabase.from('pickup_changes').select('*').eq('family_id', fam.id).order('change_date', { ascending: false }),
      supabase.from('absences').select('*').eq('family_id', fam.id).order('absence_date', { ascending: false }),
      supabase.from('authorized_pickups').select('*').eq('family_id', fam.id).order('full_name'),
      swimPromise,
    ]);

    setCampers(linked);
    setPickups((p ?? []) as PickupChange[]);
    setAbsences((a ?? []) as Absence[]);
    setAuthPickups((ap ?? []) as AuthorizedPickup[]);
    setSwimLessons((sl ?? []) as SwimLesson[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (authed && companyId) void loadAll();
  }, [authed, companyId, loadAll]);

  const camperName = (id: string) => campers.find((c) => c.id === id)?.name ?? '—';

  const linkAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !companyId) return;
    const defaultName = user.email?.split('@')[0] ?? 'My';
    const { error } = await supabase.rpc('register_parent_account', {
      _company_id: companyId,
      _family_name: defaultName,
      _primary_contact_name: (user.user_metadata as any)?.full_name ?? null,
      _phone: null,
    });
    if (error) Alert.alert('Error', error.message);
    else void loadAll();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthed(false);
    setFamilyId(null);
  };

  const resetForm = () => {
    setCamperId('');
    setPickupTime('');
    setPersonName('');
    setPersonPhone('');
    setNotes('');
    setReason('');
    setArrivalTime('');
    setFullName('');
    setRelationship('');
    setPhone('');
    setEmail('');
    setAppliesTo('all');
  };

  const submitForm = async () => {
    if (!familyId || !companyId) return;
    setSaving(true);
    try {
      if (formKind === 'pickup') {
        if (!camperId) throw new Error('Pick a camper');
        const { error } = await supabase.from('pickup_changes').insert({
          company_id: companyId,
          family_id: familyId,
          camper_id: camperId,
          change_date: changeDate,
          change_type: changeType,
          pickup_time: pickupTime || null,
          pickup_person_name: personName || null,
          pickup_person_phone: personPhone || null,
          notes: notes || null,
        });
        if (error) throw error;
      } else if (formKind === 'absence') {
        if (!camperId) throw new Error('Pick a camper');
        const { error } = await supabase.from('absences').insert({
          company_id: companyId,
          family_id: familyId,
          camper_id: camperId,
          absence_date: changeDate,
          absence_type: absenceType,
          arrival_time: arrivalTime || null,
          reason: reason || null,
          notes: notes || null,
        });
        if (error) throw error;
      } else if (formKind === 'authorized') {
        const { error } = await supabase.from('authorized_pickups').insert({
          company_id: companyId,
          family_id: familyId,
          full_name: fullName,
          relationship: relationship || null,
          phone: phone || null,
          email: email || null,
          notes: notes || null,
          camper_id: appliesTo === 'all' ? null : appliesTo,
        });
        if (error) throw error;
      }
      setFormKind(null);
      resetForm();
      await loadAll();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (authed === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.secondary} />
      </View>
    );
  }

  if (!authed) {
    return <ParentAuthScreen navigation={navigation} onAuthenticated={() => setAuthed(true)} />;
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.mutedText}>Loading your portal…</Text>
      </View>
    );
  }

  if (!familyId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
            <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Parent Portal</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.cardTitle}>Account not linked</Text>
          <Text style={[styles.mutedText, { marginVertical: 12 }]}>
            Your account isn&apos;t linked to a family yet. Create one now to preview the parent portal.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={linkAccount}>
            <Text style={styles.primaryBtnText}>Create family & continue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={handleSignOut}>
            <Text style={styles.outlineBtnText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderListItem = (title: string, subtitle: string, status: string) => {
    const badge = statusBadgeStyle(status);
    return (
      <View style={styles.listItem}>
        <View style={{ flex: 1 }}>
          <Text style={styles.listTitle}>{title}</Text>
          <Text style={styles.listSub}>{subtitle}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusText, { color: badge.text }]}>{status}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Ionicons name="people-outline" size={22} color="#fff" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Parent Portal</Text>
          <Text style={styles.headerSubtitle}>{familyName} Family</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(
          [
            { id: 'pickups' as TabId, label: 'Pickups', icon: 'calendar-outline' as const },
            { id: 'absences' as TabId, label: 'Absences', icon: 'time-outline' as const },
            { id: 'authorized' as TabId, label: 'Authorized', icon: 'checkmark-circle-outline' as const },
            { id: 'swim' as TabId, label: 'Swim', icon: 'water-outline' as const },
          ] as const
        ).map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, activeTab === t.id && styles.tabActive]} onPress={() => setActiveTab(t.id)}>
            <Ionicons name={t.icon} size={14} color={activeTab === t.id ? theme.colors.secondary : theme.colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {campers.length === 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>No campers on file yet</Text>
            <Text style={styles.mutedText}>
              Once the camp office adds your campers, they&apos;ll appear here and you can submit changes.
            </Text>
          </View>
        )}

        {activeTab === 'pickups' && (
          <View style={styles.panel}>
            <TouchableOpacity
              style={[styles.primaryBtn, campers.length === 0 && styles.btnDisabled]}
              disabled={campers.length === 0}
              onPress={() => setFormKind('pickup')}
            >
              <Text style={styles.primaryBtnText}>+ New pickup change</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>Submitted changes</Text>
            {pickups.length === 0 ? (
              <Text style={styles.mutedText}>No pickup changes yet.</Text>
            ) : (
              pickups.map((p) =>
                renderListItem(
                  `${camperName(p.camper_id)} · ${CHANGE_TYPES.find((t) => t.v === p.change_type)?.l ?? p.change_type}`,
                  `${p.change_date}${p.pickup_time ? ` at ${p.pickup_time}` : ''}${p.pickup_person_name ? ` · ${p.pickup_person_name}` : ''}`,
                  p.status,
                ),
              )
            )}
          </View>
        )}

        {activeTab === 'absences' && (
          <View style={styles.panel}>
            <TouchableOpacity
              style={[styles.primaryBtn, campers.length === 0 && styles.btnDisabled]}
              disabled={campers.length === 0}
              onPress={() => setFormKind('absence')}
            >
              <Text style={styles.primaryBtnText}>+ Report absence</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>Reported absences</Text>
            {absences.length === 0 ? (
              <Text style={styles.mutedText}>No absences reported.</Text>
            ) : (
              absences.map((a) =>
                renderListItem(
                  `${camperName(a.camper_id)} · ${ABSENCE_TYPES.find((t) => t.v === a.absence_type)?.l ?? a.absence_type}`,
                  `${a.absence_date}${a.arrival_time ? ` · arriving ${a.arrival_time}` : ''}${a.reason ? `\nReason: ${a.reason}` : ''}`,
                  a.status,
                ),
              )
            )}
          </View>
        )}

        {activeTab === 'authorized' && (
          <View style={styles.panel}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setFormKind('authorized')}>
              <Text style={styles.primaryBtnText}>+ Add authorized adult</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>Approved adults</Text>
            {authPickups.length === 0 ? (
              <Text style={styles.mutedText}>No authorized pickups added.</Text>
            ) : (
              authPickups.map((a) => (
                <View key={a.id} style={styles.listItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>
                      {a.full_name}
                      {a.relationship ? ` · ${a.relationship}` : ''}
                    </Text>
                    <Text style={styles.listSub}>
                      {a.phone}
                      {a.email ? ` · ${a.email}` : ''}
                      {a.camper_id ? ` · for ${camperName(a.camper_id)}` : ' · all campers'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      const { error } = await supabase.from('authorized_pickups').delete().eq('id', a.id);
                      if (error) Alert.alert('Error', error.message);
                      else void loadAll();
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'swim' && (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Your scheduled swim lessons</Text>
            <Text style={[styles.mutedText, { marginBottom: 12 }]}>
              Lessons are scheduled by the camp. Confirm attendance once you receive the reminder email the day before.
            </Text>
            {swimLessons.length === 0 ? (
              <Text style={styles.mutedText}>No swim lessons scheduled.</Text>
            ) : (
              swimLessons.map((l) => {
                const dt = new Date(l.scheduled_at);
                return (
                  <View key={l.id} style={styles.swimRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listTitle}>
                        {camperName(l.camper_id)} · {format(dt, "EEE, MMM d 'at' h:mm a")}
                      </Text>
                      <Text style={styles.listSub}>
                        {l.duration_minutes} min
                        {l.instructor ? ` · Instructor ${l.instructor}` : ''}
                        {l.location ? ` · ${l.location}` : ''} · ${(l.cost_cents / 100).toFixed(2)}
                      </Text>
                    </View>
                    {l.parent_confirmed ? (
                      <TouchableOpacity
                        onPress={async () => {
                          await supabase.from('swim_lessons').update({ parent_confirmed: false, parent_confirmed_at: null }).eq('id', l.id);
                          void loadAll();
                        }}
                      >
                        <Text style={styles.linkText}>Undo</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.smallBtn}
                        onPress={async () => {
                          await supabase
                            .from('swim_lessons')
                            .update({ parent_confirmed: true, parent_confirmed_at: new Date().toISOString() })
                            .eq('id', l.id);
                          void loadAll();
                        }}
                      >
                        <Text style={styles.smallBtnText}>Confirm</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={formKind !== null} animationType="slide" onRequestClose={() => setFormKind(null)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {formKind === 'pickup' ? 'New pickup change' : formKind === 'absence' ? 'Report absence' : 'Add authorized adult'}
            </Text>
            <TouchableOpacity onPress={() => setFormKind(null)}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {(formKind === 'pickup' || formKind === 'absence') && (
              <>
                <Text style={styles.label}>Camper</Text>
                {campers.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.optionRow, camperId === c.id && styles.optionRowActive]}
                    onPress={() => setCamperId(c.id)}
                  >
                    <Text style={styles.optionText}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
                <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                <TextInput style={styles.input} value={changeDate} onChangeText={setChangeDate} />
              </>
            )}
            {formKind === 'pickup' && (
              <>
                <Text style={styles.label}>Type</Text>
                {CHANGE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.v}
                    style={[styles.optionRow, changeType === t.v && styles.optionRowActive]}
                    onPress={() => setChangeType(t.v)}
                  >
                    <Text style={styles.optionText}>{t.l}</Text>
                  </TouchableOpacity>
                ))}
                <Text style={styles.label}>Pickup time (optional)</Text>
                <TextInput style={styles.input} value={pickupTime} onChangeText={setPickupTime} placeholder="HH:MM" />
                <Text style={styles.label}>Person picking up</Text>
                <TextInput style={styles.input} value={personName} onChangeText={setPersonName} />
                <Text style={styles.label}>Their phone</Text>
                <TextInput style={styles.input} value={personPhone} onChangeText={setPersonPhone} />
              </>
            )}
            {formKind === 'absence' && (
              <>
                <Text style={styles.label}>Type</Text>
                {ABSENCE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.v}
                    style={[styles.optionRow, absenceType === t.v && styles.optionRowActive]}
                    onPress={() => setAbsenceType(t.v)}
                  >
                    <Text style={styles.optionText}>{t.l}</Text>
                  </TouchableOpacity>
                ))}
                {(absenceType === 'late_arrival' || absenceType === 'leaving_early') && (
                  <>
                    <Text style={styles.label}>Time</Text>
                    <TextInput style={styles.input} value={arrivalTime} onChangeText={setArrivalTime} placeholder="HH:MM" />
                  </>
                )}
                <Text style={styles.label}>Reason</Text>
                <TextInput style={styles.input} value={reason} onChangeText={setReason} />
              </>
            )}
            {formKind === 'authorized' && (
              <>
                <Text style={styles.label}>Full name</Text>
                <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />
                <Text style={styles.label}>Relationship</Text>
                <TextInput style={styles.input} value={relationship} onChangeText={setRelationship} />
                <Text style={styles.label}>Phone</Text>
                <TextInput style={styles.input} value={phone} onChangeText={setPhone} />
                <Text style={styles.label}>Email</Text>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" />
                <Text style={styles.label}>Applies to</Text>
                <TouchableOpacity style={[styles.optionRow, appliesTo === 'all' && styles.optionRowActive]} onPress={() => setAppliesTo('all')}>
                  <Text style={styles.optionText}>All my campers</Text>
                </TouchableOpacity>
                {campers.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.optionRow, appliesTo === c.id && styles.optionRowActive]}
                    onPress={() => setAppliesTo(c.id)}
                  >
                    <Text style={styles.optionText}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, { minHeight: 80 }]} multiline value={notes} onChangeText={setNotes} />
            <TouchableOpacity style={styles.primaryBtn} onPress={submitForm} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Submit</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  mutedText: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuButton: { marginRight: 8 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  headerSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 12, backgroundColor: '#fff' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  tabActive: { backgroundColor: '#dbeafe' },
  tabText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: theme.colors.secondary, fontWeight: '700' },
  content: { flex: 1 },
  panel: { padding: 16, gap: 10 },
  infoCard: { margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginTop: 8 },
  primaryBtn: { backgroundColor: theme.colors.secondary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  outlineBtn: { marginTop: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  outlineBtnText: { color: theme.colors.text, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  listTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  listSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  swimRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  smallBtn: { backgroundColor: theme.colors.secondary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  smallBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  linkText: { color: theme.colors.secondary, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  modalBody: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  optionRow: { padding: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, marginBottom: 6 },
  optionRowActive: { borderColor: theme.colors.secondary, backgroundColor: '#eff6ff' },
  optionText: { fontSize: 14, color: theme.colors.text },
});
