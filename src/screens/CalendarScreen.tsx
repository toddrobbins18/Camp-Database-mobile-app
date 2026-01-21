import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

const ScreenHeader = ({ title, navigation }: { title: string, navigation: any }) => (
    <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Ionicons name="menu" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity>
            <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
    </View>
);

export const CalendarScreen = ({ navigation }: any) => {
    const [activeTab, setActiveTab] = useState('Month');

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ScreenHeader title="Master Calendar" navigation={navigation} />

                {/* View Toggles */}
                <View style={styles.toggleContainer}>
                    {['Day', 'Week', 'Month', 'Agenda'].map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.toggleBtn, activeTab === tab && styles.activeToggleBtn]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.toggleText, activeTab === tab && styles.activeToggleText]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Filters Bar */}
                <View style={styles.filterBar}>
                    <TouchableOpacity style={styles.filterBtn}>
                        <Ionicons name="filter" size={16} color={theme.colors.text} />
                        <Text style={styles.filterText}>Filter Events</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.primaryBtn}>
                        <Ionicons name="add" size={16} color="white" />
                        <Text style={styles.primaryBtnText}>Add Event</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.dateHeader}>July 2026</Text>

                {/* Calendar Grid / Event List Mockup */}
                <View style={styles.eventList}>
                    {/* Event 1 */}
                    <StyledCard style={styles.eventCard}>
                        <View style={[styles.eventTimeBox, { backgroundColor: '#fee2e2' }]}>
                            <Text style={[styles.eventTime, { color: '#ef4444' }]}>10:00</Text>
                            <Text style={[styles.eventAmPm, { color: '#ef4444' }]}>AM</Text>
                        </View>
                        <View style={styles.eventDetails}>
                            <Text style={styles.eventTitle}>Senior Girls Soccer vs. Camp Walden</Text>
                            <Text style={styles.eventLocation}>User: Field 3 • Sports Academy</Text>
                            <View style={styles.attendees}>
                                <Ionicons name="people" size={14} color={theme.colors.textSecondary} />
                                <Text style={styles.attendeeText}>24 Attending</Text>
                            </View>
                        </View>
                        <TouchableOpacity>
                            <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </StyledCard>

                    {/* Event 2 */}
                    <StyledCard style={styles.eventCard}>
                        <View style={[styles.eventTimeBox, { backgroundColor: '#e0e7ff' }]}>
                            <Text style={[styles.eventTime, { color: '#4338ca' }]}>02:30</Text>
                            <Text style={[styles.eventAmPm, { color: '#4338ca' }]}>PM</Text>
                        </View>
                        <View style={styles.eventDetails}>
                            <Text style={styles.eventTitle}>Freshmen Boys: Lake Trip</Text>
                            <Text style={styles.eventLocation}>User: Waterfront • Field Trip</Text>
                            <View style={styles.attendees}>
                                <Ionicons name="people" size={14} color={theme.colors.textSecondary} />
                                <Text style={styles.attendeeText}>18 Attending</Text>
                            </View>
                        </View>
                        <TouchableOpacity>
                            <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </StyledCard>

                    {/* Event 3 */}
                    <StyledCard style={styles.eventCard}>
                        <View style={[styles.eventTimeBox, { backgroundColor: '#dcfce7' }]}>
                            <Text style={[styles.eventTime, { color: '#15803d' }]}>07:00</Text>
                            <Text style={[styles.eventAmPm, { color: '#15803d' }]}>PM</Text>
                        </View>
                        <View style={styles.eventDetails}>
                            <Text style={styles.eventTitle}>Evening Activity: Talent Show</Text>
                            <Text style={styles.eventLocation}>User: Main Hall • Special Event</Text>
                            <View style={styles.attendees}>
                                <Ionicons name="people" size={14} color={theme.colors.textSecondary} />
                                <Text style={styles.attendeeText}>All Camp</Text>
                            </View>
                        </View>
                        <TouchableOpacity>
                            <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </StyledCard>
                </View>

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
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: 4,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: theme.borderRadius.sm,
    },
    activeToggleBtn: {
        backgroundColor: theme.colors.primary,
    },
    toggleText: {
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    activeToggleText: {
        color: 'white',
    },
    filterBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
    },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 8,
    },
    filterText: {
        fontWeight: '600',
        color: theme.colors.text,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.md,
        gap: 4,
    },
    primaryBtnText: {
        fontWeight: '600',
        color: 'white',
    },
    dateHeader: {
        ...theme.typography.h3,
        marginBottom: theme.spacing.md,
    },
    eventList: {
        gap: theme.spacing.sm,
    },
    eventCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    eventTimeBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: theme.borderRadius.sm,
        marginRight: theme.spacing.md,
        minWidth: 60,
    },
    eventTime: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    eventAmPm: {
        fontSize: 10,
        fontWeight: '600',
    },
    eventDetails: {
        flex: 1,
    },
    eventTitle: {
        fontWeight: 'bold',
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: 2,
    },
    eventLocation: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    attendees: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    attendeeText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
});
