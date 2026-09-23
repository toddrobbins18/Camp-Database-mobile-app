import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useParentCompany } from '../hooks/useParentCompany';
import { useRole } from '../hooks/useRole';
import {
  type Absence,
  type AuthorizedPickup,
  type Camper,
  type ParentPortalView,
  type PickupChange,
  type SwimLesson,
  userIsCampStaff,
} from '../constants/parentPortalConstants';
import { ParentPortalShell, useParentPortalColors } from '../components/parentPortal/ParentPortalShell';
import {
  ParentAbsencesView,
  ParentAuthorizedView,
  ParentCampersView,
  ParentHomeView,
  ParentPickupsView,
  ParentSwimView,
} from '../components/parentPortal/ParentPortalViews';
import { ParentAuthScreen } from './ParentAuthScreen';

export function ParentPortalScreen({ navigation }: { navigation: any }) {
  const { companyId, companySlug, companyName, themeColor, loading: companyLoading } = useParentCompany();
  const colors = useParentPortalColors(themeColor, companySlug);
  const { data: roleData } = useRole(companyId);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [activeView, setActiveView] = useState<ParentPortalView>('home');
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState('');
  const [contactName, setContactName] = useState<string | null>(null);
  const [campers, setCampers] = useState<Camper[]>([]);
  const [pickups, setPickups] = useState<PickupChange[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [authPickups, setAuthPickups] = useState<AuthorizedPickup[]>([]);
  const [swimLessons, setSwimLessons] = useState<SwimLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadAll = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAuthed(false);
      setLoading(false);
      return;
    }

    const { data: fam } = await supabase
      .from('families')
      .select('id, family_name, primary_contact_name')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .maybeSingle();

    if (!fam) {
      setFamilyId(null);
      setLoading(false);
      return;
    }

    setFamilyId(fam.id);
    setFamilyName(fam.family_name);
    setContactName(fam.primary_contact_name);

    const { data: fc } = await supabase
      .from('family_children')
      .select('child_id, children:child_id(id, name, grade, group_name, photo_url, status)')
      .eq('family_id', fam.id);

    const linked: Camper[] = (fc ?? [])
      .map((row: { children: Camper | null }) => row.children)
      .filter((c): c is Camper => !!c)
      .sort((a, b) => a.name.localeCompare(b.name));

    const ids = linked.map((c) => c.id);
    const swimPromise =
      ids.length > 0
        ? supabase.from('swim_lessons').select('*').in('camper_id', ids).order('scheduled_at', { ascending: true })
        : Promise.resolve({ data: [] as SwimLesson[] });

    const [{ data: p }, { data: a }, { data: ap }, { data: sl }] = await Promise.all([
      supabase.from('pickup_changes').select('*').eq('family_id', fam.id).order('change_date', { ascending: false }),
      supabase.from('absences').select('*').eq('family_id', fam.id).order('absence_date', { ascending: false }),
      supabase.from('authorized_pickups').select('*').eq('family_id', fam.id).order('full_name'),
      swimPromise,
    ]);

    setCampers(linked);
    setPickups((p ?? []) as PickupChange[]);
    setAbsences((a ?? []) as Absence[]);
    setAuthPickups((ap ?? []) as AuthorizedPickup[]);
    setSwimLessons((sl ?? []) as SwimLesson[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (authed && companyId) void loadAll();
  }, [authed, companyId, loadAll]);

  const handleSignOut = async () => {
    const staffRoles = roleData?.globalRoles ?? [];
    if (userIsCampStaff(staffRoles)) {
      navigation.navigate('Dashboard');
      return;
    }
    await supabase.auth.signOut();
    setAuthed(false);
    setFamilyId(null);
  };

  const linkAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !companyId) return;
    const defaultName = user.email?.split('@')[0] ?? 'My';
    const { error } = await supabase.rpc('register_parent_account', {
      _company_id: companyId,
      _family_name: defaultName,
      _primary_contact_name: (user.user_metadata as { full_name?: string })?.full_name ?? null,
      _phone: null,
    });
    if (error) Alert.alert('Error', error.message);
    else {
      setLoading(true);
      await loadAll();
    }
  };

  if (authed === null || companyLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!authed) {
    return (
      <ParentAuthScreen
        navigation={navigation}
        embedded
        onAuthenticated={() => setAuthed(true)}
        onOpenFamilyPortal={() => setAuthed(true)}
      />
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.textMuted }}>Loading your portal…</Text>
      </View>
    );
  }

  if (!familyId || !companyId) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg, padding: 24 }]}>
        <View style={[styles.linkCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
          <Text style={[styles.linkTitle, { color: colors.text }]}>Welcome to {companyName}</Text>
          <Text style={[styles.linkBody, { color: colors.textMuted }]}>
            Your account isn&apos;t linked to a family yet. Create your family profile to get started.
          </Text>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.brand }]} onPress={linkAccount}>
            <Text style={styles.primaryBtnText}>Create family & continue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.border }]} onPress={handleSignOut}>
            <Text style={[styles.outlineBtnText, { color: colors.text }]}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const camperName = (id: string) => campers.find((c) => c.id === id)?.name ?? '—';
  const sharedProps = {
    campName: companyName,
    contactName,
    companyId,
    familyId,
    campers,
    pickups,
    absences,
    authPickups,
    swimLessons,
    onSaved: loadAll,
    onNavigate: setActiveView,
    camperName,
    colors,
  };

  return (
    <ParentPortalShell
      campName={companyName}
      familyName={familyName}
      contactName={contactName}
      themeColor={themeColor}
      companySlug={companySlug}
      activeView={activeView}
      onNavigate={setActiveView}
      onSignOut={handleSignOut}
      onOpenDrawer={() => navigation.openDrawer()}
    >
      {activeView === 'home' && <ParentHomeView {...sharedProps} />}
      {activeView === 'campers' && <ParentCampersView {...sharedProps} />}
      {activeView === 'pickups' && <ParentPickupsView {...sharedProps} />}
      {activeView === 'absences' && <ParentAbsencesView {...sharedProps} />}
      {activeView === 'authorized' && <ParentAuthorizedView {...sharedProps} />}
      {activeView === 'swim' && <ParentSwimView {...sharedProps} />}
    </ParentPortalShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  linkCard: { width: '100%', maxWidth: 420, borderRadius: 24, borderWidth: 1, padding: 24 },
  linkTitle: { fontSize: 20, fontWeight: '700' },
  linkBody: { fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 16 },
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  outlineBtn: { marginTop: 10, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  outlineBtnText: { fontWeight: '600' },
});
