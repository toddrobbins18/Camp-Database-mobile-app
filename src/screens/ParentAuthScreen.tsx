import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useParentCompany } from '../hooks/useParentCompany';
import { useRole } from '../hooks/useRole';
import { userIsCampStaff } from '../constants/parentPortalConstants';
import { useParentPortalColors } from '../components/parentPortal/ParentPortalShell';
import { NestSandboxParentFlowGuide } from '../components/parentPortal/NestSandboxParentFlowGuide';
import { isNestSandboxParentTraining } from '../lib/nestSandboxParentDemo';
import { resolveParentPortalHeroImageSource } from '../lib/parentPortalTheme';
import { rememberParentCampForSignedInUser } from '../lib/parentFamilyLink';
import { sidebarBackgroundHexFromBrandHex } from '../theme/sidebarFromBrandColor';

type Props = {
  navigation: any;
  embedded?: boolean;
  onAuthenticated?: () => void;
  onOpenFamilyPortal?: () => void;
  onBack?: () => void;
  /** Login screen switch: camp photo behind the form, no staff menu bar. */
  compact?: boolean;
  header?: ReactNode;
};

const fieldColors = { borderColor: '#e2e8f0', color: '#0f172a', backgroundColor: '#ffffff' };

/** Uncontrolled fields so the iOS simulator hardware keyboard can keep every letter. */
function ParentLoginFields({
  loading,
  brand,
  large,
  onLogin,
  onForgot,
}: {
  loading: boolean;
  brand: string;
  large?: boolean;
  onLogin: (email: string, password: string) => void;
  onForgot: (email: string) => void;
}) {
  const emailRef = useRef('');
  const passwordRef = useRef('');
  const [passwordLocked, setPasswordLocked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputStyle = [styles.input, large && styles.inputLarge, fieldColors];

  return (
    <View style={styles.form} collapsable={false}>
      <Text style={[styles.label, { color: '#0f172a' }]}>Email</Text>
      <TextInput
        style={inputStyle}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        keyboardType="default"
        textContentType="none"
        autoComplete="off"
        importantForAutofill="no"
        onChangeText={(value) => {
          emailRef.current = value;
        }}
      />
      <Text style={[styles.label, { color: '#0f172a' }]}>Password</Text>
      <View style={styles.passwordWrap}>
        {passwordLocked ? (
          <TextInput
            key={showPassword ? 'pw-shown' : 'pw-hidden'}
            defaultValue={passwordRef.current}
            style={[inputStyle, styles.inputWithEye]}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            secureTextEntry={!showPassword}
            textContentType={showPassword ? 'none' : 'oneTimeCode'}
            autoComplete="off"
            onChangeText={(value) => {
              passwordRef.current = value;
            }}
          />
        ) : (
          <TextInput
            style={[inputStyle, styles.inputWithEye]}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            textContentType="none"
            autoComplete="off"
            onFocus={() => setPasswordLocked(true)}
            onChangeText={(value) => {
              passwordRef.current = value;
            }}
          />
        )}
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={() => {
            setPasswordLocked(true);
            setShowPassword((current) => !current);
          }}
          hitSlop={8}
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        >
          <Text style={[styles.showPassText, { color: brand }]}>{showPassword ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.primaryBtn, large && styles.primaryBtnLarge, { backgroundColor: brand }]}
        onPress={() => onLogin(emailRef.current, passwordRef.current)}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign in</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onForgot(emailRef.current)}>
        <Text style={[styles.link, { color: brand }]}>Forgot password?</Text>
      </TouchableOpacity>
    </View>
  );
}

