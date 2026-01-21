import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

// Header Component (Resusable for sub-screens)
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

export const CamperScreen = ({ navigation }: any) => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ScreenHeader title="Camper" navigation={navigation} />

                {/* Action Bar */}
                <View style={styles.actionBar}>
                    <Text style={styles.description}>Manage and view all campers in your program</Text>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.secondaryBtn}>
                            <Ionicons name="scan-outline" size={16} color={theme.colors.text} />
                            <Text style={styles.btnText}>Scan Wristband</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.primaryBtn}>
                            <Ionicons name="add" size={16} color="white" />
                            <Text style={styles.primaryBtnText}>Add Child</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Filters */}
                <View style={styles.filterRow}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
                        <TextInput
                            placeholder="Search by name, grade..."
                            style={styles.input}
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>
                    <TouchableOpacity style={styles.filterBtn}>
                        <Text>All Divisions</Text>
                        <Ionicons name="chevron-down" size={16} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.resultsText}>Showing 1-50 of 592 campers</Text>

                {/* Camper Grid */}
                <View style={styles.grid}>
                    {mockCampers.map((camper, index) => (
                        <StyledCard key={index} style={styles.camperCard}>
                            <View style={styles.cardTop}>
                                <View>
                                    <Text style={styles.camperName}>{camper.name}</Text>
                                    <Text style={styles.camperGrade}>{camper.grade}</Text>
                                </View>
                                {/* Edit/Delete Icons Placeholder */}
                            </View>

                            <Text style={styles.divisionText}>Division: {camper.division}</Text>

                            <View style={styles.cardFooter}>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>active</Text>
                                </View>
                            </View>
                        </StyledCard>
                    ))}
                </View>

            </ScrollView>
            {/* Floating Action Button (Chat) mock */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="chatbubble-ellipses" size={24} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

// Mock Data
const mockCampers = [
    { name: 'Abby Weiss', grade: '11th', division: 'CIT Girls' },
    { name: 'Adam Elliott', grade: '4th', division: 'Freshmen B Boys' },
    { name: 'Addison Brewer', grade: '6th', division: 'Sophomore Girls' },
    { name: 'Adrianna Gelb', grade: '11th', division: 'CIT Girls' },
    { name: 'Ava Wolf', grade: '7th', division: 'Junior Girls' },
    { name: 'Ava Zinner', grade: '9th', division: 'Super Senior Girls' },
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: 80, // Space for FAB
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
    btnText: {
        fontWeight: '600',
        color: theme.colors.text,
    },
    primaryBtnText: {
        fontWeight: '600',
        color: 'white',
    },
    filterRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 40,
    },
    input: {
        flex: 1,
        marginLeft: theme.spacing.sm,
    },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        gap: 4,
    },
    resultsText: {
        ...theme.typography.caption,
        marginBottom: theme.spacing.sm,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    camperCard: {
        width: '48%', // 2 columns
        padding: theme.spacing.md,
    },
    cardTop: {
        marginBottom: theme.spacing.sm,
    },
    camperName: {
        fontWeight: 'bold',
        fontSize: 16,
        color: theme.colors.text,
    },
    camperGrade: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    divisionText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    statusBadge: {
        backgroundColor: '#dcfce7', // light green
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.success,
    },
    statusText: {
        color: theme.colors.success,
        fontSize: 10,
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
    }
});
