import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { useTodayBirthdays, useTodayEvents, useTodayMeals } from '../api/dashboard';
import { supabase } from '../lib/supabase';

const DEFAULT_WEATHER_ZIP = '18469';

function weatherIconName(condition: string | undefined): keyof typeof Ionicons.glyphMap {
    const c = (condition ?? '').toLowerCase();
    if (c.includes('clear') || c.includes('sunny')) return 'sunny-outline';
    if (c.includes('snow')) return 'snow-outline';
    if (c.includes('rain') || c.includes('drizzle')) return 'rainy-outline';
    if (c.includes('cloud') || c.includes('overcast')) return 'cloudy-outline';
    return 'partly-sunny-outline';
}

export const DashboardScreen = ({ navigation }: any) => {
    const { companyId } = useCompany();
    const currentDate = new Date();
    const todayString = currentDate.toISOString().split('T')[0];
    const todayMonth = currentDate.getMonth() + 1;
    const todayDay = currentDate.getDate();

    const { data: companyZip } = useQuery({
        queryKey: ['companyZip', companyId],
        queryFn: async () => {
            if (!companyId) return null;
            const { data } = await supabase.from('companies').select('zip_code').eq('id', companyId).single();
            return (data?.zip_code && String(data.zip_code).trim()) || null;
        },
        enabled: !!companyId,
    });

    const { data: birthdays = [] } = useTodayBirthdays(companyId, todayMonth, todayDay);
    const { data: todayEvents = [] } = useTodayEvents(companyId, todayString);
    const { data: meals = null } = useTodayMeals(companyId, todayString);

    const athleticsEvents = todayEvents.filter((e: any) => {
        const str = `${e.title} ${e.description}`.toLowerCase();
        return str.includes('sport') || str.includes('game') || str.includes('tournament') || str.includes('league') || str.includes('athletic');
    });

    const specialEvents = todayEvents.filter((e: any) => !athleticsEvents.includes(e));

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
                if (data?.today && data?.tomorrow) setWeather(data);
                else setWeather(null);
            } catch (err) {
                if (!cancelled) setWeather(null);
                console.warn('Weather fetch failed:', err);
            } finally {
                if (!cancelled) setWeatherLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [companyZip]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <View style={styles.centerDot} />
                    </View>

                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Title Section */}
                <View style={styles.titleSection}>
                    <Text style={styles.title}>Dashboard</Text>
                    <Text style={styles.welcomeText}>Welcome back! Here's what's happening today.</Text>
                </View>

                {/* Quick Menu Grid */}
                <View style={styles.quickMenuGrid}>
                    {[
                        { label: 'Camper', icon: 'people-outline', route: 'Camper' },
                        { label: 'Staff', icon: 'person-outline', route: 'Staff' },
                        { label: 'Calendar', icon: 'calendar-outline', route: 'Calendar' },
                        { label: 'Health', icon: 'medical-outline', route: 'Health' },
                        { label: 'Sports', icon: 'trophy-outline', route: 'Sports' },
                        { label: 'Events', icon: 'star-outline', route: 'SpecialEvents' },
                        { label: 'Menu', icon: 'restaurant-outline', route: 'Menu' },
                        { label: 'Transport', icon: 'car-outline', route: 'Transport' },
                        { label: 'Messages', icon: 'mail-outline', route: 'Messages' },
                        { label: 'Reports', icon: 'bar-chart-outline', route: 'Reports' },
                        { label: 'Admin', icon: 'shield-outline', route: 'AdminPanel' },
                        { label: 'Approvals', icon: 'checkmark-circle-outline', route: 'UserApprovals' },
                    ].map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.gridTile}
                            onPress={() => navigation.navigate(item.route)}
                        >
                            <View style={styles.tileIconContainer}>
                                <Ionicons name={item.icon as any} size={24} color={theme.colors.secondary} />
                            </View>
                            <Text style={styles.tileLabel} numberOfLines={1}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Weather Widget */}
                <StyledCard style={styles.widgetCard}>
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
                <StyledCard style={styles.widgetCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="restaurant-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.cardTitle}>Today's Menu</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>Meal schedule for today</Text>
                    <View style={styles.menuGrid}>
                        <TouchableOpacity style={styles.menuItem}>
                            <Text style={styles.menuLabel}>BREAKFAST: {meals?.breakfast || 'TBD'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem}>
                            <View style={styles.menuItemWithDot}>
                                <Text style={styles.menuLabel}>LUNCH: {meals?.lunch || 'TBD'}</Text>
                                <View style={styles.blueDot} />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem}>
                            <Text style={styles.menuLabel}>SNACK: {meals?.snack || 'TBD'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem}>
                            <Text style={styles.menuLabel}>DINNER: {meals?.dinner || 'TBD'}</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={styles.viewMenuBtn}
                        onPress={() => navigation.navigate('Menu')}
                    >
                        <Text style={styles.viewMenuText}>View Full Menu</Text>
                    </TouchableOpacity>
                </StyledCard>

                {/* Athletics Schedule */}
                <StyledCard style={styles.widgetCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="trophy-outline" size={20} color="#fbbf24" />
                        <Text style={styles.cardTitle}>Athletics Schedule</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>Today & upcoming events</Text>
                    {athleticsEvents.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No sports events today</Text>
                        </View>
                    ) : (
                        athleticsEvents.map((evt: any) => (
                            <View key={evt.id} style={{ marginBottom: 8 }}>
                                <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{evt.title}</Text>
                                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{evt.time || 'TBD'} • {evt.location || 'TBD'}</Text>
                            </View>
                        ))
                    )}
                    <TouchableOpacity
                        style={styles.outlineBtn}
                        onPress={() => navigation.navigate('SportsCalendar')}
                    >
                        <Text style={styles.outlineBtnText}>View Full Schedule</Text>
                    </TouchableOpacity>
                </StyledCard>

                {/* Special Events & Activities */}
                <StyledCard style={styles.widgetCard}>
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
                                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{evt.time || 'TBD'} • {evt.location || 'TBD'}</Text>
                            </View>
                        ))
                    )}
                    <TouchableOpacity
                        style={styles.outlineBtn}
                        onPress={() => navigation.navigate('SpecialEvents')}
                    >
                        <Text style={styles.outlineBtnText}>View All Events</Text>
                    </TouchableOpacity>
                </StyledCard>

                {/* Today's Birthdays — matches original app: list in their section with Celebrate with them! */}
                <StyledCard style={styles.widgetCard}>
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
                                <View key={`${person.id}-${index}`} style={[styles.birthdayItem, person.type === 'child' ? styles.birthdayItemGreen : styles.birthdayItemBlue]}>
                                    <Ionicons name="gift-outline" size={18} color={person.type === 'child' ? '#10b981' : theme.colors.secondary} />
                                    <View style={styles.birthdayContent}>
                                        <Text style={styles.birthdayName}>{person.name}</Text>
                                        <Text style={styles.birthdayDesc}>
                                            {person.type === 'child' ? `Turning ${person.age} today! 🎉` : 'Staff Member'}
                                        </Text>
                                    </View>
                                    <Ionicons name="balloon-outline" size={16} color={theme.colors.textSecondary} />
                                </View>
                            ))
                        )}
                    </View>
                </StyledCard>

            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="chatbubble-ellipses" size={20} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2563eb',
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
    welcomeText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    quickMenuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
    },
    gridTile: {
        width: '23%', // 4 columns
        aspectRatio: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    tileIconContainer: {
        marginBottom: 4,
    },
    tileLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.text,
        textAlign: 'center',
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
        backgroundColor: '#eff6ff',
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
        backgroundColor: '#f8fafc',
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
    menuItemWithDot: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    menuLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
    blueDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2563eb',
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
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
});
