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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { PARENT_PORTAL_COMPANY_SLUG_KEY } from '../constants/parentPortalConstants';

type Props = {
  navigation: any;
  onAuthenticated?: () => void;
};

export function ParentAuthScreen({ navigation, onAuthenticated }: Props) {
  const { companySlug } = useCompany();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');

  useEffect(() => {
    const boot = async () => {
      const slug = companySlug ?? (await AsyncStorage.getItem(PARENT_PORTAL_COMPANY_SLUG_KEY));
      if (slug) await AsyncStorage.setItem(PARENT_PORTAL_COMPANY_SLUG_KEY, slug);
      if (!slug) {
        setBooting(false);
        return;
      }
      const { data } = await supabase.from('companies').select('id').eq('slug', slug).maybeSingle();
      setCompanyId(data?.id ?? null);
      setBooting(false);
    };
    void boot();
  }, [companySlug]);

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

  if (booting) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.secondary} />
      </View>
    );
  }

  if (!companyId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
            <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Parent Portal</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.mutedText}>Camp not found. Switch to your day camp and try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Ionicons name="people-outline" size={22} color="#fff" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Parent Portal</Text>
          <Text style={styles.headerSubtitle}>Manage pickups, absences & authorized adults</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.cardWrap} keyboardShouldPersistTaps="handled">
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, tab === 'login' && styles.tabActive]} onPress={() => setTab('login')}>
            <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'signup' && styles.tabActive]} onPress={() => setTab('signup')}>
            <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {tab === 'login' ? (
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign In</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Family Last Name</Text>
            <TextInput style={styles.input} value={familyName} onChangeText={setFamilyName} />
            <Text style={styles.label}>Your Full Name</Text>
            <TextInput style={styles.input} value={contactName} onChangeText={setContactName} />
            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} />
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" value={suEmail} onChangeText={setSuEmail} />
            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} secureTextEntry value={suPassword} onChangeText={setSuPassword} />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSignUp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create Parent Account</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  mutedText: { color: theme.colors.textSecondary, textAlign: 'center' },
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
  cardWrap: { padding: 16 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: '#dbeafe' },
  tabText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: theme.colors.secondary, fontWeight: '700' },
  form: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.secondary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkText: { textAlign: 'center', color: theme.colors.secondary, fontSize: 12, marginTop: 12 },
});
