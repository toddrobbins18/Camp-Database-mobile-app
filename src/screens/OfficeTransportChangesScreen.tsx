import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

type Change = {
  id: string;
  change_date: string;
  camper_name: string;
  group_division: string | null;
  note: string;
  done: boolean;
  notified_at: string | null;
  created_at: string;
};

export function OfficeTransportChangesScreen({ navigation }: any) {
  const { companyId } = useCompany();
  const [rows, setRows] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [camper, setCamper] = useState('');
  const [group, setGroup] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from('office_transport_changes')
      .select('*')
      .eq('company_id', companyId)
      .order('change_date', { ascending: false })
      .order('created_at', { ascending: false });
    setRows((data ?? []) as Change[]);
    setLoading(false);
  };

  useEffect(() => {
    if (companyId) {
      load();
    }
  }, [companyId]);

  const submit = async () => {
    if (!companyId) return;
    if (!camper.trim() || !note.trim()) {
      Alert.alert('Error', 'Camper name and note are required');
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data: inserted, error } = await supabase
      .from('office_transport_changes')
      .insert({
        company_id: companyId,
        change_date: format(date, 'yyyy-MM-dd'),
        camper_name: camper.trim(),
        group_division: group.trim() || null,
        note: note.trim(),
        logged_by: userData.user?.id ?? null,
      })
      .select()
      .single();

    if (error) {
      setSaving(false);
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert('Success', 'Change logged and transport team notified');
    setCamper(''); setGroup(''); setNote(''); setDate(new Date());
    setSaving(false);
    load();
  };

  const toggleDone = async (id: string, done: boolean) => {
    const { error } = await supabase
      .from('office_transport_changes')
      .update({ done })
      .eq('id', id);
    if (error) return Alert.alert('Error', error.message);
    setRows(prev => prev.map(r => r.id === id ? { ...r, done } : r));
  };

  const remove = (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to remove this change?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('office_transport_changes').delete().eq('id', id);
          if (error) return Alert.alert('Error', error.message);
          setRows(prev => prev.filter(r => r.id !== id));
        }
      }
    ]);
  };

  if (loading && rows.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="call" size={24} color="#fff" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Office Transport Changes</Text>
          <Text style={styles.headerSubtitle}>Log parent phone calls</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="add" size={18} color={theme.colors.text} />
            <Text style={styles.cardTitle}>New change</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.datePickerText}>{format(date, 'MMM d, yyyy')}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}

            <Text style={styles.label}>Camper</Text>
            <TextInput
              style={styles.input}
              value={camper}
              onChangeText={setCamper}
              placeholder="First and last name"
            />

            <Text style={styles.label}>Group / Division</Text>
            <TextInput
              style={styles.input}
              value={group}
              onChangeText={setGroup}
              placeholder="e.g. Everest"
            />

            <Text style={styles.label}>Note</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={note}
              onChangeText={setNote}
              placeholder="Being picked up at 2:30pm by mom…"
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity 
              style={[styles.submitButton, saving && styles.submitButtonDisabled]} 
              onPress={submit}
              disabled={saving}
            >
              <Ionicons name="mail" size={18} color="#fff" />
              <Text style={styles.submitButtonText}>{saving ? 'Logging...' : 'Log Change'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bus" size={18} color={theme.colors.text} />
            <Text style={styles.cardTitle}>Recent changes</Text>
          </View>
          <View style={styles.listContainer}>
            {rows.length === 0 ? (
              <Text style={styles.emptyText}>No changes logged yet.</Text>
            ) : (
              rows.map(r => (
                <View key={r.id} style={[styles.listItem, r.done && styles.listItemDone]}>
                  <TouchableOpacity onPress={() => toggleDone(r.id, !r.done)} style={styles.checkboxContainer}>
                    <Ionicons name={r.done ? "checkbox" : "square-outline"} size={24} color={r.done ? theme.colors.primary : theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <View style={styles.listContent}>
                    <View style={styles.listHeaderRow}>
                      <Text style={styles.listName}>{r.camper_name}</Text>
                      <Text style={styles.listDate}>{format(new Date(r.change_date), 'M/d')}</Text>
                    </View>
                    {r.group_division ? <Text style={styles.listGroup}>{r.group_division}</Text> : null}
                    <Text style={styles.listNote}>{r.note}</Text>
                    <View style={styles.listFooterRow}>
                      {r.notified_at ? (
                        <View style={styles.badgeSent}><Text style={styles.badgeSentText}>Sent</Text></View>
                      ) : (
                        <Text style={styles.badgeNotSent}>—</Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => remove(r.id)} style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
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
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#fafafa',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 8,
  },
  cardContent: {
    padding: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  datePickerText: {
    marginLeft: 8,
    fontSize: 15,
    color: theme.colors.text,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
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
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'flex-start',
  },
  listItemDone: {
    opacity: 0.6,
  },
  checkboxContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  listContent: {
    flex: 1,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listName: {
    fontWeight: '600',
    fontSize: 15,
    color: theme.colors.text,
  },
  listDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  listGroup: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  listNote: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 8,
  },
  listFooterRow: {
    flexDirection: 'row',
  },
  badgeSent: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  badgeSentText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '600',
  },
  badgeNotSent: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
});
