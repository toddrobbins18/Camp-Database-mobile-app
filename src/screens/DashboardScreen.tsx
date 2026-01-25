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
                        <Ionicons name="document-text-outline" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Title Section */}
                <View style={styles.titleSection}>
                    <Text style={styles.title}>Dashboard</Text>
                    <Text style={styles.welcomeText}>Welcome back! Here's what's happening today.</Text>
                </View>

                {/* Weather Widget */}
                <StyledCard style={styles.widgetCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="cloud-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.cardTitle}>Weather</Text>
                    </View>
                    <View style={styles.weatherPlaceholders}>
                        <View style={styles.weatherPlaceholder} />
                        <View style={styles.weatherPlaceholder} />
                    </View>
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
                            <Text style={styles.menuLabel}>BREAKFAST</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem}>
                            <View style={styles.menuItemWithDot}>
                                <Text style={styles.menuLabel}>LUNCH</Text>
                                <View style={styles.blueDot} />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem}>
                            <Text style={styles.menuLabel}>SNACK</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem}>
                            <Text style={styles.menuLabel}>DINNER</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.viewMenuBtn}>
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
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No sports events today</Text>
                    </View>
                    <TouchableOpacity style={styles.outlineBtn}>
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
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No special events today</Text>
                    </View>
                    <TouchableOpacity style={styles.outlineBtn}>
                        <Text style={styles.outlineBtnText}>View All Events</Text>
                    </TouchableOpacity>
                </StyledCard>

                {/* Today's Birthdays */}
                <StyledCard style={styles.widgetCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="gift-outline" size={20} color="#10b981" />
                        <Text style={styles.cardTitle}>Today's Birthdays</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>Celebrate with them!</Text>
                    <View style={styles.birthdaysList}>
                        <View style={[styles.birthdayItem, styles.birthdayItemGreen]}>
                            <Ionicons name="cake" size={16} color="#10b981" />
                            <View style={styles.birthdayContent}>
                                <Text style={styles.birthdayName}>Spencer Weinberg</Text>
                                <Text style={styles.birthdayDesc}>Turning 12 today! 🎉</Text>
                            </View>
                        </View>
                        <View style={[styles.birthdayItem, styles.birthdayItemBlue]}>
                            <Ionicons name="cake" size={16} color={theme.colors.secondary} />
                            <View style={styles.birthdayContent}>
                                <Text style={styles.birthdayName}>George Talbot</Text>
                                <Text style={styles.birthdayDesc}>Staff Member 🎂</Text>
                            </View>
                        </View>
                        <View style={[styles.birthdayItem, styles.birthdayItemBlue]}>
                            <Ionicons name="cake" size={16} color={theme.colors.secondary} />
                            <View style={styles.birthdayContent}>
                                <Text style={styles.birthdayName}>Logan Rosenberg</Text>
                                <Text style={styles.birthdayDesc}>Staff Member 🎉</Text>
                            </View>
                        </View>
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
