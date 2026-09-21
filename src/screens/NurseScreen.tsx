import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

type NurseRecord = {
  id: string;
  date: string | null;
  camper_name: string | null;
  reason: string | null;
  reason_other: string | null;
  treatment: string | null;
  treatment_other: string | null;
  location_of_incident: string | null;
  group_name: string | null;
  counselor: string | null;
  nurse_name: string | null;
  sent_home: boolean | null;
  transport_status: string | null;
  called_home: boolean | null;
  notes: string | null;
  created_at: string;
};

type RecordForm = {
  date: string;
  camper_name: string;
  group_name: string;
  counselor: string;
  location_of_incident: string;
  reason_other: string;
  treatment_other: string;
  nurse_name: string;
  sent_home: boolean;
  called_home: boolean;
  notes: string;
};

const emptyForm = (): RecordForm => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  camper_name: '',
  group_name: '',
  counselor: '',
  location_of_incident: '',
  reason_other: '',
  treatment_other: '',
  nurse_name: '',
  sent_home: false,
  called_home: false,
  notes: '',
});

function recordToForm(record: NurseRecord): RecordForm {
  return {
    date: record.date ?? format(new Date(), 'yyyy-MM-dd'),
    camper_name: record.camper_name ?? '',
    group_name: record.group_name ?? '',
    counselor: record.counselor ?? '',
    location_of_incident: record.location_of_incident ?? '',
    reason_other: record.reason_other ?? '',
    treatment_other: record.treatment_other ?? '',
    nurse_name: record.nurse_name ?? '',
    sent_home: !!record.sent_home,
    called_home: !!record.called_home,
    notes: record.notes ?? '',
  };
}

function formToPayload(form: RecordForm, existing?: NurseRecord): Partial<NurseRecord> {
  const keepAcknowledged =
    existing?.sent_home && form.sent_home && existing.transport_status === 'acknowledged';
  return {
    date: form.date,
    camper_name: form.camper_name.trim() || null,
    group_name: form.group_name.trim() || null,
    counselor: form.counselor.trim() || null,
    location_of_incident: form.location_of_incident.trim() || null,
    reason_other: form.reason_other.trim() || null,
    treatment_other: form.treatment_other.trim() || null,
    nurse_name: form.nurse_name.trim() || null,
    sent_home: form.sent_home,
    called_home: form.called_home,
    notes: form.notes.trim() || null,
    transport_status: form.sent_home ? (keepAcknowledged ? 'acknowledged' : 'submitted') : null,
  };
}

function recordSummary(record: NurseRecord): string {
  const parts = [
    record.reason_other?.trim(),
    record.treatment_other?.trim(),
    record.location_of_incident?.trim(),
  ].filter(Boolean);
  return parts[0] ?? 'No details yet';
}

