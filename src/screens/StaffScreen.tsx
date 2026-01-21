import React from 'react';
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

export const StaffScreen = ({ navigation }: any) => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ScreenHeader title="Staff & Evaluations" navigation={navigation} />

                {/* Action Bar */}
                <View style={styles.actionBar}>
                    <Text style={styles.description}>Manage team members and performance reviews</Text>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.secondaryBtn}>
                            <Ionicons name="scan-outline" size={16} color={theme.colors.text} />
                            <Text style={styles.btnText}>Scan Wristband</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.primaryBtn}>
                            <Ionicons name="add" size={16} color="white" />
                            <Text style={styles.primaryBtnText}>Add Staff Member</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
                    <Text style={{ color: theme.colors.textSecondary, marginLeft: 8 }}>Search staff by name, role...</Text>
                </View>

                <Text style={styles.resultsText}>Showing 513 of 513 staff members for 2026</Text>

                {/* Staff List (Two Columns) */}
                <View style={styles.grid}>
                    {mockStaff.map((staff, index) => (
                        <View key={index} style={styles.staffCardWrapper}>
                            {/* Using View with border styling to match the screenshot's Red Border Card */}
                            <View style={styles.staffCard}>
                                <View style={styles.staffHeader}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{staff.initials}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.staffName}>{staff.name}</Text>
                                        <Text style={styles.staffRole}>{staff.role}</Text>
                                    </View>
                                </View>

                                <View style={styles.tagRow}>
                                    <View style={styles.redTag}>
                                        <Text style={styles.redTagText}>No Type Set</Text>
                                    </View>
                                    <View style={styles.greenTag}>
                                        <Text style={styles.greenTagText}>active</Text>
                                    </View>
                                </View>

                                {/* Rating Box */}
                                <View style={styles.ratingBox}>
                                    <Ionicons name="star" size={16} color={theme.colors.warning} />
                                    <View style={{ marginLeft: 8 }}>
                                        <Text style={styles.ratingTitle}>0.0 Average Rating</Text>
                                        <Text style={styles.ratingSub}>0 evaluations</Text>
                                    </View>
                                </View>

                                {/* Trend */}
                                <View style={styles.trendRow}>
                                    <Ionicons name="trending-up" size={16} color={theme.colors.success} />
                                    <Text style={styles.trendText}>Recent Evaluation</Text>
                                </View>
                                <Text style={styles.trendSub}>No evaluations yet</Text>

                            </View>
                        </View>
                    ))}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const mockStaff = [
    { initials: 'AHG', name: 'Abel Hernandez Gallardo', role: 'Soccer / General Counselor' },
    { initials: 'AS', name: 'Abigail Sheridan', role: 'General Counselor - Freshmen Boys' },
    { initials: 'AZ', name: 'Addison Zucker', role: 'General Counselor' },
    { initials: 'ACO', name: 'Adrian Chamu Ochoa', role: 'Lead Counselor' },
];

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
        fontSize: 22,
    },
    actionBar: {
        marginBottom: theme.spacing.md,
    },
    description: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: theme.borderRadius.md,
        gap: 4,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: theme.borderRadius.md,
        gap: 4,
    },
    btnText: { fontWeight: '600' },
    primaryBtnText: { fontWeight: '600', color: 'white' },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 10,
        marginBottom: theme.spacing.md,
    },
    resultsText: {
        ...theme.typography.caption,
        marginBottom: theme.spacing.md,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    staffCardWrapper: {
        width: '49%',
        marginBottom: theme.spacing.md,
    },
    staffCard: {
        backgroundColor: 'white',
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.danger, // Red border from screenshot
        padding: theme.spacing.md,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    staffHeader: {
        flexDirection: 'row',
        marginBottom: theme.spacing.md,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e0e7ff', // light indigo
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#3730a3',
        fontWeight: 'bold',
    },
    staffName: {
        fontWeight: 'bold',
        fontSize: 14,
        flexWrap: 'wrap',
    },
    staffRole: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    tagRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
    },
    redTag: {
        backgroundColor: '#fee2e2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    redTagText: { color: theme.colors.danger, fontSize: 10 },
    greenTag: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    greenTagText: { color: theme.colors.success, fontSize: 10, fontWeight: 'bold' },
    ratingBox: {
        backgroundColor: '#f9fafb',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: theme.borderRadius.sm,
        marginBottom: theme.spacing.md,
    },
    ratingTitle: { fontSize: 12, fontWeight: '600' },
    ratingSub: { fontSize: 10, color: theme.colors.textSecondary },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    trendText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
    trendSub: { fontSize: 10, color: theme.colors.textSecondary, marginLeft: 20 },
});
