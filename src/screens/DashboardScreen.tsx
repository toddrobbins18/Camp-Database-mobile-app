import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

export const DashboardScreen = ({ navigation }: any) => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Dashboard</Text>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.welcomeText}>Welcome back! Here's what's happening today.</Text>

                {/* Top Row: Weather & Menu */}
                <View style={styles.row}>
                    {/* Weather Widget */}
                    <StyledCard style={[styles.halfCard, { backgroundColor: theme.colors.weatherBg }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="partly-sunny" size={24} color={theme.colors.secondary} />
                            <Text style={styles.cardTitle}>Weather</Text>
                        </View>
                        <View style={styles.weatherContent}>
                            <Text style={styles.tempText}>9°</Text>
                            <Text style={styles.weatherDesc}>Sunny</Text>
                            <Text style={styles.weatherRange}>H: 24° L: -4°</Text>
                        </View>
                    </StyledCard>

                    {/* Menu Widget */}
                    <StyledCard style={styles.halfCard}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="restaurant" size={24} color={theme.colors.accent} />
                            <Text style={styles.cardTitle}>Today's Menu</Text>
                        </View>
                        <View style={styles.menuGrid}>
                            <View style={styles.menuItem}><Text style={styles.menuLabel}>BREAKFAST</Text></View>
                            <View style={styles.menuItem}><Text style={styles.menuLabel}>LUNCH</Text></View>
                            <View style={styles.menuItem}><Text style={styles.menuLabel}>SNACK</Text></View>
                            <View style={styles.menuItem}><Text style={styles.menuLabel}>DINNER</Text></View>
                        </View>
                        <TouchableOpacity style={styles.viewMenuBtn}>
                            <Text style={styles.viewMenuText}>View Full Menu</Text>
                        </TouchableOpacity>
                    </StyledCard>
                </View>

                {/* Athletics Schedule */}
                <StyledCard>
                    <View style={styles.cardHeader}>
                        <Ionicons name="trophy" size={24} color={theme.colors.warning} />
                        <Text style={styles.cardTitle}>Athletics Schedule</Text>
                    </View>
                    <Text style={styles.subtitle}>Today & upcoming events</Text>

                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No sports events today</Text>
                    </View>

                    <TouchableOpacity style={styles.outlineBtn}>
                        <Text style={styles.outlineBtnText}>View Full Schedule</Text>
                    </TouchableOpacity>
                </StyledCard>

                {/* Special Events */}
                <StyledCard>
                    <View style={styles.cardHeader}>
                        <Ionicons name="calendar" size={24} color={theme.colors.secondary} />
                        <Text style={styles.cardTitle}>Special Events & Activities</Text>
                    </View>
                    <Text style={styles.subtitle}>Today's schedule</Text>

                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No special events today</Text>
                    </View>

                    <TouchableOpacity style={styles.outlineBtn}>
                        <Text style={styles.outlineBtnText}>View All Events</Text>
                    </TouchableOpacity>
                </StyledCard>

                {/* Birthdays */}
                <StyledCard>
                    <View style={styles.cardHeader}>
                        <Ionicons name="gift" size={24} color={theme.colors.success} />
                        <Text style={styles.cardTitle}>Today's Birthdays</Text>
                    </View>
                    <View style={styles.birthdayRow}>
                        <View style={styles.birthdayIcon}>
                            <Ionicons name="happy" size={20} color={theme.colors.success} />
                        </View>
                        <View>
                            <Text style={styles.birthdayName}>Dylan Scavo</Text>
                            <Text style={styles.birthdayDesc}>Turning 9 today! 🎂</Text>
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
    scrollContent: {
        padding: theme.spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    headerTitle: {
        ...theme.typography.h2,
    },
    welcomeText: {
        ...theme.typography.body,
        marginBottom: theme.spacing.lg,
        color: theme.colors.textSecondary,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
    },
    halfCard: {
        width: '48%',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    cardTitle: {
        ...theme.typography.h3,
        marginLeft: theme.spacing.xs,
        fontSize: 16,
    },
    weatherContent: {
        marginTop: theme.spacing.sm,
    },
    tempText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    weatherDesc: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    weatherRange: {
        ...theme.typography.caption,
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginVertical: theme.spacing.sm,
    },
    menuItem: {
        width: '48%', // Grid layout
        backgroundColor: '#f3f4f6',
        padding: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        marginBottom: theme.spacing.xs,
        alignItems: 'center',
    },
    menuLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
    },
    viewMenuBtn: {
        marginTop: theme.spacing.sm,
        alignItems: 'center',
        paddingVertical: theme.spacing.xs,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    viewMenuText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
    subtitle: {
        ...theme.typography.caption,
        marginBottom: theme.spacing.md,
    },
    emptyState: {
        backgroundColor: '#f0f9ff', // Light blue tint
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.sm,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.secondary,
        marginBottom: theme.spacing.md,
    },
    emptyText: {
        color: theme.colors.secondary,
        fontSize: 14,
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
    birthdayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4', // Light green
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.success,
    },
    birthdayIcon: {
        marginRight: theme.spacing.sm,
    },
    birthdayName: {
        fontWeight: '600',
        color: theme.colors.text,
    },
    birthdayDesc: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    }
});
