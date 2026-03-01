import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '../contexts/CompanyContext';

interface StaffMember {
    id: string;
    name: string;
    bank: string;
    isOut: boolean;
    isSleepingOut: boolean;
}

export const ODManagementScreen = ({ navigation }: any) => {
    const { companyId, season } = useCompany();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'OD' | 'OFF'>('OD');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [showManageBanksModal, setShowManageBanksModal] = useState(false);
    const [showNewModal, setShowNewModal] = useState(false);
    const [showModeModal, setShowModeModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [newBankName, setNewBankName] = useState('');

    const dateString = selectedDate.toISOString().split('T')[0];

    // Fetch days off / OD records for the selected date
    const { data: staffMembers = [], isLoading: isLoadingStaff } = useQuery({
        queryKey: ['days_off', companyId, dateString],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('days_off')
                .select('*, profiles(full_name)')
                .eq('company_id', companyId)
                .eq('date', dateString);
            if (error) throw error;
            return (data || []).map((record: any) => ({
                id: record.id,
                staffId: record.staff_id,
                name: record.profiles?.full_name || 'Unknown',
                bank: record.bank || '',
                isOut: record.is_out || false,
                isSleepingOut: record.is_sleeping_out || false,
            }));
        },
        enabled: !!companyId,
    });

    // Fetch banks from Supabase
    const { data: banks = [] } = useQuery({
        queryKey: ['bunks', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('bunks')
                .select('id, name')
                .eq('company_id', companyId)
                .order('name', { ascending: true });
            if (error) throw error;
            return (data || []).map((b: any) => b.name);
        },
        enabled: !!companyId,
    });

    // Add day-off record mutation
    const addDayOffMutation = useMutation({
        mutationFn: async (newRecord: any) => {
            const { error } = await supabase
                .from('days_off')
                .insert([{
                    company_id: companyId,
                    staff_id: newRecord.staffId,
                    date: dateString,
                    bank: newRecord.bank || null,
                    is_out: newRecord.isOut || false,
                    is_sleeping_out: newRecord.isSleepingOut || false,
                }]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['days_off'] });
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to add record');
        },
    });

    // Add bank mutation
    const addBankMutation = useMutation({
        mutationFn: async (bankName: string) => {
            const { error } = await supabase
                .from('bunks')
                .insert([{ company_id: companyId, name: bankName }]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bunks'] });
            setNewBankName('');
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to add bank');
        },
    });

    // Delete bank mutation
    const deleteBankMutation = useMutation({
        mutationFn: async (bankName: string) => {
            const { error } = await supabase
                .from('bunks')
                .delete()
                .eq('company_id', companyId)
                .eq('name', bankName);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bunks'] });
            queryClient.invalidateQueries({ queryKey: ['days_off'] });
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to delete bank');
        },
    });

    const formatDate = (date: Date): string => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        if (direction === 'prev') {
            newDate.setDate(newDate.getDate() - 1);
        } else {
            newDate.setDate(newDate.getDate() + 1);
        }
        setSelectedDate(newDate);
    };

    const filteredStaff = staffMembers.filter(staff => {
        if (activeTab === 'OD' && (staff.isOut || staff.isSleepingOut)) return false;
        if (activeTab === 'OFF' && !staff.isOut && !staff.isSleepingOut) return false;
        if (searchQuery && !staff.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !staff.bank.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const handleManageBanks = () => {
        setShowManageBanksModal(true);
    };

    const handleAddBank = () => {
        if (newBankName.trim() && !banks.includes(newBankName.trim())) {
            addBankMutation.mutate(newBankName.trim());
        }
    };

    const handleDeleteBank = (bankName: string) => {
        Alert.alert(
            'Delete Bank',
            `Are you sure you want to delete "${bankName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteBankMutation.mutate(bankName) },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Title Section */}
                <View style={styles.titleSection}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>OD Management</Text>
                        <Text style={styles.subtitle}>Manage staff days off and bunk coverage</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="barcode-outline" size={18} color={theme.colors.text} />
                        <Text style={styles.actionButtonText}>Scan Wristband</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleManageBanks}
                    >
                        <Ionicons name="business-outline" size={18} color={theme.colors.text} />
                        <Text style={styles.actionButtonText}>Manage Banks</Text>
                    </TouchableOpacity>
                </View>

                {/* Date Selector */}
                <View style={styles.dateSelector}>
                    <TouchableOpacity onPress={() => navigateDate('prev')}>
                        <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.dateDisplay}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigateDate('next')}>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Additional Action Buttons */}
                <View style={styles.additionalActions}>
                    <TouchableOpacity
                        style={styles.newButton}
                        onPress={() => setShowNewModal(true)}
                    >
                        <Text style={styles.newButtonText}>NEW</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.modeButton}
                        onPress={() => setShowModeModal(true)}
                    >
                        <Text style={styles.modeButtonText}>MODE</Text>
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'OD' && styles.tabActive]}
                        onPress={() => setActiveTab('OD')}
                    >
                        <Text style={[styles.tabText, activeTab === 'OD' && styles.tabTextActive]}>
                            OD
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'OFF' && styles.tabActive]}
                        onPress={() => setActiveTab('OFF')}
                    >
                        <Text style={[styles.tabText, activeTab === 'OFF' && styles.tabTextActive]}>
                            OFF
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* On Duty Staff Card */}
                <StyledCard style={styles.staffCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>
                            {activeTab === 'OD' ? 'On Duty Staff' : 'Off Duty Staff'}
                        </Text>
                        <Text style={styles.cardSubtitle}>
                            Staff members {activeTab === 'OD' ? 'on duty' : 'off duty'} for {formatDate(selectedDate)}
                        </Text>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by name or bank..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Table Headers */}
                    {banks.length > 0 && (
                        <View style={styles.tableHeaders}>
                            <Text style={[styles.tableHeader, { flex: 1.5 }]}>Bank</Text>
                            <Text style={[styles.tableHeader, { flex: 2 }]}>Name</Text>
                            <Text style={[styles.tableHeader, { flex: 1 }]}>Out</Text>
                            <Text style={[styles.tableHeader, { flex: 1.5 }]}>Sleeping Out</Text>
                            <Text style={[styles.tableHeader, { flex: 1 }]}>Actions</Text>
                        </View>
                    )}

                    {/* Staff List or Empty State */}
                    {banks.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                No banks configured. Click Manage Banks to set up banks and assign staff.
                            </Text>
                        </View>
                    ) : filteredStaff.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                No staff members found {activeTab === 'OD' ? 'on duty' : 'off duty'} for this date.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.staffList}>
                            {filteredStaff.map((staff) => (
                                <View key={staff.id} style={styles.staffRow}>
                                    <Text style={[styles.staffCell, { flex: 1.5 }]}>{staff.bank}</Text>
                                    <Text style={[styles.staffCell, { flex: 2 }]}>{staff.name}</Text>
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        {staff.isOut ? (
                                            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                                        ) : (
                                            <Ionicons name="close-circle-outline" size={20} color={theme.colors.textSecondary} />
                                        )}
                                    </View>
                                    <View style={{ flex: 1.5, alignItems: 'center' }}>
                                        {staff.isSleepingOut ? (
                                            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                                        ) : (
                                            <Ionicons name="close-circle-outline" size={20} color={theme.colors.textSecondary} />
                                        )}
                                    </View>
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        <TouchableOpacity>
                                            <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </StyledCard>
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="chatbubble-ellipses" size={24} color="white" />
            </TouchableOpacity>

            {/* Manage Banks Modal */}
            <Modal
                visible={showManageBanksModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowManageBanksModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowManageBanksModal(false)}>
                    <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Manage Banks</Text>
                            <TouchableOpacity onPress={() => setShowManageBanksModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalContent}>
                            <View style={styles.addBankSection}>
                                <TextInput
                                    style={styles.bankInput}
                                    placeholder="Enter bank name"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={newBankName}
                                    onChangeText={setNewBankName}
                                    onSubmitEditing={handleAddBank}
                                />
                                <TouchableOpacity
                                    style={styles.addBankButton}
                                    onPress={handleAddBank}
                                >
                                    <Ionicons name="add" size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.banksList}>
                                {banks.map((bank, index) => (
                                    <View key={index} style={styles.bankItem}>
                                        <Text style={styles.bankName}>{bank}</Text>
                                        <TouchableOpacity onPress={() => handleDeleteBank(bank)}>
                                            <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* New Modal */}
            <Modal
                visible={showNewModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowNewModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowNewModal(false)}>
                    <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Entry</Text>
                            <TouchableOpacity onPress={() => setShowNewModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalSubtitle}>Add new staff entry functionality coming soon...</Text>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Mode Modal */}
            <Modal
                visible={showModeModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowModeModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowModeModal(false)}>
                    <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Mode Settings</Text>
                            <TouchableOpacity onPress={() => setShowModeModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalSubtitle}>Mode settings functionality coming soon...</Text>
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
        marginBottom: theme.spacing.lg,
    },
    titleContainer: {
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
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
        flexWrap: 'wrap',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    actionButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.md,
    },
    dateDisplay: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
    },
    dateText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    additionalActions: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    newButton: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    newButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
    },
    modeButton: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    modeButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.md,
        padding: theme.spacing.xs,
    },
    tab: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
        borderRadius: theme.borderRadius.sm,
    },
    tabActive: {
        backgroundColor: theme.colors.secondary,
    },
    tabText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    tabTextActive: {
        color: 'white',
    },
    staffCard: {
        marginBottom: theme.spacing.md,
    },
    cardHeader: {
        marginBottom: theme.spacing.md,
    },
    cardTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: theme.spacing.xs,
    },
    cardSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
        marginBottom: theme.spacing.md,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        marginLeft: theme.spacing.xs,
    },
    tableHeaders: {
        flexDirection: 'row',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        marginBottom: theme.spacing.sm,
    },
    tableHeader: {
        ...theme.typography.body,
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
        minHeight: 200,
    },
    emptyText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    staffList: {
        gap: theme.spacing.xs,
    },
    staffRow: {
        flexDirection: 'row',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        alignItems: 'center',
    },
    staffCell: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '80%',
        paddingBottom: theme.spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
    },
    modalContent: {
        padding: theme.spacing.md,
    },
    modalSubtitle: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    addBankSection: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    bankInput: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
        fontSize: 14,
        color: theme.colors.text,
    },
    addBankButton: {
        backgroundColor: theme.colors.secondary,
        width: 44,
        height: 44,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    banksList: {
        gap: theme.spacing.sm,
    },
    bankItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: '#f9fafb',
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    bankName: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
});

