import React, { useState, useCallback } from 'react';
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

export const SpecialistSportAssignmentsScreen = ({ navigation }: any) => {
  const { companyId, availableCompanies } = useCompany();
  const companyName = companyId ? availableCompanies.find(c => c.id === companyId)?.name : null;
  const queryClient = useQueryClient();

  const { data: specialists = [], isLoading } = useQuery({
    queryKey: ['specialist_sport_assignments', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'specialist')
        .eq('company_id', companyId);
      if (rolesError) throw rolesError;
      const userIds = (rolesData || []).map((r: any) => r.user_id);
      if (userIds.length === 0) return [];

      const { data: profilesData, error: profError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      if (profError) throw profError;
      return (profilesData || []).map((p: any) => ({
        user_id: p.id,
        full_name: p.full_name || p.email || 'Unknown',
        email: p.email || ''
      }));
    },
    enabled: !!companyId,
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
              No specialists found in this company. Users need to have the 'specialist' role to appear here.
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
