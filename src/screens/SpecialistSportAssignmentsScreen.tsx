import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { supabase } from '../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAvailableSpecialistSports } from '../constants/specialistSportOptions';

function normalizeStaffEmail(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  const t = value.trim().toLowerCase();
  return t || null;
}

type SpecialistLeader = { user_id: string; full_name: string; email: string };
type StaffSpecialist = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  staff_type: string | null;
  specialty_sports: string[] | null;
};

export const SpecialistSportAssignmentsScreen = ({ navigation }: any) => {
  const { companyId, season, availableCompanies, companySlug } = useCompany();
  const companyName = companyId ? availableCompanies.find(c => c.id === companyId)?.name : null;
  const queryClient = useQueryClient();
  const availableSports = getAvailableSpecialistSports(companySlug);

  const { data: specialists = [], isLoading: leadersLoading } = useQuery({
    queryKey: ['specialist_sport_leaders', companyId, season],
    queryFn: async (): Promise<SpecialistLeader[]> => {
      if (!companyId || !season) return [];

      const { data: specialistRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'specialist')
        .eq('company_id', companyId);

      if (rolesError) {
        console.warn('[SpecialistSportAssignments] roles:', rolesError);
      }

      const roleUserIds = new Set<string>();
      (specialistRoles || []).forEach((row: { user_id?: string | null }) => {
        if (row.user_id) roleUserIds.add(row.user_id);
      });

      const { data: staffSpecialistRows } = await supabase
        .from('staff')
        .select('email')
        .eq('company_id', companyId)
        .eq('season', season)
        .neq('status', 'inactive')
        .in('staff_type', ['specialist', 'both']);

      const staffEmails = new Set<string>();
      (staffSpecialistRows || []).forEach((row: { email?: string | null }) => {
        const n = normalizeStaffEmail(row.email);
        if (n) staffEmails.add(n);
      });

      const emailToProfile = new Map<string, { id: string; full_name: string | null; email: string | null }>();
      const profileById = new Map<string, { id: string; full_name: string | null; email: string | null }>();

      if (staffEmails.size > 0 || roleUserIds.size > 0) {
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
          if (roleUserIds.has(p.id)) {
            profileById.set(p.id, p);
          }
        });
      }

      const byUserId = new Map<string, SpecialistLeader>();
      for (const userId of roleUserIds) {
        const p = profileById.get(userId);
        if (p) {
          byUserId.set(userId, {
            user_id: userId,
            full_name: p.full_name || p.email || 'Unknown',
            email: p.email || '',
          });
        }
      }
      for (const email of staffEmails) {
        const p = emailToProfile.get(email);
        if (p?.id && !byUserId.has(p.id)) {
          byUserId.set(p.id, {
            user_id: p.id,
            full_name: p.full_name || p.email || 'Unknown',
            email: p.email || '',
          });
        }
      }

      return Array.from(byUserId.values()).sort((a, b) =>
        (a.full_name || a.email).localeCompare(b.full_name || b.email, undefined, { sensitivity: 'base' }),
      );
    },
    enabled: !!companyId && !!season,
  });

  const { data: staffSpecialists = [], isLoading: staffLoading } = useQuery({
    queryKey: ['specialist_sport_staff', companyId, season],
    queryFn: async (): Promise<StaffSpecialist[]> => {
      if (!companyId || !season) return [];

      const { data, error } = await supabase
        .from('staff')
        .select('id, name, email, role, staff_type, specialty_sports')
        .eq('company_id', companyId)
        .eq('season', season)
        .neq('name', 'Unknown')
        .not('name', 'is', null)
        .in('staff_type', ['specialist', 'both']);

      if (error) throw error;
      return (data || []).sort((a: any, b: any) =>
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }),
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
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update assignment');
    }
  }, [companyId, queryClient]);

  const toggleStaffSportAssignment = useCallback(async (staffMember: StaffSpecialist, sport: string, isAssigned: boolean) => {
    if (!companyId || !season) return;
    const currentSports = Array.isArray(staffMember.specialty_sports) ? staffMember.specialty_sports : [];
    const nextSports = isAssigned
      ? currentSports.filter((s) => s !== sport)
      : Array.from(new Set([...currentSports, sport]));

    const { error } = await supabase
      .from('staff')
      .update({ specialty_sports: nextSports })
      .eq('id', staffMember.id)
      .eq('company_id', companyId)
      .eq('season', season);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to update staff sport assignments');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['specialist_sport_staff', companyId, season] });
    queryClient.invalidateQueries({ queryKey: ['staff', companyId, season] });
  }, [companyId, season, queryClient]);

  const isLoading = leadersLoading || staffLoading;

  const renderSportGrid = (
    keyPrefix: string,
    getAssigned: (sport: string) => boolean,
    onToggle: (sport: string, isAssigned: boolean) => void,
  ) => (
    <View style={styles.sportsGrid}>
      {availableSports.map((sport) => {
        const isAssigned = getAssigned(sport);
        return (
          <View key={`${keyPrefix}-${sport}`} style={styles.sportRow}>
            <Text style={styles.sportLabel}>{sport}</Text>
            <Switch
              value={isAssigned}
              onValueChange={() => onToggle(sport, isAssigned)}
              trackColor={{ false: '#e2e8f0', true: theme.colors.secondary }}
              thumbColor="#fff"
            />
          </View>
        );
      })}
    </View>
  );

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
            Assign sports to specialist leaders with logins, then assign staff to sports/departments where they should be evaluated.
            Staff do not need logins for the staff assignment section.
          </Text>
        </View>

        {companyName ? (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>
              Viewing assignments for {companyName}.
            </Text>
          </View>
        ) : null}

        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Specialist Leaders</Text>
            <Text style={styles.sectionSubtitle}>
              People with a login or Specialist app role. Their sports control which staff they can evaluate.
            </Text>

            {specialists.length === 0 ? (
              <StyledCard style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  No specialist leaders found. Add a Specialist app role or match a Specialist/Both staff email to a login.
                </Text>
              </StyledCard>
            ) : (
              specialists.map((specialist) => (
                <StyledCard key={specialist.user_id} style={styles.specialistCard}>
                  <View style={styles.specialistHeader}>
                    <View>
                      <Text style={styles.specialistName}>{specialist.full_name}</Text>
                      <Text style={styles.specialistEmail}>{specialist.email}</Text>
                    </View>
                  </View>
                  {renderSportGrid(
                    specialist.user_id,
                    (sport) => (assignmentsMap[specialist.user_id] || []).includes(sport),
                    (sport, isAssigned) => toggleSportAssignment(specialist.user_id, sport, isAssigned),
                  )}
                </StyledCard>
              ))
            )}

            <Text style={[styles.sectionTitle, { marginTop: theme.spacing.lg }]}>Staff Sport / Department Assignments</Text>
            <Text style={styles.sectionSubtitle}>
              Specialist or Both staff appear here without a login. Assign Tennis, etc. so the matching leader can evaluate them.
            </Text>

            {staffSpecialists.length === 0 ? (
              <StyledCard style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  No Specialist or Both staff found for this camp and season.
                </Text>
              </StyledCard>
            ) : (
              staffSpecialists.map((staffMember) => {
                const selectedSports = Array.isArray(staffMember.specialty_sports)
                  ? staffMember.specialty_sports
                  : [];
                return (
                  <StyledCard key={staffMember.id} style={styles.specialistCard}>
                    <View style={styles.specialistHeader}>
                      <View>
                        <Text style={styles.specialistName}>{staffMember.name}</Text>
                        <Text style={styles.specialistEmail}>
                          {staffMember.role || 'No role'}
                          {staffMember.email ? ` • ${staffMember.email}` : ' • No login required'}
                        </Text>
                      </View>
                    </View>
                    {renderSportGrid(
                      staffMember.id,
                      (sport) => selectedSports.includes(sport),
                      (sport, isAssigned) => toggleStaffSportAssignment(staffMember, sport, isAssigned),
                    )}
                  </StyledCard>
                );
              })
            )}
          </>
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
  sectionTitle: {
    ...theme.typography.h2,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
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
  emptyCard: { padding: theme.spacing.lg, marginBottom: theme.spacing.md },
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
