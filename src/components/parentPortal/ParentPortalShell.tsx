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
      <View style={styles.bgOrbA} />
      <View style={styles.bgOrbB} />

      <View style={styles.header}>
        {showDrawer && onOpenDrawer ? (
          <TouchableOpacity onPress={onOpenDrawer} style={styles.menuBtn}>
            <Ionicons name="menu-outline" size={26} color={colors.text} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.brandIconWrap}>
          <View style={[styles.brandIcon, { backgroundColor: colors.brandDark }]}>
            <View style={[styles.brandIconOverlay, { backgroundColor: colors.brand }]} />
            <Ionicons name="shield-checkmark" size={20} color="#fff" style={styles.brandIconGlyph} />
          </View>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.campName} numberOfLines={1}>
            {campName}
          </Text>
          <Text style={styles.familyLine} numberOfLines={1}>
            {familyName} Family{contactName ? ` · ${contactName}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={onSignOut} style={[styles.signOutBtn, { backgroundColor: colors.brandSubtle }]}>
          <Ionicons name="log-out-outline" size={18} color={colors.brand} />
          <Text style={[styles.signOutText, { color: colors.brand }]}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      {moreOpen ? (
        <View style={[styles.morePanel, { backgroundColor: colors.elevated, borderTopColor: colors.border }]}>
          {MOBILE_MORE.map((viewId) => {
            const item = PARENT_PORTAL_NAV.find((n) => n.id === viewId)!;
            const active = activeView === viewId;
            return (
              <TouchableOpacity
                key={viewId}
                style={[
                  styles.moreItem,
                  { backgroundColor: active ? colors.brand : colors.brandSubtle },
                ]}
                onPress={() => {
                  onNavigate(viewId);
                  setMoreOpen(false);
                }}
              >
                <Ionicons name={navIcon(viewId)} size={18} color={active ? '#fff' : colors.brand} />
                <Text style={[styles.moreItemText, { color: active ? '#fff' : colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <SafeAreaView edges={['bottom']} style={[styles.bottomNavWrap, { backgroundColor: colors.elevated, borderTopColor: colors.border }]}>
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
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.navIconWrap,
                    active
                      ? [styles.navIconActive, { backgroundColor: colors.brand, shadowColor: colors.brandDark }]
                      : { backgroundColor: colors.brandSubtle },
                  ]}
                >
                  <Ionicons
                    name={navIcon(viewId)}
                    size={19}
                    color={active ? '#fff' : colors.textSubtle}
                  />
                </View>
                <Text style={[styles.navLabel, active && { color: colors.brand, fontWeight: '700' }]}>
                  {item.mobileLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setMoreOpen((v) => !v)}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.navIconWrap,
                moreOpen || MOBILE_MORE.includes(activeView)
                  ? [styles.navIconActive, { backgroundColor: colors.brand, shadowColor: colors.brandDark }]
                  : { backgroundColor: colors.brandSubtle },
              ]}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={19}
                color={moreOpen || MOBILE_MORE.includes(activeView) ? '#fff' : colors.textSubtle}
              />
            </View>
            <Text
              style={[
                styles.navLabel,
                (moreOpen || MOBILE_MORE.includes(activeView)) && { color: colors.brand, fontWeight: '700' },
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
    bgOrbA: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: colors.brandSoft,
      opacity: 0.55,
      top: -60,
      right: -70,
    },
    bgOrbB: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: colors.brandMuted,
      opacity: 0.4,
      top: 180,
      left: -80,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.elevated,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      zIndex: 2,
      ...Platform.select({
        ios: {
          shadowColor: colors.brandDark,
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        },
        android: { elevation: 3 },
      }),
    },
    menuBtn: { padding: 4, marginRight: 4 },
    brandIconWrap: { marginRight: 10 },
    brandIcon: {
      width: 42,
      height: 42,
      borderRadius: 15,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: colors.brandDark,
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        },
        android: { elevation: 4 },
      }),
    },
    brandIconOverlay: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.75,
      left: '15%',
    },
    brandIconGlyph: { zIndex: 1 },
    headerText: { flex: 1, minWidth: 0 },
    campName: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    familyLine: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    signOutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    signOutText: { fontSize: 12, fontWeight: '700' },
    main: { flex: 1, zIndex: 1 },
    mainContent: { padding: 16, paddingBottom: 28 },
    morePanel: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderTopWidth: 1,
    },
    moreItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 14,
      minWidth: '46%',
    },
    moreItemText: { fontSize: 13, fontWeight: '700' },
    bottomNavWrap: {
      borderTopWidth: 1,
      ...Platform.select({
        ios: {
          shadowColor: colors.brandDark,
          shadowOpacity: 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -6 },
        },
        android: { elevation: 12 },
      }),
    },
    bottomNav: {
      flexDirection: 'row',
      paddingHorizontal: 6,
      paddingTop: 8,
      paddingBottom: 4,
    },
    navItem: { flex: 1, alignItems: 'center', gap: 5 },
    navIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navIconActive: {
      ...Platform.select({
        ios: {
          shadowOpacity: 0.35,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        },
        android: { elevation: 4 },
      }),
    },
    navLabel: { fontSize: 10, fontWeight: '600', color: colors.textSubtle },
  });
}

export function useParentPortalColors(themeColor?: string | null, companySlug?: string | null) {
  return useMemo(() => {
    const hex = resolveParentPortalThemeColor(themeColor, companySlug);
    return buildParentPortalColors(hex);
  }, [themeColor, companySlug]);
}
