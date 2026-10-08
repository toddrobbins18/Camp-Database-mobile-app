import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { theme } from '../../theme/theme';
import {
  SANDBOX_DEMO_STAFF_ACCOUNTS,
  SANDBOX_DEMO_STAFF_PASSWORD,
} from '../../lib/nestSandboxStaffDemo';

export function NestSandboxStaffTestAccountsCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Sandbox staff test logins</Text>
      <Text style={styles.body}>
        Use two devices (or log out between accounts) to message each other. Create users in Supabase
        Auth first, then run create_nest_sandbox_test_staff.sql with the service role key.
      </Text>
      {SANDBOX_DEMO_STAFF_ACCOUNTS.map((a) => (
        <Text key={a.key} style={styles.account}>
          <Text style={styles.accountName}>{a.fullName}</Text>
          {' — '}
          <Text style={styles.mono}>{a.email}</Text>
        </Text>
      ))}
      <Text style={styles.body}>
        Password (training only):{' '}
        <Text style={styles.mono}>{SANDBOX_DEMO_STAFF_PASSWORD}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
  },
  title: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 6 },
  body: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 8, lineHeight: 18 },
  account: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 },
  accountName: { fontWeight: '600', color: theme.colors.text },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11 },
});
