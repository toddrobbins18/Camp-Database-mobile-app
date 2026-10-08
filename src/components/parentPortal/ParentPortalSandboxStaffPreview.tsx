import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { ParentPortalShell, useParentPortalColors } from './ParentPortalShell';
import { ParentCampersView, ParentHomeView } from './ParentPortalViews';
import { NestSandboxParentFlowGuide } from './NestSandboxParentFlowGuide';
import {
  SANDBOX_DEMO_PARENT_ACCOUNTS,
  SANDBOX_PARENT_DEMO_SEASON,
  fetchSandboxParentDemoRoster,
} from '../../lib/nestSandboxParentDemo';
import type { Camper, ParentPortalView } from '../../constants/parentPortalConstants';
import { resolveParentPortalHeroImageUrl } from '../../lib/parentPortalTheme';
import { PP, ppFont } from '../../lib/parentPortalUi';

type Props = {
  companyId: string;
  companySlug: string;
  companyName: string;
  themeColor: string | null;
  onSignOut: () => void;
  onBackToNest?: () => void;
};

export function ParentPortalSandboxStaffPreview({
  companyId,
  companySlug,
  companyName,
  themeColor,
  onSignOut,
  onBackToNest,
}: Props) {
  const colors = useParentPortalColors(themeColor, companySlug);
  const [activeView, setActiveView] = useState<ParentPortalView>('home');
  const [demoFamilyKey, setDemoFamilyKey] = useState(SANDBOX_DEMO_PARENT_ACCOUNTS[0]?.key ?? 'alpha');
  const [campers, setCampers] = useState<Camper[]>([]);
  const [loadingCampers, setLoadingCampers] = useState(true);

  const selectedAccount = useMemo(
    () => SANDBOX_DEMO_PARENT_ACCOUNTS.find((a) => a.key === demoFamilyKey) ?? SANDBOX_DEMO_PARENT_ACCOUNTS[0],
    [demoFamilyKey],
  );

  const loadPreviewCampers = useCallback(async () => {
    if (!selectedAccount) return;
    setLoadingCampers(true);
    const rows = await fetchSandboxParentDemoRoster(
      supabase,
      companyId,
      selectedAccount.email,
      SANDBOX_PARENT_DEMO_SEASON,
    );
    setCampers(rows);
    setLoadingCampers(false);
  }, [companyId, selectedAccount]);

  useEffect(() => {
    void loadPreviewCampers();
  }, [loadPreviewCampers]);

  const heroImageUrl = resolveParentPortalHeroImageUrl(companySlug);
  const previewFamilyLabel = selectedAccount?.label ?? 'Demo family';
  const contactName = selectedAccount?.guardianName ?? 'Demo parent';

  const sharedProps = {
    campName: companyName,
    contactName,
    companyId,
    familyId: 'sandbox-preview',
    campers,
    pickups: [],
    absences: [],
    authPickups: [],
    swimLessons: [],
    campUpdate: null,
    heroImageUrl,
    onSaved: loadPreviewCampers,
    onNavigate: setActiveView,
    camperName: (id: string) => campers.find((c) => c.id === id)?.name ?? '—',
    colors,
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.banner}>
        <View style={styles.bannerBadge}>
          <Ionicons name="eye-outline" size={14} color="#0d9488" />
          <Text style={styles.bannerBadgeText}>Staff training preview</Text>
        </View>
        <Text style={styles.bannerBody}>
          Showing what <Text style={{ fontWeight: '700' }}>{previewFamilyLabel}</Text> sees after signup — not your
          staff account.
        </Text>
        <View style={styles.bannerActions}>
          {onBackToNest ? (
            <TouchableOpacity style={styles.outlineBtn} onPress={onBackToNest}>
              <Ionicons name="arrow-back-outline" size={16} color="#334155" />
              <Text style={styles.outlineBtnText}>Back to Nest</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.ghostBtn} onPress={onSignOut}>
            <Text style={styles.ghostBtnText}>Leave portal</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <NestSandboxParentFlowGuide companyId={companyId} companySlug={companySlug} staffSignedIn />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.familyTabs}>
          {SANDBOX_DEMO_PARENT_ACCOUNTS.map((a) => {
            const active = a.key === demoFamilyKey;
            return (
              <TouchableOpacity
                key={a.key}
                style={[styles.familyTab, active && styles.familyTabActive]}
                onPress={() => setDemoFamilyKey(a.key)}
              >
                <Text style={[ppFont.caption, { fontWeight: '600', color: active ? '#0d9488' : '#64748b' }]}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[ppFont.caption, { color: colors.textMuted, marginBottom: PP.md }]}>
          Preview as parent {selectedAccount?.email}
          {loadingCampers ? ' — loading campers…' : ` — ${campers.length} linked camper(s) on roster.`}
        </Text>
      </ScrollView>

      <View style={{ flex: 1, minHeight: 200 }}>
        <ParentPortalShell
          campName={companyName}
          familyName={`${previewFamilyLabel} (preview)`}
          contactName={contactName}
          themeColor={themeColor}
          companySlug={companySlug}
          activeView={activeView}
          onNavigate={setActiveView}
          onSignOut={onSignOut}
          mainBackdropImageUrl={activeView === 'home' ? heroImageUrl : null}
          embedInParent
        >
          {activeView === 'home' && <ParentHomeView {...sharedProps} />}
          {activeView === 'campers' && <ParentCampersView {...sharedProps} />}
          {activeView !== 'home' && activeView !== 'campers' && (
            <View style={[styles.blocked, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <Text style={[ppFont.body, { color: colors.textMuted, textAlign: 'center' }]}>
                Pickups, absences, and authorized adults require a real parent signup with{' '}
                <Text style={{ fontWeight: '700' }}>{selectedAccount?.email}</Text>. Use the flow guide above, then
                sign in as that parent to submit requests.
              </Text>
              <TouchableOpacity style={[styles.outlineBtn, { marginTop: PP.lg }]} onPress={() => setActiveView('home')}>
                <Text style={styles.outlineBtnText}>Back to home preview</Text>
              </TouchableOpacity>
            </View>
          )}
        </ParentPortalShell>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  banner: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(13,148,136,0.2)',
    backgroundColor: 'rgba(13,148,136,0.08)',
    padding: PP.md,
    gap: PP.sm,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(13,148,136,0.35)',
    backgroundColor: '#fff',
  },
  bannerBadgeText: { fontSize: 12, fontWeight: '600', color: '#0d9488' },
  bannerBody: { fontSize: 13, color: '#475569' },
  bannerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: PP.sm },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  outlineBtnText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  ghostBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  ghostBtnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  scroll: { maxHeight: 340 },
  scrollContent: { paddingHorizontal: PP.md, paddingTop: PP.md },
  familyTabs: { marginBottom: PP.sm },
  familyTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: '#f1f5f9',
  },
  familyTabActive: { backgroundColor: '#ccfbf1' },
  blocked: {
    margin: PP.lg,
    padding: PP.xl,
    borderRadius: 16,
    borderWidth: 1,
  },
});
