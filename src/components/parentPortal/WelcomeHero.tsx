import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { greetingForHour } from '../../constants/parentPortalConstants';
import type { ParentPortalColors } from '../../lib/parentPortalTheme';
import { PP, ppFont } from '../../lib/parentPortalUi';

type Props = {
  contactName?: string | null;
  colors: ParentPortalColors;
};

export function WelcomeHero({ contactName, colors }: Props) {
  const firstName = contactName?.trim().split(/\s+/)[0];
  const greeting = greetingForHour(new Date().getHours());

  return (
    <View style={[styles.wrap, { backgroundColor: colors.brand }]}>
      <View style={styles.glow} />
      <View style={styles.iconCircle}>
        <Ionicons name="sunny" size={28} color={colors.brand} />
      </View>
      <Text style={[ppFont.display, styles.greeting]}>
        {greeting}
        {firstName ? `, ${firstName}!` : '!'}
      </Text>
      <Text style={styles.tagline}>Here&apos;s how your kids are doing today</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    padding: PP.xl,
    paddingTop: PP.xxl,
    overflow: 'hidden',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -40,
    right: -30,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: PP.md,
  },
  greeting: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 34,
  },
  tagline: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: PP.sm,
    fontWeight: '500',
  },
});
