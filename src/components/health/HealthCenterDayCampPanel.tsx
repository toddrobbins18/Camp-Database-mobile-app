import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { useCampBrandTheme } from '../../hooks/useCampBrandTheme';
import { StyledCard } from '../StyledCard';
import { supabase } from '../../lib/supabase';
import {
  HealthCenterVisitFormFields,
  emptyHealthCenterVisitForm,
  type HealthCenterVisitFormState,
} from './HealthCenterVisitFormFields';
import {
  healthVisitGroupForCamper,
  type HealthCenterVisitExtraFields,
} from '../../lib/healthCenterVisitOptions';
import {
  healthVisitCalledHomeToBoolean,
  isHealthVisitSentHome,
  submitNurseSentHomeTransportException,
} from '../../lib/nurseTransportException';

type CamperRow = {
  id: string;
  name: string;
  group_name?: string | null;
  division?: { name?: string | null } | null;
  leader?: { name?: string | null } | null;
  bunk?: { bunk_name?: string | null; bunk_number?: number | null } | null;
};

type StaffRow = {
  id: string;
  name: string;
  role?: string | null;
};

export type VisitRow = {
  id: string;
  admitted_at: string;
  reason?: string | null;
  treatment?: string | null;
  incident_location?: string | null;
  group_name?: string | null;
  counselor_name?: string | null;
  nurse_name?: string | null;
  sent_home?: string | null;
  called_home?: string | null;
  notes?: string | null;
  child_id?: string | null;
  staff_id?: string | null;
  children?: { name?: string | null } | null;
  staff?: { name?: string | null } | null;
};

type Props = {
  companyId: string;
  season: string;
  children: CamperRow[];
  staff: StaffRow[];
  visits: VisitRow[];
  onVisitLogged: () => void;
  mode?: 'full' | 'log-only';
};

function visitPersonName(row: VisitRow): string {
  return row.children?.name || row.staff?.name || 'Unknown';
}

