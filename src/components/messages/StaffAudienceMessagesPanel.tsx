import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { theme } from '../../theme/theme';
import { supabase } from '../../lib/supabase';
import {
  audienceDivisionNames,
  audienceGroupNames,
  audienceWeekChoices,
  campersForBus,
  campersForDivision,
  campersForGroup,
  loadAudienceCampers,
  loadBusRosters,
  publishAudienceMessage,
  type AudienceCamper,
  type AudienceKind,
  type AudienceRosterKind,
  type BusRoster,
} from '../../lib/audienceMessaging';
import { defaultEnrollmentWeekForDate, loadEnrollmentWeekCalendar } from '../../lib/enrollmentWeekCalendar';

type Props = { companyId: string; season: string; kind: AudienceKind };

export function StaffAudienceMessagesPanel({ companyId, season, kind }: Props) {
  const [campers, setCampers] = useState<AudienceCamper[]>([]);
  const [buses, setBuses] = useState<BusRoster[]>([]);
  const [rosterKind, setRosterKind] = useState<AudienceRosterKind>('group');
  const [target, setTarget] = useState('');
  const [weeks, setWeeks] = useState<number[]>([1]);
  const [everyone, setEveryone] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [roster, routes, calendar] = await Promise.all([
        loadAudienceCampers(supabase, companyId, season),
        loadBusRosters(supabase, companyId, season),
        loadEnrollmentWeekCalendar(supabase, companyId, season),
      ]);
      setCampers(roster);
      setBuses(routes);
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const currentWeek = defaultEnrollmentWeekForDate(calendar, today);
      setWeeks(currentWeek ? [currentWeek] : [1]);
    } catch (error) {
      Alert.alert('Messages', error instanceof Error ? error.message : 'Could not load groups and buses');
    }
  }, [companyId, season]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setTarget('');
    setEveryone(true);
  }, [kind, rosterKind]);

  const groups = useMemo(() => audienceGroupNames(campers), [campers]);
  const divisions = useMemo(() => audienceDivisionNames(campers), [campers]);
  const rosterNames = rosterKind === 'division' ? divisions : groups;

  const bus = buses.find((row) => row.id === target);
  const recipients = useMemo(() => {
    if (!target) return [];
    if (kind === 'bus') return campersForBus(campers, bus?.camperNames ?? [], weeks, everyone);
    if (rosterKind === 'division') return campersForDivision(campers, target, weeks, everyone);
    return campersForGroup(campers, target, weeks, everyone);
  }, [bus, campers, everyone, kind, rosterKind, target, weeks]);

  const send = async () => {
    if (!target || !body.trim() || recipients.length === 0 || sending) return;
    setSending(true);
    const label = kind === 'bus' ? bus?.label ?? 'Bus' : target;
    const { error } = await publishAudienceMessage(supabase, {
      companyId,
      season,
      title: title.trim() || `${label} update`,
      body: body.trim(),
      kind: kind === 'bus' ? 'bus' : 'group',
      label,
      weeks,
      everyone,
      childIds: recipients.map((camper) => camper.id),
    });
    setSending(false);
    if (error) {
      Alert.alert('Messages', error);
      return;
    }
    Alert.alert('Sent', `${recipients.length} camper${recipients.length === 1 ? '' : 's'}`);
    setBody('');
  };

  const choices =
    kind === 'bus'
      ? buses.map((row) => ({ id: row.id, label: row.label }))
      : rosterNames.map((name) => ({ id: name, label: name }));

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.meta}>
        {kind === 'bus' ? 'Bus messages' : rosterKind === 'division' ? 'Division messages' : 'Group messages'}
      </Text>
      {kind === 'group' ? (
        <View style={styles.row}>
          <TouchableOpacity style={[styles.chip, rosterKind === 'group' && styles.chipOn]} onPress={() => setRosterKind('group')}>
            <Text style={styles.chipText}>Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, rosterKind === 'division' && styles.chipOn]} onPress={() => setRosterKind('division')}>
            <Text style={styles.chipText}>Divisions</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {choices.map((choice) => (
          <TouchableOpacity key={choice.id} style={[styles.chip, target === choice.id && styles.chipOn]} onPress={() => setTarget(choice.id)}>
            <Text style={styles.chipText}>{choice.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {kind === 'group' && choices.length === 0 ? (
        <Text style={styles.meta}>
          {rosterKind === 'division' ? 'No divisions assigned on campers yet.' : 'No groups assigned on campers yet.'}
        </Text>
      ) : null}
      <TouchableOpacity style={[styles.mode, everyone && styles.modeOn]} onPress={() => setEveryone((value) => !value)}>
        <Text style={styles.modeText}>
          {everyone
            ? 'Everyone included'
            : kind === 'bus'
              ? 'Message everyone on this bus'
              : rosterKind === 'division'
                ? 'Message everyone in this division'
                : 'Message everyone in this group'}
        </Text>
      </TouchableOpacity>
      <View style={styles.row}>
        {audienceWeekChoices().map((week) => {
          const on = !everyone && weeks.includes(week);
          return (
            <TouchableOpacity
              key={week}
              style={[styles.chip, on && styles.chipOn, everyone && styles.dim]}
              onPress={() => {
                setEveryone(false);
                setWeeks((current) => (current.includes(week) ? current.filter((value) => value !== week) : [...current, week].sort((a, b) => a - b)));
              }}
            >
              <Text style={styles.chipText}>{week}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.meta}>{recipients.length} campers</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="Subject" placeholderTextColor={theme.colors.textSecondary} style={styles.input} />
      <TextInput value={body} onChangeText={setBody} placeholder="Message" placeholderTextColor={theme.colors.textSecondary} style={[styles.input, styles.body]} multiline />
      <TouchableOpacity style={styles.send} onPress={() => void send()} disabled={sending || recipients.length === 0}>
        <Text style={styles.sendText}>{sending ? 'Sending…' : `Send to ${recipients.length}`}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mode: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  modeOn: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  modeText: { color: theme.colors.text, fontWeight: '600' },
  chips: { maxHeight: 44 },
  chip: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
  chipOn: { backgroundColor: theme.colors.secondary + '22', borderColor: theme.colors.secondary },
  chipText: { color: theme.colors.text, fontSize: 13 },
  dim: { opacity: 0.4 },
  meta: { color: theme.colors.textSecondary },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 10, color: theme.colors.text },
  body: { minHeight: 100, textAlignVertical: 'top' },
  send: { backgroundColor: theme.colors.secondary, borderRadius: 8, padding: 12, alignItems: 'center' },
  sendText: { color: '#fff', fontWeight: '700' },
});
