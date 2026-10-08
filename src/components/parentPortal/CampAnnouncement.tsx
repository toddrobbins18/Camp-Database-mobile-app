import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCampDateTime } from '../../lib/campTime';
import type { ParentPortalColors } from '../../lib/parentPortalTheme';
import { PP_AERIAL_GLASS } from '../../lib/parentPortalTheme';
import { PP, ppCard, ppFont } from '../../lib/parentPortalUi';

export type CampAnnouncementContent = {
  title: string;
  body: string;
  publishedAt?: string | null;
};

type CampAnnouncementProps = {
  campName: string;
  update?: CampAnnouncementContent | null;
  colors: ParentPortalColors;
  glass?: boolean;
};

export function CampAnnouncement({ campName, update, colors, glass }: CampAnnouncementProps) {
  const hasMessage = Boolean(update?.body?.trim());
  if (!hasMessage) return null;

  return (
    <View
      style={[
        ppCard(colors),
        styles.card,
        {
          borderColor: colors.brand + '30',
          backgroundColor: glass ? PP_AERIAL_GLASS.backgroundColor : colors.elevated,
        },
        glass ? PP_AERIAL_GLASS : null,
      ]}
      accessibilityLabel="Camp update"
    >
      <View style={[styles.accent, { backgroundColor: colors.brand }]} />
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: colors.brand }]}>
          <Ionicons name="megaphone" size={20} color="#fff" />
        </View>
        <View style={styles.body}>
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: colors.brandSubtle }]}>
              <Text style={[ppFont.caption, styles.badgeText, { color: colors.brandDark }]}>
                CAMP UPDATE
              </Text>
            </View>
            <Text style={[ppFont.caption, { color: colors.textMuted }]}>{campName}</Text>
          </View>
          <Text style={[ppFont.titleSm, { color: colors.text, marginTop: PP.sm }]}>
            {update!.title}
          </Text>
          <Text style={[ppFont.body, { color: colors.textMuted, marginTop: PP.sm, lineHeight: 22 }]}>
            {update!.body}
          </Text>
          {update?.publishedAt ? (
            <Text style={[ppFont.caption, { color: colors.textMuted, marginTop: PP.sm }]}>
              Posted {formatCampDateTime(update.publishedAt)}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  row: {
    flexDirection: 'row',
    gap: PP.md,
    padding: PP.lg,
    paddingLeft: PP.lg + 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: PP.sm,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
