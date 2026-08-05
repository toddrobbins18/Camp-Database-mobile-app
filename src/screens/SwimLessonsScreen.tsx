import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useSeasonContext } from '../contexts/SeasonContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

type Camper = { id: string; name: string; guardian_email: string | null };
type Lesson = {
  id: string;
  camper_id: string;
  scheduled_at: string;
  duration_minutes: number;
  instructor: string | null;
  location: string | null;
  cost_cents: number;
  status: string;
  parent_confirmed: boolean;
  parent_confirmed_at: string | null;
  reminder_sent_at: string | null;
  notes: string | null;
};

export function SwimLessonsScreen({ navigation }: any) {
  const { companyId } = useCompany();
  const { season } = useSeasonContext();
  const [campers, setCampers] = useState<Camper[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [camperId, setCamperId] = useState('');
  const [duration, setDuration] = useState('30');
  const [instructor, setInstructor] = useState('');
  const [location, setLocation] = useState('');
  const [cost, setCost] = useState('45');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!companyId) return;
    
    const [{ data: cs }, { data: ls }] = await Promise.all([
      supabase.from("children").select("id, name, guardian_email").eq("company_id", companyId).eq("season", season),
      supabase.from("swim_lessons").select("*").eq("company_id", companyId).order("scheduled_at", { ascending: true }),
    ]);
    
    setCampers((cs ?? []) as Camper[]);
    setLessons((ls ?? []) as Lesson[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [companyId, season]);

  const camperName = (id: string) => {
    const c = campers.find(x => x.id === id);
    return c ? c.name : "—";
  };
  
  const familyEmail = (id: string) => campers.find(f => f.id === id)?.guardian_email ?? "—";

  const submit = async () => {
    if (!companyId) return;
    if (!camperId) {
      Alert.alert('Error', 'Please select a camper');
      return;
    }
    
    setSaving(true);
    const scheduled_at = date.toISOString();
    
    const { error } = await supabase.from('swim_lessons').insert({
      company_id: companyId,
      camper_id: camperId,
      scheduled_at,
      duration_minutes: parseInt(duration) || 30,
      instructor: instructor || null,
      location: location || null,
      cost_cents: Math.round(parseFloat(cost || "0") * 100),
      notes: notes || null,
    });

    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert('Success', 'Swim lesson scheduled');
    setCamperId(''); setDuration('30'); setInstructor(''); setLocation(''); setCost('45'); setNotes(''); setDate(new Date());
    load();
  };

  const remove = (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to remove this lesson?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('swim_lessons').delete().eq('id', id);
          if (error) return Alert.alert('Error', error.message);
          setLessons(prev => prev.filter(r => r.id !== id));
        }
      }
    ]);
  };

  if (loading && lessons.length === 0) {
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
          <Ionicons name="water" size={24} color="#fff" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Swim Lessons</Text>
          <Text style={styles.headerSubtitle}>Schedule private lessons</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="add" size={18} color={theme.colors.text} />
            <Text style={styles.cardTitle}>Schedule a lesson</Text>
          </View>
          <View style={styles.cardContent}>
            
            <Text style={styles.label}>Camper</Text>
            {/* Simple camper select for mobile; in a real app might want a proper searchable dropdown */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.camperChips}>
              {campers.slice(0, 20).map(c => (
                <TouchableOpacity 
                  key={c.id} 
                  style={[styles.chip, camperId === c.id && styles.chipActive]}
                  onPress={() => setCamperId(c.id)}
                >
                  <Text style={[styles.chipText, camperId === c.id && styles.chipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.row}>
                <View style={styles.flex1}>
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
                        if (selectedDate) {
                            const newDate = new Date(date);
                            newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                            setDate(newDate);
                        }
                        }}
                    />
                    )}
                </View>
                <View style={{ width: 12 }} />
                <View style={styles.flex1}>
                    <Text style={styles.label}>Time</Text>
                    <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowTimePicker(true)}>
                    <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={styles.datePickerText}>{format(date, 'h:mm a')}</Text>
                    </TouchableOpacity>
                    {showTimePicker && (
                    <DateTimePicker
                        value={date}
                        mode="time"
                        display="default"
                        onChange={(event, selectedDate) => {
                        setShowTimePicker(false);
                        if (selectedDate) {
                            const newDate = new Date(date);
                            newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
                            setDate(newDate);
                        }
                        }}
                    />
                    )}
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.flex1}>
                    <Text style={styles.label}>Minutes</Text>
                    <TextInput
                    style={styles.input}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="numeric"
                    />
                </View>
                <View style={{ width: 12 }} />
                <View style={styles.flex1}>
                    <Text style={styles.label}>Cost (USD)</Text>
                    <TextInput
                    style={styles.input}
                    value={cost}
                    onChangeText={setCost}
                    keyboardType="numeric"
                    />
                </View>
            </View>

            <Text style={styles.label}>Instructor</Text>
            <TextInput
              style={styles.input}
              value={instructor}
              onChangeText={setInstructor}
            />

            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Main Pool"
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />

            <TouchableOpacity 
              style={[styles.submitButton, saving && styles.submitButtonDisabled]} 
              onPress={submit}
              disabled={saving}
            >
              <Ionicons name="calendar" size={18} color="#fff" />
              <Text style={styles.submitButtonText}>{saving ? 'Saving...' : 'Schedule'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="list" size={18} color={theme.colors.text} />
            <Text style={styles.cardTitle}>Scheduled lessons</Text>
          </View>
          <View style={styles.listContainer}>
            {lessons.length === 0 ? (
              <Text style={styles.emptyText}>No lessons scheduled yet.</Text>
            ) : (
              lessons.map(l => (
                <View key={l.id} style={styles.listItem}>
                  <View style={styles.listContent}>
                    <View style={styles.listHeaderRow}>
                      <Text style={styles.listName}>{camperName(l.camper_id)}</Text>
                      <Text style={styles.listDate}>{format(new Date(l.scheduled_at), 'MMM d, h:mm a')}</Text>
                    </View>
                    <Text style={styles.listGroup}>{familyEmail(l.camper_id)}</Text>
                    
                    <View style={styles.detailsGrid}>
                        <View style={styles.detailItem}>
                            <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
                            <Text style={styles.detailText}>{l.duration_minutes} min</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Ionicons name="person-outline" size={12} color={theme.colors.textSecondary} />
                            <Text style={styles.detailText}>{l.instructor || 'TBD'}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                            <Text style={styles.detailText}>{l.location || 'TBD'}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Ionicons name="cash-outline" size={12} color={theme.colors.textSecondary} />
                            <Text style={styles.detailText}>${(l.cost_cents / 100).toFixed(2)}</Text>
                        </View>
                    </View>

                    <View style={styles.listFooterRow}>
                      {l.parent_confirmed ? (
                        <View style={styles.badgeSent}><Text style={styles.badgeSentText}>Confirmed</Text></View>
                      ) : (
                        <View style={styles.badgePending}><Text style={styles.badgePendingText}>Pending</Text></View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => remove(l.id)} style={styles.deleteButton}>
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
    minHeight: 60,
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
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500'
  },
  listGroup: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%',
  },
  detailText: {
    fontSize: 12,
    color: theme.colors.text,
    marginLeft: 4,
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
  badgePending: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  badgePendingText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  camperChips: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: '#475569',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '500',
  }
});
