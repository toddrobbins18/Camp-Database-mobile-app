import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { theme } from '../theme/theme';
import { FrontOfficeBackButton } from '../components/FrontOfficeBackButton';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useCampOperationalDate } from '../hooks/useCampOperationalDate';
import { campDateTimeToIso, swimLessonBusRun } from '../lib/campTime';
import {
  ABSENCE_TYPE_LABELS,
  approveDismissalAbsence,
  approveDismissalNurse,
  approveDismissalPickup,
  approveDismissalSwim,
  DISMISSAL_REALTIME_TABLES,
  fetchDismissalDashboard,
  lookupFamilyIdForCamper,
  PICKUP_CHANGE_LABELS,
  type DismissalDashboardData,
} from '../lib/dismissalDashboard';
import {
  fetchTransportExceptionsForReport,
  type TransportException,
} from '../lib/transportDailyOverrides';
import { ABSENCE_TYPES, CHANGE_TYPES } from '../constants/parentPortalConstants';

type TabId = 'pending' | 'exceptions' | 'log';
type Camper = { id: string; name: string; group_name: string | null };

function ymdFromDate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

function dateFromYmd(ymd: string) {
  return new Date(`${ymd}T12:00:00`);
}

function CamperPicker({
  label,
  campers,
  value,
  onChange,
}: {
  label: string;
  campers: Camper[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = campers.find((c) => c.id === value);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return campers;
    return campers.filter((c) => c.name.toLowerCase().includes(q));
  }, [campers, search]);

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setOpen(true)}>
        <Text style={[styles.pickerBtnText, !selected && styles.placeholder]}>
          {selected?.name ?? 'Select camper'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search campers..."
              value={search}
              onChangeText={setSearch}
            />
            <ScrollView style={{ maxHeight: 360 }}>
              {filtered.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.pickerOption, value === c.id && styles.pickerOptionActive]}
                  onPress={() => {
                    onChange(c.id);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Text style={styles.pickerOptionText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function OptionPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { v: string; l: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const display = options.find((o) => o.v === value)?.l ?? value;

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setOpen(true)}>
        <Text style={styles.pickerBtnText}>{display}</Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.optionSheet}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.v}
                style={[styles.pickerOption, value === opt.v && styles.pickerOptionActive]}
                onPress={() => {
                  onChange(opt.v);
                  setOpen(false);
                }}
              >
                <Text style={styles.pickerOptionText}>{opt.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export function TransportAdminScreen({ navigation }: { navigation: any }) {
  const { companyId, season } = useCompany();
  const { operationalDateString } = useCampOperationalDate();
  const [activeTab, setActiveTab] = useState<TabId>('pending');
  const [selectedDate, setSelectedDate] = useState(operationalDateString);

  useEffect(() => {
    setSelectedDate(operationalDateString);
  }, [operationalDateString]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dashboard, setDashboard] = useState<DismissalDashboardData | null>(null);
  const [exceptions, setExceptions] = useState<TransportException[]>([]);
  const [campers, setCampers] = useState<Camper[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId || !season) return;
    setLoading(true);
    try {
      const [dash, exs, childRes] = await Promise.all([
        fetchDismissalDashboard(supabase, companyId, season, selectedDate),
        fetchTransportExceptionsForReport(supabase, companyId, selectedDate),
        supabase
          .from('children')
          .select('id, name, group_name')
          .eq('company_id', companyId)
          .eq('season', season)
          .neq('status', 'inactive')
          .order('name'),
      ]);
      setDashboard(dash);
      setExceptions(exs);
      setCampers((childRes.data ?? []) as Camper[]);
    } catch (err) {
      console.error('[TransportAdmin]', err);
      Alert.alert('Error', 'Failed to load transport admin data');
    } finally {
      setLoading(false);
    }
  }, [companyId, season, selectedDate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!companyId) return;
    const channel = supabase.channel(`transport-admin-mobile-${companyId}`);
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

  const pendingCount = useMemo(() => {
    if (!dashboard) return 0;
    return (
      dashboard.pendingPickups.length +
      dashboard.pendingAbsences.length +
      dashboard.pendingNurse.length +
      dashboard.pendingSwim.length
    );
  }, [dashboard]);

  const onRoutesCount = useMemo(
    () => exceptions.filter((e) => e.appliedToRoutes).length,
    [exceptions],
  );

  const approve = async (kind: string, id: string, name: string) => {
    setApproving(id);
    try {
      let error: { message: string } | null = null;
      if (kind === 'pickup') ({ error } = await approveDismissalPickup(supabase, id));
      else if (kind === 'absence') ({ error } = await approveDismissalAbsence(supabase, id));
      else if (kind === 'nurse') ({ error } = await approveDismissalNurse(supabase, id));
      else ({ error } = await approveDismissalSwim(supabase, id));
      if (error) Alert.alert('Approve failed', error.message);
      else {
        Alert.alert('Approved', `${name} will update routes when applicable`);
        await load();
      }
    } finally {
      setApproving(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FrontOfficeBackButton navigation={navigation} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Transport Admin</Text>
          <Text style={styles.subtitle}>Log & approve bus exceptions</Text>
        </View>
      </View>

      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.dateBtnText}>{selectedDate}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedDate(operationalDateString)}>
          <Text style={styles.todayLink}>Today</Text>
        </TouchableOpacity>
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={dateFromYmd(selectedDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (d) setSelectedDate(ymdFromDate(d));
          }}
        />
      )}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{onRoutesCount}</Text>
          <Text style={styles.statLabel}>On bus list</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {(
          [
            { id: 'pending' as const, label: `Pending${pendingCount ? ` (${pendingCount})` : ''}` },
            { id: 'exceptions' as const, label: 'Bus exceptions' },
            { id: 'log' as const, label: 'Log change' },
          ] as const
        ).map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }}>
          {activeTab === 'pending' && (
            <>
              {pendingCount === 0 ? (
                <Text style={styles.empty}>No pending changes for {selectedDate}.</Text>
              ) : null}
              {dashboard?.pendingPickups.map((p) => (
                <PendingCard
                  key={p.id}
                  title={p.camperName}
                  subtitle={`Pickup · ${PICKUP_CHANGE_LABELS[p.change_type] ?? p.change_type}`}
                  detail={p.notes ?? undefined}
                  approving={approving === p.id}
                  onApprove={() => void approve('pickup', p.id, p.camperName)}
                />
              ))}
              {dashboard?.pendingAbsences.map((a) => (
                <PendingCard
                  key={a.id}
                  title={a.camperName}
                  subtitle={`Absence · ${ABSENCE_TYPE_LABELS[a.absence_type] ?? a.absence_type}`}
                  detail={a.reason ?? undefined}
                  approving={approving === a.id}
                  onApprove={() => void approve('absence', a.id, a.camperName)}
                />
              ))}
              {dashboard?.pendingNurse.map((n) => (
                <PendingCard
                  key={n.id}
                  title={n.camper_name}
                  subtitle="Nurse · Sent home"
                  detail={n.reason ?? undefined}
                  approving={approving === n.id}
                  onApprove={() => void approve('nurse', n.id, n.camper_name)}
                />
              ))}
              {dashboard?.pendingSwim.map((s) => (
                <PendingCard
                  key={s.id}
                  title={s.camperName}
                  subtitle="Swim · Parent confirmed"
                  detail={s.instructor ?? undefined}
                  approving={approving === s.id}
                  onApprove={() => void approve('swim', s.id, s.camperName)}
                />
              ))}
            </>
          )}

          {activeTab === 'exceptions' &&
            (exceptions.length === 0 ? (
              <Text style={styles.empty}>No transport changes for this date.</Text>
            ) : (
              exceptions.map((ex, i) => (
                <View key={`${ex.source}-${ex.camperName}-${i}`} style={styles.exceptionCard}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{ex.camperName}</Text>
                    <View
                      style={[
                        styles.badge,
                        ex.appliedToRoutes ? styles.badgeGreen : styles.badgeAmber,
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {ex.appliedToRoutes ? 'On bus list' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.meta}>{ex.label}</Text>
                  {ex.detail ? <Text style={styles.detail}>{ex.detail}</Text> : null}
                </View>
              ))
            ))}

          {activeTab === 'log' && companyId && (
            <LogForms
              companyId={companyId}
              campers={campers}
              defaultDate={selectedDate}
              onSaved={load}
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PendingCard({
  title,
  subtitle,
  detail,
  approving,
  onApprove,
}: {
  title: string;
  subtitle: string;
  detail?: string;
  approving: boolean;
  onApprove: () => void;
}) {
  return (
    <View style={styles.pendingCard}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.pendingSubtitle}>{subtitle}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      <TouchableOpacity style={styles.approveBtn} onPress={onApprove} disabled={approving}>
        {approving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.approveBtnText}>Approve</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function LogForms({
  companyId,
  campers,
  defaultDate,
  onSaved,
}: {
  companyId: string;
  campers: Camper[];
  defaultDate: string;
  onSaved: () => void;
}) {
  return (
    <View style={styles.logStack}>
      <PickupLogForm companyId={companyId} campers={campers} defaultDate={defaultDate} onSaved={onSaved} />
      <AbsenceLogForm companyId={companyId} campers={campers} defaultDate={defaultDate} onSaved={onSaved} />
      <SwimLogForm companyId={companyId} campers={campers} defaultDate={defaultDate} onSaved={onSaved} />
      <NurseLogForm companyId={companyId} campers={campers} defaultDate={defaultDate} onSaved={onSaved} />
    </View>
  );
}

function PickupLogForm({
  companyId,
  campers,
  defaultDate,
  onSaved,
}: {
  companyId: string;
  campers: Camper[];
  defaultDate: string;
  onSaved: () => void;
}) {
  const [camperId, setCamperId] = useState('');
  const [changeDate, setChangeDate] = useState(defaultDate);
  const [changeType, setChangeType] = useState('early_pickup');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => setChangeDate(defaultDate), [defaultDate]);

  const submit = async () => {
    if (!camperId) return Alert.alert('Error', 'Select a camper');
    setSaving(true);
    try {
      const familyId = await lookupFamilyIdForCamper(supabase, companyId, camperId);
      if (!familyId) {
        Alert.alert('Error', 'Camper not linked to a family — link in Portal Dashboard first');
        return;
      }
      const { error } = await supabase.from('pickup_changes').insert({
        company_id: companyId,
        family_id: familyId,
        camper_id: camperId,
        change_date: changeDate,
        change_type: changeType,
        notes: notes || null,
        status: 'submitted',
      });
      if (error) throw error;
      Alert.alert('Submitted', 'Approve in Pending tab to update routes');
      setNotes('');
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Log pickup change</Text>
      <CamperPicker label="Camper" campers={campers} value={camperId} onChange={setCamperId} />
      <TextInput style={styles.input} value={changeDate} onChangeText={setChangeDate} placeholder="YYYY-MM-DD" />
      <OptionPicker label="Type" value={changeType} options={CHANGE_TYPES} onChange={setChangeType} />
      <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Notes" multiline />
      <TouchableOpacity style={styles.submitBtn} onPress={() => void submit()} disabled={saving}>
        <Text style={styles.submitBtnText}>{saving ? 'Saving…' : 'Submit for approval'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function AbsenceLogForm({
  companyId,
  campers,
  defaultDate,
  onSaved,
}: {
  companyId: string;
  campers: Camper[];
  defaultDate: string;
  onSaved: () => void;
}) {
  const [camperId, setCamperId] = useState('');
  const [absenceDate, setAbsenceDate] = useState(defaultDate);
  const [absenceType, setAbsenceType] = useState('absent');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => setAbsenceDate(defaultDate), [defaultDate]);

  const submit = async () => {
    if (!camperId) return Alert.alert('Error', 'Select a camper');
    setSaving(true);
    try {
      const familyId = await lookupFamilyIdForCamper(supabase, companyId, camperId);
      if (!familyId) {
        Alert.alert('Error', 'Camper not linked to a family');
        return;
      }
      const { error } = await supabase.from('absences').insert({
        company_id: companyId,
        family_id: familyId,
        camper_id: camperId,
        absence_date: absenceDate,
        absence_type: absenceType,
        reason: reason || null,
        status: 'submitted',
      });
      if (error) throw error;
      Alert.alert('Submitted', 'Approve in Pending tab');
      setReason('');
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Log absence</Text>
      <CamperPicker label="Camper" campers={campers} value={camperId} onChange={setCamperId} />
      <TextInput style={styles.input} value={absenceDate} onChangeText={setAbsenceDate} placeholder="YYYY-MM-DD" />
      <OptionPicker label="Type" value={absenceType} options={ABSENCE_TYPES} onChange={setAbsenceType} />
      <TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder="Reason" />
      <TouchableOpacity style={styles.submitBtn} onPress={() => void submit()} disabled={saving}>
        <Text style={styles.submitBtnText}>{saving ? 'Saving…' : 'Submit for approval'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function SwimLogForm({
  companyId,
  campers,
  defaultDate,
  onSaved,
}: {
  companyId: string;
  campers: Camper[];
  defaultDate: string;
  onSaved: () => void;
}) {
  const [camperId, setCamperId] = useState('');
  const [lessonDate, setLessonDate] = useState(defaultDate);
  const [time, setTime] = useState('10:00');
  const [staffConfirmed, setStaffConfirmed] = useState(true);
  const [instructor, setInstructor] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => setLessonDate(defaultDate), [defaultDate]);

  const busHint = useMemo(() => {
    try {
      return swimLessonBusRun(campDateTimeToIso(lessonDate, time)).toUpperCase();
    } catch {
      return 'AM/PM';
    }
  }, [lessonDate, time]);

  const submit = async () => {
    if (!camperId) return Alert.alert('Error', 'Select a camper');
    setSaving(true);
    try {
      const { error } = await supabase.from('swim_lessons').insert({
        company_id: companyId,
        camper_id: camperId,
        scheduled_at: campDateTimeToIso(lessonDate, time),
        duration_minutes: 30,
        instructor: instructor || null,
        parent_confirmed: staffConfirmed,
        parent_confirmed_at: staffConfirmed ? new Date().toISOString() : null,
        transport_status: staffConfirmed ? 'submitted' : null,
      });
      if (error) throw error;
      Alert.alert('Scheduled', `Approve to remove camper from ${busHint} bus`);
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Log swim lesson (bus exception)</Text>
      <Text style={styles.formHint}>Skips {busHint} bus when approved</Text>
      <CamperPicker label="Camper" campers={campers} value={camperId} onChange={setCamperId} />
      <TextInput style={styles.input} value={lessonDate} onChangeText={setLessonDate} placeholder="YYYY-MM-DD" />
      <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="HH:MM (24h)" />
      <TextInput style={styles.input} value={instructor} onChangeText={setInstructor} placeholder="Instructor" />
      <View style={styles.switchRow}>
        <Text style={styles.fieldLabel}>Staff confirmed</Text>
        <Switch value={staffConfirmed} onValueChange={setStaffConfirmed} />
      </View>
      <TouchableOpacity style={styles.submitBtn} onPress={() => void submit()} disabled={saving}>
        <Text style={styles.submitBtnText}>{saving ? 'Saving…' : 'Schedule lesson'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function NurseLogForm({
  companyId,
  campers,
  defaultDate,
  onSaved,
}: {
  companyId: string;
  campers: Camper[];
  defaultDate: string;
  onSaved: () => void;
}) {
  const [camperId, setCamperId] = useState('');
  const [recordDate, setRecordDate] = useState(defaultDate);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => setRecordDate(defaultDate), [defaultDate]);

  const camper = campers.find((c) => c.id === camperId);

  const submit = async () => {
    if (!camper) return Alert.alert('Error', 'Select a camper');
    setSaving(true);
    try {
      const { error } = await supabase.from('nurse_records').insert({
        company_id: companyId,
        date: recordDate,
        camper_name: camper.name,
        group_name: camper.group_name,
        reason: reason || null,
        sent_home: true,
        transport_status: 'submitted',
      });
      if (error) throw error;
      Alert.alert('Logged', 'Approve in Pending tab to remove from bus');
      setReason('');
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Nurse sent home</Text>
      <Text style={styles.formHint}>Removes camper from AM & PM bus when approved</Text>
      <CamperPicker label="Camper" campers={campers} value={camperId} onChange={setCamperId} />
      <TextInput style={styles.input} value={recordDate} onChangeText={setRecordDate} placeholder="YYYY-MM-DD" />
      <TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder="Reason" />
      <TouchableOpacity style={styles.submitBtn} onPress={() => void submit()} disabled={saving}>
        <Text style={styles.submitBtnText}>{saving ? 'Saving…' : 'Log sent home'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    gap: 8,
  },
  menuBtn: { padding: 4 },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    gap: 12,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  dateBtnText: { fontSize: 14, color: theme.colors.text },
  todayLink: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.md, gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  statNum: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginTop: 8,
    paddingHorizontal: theme.spacing.md,
  },
  tab: { paddingVertical: 12, marginRight: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: theme.colors.primary },
  content: { flex: 1, padding: theme.spacing.md },
  empty: { textAlign: 'center', color: theme.colors.textSecondary, marginTop: 24 },
  pendingCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  pendingSubtitle: { fontSize: 12, color: '#b45309', marginTop: 2 },
  exceptionCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, flex: 1 },
  meta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  detail: { fontSize: 13, color: theme.colors.text, marginTop: 6 },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeAmber: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 11, fontWeight: '600', color: theme.colors.text },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
  },
  approveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  logStack: { gap: 12 },
  formCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 14,
  },
  formTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  formHint: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 10 },
  fieldBlock: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
  },
  pickerBtnText: { fontSize: 14, color: theme.colors.text, flex: 1 },
  placeholder: { color: theme.colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '600' },
  searchInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  optionSheet: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginVertical: 'auto',
    borderRadius: 12,
    padding: 8,
  },
  pickerOption: { paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  pickerOptionActive: { backgroundColor: '#eff6ff' },
  pickerOptionText: { fontSize: 15, color: theme.colors.text },
});
