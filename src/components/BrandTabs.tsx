import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme/theme';
import { useCampBrandTheme } from '../hooks/useCampBrandTheme';

export type BrandTabItem = { key: string; label: string };

type Props = {
  tabs: string[] | BrandTabItem[];
  activeTab: string;
  onChange: (tab: string) => void;
  style?: ViewStyle;
  variant?: 'pill' | 'underline';
};

function normalizeTabs(tabs: string[] | BrandTabItem[]): BrandTabItem[] {
  if (tabs.length === 0) return [];
  return typeof tabs[0] === 'string'
    ? (tabs as string[]).map((t) => ({ key: t, label: t }))
    : (tabs as BrandTabItem[]);
}

/** Horizontal tabs using active camp brand color (web parity). */
export function BrandTabs({ tabs, activeTab, onChange, style, variant = 'pill' }: Props) {
  const { brand } = useCampBrandTheme();
  const items = normalizeTabs(tabs);

  const body = items.map((tab) => {
    const active = activeTab === tab.key;
    return (
      <TouchableOpacity
        key={tab.key}
        style={[
          variant === 'pill' ? styles.tabPill : styles.tabUnderline,
          variant === 'pill' && active && { backgroundColor: brand, borderColor: brand },
          variant === 'underline' && active && { borderBottomColor: brand },
        ]}
        onPress={() => onChange(tab.key)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            variant === 'pill' ? styles.tabText : styles.tabUnderlineText,
            active && (variant === 'pill' ? styles.tabTextActive : { color: brand, fontWeight: '600' }),
          ]}
          numberOfLines={2}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  });

  if (variant === 'underline') {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.underlineScroll, style]}>
        <View style={styles.underlineRow}>{body}</View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.container, style]}
      contentContainerStyle={styles.content}
    >
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: theme.spacing.md },
  content: { gap: theme.spacing.sm, paddingRight: theme.spacing.md },
  tabPill: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
    maxWidth: 280,
  },
  underlineScroll: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  underlineRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.md },
  tabUnderline: {
    paddingVertical: 12,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    maxWidth: 200,
  },
  tabUnderlineText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  tabTextActive: {
    color: '#fff',
  },
});
