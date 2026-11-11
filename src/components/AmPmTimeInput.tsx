import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { amPmPartsToHHmm, parseAmPmParts } from '../lib/amPmTime';
import { theme } from '../theme/theme';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

type Props = {
  label?: string;
  value: string;
  onChange: (hhmm: string) => void;
  optional?: boolean;
};

export function AmPmTimeInput({ label, value, onChange, optional }: Props) {
  const parts = parseAmPmParts(value);
  const hour = parts?.hour ?? 12;
  const minute = parts?.minute ?? 0;
  const period = parts?.period ?? 'PM';
  const minuteOptions = MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort((a, b) => a - b);

  const emit = (nextHour: number, nextMinute: number, nextPeriod: 'AM' | 'PM') => {
    onChange(amPmPartsToHHmm(nextHour, nextMinute, nextPeriod));
  };

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {optional ? ' (optional)' : ''}
        </Text>
      ) : null}
      <View style={styles.row}>
        <ChipColumn
          values={HOURS.map(String)}
          selected={parts ? String(hour) : ''}
          onSelect={(v) => emit(parseInt(v, 10), minute, period)}
        />
        <ChipColumn
          values={minuteOptions.map((m) => String(m).padStart(2, '0'))}
          selected={parts ? String(minute).padStart(2, '0') : ''}
          onSelect={(v) => emit(hour, parseInt(v, 10), period)}
        />
        <ChipColumn
          values={['AM', 'PM']}
          selected={parts ? period : ''}
          onSelect={(v) => emit(hour, minute, v as 'AM' | 'PM')}
        />
      </View>
      {optional && value ? (
        <TouchableOpacity onPress={() => onChange('')}>
          <Text style={styles.clear}>Clear time</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ChipColumn({
  values,
  selected,
  onSelect,
}: {
  values: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {values.map((v) => {
        const on = v === selected;
        return (
          <TouchableOpacity
            key={v}
            onPress={() => onSelect(v)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{v}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6 },
  row: { gap: 8 },
  chips: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border ?? '#e5e7eb',
    backgroundColor: theme.colors.surface,
  },
  chipOn: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  chipText: { fontSize: 13, color: theme.colors.text },
  chipTextOn: { color: '#fff', fontWeight: '600' },
  clear: { marginTop: 6, fontSize: 12, color: theme.colors.textSecondary },
});
