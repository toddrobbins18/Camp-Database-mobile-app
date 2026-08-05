import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';

type DayCampModuleParams = {
  DayCampModule: { moduleId?: string };
};

type Group = { id: string; name: string; sort_order: number };
type Camper = { id: string; full_name: string; group_id: string | null; parent_email: string | null; sort_order: number };
type TagOption = { id: string; category: string; label: string; color: string };
type Report = {
  id?: string;
  camper_id: string;
  report_date: string;
  sports: string[];
  activities: string[];
  lunch: string[];
  bm: boolean;
  napped: boolean;
  send_email: boolean;
  email_sent_at: string | null;
};

export function SunshineReportScreen({ navigation }: any) {
  const { companyId } = useCompany();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('');
  const [campers, setCampers] = useState<Camper[]>([]);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [reports, setReports] = useState<Record<string, Report>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId && date) {
      fetchReports();
    }
  }, [date, companyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [g, c, t] = await Promise.all([
        supabase.from('sunshine_groups').select('*').eq('company_id', companyId).order('sort_order'),
        supabase.from('sunshine_campers').select('*').eq('company_id', companyId).order('sort_order'),
        supabase.from('sunshine_tag_options').select('*').eq('company_id', companyId).order('sort_order'),
      ]);
      if (g.data) {
        setGroups(g.data);
        if (g.data.length && !activeGroupId) setActiveGroupId(g.data[0].id);
      }
      if (c.data) setCampers(c.data);
      if (t.data) setTagOptions(t.data as TagOption[]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchReports = async () => {
    const { data } = await supabase
      .from('sunshine_reports')
      .select('*')
      .eq('company_id', companyId)
      .eq('report_date', date);
    
    const map: Record<string, Report> = {};
    (data || []).forEach((r: any) => {
      map[r.camper_id] = r;
    });
    setReports(map);
  };

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const groupCampers = useMemo(
    () => campers.filter((c) => c.group_id === activeGroupId),
    [campers, activeGroupId]
  );

  const sportOptions = tagOptions.filter((t) => t.category === 'sport');
  const activityOptions = tagOptions.filter((t) => t.category === 'activity');
  const lunchOptions = tagOptions.filter((t) => t.category === 'lunch');

  const upsertReport = async (camperId: string, patch: Partial<Report>) => {
    if (!companyId) return;
    const existing = reports[camperId] || {
      camper_id: camperId,
      report_date: date,
      sports: [],
      activities: [],
      lunch: [],
      bm: false,
      napped: false,
      send_email: true,
      email_sent_at: null,
    };
    const next: Report = { ...existing, ...patch };
    setReports((prev) => ({ ...prev, [camperId]: next }));

    const { data, error } = await supabase
      .from('sunshine_reports')
      .upsert(
        {
          company_id: companyId,
          camper_id: camperId,
          report_date: date,
          sports: next.sports,
          activities: next.activities,
          lunch: next.lunch,
          bm: next.bm,
          napped: next.napped,
          send_email: next.send_email,
          email_sent_at: next.email_sent_at,
        },
        { onConflict: 'camper_id,report_date' }
      )
      .select()
      .single();
    
    if (data) {
      setReports((prev) => ({ ...prev, [camperId]: data as Report }));
    } else if (error) {
      console.error(error);
    }
  };

  const toggleTag = (camperId: string, field: 'sports' | 'activities' | 'lunch', label: string) => {
    const r = reports[camperId];
    const current = r?.[field] || [];
    const next = current.includes(label) ? current.filter((x) => x !== label) : [...current, label];
    upsertReport(camperId, { [field]: next });
  };

  const sendEndOfDayEmails = async () => {
    const toSend = groupCampers.filter((c) => {
      const r = reports[c.id];
      return r?.send_email && !r.email_sent_at && c.parent_email;
    });
    if (!toSend.length) {
      Alert.alert("Info", "No reports queued to send.");
      return;
    }
    const now = new Date().toISOString();
    let sentCount = 0;
    for (const c of toSend) {
      await supabase
        .from("sunshine_reports")
        .update({ email_sent_at: now })
        .eq("camper_id", c.id)
        .eq("report_date", date);
      setReports((prev) => ({ ...prev, [c.id]: { ...prev[c.id], email_sent_at: now } }));
      sentCount++;
    }
    Alert.alert("Success", `Marked ${sentCount} report(s) as sent to parents.`);
  };

  if (loading && !groups.length) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sunshine Report</Text>
        <Text style={styles.headerSubtitle}>Daily camper tracking ({date})</Text>
      </View>
      <View style={styles.actionsBar}>
        <TouchableOpacity style={styles.actionButton} onPress={sendEndOfDayEmails}>
          <Ionicons name="mail-outline" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Send to Parents</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {groups.map((g) => (
            <TouchableOpacity 
              key={g.id} 
              style={[styles.tabButton, activeGroupId === g.id && styles.tabButtonActive]}
              onPress={() => setActiveGroupId(g.id)}
            >
              <Text style={[styles.tabText, activeGroupId === g.id && styles.tabTextActive]}>{g.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.tableScroll} horizontal={true}>
        <View style={styles.tableContainer}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { width: 140 }]}>Child's Name</Text>
            <Text style={[styles.th, { width: 100 }]}>Group</Text>
            <Text style={[styles.th, { width: 80, textAlign: 'center' }]}>BM</Text>
            <Text style={[styles.th, { width: 80, textAlign: 'center' }]}>Napped?</Text>
            <Text style={[styles.th, { width: 100, textAlign: 'center' }]}>Send Email</Text>
            <Text style={[styles.th, { width: 80 }]}>Sent</Text>
          </View>
          
          <ScrollView style={{ flex: 1 }}>
            {groupCampers.map((camper) => {
              const r = reports[camper.id];
              return (
                <View key={camper.id} style={styles.tableRow}>
                  <Text style={[styles.td, styles.tdName, { width: 140 }]}>{camper.full_name}</Text>
                  <Text style={[styles.td, { width: 100, color: theme.colors.textSecondary }]}>{activeGroup?.name}</Text>
                  
                  <View style={[styles.tdCenter, { width: 80 }]}>
                    <Switch 
                      value={r?.bm ?? false} 
                      onValueChange={(v) => upsertReport(camper.id, { bm: v })} 
                      trackColor={{ true: theme.colors.primary }}
                    />
                  </View>
                  <View style={[styles.tdCenter, { width: 80 }]}>
                    <Switch 
                      value={r?.napped ?? false} 
                      onValueChange={(v) => upsertReport(camper.id, { napped: v })} 
                      trackColor={{ true: theme.colors.primary }}
                    />
                  </View>
                  <View style={[styles.tdCenter, { width: 100 }]}>
                    <Switch 
                      value={r?.send_email ?? true} 
                      onValueChange={(v) => upsertReport(camper.id, { send_email: v })} 
                      trackColor={{ true: theme.colors.primary }}
                    />
                  </View>
                  <View style={[styles.td, { width: 80 }]}>
                    {r?.email_sent_at ? (
                      <Ionicons name="checkmark-circle" size={20} color="green" />
                    ) : (
                      <Text style={{ color: '#ccc' }}>—</Text>
                    )}
                  </View>
                </View>
              );
            })}
            {groupCampers.length === 0 && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: theme.colors.textSecondary }}>No campers in this group.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  actionsBar: {
    padding: 16,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#fafafa',
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  tableScroll: {
    flex: 1,
  },
  tableContainer: {
    flexDirection: 'column',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f5',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  th: {
    fontWeight: '600',
    fontSize: 13,
    color: theme.colors.textSecondary,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  td: {
    fontSize: 14,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  tdName: {
    fontWeight: '500',
  },
  tdCenter: {
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
