import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { useCompany } from '../../contexts/CompanyContext';
import { CAMP_SLUG, isNestSandboxCompany } from '../../constants/camps';
import { isNestSandboxModeActive, setNestSandboxModeActive } from '../../lib/nestSandboxMode';
import { StyledCard } from '../StyledCard';

export function NestSandboxDashboardCard() {
  const { companySlug, availableCompanies, switchCompany, isDayCamp } = useCompany();
  const [sandboxMode, setSandboxMode] = useState(false);

  useEffect(() => {
    void isNestSandboxModeActive().then(setSandboxMode);
  }, [companySlug]);

  const exitSandbox = useCallback(async () => {
    await setNestSandboxModeActive(false);
    setSandboxMode(false);
    const live =
      availableCompanies.find((c) => c.slug === CAMP_SLUG.NORTH_SHORE_DAY_CAMP)
      ?? availableCompanies.find((c) => !isNestSandboxCompany(c.slug));
    if (live) await switchCompany(live.id);
  }, [availableCompanies, switchCompany]);

  const enterSandbox = useCallback(async () => {
    const sandbox = availableCompanies.find((c) => c.slug === CAMP_SLUG.NEST_SANDBOX_DAY_CAMP);
    if (!sandbox) return;
    await setNestSandboxModeActive(true);
    setSandboxMode(true);
    await switchCompany(sandbox.id);
  }, [availableCompanies, switchCompany]);

  if (!isDayCamp) return null;

  const inSandbox = sandboxMode || isNestSandboxCompany(companySlug);
  const hasSandboxCompany = availableCompanies.some((c) => isNestSandboxCompany(c.slug));

  if (!inSandbox && !hasSandboxCompany) return null;

  return (
    <StyledCard style={[styles.card, inSandbox && styles.cardActive]}>
      <View style={styles.titleRow}>
        <Ionicons name="flask-outline" size={20} color={inSandbox ? '#b45309' : theme.colors.text} />
        <Text style={styles.title}>Training sandbox</Text>
      </View>
      {inSandbox ? (
        <>
          <Text style={styles.desc}>
            Dummy data camp for practice — season works; use demo campers and buses (season 2027 after seed SQL).
          </Text>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => void exitSandbox()}>
            <Ionicons name="arrow-back" size={16} color={theme.colors.text} />
            <Text style={styles.outlineBtnText}>Exit sandbox — back to live camp</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.desc}>
            Open a separate demo day camp to try transport, messaging, and parent tools without changing North Shore.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => void enterSandbox()}>
            <Ionicons name="flask-outline" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Open training sandbox</Text>
          </TouchableOpacity>
        </>
      )}
    </StyledCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16, padding: 16 },
  cardActive: { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  desc: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  outlineBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.text,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
