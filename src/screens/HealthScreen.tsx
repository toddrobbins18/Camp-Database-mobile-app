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

export const HealthScreen = ({ navigation }: any) => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ScreenHeader title="Nurse Dashboard" navigation={navigation} />

                {/* Quick Stats Grid */}
                <View style={styles.statsRow}>
                    <StyledCard style={styles.statCard}>
                        <Ionicons name="medkit" size={24} color={theme.colors.danger} />
                        <Text style={styles.statNumber}>12</Text>
                        <Text style={styles.statLabel}>Pending Meds</Text>
                    </StyledCard>
                    <StyledCard style={styles.statCard}>
                        <Ionicons name="thermometer" size={24} color={theme.colors.warning} />
                        <Text style={styles.statNumber}>4</Text>
                        <Text style={styles.statLabel}>Sick Bay</Text>
                    </StyledCard>
                    <StyledCard style={styles.statCard}>
                        <Ionicons name="bandage" size={24} color={theme.colors.secondary} />
                        <Text style={styles.statNumber}>8</Text>
                        <Text style={styles.statLabel}>Incidents</Text>
                    </StyledCard>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.primaryBtn}>
                        <Ionicons name="add-circle-outline" size={20} color="white" />
                        <Text style={styles.primaryBtnText}>Log Incident</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryBtn}>
                        <Text style={styles.secondaryBtnText}>View Medical Profiles</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeader}>Medication Schedule</Text>

                {/* Medication List */}
                <View style={styles.medList}>
                    <StyledCard style={styles.medCard}>
                        <View style={styles.medHeader}>
                            <Text style={styles.medTime}>08:00 AM</Text>
                            <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
                                <Text style={{ color: '#d97706', fontSize: 10, fontWeight: 'bold' }}>PENDING</Text>
                            </View>
                        </View>
                        <View style={styles.medBody}>
                            <View style={styles.camperInfo}>
                                <View style={styles.avatar}><Text style={styles.avatarText}>JS</Text></View>
                                <View>
                                    <Text style={styles.camperName}>Jacob Smith</Text>
                                    <Text style={styles.camperCottage}>Bunk 4</Text>
                                </View>
                            </View>
                            <View style={styles.medDetails}>
                                <Text style={styles.medName}>Amoxicillin</Text>
                                <Text style={styles.medDose}>500mg • 1 Tablet</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.logBtn}>
                            <Text style={styles.logBtnText}>Log Administration</Text>
                        </TouchableOpacity>
                    </StyledCard>

                    <StyledCard style={styles.medCard}>
                        <View style={styles.medHeader}>
                            <Text style={styles.medTime}>08:00 AM</Text>
                            <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                                <Text style={{ color: theme.colors.success, fontSize: 10, fontWeight: 'bold' }}>COMPLETED</Text>
                            </View>
                        </View>
                        <View style={styles.medBody}>
                            <View style={styles.camperInfo}>
                                <View style={styles.avatar}><Text style={styles.avatarText}>ED</Text></View>
                                <View>
                                    <Text style={styles.camperName}>Emily Davis</Text>
                                    <Text style={styles.camperCottage}>Bunk 7</Text>
                                </View>
                            </View>
                            <View style={styles.medDetails}>
                                <Text style={styles.medName}>Claritin</Text>
                                <Text style={styles.medDose}>10mg • 1 Tablet</Text>
                            </View>
                        </View>
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
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
    },
    statCard: {
        width: '31%',
        alignItems: 'center',
        padding: theme.spacing.sm,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 4,
    },
    statLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
    },
    actionRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    primaryBtn: {
        flex: 1,
        backgroundColor: theme.colors.secondary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: theme.borderRadius.md,
        gap: 8,
    },
    primaryBtnText: {
        color: 'white',
        fontWeight: '600',
    },
    secondaryBtn: {
        flex: 1,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    secondaryBtnText: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    sectionHeader: {
        ...theme.typography.h3,
        marginBottom: theme.spacing.md,
    },
    medList: {
        gap: theme.spacing.md,
    },
    medCard: {
        padding: 0, // Reset padding for custom inner layout
        overflow: 'hidden',
    },
    medHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    medTime: {
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    medBody: {
        padding: theme.spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    camperInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e0e7ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#3730a3',
        fontWeight: 'bold',
    },
    camperName: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    camperCottage: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    medDetails: {
        alignItems: 'flex-end',
    },
    medName: {
        fontWeight: '600',
        fontSize: 14,
        color: theme.colors.text,
    },
    medDose: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    logBtn: {
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.md,
        backgroundColor: theme.colors.primary,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.sm,
        alignItems: 'center',
    },
    logBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12,
    }
});
