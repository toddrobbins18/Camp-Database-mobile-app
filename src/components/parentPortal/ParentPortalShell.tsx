import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  PARENT_PORTAL_NAV,
  type ParentPortalView,
} from '../../constants/parentPortalConstants';
import {
  buildParentPortalColors,
  resolveParentPortalThemeColor,
  type ParentPortalColors,
} from '../../lib/parentPortalTheme';

type Props = {
  campName: string;
  familyName: string;
  contactName?: string | null;
  themeColor?: string | null;
  companySlug?: string | null;
  activeView: ParentPortalView;
  onNavigate: (view: ParentPortalView) => void;
  onSignOut: () => void;
  onOpenDrawer?: () => void;
  showDrawer?: boolean;
  children: React.ReactNode;
};

const MOBILE_PRIMARY: ParentPortalView[] = ['home', 'campers', 'pickups', 'absences'];
const MOBILE_MORE: ParentPortalView[] = ['authorized', 'swim'];

export function ParentPortalShell({
  campName,
  familyName,
  contactName,
  themeColor,
  companySlug,
  activeView,
  onNavigate,
  onSignOut,
  onOpenDrawer,
  showDrawer = true,
  children,
}: Props) {
  const colors = useMemo(() => {
    const hex = resolveParentPortalThemeColor(themeColor, companySlug);
    return buildParentPortalColors(hex);
  }, [themeColor, companySlug]);

  const styles = useMemo(() => createStyles(colors), [colors]);
  const [moreOpen, setMoreOpen] = useState(false);

  const navIcon = (id: ParentPortalView): keyof typeof Ionicons.glyphMap => {
    const item = PARENT_PORTAL_NAV.find((n) => n.id === id);
    return (item?.icon ?? 'ellipse-outline') as keyof typeof Ionicons.glyphMap;
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        {showDrawer && onOpenDrawer ? (
          <TouchableOpacity onPress={onOpenDrawer} style={styles.menuBtn}>
            <Ionicons name="menu-outline" size={26} color={colors.text} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.brandIcon}>
          <Ionicons name="shield-checkmark" size={20} color="#fff" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.campName} numberOfLines={1}>
            {campName}
          </Text>
          <Text style={styles.familyLine} numberOfLines={1}>
            {familyName} Family{contactName ? ` · ${contactName}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={onSignOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={18} color={colors.brand} />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>

      {moreOpen ? (
        <View style={styles.morePanel}>
          {MOBILE_MORE.map((viewId) => {
            const item = PARENT_PORTAL_NAV.find((n) => n.id === viewId)!;
            return (
              <TouchableOpacity
                key={viewId}
                style={styles.moreItem}
                onPress={() => {
                  onNavigate(viewId);
                  setMoreOpen(false);
                }}
              >
                <Ionicons name={navIcon(viewId)} size={18} color={colors.brand} />
                <Text style={styles.moreItemText}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <SafeAreaView edges={['bottom']} style={styles.bottomNavWrap}>
        <View style={styles.bottomNav}>
          {MOBILE_PRIMARY.map((viewId) => {
            const item = PARENT_PORTAL_NAV.find((n) => n.id === viewId)!;
            const active = activeView === viewId;
            return (
              <TouchableOpacity
                key={viewId}
                style={styles.navItem}
                onPress={() => {
                  setMoreOpen(false);
                  onNavigate(viewId);
                }}
              >
                <View style={[styles.navIconWrap, active && styles.navIconActive]}>
                  <Ionicons
                    name={navIcon(viewId)}
                    size={18}
                    color={active ? '#fff' : colors.textSubtle}
                  />
                </View>
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.mobileLabel}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setMoreOpen((v) => !v)}
          >
            <View
              style={[
                styles.navIconWrap,
                (moreOpen || MOBILE_MORE.includes(activeView)) && styles.navIconActive,
              ]}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={18}
                color={moreOpen || MOBILE_MORE.includes(activeView) ? '#fff' : colors.textSubtle}
              />
            </View>
            <Text
              style={[
                styles.navLabel,
                (moreOpen || MOBILE_MORE.includes(activeView)) && styles.navLabelActive,
              ]}
            >
              More
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

function createStyles(colors: ParentPortalColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.elevated,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOpacity: 0.04,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        },
        android: { elevation: 2 },
      }),
    },
    menuBtn: { padding: 4, marginRight: 4 },
    brandIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    headerText: { flex: 1, minWidth: 0 },
    campName: { fontSize: 15, fontWeight: '700', color: colors.text },
    familyLine: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    signOutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.brandSubtle,
    },
    signOutText: { fontSize: 12, fontWeight: '600', color: colors.brand },
    main: { flex: 1 },
    mainContent: { padding: 16, paddingBottom: 24 },
    morePanel: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.elevated,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    moreItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.brandSubtle,
      minWidth: '46%',
    },
    moreItemText: { fontSize: 13, fontWeight: '600', color: colors.text },
    bottomNavWrap: {
      backgroundColor: colors.elevated,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    bottomNav: {
      flexDirection: 'row',
      paddingHorizontal: 4,
      paddingTop: 6,
      paddingBottom: 4,
    },
    navItem: { flex: 1, alignItems: 'center', gap: 4 },
    navIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navIconActive: { backgroundColor: colors.brand },
    navLabel: { fontSize: 10, fontWeight: '500', color: colors.textSubtle },
    navLabelActive: { color: colors.brand, fontWeight: '700' },
  });
}

export function useParentPortalColors(themeColor?: string | null, companySlug?: string | null) {
  return useMemo(() => {
    const hex = resolveParentPortalThemeColor(themeColor, companySlug);
    return buildParentPortalColors(hex);
  }, [themeColor, companySlug]);
}
