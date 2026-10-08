import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { useCampBrandTheme } from '../../hooks/useCampBrandTheme';
import { supabase } from '../../lib/supabase';
import {
  SWIM_FORMATION_CRITERIA,
  buildSwimFormationGroups,
  fetchSwimFormationCampers,
  type SwimFormationCriterion,
  type SwimFormationGroup,
} from '../../lib/swimGroupFormation';

type Props = {
  companyId: string;
  season: string;
};

export function SwimGroupFormationPanel({ companyId, season }: Props) {
  const { brand, brandSoft } = useCampBrandTheme();
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [criteria, setCriteria] = useState<SwimFormationCriterion[]>([
    'division',
    'divisionLeader',
    'swimLevel',
  ]);
  const [instructorCount, setInstructorCount] = useState('3');
  const [groups, setGroups] = useState<SwimFormationGroup[]>([]);
  const [rosterCount, setRosterCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    if (!companyId || !season) return;
    setLoading(true);
    setError(null);
    try {
      const campers = await fetchSwimFormationCampers(supabase, companyId, season);
      setRosterCount(campers.length);
    } catch (err) {
      console.error('[SwimFormation]', err);
      setError(err instanceof Error ? err.message : 'Could not load campers');
    } finally {
      setLoading(false);
    }
  }, [companyId, season]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  const toggleCriterion = (id: SwimFormationCriterion) => {
    setCriteria((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const handleBuild = async () => {
    if (!companyId || !season) return;
    setBuilding(true);
    setError(null);
    try {
      const campers = await fetchSwimFormationCampers(supabase, companyId, season);
      setRosterCount(campers.length);
      const instructors = Math.max(1, Math.min(20, parseInt(instructorCount, 10) || 1));
      const built = buildSwimFormationGroups(campers, {
        criteria,
        instructorCount: instructors,
      });
      setGroups(built);
    } catch (err) {
      console.error('[SwimFormation]', err);
      setError(err instanceof Error ? err.message : 'Could not build groups');
    } finally {
      setBuilding(false);
    }
  };

  const totalAssigned = useMemo(
    () => groups.reduce((sum, g) => sum + g.campers.length, 0),
    [groups],
  );

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={brand} />
        <Text style={styles.loadingText}>Loading campers…</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Ionicons name="people-outline" size={18} color={brand} />
            <Text style={styles.cardTitle}>Swim group formation</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Choose who mixes together, set instructor count, and build balanced groups for season {season}.{' '}
            {rosterCount} active campers. Division leaders are never combined.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Group by (select all that apply)</Text>
        {SWIM_FORMATION_CRITERIA.map((item) => {
          const checked = criteria.includes(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.criterionRow,
                checked && { borderColor: brand, backgroundColor: brandSoft },
              ]}
              onPress={() => toggleCriterion(item.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  checked && { backgroundColor: brand, borderColor: brand },
                ]}
              >
                {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </View>
              <View style={styles.criterionText}>
                <Text style={styles.criterionLabel}>{item.label}</Text>
                <Text style={styles.criterionDesc}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Number of instructors</Text>
        <TextInput
          style={styles.maxInput}
          value={instructorCount}
          onChangeText={setInstructorCount}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="3"
        />
        <Text style={styles.hint}>
          Splits each cohort into balanced groups so each instructor gets roughly the same number of campers.
        </Text>

        {criteria.length === 0 ? (
          <View style={styles.alert}>
            <Text style={styles.alertText}>
              No criteria selected — campers split only by division leader and instructor count.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={[styles.alert, styles.alertError]}>
            <Text style={styles.alertErrorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.buildBtn,
            { backgroundColor: brand },
            (building || rosterCount === 0) && styles.buildBtnDisabled,
          ]}
          onPress={handleBuild}
          disabled={building || rosterCount === 0}
        >
          {building ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={18} color="#fff" />
              <Text style={styles.buildBtnText}>Build swim groups</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {groups.length > 0 ? (
        <View style={styles.results}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{groups.length} groups</Text>
            </View>
            <View style={[styles.badge, styles.badgeOutline]}>
              <Text style={styles.badgeOutlineText}>{totalAssigned} campers assigned</Text>
            </View>
          </View>

          {groups.map((group) => (
            <View key={group.id} style={styles.groupCard}>
              <Text style={styles.groupTitle}>{group.label}</Text>
              <Text style={styles.groupMeta}>
                {group.campers.length} camper{group.campers.length === 1 ? '' : 's'}
              </Text>
              {group.campers.map((c) => (
                <View key={c.id} style={styles.camperRow}>
                  <Text style={styles.camperName}>{c.name}</Text>
                  <Text style={styles.camperDetail}>
                    {c.division} · {c.group} · {c.highestCompletedLevel}
                  </Text>
                  {c.divisionLeader !== '—' ? (
                    <Text style={styles.camperLeader}>Leader: {c.divisionLeader}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 32 },
  loadingWrap: { alignItems: 'center', paddingVertical: 48 },
  loadingText: { marginTop: 12, color: theme.colors.textSecondary, fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: { marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  cardSubtitle: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
  criterionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  criterionRowActive: { borderColor: theme.colors.primary, backgroundColor: '#eff6ff' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  criterionText: { flex: 1 },
  criterionLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  criterionDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 16 },
  maxInput: {
    width: 80,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  hint: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 6, lineHeight: 16 },
  alert: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  alertText: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
  alertError: { backgroundColor: '#fef2f2' },
  alertErrorText: { fontSize: 12, color: '#dc2626', lineHeight: 16 },
  buildBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 16,
  },
  buildBtnDisabled: { opacity: 0.5 },
  buildBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  results: { gap: 12 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  badge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  badgeOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badgeOutlineText: { fontSize: 12, color: theme.colors.textSecondary },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  groupTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
  groupMeta: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 10 },
  camperRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  camperName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  camperDetail: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  camperLeader: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
});
