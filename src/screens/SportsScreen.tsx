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

export const SportsScreen = ({ navigation }: any) => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ScreenHeader title="Sports Academy" navigation={navigation} />

                <View style={styles.introRow}>
                    <Ionicons name="trophy-outline" size={32} color={theme.colors.text} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.introTitle}>Sports Academy</Text>
                        <Text style={styles.introDesc}>Manage camper sports academy enrollments</Text>
                    </View>
                </View>

                {/* Action Bar */}
                <View style={styles.actionBar}>
                    <View style={styles.btnGroup}>
                        <TouchableOpacity style={[styles.groupBtn, styles.groupBtnActive]}>
                            <Ionicons name="list" size={16} color="white" />
                            <Text style={styles.groupBtnTextActive}>List</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.groupBtn}>
                            <Ionicons name="calendar" size={16} color={theme.colors.text} />
                            <Text style={styles.groupBtnText}>Calendar</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1 }} />

                    <TouchableOpacity style={styles.primaryBtn}>
                        <Ionicons name="add" size={16} color="white" />
                        <Text style={styles.btnText}>Add Enrollment</Text>
                    </TouchableOpacity>
                </View>

                {/* Filters */}
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
                    <Text style={{ color: theme.colors.textSecondary, marginLeft: 8 }}>Search by camper, sport...</Text>
                </View>
                <View style={styles.filterRow}>
                    <TouchableOpacity style={styles.filterChip}><Text style={styles.filterText}>All Divisions</Text><Ionicons name="chevron-down" size={12} /></TouchableOpacity>
                    <TouchableOpacity style={styles.filterChip}><Text style={styles.filterText}>All Genders</Text><Ionicons name="chevron-down" size={12} /></TouchableOpacity>
                    <TouchableOpacity style={styles.filterChip}><Text style={styles.filterText}>All Sports</Text><Ionicons name="chevron-down" size={12} /></TouchableOpacity>
                </View>

                {/* Empty State / List */}
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No sports academy enrollments found</Text>
                </View>

            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="chatbubble-ellipses" size={24} color="white" />
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
    introRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    introTitle: { ...theme.typography.h2, fontSize: 20 },
    introDesc: { color: theme.colors.textSecondary },
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    btnGroup: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    groupBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 4,
    },
    groupBtnActive: {
        backgroundColor: theme.colors.secondary,
    },
    groupBtnText: { color: theme.colors.text, fontWeight: '600' },
    groupBtnTextActive: { color: 'white', fontWeight: '600' },
    primaryBtn: {
        backgroundColor: theme.colors.secondary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.md,
        gap: 4,
    },
    btnText: { color: 'white', fontWeight: '600' },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 10,
        height: 44,
        marginBottom: theme.spacing.sm,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: theme.spacing.xl,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 4,
    },
    filterText: { fontSize: 12 },
    emptyContainer: {
        backgroundColor: 'white',
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        height: 100,
    },
    emptyText: {
        color: theme.colors.textSecondary,
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
