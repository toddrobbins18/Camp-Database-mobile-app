import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatFriendlyDate, greetingForHour, todayIsoDate } from '../../constants/parentPortalConstants';
import type { ParentPortalColors } from '../../lib/parentPortalTheme';
import { PP, ppFont } from '../../lib/parentPortalUi';

type Props = {
  contactName?: string | null;
  campName: string;
  subtitle?: string;
  onAerialBackground?: boolean;
  colors: ParentPortalColors;
};

export function WelcomeHeader({
  contactName,
  campName,
  subtitle,
  onAerialBackground = false,
  colors,
}: Props) {
  const firstName = contactName?.trim().split(/\s+/)[0] ?? 'there';
  const greeting = greetingForHour(new Date().getHours());
  const todayLabel = formatFriendlyDate(todayIsoDate());
  const light = onAerialBackground;

  return (
    <View style={styles.wrap}>
      <Text style={[ppFont.caption, { color: light ? 'rgba(255,255,255,0.85)' : colors.textMuted }]}>
        {todayLabel}
      </Text>
      <Text
        style={[
          ppFont.title,
          {
            marginTop: PP.xs,
            color: light ? '#fff' : colors.text,
          },
        ]}
      >
        {greeting}, {firstName}
      </Text>
      <Text
        style={[
          ppFont.body,
          {
            marginTop: PP.sm,
            color: light ? 'rgba(255,255,255,0.9)' : colors.textMuted,
            lineHeight: 22,
          },
        ]}
      >
        {subtitle ?? `Everything you need for ${campName} — in one place.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: PP.xs },
});
