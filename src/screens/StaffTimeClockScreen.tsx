import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useCompany } from '../contexts/CompanyContext';
import { staffTimeClockEnabledForCompany } from '../constants/camps';
import { OwlTimeKioskPanel } from '../components/owlTime/OwlTimeKioskPanel';
import { OwlTimeReportsPanel } from '../components/owlTime/OwlTimeReportsPanel';
import { OwlTimeSeasonSettingsPanel } from '../components/owlTime/OwlTimeSeasonSettingsPanel';

type OwlTimeTab = 'kiosk' | 'reports' | 'settings';

export function StaffTimeClockScreen({ navigation }: { navigation: any }) {
  const { companyId, companySlug, isDayCamp, season } = useCompany();
  const owlTimeEnabled = staffTimeClockEnabledForCompany({
    slug: companySlug,
    camp_type: isDayCamp ? 'day_camp' : 'overnight',
  });
  const [activeTab, setActiveTab] = useState<OwlTimeTab>('kiosk');
  const [settingsVersion, setSettingsVersion] = useState(0);

  if (!owlTimeEnabled) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Ionicons name="menu" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Owl Time</Text>
            <Text style={styles.subtitle}>Owl Time is only available for day camps.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Owl Time</Text>
          <Text style={styles.subtitle}>Staff sign-in · Season {season}</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        {(
          [
            { id: 'kiosk' as const, label: 'Kiosk', icon: 'qr-code-outline' as const },
            { id: 'reports' as const, label: 'Reports', icon: 'bar-chart-outline' as const },
            { id: 'settings' as const, label: 'Settings', icon: 'settings-outline' as const },
          ] as const
        ).map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.id ? '#fff' : theme.colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.panel}>
        {activeTab === 'kiosk' && companyId && season ? (
          <OwlTimeKioskPanel
            companyId={companyId}
            companySlug={companySlug}
            season={season}
            isDayCamp={isDayCamp}
          />
        ) : null}

        {activeTab === 'reports' && companyId && season ? (
          <OwlTimeReportsPanel
            companyId={companyId}
            season={season}
            settingsVersion={settingsVersion}
          />
        ) : null}

        {activeTab === 'settings' && companyId && season ? (
          <OwlTimeSeasonSettingsPanel
            companyId={companyId}
            season={season}
            onSaved={() => setSettingsVersion((v) => v + 1)}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  headerText: { flex: 1 },
  title: { ...theme.typography.h2, fontSize: 20 },
  subtitle: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  tabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  tabTextActive: { color: '#fff' },
  panel: { flex: 1 },
});
