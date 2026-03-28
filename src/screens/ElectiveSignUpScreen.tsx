import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Pressable,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { supabase } from '../lib/supabase';
import { MobileUserMenu } from '../components/MobileUserMenu';
import { isTimberLakeCamp } from '../constants/camps';

const PERIODS = [
    { id: 'period-1', label: 'P1', time: '10:00 – 11:00 AM' },
    { id: 'period-2', label: 'P2', time: '11:00 AM – 12:00 PM' },
    { id: 'period-3', label: 'P3', time: '2:00 – 3:00 PM' },
    { id: 'period-4', label: 'P4', time: '3:00 – 4:00 PM' },
    { id: 'period-5', label: 'P5', time: '4:00 – 5:00 PM' },
    { id: 'period-6', label: 'P6', time: '5:00 – 6:00 PM' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function mondayOfWeekContaining(d: Date): string {
    const x = new Date(d);
    const day = x.getDay();
    const diff = x.getDate() - day + (day === 0 ? -6 : 1);
    x.setDate(diff);
    return x.toISOString().split('T')[0];
}

export const ElectiveSignUpScreen = ({ navigation }: { navigation: any }) => {
    const { companyId, season, companySlug } = useCompany();
    const tlc = isTimberLakeCamp(companySlug);

    const [weekStart, setWeekStart] = useState(() => mondayOfWeekContaining(new Date()));
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [selectedPeriod, setSelectedPeriod] = useState('period-1');
    const [divisions, setDivisions] = useState<any[]>([]);
    const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
    const [children, setChildren] = useState<any[]>([]);
    const [electives, setElectives] = useState<any[]>([]);
    const [signups, setSignups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [pickerChildId, setPickerChildId] = useState<string | null>(null);

    const fetchData = async () => {
        if (!companyId || !season) return;
        setLoading(true);
        try {
            const [divRes, elRes, suRes] = await Promise.all([
                supabase
                    .from('divisions')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('is_active', true)
                    .order('sort_order'),
                supabase.from('electives').select('*').eq('company_id', companyId).eq('is_active', true).order('name'),
                supabase
                    .from('elective_signups')
                    .select('*, children(name, division_id), electives(name)')
                    .eq('company_id', companyId)
                    .eq('week_start_date', weekStart)
                    .eq('day_of_week', selectedDay)
                    .eq('period', selectedPeriod),
            ]);
            if (divRes.data) setDivisions(divRes.data);
            if (elRes.data) setElectives(elRes.data);
            if (suRes.data) setSignups(suRes.data);
        } catch {
            Alert.alert('Error', 'Failed to load elective data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (companyId && season && tlc) fetchData();
        else setLoading(false);
    }, [companyId, season, weekStart, selectedDay, selectedPeriod, tlc]);

    const fetchChildrenForDivision = async (divisionId: string) => {
        if (!companyId || !season) return;
        const { data } = await supabase
            .from('children')
            .select('id, name, division_id')
            .eq('company_id', companyId)
            .eq('division_id', divisionId)
            .eq('season', season)
            .order('name');
        setChildren(data || []);
    };

    const signupByChild = useMemo(() => {
        const m: Record<string, any> = {};
        signups.forEach((s) => {
            m[s.child_id] = s;
        });
        return m;
    }, [signups]);

    const signupCountByElective = useMemo(() => {
        const c: Record<string, number> = {};
        signups.forEach((s) => {
            if (s.elective_id) c[s.elective_id] = (c[s.elective_id] || 0) + 1;
        });
        return c;
    }, [signups]);

    const shiftWeek = (dir: -1 | 1) => {
        const d = new Date(weekStart + 'T12:00:00');
        d.setDate(d.getDate() + dir * 7);
        setWeekStart(mondayOfWeekContaining(d));
    };

    const handleAssign = async (childId: string, electiveId: string | null) => {
        if (!companyId || !season) return;
        try {
            await supabase
                .from('elective_signups')
                .delete()
                .eq('company_id', companyId)
                .eq('child_id', childId)
                .eq('week_start_date', weekStart)
                .eq('day_of_week', selectedDay)
                .eq('period', selectedPeriod);

            if (electiveId) {
                const cap = electives.find((e) => e.id === electiveId)?.capacity;
                const count = signupCountByElective[electiveId] || 0;
                const already = signupByChild[childId]?.elective_id === electiveId;
                if (cap != null && cap !== '' && count >= cap && !already) {
                    Alert.alert('Full', 'This elective is at capacity.');
                    return;
                }
                const { error } = await supabase.from('elective_signups').insert({
                    company_id: companyId,
                    child_id: childId,
                    elective_id: electiveId,
                    week_start_date: weekStart,
                    day_of_week: selectedDay,
                    period: selectedPeriod,
                    season,
                });
                if (error) throw error;
            }
            setPickerChildId(null);
            await fetchData();
        } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not update signup');
        }
    };

    if (!tlc) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Elective Sign-Up</Text>
                    <MobileUserMenu navigation={navigation} />
                </View>
                <View style={styles.centered}>
                    <Text style={styles.muted}>Elective Sign-Up is only available for Timber Lake Camp.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Elective Sign-Up</Text>
                <MobileUserMenu navigation={navigation} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.secondary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll}>
                    <View style={styles.weekRow}>
                        <TouchableOpacity onPress={() => shiftWeek(-1)} style={styles.iconBtn}>
                            <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.weekText}>Week of {weekStart}</Text>
                        <TouchableOpacity onPress={() => shiftWeek(1)} style={styles.iconBtn}>
                            <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionLabel}>Day</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                        {DAYS.map((d) => (
                            <TouchableOpacity
                                key={d}
                                style={[styles.chip, selectedDay === d && styles.chipActive]}
                                onPress={() => setSelectedDay(d)}
                            >
                                <Text style={[styles.chipText, selectedDay === d && styles.chipTextActive]}>{d.slice(0, 3)}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Text style={styles.sectionLabel}>Period</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                        {PERIODS.map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                style={[styles.chip, selectedPeriod === p.id && styles.chipActive]}
                                onPress={() => setSelectedPeriod(p.id)}
                            >
                                <Text style={[styles.chipText, selectedPeriod === p.id && styles.chipTextActive]}>{p.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <Text style={styles.periodHint}>
                        {PERIODS.find((p) => p.id === selectedPeriod)?.time ?? ''}
                    </Text>

                    <Text style={styles.sectionLabel}>Division</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                        {divisions.map((d) => (
                            <TouchableOpacity
                                key={d.id}
                                style={[styles.chip, selectedDivision === d.id && styles.chipActive]}
                                onPress={() => {
                                    setSelectedDivision(d.id);
                                    fetchChildrenForDivision(d.id);
                                }}
                            >
                                <Text
                                    style={[styles.chipText, selectedDivision === d.id && styles.chipTextActive]}
                                    numberOfLines={1}
                                >
                                    {d.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {!selectedDivision ? (
                        <Text style={styles.muted}>Select a division to list campers.</Text>
                    ) : children.length === 0 ? (
                        <Text style={styles.muted}>No campers in this division for {season}.</Text>
                    ) : (
                        children.map((c) => {
                            const su = signupByChild[c.id];
                            const electiveName = su?.electives?.name ?? (su?.elective_id ? 'Assigned' : '—');
                            return (
                                <StyledCard key={c.id} style={styles.rowCard}>
                                    <View style={styles.rowBetween}>
                                        <Text style={styles.childName}>{c.name}</Text>
                                        <TouchableOpacity
                                            style={styles.assignBtn}
                                            onPress={() => setPickerChildId(c.id)}
                                        >
                                            <Text style={styles.assignBtnText}>{electiveName}</Text>
                                            <Ionicons name="chevron-down" size={18} color={theme.colors.secondary} />
                                        </TouchableOpacity>
                                    </View>
                                </StyledCard>
                            );
                        })
                    )}
                </ScrollView>
            )}

            <Modal visible={!!pickerChildId} transparent animationType="fade">
                <Pressable style={styles.modalBackdrop} onPress={() => setPickerChildId(null)}>
                    <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.modalTitle}>Assign elective</Text>
                        <TouchableOpacity
                            style={styles.modalOption}
                            onPress={() => pickerChildId && handleAssign(pickerChildId, null)}
                        >
                            <Text style={styles.modalOptionText}>Clear assignment</Text>
                        </TouchableOpacity>
                        {electives.map((e) => {
                            const used = signupCountByElective[e.id] || 0;
                            const cap = e.capacity;
                            const full = cap != null && cap !== '' && used >= cap;
                            return (
                                <TouchableOpacity
                                    key={e.id}
                                    style={[styles.modalOption, full && styles.modalOptionDisabled]}
                                    disabled={full && signupByChild[pickerChildId!]?.elective_id !== e.id}
                                    onPress={() => pickerChildId && handleAssign(pickerChildId, e.id)}
                                >
                                    <Text style={styles.modalOptionText}>
                                        {e.name}
                                        {cap != null && cap !== '' ? ` (${used}/${cap})` : ''}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    muted: { color: theme.colors.textSecondary, marginTop: 8 },
    scroll: { padding: theme.spacing.md, paddingBottom: 48 },
    weekRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
        gap: 12,
    },
    iconBtn: { padding: 8 },
    weekText: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    chipRow: { flexDirection: 'row', marginBottom: theme.spacing.sm },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        marginRight: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    chipActive: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    chipText: { color: theme.colors.text, fontSize: 13 },
    chipTextActive: { color: '#fff', fontWeight: '600' },
    periodHint: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
    rowCard: { padding: theme.spacing.md, marginBottom: 8 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    childName: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.colors.text },
    assignBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '55%' },
    assignBtnText: { fontSize: 14, color: theme.colors.secondary, fontWeight: '600', flexShrink: 1 },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        padding: 24,
    },
    modalCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: 16,
        maxHeight: '70%',
    },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: theme.colors.text },
    modalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    modalOptionDisabled: { opacity: 0.45 },
    modalOptionText: { fontSize: 16, color: theme.colors.text },
});
