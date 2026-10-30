import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { campDateStringInSeason } from '../lib/campSeasonDate';
import {
  loadEnrollmentWeekCalendar,
  type EnrollmentWeekCalendar,
} from '../lib/enrollmentWeekCalendar';
import {
  resolveSwimLessonWeekCalendar,
  swimLessonWeekOptions,
} from '../lib/swimLessonSchedule';
import { fetchSwimLessonInstructorOptions } from '../lib/swimLessonInstructors';
import {
  SWIM_CALENDAR_TIME_COLUMNS,
  availableInstructorsForSlot,
  defaultSwimCalendarWeekNumber,
  groupLessonsBySwimSlot,
  instructorSlotStatus,
  monFriDatesForEnrollmentWeek,
  swimSlotKey,
  type SwimCalendarLesson,
} from '../lib/swimLessonCalendar';
import { swimLessonStatusLabel } from '../lib/swimLessonApproval';

type SubView = 'slots' | 'instructors';

type Props = {
  companyId: string;
  season: string;
  brand: string;
  lessons: SwimCalendarLesson[];
};

export function SwimLessonCalendarPanel({ companyId, season, brand, lessons }: Props) {
  const [weekCalendar, setWeekCalendar] = useState<EnrollmentWeekCalendar>([]);
  const [weekNumber, setWeekNumber] = useState(1);
  const [instructorOptions, setInstructorOptions] = useState<string[]>([]);
  const [subView, setSubView] = useState<SubView>('slots');

  const resolvedCalendar = useMemo(
    () => resolveSwimLessonWeekCalendar(weekCalendar, season),
    [weekCalendar, season],
  );

  const weekOptions = useMemo(() => swimLessonWeekOptions(resolvedCalendar), [resolvedCalendar]);

  useEffect(() => {
    void loadEnrollmentWeekCalendar(supabase, companyId, season).then(setWeekCalendar);
    void fetchSwimLessonInstructorOptions(supabase, companyId, season).then(setInstructorOptions);
  }, [companyId, season]);

  useEffect(() => {
    setWeekNumber(defaultSwimCalendarWeekNumber(resolvedCalendar, campDateStringInSeason(season)));
  }, [resolvedCalendar, season]);

  const weekDays = useMemo(
    () => monFriDatesForEnrollmentWeek(resolvedCalendar, weekNumber),
    [resolvedCalendar, weekNumber],
  );

  const slotMap = useMemo(() => groupLessonsBySwimSlot(lessons), [lessons]);

  const shiftWeek = (delta: number) => {
    setWeekNumber((prev) => Math.min(Math.max(prev + delta, 1), weekOptions.length || 1));
  };

  const currentWeekLabel = weekOptions.find((w) => w.weekNumber === weekNumber);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="calendar-outline" size={18} color={theme.colors.text} />
        <Text style={styles.title}>Lesson calendar</Text>
      </View>
      <Text style={styles.subtitle}>
        Booked slots and open instructors at 3:45 PM and 4:15 PM.
      </Text>

      <View style={styles.subViewRow}>
        <TouchableOpacity
          style={[
            styles.subViewBtn,
            subView === 'slots' && { backgroundColor: brand, borderColor: brand },
          ]}
          onPress={() => setSubView('slots')}
        >
          <Ionicons
            name={subView === 'slots' ? 'calendar' : 'calendar-outline'}
            size={18}
            color={subView === 'slots' ? '#fff' : brand}
          />
          <Text style={[styles.subViewBtnText, subView === 'slots' && styles.subViewBtnTextActive]}>
            By day
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.subViewBtn,
            subView === 'instructors' && { backgroundColor: brand, borderColor: brand },
          ]}
          onPress={() => setSubView('instructors')}
        >
          <Ionicons
            name={subView === 'instructors' ? 'people' : 'people-outline'}
            size={18}
            color={subView === 'instructors' ? '#fff' : brand}
          />
          <Text
            style={[styles.subViewBtnText, subView === 'instructors' && styles.subViewBtnTextActive]}
          >
            By instructor
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        <TouchableOpacity
          style={styles.weekArrow}
          onPress={() => shiftWeek(-1)}
          disabled={weekNumber <= 1}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.weekLabel} numberOfLines={2}>
          {currentWeekLabel ? `${currentWeekLabel.label} · ${currentWeekLabel.range}` : `Week ${weekNumber}`}
        </Text>
        <TouchableOpacity
          style={styles.weekArrow}
          onPress={() => shiftWeek(1)}
          disabled={weekNumber >= weekOptions.length}
        >
          <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {weekDays.length === 0 ? (
        <Text style={styles.empty}>Configure enrollment week dates to show Mon–Fri.</Text>
      ) : subView === 'slots' ? (
        weekDays.map((day) => (
          <View key={day.ymd} style={styles.dayBlock}>
            <Text style={styles.dayTitle}>{day.label}</Text>
            {SWIM_CALENDAR_TIME_COLUMNS.map((col) => {
              const slotLessons = slotMap.get(swimSlotKey(day.ymd, col.value)) ?? [];
              const open = availableInstructorsForSlot(instructorOptions, slotLessons);
              return (
                <View key={col.value} style={styles.slotBlock}>
                  <Text style={styles.slotTime}>{col.label}</Text>
                  {slotLessons.length === 0 ? (
                    <Text style={styles.muted}>No bookings</Text>
                  ) : (
                    slotLessons.map((l) => (
                      <View key={l.id} style={styles.booking}>
                        <Text style={styles.bookingName}>{l.camperName}</Text>
                        <Text style={styles.muted}>
                          {l.instructor ?? 'No instructor'} · {swimLessonStatusLabel(l.status)}
                        </Text>
                      </View>
                    ))
                  )}
                  <Text style={styles.availLabel}>
                    Available:{' '}
                    <Text style={open.length ? styles.availOpen : styles.availNone}>
                      {instructorOptions.length === 0
                        ? '—'
                        : open.length
                          ? open.join(', ')
                          : 'None'}
                    </Text>
                  </Text>
                </View>
              );
            })}
          </View>
        ))
      ) : instructorOptions.length === 0 ? (
        <Text style={styles.empty}>Add instructors when booking lessons.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={styles.instHeaderRow}>
              <Text style={[styles.instCell, styles.instNameCell]}>Instructor</Text>
              {weekDays.flatMap((day) =>
                SWIM_CALENDAR_TIME_COLUMNS.map((col) => (
                  <Text
                    key={`${day.ymd}-${col.value}`}
                    style={[styles.instCell, styles.instSlotCell]}
                  >
                    {day.weekdayShort}
                    {'\n'}
                    {col.label.replace(' ', '')}
                  </Text>
                )),
              )}
            </View>
            {instructorOptions.map((name) => (
              <View key={name} style={styles.instRow}>
                <Text style={[styles.instCell, styles.instNameCell]} numberOfLines={1}>
                  {name}
                </Text>
                {weekDays.flatMap((day) =>
                  SWIM_CALENDAR_TIME_COLUMNS.map((col) => {
                    const status = instructorSlotStatus(name, day.ymd, col.value, slotMap);
                    return (
                      <View key={`${name}-${day.ymd}-${col.value}`} style={[styles.instCell, styles.instSlotCell]}>
                        {status.available ? (
                          <Text style={styles.openBadge}>Open</Text>
                        ) : (
                          <Text style={styles.busyText} numberOfLines={2}>
                            {status.lesson?.camperName ?? '—'}
                          </Text>
                        )}
                      </View>
                    );
                  }),
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 12 },
  subViewRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  subViewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  subViewBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  subViewBtnTextActive: { color: '#fff', fontWeight: '600' },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekArrow: { padding: 4 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 13, color: theme.colors.text },
  dayBlock: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dayTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: theme.colors.text },
  slotBlock: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  slotTime: { fontSize: 13, fontWeight: '600', marginBottom: 4, color: theme.colors.text },
  booking: { marginBottom: 6 },
  bookingName: { fontSize: 13, fontWeight: '500', color: theme.colors.text },
  muted: { fontSize: 12, color: theme.colors.textSecondary },
  availLabel: { fontSize: 11, marginTop: 4, color: theme.colors.textSecondary },
  availOpen: { color: '#047857', fontWeight: '500' },
  availNone: { color: '#B45309', fontWeight: '500' },
  empty: { fontSize: 13, color: theme.colors.textSecondary },
  instHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  instRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  instCell: { padding: 6, justifyContent: 'center' },
  instNameCell: { width: 100, fontSize: 11, fontWeight: '600', color: theme.colors.text },
  instSlotCell: { width: 56, alignItems: 'center' },
  openBadge: { fontSize: 9, color: '#047857', fontWeight: '600' },
  busyText: { fontSize: 9, color: theme.colors.textSecondary, textAlign: 'center' },
});
