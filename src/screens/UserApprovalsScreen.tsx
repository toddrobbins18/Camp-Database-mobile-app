import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { usePendingUsers, useApproveUser, useRejectUser } from '../api/admin';
import { supabase } from '../lib/supabase';

export const UserApprovalsScreen = ({ navigation }: any) => {
    const [companies, setCompanies] = useState<any[]>([]);
    const [campPickerUserId, setCampPickerUserId] = useState<string | null>(null);

    React.useEffect(() => {
        const fetchCompanies = async () => {
            const { data } = await supabase.from('companies').select('id, name').eq('is_active', true).order('name');
            if (data) setCompanies(data);
        };
        fetchCompanies();
    }, []);

    const { data: pendingUsers = [], refetch: refetchPending } = usePendingUsers();
    const approveUserMutation = useApproveUser();
    const rejectUserMutation = useRejectUser();
    const [selectedCompanyForUser, setSelectedCompanyForUser] = useState<Record<string, string>>({});

    const handleApprove = (user: any) => {
        const companyId = selectedCompanyForUser[user.id];
        if (!companyId) {
            Alert.alert('Select a camp', 'Please choose a camp for this user first.');
            return;
        }
        approveUserMutation.mutate(
            { userId: user.id, companyId },
            {
                onSuccess: () => {
                    setSelectedCompanyForUser(prev => {
                        const next = { ...prev };
                        delete next[user.id];
                        return next;
                    });
                    refetchPending();
                    Alert.alert('Approved', `${user.email} has been approved and assigned to the camp.`);
                },
                onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to approve user.'),
            }
        );
    };

    const handleReject = (user: any) => {
        Alert.alert(
            'Reject user',
            `Reject ${user.email}? They will need to sign up again.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: () => {
                        rejectUserMutation.mutate(user.id, {
                            onSuccess: () => {
                                setSelectedCompanyForUser(prev => {
                                    const next = { ...prev };
                                    delete next[user.id];
                                    return next;
                                });
                                refetchPending();
                                Alert.alert('Rejected', 'User has been rejected.');
                            },
                            onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to reject user.'),
                        });
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Ionicons name="menu" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity>
                    <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.approvalsContainer}>
                    <View style={styles.titleSection}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.cardTitle}>User Approvals</Text>
                            <Text style={styles.cardSubtitle}>Approve or reject pending user registrations</Text>
                        </View>
                    </View>

                    {/* Banner matching the UI */}
                    <View style={styles.approvalsBanner}>
                        <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.secondary} />
                        <View style={styles.approvalsBannerBadge}>
                            <Text style={styles.approvalsBannerText}>Super Admin</Text>
                        </View>
                        <Ionicons name="business-outline" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.approvalsBannerViewing}>Viewing: All Camps</Text>
                    </View>

                    <View style={styles.approvalsGrid}>
                        {pendingUsers.length === 0 ? (
                            <Text style={styles.noPendingText}>No pending users to approve.</Text>
                        ) : (
                            pendingUsers.map((user: any) => (
                                <StyledCard key={user.id} style={styles.approvalCard}>
                                    <View style={styles.approvalCardHeader}>
                                        <View style={styles.approvalUserInfo}>
                                            <Text style={styles.approvalUserName}>{user.name}</Text>
                                            <Text style={styles.approvalUserEmail}>{user.email}</Text>
                                        </View>
                                        <View style={styles.pendingBadge}>
                                            <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                                            <Text style={styles.pendingBadgeText}>Pending</Text>
                                        </View>
                                    </View>

                                    <Text style={styles.approvalRequestedText}>
                                        Requested: {new Date(user.requestedAt).toLocaleString()}
                                    </Text>

                                    <Text style={styles.assignToCampLabel}>Assign to Camp</Text>
                                    <TouchableOpacity
                                        style={styles.assignDropdownContainer}
                                        onPress={() => setCampPickerUserId(user.id)}
                                    >
                                        <Text style={styles.assignDropdownText}>
                                            {selectedCompanyForUser[user.id]
                                                ? companies.find(c => c.id === selectedCompanyForUser[user.id])?.name || 'Selected'
                                                : 'Select a camp...'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>

                                    <View style={styles.approvalActions}>
                                        <TouchableOpacity
                                            style={[styles.approveButton, (!selectedCompanyForUser[user.id] || approveUserMutation.isPending) && styles.buttonDisabled]}
                                            onPress={() => handleApprove(user)}
                                            disabled={!selectedCompanyForUser[user.id] || approveUserMutation.isPending}
                                        >
                                            {approveUserMutation.isPending ? (
                                                <ActivityIndicator color="white" size="small" />
                                            ) : (
                                                <>
                                                    <Ionicons name="checkmark-circle-outline" size={16} color="white" />
                                                    <Text style={styles.approveButtonText}>Approve</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.rejectButton, rejectUserMutation.isPending && styles.buttonDisabled]}
                                            onPress={() => handleReject(user)}
                                            disabled={rejectUserMutation.isPending}
                                        >
                                            {rejectUserMutation.isPending ? (
                                                <ActivityIndicator color="white" size="small" />
                                            ) : (
                                                <>
                                                    <Ionicons name="close-circle-outline" size={16} color="white" />
                                                    <Text style={styles.rejectButtonText}>Reject</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </StyledCard>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Camp picker modal (React Native doesn't support <select>) */}
            <Modal
                visible={campPickerUserId !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setCampPickerUserId(null)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setCampPickerUserId(null)}>
                    <Pressable style={styles.campPickerModal} onPress={e => e.stopPropagation()}>
                        <View style={styles.campPickerHeader}>
                            <Text style={styles.campPickerTitle}>Assign to Camp</Text>
                            <TouchableOpacity onPress={() => setCampPickerUserId(null)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.campPickerList}>
                            {companies.map(camp => (
                                <TouchableOpacity
                                    key={camp.id}
                                    style={[
                                        styles.campPickerItem,
                                        campPickerUserId && selectedCompanyForUser[campPickerUserId] === camp.id && styles.campPickerItemSelected,
                                    ]}
                                    onPress={() => {
                                        if (campPickerUserId) {
                                            setSelectedCompanyForUser(prev => ({ ...prev, [campPickerUserId]: camp.id }));
                                            setCampPickerUserId(null);
                                        }
                                    }}
                                >
                                    <Text style={styles.campPickerItemText}>{camp.name}</Text>
                                    {campPickerUserId && selectedCompanyForUser[campPickerUserId] === camp.id && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: 100,
    },
    titleSection: {
        marginBottom: theme.spacing.lg,
    },
    titleContainer: {
        marginBottom: theme.spacing.sm,
    },
    cardTitle: {
        ...theme.typography.h1,
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    cardSubtitle: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    approvalsContainer: {
        width: '100%',
    },
    approvalsBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eef2ff',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: '#c7d2fe',
        marginBottom: theme.spacing.xl,
        gap: 8,
    },
    approvalsBannerBadge: {
        backgroundColor: '#2563eb', // Blue theme match
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
        marginRight: 8,
    },
    approvalsBannerText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    approvalsBannerViewing: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    approvalsGrid: {
        width: '100%',
        maxWidth: 400, // Matching the narrow card style in screenshot
    },
    approvalCard: {
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    approvalCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
    },
    approvalUserInfo: {
        flex: 1,
    },
    approvalUserName: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 2,
    },
    approvalUserEmail: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#f1f5f9',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    pendingBadgeText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    approvalRequestedText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    assignToCampLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    assignDropdownContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        marginBottom: theme.spacing.lg,
        minHeight: 44,
        paddingHorizontal: theme.spacing.md,
    },
    assignDropdownText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    campPickerModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.lg,
        borderTopRightRadius: theme.borderRadius.lg,
        maxHeight: '60%',
    },
    campPickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    campPickerTitle: {
        ...theme.typography.h3,
    },
    campPickerList: {
        padding: theme.spacing.sm,
    },
    campPickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    campPickerItemSelected: {
        backgroundColor: theme.colors.primary + '20',
    },
    campPickerItemText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    approvalActions: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    approveButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366f1', // Indigo matched to screenshot
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    rejectButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#dc2626', // Red matched to screenshot
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    approveButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    rejectButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    noPendingText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        marginTop: theme.spacing.md,
    },
});
