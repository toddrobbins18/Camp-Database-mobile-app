import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useParentCompany } from '../hooks/useParentCompany';
import { useRole } from '../hooks/useRole';
import { userIsCampStaff } from '../constants/parentPortalConstants';
import { useParentPortalColors } from '../components/parentPortal/ParentPortalShell';

type Props = {
  navigation: any;
  embedded?: boolean;
  onAuthenticated?: () => void;
  onOpenFamilyPortal?: () => void;
};

export function ParentAuthScreen({
  navigation,
  embedded = false,
  onAuthenticated,
  onOpenFamilyPortal,
}: Props) {
  const { companyId, companySlug, companyName, themeColor, loading: companyLoading } = useParentCompany();
  const colors = useParentPortalColors(themeColor, companySlug);
  const { data: roleData, isLoading: roleLoading } = useRole(companyId);

  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [sessionChecked, setSessionChecked] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');

  const isStaffPreview = userIsCampStaff(roleData?.globalRoles ?? []);

  useEffect(() => {
    if (roleLoading || companyLoading) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionChecked(true);
      if (!session) return;
      if (isStaffPreview) return;
      onAuthenticated?.();
    });
  }, [roleLoading, companyLoading, isStaffPreview, onAuthenticated]);

  const handleLogin = async () => {
    if (!companyId) {
      Alert.alert('Missing camp', 'Select your camp before using the Parent Portal.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Sign in failed', error.message);
    else onAuthenticated?.();
  };

  const handleSignUp = async () => {
    if (!companyId) {
      Alert.alert('Missing camp', 'Select your camp before using the Parent Portal.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: suEmail,
      password: suPassword,
      options: { data: { full_name: contactName } },
    });
    if (error) {
      setLoading(false);
      Alert.alert('Sign up failed', error.message);
      return;
    }
    if (data.session) {
      const { error: rpcErr } = await supabase.rpc('register_parent_account', {
        _company_id: companyId,
        _family_name: familyName,
        _primary_contact_name: contactName,
        _phone: phone,
      });
      setLoading(false);
      if (rpcErr) Alert.alert('Account setup failed', rpcErr.message);
      else onAuthenticated?.();
    } else {
      setLoading(false);
      Alert.alert('Check your email', 'Confirm your account to continue.');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Enter email', 'Enter your email first.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Email sent', 'Password reset email sent.');
  };

  const openFamilyPortal = () => {
    if (onOpenFamilyPortal) {
      onOpenFamilyPortal();
      return;
    }
    navigation.navigate('DayCampModule', { moduleId: 'parent-portal' });
  };

  const goToNest = () => navigation.navigate('Dashboard');

  if (companyLoading || roleLoading || !sessionChecked) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!companyId) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
        {!embedded ? (
          <View style={styles.drawerHeader}>
            <TouchableOpacity onPress={() => navigation.openDrawer()}>
              <Ionicons name="menu-outline" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.drawerTitle, { color: colors.text }]}>Parent Portal</Text>
          </View>
        ) : null}
        <View style={styles.centered}>
          <View style={[styles.card, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <Text style={[styles.cardHeading, { color: colors.text }]}>Camp not found</Text>
            <Text style={[styles.muted, { color: colors.textMuted }]}>
              Open Parent Portal from Parent Facing → Login / Signup in the menu.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      {!embedded ? (
        <View style={styles.drawerHeader}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Ionicons name="menu-outline" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.drawerTitle, { color: colors.text }]}>Login / Signup</Text>
        </View>
      ) : null}

      {isStaffPreview ? (
        <View style={[styles.staffBanner, { backgroundColor: colors.elevated, borderBottomColor: colors.border }]}>
          <Text style={[styles.staffText, { color: colors.textMuted }]}>
            <Text style={{ fontWeight: '700', color: colors.text }}>Staff preview</Text> — this is the login page parents see.
          </Text>
          <View style={styles.staffActions}>
            <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.border }]} onPress={goToNest}>
              <Text style={[styles.outlineBtnText, { color: colors.text }]}>Back to The Nest</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.brand }]} onPress={openFamilyPortal}>
              <Text style={styles.primaryBtnText}>Open family portal</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.heroCard, { backgroundColor: colors.brand }]}>
          <Text style={styles.heroEyebrow}>Family portal</Text>
          <Text style={styles.heroTitle}>Your family&apos;s home at {companyName}</Text>
          <Text style={styles.heroBody}>
            Manage pickups, report absences, update authorized adults, and confirm swim lessons.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
          <View style={styles.brandRow}>
            <View style={[styles.brandIcon, { backgroundColor: colors.brand }]}>
              <Ionicons name="shield-checkmark" size={22} color="#fff" />
            </View>
            <View>
              <Text style={[styles.cardHeading, { color: colors.text }]}>{companyName}</Text>
              <Text style={[styles.muted, { color: colors.textMuted }]}>Parent sign in</Text>
            </View>
          </View>

          <View style={[styles.tabs, { backgroundColor: colors.brandSubtle }]}>
            <TouchableOpacity
              style={[styles.tab, tab === 'login' && { backgroundColor: colors.elevated }]}
              onPress={() => setTab('login')}
            >
              <Text style={[styles.tabText, { color: tab === 'login' ? colors.brand : colors.textMuted }]}>Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'signup' && { backgroundColor: colors.elevated }]}
              onPress={() => setTab('signup')}
            >
              <Text style={[styles.tabText, { color: tab === 'signup' ? colors.brand : colors.textMuted }]}>Sign up</Text>
            </TouchableOpacity>
          </View>

          {tab === 'login' ? (
            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <Text style={[styles.label, { color: colors.text }]}>Password</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.brand }]} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign in</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={[styles.link, { color: colors.brand }]}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.text }]}>Family last name</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} value={familyName} onChangeText={setFamilyName} />
              <Text style={[styles.label, { color: colors.text }]}>Your full name</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} value={contactName} onChangeText={setContactName} />
              <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} value={phone} onChangeText={setPhone} />
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} autoCapitalize="none" keyboardType="email-address" value={suEmail} onChangeText={setSuEmail} />
              <Text style={[styles.label, { color: colors.text }]}>Password</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} secureTextEntry value={suPassword} onChangeText={setSuPassword} />
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.brand }]} onPress={handleSignUp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create parent account</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  drawerTitle: { fontSize: 18, fontWeight: '700' },
  staffBanner: { padding: 16, borderBottomWidth: 1, gap: 12 },
  staffText: { fontSize: 13, lineHeight: 18 },
  staffActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scroll: { padding: 16, paddingBottom: 32 },
  heroCard: { borderRadius: 24, padding: 20, marginBottom: 16 },
  heroEyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 8 },
  heroBody: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 20, marginTop: 8 },
  card: { borderRadius: 24, borderWidth: 1, padding: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  brandIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardHeading: { fontSize: 16, fontWeight: '700' },
  muted: { fontSize: 13, marginTop: 2 },
  tabs: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabText: { fontSize: 14, fontWeight: '600' },
  form: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  primaryBtn: { marginTop: 12, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  outlineBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  outlineBtnText: { fontWeight: '600', fontSize: 13 },
  link: { textAlign: 'center', fontSize: 12, marginTop: 12, fontWeight: '600' },
});
