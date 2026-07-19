import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCompany } from '../contexts/CompanyContext';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { getAwardCategoryChips } from '../lib/awardCategory';
import { PersonThreeDayOutlook } from '../components/PersonThreeDayOutlook';
import { StyledCard } from '../components/StyledCard';

const TABS = [
    'Overview',
    'Birthday',
    'Allergies',
    'Health Center',
    'Notes',
    'Evaluations',
    'Achievements',
    'Appointments',
];

export const StaffDetailScreen = ({ route, navigation }: any) => {
    const { companyId, season } = useCompany();
    const staffId = route?.params?.staff?.id as string | undefined;

    const { data: loadedStaff, isLoading: staffLoading } = useQuery({
        queryKey: ['staff_detail', staffId, companyId, season],
        queryFn: async () => {
            if (!staffId) return null;

            const { data: staffData, error: staffError } = await supabase
                .from('staff')
                .select('*, division:division_id(id, name), supervisor:leader_id(id, name, role)')
                .eq('id', staffId)
                .single();

            if (staffError) throw staffError;

            const { data: leaderAssignmentData } = await supabase
                .from('staff_leader_assignments')
                .select('id, leader:leader_id(id, name, role)')
                .eq('staff_id', staffId)
                .eq('company_id', companyId || '')
                .eq('season', season || '');

            return {
                ...staffData,
                assignedLeaders: leaderAssignmentData || [],
            };
        },
        enabled: !!staffId,
    });

    const [staff, setStaff] = useState<any>(route?.params?.staff ?? {});
    const [activeTab, setActiveTab] = useState('Overview');
    const [cannotEvalVisible, setCannotEvalVisible] = useState(false);
    const [editVisible, setEditVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        name: route?.params?.staff?.name || '',
        role: route?.params?.staff?.role || '',
        department: route?.params?.staff?.department || '',
        email: route?.params?.staff?.email || '',
        phone: route?.params?.staff?.phone || '',
        staff_type: route?.params?.staff?.staff_type || '',
    });

    const displayStaff = loadedStaff ?? staff;
    const assignedLeaders = (displayStaff as any)?.assignedLeaders || [];

    const { data: achievements = [], isLoading: achievementsLoading } = useQuery({
        queryKey: ['staff_awards', displayStaff?.id, (displayStaff as any)?.person_id, companyId],
        queryFn: async () => {
            if (!displayStaff?.id || !companyId) return [];

            let staffIds: string[] = [displayStaff.id];
            const personId = (displayStaff as any)?.person_id;
            if (personId) {
                const { data: siblingRows } = await supabase
                    .from('staff')
                    .select('id')
                    .eq('person_id', personId)
                    .eq('company_id', companyId);
                if (siblingRows?.length) {
                    staffIds = [...new Set(siblingRows.map((member: { id: string }) => member.id))];
                }
            }

            const { data, error } = await supabase
                .from('awards')
                .select('*')
                .eq('company_id', companyId)
                .in('staff_id', staffIds)
                .order('date', { ascending: false });
            if (error) throw error;

            return (data || []).map((award: any) => ({
                id: award.id,
                title: award.title || 'Award',
                description: (award.description || '').trim(),
                category: award.category ?? null,
                date: award.date
                    ? new Date(String(award.date).includes('T') ? award.date : `${award.date}T12:00:00`).toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                      })
                    : '',
            }));
        },
        enabled: !!displayStaff?.id && !!companyId,
    });

    const initials = (displayStaff?.name || 'NA')
        .split(' ')
        .map((part: string) => part[0] || '')
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const rating = Number(displayStaff?.averageRating || 0).toFixed(1);
    const status = (displayStaff?.status || 'active').toLowerCase();
    const normalizedStaffType = useMemo(() => {
        const raw = String(displayStaff?.staff_type || '').trim().toLowerCase();
        return raw;
    }, [displayStaff?.staff_type]);

    const handleEvaluatePress = () => {
        if (!normalizedStaffType || normalizedStaffType === 'not_specified') {
            setCannotEvalVisible(true);
            return;
        }
        Alert.alert('Evaluate Staff', 'Evaluation form flow can be connected next.');
    };

    const openEditModal = () => {
        setEditForm({
            name: staff?.name || '',
            role: staff?.role || '',
            department: staff?.department || '',
            email: staff?.email || '',
            phone: staff?.phone || '',
            staff_type: staff?.staff_type || '',
        });
        setEditVisible(true);
    };

    const saveProfile = async () => {
        if (!staff?.id) {
            Alert.alert('Error', 'Missing staff record id.');
            return;
        }
        if (!editForm.name.trim()) {
            Alert.alert('Required', 'Name is required.');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                name: editForm.name.trim(),
                role: editForm.role.trim() || null,
                department: editForm.department.trim() || null,
                email: editForm.email.trim() || null,
                phone: editForm.phone.trim() || null,
                staff_type: editForm.staff_type.trim() || null,
            };

            const { data, error } = await supabase
                .from('staff')
                .update(payload)
                .eq('id', staff.id)
                .select('*')
                .single();

            if (error) throw error;
            setStaff((prev: any) => ({ ...prev, ...(data || payload) }));
            setEditVisible(false);
            Alert.alert('Saved', 'Staff profile updated successfully.');
        } catch (e: any) {
            Alert.alert('Save failed', e?.message || 'Unable to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    if (staffLoading && staffId) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.primaryBtn} onPress={handleEvaluatePress}>
                            <Ionicons name="clipboard-outline" size={16} color="#fff" />
                            <Text style={styles.primaryBtnText}>Evaluate Staff</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={openEditModal}>
                            <Ionicons name="pencil-outline" size={16} color="#fff" />
                            <Text style={styles.primaryBtnText}>Edit Profile</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.topIdentityRow}>
                    <View style={styles.avatarLarge}>
                        <Text style={styles.avatarLargeText}>{initials}</Text>
                    </View>
                    <View style={styles.nameBlock}>
                        <Text style={styles.name}>{displayStaff?.name || 'Staff Member'}</Text>
                        <Text style={styles.role}>{displayStaff?.role || 'No role set'}</Text>
                    </View>
                    <View style={styles.ratingBlock}>
                        <View style={styles.ratingNumberRow}>
                            <Ionicons name="star" size={18} color={theme.colors.warning} />
                            <Text style={styles.ratingNumber}>{rating}</Text>
                        </View>
                        <Text style={styles.ratingLabel}>Average Rating</Text>
                        <View style={styles.statusPill}>
                            <Text style={styles.statusPillText}>{status}</Text>
                        </View>
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
                    {TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.activeTab]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {activeTab === 'Achievements' ? (
                    <View>
                        <Text style={styles.achievementsCountText}>
                            {achievementsLoading ? 'Loading...' : `${achievements.length} total achievements`}
                        </Text>
                        {achievementsLoading ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 16 }} />
                        ) : achievements.length === 0 ? (
                            <StyledCard style={styles.infoCard}>
                                <Text style={styles.emptyText}>No awards recorded yet</Text>
                            </StyledCard>
                        ) : (
                            achievements.map((achievement) => {
                                const categoryChips = getAwardCategoryChips(achievement.category);
                                return (
                                    <StyledCard key={achievement.id} style={styles.infoCard}>
                                        <Text style={styles.cardTitle}>{achievement.title}</Text>
                                        {achievement.description ? (
                                            <Text style={styles.cardSubtitle}>{achievement.description}</Text>
                                        ) : null}
                                        {categoryChips.length > 0 ? (
                                            <View style={styles.chipRow}>
                                                {categoryChips.map((chip) => (
                                                    <View key={chip} style={styles.chip}>
                                                        <Text style={styles.chipText}>{chip}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        ) : null}
                                        <Text style={styles.fieldValue}>{achievement.date}</Text>
                                    </StyledCard>
                                );
                            })
                        )}
                    </View>
                ) : (
                <View style={styles.cardsRow}>
                    {displayStaff?.id && companyId ? (
                        <PersonThreeDayOutlook
                            personType="staff"
                            personId={displayStaff.id}
                            companyId={companyId}
                            season={season}
                            staffName={displayStaff.name}
                        />
                    ) : null}
                    <View style={styles.infoCard}>
                        <Text style={styles.cardTitle}>Contact Information</Text>
                        <Text style={styles.cardSubtitle}>Professional details</Text>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Email</Text>
                            <Text style={styles.fieldValue}>{staff?.email || 'Not provided'}</Text>
                        </View>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Phone</Text>
                            <Text style={styles.fieldValue}>{staff?.phone || 'Not provided'}</Text>
                        </View>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Department</Text>
                            <Text style={styles.fieldValue}>{displayStaff?.department || 'Not provided'}</Text>
                        </View>
                        {displayStaff?.division?.name ? (
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>Division</Text>
                                <Text style={styles.fieldValue}>{displayStaff.division.name}</Text>
                            </View>
                        ) : null}
                        {displayStaff?.supervisor ? (
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>Reports To</Text>
                                <Text style={styles.fieldValue}>
                                    {displayStaff.supervisor.name}
                                    {displayStaff.supervisor.role ? ` (${displayStaff.supervisor.role})` : ''}
                                </Text>
                            </View>
                        ) : null}
                        {assignedLeaders.length > 0 ? (
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>Assigned Leaders</Text>
                                <Text style={styles.fieldValue}>
                                    {assignedLeaders
                                        .map((a: any) => {
                                            const name = a.leader?.name || 'Unknown';
                                            const role = a.leader?.role ? ` (${a.leader.role})` : '';
                                            return `${name}${role}`;
                                        })
                                        .join(', ')}
                                </Text>
                            </View>
                        ) : null}
                        {Array.isArray(displayStaff?.specialty_sports) && displayStaff.specialty_sports.length > 0 ? (
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>Sport Assignments</Text>
                                <Text style={styles.fieldValue}>{displayStaff.specialty_sports.join(', ')}</Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.infoCard}>
                        <Text style={styles.cardTitle}>Performance Summary</Text>
                        <Text style={styles.cardSubtitle}>Recent evaluation metrics</Text>
                        <View style={styles.metricRow}>
                            <Text style={styles.metricLabel}>Total Evaluations</Text>
                            <Text style={styles.metricValue}>0</Text>
                        </View>
                        <View style={styles.metricRow}>
                            <Text style={styles.metricLabel}>Average Rating</Text>
                            <Text style={styles.metricValue}>{rating}</Text>
                        </View>
                        <View style={styles.metricRow}>
                            <Text style={styles.metricLabel}>Status</Text>
                            <View style={styles.statusPill}>
                                <Text style={styles.statusPillText}>{status}</Text>
                            </View>
                        </View>
                    </View>
                </View>
                )}
            </ScrollView>

            <Modal
                visible={cannotEvalVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setCannotEvalVisible(false)}
            >
                <Pressable style={styles.centerOverlay} onPress={() => setCannotEvalVisible(false)}>
                    <Pressable style={styles.cannotEvalCard} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.cannotEvalHeader}>
                            <Text style={styles.cannotEvalTitle}>Cannot Evaluate</Text>
                            <TouchableOpacity onPress={() => setCannotEvalVisible(false)}>
                                <Ionicons name="close-circle-outline" size={24} color="#2563eb" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.cannotEvalText}>
                            This staff member needs a staff type assigned before they can be evaluated.
                            Please edit their profile and set their staff type.
                        </Text>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={editVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setEditVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.editOverlay}
                >
                    <Pressable style={styles.editOverlay} onPress={() => setEditVisible(false)}>
                        <Pressable style={styles.editCard} onPress={(e) => e.stopPropagation()}>
                            <View style={styles.editHeader}>
                                <Text style={styles.editTitle}>Edit Profile</Text>
                                <TouchableOpacity onPress={() => setEditVisible(false)}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.editBody} keyboardShouldPersistTaps="handled">
                                <Text style={styles.inputLabel}>Name *</Text>
                                <TextInput
                                    value={editForm.name}
                                    onChangeText={(text) => setEditForm((prev) => ({ ...prev, name: text }))}
                                    style={styles.input}
                                    placeholder="Full name"
                                />
                                <Text style={styles.inputLabel}>Role</Text>
                                <TextInput
                                    value={editForm.role}
                                    onChangeText={(text) => setEditForm((prev) => ({ ...prev, role: text }))}
                                    style={styles.input}
                                    placeholder="Role"
                                />
                                <Text style={styles.inputLabel}>Department</Text>
                                <TextInput
                                    value={editForm.department}
                                    onChangeText={(text) => setEditForm((prev) => ({ ...prev, department: text }))}
                                    style={styles.input}
                                    placeholder="Department"
                                />
                                <Text style={styles.inputLabel}>Email</Text>
                                <TextInput
                                    value={editForm.email}
                                    onChangeText={(text) => setEditForm((prev) => ({ ...prev, email: text }))}
                                    style={styles.input}
                                    placeholder="Email"
                                    keyboardType="email-address"
                                />
                                <Text style={styles.inputLabel}>Phone</Text>
                                <TextInput
                                    value={editForm.phone}
                                    onChangeText={(text) => setEditForm((prev) => ({ ...prev, phone: text }))}
                                    style={styles.input}
                                    placeholder="Phone"
                                    keyboardType="phone-pad"
                                />
                                <Text style={styles.inputLabel}>Staff Type</Text>
                                <TextInput
                                    value={editForm.staff_type}
                                    onChangeText={(text) => setEditForm((prev) => ({ ...prev, staff_type: text }))}
                                    style={styles.input}
                                    placeholder="general_counselor / specialist / both / not_specified"
                                />
                            </ScrollView>
                            <View style={styles.editFooter}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditVisible(false)}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveBtn, isSaving && styles.disabledBtn]}
                                    onPress={saveProfile}
                                    disabled={isSaving}
                                >
                                    <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { padding: theme.spacing.md, paddingTop: theme.spacing.lg, paddingBottom: 40 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
    },
    headerActions: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        flex: 1,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#2563eb',
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#2563eb',
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    topIdentityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    avatarLarge: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#dbeafe',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLargeText: { fontSize: 22, fontWeight: '700', color: '#1d4ed8' },
    nameBlock: { flex: 1, minWidth: 0 },
    name: { fontSize: 30, fontWeight: '700', color: theme.colors.text },
    role: { fontSize: 20, color: theme.colors.textSecondary, marginTop: 2 },
    ratingBlock: { alignItems: 'flex-end' },
    ratingNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingNumber: { fontSize: 36, fontWeight: '700', color: theme.colors.text },
    ratingLabel: { fontSize: 12, color: theme.colors.textSecondary },
    statusPill: {
        marginTop: 4,
        backgroundColor: '#dcfce7',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    statusPillText: { color: '#15803d', fontSize: 12, fontWeight: '700' },
    tabsScroll: { marginBottom: theme.spacing.md },
    tab: {
        marginRight: 8,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#e5e7eb',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    activeTab: { backgroundColor: '#f3f4f6' },
    tabText: { color: theme.colors.textSecondary, fontWeight: '600', fontSize: 12 },
    activeTabText: { color: theme.colors.text },
    achievementsCountText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.textSecondary,
        fontSize: 16,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
        marginBottom: 8,
    },
    chip: {
        backgroundColor: '#dbeafe',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    chipText: {
        color: '#1d4ed8',
        fontSize: 12,
        fontWeight: '600',
    },
    cardsRow: { gap: theme.spacing.md },
    infoCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
    },
    cardTitle: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
    cardSubtitle: { fontSize: 18, color: theme.colors.textSecondary, marginBottom: 14 },
    fieldGroup: { marginBottom: 10 },
    fieldLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 2, textTransform: 'uppercase' },
    fieldValue: { fontSize: 16, color: theme.colors.text, fontWeight: '500' },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        padding: 10,
        backgroundColor: '#f3f4f6',
        borderRadius: theme.borderRadius.md,
    },
    metricLabel: { fontSize: 15, color: theme.colors.textSecondary },
    metricValue: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
    centerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
    },
    editOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
        alignItems: 'stretch',
    },
    cannotEvalCard: {
        width: '100%',
        maxWidth: 640,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 18,
    },
    cannotEvalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cannotEvalTitle: {
        fontSize: 30,
        fontWeight: '700',
        color: theme.colors.text,
    },
    cannotEvalText: {
        fontSize: 20,
        lineHeight: 28,
        color: theme.colors.textSecondary,
    },
    editCard: {
        width: '100%',
        maxWidth: '100%',
        maxHeight: '85%',
        backgroundColor: '#fff',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    },
    editHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingBottom: 10,
    },
    editTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.text,
    },
    editBody: {
        marginTop: 8,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 6,
        marginTop: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 9,
        color: theme.colors.text,
        backgroundColor: '#fff',
    },
    editFooter: {
        marginTop: 12,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: 12,
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    cancelBtnText: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    saveBtn: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: '#2563eb',
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
    disabledBtn: {
        opacity: 0.65,
    },
});
