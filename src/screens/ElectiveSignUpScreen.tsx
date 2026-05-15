import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    TextInput,
    Platform,
    KeyboardAvoidingView,
    Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { supabase } from '../lib/supabase';
import { MobileUserMenu } from '../components/MobileUserMenu';
import { isTimberLakeCamp } from '../constants/camps';
import { useRosterDivisionFilter } from '../api/campers';
import { ensureTimberLakeElectives } from '../api/ensureTimberLakeElectives';
import { confirmAppAlert, showAppAlert } from '../utils/showAppAlert';
import { enqueueSync, getCachedJson, isOnlineNow, setCachedJson } from '../offline/engine';

/** Matches lovable-web-app ElectiveSignUp.tsx */
const PERIODS = [
    { id: 'period-1', label: 'Period 1', time: '10:00 – 11:00 AM' },
    { id: 'period-2', label: 'Period 2', time: '11:00 AM – 12:00 PM' },
    { id: 'period-3', label: 'Period 3', time: '2:00 – 3:00 PM' },
    { id: 'period-4', label: 'Period 4', time: '3:00 – 4:00 PM' },
    { id: 'period-5', label: 'Period 5', time: '4:00 – 5:00 PM' },
    { id: 'period-6', label: 'Period 6', time: '5:00 – 6:00 PM' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function mondayOfWeekContaining(d: Date): string {
    const x = new Date(d);
    const day = x.getDay();
    const diff = x.getDate() - day + (day === 0 ? -6 : 1);
    x.setDate(diff);
    return x.toISOString().split('T')[0];
}

function parseYmd(ymd: string): Date {
    const [y, m, day] = ymd.split('-').map(Number);
    return new Date(y, m - 1, day);
}

type TabId = 'signup' | 'rosters' | 'analytics' | 'history' | 'settings';

export const ElectiveSignUpScreen = ({ navigation }: { navigation: any }) => {
    const insets = useSafeAreaInsets();
    const { companyId, season, companySlug } = useCompany();
    const tlc = isTimberLakeCamp(companySlug);
    const rosterDivisionFilter = useRosterDivisionFilter(companyId);

    const [weekStart, setWeekStart] = useState(() => mondayOfWeekContaining(new Date()));
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [selectedPeriod, setSelectedPeriod] = useState('period-1');
    const [divisions, setDivisions] = useState<any[]>([]);
    const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
    const [children, setChildren] = useState<any[]>([]);
    const [electives, setElectives] = useState<any[]>([]);
    const [signups, setSignups] = useState<any[]>([]);
    const [allChildren, setAllChildren] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<TabId>('signup');
    const [selectedElectiveFilter, setSelectedElectiveFilter] = useState('all');
    const [analyticsDivision, setAnalyticsDivision] = useState('all');

    const [historySearch, setHistorySearch] = useState('');
    const [historyDivision, setHistoryDivision] = useState('all');
    const [historyResults, setHistoryResults] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyChildId, setHistoryChildId] = useState<string | null>(null);

    const [addElectiveOpen, setAddElectiveOpen] = useState(false);
    const [newElectiveName, setNewElectiveName] = useState('');
    const [newElectiveCapacity, setNewElectiveCapacity] = useState<string>('10');
    const [editingCapacities, setEditingCapacities] = useState<Record<string, number | ''>>({});

    const [assignChildId, setAssignChildId] = useState<string | null>(null);
    const [electivesLoading, setElectivesLoading] = useState(false);
    const [showDaySheet, setShowDaySheet] = useState(false);
    const [showPeriodSheet, setShowPeriodSheet] = useState(false);
    const [showDivisionSheet, setShowDivisionSheet] = useState(false);
    const [showRosterElectiveSheet, setShowRosterElectiveSheet] = useState(false);
    const [showAnalyticsDivSheet, setShowAnalyticsDivSheet] = useState(false);
    const [showHistoryDivSheet, setShowHistoryDivSheet] = useState(false);
    const [showWeekDatePicker, setShowWeekDatePicker] = useState(false);

    /** Stable dep: roster filter array identity can change without content changing. */
    const rosterDivisionDataKey = useMemo(
        () => JSON.stringify(rosterDivisionFilter.data ?? null),
        [rosterDivisionFilter.data]
    );

    const fetchData = useCallback(async () => {
        if (!companyId || !season || !rosterDivisionFilter.isFetched) return;
        const filterIds = rosterDivisionFilter.data ?? null;
        const hasRestriction = filterIds !== null && filterIds.length > 0;
        setLoading(true);
        try {
            if (tlc) {
                const { error: ensureErr } = await ensureTimberLakeElectives(companyId);
                if (ensureErr) console.warn('[ElectiveSignUp] ensure default electives', ensureErr);
            }
            let divQ = supabase
                .from('divisions')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (hasRestriction && filterIds) {
                divQ = divQ.in('id', filterIds);
            }

            const [divRes, electivesRes, signupsRes, allChildrenRes] = await Promise.all([
                divQ,
                supabase.from('electives').select('*').eq('company_id', companyId).order('name'),
                supabase
                    .from('elective_signups')
                    .select('*, children(name, division_id), electives(name)')
                    .eq('company_id', companyId)
                    .eq('week_start_date', weekStart)
                    .eq('day_of_week', selectedDay)
                    .eq('period', selectedPeriod),
                supabase
                    .from('children')
                    .select('id, name, division_id')
                    .eq('company_id', companyId)
                    .eq('season', season)
                    .order('name'),
            ]);

            const rawDivs = divRes.data || [];
            setDivisions([...rawDivs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
            if (electivesRes.error) {
                console.warn('[ElectiveSignUp] electives query', electivesRes.error.message);
            }
            const rawElectives = electivesRes.data || [];
            setElectives(rawElectives.filter((e: { is_active?: boolean | null }) => e.is_active !== false));
            if (signupsRes.data) setSignups(signupsRes.data);
            if (allChildrenRes.data) setAllChildren(allChildrenRes.data);
            await setCachedJson(`elective_signup_bundle:${companyId}:${season}:${weekStart}:${selectedDay}:${selectedPeriod}`, {
                divisions: [...rawDivs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
                electives: rawElectives.filter((e: { is_active?: boolean | null }) => e.is_active !== false),
                signups: signupsRes.data || [],
                allChildren: allChildrenRes.data || [],
            });
        } catch {
            const cached = await getCachedJson<{
                divisions: any[];
                electives: any[];
                signups: any[];
                allChildren: any[];
            }>(`elective_signup_bundle:${companyId}:${season}:${weekStart}:${selectedDay}:${selectedPeriod}`);
            if (cached) {
                setDivisions(cached.divisions || []);
                setElectives(cached.electives || []);
                setSignups(cached.signups || []);
                setAllChildren(cached.allChildren || []);
            } else {
                Alert.alert('Error', 'Failed to load elective data.');
            }
        } finally {
            setLoading(false);
        }
    }, [
        companyId,
        season,
        weekStart,
        selectedDay,
        selectedPeriod,
        rosterDivisionFilter.isFetched,
        rosterDivisionDataKey,
        tlc,
    ]);

    useEffect(() => {
        if (companyId && season && tlc) fetchData();
        else setLoading(false);
    }, [companyId, season, tlc, fetchData]);

    /** Refetch electives when opening assign sheet — fixes empty list if initial load missed rows (RLS, is_active null). */
    useEffect(() => {
        if (!assignChildId || !companyId || !tlc) {
            setElectivesLoading(false);
            return;
        }
        let cancelled = false;
        setElectivesLoading(true);
        (async () => {
            const { error: ensureErr } = await ensureTimberLakeElectives(companyId);
            if (ensureErr) console.warn('[ElectiveSignUp] ensure electives (assign sheet)', ensureErr);
            const { data, error } = await supabase
                .from('electives')
                .select('*')
                .eq('company_id', companyId)
                .order('name');
            if (cancelled) return;
            setElectivesLoading(false);
            if (error) {
                console.warn('[ElectiveSignUp] electives refetch', error.message);
                Alert.alert('Could not load electives', error.message);
                return;
            }
            setElectives((data || []).filter((e: { is_active?: boolean | null }) => e.is_active !== false));
        })();
        return () => {
            cancelled = true;
        };
    }, [assignChildId, companyId, tlc]);

    const fetchChildrenForDivision = async (divisionId: string) => {
        if (!companyId || !season) return;
        const cacheKey = `elective_children:${companyId}:${season}:${divisionId}`;
        try {
            const { data } = await supabase
                .from('children')
                .select('id, name, division_id')
                .eq('company_id', companyId)
                .eq('division_id', divisionId)
                .eq('season', season)
                .order('name');
            setChildren(data || []);
            await setCachedJson(cacheKey, data || []);
        } catch {
            setChildren((await getCachedJson<any[]>(cacheKey)) || []);
        }
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

    const rostersByElective = useMemo(() => {
        const grouped: Record<string, { name: string; campers: any[] }> = {};
        signups.forEach((s) => {
            const eName = (s.electives as any)?.name || 'Unknown';
            const eId = s.elective_id;
            if (!grouped[eId]) grouped[eId] = { name: eName, campers: [] };
            grouped[eId].campers.push(s);
        });
        return Object.entries(grouped).sort(([, a], [, b]) => a.name.localeCompare(b.name));
    }, [signups]);

    const analyticsData = useMemo(() => {
        let filtered = signups;
        if (analyticsDivision !== 'all') {
            filtered = signups.filter((s) => (s.children as any)?.division_id === analyticsDivision);
        }
        const counts: Record<string, number> = {};
        filtered.forEach((s) => {
            const name = (s.electives as any)?.name || 'Unknown';
            counts[name] = (counts[name] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [signups, analyticsDivision]);

    const filteredHistoryChildren = useMemo(() => {
        let filtered = allChildren;
        if (historyDivision !== 'all') {
            filtered = filtered.filter((c) => c.division_id === historyDivision);
        }
        if (historySearch.trim()) {
            const q = historySearch.toLowerCase();
            filtered = filtered.filter((c) => (c.name || '').toLowerCase().includes(q));
        }
        return filtered;
    }, [allChildren, historyDivision, historySearch]);

    const historyChildName = allChildren.find((c) => c.id === historyChildId)?.name;

    const periodLabel = PERIODS.find((p) => p.id === selectedPeriod);

    const shiftWeek = (dir: -1 | 1) => {
        const d = new Date(weekStart + 'T12:00:00');
        d.setDate(d.getDate() + dir * 7);
        setWeekStart(mondayOfWeekContaining(d));
    };

    const handleAssign = async (childId: string, electiveId: string | null) => {
        if (!companyId || !season) return;
        try {
            if (await isOnlineNow()) {
                await supabase
                    .from('elective_signups')
                    .delete()
                    .eq('company_id', companyId)
                    .eq('child_id', childId)
                    .eq('week_start_date', weekStart)
                    .eq('day_of_week', selectedDay)
                    .eq('period', selectedPeriod);

                if (electiveId) {
                    const rawCap = electives.find((e) => e.id === electiveId)?.capacity;
                    const capNum =
                        rawCap != null && rawCap !== ''
                            ? typeof rawCap === 'number'
                                ? rawCap
                                : parseInt(String(rawCap), 10)
                            : NaN;
                    const count = signupCountByElective[electiveId] || 0;
                    const already = signupByChild[childId]?.elective_id === electiveId;
                    if (!Number.isNaN(capNum) && count >= capNum && !already) {
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
            } else {
                await enqueueSync('elective_signups.replace', {
                    companyId: companyId,
                    childId: childId,
                    electiveId: electiveId,
                    weekStart: weekStart,
                    dayOfWeek: selectedDay,
                    period: selectedPeriod,
                    season,
                });
            }
            setAssignChildId(null);
            await fetchData();
        } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not update signup');
        }
    };

    const handleAddElective = async () => {
        if (!companyId || !newElectiveName.trim()) return;
        const cap = newElectiveCapacity.trim() === '' ? null : parseInt(newElectiveCapacity, 10);
        const row = {
            company_id: companyId,
            name: newElectiveName.trim(),
            capacity: cap != null && !Number.isNaN(cap) ? cap : null,
        } as any;
        if (await isOnlineNow()) {
            const { error } = await supabase.from('electives').insert(row);
            if (error) {
                Alert.alert('Error', error.message?.includes('duplicate') ? 'Elective already exists' : error.message);
                return;
            }
        } else {
            await enqueueSync('electives.insert', [row]);
        }
        setNewElectiveName('');
        setNewElectiveCapacity('10');
        setAddElectiveOpen(false);
        fetchData();
    };

    const handleSaveCapacity = async (electiveId: string) => {
        const cap = editingCapacities[electiveId];
        const update = { capacity: cap === '' ? null : cap } as any;
        if (await isOnlineNow()) {
            const { error } = await supabase
                .from('electives')
                .update(update)
                .eq('id', electiveId);
            if (error) {
                Alert.alert('Error', 'Could not save capacity');
                return;
            }
        } else {
            await enqueueSync('electives.update', { id: electiveId, update });
        }
        fetchData();
    };

    const handleDeleteElective = async (id: string) => {
        const ok = await confirmAppAlert(
            'Remove elective',
            'Deactivate this elective for the camp?',
            { confirmText: 'Remove', cancelText: 'Cancel', destructive: true }
        );
        if (!ok) return;
        try {
            if (await isOnlineNow()) {
                const { error } = await supabase.from('electives').update({ is_active: false }).eq('id', id);
                if (error) showAppAlert('Error', error.message);
                else fetchData();
            } else {
                await enqueueSync('electives.update', { id, update: { is_active: false } });
                fetchData();
            }
        } catch (e: any) {
            showAppAlert('Error', e?.message ?? 'Could not remove elective');
        }
    };

    const fetchCamperHistory = async (childId: string) => {
        if (!companyId) return;
        setHistoryLoading(true);
        setHistoryChildId(childId);
        const cacheKey = `elective_history:${companyId}:${childId}`;
        try {
            const { data } = await supabase
                .from('elective_signups')
                .select('*, electives(name)')
                .eq('company_id', companyId)
                .eq('child_id', childId)
                .order('week_start_date', { ascending: false });
            setHistoryResults(data || []);
            await setCachedJson(cacheKey, data || []);
        } catch {
            setHistoryResults((await getCachedJson<any[]>(cacheKey)) || []);
        }
        setHistoryLoading(false);
    };

    const divisionDisplayName = (id: string | null) => {
        if (!id) return 'Select division';
        return divisions.find((d) => d.id === id)?.name ?? 'Division';
    };

    const addBtnGreen = tlc ? '#286422' : theme.colors.secondary;

    if (!tlc) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.openDrawer()}
                        style={styles.headerIconBtn}
                        hitSlop={12}
                    >
                        <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleBlock}>
                        <Text style={styles.pageTitle}>Elective Sign-Up</Text>
                    </View>
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
                <TouchableOpacity
                    onPress={() => navigation.openDrawer()}
                    style={styles.headerIconBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleBlock}>
                    <Text style={styles.pageTitle}>Elective Sign-Up</Text>
                    <Text style={styles.pageSubtitle}>Manage camper elective assignments by period</Text>
                </View>
                <TouchableOpacity
                    style={[styles.addElectiveBtn, { backgroundColor: addBtnGreen }]}
                    onPress={() => setAddElectiveOpen(true)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addElectiveBtnText}>Add</Text>
                </TouchableOpacity>
            </View>

            {loading || !rosterDivisionFilter.isFetched ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.secondary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <StyledCard style={styles.filterCard}>
                        <Text style={styles.fieldLabel}>Week starting</Text>
                        <View style={styles.weekRow}>
                            <TouchableOpacity onPress={() => shiftWeek(-1)} style={styles.iconBtn}>
                                <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.datePill} onPress={() => setShowWeekDatePicker(true)}>
                                <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
                                <Text style={styles.datePillText}>
                                    {parseYmd(weekStart).toLocaleDateString('en-US', {
                                        month: '2-digit',
                                        day: '2-digit',
                                        year: 'numeric',
                                    })}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => shiftWeek(1)} style={styles.iconBtn}>
                                <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.fieldLabel}>Day</Text>
                        <TouchableOpacity style={styles.selectField} onPress={() => setShowDaySheet(true)}>
                            <Text style={styles.selectFieldText}>{selectedDay}</Text>
                            <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <Text style={styles.fieldLabel}>Period</Text>
                        <TouchableOpacity style={styles.selectField} onPress={() => setShowPeriodSheet(true)}>
                            <Text style={styles.selectFieldText} numberOfLines={2}>
                                {periodLabel ? `${periodLabel.label} — ${periodLabel.time}` : ''}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {periodLabel ? (
                            <View style={styles.summaryRow}>
                                <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                                <Text style={styles.summaryText}>
                                    {selectedDay} — {periodLabel.label} ({periodLabel.time})
                                </Text>
                            </View>
                        ) : null}
                    </StyledCard>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabRow}
                    >
                        {(
                            [
                                ['signup', 'Sign-Up', 'clipboard-outline'] as const,
                                ['rosters', 'Rosters', 'people-outline'] as const,
                                ['analytics', 'Analytics', 'bar-chart-outline'] as const,
                                ['history', 'Camper History', 'time-outline'] as const,
                                ['settings', 'Manage', 'settings-outline'] as const,
                            ] as const
                        ).map(([id, label, icon]) => (
                            <TouchableOpacity
                                key={id}
                                style={[styles.tab, activeTab === id && styles.tabActive]}
                                onPress={() => setActiveTab(id as TabId)}
                            >
                                <Ionicons
                                    name={icon as any}
                                    size={16}
                                    color={activeTab === id ? theme.colors.text : theme.colors.textSecondary}
                                />
                                <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>{label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {activeTab === 'signup' && (
                        <StyledCard style={styles.tabCard}>
                            <Text style={styles.cardSectionLabel}>Divisions</Text>
                            <TouchableOpacity style={styles.selectField} onPress={() => setShowDivisionSheet(true)}>
                                <Ionicons name="people-outline" size={20} color={theme.colors.secondary} />
                                <Text style={styles.selectFieldText} numberOfLines={1}>
                                    {divisionDisplayName(selectedDivision)}
                                </Text>
                                <Ionicons name="chevron-up" size={18} color={theme.colors.textSecondary} />
                            </TouchableOpacity>

                            {!selectedDivision ? (
                                <View style={styles.emptyBlock}>
                                    <Ionicons name="person-outline" size={48} color={theme.colors.border} />
                                    <Text style={styles.emptyTitle}>Select a division to see campers</Text>
                                </View>
                            ) : children.length === 0 ? (
                                <Text style={styles.muted}>No active campers in this division</Text>
                            ) : (
                                children.map((c) => {
                                    const su = signupByChild[c.id];
                                    const electiveName = su?.electives?.name ?? (su?.elective_id ? 'Assigned' : '— None —');
                                    return (
                                        <View key={c.id} style={styles.camperRow}>
                                            <Text style={styles.childName}>{c.name}</Text>
                                            <TouchableOpacity
                                                style={styles.electivePickBtn}
                                                onPress={() => setAssignChildId(c.id)}
                                            >
                                                <Text style={styles.electivePickText} numberOfLines={1}>
                                                    {electiveName}
                                                </Text>
                                                <Ionicons name="chevron-down" size={18} color={theme.colors.secondary} />
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })
                            )}
                        </StyledCard>
                    )}

                    {activeTab === 'rosters' && (
                        <StyledCard style={styles.tabCard}>
                            <View style={styles.rostersHeader}>
                                <Text style={styles.cardTitle}>Rosters</Text>
                                <TouchableOpacity
                                    style={styles.filterChip}
                                    onPress={() => setShowRosterElectiveSheet(true)}
                                >
                                    <Text style={styles.filterChipText} numberOfLines={1}>
                                        {selectedElectiveFilter === 'all'
                                            ? 'All Electives'
                                            : electives.find((e) => e.id === selectedElectiveFilter)?.name ?? 'Elective'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            {rostersByElective.length === 0 ? (
                                <Text style={styles.mutedCenter}>No signups for this period yet</Text>
                            ) : (
                                rostersByElective
                                    .filter(([id]) => selectedElectiveFilter === 'all' || id === selectedElectiveFilter)
                                    .map(([id, data]) => (
                                        <View key={id} style={styles.rosterSection}>
                                            <View style={styles.rosterTitleRow}>
                                                <Text style={styles.rosterTitle}>{data.name}</Text>
                                                <View style={styles.countBadge}>
                                                    <Text style={styles.countBadgeText}>{data.campers.length}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.rosterGrid}>
                                                {data.campers.map((camper: any) => (
                                                    <View key={camper.id} style={styles.rosterNamePill}>
                                                        <Text style={styles.rosterNameText}>
                                                            {(camper.children as any)?.name || 'Unknown'}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    ))
                            )}
                        </StyledCard>
                    )}

                    {activeTab === 'analytics' && (
                        <StyledCard style={styles.tabCard}>
                            <View style={styles.rostersHeader}>
                                <Text style={styles.cardTitle}>Elective Popularity</Text>
                                <TouchableOpacity
                                    style={styles.filterChip}
                                    onPress={() => setShowAnalyticsDivSheet(true)}
                                >
                                    <Text style={styles.filterChipText} numberOfLines={1}>
                                        {analyticsDivision === 'all'
                                            ? 'All Divisions'
                                            : divisions.find((d) => d.id === analyticsDivision)?.name}
                                    </Text>
                                    <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            {analyticsData.length === 0 ? (
                                <Text style={styles.mutedCenter}>No signup data to display</Text>
                            ) : (
                                <View style={styles.chartBlock}>
                                    {(() => {
                                        const max = Math.max(...analyticsData.map((d) => d.count), 1);
                                        return analyticsData.map(({ name, count }) => (
                                            <View key={name} style={styles.barRow}>
                                                <Text style={styles.barLabel} numberOfLines={2}>
                                                    {name}
                                                </Text>
                                                <View style={styles.barTrack}>
                                                    <View
                                                        style={[styles.barFill, { width: `${(count / max) * 100}%` }]}
                                                    />
                                                </View>
                                                <Text style={styles.barCount}>{count}</Text>
                                            </View>
                                        ));
                                    })()}
                                </View>
                            )}
                        </StyledCard>
                    )}

                    {activeTab === 'history' && (
                        <View style={styles.historyLayout}>
                            <StyledCard style={styles.historySide}>
                                <Text style={styles.cardSectionLabel}>Select camper</Text>
                                <View style={styles.searchWrap}>
                                    <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search campers..."
                                        placeholderTextColor={theme.colors.icon}
                                        value={historySearch}
                                        onChangeText={setHistorySearch}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={styles.selectField}
                                    onPress={() => setShowHistoryDivSheet(true)}
                                >
                                    <Text style={styles.selectFieldText}>
                                        {historyDivision === 'all'
                                            ? 'All Divisions'
                                            : divisions.find((d) => d.id === historyDivision)?.name}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                                <ScrollView style={styles.historyList} nestedScrollEnabled>
                                    {filteredHistoryChildren.map((child) => (
                                        <TouchableOpacity
                                            key={child.id}
                                            style={[
                                                styles.historyNameRow,
                                                historyChildId === child.id && styles.historyNameRowActive,
                                            ]}
                                            onPress={() => fetchCamperHistory(child.id)}
                                        >
                                            <Text
                                                style={[
                                                    styles.historyNameText,
                                                    historyChildId === child.id && styles.historyNameTextActive,
                                                ]}
                                            >
                                                {child.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                    {filteredHistoryChildren.length === 0 ? (
                                        <Text style={styles.muted}>No campers found</Text>
                                    ) : null}
                                </ScrollView>
                            </StyledCard>
                            <StyledCard style={styles.historyDetail}>
                                <Text style={styles.cardTitle}>
                                    {historyChildName ? `${historyChildName}'s history` : 'Camper History'}
                                </Text>
                                {!historyChildId ? (
                                    <View style={styles.emptyBlock}>
                                        <Ionicons name="time-outline" size={48} color={theme.colors.border} />
                                        <Text style={styles.emptyTitle}>Select a camper to view their elective history</Text>
                                    </View>
                                ) : historyLoading ? (
                                    <ActivityIndicator color={theme.colors.secondary} style={{ marginTop: 24 }} />
                                ) : historyResults.length === 0 ? (
                                    <Text style={styles.muted}>No elective history found for this camper</Text>
                                ) : (
                                    <View>
                                        <View style={styles.historyTableHead}>
                                            <Text style={styles.historyTh}>Week</Text>
                                            <Text style={styles.historyTh}>Day</Text>
                                            <Text style={styles.historyTh}>Period</Text>
                                            <Text style={[styles.historyTh, { flex: 1.2 }]}>Elective</Text>
                                        </View>
                                        {historyResults.map((r) => {
                                            const pInfo = PERIODS.find((p) => p.id === r.period);
                                            return (
                                                <View key={r.id} style={styles.historyTableRow}>
                                                    <Text style={styles.historyTd}>{r.week_start_date}</Text>
                                                    <Text style={styles.historyTd}>{r.day_of_week}</Text>
                                                    <Text style={styles.historyTd} numberOfLines={1}>
                                                        {pInfo?.label || r.period}
                                                    </Text>
                                                    <Text style={[styles.historyTd, { flex: 1.2 }]} numberOfLines={2}>
                                                        {(r.electives as any)?.name || '—'}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </StyledCard>
                        </View>
                    )}

                    {activeTab === 'settings' && (
                        <StyledCard style={styles.tabCard}>
                            <Text style={styles.cardTitle}>Manage Electives & Capacities</Text>
                            {electives.length === 0 ? (
                                <Text style={styles.muted}>No electives yet. Add one with the button above.</Text>
                            ) : (
                                electives.map((e) => {
                                    const count = signupCountByElective[e.id] || 0;
                                    const cap = e.capacity;
                                    const editCap =
                                        editingCapacities[e.id] !== undefined ? editingCapacities[e.id] : cap ?? '';
                                    const full = cap != null && count >= cap;
                                    return (
                                        <View key={e.id} style={styles.manageRow}>
                                            <Text style={styles.manageName}>{e.name}</Text>
                                            <TextInput
                                                style={styles.capInput}
                                                keyboardType="number-pad"
                                                value={editCap === '' ? '' : String(editCap)}
                                                onChangeText={(t) =>
                                                    setEditingCapacities((prev) => ({
                                                        ...prev,
                                                        [e.id]: t === '' ? '' : parseInt(t, 10) || '',
                                                    }))
                                                }
                                                onBlur={() => handleSaveCapacity(e.id)}
                                                onSubmitEditing={() => handleSaveCapacity(e.id)}
                                            />
                                            <View style={[styles.enrolledBadge, full && styles.enrolledBadgeFull]}>
                                                <Text style={styles.enrolledBadgeText}>
                                                    {count}
                                                    {cap != null ? `/${cap}` : ''}
                                                </Text>
                                            </View>
                                            <TouchableOpacity onPress={() => handleDeleteElective(e.id)} hitSlop={8}>
                                                <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })
                            )}
                        </StyledCard>
                    )}
                </ScrollView>
            )}

            {/* Add Elective — bottom sheet (scroll + keyboard + safe area; matches other app forms) */}
            <Modal visible={addElectiveOpen} transparent animationType="slide" onRequestClose={() => setAddElectiveOpen(false)}>
                <KeyboardAvoidingView
                    style={styles.addElectiveKbRoot}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
                >
                    {/* Backdrop and sheet are siblings so taps on inputs never hit the dismiss handler (web/native). */}
                    <View style={styles.sheetOverlay}>
                        <Pressable
                            style={styles.sheetBackdrop}
                            onPress={() => setAddElectiveOpen(false)}
                            accessibilityLabel="Close modal"
                        />
                        <View style={styles.addElectiveSheet}>
                            <View style={styles.sheetHeader}>
                                <Text style={styles.sheetTitle}>Add New Elective</Text>
                                <TouchableOpacity onPress={() => setAddElectiveOpen(false)} hitSlop={12}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator
                                style={[
                                    styles.addElectiveScroll,
                                    { maxHeight: Math.min(Dimensions.get('window').height * 0.72, 560) },
                                ]}
                                contentContainerStyle={[
                                    styles.addElectiveScrollContent,
                                    { paddingBottom: Math.max(insets.bottom, 16) + 20 },
                                ]}
                            >
                                <View style={styles.addElectiveFormCard}>
                                    <View style={styles.addElectiveFieldGroup}>
                                        <Text style={styles.fieldLabel}>Elective name</Text>
                                        <TextInput
                                            style={styles.addElectiveInput}
                                            placeholder="e.g. Basketball, Arts & Crafts"
                                            placeholderTextColor={theme.colors.icon}
                                            value={newElectiveName}
                                            onChangeText={setNewElectiveName}
                                        />
                                    </View>
                                    <View style={[styles.addElectiveFieldGroup, styles.addElectiveFieldGroupLast]}>
                                        <Text style={styles.fieldLabel}>Capacity</Text>
                                        <TextInput
                                            style={styles.addElectiveInput}
                                            keyboardType="number-pad"
                                            value={newElectiveCapacity}
                                            onChangeText={setNewElectiveCapacity}
                                        />
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={[styles.primaryBtn, styles.addElectiveSubmitBtn, { backgroundColor: addBtnGreen }]}
                                    onPress={handleAddElective}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.primaryBtnText}>Add Elective</Text>
                                </TouchableOpacity>
                                {electives.length > 0 ? (
                                    <View style={styles.currentElectivesCard}>
                                        <Text style={styles.currentElectivesSectionTitle}>Current electives</Text>
                                        <Text style={styles.currentElectivesHint}>
                                            These activities appear in sign-up lists. Tap × to remove.
                                        </Text>
                                        <View style={styles.tagWrap}>
                                            {electives.map((e) => (
                                                <View key={e.id} style={styles.tag}>
                                                    <Text style={styles.tagText}>{e.name}</Text>
                                                    <TouchableOpacity
                                                        onPress={() => handleDeleteElective(e.id)}
                                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                    >
                                                        <Ionicons name="close-circle" size={18} color="#fff" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                ) : null}
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Assign elective bottom sheet */}
            <Modal visible={!!assignChildId} transparent animationType="slide" onRequestClose={() => setAssignChildId(null)}>
                <Pressable style={styles.sheetOverlay} onPress={() => setAssignChildId(null)}>
                    <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Assign elective</Text>
                            <TouchableOpacity onPress={() => setAssignChildId(null)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            style={{ maxHeight: 440 }}
                            contentContainerStyle={styles.assignSheetScroll}
                            keyboardShouldPersistTaps="handled"
                        >
                            {electivesLoading ? (
                                <View style={styles.assignSheetLoading}>
                                    <ActivityIndicator size="large" color={theme.colors.secondary} />
                                    <Text style={styles.muted}>Loading electives…</Text>
                                </View>
                            ) : (
                                (() => {
                                    const curElectiveId = assignChildId
                                        ? signupByChild[assignChildId]?.elective_id
                                        : null;
                                    const noneSelected = !curElectiveId;
                                    const sorted = [...electives].sort((a, b) =>
                                        (a.name || '').localeCompare(b.name || '')
                                    );
                                    return (
                                        <>
                                            <TouchableOpacity
                                                style={styles.sheetOption}
                                                onPress={() => assignChildId && handleAssign(assignChildId, null)}
                                            >
                                                <Text style={styles.sheetOptionText}>— None —</Text>
                                                {noneSelected ? (
                                                    <Ionicons
                                                        name="checkmark-circle"
                                                        size={22}
                                                        color={theme.colors.secondary}
                                                    />
                                                ) : null}
                                            </TouchableOpacity>
                                            {sorted.map((e) => {
                                                const used = signupCountByElective[e.id] || 0;
                                                const cap = e.capacity;
                                                const capNum =
                                                    cap != null && cap !== ''
                                                        ? typeof cap === 'number'
                                                            ? cap
                                                            : parseInt(String(cap), 10)
                                                        : null;
                                                const full =
                                                    capNum != null && !Number.isNaN(capNum) && used >= capNum;
                                                const selected = curElectiveId === e.id;
                                                const disabled = full && !selected;
                                                const countLabel =
                                                    capNum != null && !Number.isNaN(capNum)
                                                        ? ` (${used}/${capNum})`
                                                        : ` (${used})`;
                                                return (
                                                    <TouchableOpacity
                                                        key={e.id}
                                                        style={[styles.sheetOption, disabled && { opacity: 0.4 }]}
                                                        disabled={disabled}
                                                        onPress={() => assignChildId && handleAssign(assignChildId, e.id)}
                                                    >
                                                        <Text style={styles.sheetOptionText}>
                                                            {e.name}
                                                            {countLabel}
                                                        </Text>
                                                        {selected ? (
                                                            <Ionicons
                                                                name="checkmark-circle"
                                                                size={22}
                                                                color={theme.colors.secondary}
                                                            />
                                                        ) : null}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                            {sorted.length === 0 ? (
                                                <Text style={styles.assignSheetEmpty}>
                                                    No elective activities found. Use the green Add button to create electives for
                                                    this camp.
                                                </Text>
                                            ) : null}
                                        </>
                                    );
                                })()
                            )}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Day sheet */}
            <Modal visible={showDaySheet} transparent animationType="slide" onRequestClose={() => setShowDaySheet(false)}>
                <Pressable style={styles.sheetOverlay} onPress={() => setShowDaySheet(false)}>
                    <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Day</Text>
                            <TouchableOpacity onPress={() => setShowDaySheet(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        {DAYS.map((d) => (
                            <TouchableOpacity
                                key={d}
                                style={styles.sheetOption}
                                onPress={() => {
                                    setSelectedDay(d);
                                    setShowDaySheet(false);
                                }}
                            >
                                <Text style={styles.sheetOptionText}>{d}</Text>
                                {selectedDay === d ? (
                                    <Ionicons name="checkmark-circle" size={22} color={theme.colors.secondary} />
                                ) : null}
                            </TouchableOpacity>
                        ))}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Period sheet */}
            <Modal visible={showPeriodSheet} transparent animationType="slide" onRequestClose={() => setShowPeriodSheet(false)}>
                <Pressable style={styles.sheetOverlay} onPress={() => setShowPeriodSheet(false)}>
                    <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Period</Text>
                            <TouchableOpacity onPress={() => setShowPeriodSheet(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 360 }}>
                            {PERIODS.map((p) => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={styles.sheetOption}
                                    onPress={() => {
                                        setSelectedPeriod(p.id);
                                        setShowPeriodSheet(false);
                                    }}
                                >
                                    <Text style={styles.sheetOptionText}>
                                        {p.label} — {p.time}
                                    </Text>
                                    {selectedPeriod === p.id ? (
                                        <Ionicons name="checkmark-circle" size={22} color={theme.colors.secondary} />
                                    ) : null}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Division sheet (sign-up) */}
            <Modal visible={showDivisionSheet} transparent animationType="slide" onRequestClose={() => setShowDivisionSheet(false)}>
                <Pressable style={styles.sheetOverlay} onPress={() => setShowDivisionSheet(false)}>
                    <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Select Division</Text>
                            <TouchableOpacity onPress={() => setShowDivisionSheet(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 420 }}>
                            {divisions.map((d) => (
                                <TouchableOpacity
                                    key={d.id}
                                    style={styles.sheetOption}
                                    onPress={() => {
                                        setSelectedDivision(d.id);
                                        fetchChildrenForDivision(d.id);
                                        setShowDivisionSheet(false);
                                    }}
                                >
                                    <Text style={styles.sheetOptionText}>{d.name}</Text>
                                    {selectedDivision === d.id ? (
                                        <Ionicons name="checkmark-circle" size={22} color={theme.colors.secondary} />
                                    ) : (
                                        <Ionicons name="people-outline" size={20} color={theme.colors.textSecondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Roster elective filter */}
            <Modal
                visible={showRosterElectiveSheet}
                transparent
                animationType="slide"
                onRequestClose={() => setShowRosterElectiveSheet(false)}
            >
                <Pressable style={styles.sheetOverlay} onPress={() => setShowRosterElectiveSheet(false)}>
                    <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Filter by elective</Text>
                            <TouchableOpacity onPress={() => setShowRosterElectiveSheet(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            style={{ maxHeight: 440 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator
                        >
                            <TouchableOpacity
                                style={styles.sheetOption}
                                onPress={() => {
                                    setSelectedElectiveFilter('all');
                                    setShowRosterElectiveSheet(false);
                                }}
                            >
                                <Text style={styles.sheetOptionText}>All Electives</Text>
                                {selectedElectiveFilter === 'all' ? (
                                    <Ionicons name="checkmark-circle" size={22} color={theme.colors.secondary} />
                                ) : null}
                            </TouchableOpacity>
                            {electives.map((e) => {
                                const used = signupCountByElective[e.id] || 0;
                                const cap = e.capacity;
                                const capNum =
                                    cap != null && cap !== ''
                                        ? typeof cap === 'number'
                                            ? cap
                                            : parseInt(String(cap), 10)
                                        : null;
                                const countLabel =
                                    capNum != null && !Number.isNaN(capNum)
                                        ? ` (${used}/${capNum})`
                                        : ` (${used})`;
                                return (
                                    <TouchableOpacity
                                        key={e.id}
                                        style={styles.sheetOption}
                                        onPress={() => {
                                            setSelectedElectiveFilter(e.id);
                                            setShowRosterElectiveSheet(false);
                                        }}
                                    >
                                        <Text style={styles.sheetOptionText}>
                                            {e.name}
                                            {countLabel}
                                        </Text>
                                        {selectedElectiveFilter === e.id ? (
                                            <Ionicons name="checkmark-circle" size={22} color={theme.colors.secondary} />
                                        ) : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Analytics division */}
            <Modal
                visible={showAnalyticsDivSheet}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAnalyticsDivSheet(false)}
            >
                <Pressable style={styles.sheetOverlay} onPress={() => setShowAnalyticsDivSheet(false)}>
                    <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Division</Text>
                            <TouchableOpacity onPress={() => setShowAnalyticsDivSheet(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={styles.sheetOption}
                            onPress={() => {
                                setAnalyticsDivision('all');
                                setShowAnalyticsDivSheet(false);
                            }}
                        >
                            <Text style={styles.sheetOptionText}>All Divisions</Text>
                            {analyticsDivision === 'all' ? (
                                <Ionicons name="checkmark-circle" size={22} color={theme.colors.secondary} />
                            ) : null}
                        </TouchableOpacity>
                        {divisions.map((d) => (
                            <TouchableOpacity
                                key={d.id}
                                style={styles.sheetOption}
                                onPress={() => {
                                    setAnalyticsDivision(d.id);
                                    setShowAnalyticsDivSheet(false);
                                }}
                            >
                                <Text style={styles.sheetOptionText}>{d.name}</Text>
                                {analyticsDivision === d.id ? (
                                    <Ionicons name="checkmark-circle" size={22} color={theme.colors.secondary} />
                                ) : null}
                            </TouchableOpacity>
                        ))}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* History division */}
            <Modal
                visible={showHistoryDivSheet}
                transparent
                animationType="slide"
                onRequestClose={() => setShowHistoryDivSheet(false)}
            >
                <Pressable style={styles.sheetOverlay} onPress={() => setShowHistoryDivSheet(false)}>
                    <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Division</Text>
                            <TouchableOpacity onPress={() => setShowHistoryDivSheet(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={styles.sheetOption}
                            onPress={() => {
                                setHistoryDivision('all');
                                setShowHistoryDivSheet(false);
                            }}
                        >
                            <Text style={styles.sheetOptionText}>All Divisions</Text>
                            {historyDivision === 'all' ? (
                                <Ionicons name="checkmark-circle" size={22} color={theme.colors.secondary} />
                            ) : null}
                        </TouchableOpacity>
                        {divisions.map((d) => (
                            <TouchableOpacity
                                key={d.id}
                                style={styles.sheetOption}
                                onPress={() => {
                                    setHistoryDivision(d.id);
                                    setShowHistoryDivSheet(false);
                                }}
                            >
                                <Text style={styles.sheetOptionText}>{d.name}</Text>
                                {historyDivision === d.id ? (
                                    <Ionicons name="checkmark-circle" size={22} color={theme.colors.secondary} />
                                ) : null}
                            </TouchableOpacity>
                        ))}
                    </Pressable>
                </Pressable>
            </Modal>

            {showWeekDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                    value={parseYmd(weekStart)}
                    mode="date"
                    display="default"
                    onChange={(ev, d) => {
                        setShowWeekDatePicker(false);
                        if (ev.type === 'dismissed' || !d) return;
                        setWeekStart(d.toISOString().split('T')[0]);
                    }}
                />
            )}
            {showWeekDatePicker && Platform.OS === 'ios' && (
                <Modal transparent visible={showWeekDatePicker} animationType="slide">
                    <View style={styles.iosDateWrap}>
                        <Pressable style={{ flex: 1 }} onPress={() => setShowWeekDatePicker(false)} />
                        <View style={styles.iosDateInner}>
                            <DateTimePicker
                                value={parseYmd(weekStart)}
                                mode="date"
                                display="spinner"
                                themeVariant="light"
                                onChange={(_, d) => d && setWeekStart(d.toISOString().split('T')[0])}
                            />
                            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowWeekDatePicker(false)}>
                                <Text style={styles.doneBtnText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingTop: 12,
        paddingBottom: 14,
        gap: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
    },
    headerIconBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleBlock: { flex: 1, minWidth: 0, justifyContent: 'center', paddingVertical: 2 },
    pageTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.text,
        letterSpacing: -0.3,
        lineHeight: 28,
    },
    pageSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 3,
        lineHeight: 18,
    },
    addElectiveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minHeight: 40,
        borderRadius: theme.borderRadius.md,
    },
    addElectiveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    muted: { color: theme.colors.textSecondary, marginTop: 8, fontSize: 14 },
    mutedCenter: { textAlign: 'center', color: theme.colors.textSecondary, paddingVertical: 24 },
    scroll: { padding: theme.spacing.md, paddingBottom: 100 },
    filterCard: { padding: theme.spacing.md, marginBottom: theme.spacing.md },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    weekRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
        gap: 8,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    datePill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    datePillText: { fontSize: 15, fontWeight: '600', color: theme.colors.text, flex: 1 },
    selectField: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: theme.spacing.sm,
        gap: 8,
        backgroundColor: theme.colors.surface,
    },
    selectFieldText: { flex: 1, fontSize: 15, color: theme.colors.text },
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    summaryText: { fontSize: 13, color: theme.colors.textSecondary, flex: 1 },
    tabRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md, paddingRight: 8 },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: '#e5e7eb',
    },
    tabActive: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
    tabTextActive: { color: theme.colors.text },
    tabCard: { padding: theme.spacing.md, marginBottom: theme.spacing.md },
    cardSectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    cardTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
    emptyBlock: { alignItems: 'center', paddingVertical: 40 },
    emptyTitle: { fontSize: 15, color: theme.colors.textSecondary, marginTop: 12, textAlign: 'center' },
    camperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        gap: 8,
    },
    childName: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.colors.text },
    electivePickBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        maxWidth: '52%',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    electivePickText: { fontSize: 13, color: theme.colors.secondary, fontWeight: '600', flexShrink: 1 },
    rostersHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 10,
        paddingVertical: 8,
        maxWidth: '55%',
    },
    filterChipText: { fontSize: 13, color: theme.colors.text, flexShrink: 1 },
    rosterSection: { marginBottom: theme.spacing.lg },
    rosterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    rosterTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    countBadge: {
        backgroundColor: theme.colors.border,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    countBadgeText: { fontSize: 12, fontWeight: '700' },
    rosterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    rosterNamePill: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: theme.colors.surface,
    },
    rosterNameText: { fontSize: 13, color: theme.colors.text },
    chartBlock: { gap: 12, marginTop: 8 },
    barRow: { gap: 6 },
    barLabel: { fontSize: 12, color: theme.colors.text, marginBottom: 4 },
    barTrack: {
        height: 10,
        backgroundColor: theme.colors.border,
        borderRadius: 5,
        overflow: 'hidden',
    },
    barFill: {
        height: 10,
        backgroundColor: theme.colors.secondary,
        borderRadius: 5,
    },
    barCount: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, alignSelf: 'flex-end' },
    historyLayout: { gap: theme.spacing.md },
    historySide: { padding: theme.spacing.md, maxHeight: 380 },
    historyDetail: { padding: theme.spacing.md, minHeight: 200 },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: theme.colors.text },
    historyList: { maxHeight: 220 },
    historyNameRow: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: theme.borderRadius.md },
    historyNameRowActive: { backgroundColor: `${theme.colors.secondary}18` },
    historyNameText: { fontSize: 15, color: theme.colors.text },
    historyNameTextActive: { color: theme.colors.secondary, fontWeight: '700' },
    historyTableHead: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingBottom: 8,
        marginBottom: 4,
    },
    historyTh: { flex: 1, fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase' },
    historyTableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    historyTd: { flex: 1, fontSize: 12, color: theme.colors.text },
    manageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        flexWrap: 'wrap',
    },
    manageName: { flex: 1, minWidth: 120, fontSize: 14, fontWeight: '600', color: theme.colors.text },
    capInput: {
        width: 56,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 8,
        fontSize: 14,
        textAlign: 'center',
    },
    enrolledBadge: {
        backgroundColor: '#14b8a6',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    enrolledBadgeFull: { backgroundColor: theme.colors.danger },
    enrolledBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    sheetOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingBottom: 32,
        maxHeight: '75%',
    },
    addElectiveKbRoot: {
        flex: 1,
    },
    addElectiveSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        width: '100%',
        maxHeight: '92%',
        overflow: 'hidden',
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 16,
    },
    addElectiveScroll: {},
    addElectiveScrollContent: {
        paddingHorizontal: theme.spacing.md,
        paddingTop: 18,
    },
    addElectiveFormCard: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        padding: 16,
        marginBottom: 20,
    },
    addElectiveFieldGroup: {
        marginBottom: 18,
    },
    addElectiveFieldGroupLast: {
        marginBottom: 0,
    },
    addElectiveInput: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingVertical: 14,
        paddingHorizontal: 14,
        fontSize: 16,
        color: theme.colors.text,
        backgroundColor: theme.colors.surface,
        marginTop: 8,
    },
    addElectiveSubmitBtn: {
        marginTop: 0,
        marginBottom: 12,
    },
    currentElectivesCard: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        padding: 16,
        marginTop: 8,
    },
    currentElectivesSectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        letterSpacing: 0.6,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    currentElectivesHint: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        lineHeight: 17,
        marginBottom: 14,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    sheetOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    sheetOptionText: { flex: 1, fontSize: 16, color: theme.colors.text, paddingRight: 8 },
    assignSheetScroll: { paddingBottom: 24 },
    assignSheetLoading: { alignItems: 'center', paddingVertical: 32, gap: 12 },
    assignSheetEmpty: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 16,
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    textIn: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 12,
        fontSize: 16,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    primaryBtn: {
        paddingVertical: 14,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#14b8a6',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    tagText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    iosDateWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    iosDateInner: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        paddingBottom: 16,
    },
    doneBtn: { paddingVertical: 14, alignItems: 'center' },
    doneBtnText: { fontWeight: '600', fontSize: 16, color: theme.colors.secondary },
});
