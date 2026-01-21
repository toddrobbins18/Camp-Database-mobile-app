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

export const TransportScreen = ({ navigation }: any) => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ScreenHeader title="Transportation" navigation={navigation} />

                <Text style={styles.subtitle}>Manage field trips and event transportation</Text>

                {/* Action Bar */}
                <View style={styles.actionBar}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
                        <Text style={{ color: theme.colors.textSecondary, marginLeft: 8 }}>Search trips...</Text>
                    </View>
                    <TouchableOpacity style={styles.primaryBtn}>
                        <Ionicons name="add" size={16} color="white" />
                        <Text style={styles.btnText}>Add Trip</Text>
                    </TouchableOpacity>
                </View>

                {/* Trips List */}
                <StyledCard style={styles.tripCard}>
                    <View style={styles.barAccent} />
                    <View style={styles.tripContent}>
                        <View style={styles.tripHeader}>
                            <Text style={styles.tripTitle}>Seniors Boston Trip</Text>
                            <View style={styles.badges}>
                                <View style={styles.typeBadge}><Text style={styles.typeText}>field_trip</Text></View>
                                <View style={styles.statusBadge}><Text style={styles.statusText}>Pending Approval</Text></View>
                            </View>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Destination:</Text>
                            <Text style={styles.detailValue}>Museum of Science</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Chaperone:</Text>
                            <Text style={styles.detailValue}>TBD</Text>
                        </View>

                        <View style={styles.metaGrid}>
                            <View style={styles.metaItem}>
                                <View style={styles.iconCircle}><Ionicons name="calendar" size={18} color="#6366f1" /></View>
                                <View>
                                    <Text style={styles.metaLabel}>Date</Text>
                                    <Text style={styles.metaValue}>Jul 30 - Aug 1</Text>
                                    <View style={styles.durationBadge}><Text style={styles.durationText}>3-Day Trip</Text></View>
                                </View>
                            </View>
                            <View style={styles.metaItem}>
                                <View style={styles.iconCircle}><Ionicons name="people" size={18} color="#0ea5e9" /></View>
                                <View>
                                    <Text style={styles.metaLabel}>Attending</Text>
                                    <Text style={styles.metaValue}>42</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.metaGrid}>
                            <View style={styles.metaItem}>
                                <View style={[styles.iconCircle, { backgroundColor: '#ffedd5' }]}><Ionicons name="time" size={18} color="#f97316" /></View>
                                <View>
                                    <Text style={styles.metaLabel}>Departure</Text>
                                    <Text style={styles.metaValue}>08:00 AM</Text>
                                </View>
                            </View>
                            <View style={styles.metaItem}>
                                <View style={[styles.iconCircle, { backgroundColor: '#e5e7eb' }]}><Ionicons name="time" size={18} color="#4b5563" /></View>
                                <View>
                                    <Text style={styles.metaLabel}>Return</Text>
                                    <Text style={styles.metaValue}>05:00 PM</Text>
                                </View>
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
    scrollContent: {
        padding: theme.spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    headerTitle: {
        ...theme.typography.h2,
    },
    subtitle: {
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    actionBar: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 10,
        height: 44,
    },
    primaryBtn: {
        backgroundColor: theme.colors.secondary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderRadius: theme.borderRadius.md,
        gap: 4,
    },
    btnText: {
        color: 'white',
        fontWeight: '600',
    },
    tripCard: {
        padding: 0,
        overflow: 'hidden',
        flexDirection: 'row',
    },
    barAccent: {
        width: 4,
        backgroundColor: theme.colors.danger, // Red accent
    },
    tripContent: {
        flex: 1,
        padding: theme.spacing.md,
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        marginBottom: theme.spacing.md,
    },
    tripTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        color: theme.colors.text,
        marginBottom: 4,
    },
    badges: {
        flexDirection: 'row',
        gap: 4,
    },
    typeBadge: {
        backgroundColor: '#0ea5e9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    typeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    statusBadge: {
        backgroundColor: theme.colors.danger,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    detailLabel: {
        width: 80,
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    detailValue: {
        color: theme.colors.text,
        fontSize: 12,
        fontWeight: '500',
    },
    metaGrid: {
        flexDirection: 'row',
        marginTop: theme.spacing.md,
        gap: theme.spacing.lg,
    },
    metaItem: {
        flexDirection: 'row',
        gap: 8,
        width: '45%',
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e0e7ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    metaLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
    },
    metaValue: {
        fontWeight: 'bold',
        fontSize: 13,
        color: theme.colors.text,
    },
    durationBadge: {
        backgroundColor: '#0ea5e9',
        alignSelf: 'flex-start',
        paddingHorizontal: 4,
        borderRadius: 2,
        marginTop: 2,
    },
    durationText: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold',
    }

});
