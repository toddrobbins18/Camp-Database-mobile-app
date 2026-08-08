import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { MobileUserMenu } from '../components/MobileUserMenu';
import { TigerTimesCategoryCards } from '../components/TigerTimesCategoryCards';
import {
    useTodayBirthdays,
    useTodayEvents,
    useTodayMeals,
    useTodaySpecialMeals,
    useTodaySportsCalendar,
    useTodaySpecialEventsActivities,
    useDailyWolfContentRow,
    useUpcomingTripsForDashboard,
    useSupervisorThreeDayOutlook,
} from '../api/dashboard';
import { groupOutlookItemsByDate, outlookDayHeading } from '../lib/personScheduleOutlook';
import { useInboxUnreadCount } from '../api/messages';
import { supabase } from '../lib/supabase';
import { formatTime12Hour } from '../lib/formatTime';
import { formatDashboardSpecialEventSubtitle } from '../lib/dailyWolfPrintableUtils';
import { formatMenuMealTypeLabel } from '../api/menu';

const DEFAULT_WEATHER_ZIP = '18469';

function formatLocalDateYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function weatherIconName(condition: string | undefined): keyof typeof Ionicons.glyphMap {
    const c = (condition ?? '').toLowerCase();
    if (c.includes('clear') || c.includes('sunny')) return 'sunny-outline';
    if (c.includes('snow')) return 'snow-outline';
    if (c.includes('rain') || c.includes('drizzle')) return 'rainy-outline';
    if (c.includes('cloud') || c.includes('overcast')) return 'cloudy-outline';
    return 'partly-sunny-outline';
}

