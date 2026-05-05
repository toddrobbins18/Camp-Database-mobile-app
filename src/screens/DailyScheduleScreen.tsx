import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Pressable,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { supabase } from '../lib/supabase';
import { MobileUserMenu } from '../components/MobileUserMenu';
import { DivisionScheduleUploadTab } from '../components/DivisionScheduleUploadTab';
import { useRosterDivisionFilter } from '../api/campers';

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

const EMPTY_SCHEDULE_EVENTS: ScheduleEvent[] = [];

function formatYmd(d: Date): string {
    return d.toISOString().split('T')[0];
}

function formatDatePill(d: Date): string {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatScheduleHeader(d: Date): string {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/** Stable fallback so `useQuery` default `[]` is not a new array every render. */
const EMPTY_DIVISIONS: Array<{ id: string; name: string; gender?: string | null; sort_order?: number }> = [];

/** Prefer name (e.g. "Cub Boys") over DB gender when labels were inconsistent. */
function formatDivisionPickerLine(d: { name: string; gender?: string | null }): string {
    const nameLower = (d.name || '').toLowerCase();
    let suffix: string;
    if (/\bboys?\b/.test(nameLower)) suffix = 'Boys';
    else if (/\bgirls?\b/.test(nameLower)) suffix = 'Girls';
    else {
        const g = (d.gender || '').toLowerCase();
        suffix = g === 'male' || g === 'm' ? 'Boys' : 'Girls';
    }
    return `${d.name} (${suffix})`;
}

export const DailyScheduleScreen = ({ navigation }: { navigation: any }) => {
    const { companyId, season, isTimberLakeCamp } = useCompany();
    const rosterDivisionFilter = useRosterDivisionFilter(companyId);

    const [activeTab, setActiveTab] = useState<'schedule' | 'uploads'>('schedule');
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [selectedDivision, setSelectedDivision] = useState<string>('all');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showDivisionModal, setShowDivisionModal] = useState(false);

    const dateStr = formatYmd(selectedDate);

    const { data: divisionsData } = useQuery({
        queryKey: ['dailyScheduleDivisions', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('divisions')
                .select('id, name, gender, sort_order')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (error) throw error;
            const rows = data || [];
            return [...rows].sort((a: { sort_order?: number }, b: { sort_order?: number }) => {
                return (a.sort_order ?? 0) - (b.sort_order ?? 0);
            });
        },
        enabled: !!companyId,
    });
    const divisions = divisionsData ?? EMPTY_DIVISIONS;

    const divisionFilter = rosterDivisionFilter.data ?? null;
    const divisionFilterKey = useMemo(() => JSON.stringify(divisionFilter ?? null), [divisionFilter]);
    /** Same as web DailySchedule: only restrict when user has explicit division IDs assigned. */
    const hasDivisionRestriction = divisionFilter !== null && divisionFilter.length > 0;

    const accessibleDivisions = useMemo(() => {
        if (!hasDivisionRestriction) return divisions;
        return divisions.filter((d: { id: string }) => divisionFilter!.includes(d.id));
    }, [divisions, divisionFilter, hasDivisionRestriction]);

    useEffect(() => {
        if (!rosterDivisionFilter.isSuccess || !divisions.length) return;
        if (!hasDivisionRestriction) return;
        const first = divisions.find((d: { id: string }) => divisionFilter!.includes(d.id));
        if (first && selectedDivision === 'all') {
            setSelectedDivision(first.id);
        }
    }, [rosterDivisionFilter.isSuccess, divisions, divisionFilterKey, hasDivisionRestriction, selectedDivision]);

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

    const { data: eventsData, isLoading: eventsLoading } = useQuery({
        queryKey: ['dailyScheduleEvents', companyId, season, dateStr],
        queryFn: fetchScheduleEvents,
        enabled: !!companyId && !!season && rosterDivisionFilter.isFetched,
    });
    const events = eventsData ?? EMPTY_SCHEDULE_EVENTS;

    const filteredEvents = useMemo(() => {
        let filtered = events;

        if (selectedDivision !== 'all') {
            filtered = filtered.filter(
                (e) => e.divisions.length === 0 || e.divisions.includes(selectedDivision)
            );
        }

        if (hasDivisionRestriction && divisionFilter) {
            filtered = filtered.filter(
                (e) => e.divisions.length === 0 || e.divisions.some((d) => divisionFilter.includes(d))
            );
        }

        return filtered;
    }, [events, selectedDivision, hasDivisionRestriction, divisionFilter]);

    const getDivisionNames = (divisionIds: string[]) => {
        if (divisionIds.length === 0) return 'All Divisions';
        return divisionIds.map((id) => divisions.find((d: any) => d.id === id)?.name || 'Unknown').join(', ');
    };

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

    const sourceBadgeStyle = (s: ScheduleSource) => {
        switch (s) {
            case 'sports':
                return styles.badgeSports;
            case 'activities':
                return styles.badgeActivities;
            case 'special_events':
                return styles.badgeSpecial;
            case 'master_calendar':
                return styles.badgeMaster;
            default:
                return styles.badgeMaster;
        }
    };

    const sourceBadgeTextStyle = (s: ScheduleSource) => {
        switch (s) {
            case 'sports':
                return styles.badgeTextSports;
            case 'activities':
                return styles.badgeTextActivities;
            case 'special_events':
                return styles.badgeTextSpecial;
            case 'master_calendar':
                return styles.badgeTextMaster;
            default:
                return styles.badgeTextMaster;
        }
    };

    const navigateDate = (dir: 'prev' | 'next') => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + (dir === 'next' ? 1 : -1));
        setSelectedDate(d);
    };

    const goToday = () => setSelectedDate(new Date());

    const divisionLabel =
        selectedDivision === 'all'
            ? 'All Divisions'
            : accessibleDivisions.find((d: any) => d.id === selectedDivision)?.name ?? 'Division';

    const selectedDivisionName =
        selectedDivision !== 'all'
            ? accessibleDivisions.find((d: any) => d.id === selectedDivision)?.name
            : null;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} hitSlop={12}>
                    <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.pageTitle}>Daily Schedule</Text>
                    <Text style={styles.pageSubtitle}>{"View the day's schedule by division"}</Text>
                </View>
                <MobileUserMenu navigation={navigation} />
            </View>

            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'schedule' && styles.tabActive]}
                    onPress={() => setActiveTab('schedule')}
                    activeOpacity={0.85}
                >
                    <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={activeTab === 'schedule' ? theme.colors.text : theme.colors.textSecondary}
                    />
                    <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>Schedule View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'uploads' && styles.tabActive]}
                    onPress={() => setActiveTab('uploads')}
                    activeOpacity={0.85}
                >
                    <Ionicons
                        name="document-text-outline"
                        size={18}
                        color={activeTab === 'uploads' ? theme.colors.text : theme.colors.textSecondary}
                    />
                    <Text style={[styles.tabText, activeTab === 'uploads' && styles.tabTextActive]}>Upload Schedules</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {activeTab === 'uploads' ? (
                    <DivisionScheduleUploadTab companyId={companyId} season={season} />
                ) : !companyId ? (
                    <Text style={styles.mutedCenter}>Select a camp to view the schedule.</Text>
                ) : !rosterDivisionFilter.isFetched ? (
                    <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.secondary} />
                ) : (
                    <>
                        <StyledCard style={styles.controlsCard}>
                            <View style={styles.dateNavRow}>
                                <TouchableOpacity onPress={() => navigateDate('prev')} style={styles.iconBtn}>
                                    <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.datePill} onPress={() => setShowDatePicker(true)}>
                                    <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
                                    <Text style={styles.datePillText}>{formatDatePill(selectedDate)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => navigateDate('next')} style={styles.iconBtn}>
                                    <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={goToday} style={styles.todayBtn}>
                                    <Text style={styles.todayText}>Today</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.divisionRow}>
                                <Ionicons name="funnel-outline" size={18} color={theme.colors.textSecondary} />
                                <TouchableOpacity style={styles.divisionSelect} onPress={() => setShowDivisionModal(true)}>
                                    <Text style={styles.divisionSelectText} numberOfLines={1}>
                                        {divisionLabel}
                                    </Text>
                                    <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </StyledCard>

                        <StyledCard style={styles.scheduleCard}>
                            <View style={styles.scheduleCardHeader}>
                                <View style={styles.scheduleTitleRow}>
                                    <Ionicons name="calendar-outline" size={22} color={theme.colors.text} />
                                    <Text style={styles.scheduleCardTitle}>Schedule for {formatScheduleHeader(selectedDate)}</Text>
                                </View>
                                <Text style={styles.scheduleCardMeta}>
                                    {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} scheduled
                                    {selectedDivisionName ? ` for ${selectedDivisionName}` : ''}
                                </Text>
                            </View>

                            {eventsLoading ? (
                                <View style={styles.loadingBox}>
                                    <ActivityIndicator size="large" color={theme.colors.textSecondary} />
                                </View>
                            ) : filteredEvents.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="calendar-outline" size={56} color={theme.colors.border} />
                                    <Text style={styles.emptyTitle}>No events scheduled</Text>
                                    <Text style={styles.emptySub}>There are no events for this date and division.</Text>
                                </View>
                            ) : (
                                <View style={styles.eventList}>
                                    {filteredEvents.map((e, index) => (
                                        <View
                                            key={`${e.source}-${e.id}`}
                                            style={[styles.eventRow, index > 0 && styles.eventRowBorder]}
                                        >
                                            <View style={styles.eventColTime}>
                                                {e.time ? (
                                                    <View style={styles.timeRow}>
                                                        <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                                                        <Text style={styles.timeText}>{e.time}</Text>
                                                    </View>
                                                ) : (
                                                    <Text style={styles.allDay}>All day</Text>
                                                )}
                                            </View>
                                            <View style={styles.eventColMain}>
                                                <Text style={styles.eventTitle}>{e.title}</Text>
                                                {e.description ? (
                                                    <Text style={styles.eventDesc} numberOfLines={2}>
                                                        {e.description}
                                                    </Text>
                                                ) : null}
                                                <View style={styles.eventMetaRow}>
                                                    <View style={[styles.typeBadge, styles.typeBadgeOutline]}>
                                                        <Text style={styles.typeBadgeOutlineText}>{e.type}</Text>
                                                    </View>
                                                    {e.location ? (
                                                        <View style={styles.locRow}>
                                                            <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
                                                            <Text style={styles.locText}>{e.location}</Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                                <View style={styles.divRow}>
                                                    <Ionicons name="people-outline" size={14} color={theme.colors.textSecondary} />
                                                    <Text style={styles.divText}>{getDivisionNames(e.divisions)}</Text>
                                                </View>
                                                <View style={[styles.sourceBadge, sourceBadgeStyle(e.source)]}>
                                                    <Text style={[styles.sourceBadgeText, sourceBadgeTextStyle(e.source)]}>
                                                        {sourceLabel(e.source)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </StyledCard>
                    </>
                )}
            </ScrollView>


            <Modal
                visible={showDivisionModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDivisionModal(false)}
            >
                <Pressable style={styles.divisionSheetOverlay} onPress={() => setShowDivisionModal(false)}>
                    <Pressable style={styles.divisionSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.divisionSheetHeader}>
                            <Text style={styles.divisionSheetTitle}>Select Division</Text>
                            <TouchableOpacity onPress={() => setShowDivisionModal(false)} hitSlop={12}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            style={styles.divisionSheetScroll}
                            nestedScrollEnabled
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {!hasDivisionRestriction && (
                                <TouchableOpacity
                                    style={[
                                        styles.divisionOption,
                                        selectedDivision === 'all' && styles.divisionOptionActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedDivision('all');
                                        setShowDivisionModal(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.divisionOptionText,
                                            selectedDivision === 'all' && styles.divisionOptionTextActive,
                                        ]}
                                    >
                                        All Divisions
                                    </Text>
                                    {selectedDivision === 'all' ? (
                                        <Ionicons name="checkmark-circle" size={22} color={theme.colors.secondary} />
                                    ) : null}
                                </TouchableOpacity>
                            )}
                            {accessibleDivisions.map((d: any) => {
                                const selected = selectedDivision === d.id;
                                return (
                                    <TouchableOpacity
                                        key={d.id}
                                        style={[styles.divisionOption, selected && styles.divisionOptionActive]}
                                        onPress={() => {
                                            setSelectedDivision(d.id);
                                            setShowDivisionModal(false);
                                        }}
                                    >
                                        <Text
                                            style={[styles.divisionOptionText, selected && styles.divisionOptionTextActive]}
                                        >
                                            {formatDivisionPickerLine(d)}
                                        </Text>
                                        {selected ? (
                                            <Ionicons name="checkmark-circle" size={22} color={theme.colors.secondary} />
                                        ) : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {showDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={(ev, d) => {
                        setShowDatePicker(false);
                        if (ev.type === 'dismissed') return;
                        if (d) setSelectedDate(d);
                    }}
                />
            )}
            {showDatePicker && Platform.OS === 'ios' && (
                <Modal transparent visible={showDatePicker} animationType="slide">
                    <View style={styles.iosPickerWrap}>
                        <Pressable style={{ flex: 1 }} onPress={() => setShowDatePicker(false)} />
                        <View style={styles.iosPickerInner}>
                            <DateTimePicker
                                value={selectedDate}
                                mode="date"
                                display="spinner"
                                themeVariant="light"
                                onChange={(_, d) => d && setSelectedDate(d)}
                            />
                            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDatePicker(false)}>
                                <Text style={styles.doneBtnText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        gap: 8,
    },
    headerCenter: { flex: 1, minWidth: 0 },
    pageTitle: { fontSize: 26, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
    tabRow: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.md,
        gap: 10,
        marginBottom: theme.spacing.md,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: '#e5e7eb',
    },
    tabActive: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    tabText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
    tabTextActive: { color: theme.colors.text },
    scroll: { paddingHorizontal: theme.spacing.md, paddingBottom: 100 },
    controlsCard: {
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    dateNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    datePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        minWidth: 160,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    datePillText: { fontSize: 14, fontWeight: '500', color: theme.colors.text, flex: 1 },
    todayBtn: { paddingVertical: 8, paddingHorizontal: 10 },
    todayText: { fontSize: 15, fontWeight: '600', color: theme.colors.secondary },
    divisionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: theme.spacing.md,
    },
    divisionSelect: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: theme.colors.surface,
    },
    divisionSelectText: { fontSize: 14, color: theme.colors.text, flex: 1, marginRight: 8 },
    scheduleCard: { padding: 0, overflow: 'hidden' },
    scheduleCardHeader: {
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    scheduleTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    scheduleCardTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: theme.colors.text, lineHeight: 24 },
    scheduleCardMeta: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 8 },
    loadingBox: { paddingVertical: 48, alignItems: 'center' },
    emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: theme.spacing.md },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: theme.colors.text, marginTop: 12 },
    emptySub: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 6, textAlign: 'center' },
    eventList: { padding: theme.spacing.md, gap: 0 },
    eventRow: {
        flexDirection: 'row',
        paddingTop: 14,
        paddingBottom: 14,
        gap: 12,
    },
    eventRowBorder: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    eventColTime: { width: 88 },
    eventColMain: { flex: 1, minWidth: 0 },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    timeText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
    allDay: { fontSize: 13, color: theme.colors.textSecondary },
    eventTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    eventDesc: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
    eventMetaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    typeBadgeOutline: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    typeBadgeOutlineText: { fontSize: 12, color: theme.colors.text },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    locText: { fontSize: 12, color: theme.colors.textSecondary, flex: 1 },
    divRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    divText: { fontSize: 12, color: theme.colors.textSecondary, flex: 1 },
    sourceBadge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    sourceBadgeText: { fontSize: 11, fontWeight: '700' },
    badgeSports: { backgroundColor: '#dcfce7' },
    badgeActivities: { backgroundColor: '#dbeafe' },
    badgeSpecial: { backgroundColor: '#f3e8ff' },
    badgeMaster: { backgroundColor: '#ffedd5' },
    badgeTextSports: { color: '#166534' },
    badgeTextActivities: { color: '#1e40af' },
    badgeTextSpecial: { color: '#6b21a8' },
    badgeTextMaster: { color: '#9a3412' },
    mutedCenter: { textAlign: 'center', marginTop: 32, color: theme.colors.textSecondary, fontSize: 15 },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 28,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    fabTimberLake: { backgroundColor: '#286422' },
    divisionSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    divisionSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '65%',
        paddingBottom: theme.spacing.xl,
    },
    divisionSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    divisionSheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    divisionSheetScroll: {
        maxHeight: 420,
    },
    divisionOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    divisionOptionActive: {
        backgroundColor: theme.colors.background,
    },
    divisionOptionText: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.text,
        paddingRight: 8,
    },
    divisionOptionTextActive: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    iosPickerWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    iosPickerInner: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        paddingBottom: 16,
    },
    doneBtn: { paddingVertical: 14, alignItems: 'center' },
    doneBtnText: { fontWeight: '600', fontSize: 16, color: theme.colors.secondary },
});