export function NurseScreen({ navigation }: any) {
  const { companyId } = useCompany();
  const [records, setRecords] = useState<NurseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecordForm>(emptyForm);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data: r, error } = await supabase
      .from('nurse_records')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: false });

    if (error) Alert.alert('Error', error.message);
    setRecords((r as NurseRecord[]) ?? []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const openEditModal = (record: NurseRecord) => {
    setEditingId(record.id);
    setForm(recordToForm(record));
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
    setEditingId(null);
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    if (!companyId) return;

    const existing = editingId ? records.find((r) => r.id === editingId) : undefined;
    const payload = formToPayload(form, existing);
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('nurse_records')
          .update(payload)
          .eq('id', editingId)
          .eq('company_id', companyId);
        if (error) throw error;
        setRecords((prev) =>
          prev.map((r) => (r.id === editingId ? { ...r, ...payload } as NurseRecord : r)),
        );
      } else {
        const { data, error } = await supabase
          .from('nurse_records')
          .insert({ company_id: companyId, ...payload })
          .select()
          .single();
        if (error) throw error;
        setRecords((prev) => [data as NurseRecord, ...prev]);
      }

      setModalVisible(false);
      setEditingId(null);
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Could not save record.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to remove this record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!companyId) return;
          setRecords((prev) => prev.filter((r) => r.id !== id));
          const { error } = await supabase
            .from('nurse_records')
            .delete()
            .eq('id', id)
            .eq('company_id', companyId);
          if (error) Alert.alert('Error', error.message);
        },
      },
    ]);
  };

  const updateForm = (patch: Partial<RecordForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  if (loading && records.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
            <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health Center</Text>
        </View>
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 24 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Ionicons name="medical" size={24} color="#fff" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Health Center</Text>
          <Text style={styles.headerSubtitle}>Track incidents and treatments</Text>
        </View>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="list" size={18} color={theme.colors.text} />
              <Text style={styles.cardTitle}>Incident & Treatment Records</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addButtonText}>Add record</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listContainer}>
            {records.length === 0 ? (
              <Text style={styles.emptyText}>No records yet. Tap Add record to create one.</Text>
            ) : (
              records.map((r) => (
                <View key={r.id} style={styles.listItem}>
                  <TouchableOpacity
                    style={styles.listItemMain}
                    onPress={() => openEditModal(r)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.listItemTitle}>
                      {r.camper_name?.trim() || 'Unnamed camper'}
                    </Text>
                    <Text style={styles.listItemMeta} numberOfLines={1}>
                      {r.date ? format(new Date(r.date + 'T00:00:00'), 'MM/dd/yy') : '—'}
                      {r.group_name ? ` · ${r.group_name}` : ''}
                      {r.nurse_name ? ` · ${r.nurse_name}` : ''}
                    </Text>
                    <Text style={styles.listItemSummary} numberOfLines={2}>
                      {recordSummary(r)}
                    </Text>
                    {(r.sent_home || r.called_home) && (
                      <View style={styles.badgeRow}>
                        {r.sent_home ? (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>Sent home</Text>
                          </View>
                        ) : null}
                        {r.called_home ? (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>Called home</Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteRecord(r.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit record' : 'Add record'}
              </Text>
              <TouchableOpacity onPress={closeModal} disabled={saving}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.datePickerText}>
                  {format(new Date(form.date + 'T00:00:00'), 'MM/dd/yy')}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(form.date + 'T00:00:00')}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      updateForm({ date: format(selectedDate, 'yyyy-MM-dd') });
                    }
                  }}
                />
              )}

              <Text style={styles.label}>Camper</Text>
              <TextInput
                style={styles.input}
                value={form.camper_name}
                onChangeText={(v) => updateForm({ camper_name: v })}
                placeholder="Camper name"
              />

              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Group Name</Text>
                  <TextInput
                    style={styles.input}
                    value={form.group_name}
                    onChangeText={(v) => updateForm({ group_name: v })}
                    placeholder="Group"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={styles.flex1}>
                  <Text style={styles.label}>Counselor</Text>
                  <TextInput
                    style={styles.input}
                    value={form.counselor}
                    onChangeText={(v) => updateForm({ counselor: v })}
                    placeholder="Counselor"
                  />
                </View>
              </View>

              <Text style={styles.label}>Location of Incident</Text>
              <TextInput
                style={styles.input}
                value={form.location_of_incident}
                onChangeText={(v) => updateForm({ location_of_incident: v })}
                placeholder="Location"
              />

              <Text style={styles.label}>Reason (other)</Text>
              <TextInput
                style={styles.input}
                value={form.reason_other}
                onChangeText={(v) => updateForm({ reason_other: v })}
                placeholder="Reason"
              />

              <Text style={styles.label}>Treatment (other)</Text>
              <TextInput
                style={styles.input}
                value={form.treatment_other}
                onChangeText={(v) => updateForm({ treatment_other: v })}
                placeholder="Treatment"
              />

              <Text style={styles.label}>Nurse Name</Text>
              <TextInput
                style={styles.input}
                value={form.nurse_name}
                onChangeText={(v) => updateForm({ nurse_name: v })}
                placeholder="Nurse Name"
              />

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => updateForm({ sent_home: !form.sent_home })}
                >
                  <Ionicons
                    name={form.sent_home ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={form.sent_home ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={styles.checkboxLabel}>Sent Home</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => updateForm({ called_home: !form.called_home })}
                >
                  <Ionicons
                    name={form.called_home ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={form.called_home ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={styles.checkboxLabel}>Called Home</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingId ? 'Save changes' : 'Save record'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  menuButton: {
    marginRight: 8,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#fafafa',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 8,
    flexShrink: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  listContainer: {
    padding: 0,
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  listItemMain: {
    flex: 1,
    paddingRight: 8,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  listItemMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  listItemSummary: {
    fontSize: 13,
    color: theme.colors.text,
    marginTop: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  badge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369a1',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 4,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: '#fafafa',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fafafa',
  },
  datePickerText: {
    marginLeft: 4,
    fontSize: 14,
    color: theme.colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    marginLeft: 6,
    fontSize: 13,
    color: theme.colors.text,
  },
  deleteButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  saveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    minHeight: 46,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
