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
import { PP, ppFont } from '../../lib/parentPortalUi';

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
  showDrawer = false,
  children,
}: Props) {
  const colors = useMemo(() => {
    const hex = resolveParentPortalThemeColor(themeColor, companySlug);
    return buildParentPortalColors(hex);
  }, [themeColor, companySlug]);

  const styles = useMemo(() => createStyles(colors), [colors]);
  const [moreOpen, setMoreOpen] = useState(false);

  const navIcon = (
    id: ParentPortalView,
    active: boolean,
  ): keyof typeof Ionicons.glyphMap => {
    const item = PARENT_PORTAL_NAV.find((n) => n.id === id);
    const base = (item?.icon ?? 'ellipse-outline') as string;
    if (!active) return base as keyof typeof Ionicons.glyphMap;
    return base.replace('-outline', '') as keyof typeof Ionicons.glyphMap;
  };

  const moreActive = moreOpen || MOBILE_MORE.includes(activeView);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={[ppFont.titleSm, { color: colors.text }]} numberOfLines={1}>
            {campName}
          </Text>
          <Text style={[ppFont.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={1}>
            {familyName} family
            {contactName ? ` · Hi, ${contactName.split(' ')[0]}!` : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onSignOut}
          style={styles.signOutBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Sign out"
        >
          <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
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
        <View style={[styles.moreSheet, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
          {MOBILE_MORE.map((viewId) => {
            const item = PARENT_PORTAL_NAV.find((n) => n.id === viewId)!;
            const active = activeView === viewId;
            return (
              <TouchableOpacity
                key={viewId}
                style={styles.moreRow}
                onPress={() => {
                  onNavigate(viewId);
                  setMoreOpen(false);
                }}
              >
                <Ionicons
                  name={navIcon(viewId, active)}
                  size={20}
                  color={active ? colors.brand : colors.textMuted}
                />
                <Text
                  style={[
                    ppFont.bodyMedium,
                    { color: active ? colors.brand : colors.text, flex: 1, marginLeft: PP.md },
                  ]}
                >
                  {item.label}
                </Text>
                {active ? <View style={[styles.activeDot, { backgroundColor: colors.brand }]} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <SafeAreaView edges={['bottom']} style={[styles.tabBarWrap, { backgroundColor: colors.elevated, borderTopColor: colors.border }]}>
        <View style={styles.tabBar}>
          {MOBILE_PRIMARY.map((viewId) => {
            const item = PARENT_PORTAL_NAV.find((n) => n.id === viewId)!;
            const active = activeView === viewId;
            return (
              <TouchableOpacity
                key={viewId}
                style={styles.tabItem}
                onPress={() => {
                  setMoreOpen(false);
                  onNavigate(viewId);
                }}
                activeOpacity={0.6}
              >
                <Ionicons
                  name={navIcon(viewId, active)}
                  size={22}
                  color={active ? colors.brand : colors.textSubtle}
                />
                <Text
                  style={[
                    ppFont.tab,
                    { color: active ? colors.brand : colors.textSubtle, marginTop: 4 },
                    active && { fontWeight: '600' },
                  ]}
                >
                  {item.mobileLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setMoreOpen((v) => !v)}
            activeOpacity={0.6}
          >
            <Ionicons
              name={moreActive ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline'}
              size={22}
              color={moreActive ? colors.brand : colors.textSubtle}
            />
            <Text
              style={[
                ppFont.tab,
                { color: moreActive ? colors.brand : colors.textSubtle, marginTop: 4 },
                moreActive && { fontWeight: '600' },
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
      paddingHorizontal: PP.xl,
      paddingVertical: PP.md,
      backgroundColor: colors.elevated,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerMain: { flex: 1, minWidth: 0 },
    signOutBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: PP.sm,
    },
    main: { flex: 1 },
    mainContent: {
      paddingHorizontal: PP.xl,
      paddingTop: PP.lg,
      paddingBottom: PP.xxxl,
    },
    moreSheet: {
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: PP.xl,
      paddingVertical: PP.sm,
    },
    moreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: PP.md,
    },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    tabBarWrap: {
      borderTopWidth: StyleSheet.hairlineWidth,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOpacity: 0.04,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
        android: { elevation: 8 },
      }),
    },
    tabBar: {
      flexDirection: 'row',
      paddingTop: PP.sm,
      paddingBottom: PP.xs,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: PP.xs,
    },
  });
}

export function useParentPortalColors(themeColor?: string | null, companySlug?: string | null) {
  return useMemo(() => {
    const hex = resolveParentPortalThemeColor(themeColor, companySlug);
    return buildParentPortalColors(hex);
  }, [themeColor, companySlug]);
}