export const DashboardScreen = ({ navigation }: any) => {
    const queryClient = useQueryClient();
    const isDashboardFocused = useIsFocused();
    const { companyId, season, isTylerHill, isTimberLakeCamp, isTimberLakeWest, isDayCamp } = useCompany();
    const hasDashboardHeroBg = isTimberLakeWest || isTylerHill || isTimberLakeCamp;

    useFocusEffect(
        useCallback(() => {
            void queryClient.invalidateQueries({ queryKey: ['dashboard_events'] });
            void queryClient.invalidateQueries({ queryKey: ['daily_news_schedule'] });
            void queryClient.invalidateQueries({ queryKey: ['dashboard_birthdays'] });
            void queryClient.invalidateQueries({ queryKey: ['dashboard_special_meals'] });
        }, [queryClient]),
    );
    const currentDate = new Date();
    const todayString = formatLocalDateYmd(currentDate);
    const todayMonth = currentDate.getMonth() + 1;
    const todayDay = currentDate.getDate();

    const [dashboardUserId, setDashboardUserId] = useState<string | null>(null);
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setDashboardUserId(data.user?.id ?? null));
    }, []);

    const { data: inboxUnread = 0 } = useInboxUnreadCount(dashboardUserId);

    // Dashboard Notes (Tyler Hill)
    const [notesLoading, setNotesLoading] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [dashboardNoteId, setDashboardNoteId] = useState<string | null>(null);
    const [dashboardNotesContent, setDashboardNotesContent] = useState('');
    const [editNotesContent, setEditNotesContent] = useState('');

    const { data: companyZip } = useQuery({
        queryKey: ['companyZip', companyId],
        queryFn: async () => {
            if (!companyId) return null;
            const { data } = await supabase.from('companies').select('zip_code').eq('id', companyId).single();
            return (data?.zip_code && String(data.zip_code).trim()) || null;
        },
        enabled: !!companyId,
    });

    const { data: birthdays = [] } = useTodayBirthdays(companyId, season ?? null, todayMonth, todayDay);
    const { data: todayEvents = [] } = useTodayEvents(
        companyId,
        todayString,
        season ?? null,
        isDashboardFocused,
    );
    const { data: todayMenuItems = [] } = useTodayMeals(companyId, todayString, season ?? null);
    const { data: todaySpecialMeals = [] } = useTodaySpecialMeals(
        companyId,
        todayString,
        season ?? null,
        isTylerHill,
    );

    const { data: upcomingTrips = [] } = useUpcomingTripsForDashboard(
        companyId,
        todayString,
        season ?? null,
        isTimberLakeCamp,
    );

    const usesSportsCalendar = isTylerHill || isTimberLakeWest || isTimberLakeCamp;
    const usesSpecialEventsTable = usesSportsCalendar;

    const { data: sportsToday = [] } = useTodaySportsCalendar(
        companyId,
        todayString,
        season ?? null,
        usesSportsCalendar,
    );
    const { data: supervisorOutlook = { items: [], scopeLabel: '' } } = useSupervisorThreeDayOutlook(
        companyId,
        season ?? null,
        !!companyId,
    );
    const groupedSupervisorOutlook = useMemo(
        () => groupOutlookItemsByDate(supervisorOutlook.items),
        [supervisorOutlook.items],
    );
    const { data: specialActivitiesToday = [] } = useTodaySpecialEventsActivities(
        companyId,
        todayString,
        season ?? null,
        usesSpecialEventsTable,
    );
    const { data: dailyWolfRow } = useDailyWolfContentRow(
        companyId,
        todayString,
        season ?? null,
        isTimberLakeWest,
    );

    const athleticsEvents = useMemo(() => {
        if (usesSportsCalendar) {
            return sportsToday.map((s: any) => ({
                id: s.id,
                title: s.title,
                time: s.time,
                location: s.location,
                sport_type: s.sport_type,
            }));
        }
        return todayEvents.filter((e: any) => {
            const str = `${e.title} ${e.description}`.toLowerCase();
            return (
                str.includes('sport') ||
                str.includes('game') ||
                str.includes('tournament') ||
                str.includes('league') ||
                str.includes('athletic')
            );
        });
    }, [usesSportsCalendar, sportsToday, todayEvents]);

    const specialEvents = useMemo(() => {
        if (isTimberLakeWest) {
            return specialActivitiesToday.filter((e: any) => e.event_type !== 'evening-activity');
        }
        if (usesSpecialEventsTable) {
            return specialActivitiesToday;
        }
        const ath = todayEvents.filter((e: any) => {
            const str = `${e.title} ${e.description}`.toLowerCase();
            return (
                str.includes('sport') ||
                str.includes('game') ||
                str.includes('tournament') ||
                str.includes('league') ||
                str.includes('athletic')
            );
        });
        return todayEvents.filter((e: any) => !ath.includes(e));
    }, [isTimberLakeWest, usesSpecialEventsTable, specialActivitiesToday, todayEvents]);

    const eveningEvents = useMemo(() => {
        if (!isTimberLakeWest) return [];
        return specialActivitiesToday.filter((e: any) => e.event_type === 'evening-activity');
    }, [isTimberLakeWest, specialActivitiesToday]);

    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(id);
    }, []);

    const formattedDateLong = now.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
    const formattedTime = now.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    });

    const dashboardTitle = isTimberLakeCamp
        ? 'Tiger Times'
        : isTimberLakeWest
          ? 'The Daily Wolf'
          : isTylerHill
            ? 'The Bear'
            : 'Dashboard';

    const [weather, setWeather] = useState<any>(null);
    const [weatherLoading, setWeatherLoading] = useState(true);

    useEffect(() => {
        const zip = companyZip ?? DEFAULT_WEATHER_ZIP;
        let cancelled = false;
        setWeatherLoading(true);
        (async () => {
            try {
                const { data, error } = await supabase.functions.invoke('get-weather', {
                    body: { zipCode: zip },
                });
                if (cancelled) return;
                if (error) throw error;
                if (data?.error) {
                    setWeather(null);
                    return;
                }
                // Accept when we have at least today; tomorrow may be missing from API
                if (data?.today) {
                    setWeather({
                        today: data.today,
                        tomorrow: data.tomorrow ?? {
                            high: data.today.high,
                            low: data.today.low,
                            condition: '—',
                        },
                        location: data.location,
                    });
                } else {
                    setWeather(null);
                }
            } catch (err) {
                if (!cancelled) setWeather(null);
                console.warn('Weather fetch failed:', err);
            } finally {
                if (!cancelled) setWeatherLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [companyZip]);

    useEffect(() => {
        let cancelled = false;

        const fetchNotes = async () => {
            if (!companyId || !season || !isTylerHill) {
                setNotesLoading(false);
                return;
            }

            setNotesLoading(true);
            try {
                const { data: authData } = await supabase.auth.getUser();
                const userId = authData?.user?.id ?? null;

                const { data, error } = await supabase
                    .from('kanban_notes')
                    .select('id, content, title, column_status, created_at')
                    .eq('company_id', companyId)
                    .eq('season', season)
                    .eq('column_status', 'todo')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (cancelled) return;

                if (error) throw error;

                if (data) {
                    setDashboardNoteId(data.id);
                    setDashboardNotesContent(data.content || data.title || '');
                    setEditNotesContent(data.content || data.title || '');
                } else {
                    setDashboardNoteId(null);
                    setDashboardNotesContent('');
                    setEditNotesContent('');
                }
            } catch (e) {
                if (!cancelled) {
                    setDashboardNoteId(null);
                    setDashboardNotesContent('');
                    setEditNotesContent('');
                }
            } finally {
                if (!cancelled) setNotesLoading(false);
            }
        };

        fetchNotes();
        return () => {
            cancelled = true;
        };
    }, [companyId, season, isTylerHill]);

    const handleSaveNotes = async () => {
        if (!companyId || !season) return;
        setNotesLoading(true);
        try {
            const { data: authData } = await supabase.auth.getUser();
            const userId = authData?.user?.id ?? null;
            const content = (editNotesContent ?? '').trim();

            if (!content) {
                // Allow clearing note content (update existing or no-op)
            }

            if (dashboardNoteId) {
                const { error } = await supabase
                    .from('kanban_notes')
                    .update({ title: 'Dashboard Notes', content })
                    .eq('id', dashboardNoteId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('kanban_notes')
                    .insert({
                        title: 'Dashboard Notes',
                        content,
                        column_status: 'todo',
                        company_id: companyId,
                        season,
                        created_by: userId,
                        sort_order: 0,
                    });
                if (error) throw error;
            }

            setDashboardNotesContent(content);
            setIsEditingNotes(false);
        } catch (e) {
            // ignore; keep edit view
        } finally {
            setNotesLoading(false);
        }
    };

    const ink = hasDashboardHeroBg ? '#ffffff' : theme.colors.text;

    const scrollInner = (
        <>
            <ScrollView contentContainerStyle={[styles.scrollContent, hasDashboardHeroBg && styles.scrollOnHero]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu-outline" size={28} color={ink} />
                    </TouchableOpacity>

                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Messages')}
                            style={styles.headerBellWrap}
                            accessibilityLabel={
                                inboxUnread > 0
                                    ? `Messages, ${inboxUnread} unread notifications`
                                    : 'Messages'
                            }
                        >
                            <View style={[styles.headerIconBtn, styles.headerBellInner]}>
                                <Ionicons name="notifications-outline" size={26} color={ink} />
                            </View>
                            {inboxUnread > 0 && (
                                <View style={styles.headerBellBadge} accessibilityLabel={`${inboxUnread} unread`}>
                                    <Text style={styles.headerBellBadgeText}>
                                        {inboxUnread > 99 ? '99+' : inboxUnread}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <MobileUserMenu navigation={navigation} />
                    </View>
                </View>

                {/* Title Section */}
                <View style={styles.titleSection}>
                    <Text style={[styles.title, hasDashboardHeroBg && styles.titleOnHero]}>{dashboardTitle}</Text>
                    <View style={styles.dateTimeBlock}>
                        <Text style={[styles.welcomeText, hasDashboardHeroBg && styles.welcomeOnHero]}>
                            {formattedDateLong}
                        </Text>
                        <Text style={[styles.dashboardTime, hasDashboardHeroBg && styles.welcomeOnHero]}>
                            {formattedTime}
                        </Text>
                    </View>
                </View>

                {/* Weather Widget */}
                <StyledCard style={[styles.widgetCard, hasDashboardHeroBg && styles.glassCard]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="cloud-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.cardTitle}>Weather</Text>
                    </View>
                    {weatherLoading ? (
                        <ActivityIndicator size="small" color={theme.colors.secondary} style={{ marginTop: 16 }} />
                    ) : weather ? (
                        <View style={styles.weatherContent}>
                            {/* Today */}
                            <View style={styles.weatherTodayCard}>
                                <Text style={styles.weatherTodayLabel}>TODAY</Text>
                                <View style={styles.weatherTodayRow}>
                                    <View>
                                        <Text style={styles.weatherTemp}>{weather.today.temp_f}°</Text>
                                        <Text style={styles.weatherCondition}>{weather.today.condition}</Text>
                                        <Text style={styles.weatherHighLow}>H: {weather.today.high}° L: {weather.today.low}°</Text>
                                    </View>
                                    <Ionicons
                                        name={weatherIconName(weather.today.condition)}
                                        size={40}
                                        color={theme.colors.secondary}
                                    />
                                </View>
                            </View>
                            {/* Tomorrow */}
                            <View style={styles.weatherTomorrowCard}>
                                <View style={styles.weatherTomorrowRow}>
                                    <View>
                                        <Text style={styles.weatherTomorrowLabel}>TOMORROW</Text>
                                        <Text style={styles.weatherTomorrowCondition}>{weather.tomorrow.condition}</Text>
                                    </View>
                                    <Ionicons
                                        name={weatherIconName(weather.tomorrow.condition)}
                                        size={28}
                                        color={theme.colors.textSecondary}
                                    />
                                </View>
                                <Text style={styles.weatherHighLow}>H: {weather.tomorrow.high}° L: {weather.tomorrow.low}°</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.weatherPlaceholders}>
                            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', padding: 16 }}>Weather data unavailable</Text>
                        </View>
                    )}
                </StyledCard>

                {/* Today's Menu Widget */}
                <StyledCard style={[styles.widgetCard, hasDashboardHeroBg && styles.glassCard]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="restaurant-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.cardTitle}>Today's Menu</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>Meal schedule for today</Text>
                    <View style={styles.menuGrid}>
                        {todayMenuItems.length === 0 ? (
                            <Text style={styles.menuEmptyText}>No meals scheduled for today</Text>
                        ) : (
                            todayMenuItems.map((item) => (
                                <View key={item.id} style={styles.menuItem}>
                                    <Text style={styles.menuMealType}>
                                        {formatMenuMealTypeLabel(item.meal_type)}
                                    </Text>
                                    {item.items?.trim() ? (
                                        <Text style={styles.menuMealValue}>{item.items.trim()}</Text>
                                    ) : null}
                                    {item.allergens?.trim() ? (
                                        <Text style={styles.menuAllergenValue}>Allergens: {item.allergens.trim()}</Text>
                                    ) : null}
                                </View>
                            ))
                        )}
                    </View>
                    <TouchableOpacity
                        style={[styles.viewMenuBtn, hasDashboardHeroBg && styles.glassOutlineBtn]}
                        onPress={() => navigation.navigate('Menu')}
                    >
                        <Text style={[styles.viewMenuText, hasDashboardHeroBg && styles.outlineBtnTextOnHero]}>
                            View Full Menu
                        </Text>
                    </TouchableOpacity>
                </StyledCard>

                {isTylerHill && (
                    <StyledCard style={[styles.widgetCard, hasDashboardHeroBg && styles.glassCard]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="restaurant" size={20} color="#d97706" />
                            <Text style={styles.cardTitle}>Special Meals</Text>
                        </View>
                        <Text style={styles.cardSubtitle}>Special dietary events for today</Text>
                        <View style={styles.menuGrid}>
                            {todaySpecialMeals.length === 0 ? (
                                <Text style={styles.menuEmptyText}>No special meals scheduled for today</Text>
                            ) : (
                                todaySpecialMeals.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.specialMealItem}
                                        onPress={() => navigation.navigate('SpecialMeals')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.specialMealType}>
                                            {formatMenuMealTypeLabel(item.meal_type)}
                                        </Text>
                                        {item.items?.trim() ? (
                                            <Text style={styles.menuMealValue}>{item.items.trim()}</Text>
                                        ) : null}
                                        {item.allergens?.trim() ? (
                                            <Text style={styles.menuAllergenValue}>
                                                Allergens: {item.allergens.trim()}
                                            </Text>
                                        ) : null}
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                        <TouchableOpacity
                            style={[styles.viewMenuBtn, hasDashboardHeroBg && styles.glassOutlineBtn]}
                            onPress={() => navigation.navigate('SpecialMeals')}
                        >
                            <Text style={[styles.viewMenuText, hasDashboardHeroBg && styles.outlineBtnTextOnHero]}>
                                View Schedule
                            </Text>
                        </TouchableOpacity>
                    </StyledCard>
                )}

                {/* Timber Lake Camp: activities & field trips + upcoming trips */}
                {isTimberLakeCamp && (
                    <>
                        <StyledCard style={[styles.widgetCard, hasDashboardHeroBg && styles.glassCard]}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="leaf-outline" size={20} color="#059669" />
                                <Text style={styles.cardTitle}>Activities & Field Trips</Text>
                            </View>
                            <Text style={styles.cardSubtitle}>Scheduled for today</Text>
                            {todayEvents.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>No activities or field trips today</Text>
                                </View>
                            ) : (
                                todayEvents.map((evt: any) => (
                                    <View key={evt.id} style={{ marginBottom: 8 }}>
                                        <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{evt.title}</Text>
                                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                                            {(formatTime12Hour(evt.time) || evt.time || 'Time TBD') +
                                                (evt.location ? ` · ${evt.location}` : '')}
                                        </Text>
                                    </View>
                                ))
                            )}
                            <TouchableOpacity
                                style={[styles.outlineBtn, hasDashboardHeroBg && styles.glassOutlineBtn]}
                                onPress={() => navigation.navigate('ActivitiesFieldTrips')}
                            >
                                <Text style={[styles.outlineBtnText, hasDashboardHeroBg && styles.outlineBtnTextOnHero]}>
                                    View Activities & Field Trips
                                </Text>
                            </TouchableOpacity>
                        </StyledCard>

                        <StyledCard style={[styles.widgetCard, hasDashboardHeroBg && styles.glassCard]}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="bus-outline" size={20} color="#0284c7" />
                                <Text style={styles.cardTitle}>Upcoming Trips</Text>
                            </View>
                            <Text style={styles.cardSubtitle}>Next 3 days</Text>
                            {upcomingTrips.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>No upcoming trips</Text>
                                </View>
                            ) : (
                                upcomingTrips.map((trip: any) => (
                                    <View key={trip.id} style={{ marginBottom: 8 }}>
                                        <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{trip.name}</Text>
                                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                                            {[
                                                trip.date
                                                    ? new Date(trip.date + 'T12:00:00').toLocaleDateString(undefined, {
                                                          month: 'short',
                                                          day: 'numeric',
                                                      })
                                                    : '',
                                                trip.departure_time
                                                    ? formatTime12Hour(trip.departure_time)
                                                    : '',
                                                trip.type || '',
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </Text>
                                    </View>
                                ))
                            )}
                            <TouchableOpacity
                                style={[styles.outlineBtn, hasDashboardHeroBg && styles.glassOutlineBtn]}
                                onPress={() => navigation.navigate('Transport')}
                            >
                                <Text style={[styles.outlineBtnText, hasDashboardHeroBg && styles.outlineBtnTextOnHero]}>
                                    View Transportation
                                </Text>
                            </TouchableOpacity>
                        </StyledCard>
                    </>
                )}

                {isTimberLakeWest && (
                    <StyledCard style={[styles.widgetCard, hasDashboardHeroBg && styles.glassCard]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="moon-outline" size={20} color="#a855f7" />
                            <Text style={styles.cardTitle}>Evening Activities</Text>
                        </View>
                        <Text style={styles.cardSubtitle}>Tonight's schedule</Text>
                        {eveningEvents.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No evening activities tonight</Text>
                            </View>
                        ) : (
                            eveningEvents.map((evt: any) => (
                                <View key={evt.id} style={{ marginBottom: 8 }}>
                                    <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{evt.title}</Text>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                                        {formatDashboardSpecialEventSubtitle(evt)}
                                        {evt.location ? ` • ${evt.location}` : ''}
                                    </Text>
                                </View>
                            ))
                        )}
                        <TouchableOpacity
                            style={[styles.outlineBtn, hasDashboardHeroBg && styles.glassOutlineBtn]}
                            onPress={() => navigation.navigate('SpecialEvents')}
                        >
                            <Text style={[styles.outlineBtnText, hasDashboardHeroBg && styles.outlineBtnTextOnHero]}>
                                View All Events
                            </Text>
                        </TouchableOpacity>
                    </StyledCard>
                )}

                {isTimberLakeWest && (
                    <StyledCard style={[styles.widgetCard, hasDashboardHeroBg && styles.glassCard]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="calendar-outline" size={20} color={theme.colors.secondary} />
                            <Text style={styles.cardTitle}>Special Events</Text>
                        </View>
                        <Text style={styles.cardSubtitle}>Today's schedule</Text>
                        {specialEvents.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No special events today</Text>
                            </View>
                        ) : (
                            specialEvents.map((evt: any) => (
                                <View key={evt.id} style={{ marginBottom: 8 }}>
                                    <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{evt.title}</Text>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                                        {formatDashboardSpecialEventSubtitle(evt)}
                                        {evt.location ? ` • ${evt.location}` : ''}
                                    </Text>
                                </View>
                            ))
                        )}
                        <TouchableOpacity
                            style={[styles.outlineBtn, hasDashboardHeroBg && styles.glassOutlineBtn]}
                            onPress={() => navigation.navigate('SpecialEvents')}
                        >
                            <Text style={[styles.outlineBtnText, hasDashboardHeroBg && styles.outlineBtnTextOnHero]}>
                                View All Events
                            </Text>
                        </TouchableOpacity>
                    </StyledCard>
                )}

                {/* Athletics Schedule — overnight camps only (matches web Dashboard) */}
                {!isDayCamp && (
                <StyledCard style={[styles.widgetCard, hasDashboardHeroBg && styles.glassCard]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="trophy-outline" size={20} color="#fbbf24" />
                        <Text style={styles.cardTitle}>Athletics Schedule</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>Today&apos;s schedule</Text>
                    {athleticsEvents.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No sports events today</Text>
                        </View>
                    ) : (
                        <>
                            {isTylerHill && athleticsEvents.length > 0 && (
                                <Text style={styles.athleticsSectionLabel}>Today</Text>
                            )}
                            {athleticsEvents.map((evt: any) => (
                                <View key={evt.id} style={{ marginBottom: 8 }}>
                                    <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{evt.title}</Text>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                                        {formatTime12Hour(evt.start_time_field || evt.time || evt.depart_time) || evt.start_time_field || evt.time || evt.depart_time || 'TBD'}
                                        {evt.location ? ` • ${evt.location}` : ''}
                                        {evt.sport_type ? ` • ${evt.sport_type}` : ''}
                                    </Text>
                                </View>
                            ))}
                        </>
                    )}
                    <TouchableOpacity
                        style={[styles.outlineBtn, hasDashboardHeroBg && styles.glassOutlineBtn]}
                        onPress={() => navigation.navigate('SportsCalendar')}
                    >
                        <Text style={[styles.outlineBtnText, hasDashboardHeroBg && styles.outlineBtnTextOnHero]}>
                            View Full Schedule
                        </Text>
                    </TouchableOpacity>
                </StyledCard>
                )}

                <StyledCard style={[styles.widgetCard, hasDashboardHeroBg && styles.glassCard]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="calendar" size={20} color={theme.colors.primary} />
                        <Text style={styles.cardTitle}>Three Day Outlook</Text>
                    </View>
                    {supervisorOutlook.scopeLabel ? (
                        <Text style={styles.cardSubtitle}>{supervisorOutlook.scopeLabel}</Text>
                    ) : null}
                    {supervisorOutlook.items.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Nothing scheduled in the next 3 days.</Text>
                        </View>
                    ) : (
                        <View style={styles.outlookContent}>
                            {groupedSupervisorOutlook.map((dayItems) => {
                                const dateKey = dayItems[0]?.date;
                                if (!dateKey) return null;
                                return (
                                    <View key={dateKey} style={{ marginBottom: 10 }}>
                                        <Text style={styles.athleticsSectionLabel}>{outlookDayHeading(dateKey)}</Text>
                                        {dayItems.map((item) => (
                                            <View key={item.id} style={styles.outlookRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.outlookRowTitle} numberOfLines={1}>
                                                        {item.title}
                                                    </Text>
                                                    <Text style={styles.outlookRowMeta} numberOfLines={1}>
                                                        {[
                                                            item.time ? formatTime12Hour(item.time) || item.time : null,
                                                            item.location,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </Text>
                                                </View>
                                                <Text style={styles.outlookKindBadge}>
                                                    {item.kind === 'trip' ? 'Trip' : item.kind === 'sport' ? 'Sport' : 'Activity'}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </StyledCard>

                {/* Today's Birthdays */}
                <StyledCard style={[styles.widgetCard, hasDashboardHeroBg && styles.glassCard]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="gift-outline" size={20} color="#10b981" />
                        <Text style={styles.cardTitle}>Today's Birthdays</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>Celebrate with them!</Text>
                    <View style={styles.birthdaysList}>
                        {birthdays.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No birthdays today</Text>
                            </View>
                        ) : (
                            birthdays.map((person: any, index: number) => (
                                <View
                                    key={`${person.id}-${index}`}
                                    style={[
                                        styles.birthdayItem,
                                        person.type === 'child' ? styles.birthdayItemGreen : styles.birthdayItemBlue,
                                    ]}
                                >
                                    <Ionicons
                                        name="gift-outline"
                                        size={18}
                                        color={person.type === 'child' ? '#10b981' : theme.colors.secondary}
                                    />
                                    <View style={styles.birthdayContent}>
                                        <Text style={styles.birthdayName}>{person.name}</Text>
                                        <Text style={styles.birthdayDesc}>
                                            {person.type === 'child'
                                                ? `Turning ${person.age} today! 🎂`
                                                : 'Staff Member 🎉'}
                                        </Text>
                                    </View>
                                    <Ionicons name="balloon-outline" size={16} color={theme.colors.textSecondary} />
                                </View>
                            ))
                        )}
                    </View>
                </StyledCard>

                {!isTimberLakeWest ? (
                    <StyledCard style={[styles.widgetCard, hasDashboardHeroBg && styles.glassCard]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="calendar-outline" size={20} color={theme.colors.secondary} />
                            <Text style={styles.cardTitle}>Special Events & Activities</Text>
                        </View>
                        <Text style={styles.cardSubtitle}>Today's schedule</Text>
                        {specialEvents.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No special events today</Text>
                            </View>
                        ) : (
                            specialEvents.map((evt: any) => (
                                <View key={evt.id} style={{ marginBottom: 8 }}>
                                    <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{evt.title}</Text>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                                        {formatDashboardSpecialEventSubtitle(evt)}
                                    </Text>
                                </View>
                            ))
                        )}
                        <TouchableOpacity
                            style={[styles.outlineBtn, hasDashboardHeroBg && styles.glassOutlineBtn]}
                            onPress={() => navigation.navigate('SpecialEvents')}
                        >
                            <Text style={[styles.outlineBtnText, hasDashboardHeroBg && styles.outlineBtnTextOnHero]}>
                                View All Events
                            </Text>
                        </TouchableOpacity>
                    </StyledCard>
                ) : null}

                {/* Notes (Tyler Hill only) */}
                {isTylerHill && (
                    <StyledCard style={[styles.widgetCard, hasDashboardHeroBg && styles.glassCard]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="document-text-outline" size={20} color={theme.colors.text} />
                            <Text style={styles.cardTitle}>Notes</Text>
                        </View>

                        {notesLoading ? (
                            <View style={styles.notesLoadingWrap}>
                                <ActivityIndicator size="small" color={theme.colors.secondary} />
                                <Text style={styles.notesLoadingText}>Loading...</Text>
                            </View>
                        ) : isEditingNotes ? (
                            <View style={styles.notesEditWrap}>
                                <TextInput
                                    style={styles.notesTextInput}
                                    value={editNotesContent}
                                    onChangeText={setEditNotesContent}
                                    placeholder="Add your notes here..."
                                    placeholderTextColor={theme.colors.textSecondary}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                                <View style={styles.notesButtonsRow}>
                                    <TouchableOpacity
                                        style={[styles.notesBtn, { backgroundColor: theme.colors.background }]}
                                        onPress={() => {
                                            setIsEditingNotes(false);
                                            setEditNotesContent(dashboardNotesContent);
                                        }}
                                    >
                                        <Text style={[styles.notesBtnText, { color: theme.colors.text }]}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.notesBtn, { backgroundColor: theme.colors.secondary }]}
                                        onPress={handleSaveNotes}
                                    >
                                        <Text style={styles.notesBtnText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.notesDisplayWrap}
                                onPress={() => {
                                    setEditNotesContent(dashboardNotesContent);
                                    setIsEditingNotes(true);
                                }}
                            >
                                {dashboardNotesContent ? (
                                    <Text style={styles.notesDisplayText} numberOfLines={4}>
                                        {dashboardNotesContent}
                                    </Text>
                                ) : (
                                    <Text style={styles.notesEmptyText}>Click to add notes...</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </StyledCard>
                )}

                {/* Tiger Times — five category cards (Timber Lake Camp only) */}
                {isTimberLakeCamp && (
                    <TigerTimesCategoryCards
                        companyId={companyId}
                        season={season}
                        todayYmd={todayString}
                    />
                )}

                {/* Daily Wolf info strip — Timber Lake West (matches web dashboard) */}
                {isTimberLakeWest && (
                    <View style={styles.wolfStrip}>
                        <View style={styles.wolfRow}>
                            <View style={[styles.wolfMiniCard, hasDashboardHeroBg && styles.glassCard]}>
                                <View style={styles.wolfMiniHeader}>
                                    <Ionicons name="person-outline" size={18} color={theme.colors.secondary} />
                                    <Text style={styles.wolfMiniTitle}>Super OD</Text>
                                </View>
                                <Text style={styles.wolfMiniBody} numberOfLines={3}>
                                    {dailyWolfRow?.officer_of_day?.trim() || 'Not set'}
                                </Text>
                            </View>
                            <View style={[styles.wolfMiniCard, hasDashboardHeroBg && styles.glassCard]}>
                                <View style={styles.wolfMiniHeader}>
                                    <Ionicons name="chatbox-ellipses-outline" size={18} color="#d97706" />
                                    <Text style={styles.wolfMiniTitle}>Starfish Quote</Text>
                                </View>
                                <Text style={styles.wolfMiniBodyItalic} numberOfLines={4}>
                                    {dailyWolfRow?.quote_of_the_day?.trim()
                                        ? `"${dailyWolfRow.quote_of_the_day.trim()}"`
                                        : 'No quote set'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.wolfRow}>
                            <View style={[styles.wolfMiniCard, hasDashboardHeroBg && styles.glassCard]}>
                                <View style={styles.wolfMiniHeader}>
                                    <Ionicons name="shirt-outline" size={18} color="#2563eb" />
                                    <Text style={styles.wolfMiniTitle}>Laundry</Text>
                                </View>
                                <Text style={styles.wolfMiniBody} numberOfLines={5}>
                                    {dailyWolfRow?.laundry_info?.trim() || 'No laundry info'}
                                </Text>
                            </View>
                            <View style={[styles.wolfMiniCard, hasDashboardHeroBg && styles.glassCard]}>
                                <View style={styles.wolfMiniHeader}>
                                    <Ionicons name="call-outline" size={18} color="#15803d" />
                                    <Text style={styles.wolfMiniTitle}>Phone Calls</Text>
                                </View>
                                <Text style={styles.wolfMiniBody} numberOfLines={5}>
                                    {dailyWolfRow?.phone_calls_info?.trim() || 'No phone call info'}
                                </Text>
                            </View>
                        </View>
                        {!!dailyWolfRow?.notes?.trim() && (
                            <View style={[styles.wolfNotesCard, hasDashboardHeroBg && styles.glassCard]}>
                                <View style={styles.wolfMiniHeader}>
                                    <Ionicons name="document-text-outline" size={18} color="#7c3aed" />
                                    <Text style={styles.wolfMiniTitle}>Daily Notes</Text>
                                </View>
                                <Text style={styles.wolfMiniBody}>{dailyWolfRow.notes.trim()}</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

        </>
    );

    return hasDashboardHeroBg ? (
        <ImageBackground
            source={
                isTylerHill
                    ? require('../../assets/image001.jpg')
                    : isTimberLakeCamp
                      ? require('../../assets/tember-camp.jpeg')
                      : require('../../assets/timber-lake-west-bg.jpeg')
            }
            style={styles.heroBg}
            resizeMode="cover"
        >
            <View style={styles.heroDim} pointerEvents="none" />
            <SafeAreaView style={styles.safeOnHero} edges={['top', 'left', 'right', 'bottom']}>
                {scrollInner}
            </SafeAreaView>
        </ImageBackground>
    ) : (
        <SafeAreaView style={styles.container}>{scrollInner}</SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    /** Aerial dashboard photos aligned with web: TLC tember-camp; TLW timber-lake-west-bg; Tyler Hill image001.jpg. */
    heroBg: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    heroDim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.42)',
    },
    safeOnHero: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollOnHero: {
        paddingBottom: 120,
    },
    glassCard: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.45)',
    },
    glassOutlineBtn: {
        backgroundColor: 'rgba(255,255,255,0.75)',
        borderColor: 'rgba(255,255,255,0.55)',
    },
    outlineBtnTextOnHero: {
        color: theme.colors.text,
    },
    titleOnHero: {
        color: '#ffffff',
    },
    welcomeOnHero: {
        color: 'rgba(255,255,255,0.88)',
    },
    wolfStrip: {
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    wolfRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        justifyContent: 'space-between',
    },
    wolfMiniCard: {
        width: '48%',
        flexGrow: 1,
        minWidth: 148,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.xs,
    },
    wolfNotesCard: {
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginTop: theme.spacing.xs,
    },
    wolfMiniHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: theme.spacing.sm,
    },
    wolfMiniTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.text,
        flex: 1,
    },
    wolfMiniBody: {
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 20,
    },
    wolfMiniBodyItalic: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        lineHeight: 20,
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerBellWrap: {
        position: 'relative',
        alignSelf: 'center',
    },
    headerBellInner: {
        width: 40,
        height: 40,
    },
    headerBellBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    headerBellBadgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '700',
    },
    titleSection: {
        marginBottom: theme.spacing.lg,
    },
    title: {
        ...theme.typography.h1,
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    dateTimeBlock: {
        gap: 2,
    },
    welcomeText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    dashboardTime: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    athleticsSectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    outlookContent: {
        gap: 4,
    },
    outlookRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: theme.colors.background,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 6,
    },
    outlookRowTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    outlookRowMeta: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    outlookKindBadge: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        overflow: 'hidden',
    },
    threeDayOutlookLabel: {
        color: '#d97706',
        marginTop: theme.spacing.sm,
    },
    widgetCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: theme.spacing.xs,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    cardSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    weatherPlaceholders: {
        marginTop: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    weatherPlaceholder: {
        height: 60,
        backgroundColor: '#f1f5f9',
        borderRadius: theme.borderRadius.md,
    },
    weatherContent: {
        marginTop: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    weatherTodayCard: {
        backgroundColor: '#f0f4ff', // light lavender/blue (match web dashboard)
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    weatherTodayLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.secondary,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    weatherTodayRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    weatherTemp: {
        fontSize: 36,
        fontWeight: '700',
        color: theme.colors.text,
    },
    weatherCondition: {
        fontSize: 14,
        color: theme.colors.secondary,
        marginTop: 2,
    },
    weatherHighLow: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    weatherTomorrowCard: {
        backgroundColor: '#f9fafb', // light gray (match web dashboard)
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    weatherTomorrowRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    weatherTomorrowLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        letterSpacing: 0.5,
    },
    weatherTomorrowCondition: {
        fontSize: 14,
        color: theme.colors.text,
        marginTop: 2,
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    menuItem: {
        width: '48%',
        backgroundColor: '#f8fafc',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    specialMealItem: {
        width: '48%',
        backgroundColor: '#fffbeb',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fcd34d',
    },
    specialMealType: {
        fontSize: 11,
        fontWeight: '700',
        color: '#b45309',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    menuLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
    menuMealType: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    menuMealValue: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.text,
        textAlign: 'center',
    },
    menuAllergenValue: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 4,
    },
    menuEmptyText: {
        width: '100%',
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        paddingVertical: theme.spacing.sm,
    },
    viewMenuBtn: {
        marginTop: theme.spacing.sm,
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    viewMenuText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    emptyState: {
        backgroundColor: '#e0f2fe',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.secondary,
        marginBottom: theme.spacing.md,
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.secondary,
    },
    outlineBtn: {
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    outlineBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    birthdaysList: {
        gap: theme.spacing.sm,
    },
    birthdayItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.sm,
    },
    birthdayItemGreen: {
        backgroundColor: '#d1fae5',
    },
    birthdayItemBlue: {
        backgroundColor: '#dbeafe',
    },
    birthdayContent: {
        flex: 1,
    },
    birthdayName: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
    },
    birthdayDesc: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },

    // Notes card styles
    notesLoadingWrap: {
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    notesLoadingText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    notesEditWrap: {
        marginTop: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    notesTextInput: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 13,
        color: theme.colors.text,
        minHeight: 96,
        textAlignVertical: 'top',
    },
    notesButtonsRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        justifyContent: 'flex-end',
    },
    notesBtn: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minWidth: 90,
        alignItems: 'center',
    },
    notesBtnText: {
        color: theme.colors.surface,
        fontSize: 13,
        fontWeight: '600',
    },
    notesDisplayWrap: {
        marginTop: theme.spacing.sm,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
    },
    notesDisplayText: {
        color: theme.colors.text,
        fontSize: 13,
    },
    notesEmptyText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontStyle: 'italic',
    },
});