export function HealthCenterVisitDetailRows({ visit }: { visit: VisitRow }) {
  const rows: { label: string; value: string }[] = [];
  if (visit.treatment) rows.push({ label: 'Treatment', value: visit.treatment });
  if (visit.incident_location) rows.push({ label: 'Location', value: visit.incident_location });
  if (visit.group_name) rows.push({ label: 'Group', value: visit.group_name });
  if (visit.counselor_name) rows.push({ label: 'Counselor', value: visit.counselor_name });
  if (visit.nurse_name) rows.push({ label: 'Nurse', value: visit.nurse_name });
  if (visit.sent_home) rows.push({ label: 'Sent home', value: visit.sent_home });
  if (visit.called_home) rows.push({ label: 'Called home', value: visit.called_home });
  if (visit.notes) rows.push({ label: 'Notes', value: visit.notes });

  if (rows.length === 0) return null;

  return (
    <View style={detailStyles.grid}>
      {rows.map((r) => (
        <View key={r.label} style={detailStyles.row}>
          <Text style={detailStyles.label}>{r.label}</Text>
          <Text style={detailStyles.value}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

function VisitCard({ visit }: { visit: VisitRow }) {
  const dt = new Date(visit.admitted_at);
  return (
    <View style={styles.visitCard}>
      <View style={styles.visitCardHeader}>
        <Text style={styles.visitDate}>
          {dt.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
        <Text style={styles.visitName}>{visitPersonName(visit)}</Text>
      </View>
      {visit.reason ? <Text style={styles.visitReason}>{visit.reason}</Text> : null}
      <HealthCenterVisitDetailRows visit={visit} />
    </View>
  );
}

export function HealthCenterDayCampPanel({
  companyId,
  season,
  children,
  staff,
  visits,
  onVisitLogged,
  mode = 'full',
}: Props) {
  const { brand, brandMuted, brandSoft } = useCampBrandTheme();
  const [entityType, setEntityType] = useState<'camper' | 'staff'>('camper');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visitDate, setVisitDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [form, setForm] = useState<HealthCenterVisitFormState>(emptyHealthCenterVisitForm());
  const [saving, setSaving] = useState(false);

  const groupOptions = useMemo(() => {
    const names = children
      .map((c) => healthVisitGroupForCamper(c, true))
      .filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [children]);

  const counselorOptions = useMemo(() => {
    const names = [
      ...children.map((c) => c.leader?.name?.trim()).filter(Boolean),
      ...staff.map((s) => s.name?.trim()).filter(Boolean),
    ] as string[];
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [children, staff]);

  const nurseOptions = useMemo(() => {
    const fromVisits = visits.map((v) => v.nurse_name?.trim()).filter((n): n is string => Boolean(n));
    return [...new Set(fromVisits)];
  }, [visits]);

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list =
      entityType === 'camper'
        ? children.map((c) => ({
            id: c.id,
            name: c.name,
            subtitle: healthVisitGroupForCamper(c, true),
          }))
        : staff.map((s) => ({
            id: s.id,
            name: s.name,
            subtitle: s.role || 'Staff',
          }));
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q),
    );
  }, [children, staff, entityType, search]);

  const selectPerson = (id: string) => {
    setSelectedId(id);
    if (entityType === 'camper') {
      const camper = children.find((c) => c.id === id);
      if (camper) {
        setForm((prev) => ({
          ...prev,
          group_name: healthVisitGroupForCamper(camper, true),
          counselor_name: camper.leader?.name?.trim() || '',
        }));
      }
    } else {
      setForm((prev) => ({ ...prev, group_name: '' }));
    }
  };

  useEffect(() => {
    if (entityType !== 'camper' || !selectedId) return;
    const camper = children.find((c) => c.id === selectedId);
    if (!camper) return;
    const group_name = healthVisitGroupForCamper(camper, true);
    const counselor_name = camper.leader?.name?.trim() || '';
    setForm((prev) =>
      prev.group_name === group_name && prev.counselor_name === counselor_name
        ? prev
        : { ...prev, group_name, counselor_name },
    );
  }, [entityType, selectedId, children]);

  const logVisit = async () => {
    if (!selectedId) {
      Alert.alert('Select a person', 'Choose a camper or staff member first.');
      return;
    }
    if (!form.reason.trim()) {
      Alert.alert('Reason required', 'Enter the reason for the visit.');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date();
      const [y, m, d] = visitDate.split('-').map(Number);
      const admittedAt = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());

      const extra: HealthCenterVisitExtraFields = {
        treatment: form.treatment || null,
        incident_location: form.incident_location || null,
        group_name: form.group_name || null,
        counselor_name: form.counselor_name || null,
        nurse_name: form.nurse_name || null,
        sent_home: form.sent_home || null,
        called_home: form.called_home || null,
      };

      const insertData: Record<string, unknown> = {
        company_id: companyId,
        season,
        visit_type: 'observation',
        reason: form.reason.trim(),
        notes: form.notes?.trim() || null,
        admitted_at: admittedAt.toISOString(),
        checked_out_at: admittedAt.toISOString(),
        admitted_by: user?.id,
        checked_out_by: user?.id,
        ...extra,
      };

      if (entityType === 'camper') {
        insertData.child_id = selectedId;
      } else {
        insertData.staff_id = selectedId;
      }

      const { error } = await supabase.from('health_center_admissions').insert(insertData);
      if (error) throw error;

      const selectedCamper =
        entityType === 'camper' ? children.find((c) => c.id === selectedId) : undefined;
      const camperSentHome =
        entityType === 'camper' && isHealthVisitSentHome(form.sent_home);

      setForm(emptyHealthCenterVisitForm());
      setSelectedId(null);
      setSearch('');
      onVisitLogged();

      if (camperSentHome && selectedCamper) {
        try {
          const transport = await submitNurseSentHomeTransportException(supabase, {
            companyId,
            date: visitDate,
            camperName: selectedCamper.name,
            groupName: form.group_name || selectedCamper.group_name,
            reason: form.reason.trim(),
            nurseName: form.nurse_name,
            counselorName: form.counselor_name,
            calledHome: healthVisitCalledHomeToBoolean(form.called_home),
          });
          if (transport.skipped) {
            Alert.alert(
              'Visit logged',
              'Transport already approved this camper for today.',
            );
          } else {
            Alert.alert(
              'Visit logged — sent to transport',
              'Pending approval in Transport Admin. No need to re-enter under Log change.',
            );
          }
        } catch (transportErr) {
          console.error(transportErr);
          Alert.alert(
            'Visit logged',
            'Could not queue transport exception. Ask transport staff to log sent home under Transport Admin.',
          );
        }
      } else {
        Alert.alert('Visit logged');
      }
    } catch (err) {
      console.error(err);
      Alert.alert(
        'Could not log visit',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const sortedVisits = useMemo(
    () => [...visits].sort((a, b) => b.admitted_at.localeCompare(a.admitted_at)),
    [visits],
  );

  if (mode === 'log-only') {
    return (
      <StyledCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="clipboard-outline" size={22} color={theme.colors.text} />
          <Text style={styles.cardTitle}>Visit Log</Text>
        </View>
        <Text style={styles.cardSubtitle}>{sortedVisits.length} visits this season</Text>
        {sortedVisits.length === 0 ? (
          <Text style={styles.emptyText}>No visits logged yet</Text>
        ) : (
          <View style={{ gap: 10, marginTop: 12 }}>
            {sortedVisits.map((v) => (
              <VisitCard key={v.id} visit={v} />
            ))}
          </View>
        )}
      </StyledCard>
    );
  }

  const selectedName = filteredPeople.find((p) => p.id === selectedId)?.name;

  return (
    <View style={{ gap: 16 }}>
      <StyledCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="add-circle-outline" size={22} color={brand} />
          <Text style={styles.cardTitle}>Log Health Center Visit</Text>
        </View>
        <Text style={styles.cardSubtitle}>
          Select camper or staff, then fill in visit details like your Airtable log
        </Text>

        <Text style={styles.fieldLabel}>Date</Text>
        <TextInput
          style={styles.dateInput}
          value={visitDate}
          onChangeText={setVisitDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.colors.textSecondary}
        />

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              entityType === 'camper' && [styles.toggleBtnActive, { backgroundColor: brandSoft }],
            ]}
            onPress={() => {
              setEntityType('camper');
              setSelectedId(null);
            }}
          >
            <Text style={[styles.toggleText, entityType === 'camper' && styles.toggleTextActive]}>
              Campers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              entityType === 'staff' && [styles.toggleBtnActive, { backgroundColor: brandSoft }],
            ]}
            onPress={() => {
              setEntityType('staff');
              setSelectedId(null);
            }}
          >
            <Text style={[styles.toggleText, entityType === 'staff' && styles.toggleTextActive]}>
              Staff
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>
          Search {entityType === 'camper' ? 'campers' : 'staff'}
          {filteredPeople.length > 0
            ? ` (${filteredPeople.length}${search.trim() ? ' matches' : ' total'})`
            : ''}
        </Text>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Type a name..."
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <ScrollView style={styles.peopleList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {filteredPeople.length === 0 ? (
            <Text style={styles.emptyText}>No matches</Text>
          ) : (
            filteredPeople.map((person) => (
              <TouchableOpacity
                key={person.id}
                style={[
                  styles.personRow,
                  selectedId === person.id && { backgroundColor: brandMuted },
                ]}
                onPress={() => selectPerson(person.id)}
              >
                <Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{person.name}</Text>
                  {person.subtitle ? (
                    <Text style={styles.personSubtitle}>{person.subtitle}</Text>
                  ) : null}
                </View>
                {selectedId === person.id ? (
                  <View style={[styles.selectedBadge, { backgroundColor: brandMuted }]}>
                    <Text style={[styles.selectedBadgeText, { color: brand }]}>Selected</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {selectedId ? (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>
              Visit for <Text style={{ color: brand, fontWeight: '700' }}>{selectedName}</Text>
            </Text>
            <HealthCenterVisitFormFields
              value={form}
              onChange={setForm}
              groupOptions={groupOptions}
              counselorOptions={counselorOptions}
              nurseOptions={nurseOptions}
              disabled={saving}
            />
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  setSelectedId(null);
                  setForm(emptyHealthCenterVisitForm());
                }}
                disabled={saving}
              >
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: brand }]} onPress={logVisit} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Log visit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </StyledCard>

      <StyledCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="list-outline" size={22} color={theme.colors.text} />
          <Text style={styles.cardTitle}>Recent visits</Text>
        </View>
        <Text style={styles.cardSubtitle}>{sortedVisits.length} visits this season</Text>
        {sortedVisits.length === 0 ? (
          <Text style={styles.emptyText}>No visits logged yet</Text>
        ) : (
          <View style={{ gap: 10, marginTop: 12 }}>
            {sortedVisits.slice(0, 50).map((v) => (
              <VisitCard key={v.id} visit={v} />
            ))}
          </View>
        )}
      </StyledCard>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  grid: { marginTop: 8, gap: 4 },
  row: { flexDirection: 'row', gap: 8 },
  label: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, width: 88 },
  value: { fontSize: 12, color: theme.colors.text, flex: 1 },
});

const styles = StyleSheet.create({
  card: { padding: 16 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  cardSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 12 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
    marginTop: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 4,
    marginTop: 12,
  },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: theme.colors.background },
  toggleText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },
  toggleTextActive: { color: theme.colors.text, fontWeight: '600' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: theme.colors.text },
  peopleList: { maxHeight: 180, marginTop: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8 },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  personName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  personSubtitle: { fontSize: 12, color: theme.colors.textSecondary },
  selectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedBadgeText: { fontSize: 11, fontWeight: '600' },
  formSection: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formSectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12, color: theme.colors.text },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  clearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clearBtnText: { fontSize: 15, color: theme.colors.text },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    paddingVertical: 16,
    fontSize: 14,
  },
  visitCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  visitCardHeader: { marginBottom: 4 },
  visitDate: { fontSize: 12, color: theme.colors.textSecondary },
  visitName: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  visitReason: { fontSize: 14, color: theme.colors.text, marginTop: 4 },
});
