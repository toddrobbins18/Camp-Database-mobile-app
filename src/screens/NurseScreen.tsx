import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  called_home: boolean | null;
  notes: string | null;
  created_at: string;
};

export function NurseScreen({ navigation }: any) {
  const { companyId } = useCompany();
  const [records, setRecords] = useState<NurseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [datePickerId, setDatePickerId] = useState<string | null>(null);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data: r, error } = await supabase
      .from("nurse_records")
      .select("*")
      .eq("company_id", companyId)
      .order("date", { ascending: false });
      
    if (error) Alert.alert('Error', error.message);
    setRecords((r as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [companyId]);

  const updateRecord = async (id: string, patch: Partial<NurseRecord>) => {
    if (!companyId) return;
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase.from("nurse_records").update(patch).eq("id", id).eq("company_id", companyId);
    if (error) Alert.alert('Error', error.message);
  };

  const addRecord = async () => {
    if (!companyId) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("nurse_records")
      .insert({ company_id: companyId, date: today })
      .select()
      .single();
    if (error) return Alert.alert('Error', error.message);
    setRecords((prev) => [data as any, ...prev]);
  };

  const deleteRecord = (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to remove this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          if (!companyId) return;
          setRecords((prev) => prev.filter((r) => r.id !== id));
          await supabase.from("nurse_records").delete().eq("id", id).eq("company_id", companyId);
        }
      }
    ]);
  };

  if (loading && records.length === 0) {
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
          <Ionicons name="medical" size={24} color="#fff" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Nurse Dashboard</Text>
          <Text style={styles.headerSubtitle}>Track incidents and treatments</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="list" size={18} color={theme.colors.text} />
              <Text style={styles.cardTitle}>Incident & Treatment Records</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={addRecord}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addButtonText}>Add record</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.listContainer}>
            {records.length === 0 ? (
              <Text style={styles.emptyText}>No records yet.</Text>
            ) : (
              records.map(r => (
                <View key={r.id} style={styles.listItem}>
                  
                  <View style={styles.row}>
                    <View style={styles.flex1}>
                      <Text style={styles.label}>Date</Text>
                      <TouchableOpacity style={styles.datePickerButton} onPress={() => setDatePickerId(r.id)}>
                        <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
                        <Text style={styles.datePickerText}>{r.date ? format(new Date(r.date + 'T00:00:00'), 'MM/dd/yy') : '—'}</Text>
                      </TouchableOpacity>
                      {datePickerId === r.id && (
                        <DateTimePicker
                          value={r.date ? new Date(r.date + 'T00:00:00') : new Date()}
                          mode="date"
                          display="default"
                          onChange={(event, selectedDate) => {
                            setDatePickerId(null);
                            if (selectedDate) updateRecord(r.id, { date: format(selectedDate, 'yyyy-MM-dd') });
                          }}
                        />
                      )}
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={styles.flex2}>
                      <Text style={styles.label}>Camper</Text>
                      <TextInput 
                        style={styles.input} 
                        value={r.camper_name || ''} 
                        onChangeText={(v) => updateRecord(r.id, { camper_name: v })} 
                        placeholder="Camper name"
                      />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.flex1}>
                      <Text style={styles.label}>Group Name</Text>
                      <TextInput 
                        style={styles.input} 
                        value={r.group_name || ''} 
                        onChangeText={(v) => updateRecord(r.id, { group_name: v })} 
                        placeholder="Group"
                      />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={styles.flex1}>
                      <Text style={styles.label}>Counselor</Text>
                      <TextInput 
                        style={styles.input} 
                        value={r.counselor || ''} 
                        onChangeText={(v) => updateRecord(r.id, { counselor: v })} 
                        placeholder="Counselor"
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>Location of Incident</Text>
                  <TextInput 
                    style={styles.input} 
                    value={r.location_of_incident || ''} 
                    onChangeText={(v) => updateRecord(r.id, { location_of_incident: v })} 
                    placeholder="Location"
                  />

                  <Text style={styles.label}>Reason (other)</Text>
                  <TextInput 
                    style={styles.input} 
                    value={r.reason_other || ''} 
                    onChangeText={(v) => updateRecord(r.id, { reason_other: v })} 
                    placeholder="Reason"
                  />

                  <Text style={styles.label}>Treatment (other)</Text>
                  <TextInput 
                    style={styles.input} 
                    value={r.treatment_other || ''} 
                    onChangeText={(v) => updateRecord(r.id, { treatment_other: v })} 
                    placeholder="Treatment"
                  />

                  <Text style={styles.label}>Nurse Name</Text>
                  <TextInput 
                    style={styles.input} 
                    value={r.nurse_name || ''} 
                    onChangeText={(v) => updateRecord(r.id, { nurse_name: v })} 
                    placeholder="Nurse Name"
                  />

                  <View style={styles.actionsRow}>
                    <TouchableOpacity 
                      style={styles.checkboxContainer} 
                      onPress={() => updateRecord(r.id, { sent_home: !r.sent_home })}
                    >
                      <Ionicons name={r.sent_home ? "checkbox" : "square-outline"} size={20} color={r.sent_home ? theme.colors.primary : theme.colors.textSecondary} />
                      <Text style={styles.checkboxLabel}>Sent Home</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.checkboxContainer} 
                      onPress={() => updateRecord(r.id, { called_home: !r.called_home })}
                    >
                      <Ionicons name={r.called_home ? "checkbox" : "square-outline"} size={20} color={r.called_home ? theme.colors.primary : theme.colors.textSecondary} />
                      <Text style={styles.checkboxLabel}>Called Home</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteButton} onPress={() => deleteRecord(r.id)}>
                      <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>

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
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 8,
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
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
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
    paddingVertical: 6,
    fontSize: 13,
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
    paddingVertical: 6,
    backgroundColor: '#fafafa',
  },
  datePickerText: {
    marginLeft: 4,
    fontSize: 13,
    color: theme.colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
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
});
