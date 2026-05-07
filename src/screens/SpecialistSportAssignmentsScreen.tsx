import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { supabase } from '../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const AVAILABLE_SPORTS = [
  'Baseball', 'Basketball', 'Dance', 'Football', 'Golf', 'Gymnastics',
  'Hockey', 'Lacrosse', 'Soccer', 'Softball', 'Tennis', 'Volleyball', 'Waterfront'
];

function normalizeStaffEmail(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  const t = value.trim().toLowerCase();
  return t || null;
}

export const SpecialistSportAssignmentsScreen = ({ navigation }: any) => {
  const { companyId, season, availableCompanies } = useCompany();
  const companyName = companyId ? availableCompanies.find(c => c.id === companyId)?.name : null;
  const queryClient = useQueryClient();

  const { data: specialists = [], isLoading } = useQuery({
    queryKey: ['specialist_sport_assignments', companyId, season],
    queryFn: async () => {
      if (!companyId || !season) return [];

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'specialist')
        .eq('company_id', companyId);
      if (rolesError) throw rolesError;
      const roleUserIds = (rolesData || []).map((r: any) => r.user_id).filter(Boolean);

      const roleProfilesProm =
        roleUserIds.length === 0
          ? Promise.resolve({ data: [] as any[], error: null as Error | null })
          : supabase.from('profiles').select('id, full_name, email').in('id', roleUserIds);

      const { data: staffSpecialists, error: staffSpecError } = await supabase
        .from('staff')
        .select('email')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .eq('season', season)
        .in('staff_type', ['specialist', 'both']);

      if (staffSpecError) console.warn('[SpecialistSportAssignments] staff:', staffSpecError);

      const staffEmails = new Set<string>();
      (staffSpecialists || []).forEach((row: { email?: string | null }) => {
        const n = normalizeStaffEmail(row.email);
        if (n) staffEmails.add(n);
      });

      let emailToProfile = new Map<string, { id: string; full_name: string | null; email: string | null }>();
      if (staffEmails.size > 0) {
        const { data: companyProfiles, error: profErr } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('company_id', companyId);
        if (profErr) console.warn('[SpecialistSportAssignments] profiles:', profErr);
        (companyProfiles || []).forEach((p: any) => {
          const key = normalizeStaffEmail(p.email);
          if (key && staffEmails.has(key)) {
            emailToProfile.set(key, p);
          }
        });
      }

      const { data: roleProfiles, error: profError } = await roleProfilesProm;
      if (profError) throw profError;

      const byUserId = new Map<string, { user_id: string; full_name: string; email: string }>();
      for (const p of roleProfiles || []) {
        byUserId.set(p.id, {
          user_id: p.id,
          full_name: p.full_name || p.email || 'Unknown',
          email: p.email || '',
        });
      }
      for (const em of staffEmails) {
        const p = emailToProfile.get(em);
        if (!p?.id || byUserId.has(p.id)) continue;
        byUserId.set(p.id, {
          user_id: p.id,
          full_name: p.full_name || p.email || 'Unknown',
          email: p.email || '',
        });
      }

      return Array.from(byUserId.values()).sort((a, b) =>
        (a.full_name || a.email).localeCompare(b.full_name || b.email, undefined, { sensitivity: 'base' }),
      );
    },
    enabled: !!companyId && !!season,
  });

  const { data: assignmentsData = [] } = useQuery({
    queryKey: ['specialist_sport_assignments_list', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('specialist_sport_assignments')
        .select('user_id, sport')
        .eq('company_id', companyId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const assignmentsMap: Record<string, string[]> = {};
  assignmentsData.forEach((a: any) => {
    if (!assignmentsMap[a.user_id]) assignmentsMap[a.user_id] = [];
    assignmentsMap[a.user_id].push(a.sport);
  });

  const toggleSportAssignment = useCallback(async (userId: string, sport: string, isAssigned: boolean) => {
    if (!companyId) return;
    try {
      if (isAssigned) {
        const { error } = await supabase
          .from('specialist_sport_assignments')
          .delete()
          .eq('user_id', userId)
          .eq('sport', sport)
          .eq('company_id', companyId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('specialist_sport_assignments')
          .insert({ user_id: userId, sport, company_id: companyId });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['specialist_sport_assignments_list', companyId] });
      queryClient.invalidateQueries({ queryKey: ['specialist_sport_assignments', companyId, season] });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update assignment');
    }
  }, [companyId, season, queryClient]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerRight} />
        <TouchableOpacity>
          <Ionicons name="person-circle-outline" size={28} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Specialist Sport Assignments</Text>
          <Text style={styles.subtitle}>
            Assign which sports each specialist is responsible for. Specialists will receive email notifications only for their assigned sports.
          </Text>
        </View>

        {companyName && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>
              You are viewing assignments for {companyName}. Switch companies to manage other organizations.
            </Text>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : specialists.length === 0 ? (
          <StyledCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No specialists found for this camp and season. Set Staff Type to specialist or both (with login email matching
              staff), or assign the Specialist role in admin—then assign sports here.
            </Text>
          </StyledCard>
        ) : (
          specialists.map((specialist: any) => (
            <StyledCard key={specialist.user_id} style={styles.specialistCard}>
              <View style={styles.specialistHeader}>
                <View>
                  <Text style={styles.specialistName}>{specialist.full_name}</Text>
                  <Text style={styles.specialistEmail}>{specialist.email}</Text>
                </View>
              </View>
              <View style={styles.sportsGrid}>
                {AVAILABLE_SPORTS.map((sport) => {
                  const isAssigned = (assignmentsMap[specialist.user_id] || []).includes(sport);
                  return (
                    <View key={sport} style={styles.sportRow}>
                      <Text style={styles.sportLabel}>{sport}</Text>
                      <Switch
                        value={isAssigned}
                        onValueChange={() => toggleSportAssignment(specialist.user_id, sport, isAssigned)}
                        trackColor={{ false: '#e2e8f0', true: theme.colors.secondary }}
                        thumbColor="#fff"
                      />
                    </View>
                  );
                })}
              </View>
            </StyledCard>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerRight: { flex: 1 },
  scrollContent: { padding: theme.spacing.md, paddingBottom: 40 },
  titleSection: { marginBottom: theme.spacing.lg, alignItems: 'center' },
  title: {
    ...theme.typography.h1,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoText: { flex: 1, ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  loader: { marginVertical: theme.spacing.xl },
  emptyCard: { padding: theme.spacing.lg },
  emptyText: {
    ...theme.typography.body,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  specialistCard: { marginBottom: theme.spacing.lg, padding: theme.spacing.lg },
  specialistHeader: { marginBottom: theme.spacing.md, paddingBottom: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  specialistName: { ...theme.typography.h2, fontSize: 16, color: theme.colors.text },
  specialistEmail: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, marginTop: 2 },
  sportsGrid: { gap: 0 },
  sportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sportLabel: { ...theme.typography.body, fontSize: 14, color: theme.colors.text },
});
