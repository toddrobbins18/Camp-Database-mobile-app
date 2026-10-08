import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  absenceTypeLabel,
  changeTypeLabel,
  formatFriendlyDate,
  type Absence,
  type PickupChange,
  type SwimLesson,
} from '../../constants/parentPortalConstants';
import type { ParentPortalColors } from '../../lib/parentPortalTheme';
import { PP_AERIAL_GLASS } from '../../lib/parentPortalTheme';
import { PP, ppCard, ppFont } from '../../lib/parentPortalUi';

type Props = {
  todayIso: string;
  pickups: PickupChange[];
  absences: Absence[];
  swimLessons: SwimLesson[];
  camperName: (id: string) => string;
  colors: ParentPortalColors;
  glass?: boolean;
};

type Item = {
  id: string;
  timeLabel: string;
  title: string;
  detail?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'amber' | 'blue' | 'emerald';
};

export function TodayTimeline({
  todayIso,
  pickups,
  absences,
  swimLessons,
  camperName,
  colors,
  glass,
}: Props) {
  const items: Item[] = [];

  for (const absence of absences.filter((a) => a.absence_date === todayIso && a.status !== 'cancelled')) {
    items.push({
      id: `absence-${absence.id}`,
      timeLabel: absence.arrival_time || 'All day',
      title: `${camperName(absence.camper_id)} · ${absenceTypeLabel(absence.absence_type)}`,
      detail: absence.reason ?? undefined,
      icon: 'time-outline',
      tone: 'amber',
    });
  }

  for (const pickup of pickups.filter((p) => p.change_date === todayIso && p.status !== 'cancelled')) {
    items.push({
      id: `pickup-${pickup.id}`,
      timeLabel: pickup.pickup_time || 'Scheduled',
      title: `${camperName(pickup.camper_id)} · ${changeTypeLabel(pickup.change_type)}`,
      detail: pickup.pickup_person_name
        ? `Pickup by ${pickup.pickup_person_name}`
        : pickup.notes ?? undefined,
      icon: 'bus-outline',
      tone: 'blue',
    });
  }

  for (const lesson of swimLessons.filter((l) => l.scheduled_at.slice(0, 10) === todayIso)) {
    items.push({
      id: `swim-${lesson.id}`,
      timeLabel: new Date(lesson.scheduled_at).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }),
      title: `${camperName(lesson.camper_id)} · Swim lesson`,
      detail: [
        `${lesson.duration_minutes} min`,
        lesson.instructor ? `Instructor ${lesson.instructor}` : null,
        lesson.location,
      ]
        .filter(Boolean)
        .join(' · '),
      icon: 'water-outline',
      tone: 'emerald',
    });
  }

  const toneColors = {
    amber: { bg: colors.warningBg, fg: colors.warning },
    blue: { bg: '#DBEAFE', fg: '#1D4ED8' },
    emerald: { bg: colors.successBg, fg: colors.success },
  };

  const cardStyle = glass
    ? [ppCard(colors), styles.card, PP_AERIAL_GLASS]
    : [ppCard(colors), styles.card];

  return (
    <View style={cardStyle}>
      <Text style={[ppFont.titleSm, { color: colors.text, marginBottom: PP.md }]}>
        Today · {formatFriendlyDate(todayIso)}
      </Text>
      {items.length === 0 ? (
        <Text style={[ppFont.body, { color: colors.textMuted }]}>
          No schedule changes for today — regular camp day.
        </Text>
      ) : (
        <View style={styles.list}>
          {items.map((item) => {
            const t = toneColors[item.tone];
            return (
              <View key={item.id} style={styles.row}>
                <View style={[styles.timeCol, { borderRightColor: colors.border }]}>
                  <Text style={[ppFont.caption, { color: colors.textMuted }]}>{item.timeLabel}</Text>
                </View>
                <View style={[styles.iconBubble, { backgroundColor: t.bg }]}>
                  <Ionicons name={item.icon} size={16} color={t.fg} />
                </View>
                <View style={styles.body}>
                  <Text style={[ppFont.bodyMedium, { color: colors.text }]}>{item.title}</Text>
                  {item.detail ? (
                    <Text style={[ppFont.caption, { color: colors.textMuted, marginTop: 2 }]}>{item.detail}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: PP.lg },
  list: { gap: PP.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: PP.sm },
  timeCol: {
    width: 72,
    paddingRight: PP.sm,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
});
