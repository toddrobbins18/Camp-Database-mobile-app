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
import { PP, ppCard, ppFont } from '../../lib/parentPortalUi';

type Props = {
  todayIso: string;
  pickups: PickupChange[];
  absences: Absence[];
  swimLessons: SwimLesson[];
  camperName: (id: string) => string;
  colors: ParentPortalColors;
};

type TodayLine = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  tone: 'ok' | 'info' | 'warn';
};

export function TodayAtCampBanner({
  todayIso,
  pickups,
  absences,
  swimLessons,
  camperName,
  colors,
}: Props) {
  const lines: TodayLine[] = [];

  for (const a of absences.filter((x) => x.absence_date === todayIso && x.status !== 'cancelled')) {
    lines.push({
      id: `a-${a.id}`,
      icon: 'home-outline',
      text: `${camperName(a.camper_id)} — ${absenceTypeLabel(a.absence_type).toLowerCase()} today`,
      tone: 'warn',
    });
  }
  for (const p of pickups.filter((x) => x.change_date === todayIso && x.status !== 'cancelled')) {
    lines.push({
      id: `p-${p.id}`,
      icon: 'car-outline',
      text: `${camperName(p.camper_id)} — ${changeTypeLabel(p.change_type).toLowerCase()}${p.pickup_time ? ` at ${p.pickup_time}` : ''}`,
      tone: 'info',
    });
  }
  for (const l of swimLessons.filter((x) => x.scheduled_at.startsWith(todayIso))) {
    const time = new Date(l.scheduled_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    lines.push({
      id: `s-${l.id}`,
      icon: 'water-outline',
      text: `${camperName(l.camper_id)} — swim lesson at ${time}`,
      tone: 'info',
    });
  }

  const allGood = lines.length === 0;

  return (
    <View style={[ppCard(colors), styles.card]}>
      <View style={styles.head}>
        <Ionicons name="today-outline" size={20} color={colors.brand} />
        <Text style={[ppFont.bodyMedium, { color: colors.text, marginLeft: PP.sm, flex: 1 }]}>
          Today · {formatFriendlyDate(todayIso)}
        </Text>
      </View>

      {allGood ? (
        <View style={[styles.okBox, { backgroundColor: colors.successBg }]}>
          <View style={[styles.okIcon, { backgroundColor: colors.success }]}>
            <Ionicons name="checkmark" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ppFont.titleSm, { color: colors.success }]}>All set!</Text>
            <Text style={[ppFont.body, { color: colors.text, marginTop: 4 }]}>
              Normal camp day — tap below if anything changes.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.lines}>
          <Text style={[ppFont.bodyMedium, { color: colors.text, marginBottom: PP.sm }]}>
            {lines.length === 1 ? '1 thing to know:' : `${lines.length} things to know:`}
          </Text>
          {lines.map((line) => {
            const bg =
              line.tone === 'warn' ? colors.warningBg : line.tone === 'info' ? colors.brandSubtle : colors.successBg;
            const iconColor =
              line.tone === 'warn' ? colors.warning : line.tone === 'info' ? colors.brand : colors.success;
            return (
              <View key={line.id} style={[styles.line, { backgroundColor: bg }]}>
                <Ionicons name={line.icon} size={20} color={iconColor} />
                <Text style={[ppFont.body, { color: colors.text, flex: 1, marginLeft: PP.md }]}>{line.text}</Text>
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
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: PP.md },
  okBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: PP.md,
    borderRadius: 14,
    gap: PP.md,
  },
  okIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lines: { gap: PP.sm },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: PP.md,
    borderRadius: 12,
  },
});
