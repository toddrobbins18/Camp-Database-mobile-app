import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

interface PendingApproval {
    id: string;
    name: string;
    email: string;
    requestedAt: string;
}

export const UserApprovalsScreen = ({ navigation }: any) => {
    // User Approvals state
    const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([
        // Mock data - in production, this would be fetched from Supabase
        // { id: '1', name: 'John Doe', email: 'john.doe@example.com', requestedAt: '2026-01-23T10:30:00Z' },
        // { id: '2', name: 'Jane Smith', email: 'jane.smith@example.com', requestedAt: '2026-01-23T09:15:00Z' },
    ]);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [userToApprove, setUserToApprove] = useState<PendingApproval | null>(null);
    const [userToReject, setUserToReject] = useState<PendingApproval | null>(null);

    // User Approval handlers
    const handleApproveUser = () => {
        if (userToApprove) {
            // In production, this would call Supabase to update the user's approved status
            // For now, just remove from pending list
            setPendingApprovals(pendingApprovals.filter(approval => approval.id !== userToApprove.id));
            setShowApproveModal(false);
            setUserToApprove(null);
            // TODO: Call Supabase API to approve user
            // await supabase.from('profiles').update({ approved: true }).eq('id', userToApprove.id);
        }
    };

    const handleRejectUser = () => {
        if (userToReject) {
            // In production, this would call Supabase to reject/delete the user
            // For now, just remove from pending list
            setPendingApprovals(pendingApprovals.filter(approval => approval.id !== userToReject.id));
            setShowRejectModal(false);
            setUserToReject(null);
            // TODO: Call Supabase API to reject user (delete or mark as rejected)
            // await supabase.from('profiles').delete().eq('id', userToReject.id);
        }
    };

    const handleCancelApprove = () => {
        setShowApproveModal(false);
        setUserToApprove(null);
    };

    const handleCancelReject = () => {
        setShowRejectModal(false);
        setUserToReject(null);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Title and Description Section */}
                <View style={styles.titleSection}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>User Approvals</Text>
                        <Text style={styles.subtitle}>Approve or reject pending user registrations</Text>
                    </View>
                </View>

                {/* User Approvals Section */}
                <StyledCard style={styles.contentCard}>

                    {/* Pending Approvals List */}
                    {pendingApprovals.length === 0 ? (
                        <View style={styles.emptyStateContainer}>
                            <Text style={styles.emptyStateText}>No pending user approvals</Text>
                        </View>
                    ) : (
                        <View style={styles.pendingApprovalsList}>
                            {pendingApprovals.map((approval) => (
                                <View key={approval.id} style={styles.approvalCard}>
                                    <View style={styles.approvalInfo}>
                                        <Text style={styles.approvalName}>{approval.name}</Text>
                                        <Text style={styles.approvalEmail}>{approval.email}</Text>
                                        <Text style={styles.approvalDate}>
                                            Requested: {new Date(approval.requestedAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Text>
                                    </View>
                                    <View style={styles.approvalActions}>
                                        <TouchableOpacity
                                            style={styles.rejectButton}
                                            onPress={() => {
                                                setUserToReject(approval);
                                                setShowRejectModal(true);
                                            }}
                                        >
                                            <Ionicons name="close-circle-outline" size={18} color={theme.colors.danger} />
                                            <Text style={styles.rejectButtonText}>Reject</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.approveButton}
                                            onPress={() => {
                                                setUserToApprove(approval);
                                                setShowApproveModal(true);
                                            }}
                                        >
                                            <Ionicons name="checkmark-circle-outline" size={18} color="#10b981" />
                                            <Text style={styles.approveButtonText}>Approve</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </StyledCard>
            </ScrollView>

            {/* Approve User Modal */}
            <Modal
                visible={showApproveModal}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCancelApprove}
            >
                <Pressable style={styles.modalOverlay} onPress={handleCancelApprove}>
                    <Pressable style={styles.deleteModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.deleteModalHeader}>
                            <Text style={styles.deleteModalTitle}>Approve User</Text>
                        </View>

                        <View style={styles.deleteModalBody}>
                            <Text style={styles.deleteModalMessage}>
                                Are you sure you want to approve {userToApprove?.name} ({userToApprove?.email})? They will be granted access to the system.
                            </Text>
                        </View>

                        <View style={styles.deleteModalFooter}>
                            <TouchableOpacity
                                style={styles.cancelDeleteButton}
                                onPress={handleCancelApprove}
                            >
                                <Text style={styles.cancelDeleteButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.deleteButton, { backgroundColor: '#10b981' }]}
                                onPress={handleApproveUser}
                            >
                                <Text style={styles.deleteButtonText}>Approve</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Reject User Modal */}
            <Modal
                visible={showRejectModal}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCancelReject}
            >
                <Pressable style={styles.modalOverlay} onPress={handleCancelReject}>
                    <Pressable style={styles.deleteModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.deleteModalHeader}>
                            <Text style={styles.deleteModalTitle}>Reject User</Text>
                        </View>

                        <View style={styles.deleteModalBody}>
                            <Text style={styles.deleteModalMessage}>
                                Are you sure you want to reject {userToReject?.name} ({userToReject?.email})? This action cannot be undone.
                            </Text>
                        </View>

                        <View style={styles.deleteModalFooter}>
                            <TouchableOpacity
                                style={styles.cancelDeleteButton}
                                onPress={handleCancelReject}
                            >
                                <Text style={styles.cancelDeleteButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={handleRejectUser}
                            >
                                <Text style={styles.deleteButtonText}>Reject</Text>
                            </TouchableOpacity>
                        </View>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.lg,
        flexWrap: 'wrap',
    },
    titleContainer: {
        flex: 1,
        minWidth: '50%',
        marginBottom: theme.spacing.sm,
    },
    title: {
        ...theme.typography.h1,
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    contentCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginTop: theme.spacing.sm,
        minHeight: 400,
    },
    // User Approvals Styles
    emptyStateContainer: {
        padding: theme.spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
    emptyStateText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    pendingApprovalsList: {
        gap: theme.spacing.sm,
    },
    approvalCard: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    approvalInfo: {
        marginBottom: theme.spacing.md,
    },
    approvalName: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    approvalEmail: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    approvalDate: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    approvalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.sm,
    },
    approveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d1fae5',
        borderWidth: 1,
        borderColor: '#10b981',
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.xs,
    },
    approveButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10b981',
    },
    rejectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fee2e2',
        borderWidth: 1,
        borderColor: theme.colors.danger,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.xs,
    },
    rejectButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.danger,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteModalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        width: '85%',
        maxWidth: 400,
        ...theme.shadows.card,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    deleteModalHeader: {
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    deleteModalTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    deleteModalBody: {
        padding: theme.spacing.lg,
    },
    deleteModalMessage: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
        lineHeight: 24,
    },
    deleteModalFooter: {
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    deleteButton: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    cancelDeleteButton: {
        backgroundColor: theme.colors.surface,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cancelDeleteButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
});


