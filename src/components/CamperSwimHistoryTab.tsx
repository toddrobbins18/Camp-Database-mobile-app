import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from './StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import {
  fetchSwimHistoryByPersonForCompany,
  skillStatusLabel,
  type SwimSeasonHistory,
} from '../lib/swimProgram';

export function CamperSwimHistoryTab({ personId }: { personId: string }) {
  const { companyId } = useCompany();
  const [history, setHistory] = useState<SwimSeasonHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId || !personId) {
      setHistory([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchSwimHistoryByPersonForCompany(companyId, personId)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [companyId, personId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.muted}>Loading swim history…</Text>
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <StyledCard style={styles.emptyCard}>
        <View style={styles.emptyHeader}>
          <Ionicons name="water-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.emptyTitle}>Swim History</Text>
        </View>
        <Text style={styles.muted}>No swim seasons found for this camper yet.</Text>
      </StyledCard>
    );
  }

  return (
    <View style={styles.list}>
      {history.map((entry) => {
        const hasData =
          Boolean(entry.bracelet?.currentBracelet) ||
          (entry.levels?.goldfish.some((s) => s !== '—') ?? false) ||
          (entry.levels?.minnow.some((s) => s !== '—') ?? false) ||
          (entry.levels?.tadpole.some((s) => s !== '—') ?? false);

        return (
          <StyledCard key={`${entry.season}-${entry.childId}`} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.seasonTitle}>Season {entry.season}</Text>
              {entry.bracelet?.currentBracelet ? (
                <View style={styles.braceletBadge}>
                  <Text style={styles.braceletBadgeText}>{entry.bracelet.currentBracelet} bracelet</Text>
                </View>
              ) : null}
            </View>

            {!hasData ? (
              <Text style={styles.muted}>No swim bracelet or level data saved for this season.</Text>
            ) : entry.levels ? (
              <View style={styles.levelGrid}>
                {[
                  { label: 'Goldfish', skills: entry.levels.goldfish, level: entry.levels.goldfishLevel },
                  { label: 'Minnow', skills: entry.levels.minnow, level: entry.levels.minnowLevel },
                  { label: 'Tadpole', skills: entry.levels.tadpole, level: entry.levels.tadpoleLevel },
                ].map((block) => (
                  <View key={block.label} style={styles.levelBlock}>
                    <Text style={styles.levelLabel}>
                      {block.label}{' '}
                      <Text style={styles.levelStatus}>({block.level})</Text>
                    </Text>
                    <View style={styles.skillRow}>
                      {block.skills.map((s, i) => (
                        <View
                          key={i}
                          style={[
                            styles.skillChip,
                            s === 'A' && styles.skillAchieved,
                            s === 'W' && styles.skillWorking,
                          ]}
                        >
                          <Text style={styles.skillChipText}>
                            {s === '—' ? '—' : `${s} (${skillStatusLabel(s)})`}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : entry.bracelet?.currentBracelet ? (
              <Text style={styles.muted}>Bracelet only — no level checklist saved.</Text>
            ) : null}
          </StyledCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: { padding: 14 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seasonTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  braceletBadge: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  braceletBadgeText: { fontSize: 12, color: theme.colors.textSecondary },
  levelGrid: { gap: 10 },
  levelBlock: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 10,
  },
  levelLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 6 },
  levelStatus: { fontWeight: '400', color: theme.colors.textSecondary },
  skillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  skillAchieved: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  skillWorking: { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' },
  skillChipText: { fontSize: 11, color: theme.colors.text },
  centered: { padding: 24, alignItems: 'center', gap: 8 },
  muted: { fontSize: 14, color: theme.colors.textSecondary },
  emptyCard: { padding: 16 },
  emptyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
});
