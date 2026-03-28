import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { supabase } from '../lib/supabase';
import { MobileUserMenu } from '../components/MobileUserMenu';

type ScheduleSource = 'sports' | 'activities' | 'special_events' | 'master_calendar';

interface ScheduleEvent {
    id: string;
    title: string;
    type: string;
    time: string | null;
    location: string | null;
    description: string | null;
    source: ScheduleSource;
    divisions: string[];
}

function formatYmd(d: Date): string {
    return d.toISOString().split('T')[0];
}

export const DailyScheduleScreen = ({ navigation }: { navigation: any }) => {
    const { companyId, season, isTimberLakeCamp } = useCompany();
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [selectedDivision, setSelectedDivision] = useState<string>('all');

    const dateStr = formatYmd(selectedDate);

    const { data: divisions = [] } = useQuery({
        queryKey: ['dailyScheduleDivisions', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('divisions')
                .select('id, name, gender')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('sort_order');
            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId,
    });

    const { data: tigerTimes, isLoading: tigerLoading } = useQuery({
        queryKey: ['dailyWolfContent', companyId, season, dateStr, isTimberLakeCamp],
        queryFn: async () => {
            if (!companyId || !season || !isTimberLakeCamp) return null;
            const { data, error } = await supabase
                .from('daily_wolf_content')
                .select('*')
                .eq('company_id', companyId)
                .eq('date', dateStr)
                .eq('season', season)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!companyId && !!season && isTimberLakeCamp,
    });

    const fetchScheduleEvents = useCallback(async (): Promise<ScheduleEvent[]> => {
        if (!companyId || !season) return [];
        const allEvents: ScheduleEvent[] = [];

        const [sportsRes, activitiesRes, specialEventsRes, masterCalendarRes] = await Promise.all([
            supabase
                .from('sports_calendar')
                .select(
                    `id, title, sport_type, opponent, event_date, time, start_time_field, location, description, home_away,
          sports_calendar_divisions(division_id)`
                )
                .eq('company_id', companyId)
                .eq('season', season)
                .eq('event_date', dateStr),
            supabase
                .from('activities_field_trips')
                .select(
                    `id, title, activity_type, event_date, time, location, description,
          activities_field_trips_divisions(division_id)`
                )
                .eq('company_id', companyId)
                .eq('season', season)
                .eq('event_date', dateStr),
            supabase
                .from('special_events_activities')
                .select(
                    'id, title, event_type, event_date, start_time, end_time, time_slot, location, description, division_id'
                )
                .eq('company_id', companyId)
                .eq('season', season)
                .eq('event_date', dateStr),
            supabase
                .from('master_calendar')
                .select('id, title, type, event_date, time, location, description, division_id')
                .eq('company_id', companyId)
                .eq('season', season)
                .eq('event_date', dateStr),
        ]);

        if (sportsRes.data) {
            for (const event of sportsRes.data as any[]) {
                const divisionIds = (event.sports_calendar_divisions || []).map((d: any) => d.division_id);
                allEvents.push({
                    id: event.id,
                    title:
                        event.title ||
                        `${event.sport_type || 'Sports'}${event.opponent ? ` vs ${event.opponent}` : ''}`,
                    type:
                        event.home_away === 'home'
                            ? 'Home Game'
                            : event.home_away === 'away'
                              ? 'Away Game'
                              : 'Sports',
                    time: event.start_time_field || event.time,
                    location: event.location,
                    description: event.description,
                    source: 'sports',
                    divisions: divisionIds,
                });
            }
        }

        if (activitiesRes.data) {
            for (const event of activitiesRes.data as any[]) {
                const divisionIds = (event.activities_field_trips_divisions || []).map((d: any) => d.division_id);
                allEvents.push({
                    id: event.id,
                    title: event.title,
                    type: event.activity_type,
                    time: event.time,
                    location: event.location,
                    description: event.description,
                    source: 'activities',
                    divisions: divisionIds,
                });
            }
        }

        if (specialEventsRes.data) {
            for (const event of specialEventsRes.data as any[]) {
                allEvents.push({
                    id: event.id,
                    title: event.title,
                    type: event.event_type || 'Special Event',
                    time: event.start_time || event.time_slot,
                    location: event.location,
                    description: event.description,
                    source: 'special_events',
                    divisions: event.division_id ? [event.division_id] : [],
                });
            }
        }

        if (masterCalendarRes.data) {
            for (const event of masterCalendarRes.data as any[]) {
                allEvents.push({
                    id: event.id,
                    title: event.title,
                    type: event.type,
                    time: event.time,
                    location: event.location,
                    description: event.description,
                    source: 'master_calendar',
                    divisions: event.division_id ? [event.division_id] : [],
                });
            }
        }

        allEvents.sort((a, b) => {
            if (!a.time && !b.time) return 0;
            if (!a.time) return 1;
            if (!b.time) return -1;
            return String(a.time).localeCompare(String(b.time));
        });

        return allEvents;
    }, [companyId, season, dateStr]);

    const { data: events = [], isLoading: eventsLoading } = useQuery({
        queryKey: ['dailyScheduleEvents', companyId, season, dateStr],
        queryFn: fetchScheduleEvents,
        enabled: !!companyId && !!season,
    });

    const filteredEvents = useMemo(() => {
        if (selectedDivision === 'all') return events;
        return events.filter(
            (e) => e.divisions.length === 0 || e.divisions.includes(selectedDivision)
        );
    }, [events, selectedDivision]);

    const sourceLabel = (s: ScheduleSource) => {
        switch (s) {
            case 'sports':
                return 'Sports';
            case 'activities':
                return 'Activity';
            case 'special_events':
                return 'Event';
            case 'master_calendar':
                return 'Calendar';
            default:
                return s;
        }
    };

    const navigateDate = (dir: 'prev' | 'next') => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + (dir === 'next' ? 1 : -1));
        setSelectedDate(d);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Daily Schedule</Text>
                <MobileUserMenu navigation={navigation} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.dateRow}>
                    <TouchableOpacity onPress={() => navigateDate('prev')} style={styles.dateBtn}>
                        <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.dateText}>{dateStr}</Text>
                    <TouchableOpacity onPress={() => navigateDate('next')} style={styles.dateBtn}>
                        <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionLabel}>Division</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    <TouchableOpacity
                        style={[styles.chip, selectedDivision === 'all' && styles.chipActive]}
                        onPress={() => setSelectedDivision('all')}
                    >
                        <Text style={[styles.chipText, selectedDivision === 'all' && styles.chipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {divisions.map((d: any) => (
                        <TouchableOpacity
                            key={d.id}
                            style={[styles.chip, selectedDivision === d.id && styles.chipActive]}
                            onPress={() => setSelectedDivision(d.id)}
                        >
                            <Text
                                style={[styles.chipText, selectedDivision === d.id && styles.chipTextActive]}
                                numberOfLines={1}
                            >
                                {d.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {isTimberLakeCamp && (
                    <StyledCard style={styles.card}>
                        <Text style={styles.cardTitle}>Tiger Times (today)</Text>
                        {tigerLoading ? (
                            <ActivityIndicator color={theme.colors.secondary} />
                        ) : tigerTimes ? (
                            <>
                                {[
                                    ['Laundry', tigerTimes.laundry_info],
                                    ['Phone calls', tigerTimes.phone_calls_info],
                                    ['Outside events', tigerTimes.outside_event],
                                    ['Staff days off', tigerTimes.staff_days_off],
                                    ['OD notes', tigerTimes.od_notes],
                                ].map(
                                    ([label, val]) =>
                                        val ? (
                                            <View key={label as string} style={styles.ttRow}>
                                                <Text style={styles.ttLabel}>{label}</Text>
                                                <Text style={styles.ttVal}>{String(val)}</Text>
                                            </View>
                                        ) : null
                                )}
                                {!tigerTimes.laundry_info &&
                                    !tigerTimes.phone_calls_info &&
                                    !tigerTimes.outside_event &&
                                    !tigerTimes.staff_days_off &&
                                    !tigerTimes.od_notes && (
                                        <Text style={styles.muted}>No Tiger Times content for this date.</Text>
                                    )}
                            </>
                        ) : (
                            <Text style={styles.muted}>No Tiger Times content for this date.</Text>
                        )}
                    </StyledCard>
                )}

                <Text style={styles.sectionLabel}>Events</Text>
                {eventsLoading ? (
                    <ActivityIndicator style={{ marginTop: 16 }} color={theme.colors.secondary} />
                ) : filteredEvents.length === 0 ? (
                    <Text style={styles.muted}>No events for this day.</Text>
                ) : (
                    filteredEvents.map((e) => (
                        <StyledCard key={`${e.source}-${e.id}`} style={styles.eventCard}>
                            <View style={styles.eventHeader}>
                                <Text style={styles.eventTitle}>{e.title}</Text>
                                <Text style={styles.badge}>{sourceLabel(e.source)}</Text>
                            </View>
                            {e.time ? <Text style={styles.eventMeta}>{e.time}</Text> : null}
                            {e.location ? <Text style={styles.eventMeta}>{e.location}</Text> : null}
                            {e.description ? <Text style={styles.eventDesc}>{e.description}</Text> : null}
                        </StyledCard>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    scroll: { padding: theme.spacing.md, paddingBottom: 48 },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
        gap: 16,
    },
    dateBtn: { padding: 8 },
    dateText: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    chipRow: { flexDirection: 'row', marginBottom: theme.spacing.md },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        marginRight: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    chipActive: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    chipText: { color: theme.colors.text, fontSize: 13 },
    chipTextActive: { color: '#fff', fontWeight: '600' },
    card: { marginBottom: theme.spacing.md, padding: theme.spacing.md },
    cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: theme.colors.text },
    ttRow: { marginBottom: 10 },
    ttLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
    ttVal: { fontSize: 14, color: theme.colors.text, marginTop: 2 },
    muted: { color: theme.colors.textSecondary, fontStyle: 'italic' },
    eventCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
    eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
    eventTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.colors.text },
    badge: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.secondary,
        backgroundColor: `${theme.colors.secondary}22`,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        overflow: 'hidden',
    },
    eventMeta: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
    eventDesc: { fontSize: 14, color: theme.colors.text, marginTop: 8 },
});
