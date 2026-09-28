import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatFriendlyDate, greetingForHour } from '../../constants/parentPortalConstants';
import type { ParentPortalColors } from '../../lib/parentPortalTheme';

type Props = {
  contactName?: string | null;
  campName: string;
  colors: ParentPortalColors;
};

export function WelcomeHero({ contactName, campName, colors }: Props) {
  const firstName = contactName?.trim().split(/\s+/)[0];
  const greeting = greetingForHour(new Date().getHours());
  const todayLabel = formatFriendlyDate(new Date().toISOString().slice(0, 10));

  return (
    <View style={[styles.wrap, { shadowColor: colors.brandDark }]}>
      <View style={[styles.base, { backgroundColor: colors.brandDark }]} />
      <View style={[styles.mid, { backgroundColor: colors.brand }]} />
      <View style={[styles.top, { backgroundColor: colors.brand }]} />
      <View style={styles.glowA} />
      <View style={styles.glowB} />

      <View style={styles.content}>
        <View style={styles.datePill}>
          <Ionicons name="sparkles" size={13} color="rgba(255,255,255,0.95)" />
          <Text style={styles.dateText}>{todayLabel}</Text>
        </View>
        <Text style={styles.greeting}>
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </Text>
        <Text style={styles.subtitle}>
          Everything for your family at {campName} — pickups, absences, and swim lessons in one place.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 28,
    overflow: 'hidden',
    minHeight: 168,
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  base: { ...StyleSheet.absoluteFillObject },
  mid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '30%',
    opacity: 0.85,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: 0,
    bottom: 0,
    opacity: 0.55,
  },
  glowA: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.14)',
    top: -40,
    right: -30,
  },
  glowB: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -20,
    left: 40,
  },
  content: { padding: 22, paddingTop: 20 },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  dateText: { color: 'rgba(255,255,255,0.92)', fontSize: 12, fontWeight: '700' },
  greeting: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 14,
    lineHeight: 34,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    maxWidth: 320,
  },
});
