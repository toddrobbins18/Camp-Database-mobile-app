import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    Pressable,
    Alert,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { theme } from '../theme/theme';

const WEB_ORANGE = '#f97316';
const WEB_GREEN = '#15803d';
const WEB_SAGE = '#4d7c0f';

type StaffRow = {
    id: string;
    name: string;
    role: string | null;
    staff_type: string | null;
    division_id: string | null;
    email: string | null;
};

type Assignment = { staff_id: string; leader_id: string };

type DivisionRow = { id: string; name: string; gender: string; sort_order: number };

type Props = {
    visible: boolean;
    onClose: () => void;
    companyId: string;
    season: string;
};

/**
 * Parity with web BulkLeaderAssignmentDialog: Auto-Assign by Division + Manual Assignment.
 */
export function StaffLeaderAssignmentModal({ visible, onClose, companyId, season }: Props) {
    const queryClient = useQueryClient();
    const [mainTab, setMainTab] = useState<'auto' | 'manual'>('auto');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [allStaff, setAllStaff] = useState<StaffRow[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [divisions, setDivisions] = useState<DivisionRow[]>([]);
    const [selectedLeader, setSelectedLeader] = useState<string>('');
    const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'general_counselor' | 'specialist' | 'unassigned'>('all');
    const [leaderPickerOpen, setLeaderPickerOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (!companyId) return;
        setLoading(true);
        const [staffResult, divisionResult, assignmentResult] = await Promise.all([
            supabase
                .from('staff')
                .select('id, name, role, staff_type, division_id, email')
                .eq('company_id', companyId)
                .eq('season', season)
                .neq('name', 'Unknown')
                .not('name', 'is', null)
                .order('name'),
            supabase
                .from('divisions')
                .select('id, name, gender, sort_order')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('sort_order'),
            supabase
                .from('staff_leader_assignments')
                .select('staff_id, leader_id')
                .eq('company_id', companyId)
                .eq('season', season),
        ]);
        if (staffResult.error) console.warn('[LeaderAssignments] staff', staffResult.error);
        if (divisionResult.error) console.warn('[LeaderAssignments] divisions', divisionResult.error);
        if (assignmentResult.error) console.warn('[LeaderAssignments] assignments', assignmentResult.error);

        setAllStaff((staffResult.data as StaffRow[]) || []);
        setDivisions((divisionResult.data as DivisionRow[]) || []);
        setAssignments((assignmentResult.data as Assignment[]) || []);
        setLoading(false);
    }, [companyId, season]);

    useEffect(() => {
        if (visible) {
            void fetchData();
            setSearchTerm('');
            setFilterType('all');
            setMainTab('auto');
            setLeaderPickerOpen(false);
        }
    }, [visible, fetchData]);

    const getLeaderIdsForStaff = (staffId: string): string[] =>
        assignments.filter((a) => a.staff_id === staffId).map((a) => a.leader_id);

    const getStaffIdsForLeader = (leaderId: string): string[] =>
        assignments.filter((a) => a.leader_id === leaderId).map((a) => a.staff_id);

    const potentialLeaders = useMemo(() => {
        const leaderIds = new Set(assignments.map((a) => a.leader_id));
        return allStaff
            .filter(
                (s) =>
                    !!s.role?.match(/division leader|director|lead |head |asst\. |assistant /i) ||
                    leaderIds.has(s.id),
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allStaff, assignments]);

    const divisionStats = useMemo(() => {
        return divisions.map((div) => {
            const staffInDiv = allStaff.filter((s) => s.division_id === div.id);
            const dlInDiv = staffInDiv.filter((s) => s.role?.match(/division leader/i));
            const gcsInDiv = staffInDiv.filter(
                (s) => s.staff_type === 'general_counselor' || s.staff_type === 'both',
            );
            const assignedGcs = gcsInDiv.filter((s) => getLeaderIdsForStaff(s.id).length > 0);
            return {
                division: div,
                divisionLeaders: dlInDiv,
                totalGCs: gcsInDiv.length,
                assignedGCs: assignedGcs.length,
                totalStaff: staffInDiv.length,
            };
        });
    }, [divisions, allStaff, assignments]);

    useEffect(() => {
        if (selectedLeader) {
            setSelectedStaffIds(new Set(getStaffIdsForLeader(selectedLeader)));
        } else {
            setSelectedStaffIds(new Set());
        }
    }, [selectedLeader, assignments]);

    const getDivisionName = (divisionId: string | null) => {
        if (!divisionId) return '—';
        return divisions.find((d) => d.id === divisionId)?.name || '—';
    };

    const assignableStaff = useMemo(() => {
        let filtered = allStaff.filter((s) => s.id !== selectedLeader);
        if (filterType === 'general_counselor') {
            filtered = filtered.filter(
                (s) => s.staff_type === 'general_counselor' || s.staff_type === 'both',
            );
        } else if (filterType === 'specialist') {
            filtered = filtered.filter(
                (s) => s.staff_type === 'specialist' || s.staff_type === 'both',
            );
        } else if (filterType === 'unassigned') {
            filtered = filtered.filter((s) => getLeaderIdsForStaff(s.id).length === 0);
        }
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (s) =>
                    s.name.toLowerCase().includes(term) ||
                    (s.role?.toLowerCase() || '').includes(term),
            );
        }
        return filtered;
    }, [allStaff, selectedLeader, filterType, searchTerm, assignments]);

    const toggleStaff = (staffId: string) => {
        setSelectedStaffIds((prev) => {
            const next = new Set(prev);
            if (next.has(staffId)) next.delete(staffId);
            else next.add(staffId);
            return next;
        });
    };

    const handleAutoAssignByDivision = async () => {
        setSaving(true);
        let totalAssigned = 0;

        for (const stat of divisionStats) {
            if (stat.divisionLeaders.length === 0) continue;
            const dl = stat.divisionLeaders[0];
            const currentlyAssignedToThisDL = new Set(getStaffIdsForLeader(dl.id));
            const gcsToAssign = allStaff.filter(
                (s) =>
                    s.division_id === stat.division.id &&
                    (s.staff_type === 'general_counselor' || s.staff_type === 'both') &&
                    !currentlyAssignedToThisDL.has(s.id) &&
                    s.id !== dl.id,
            );
            if (gcsToAssign.length === 0) continue;

            const records = gcsToAssign.map((s) => ({
                staff_id: s.id,
                leader_id: dl.id,
                company_id: companyId,
                season,
            }));
            const { error } = await supabase
                .from('staff_leader_assignments')
                .upsert(records, { onConflict: 'staff_id,leader_id,company_id,season' });
            if (error) {
                console.warn('Auto-assign', stat.division.name, error);
            } else {
                totalAssigned += gcsToAssign.length;
            }
        }

        setSaving(false);
        Alert.alert(
            'Auto-Assignment Complete',
            totalAssigned > 0
                ? `Assigned ${totalAssigned} counselors to their Division Leaders.`
                : 'No new assignments were made. Ensure Division Leaders have division_id and staff have staff_type set.',
        );
        await fetchData();
        queryClient.invalidateQueries({ queryKey: ['staff', companyId, season] });
    };

    const handleSaveManualAssignment = async () => {
        if (!selectedLeader) return;
        setSaving(true);
        const currentlyAssigned = new Set(getStaffIdsForLeader(selectedLeader));
        const toAssign = [...selectedStaffIds].filter((id) => !currentlyAssigned.has(id));
        const toUnassign = [...currentlyAssigned].filter((id) => !selectedStaffIds.has(id));
        let errors = 0;

        if (toAssign.length > 0) {
            const records = toAssign.map((staffId) => ({
                staff_id: staffId,
                leader_id: selectedLeader,
                company_id: companyId,
                season,
            }));
            const { error } = await supabase
                .from('staff_leader_assignments')
                .upsert(records, { onConflict: 'staff_id,leader_id,company_id,season' });
            if (error) errors++;
        }

        if (toUnassign.length > 0) {
            const { error } = await supabase
                .from('staff_leader_assignments')
                .delete()
                .eq('leader_id', selectedLeader)
                .eq('company_id', companyId)
                .eq('season', season)
                .in('staff_id', toUnassign);
            if (error) errors++;
        }

        setSaving(false);
        if (errors > 0) {
            Alert.alert('Error', 'Some assignment changes failed.');
        } else {
            const leaderName = allStaff.find((s) => s.id === selectedLeader)?.name || 'Leader';
            Alert.alert(
                'Assignments Saved',
                `${toAssign.length} assigned, ${toUnassign.length} unassigned for ${leaderName}.`,
            );
        }
        await fetchData();
        queryClient.invalidateQueries({ queryKey: ['staff', companyId, season] });
    };

    const selectedLeaderName = allStaff.find((s) => s.id === selectedLeader)?.name;

    const staffTypeShort = (t: string | null) => {
        if (!t) return '';
        if (t === 'general_counselor') return 'GC';
        if (t === 'specialist') return 'Spec';
        if (t === 'both') return 'Both';
        return t;
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Leader Assignments</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close">
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tabRow}>
                        <TouchableOpacity
                            style={[styles.tabBtn, mainTab === 'auto' && styles.tabBtnOn]}
                            onPress={() => setMainTab('auto')}
                        >
                            <Text style={[styles.tabBtnText, mainTab === 'auto' && styles.tabBtnTextOn]}>
                                Auto-Assign by Division
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabBtn, mainTab === 'manual' && styles.tabBtnOn]}
                            onPress={() => setMainTab('manual')}
                        >
                            <Text style={[styles.tabBtnText, mainTab === 'manual' && styles.tabBtnTextOn]}>
                                Manual Assignment
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color={WEB_ORANGE} />
                        </View>
                    ) : mainTab === 'auto' ? (
                        <ScrollView style={styles.bodyScroll} keyboardShouldPersistTaps="handled">
                            <View style={styles.autoHeaderRow}>
                                <Text style={styles.autoHint}>
                                    Auto-assigns General Counselors to the Division Leader in their division.
                                    Staff must have{' '}
                                    <Text style={styles.bold}>division_id</Text> and{' '}
                                    <Text style={styles.bold}>staff_type</Text> set.
                                </Text>
                                <TouchableOpacity
                                    style={[styles.autoAssignBtn, saving && { opacity: 0.7 }]}
                                    onPress={() => void handleAutoAssignByDivision()}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="sparkles" size={18} color="#fff" />
                                            <Text style={styles.autoAssignBtnText}>Auto-Assign All</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {divisionStats.map((stat) => (
                                <View key={stat.division.id} style={styles.divisionCard}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.divisionName}>{stat.division.name}</Text>
                                        <Text style={styles.divisionMeta}>
                                            {stat.totalStaff} staff • {stat.totalGCs} GCs
                                        </Text>
                                    </View>
                                    <View style={styles.divisionBadges}>
                                        {stat.divisionLeaders.length > 0 ? (
                                            <View style={styles.badgeLeader}>
                                                <Ionicons name="checkmark-circle" size={14} color={WEB_GREEN} />
                                                <Text style={styles.badgeLeaderText} numberOfLines={1}>
                                                    {stat.divisionLeaders.map((d) => d.name).join(', ')}
                                                </Text>
                                            </View>
                                        ) : (
                                            <View style={styles.badgeMuted}>
                                                <Text style={styles.badgeMutedText}>No Division Leader</Text>
                                            </View>
                                        )}
                                        <View
                                            style={[
                                                styles.badgeRatio,
                                                stat.assignedGCs === stat.totalGCs && stat.totalGCs > 0
                                                    ? styles.badgeRatioFull
                                                    : null,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.badgeRatioText,
                                                    stat.assignedGCs === stat.totalGCs && stat.totalGCs > 0
                                                        ? styles.badgeRatioTextFull
                                                        : null,
                                                ]}
                                            >
                                                {stat.assignedGCs}/{stat.totalGCs} assigned
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}

                            {divisionStats.length === 0 ? (
                                <Text style={styles.emptyText}>No divisions found.</Text>
                            ) : null}
                        </ScrollView>
                    ) : (
                        <View style={styles.manualBody}>
                            <Text style={styles.label}>Select Leader</Text>
                            <TouchableOpacity
                                style={styles.leaderSelectTrigger}
                                onPress={() => setLeaderPickerOpen(true)}
                            >
                                <Text
                                    style={
                                        selectedLeader ? styles.leaderSelectValue : styles.leaderSelectPlaceholder
                                    }
                                    numberOfLines={1}
                                >
                                    {selectedLeader
                                        ? `${selectedLeaderName} — ${allStaff.find((s) => s.id === selectedLeader)?.role || 'No role'}`
                                        : 'Choose a leader to assign staff to...'}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>

                            {!!selectedLeader && (
                                <>
                                    <View style={styles.searchRow}>
                                        <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search staff..."
                                            value={searchTerm}
                                            onChangeText={setSearchTerm}
                                            placeholderTextColor={theme.colors.textSecondary}
                                        />
                                    </View>

                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                                        {(
                                            [
                                                ['all', 'All Staff'],
                                                ['general_counselor', 'General Counselors'],
                                                ['specialist', 'Specialists'],
                                                ['unassigned', 'Unassigned Only'],
                                            ] as const
                                        ).map(([key, label]) => (
                                            <TouchableOpacity
                                                key={key}
                                                style={[styles.filterChip, filterType === key && styles.filterChipOn]}
                                                onPress={() => setFilterType(key)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.filterChipText,
                                                        filterType === key && styles.filterChipTextOn,
                                                    ]}
                                                >
                                                    {label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    <View style={styles.selectAllRow}>
                                        <Text style={styles.countMuted}>
                                            {selectedStaffIds.size} selected of {assignableStaff.length} shown
                                        </Text>
                                        <View style={styles.selectAllBtns}>
                                            <TouchableOpacity
                                                style={styles.outlineBtn}
                                                onPress={() =>
                                                    setSelectedStaffIds(new Set(assignableStaff.map((s) => s.id)))
                                                }
                                            >
                                                <Text style={styles.outlineBtnText}>Select All</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.outlineBtn}
                                                onPress={() => setSelectedStaffIds(new Set())}
                                            >
                                                <Text style={styles.outlineBtnText}>Deselect All</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <FlatList
                                        data={assignableStaff}
                                        keyExtractor={(item) => item.id}
                                        style={styles.staffList}
                                        keyboardShouldPersistTaps="handled"
                                        ListEmptyComponent={
                                            <Text style={styles.emptyText}>No staff match your filters.</Text>
                                        }
                                        renderItem={({ item }) => {
                                            const on = selectedStaffIds.has(item.id);
                                            const otherLeaders = getLeaderIdsForStaff(item.id).filter(
                                                (lid) => lid !== selectedLeader,
                                            );
                                            const otherNames = otherLeaders
                                                .map((lid) => allStaff.find((s) => s.id === lid)?.name)
                                                .filter(Boolean)
                                                .join(', ');
                                            return (
                                                <TouchableOpacity
                                                    style={[styles.staffRow, on && styles.staffRowOn]}
                                                    onPress={() => toggleStaff(item.id)}
                                                    activeOpacity={0.85}
                                                >
                                                    <Ionicons
                                                        name={on ? 'checkbox' : 'square-outline'}
                                                        size={22}
                                                        color={on ? WEB_ORANGE : theme.colors.textSecondary}
                                                    />
                                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                                        <Text style={styles.staffName}>{item.name}</Text>
                                                        <Text style={styles.staffMeta} numberOfLines={1}>
                                                            {item.role || 'No role'} • {getDivisionName(item.division_id)}
                                                        </Text>
                                                        {otherNames ? (
                                                            <Text style={styles.alsoText} numberOfLines={1}>
                                                                Also → {otherNames}
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                    {item.staff_type ? (
                                                        <View style={styles.typePill}>
                                                            <Text style={styles.typePillText}>
                                                                {staffTypeShort(item.staff_type)}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                </TouchableOpacity>
                                            );
                                        }}
                                    />
                                </>
                            )}

                            <View style={styles.footer}>
                                <TouchableOpacity style={styles.closeFooterBtn} onPress={onClose}>
                                    <Text style={styles.closeFooterBtnText}>Close</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.saveFooterBtn,
                                        (!selectedLeader || saving) && { opacity: 0.5 },
                                    ]}
                                    onPress={() => void handleSaveManualAssignment()}
                                    disabled={!selectedLeader || saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.saveFooterBtnText}>Save Assignments</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <Modal visible={leaderPickerOpen} transparent animationType="fade">
                        <Pressable style={styles.pickerOverlay} onPress={() => setLeaderPickerOpen(false)}>
                            <View style={styles.pickerSheet}>
                                <Text style={styles.pickerTitle}>Choose leader</Text>
                                <FlatList
                                    data={potentialLeaders}
                                    keyExtractor={(item) => item.id}
                                    style={{ maxHeight: 360 }}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.pickerRow}
                                            onPress={() => {
                                                setSelectedLeader(item.id);
                                                setLeaderPickerOpen(false);
                                            }}
                                        >
                                            <Text style={styles.pickerRowTitle}>{item.name}</Text>
                                            <Text style={styles.pickerRowSub}>{item.role || 'No role'}</Text>
                                        </TouchableOpacity>
                                    )}
                                    ListEmptyComponent={
                                        <Text style={styles.emptyText}>No leader candidates found.</Text>
                                    }
                                />
                            </View>
                        </Pressable>
                    </Modal>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '92%',
        paddingBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    tabRow: {
        flexDirection: 'row',
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.sm,
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        padding: 4,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    tabBtnOn: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: WEB_GREEN,
    },
    tabBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
    tabBtnTextOn: { color: theme.colors.text },
    bodyScroll: { maxHeight: 520, paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.sm },
    autoHeaderRow: { marginBottom: theme.spacing.md },
    autoHint: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18, marginBottom: theme.spacing.sm },
    bold: { fontWeight: '700', color: theme.colors.text },
    autoAssignBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: WEB_GREEN,
        paddingVertical: 12,
        borderRadius: theme.borderRadius.md,
    },
    autoAssignBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    divisionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    divisionName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    divisionMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
    divisionBadges: { alignItems: 'flex-end', gap: 6, maxWidth: '48%' },
    badgeLeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        maxWidth: '100%',
    },
    badgeLeaderText: { fontSize: 11, fontWeight: '600', color: theme.colors.text, flexShrink: 1 },
    badgeMuted: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeMutedText: { fontSize: 11, color: theme.colors.textSecondary },
    badgeRatio: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeRatioFull: { backgroundColor: WEB_GREEN, borderColor: WEB_GREEN },
    badgeRatioText: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
    badgeRatioTextFull: { color: '#fff' },
    manualBody: { paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.sm, flex: 1, minHeight: 200 },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 6, color: theme.colors.text },
    leaderSelectTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: theme.spacing.md,
    },
    leaderSelectPlaceholder: { flex: 1, fontSize: 15, color: theme.colors.textSecondary },
    leaderSelectValue: { flex: 1, fontSize: 15, color: theme.colors.text },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 10,
        marginBottom: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        paddingLeft: 8,
        fontSize: 15,
        color: theme.colors.text,
    },
    filterScroll: { marginBottom: theme.spacing.sm },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: 8,
    },
    filterChipOn: { borderColor: WEB_GREEN, backgroundColor: '#f0fdf4' },
    filterChipText: { fontSize: 12, color: theme.colors.text },
    filterChipTextOn: { fontWeight: '700', color: WEB_GREEN },
    selectAllRow: { marginBottom: 8 },
    countMuted: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 6 },
    selectAllBtns: { flexDirection: 'row', gap: 8 },
    outlineBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    outlineBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
    staffList: { maxHeight: 280, marginBottom: theme.spacing.sm },
    staffRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
    },
    staffRowOn: { backgroundColor: '#fff7ed' },
    staffName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    staffMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    alsoText: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
    typePill: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: 6,
    },
    typePillText: { fontSize: 10, fontWeight: '600', color: theme.colors.text },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        marginTop: 'auto',
    },
    closeFooterBtn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    closeFooterBtnText: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    saveFooterBtn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: theme.borderRadius.md,
        backgroundColor: WEB_SAGE,
        minWidth: 140,
        alignItems: 'center',
    },
    saveFooterBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    centered: { paddingVertical: 48, alignItems: 'center' },
    emptyText: { textAlign: 'center', color: theme.colors.textSecondary, paddingVertical: 24, fontSize: 14 },
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: 24,
    },
    pickerSheet: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 12,
        maxHeight: '70%',
    },
    pickerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    pickerRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    pickerRowTitle: { fontSize: 15, fontWeight: '600' },
    pickerRowSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
});
