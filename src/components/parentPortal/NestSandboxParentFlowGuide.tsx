import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import {
  PARENT_PORTAL_FLOW_STEPS,
  SANDBOX_DEMO_PARENT_ACCOUNTS,
  SANDBOX_PARENT_DEMO_SEASON,
  fetchSandboxParentDemoFamiliesSummary,
  type SandboxDemoFamilySummary,
} from '../../lib/nestSandboxParentDemo';
import { PP, ppFont } from '../../lib/parentPortalUi';

type Props = {
  companyId: string;
  companySlug: string;
  staffSignedIn?: boolean;
};

export function NestSandboxParentFlowGuide({ companyId, staffSignedIn = false }: Props) {
  const [families, setFamilies] = useState<SandboxDemoFamilySummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await fetchSandboxParentDemoFamiliesSummary(supabase, companyId);
    setFamilies(rows);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyEmail = async (email: string) => {
    try {
      await Share.share({ message: email });
    } catch {
      Alert.alert('Demo parent email', email);
    }
  };

  const cards =
    families.length > 0
      ? families
      : SANDBOX_DEMO_PARENT_ACCOUNTS.map((a) => ({ ...a, camperCount: 0, camperNames: [] as string[] }));

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Parent portal — how it works (sandbox)</Text>
          <Text style={styles.desc}>
            Training flow mirrors production: roster email → parent signup → automatic camper link. Season{' '}
            {SANDBOX_PARENT_DEMO_SEASON} demo families below are seeded in Supabase only for this camp.
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => void load()}>
          {loading ? (
            <ActivityIndicator size="small" color="#0d9488" />
          ) : (
            <Ionicons name="refresh-outline" size={18} color="#0d9488" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stepsScroll}>
        {PARENT_PORTAL_FLOW_STEPS.map((s) => (
          <View key={s.step} style={styles.stepCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>{s.step}</Text>
            </View>
            <Text style={styles.stepTitle}>{s.title}</Text>
            <Text style={styles.stepDetail}>{s.detail}</Text>
          </View>
        ))}
      </ScrollView>

      {staffSignedIn ? (
        <Text style={styles.staffNote}>
          You are signed in as camp staff. Parent signup needs a separate account — sign out of staff or use another
          device, then sign up with a demo parent email below.
        </Text>
      ) : null}

      <Text style={styles.sectionTitle}>
        <Ionicons name="people-outline" size={16} /> Demo parent accounts (from roster)
      </Text>

      {cards.map((fam) => (
        <View key={fam.key} style={styles.famCard}>
          <View style={styles.famHead}>
            <Text style={styles.famLabel}>{fam.label}</Text>
            <View style={[styles.countBadge, fam.camperCount > 0 ? styles.countOk : styles.countMuted]}>
              <Text style={styles.countText}>
                {loading ? '…' : `${fam.camperCount} camper${fam.camperCount === 1 ? '' : 's'}`}
              </Text>
            </View>
          </View>
          <Text style={styles.hint}>{fam.signupHint}</Text>
          <Text style={styles.emailCode} numberOfLines={1}>
            {fam.email}
          </Text>
          {fam.camperNames.length > 0 ? (
            <Text style={styles.linked}>Linked when parent signs up: {fam.camperNames.join(', ')}</Text>
          ) : (
            <Text style={styles.missing}>No campers on file — run seed_nest_sandbox_demo_data.sql in Supabase.</Text>
          )}
          <TouchableOpacity style={styles.copyBtn} onPress={() => void copyEmail(fam.email)}>
            <Ionicons name="copy-outline" size={16} color="#0d9488" />
            <Text style={styles.copyBtnText}>Copy email</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: 'rgba(13,148,136,0.35)',
    backgroundColor: 'rgba(13,148,136,0.06)',
    borderRadius: 16,
    padding: PP.lg,
    marginBottom: PP.lg,
  },
  headRow: { flexDirection: 'row', gap: PP.sm, marginBottom: PP.md },
  title: { ...ppFont.titleSm, color: '#0f172a' },
  desc: { ...ppFont.caption, color: '#64748b', marginTop: PP.xs, lineHeight: 18 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#99f6e4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsScroll: { marginBottom: PP.md },
  stepCard: {
    width: 260,
    marginRight: PP.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: PP.md,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: PP.xs,
  },
  stepNum: { fontSize: 12, fontWeight: '700' },
  stepTitle: { fontWeight: '600', fontSize: 14, color: '#0f172a' },
  stepDetail: { fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 17 },
  staffNote: {
    fontSize: 13,
    color: '#92400e',
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    borderRadius: 10,
    padding: PP.md,
    marginBottom: PP.md,
  },
  sectionTitle: { fontWeight: '600', fontSize: 14, marginBottom: PP.sm, color: '#0f172a' },
  famCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: PP.md,
    marginBottom: PP.sm,
  },
  famHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  famLabel: { fontWeight: '600', fontSize: 15 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  countOk: { backgroundColor: '#0d9488' },
  countMuted: { backgroundColor: '#94a3b8' },
  countText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  hint: { fontSize: 12, color: '#64748b', marginTop: 4 },
  emailCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    backgroundColor: '#f1f5f9',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  linked: { fontSize: 11, color: '#64748b', marginTop: 4 },
  missing: { fontSize: 11, color: '#dc2626', marginTop: 4 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: PP.sm,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  copyBtnText: { color: '#0d9488', fontWeight: '600', fontSize: 13 },
});