export function ParentAuthScreen({
  navigation,
  embedded = false,
  onAuthenticated,
  onOpenFamilyPortal,
  onBack,
  compact = false,
  header,
}: Props) {
  const { companyId, companySlug, companyName, themeColor, loading: companyLoading } = useParentCompany();
  const colors = useParentPortalColors(themeColor, companySlug);
  const { data: roleData, isLoading: roleLoading } = useRole(companyId);
  const heroSource = resolveParentPortalHeroImageSource(companySlug);
  const hasPhotoBg = heroSource != null;
  const sidebarBarBg = sidebarBackgroundHexFromBrandHex(colors.brand) ?? colors.brandDark;

  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [sessionChecked, setSessionChecked] = useState(false);

  const [familyName, setFamilyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const isStaffPreview = userIsCampStaff(roleData?.globalRoles ?? []);
  const sandboxTraining = isNestSandboxParentTraining(companySlug);

  useEffect(() => {
    if (roleLoading || companyLoading) return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSessionChecked(true);
      if (!session) return;
      if (isStaffPreview) return;
      await rememberParentCampForSignedInUser(supabase);
      onAuthenticated?.();
    });
  }, [roleLoading, companyLoading, isStaffPreview, onAuthenticated]);

  const handleLogin = async (nextEmail: string, nextPassword: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: nextEmail.trim(),
      password: nextPassword,
    });
    if (error) {
      setLoading(false);
      Alert.alert('Sign in failed', error.message);
      return;
    }
    const linked = await rememberParentCampForSignedInUser(supabase);
    setLoading(false);
    if (!linked) {
      await supabase.auth.signOut();
      Alert.alert('Not linked', 'This email is not tied to a camper yet.');
      return;
    }
    onAuthenticated?.();
  };

  const handleSignUp = async () => {
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
      const linked = await rememberParentCampForSignedInUser(supabase);
      if (!linked) {
        setLoading(false);
        await supabase.auth.signOut();
        Alert.alert('Not linked', 'This email is not tied to a camper yet.');
        return;
      }
      const { error: rpcErr } = await supabase.rpc('register_parent_account', {
        _company_id: linked.companyId,
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

  const handleForgotPassword = async (nextEmail: string) => {
    if (!nextEmail.trim()) {
      Alert.alert('Enter email', 'Enter your email first.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(nextEmail.trim());
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

  const goBackFromAuth = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (navigation.canGoBack?.()) navigation.goBack();
    else goToNest();
  };

  const renderFormCard = () => (
    <View
      style={[
        styles.card,
        styles.cardShadow,
        compact
          ? styles.cardPlain
          : {
              backgroundColor: colors.elevated,
              borderColor: hasPhotoBg ? 'rgba(255,255,255,0.35)' : colors.border,
              shadowColor: colors.brandDark,
            },
        !compact && hasPhotoBg && styles.cardOnPhoto,
      ]}
    >
      <View style={styles.brandRow}>
        <View style={[styles.brandIcon, { backgroundColor: colors.brand }]}>
          <Ionicons name="shield-checkmark" size={22} color="#fff" />
        </View>
        <View style={styles.brandTextCol}>
          <Text style={[compact ? styles.cardHeadingLarge : styles.cardHeading, { color: colors.text }]} numberOfLines={2}>
            {compact ? 'Parent sign in' : companyName}
          </Text>
          <Text style={[styles.muted, { color: colors.textMuted }]}>Use the email on your camper</Text>
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
        <ParentLoginFields
          loading={loading}
          brand={colors.brand}
          large={compact}
          onLogin={handleLogin}
          onForgot={handleForgotPassword}
        />
      ) : (
        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>Family last name</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            value={familyName}
            onChangeText={setFamilyName}
          />
          <Text style={[styles.label, { color: colors.text }]}>Your full name</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            value={contactName}
            onChangeText={setContactName}
          />
          <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            value={phone}
            onChangeText={setPhone}
          />
          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            autoCapitalize="none"
            keyboardType="email-address"
            value={suEmail}
            onChangeText={setSuEmail}
          />
          <Text style={[styles.label, { color: colors.text }]}>Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.inputWithEye, { borderColor: colors.border, color: colors.text }]}
              secureTextEntry={!showSignupPassword}
              textContentType={showSignupPassword ? 'none' : 'oneTimeCode'}
              value={suPassword}
              onChangeText={setSuPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowSignupPassword((current) => !current)}
              hitSlop={8}
              accessibilityLabel={showSignupPassword ? 'Hide password' : 'Show password'}
            >
              <Text style={[styles.showPassText, { color: colors.brand }]}>
                {showSignupPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.brand }]} onPress={handleSignUp} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create parent account</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderMainContent = () => (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={embedded ? 0 : 8}
    >
      <View style={[styles.nestTopBar, { backgroundColor: sidebarBarBg }]}>
        <TouchableOpacity
          onPress={embedded || onBack ? goBackFromAuth : () => navigation.openDrawer()}
          hitSlop={12}
          accessibilityLabel={embedded || onBack ? 'Go back' : 'Open menu'}
        >
          <Ionicons
            name={embedded || onBack ? 'chevron-back' : 'menu-outline'}
            size={26}
            color="#fff"
          />
        </TouchableOpacity>
        <Text style={styles.nestTopBarTitle} numberOfLines={1}>
          Login / Signup
        </Text>
        <View style={styles.nestTopBarSpacer} />
      </View>

      {isStaffPreview ? (
        <View
          style={[
            styles.staffBanner,
            {
              backgroundColor: hasPhotoBg ? 'rgba(255,255,255,0.94)' : colors.elevated,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.staffText, { color: colors.textMuted }]}>
            <Text style={{ fontWeight: '700', color: colors.text }}>Staff preview</Text> — this is the login page
            parents see.
          </Text>
          <View style={styles.staffActions}>
            <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.border }]} onPress={goToNest}>
              <Text style={[styles.outlineBtnText, { color: colors.text }]}>Back to The Nest</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, styles.staffPrimary, { backgroundColor: colors.brand }]} onPress={openFamilyPortal}>
              <Text style={styles.primaryBtnText}>Open family portal</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {sandboxTraining && companyId && companySlug ? (
          <View style={{ marginBottom: 12 }}>
            <NestSandboxParentFlowGuide
              companyId={companyId}
              companySlug={companySlug}
              staffSignedIn={isStaffPreview}
            />
          </View>
        ) : null}

        {hasPhotoBg ? (
          <View style={styles.welcomeOnPhoto}>
            <View style={styles.familyPortalPill}>
              <Ionicons name="sparkles" size={14} color="#fff" />
              <Text style={styles.familyPortalPillText}>Family portal</Text>
            </View>
            <Text style={[styles.heroTitleOnPhoto, isStaffPreview && styles.heroTitleCompact]}>
              Your family&apos;s home at {companyName}
            </Text>
            {!isStaffPreview ? (
              <Text style={styles.heroBodyOnPhoto}>
                Manage pickups, report absences, update authorized adults, and confirm swim lessons.
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={[styles.heroCard, { shadowColor: colors.brandDark }]}>
            <View style={[styles.heroBase, { backgroundColor: colors.brandDark }]} />
            <View style={[styles.heroMid, { backgroundColor: colors.brand }]} />
            <View style={styles.heroGlow} />
            <Text style={styles.heroEyebrow}>✦ Family portal</Text>
            <Text style={styles.heroTitle}>Your family&apos;s home at {companyName}</Text>
            <Text style={styles.heroBody}>
              Manage pickups, report absences, update authorized adults, and confirm swim lessons.
            </Text>
          </View>
        )}

        {renderFormCard()}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (compact) {
    const compactBody = (
      <SafeAreaView style={styles.safeOnHero} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.flex}>
          {header ? <View style={styles.compactHeader}>{header}</View> : null}
          <View style={styles.scrollCompact}>
            <View style={styles.welcomeOnPhoto}>
              <View style={styles.familyPortalPill}>
                <Ionicons name="sparkles" size={14} color="#fff" />
                <Text style={styles.familyPortalPillText}>Family portal</Text>
              </View>
              <Text style={styles.heroTitleOnPhoto}>Family portal</Text>
              <Text style={styles.heroBodyOnPhoto}>
                Manage pickups, report absences, update authorized adults, and confirm swim lessons.
              </Text>
            </View>
            {renderFormCard()}
          </View>
        </View>
      </SafeAreaView>
    );

    return (
      <View style={styles.flex}>
        <ImageBackground
          source={heroSource ?? require('../../assets/ns-parent-portal-aerial.jpg')}
          style={styles.heroBg}
          resizeMode="cover"
        >
          <View style={styles.heroDim} pointerEvents="none" />
          {compactBody}
        </ImageBackground>
      </View>
    );
  }

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
          <View style={[styles.nestTopBar, { backgroundColor: sidebarBarBg }]}>
            <TouchableOpacity onPress={() => navigation.openDrawer()} hitSlop={12}>
              <Ionicons name="menu-outline" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.nestTopBarTitle}>Parent Portal</Text>
            <View style={styles.nestTopBarSpacer} />
          </View>
        ) : null}
        <View style={styles.centered}>
          <View style={[styles.card, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <Text style={[styles.cardHeading, { color: colors.text }]}>Camp not found</Text>
            <Text style={[styles.muted, { color: colors.textMuted }]}>
              Open Parent Portal from Login / Signup in the menu.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const shell = (
    <SafeAreaView
      style={[hasPhotoBg ? styles.safeOnHero : styles.root, !hasPhotoBg && { backgroundColor: colors.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      {renderMainContent()}
    </SafeAreaView>
  );

  if (hasPhotoBg && heroSource) {
    return (
      <View style={styles.flex}>
        <ImageBackground source={heroSource} style={styles.heroBg} resizeMode="cover">
          <View style={styles.heroDim} pointerEvents="none" />
          {shell}
        </ImageBackground>
      </View>
    );
  }

  return shell;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1 },
  heroBg: { flex: 1, width: '100%' },
  heroDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  safeOnHero: { flex: 1, backgroundColor: 'transparent' },
  compactHeader: { paddingHorizontal: 24, paddingTop: 8, alignItems: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  nestTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  nestTopBarTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  nestTopBarSpacer: { width: 26 },
  staffBanner: { padding: 16, borderBottomWidth: 1, gap: 12 },
  staffText: { fontSize: 13, lineHeight: 18 },
  staffActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  staffPrimary: { marginTop: 0, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
  scroll: { padding: 16, paddingBottom: 48, flexGrow: 1 },
  welcomeOnPhoto: { marginBottom: 14, paddingHorizontal: 2 },
  familyPortalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  familyPortalPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  heroTitleOnPhoto: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 12,
    letterSpacing: -0.5,
    lineHeight: 32,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroTitleCompact: {
    fontSize: 22,
    lineHeight: 28,
    marginTop: 10,
  },
  heroBodyOnPhoto: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 340,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroCard: {
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    overflow: 'hidden',
    minHeight: 150,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  heroBase: { ...StyleSheet.absoluteFillObject },
  heroMid: { position: 'absolute', top: 0, left: 0, right: 0, bottom: '25%', opacity: 0.85 },
  heroGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -30,
    right: -20,
  },
  heroEyebrow: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700', zIndex: 1 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 10, letterSpacing: -0.4, zIndex: 1 },
  heroBody: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 21, marginTop: 10, zIndex: 1 },
  cardShadow: {
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardOnPhoto: {
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  cardPlain: {
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: 28,
    borderWidth: 0,
    backgroundColor: '#ffffff',
    padding: 26,
  },
  card: { borderRadius: 24, borderWidth: 1, padding: 20 },
  cardHeadingLarge: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  inputLarge: { minHeight: 54, paddingVertical: 16, fontSize: 17, borderRadius: 14 },
  primaryBtnLarge: { marginTop: 18, paddingVertical: 16, borderRadius: 14 },
  scrollCompact: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 36, flexGrow: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  brandTextCol: { flex: 1, minWidth: 0 },
  brandIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardHeading: { fontSize: 16, fontWeight: '700' },
  muted: { fontSize: 13, marginTop: 2 },
  tabs: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabText: { fontSize: 14, fontWeight: '600' },
  form: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  passwordWrap: { position: 'relative', justifyContent: 'center' },
  inputWithEye: { paddingRight: 64 },
  eyeBtn: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  showPassText: { fontSize: 14, fontWeight: '700' },
  primaryBtn: { marginTop: 12, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  outlineBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  outlineBtnText: { fontWeight: '600', fontSize: 13 },
  link: { textAlign: 'center', fontSize: 12, marginTop: 12, fontWeight: '600' },
});
