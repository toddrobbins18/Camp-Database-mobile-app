import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useCompany } from '../contexts/CompanyContext';
import type { HiringStaffMember } from '../lib/hiringRoster';
import { fetchHiredStaffForHiring, mergeHiringPipelineWithSaved } from '../lib/hiringRoster';

const HIRING_STORAGE_KEY_PREFIX = 'hiring-board-state-v2';

const DEPT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PROGRAMMING: { bg: '#eff6ff', text: theme.colors.primary, border: '#bfdbfe' },
  ADMINISTRATION: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  'FOOD SERVICE': { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  MAINTENANCE: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
  TRANSPORTATION: { bg: '#ecfeff', text: '#0891b2', border: '#a5f3fc' },
  'CREATIVE ARTS': { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
};

async function loadStaff(storageKey: string, companyId: string, season: string): Promise<HiringStaffMember[]> {
  try {
    const roster = await fetchHiredStaffForHiring(companyId, season);
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return roster;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return roster;
    return mergeHiringPipelineWithSaved(roster, parsed as HiringStaffMember[]);
  } catch {
    if (!companyId) return [];
    return fetchHiredStaffForHiring(companyId, season);
  }
}

export function HiringScreen({ navigation }: any) {
  const { companyId, season } = useCompany();
  const storageKey = `${HIRING_STORAGE_KEY_PREFIX}-${companyId ?? 'default'}-${season}`;
  const [staff, setStaff] = useState<HiringStaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    void loadStaff(storageKey, companyId, season)
      .then(setStaff)
      .finally(() => setLoading(false));
  }, [storageKey, companyId, season]);

  useEffect(() => {
    void AsyncStorage.setItem(storageKey, JSON.stringify(staff));
  }, [staff, storageKey]);

  const filteredStaff = useMemo(
    () =>
      staff.filter(
        (member) =>
          member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.department.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [staff, searchQuery],
  );

  const hiredCount = staff.length;
  const totalBudget = staff.reduce((sum, s) => sum + s.netBudget, 0);

  const departments = useMemo(() => Array.from(new Set(staff.map((s) => s.department))), [staff]);

  const departmentStats = useMemo(
    () =>
      departments.map((dept) => {
        const deptStaff = staff.filter((s) => s.department === dept);
        return {
          name: dept,
          totalPositions: deptStaff.length,
          filled: deptStaff.length,
          budgetUsed: deptStaff.reduce((sum, s) => sum + s.netBudget, 0),
        };
      }),
    [departments, staff],
  );

  const renderStaffCard = (member: HiringStaffMember) => {
    const deptStyle = DEPT_COLORS[member.department] ?? {
      bg: '#f1f5f9',
      text: theme.colors.textSecondary,
      border: theme.colors.border,
    };

    return (
      <View key={member.id} style={styles.staffCard}>
        <View style={styles.cardRow}>
          <Ionicons name="reorder-three-outline" size={18} color={theme.colors.textSecondary} />
          <View style={styles.cardBody}>
            <Text style={styles.cardName} numberOfLines={1}>{member.name}</Text>
            <Text style={styles.cardPosition} numberOfLines={1}>{member.position}</Text>
            <View style={[styles.deptBadge, { backgroundColor: deptStyle.bg, borderColor: deptStyle.border }]}>
              <Ionicons name="pricetag-outline" size={10} color={deptStyle.text} />
              <Text style={[styles.deptBadgeText, { color: deptStyle.text }]}>{member.department}</Text>
            </View>
            <View style={styles.cardBudgetRow}>
              <Ionicons name="logo-usd" size={12} color={theme.colors.textSecondary} />
              <Text style={styles.cardBudget}>{member.netBudget.toLocaleString()}</Text>
              {member.kidCredit > 0 && (
                <Text style={styles.kidCredit}>Kid Credit: ${member.kidCredit.toLocaleString()}</Text>
              )}
            </View>
            {!!member.notes && <Text style={styles.cardNotes}>{member.notes}</Text>}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Ionicons name="briefcase-outline" size={22} color="#fff" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Staff Hiring {season}</Text>
          <Text style={styles.headerSubtitle}>Active hired staff for {season} only</Text>
        </View>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff, positions, departments..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.statsGrid}>
          {[
            { title: 'Hired Staff', value: hiredCount, icon: 'checkmark-circle-outline' as const, color: '#10b981' },
            { title: 'Departments', value: departments.length, icon: 'business-outline' as const, color: theme.colors.primary },
          ].map((stat) => (
            <View key={stat.title} style={styles.statCard}>
              <View>
                <Text style={styles.statLabel}>{stat.title}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
              <View style={[styles.statIconWrap, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name={stat.icon} size={16} color={stat.color} />
              </View>
            </View>
          ))}
        </View>

        {totalBudget > 0 && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Budget Overview</Text>
            <View style={styles.budgetRow}><Text style={styles.budgetLabel}>Total on roster</Text><Text style={styles.budgetValue}>${totalBudget.toLocaleString()}</Text></View>
          </View>
        )}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Department Breakdown</Text>
          {departmentStats.map((dept) => (
            <View key={dept.name} style={styles.deptRow}>
              <View style={styles.deptRowHeader}>
                <Text style={styles.deptName}>{dept.name}</Text>
                <Text style={styles.deptFilled}>{dept.filled}/{dept.totalPositions} filled</Text>
              </View>
              <View style={styles.deptProgressRow}>
                <View style={styles.deptProgressTrack}>
                  <View
                    style={[
                      styles.deptProgressFill,
                      { width: `${dept.totalPositions > 0 ? (dept.filled / dept.totalPositions) * 100 : 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.deptBudget}>${(dept.budgetUsed / 1000).toFixed(0)}k</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.pipelineHeader}>
          <Text style={styles.pipelineTitle}>{season} Hired Staff</Text>
          <Text style={styles.pipelineSubtitle}>
            {loading ? 'Loading…' : `${filteredStaff.length} active hired for this camp and season`}
          </Text>
        </View>

        {departmentStats.map((dept) => {
          const deptStaff = filteredStaff.filter((s) => s.department === dept.name);
          if (deptStaff.length === 0) return null;
          return (
            <View key={dept.name} style={styles.deptSection}>
              <View style={styles.deptSectionHeader}>
                <Text style={styles.deptSectionTitle}>{dept.name}</Text>
                <Text style={styles.deptSectionCount}>{deptStaff.length} hired</Text>
              </View>
              {deptStaff.map(renderStaffCard)}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuButton: { marginRight: 8 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  headerSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  content: { flex: 1 },
  searchWrap: { margin: 16, marginBottom: 8, position: 'relative' },
  searchIcon: { position: 'absolute', left: 12, top: 12, zIndex: 1 },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingLeft: 38,
    paddingRight: 12,
    fontSize: 15,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '500' },
  statValue: { fontSize: 24, fontWeight: '700', color: theme.colors.text, marginTop: 4 },
  statIconWrap: { padding: 8, borderRadius: 8 },
  panel: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  panelTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12, color: theme.colors.text },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  budgetLabel: { fontSize: 12, color: theme.colors.textSecondary },
  budgetValue: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  progressTrack: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: '#10b981' },
  progressCaption: { fontSize: 11, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8 },
  deptRow: { marginBottom: 12 },
  deptRowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  deptName: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  deptFilled: { fontSize: 11, color: theme.colors.textSecondary },
  deptProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deptProgressTrack: { flex: 1, height: 6, backgroundColor: '#e2e8f0', borderRadius: 999, overflow: 'hidden' },
  deptProgressFill: { height: '100%', backgroundColor: '#10b981' },
  deptBudget: { fontSize: 11, fontWeight: '600', minWidth: 36, textAlign: 'right' },
  pipelineHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  pipelineTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  pipelineSubtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  deptSection: { marginHorizontal: 16, marginBottom: 16 },
  deptSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  deptSectionTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  deptSectionCount: { fontSize: 12, color: theme.colors.textSecondary },
  staffCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 8,
  },
  cardRow: { flexDirection: 'row', gap: 8 },
  cardBody: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  cardPosition: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 6 },
  deptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  deptBadgeText: { fontSize: 10, fontWeight: '500' },
  cardBudgetRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  cardBudget: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  kidCredit: { fontSize: 11, color: theme.colors.textSecondary },
  cardNotes: { fontSize: 11, color: theme.colors.textSecondary, fontStyle: 'italic', marginTop: 6 },
});
