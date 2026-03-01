import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useCompany } from '../contexts/CompanyContext';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

export const DailyNewsScreen = ({ navigation }: any) => {
    const { companyId, season } = useCompany();

    const currentDate = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dayName = dayNames[currentDate.getDay()];
    const monthName = monthNames[currentDate.getMonth()];
    const day = currentDate.getDate();
    const year = currentDate.getFullYear();
    const formattedDate = `${dayName}, ${monthName} ${day}, ${year}`;
    const todayString = currentDate.toISOString().split('T')[0];
    const todayMonth = currentDate.getMonth() + 1;
    const todayDay = currentDate.getDate();

    // Fetch today's birthdays from children table
    const { data: birthdays = [] } = useQuery({
        queryKey: ['birthdays', companyId, todayMonth, todayDay],
        queryFn: async () => {
            if (!companyId) return [];
            // Get all children and filter by birthday month/day
            const { data, error } = await supabase
                .from('children')
                .select('id, first_name, last_name, date_of_birth')
                .eq('company_id', companyId);
            if (error) throw error;
            // Filter those whose birthday matches today
            return (data || []).filter((child: any) => {
                if (!child.date_of_birth) return false;
                const dob = new Date(child.date_of_birth);
                return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay;
            }).map((child: any) => `${child.first_name} ${child.last_name}`.trim());
        },
        enabled: !!companyId,
    });

    // Fetch today's schedule/events
    const { data: todayEvents = [] } = useQuery({
        queryKey: ['daily_events', companyId, todayString],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('activities_field_trips')
                .select('id, title, description, date, time, location')
                .eq('company_id', companyId)
                .eq('date', todayString)
                .order('time', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId,
    });

    // Fetch today's menu/meals
    const { data: meals = null } = useQuery({
        queryKey: ['daily_meals', companyId, todayString],
        queryFn: async () => {
            if (!companyId) return null;
            try {
                const { data, error } = await supabase
                    .from('meals')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('date', todayString)
                    .single();
                if (error) return null;
                return data;
            } catch {
                return null;
            }
        },
        enabled: !!companyId,
    });

    const handlePrint = () => {
        // TODO: Implement print functionality
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Tyler Hill Daily News</Text>
                </View>
                <TouchableOpacity
                    style={styles.printButton}
                    onPress={handlePrint}
                >
                    <Ionicons name="print-outline" size={20} color={theme.colors.text} style={styles.printIcon} />
                    {!isSmallScreen && <Text style={styles.printButtonText}>Print</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* News Content Card */}
                <StyledCard style={styles.newsCard}>
                    {/* Header Section */}
                    <View style={styles.newsHeader}>
                        <Text style={styles.newsTitle}>TYLER HILL DAILY NEWS</Text>
                        <Text style={styles.newsSubtitle}>HOME OF THE BEARS</Text>
                        <Text style={styles.newsDate}>{formattedDate}</Text>
                    </View>

                    {/* Birthday Wishes */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="gift-outline" size={20} color={theme.colors.text} style={styles.sectionIcon} />
                            <Text style={styles.sectionTitle}>Birthday Wishes</Text>
                        </View>
                        <Text style={styles.birthdayNames}>
                            {birthdays.length > 0 ? birthdays.join(', ') : 'No birthdays today'}
                        </Text>
                    </View>

                    {/* Today's Schedule */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Today's Schedule</Text>
                        {todayEvents.length === 0 ? (
                            <Text style={styles.emptyMessage}>No events scheduled for today</Text>
                        ) : (
                            todayEvents.map((event: any) => (
                                <View key={event.id} style={styles.menuItem}>
                                    <Text style={styles.menuLabel}>{event.time || '—'}</Text>
                                    <Text style={styles.menuValue}>{event.title}</Text>
                                </View>
                            ))
                        )}
                    </View>

                    {/* Today's Menu */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Today's Menu</Text>
                        <View style={styles.menuContainer}>
                            <View style={styles.menuItem}>
                                <Text style={styles.menuLabel}>Breakfast:</Text>
                                <Text style={styles.menuValue}>{meals?.breakfast || 'TBD'}</Text>
                            </View>
                            <View style={styles.menuItem}>
                                <Text style={styles.menuLabel}>Lunch:</Text>
                                <Text style={styles.menuValue}>{meals?.lunch || 'TBD'}</Text>
                            </View>
                            <View style={styles.menuItem}>
                                <Text style={styles.menuLabel}>Snack:</Text>
                                <Text style={styles.menuValue}>{meals?.snack || 'TBD'}</Text>
                            </View>
                            <View style={styles.menuItem}>
                                <Text style={styles.menuLabel}>Dinner:</Text>
                                <Text style={styles.menuValue}>{meals?.dinner || 'TBD'}</Text>
                            </View>
                        </View>
                    </View>
                </StyledCard>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        minHeight: 60,
    },
    menuButton: {
        padding: theme.spacing.xs,
    },
    headerTitleContainer: {
        flex: 1,
        marginHorizontal: theme.spacing.md,
    },
    headerTitle: {
        ...theme.typography.h1,
        fontSize: isSmallScreen ? 18 : 24,
        fontWeight: '700',
        color: theme.colors.text,
    },
    printButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minHeight: 44,
    },
    printIcon: {
        marginRight: isSmallScreen ? 0 : theme.spacing.xs,
    },
    printButtonText: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 12 : 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.md,
    },
    newsCard: {
        padding: theme.spacing.lg,
    },
    newsHeader: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        paddingBottom: theme.spacing.lg,
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.border,
    },
    newsTitle: {
        ...theme.typography.h1,
        fontSize: isSmallScreen ? 20 : 24,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
        letterSpacing: 1,
        textAlign: 'center',
    },
    newsSubtitle: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 14 : 16,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    newsDate: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 12 : 14,
        color: theme.colors.text,
        fontWeight: '500',
        textAlign: 'center',
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    sectionIcon: {
        marginRight: theme.spacing.xs,
    },
    sectionTitle: {
        ...theme.typography.h3,
        fontSize: isSmallScreen ? 16 : 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    birthdayNames: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 14 : 16,
        color: theme.colors.text,
        lineHeight: isSmallScreen ? 20 : 24,
    },
    emptyMessage: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 14 : 16,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    menuContainer: {
        gap: theme.spacing.md,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.xs,
    },
    menuLabel: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 14 : 16,
        fontWeight: '600',
        color: theme.colors.text,
        minWidth: 80,
    },
    menuValue: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 14 : 16,
        color: theme.colors.text,
        flex: 1,
    },
});

