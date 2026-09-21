import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { campTodayDateString } from '../lib/parentPortalCutoff';
import {
    ABSENCE_TYPE_LABELS,
    approveDismissalAbsence,
    approveDismissalNurse,
    approveDismissalPickup,
    approveDismissalSwim,
    DISMISSAL_REALTIME_TABLES,
    fetchDismissalDashboard,
    PICKUP_CHANGE_LABELS,
    toggleOfficeChangeDone,
    type DismissalDashboardData,
} from '../lib/dismissalDashboard';

export function FrontOfficeDashboardScreen({ navigation }: { navigation: any }) {
    const { companyId, season, companySlug } = useCompany();
    const [selectedDate] = useState(campTodayDateString());
    const [data, setData] = useState<DismissalDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [live, setLive] = useState(false);

    const load = useCallback(async () => {
        if (!companyId || !season) return;
        try {
            const next = await fetchDismissalDashboard(supabase, companyId, season, selectedDate);
            setData(next);
        } catch (err) {
            console.error('[FrontOfficeDashboard] load error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [companyId, season, selectedDate]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (!companyId) return;
        const channel = supabase.channel(`front-office-mobile-${companyId}`);
        for (const table of DISMISSAL_REALTIME_TABLES) {
            channel.on(
                'postgres_changes',
                { event: '*', schema: 'public', table, filter: `company_id=eq.${companyId}` },
                () => {
                    void load();
                },
            );
        }
        channel.subscribe((status) => setLive(status === 'SUBSCRIBED'));
        return () => {
            void supabase.removeChannel(channel);
        };
    }, [companyId, load]);

    const pendingTodayCount = useMemo(() => {
        if (!data) return 0;
        return (
            data.pendingPickups.length +
            data.pendingAbsences.length +
            data.pendingNurse.length +
            data.pendingSwim.length
        );
    }, [data]);

    const openOfficeCount = useMemo(
        () => data?.officeChanges.filter((r) => !r.done).length ?? 0,
        [data],
    );

    const approvePickup = (id: string, name: string) => {
        Alert.alert('Approve pickup change', `Approve change for ${name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Approve',
                onPress: async () => {
                    const { error } = await approveDismissalPickup(supabase, id);
                    if (error) Alert.alert('Error', error.message);
                    else void load();
                },
            },
        ]);
    };

    const approveAbsence = (id: string, name: string) => {
        Alert.alert('Approve absence', `Approve absence for ${name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Approve',
                onPress: async () => {
                    const { error } = await approveDismissalAbsence(supabase, id);
                    if (error) Alert.alert('Error', error.message);
                    else void load();
                },
            },
        ]);
    };

    const approveNurse = (id: string, name: string) => {
        Alert.alert('Approve sent home', `Approve nurse sent-home for ${name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Approve',
                onPress: async () => {
                    const { error } = await approveDismissalNurse(supabase, id);
                    if (error) Alert.alert('Error', error.message);
                    else void load();
                },
            },
        ]);
    };

    const approveSwim = (id: string, name: string) => {
        Alert.alert('Approve swim lesson', `Approve swim transport change for ${name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Approve',
                onPress: async () => {
                    const { error } = await approveDismissalSwim(supabase, id);
                    if (error) Alert.alert('Error', error.message);
                    else void load();
                },
            },
        ]);
    };

    const toggleOffice = async (id: string, done: boolean) => {
        const { error } = await toggleOfficeChangeDone(supabase, id, done);
        if (error) Alert.alert('Error', error.message);
        else void load();
    };

    if (loading && !data) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />
                }
            >
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>Front Office</Text>
                        <Text style={styles.subtitle}>Live dismissal control</Text>
                    </View>
                    <View style={[styles.liveBadge, live && styles.liveBadgeOn]}>
                        <View style={[styles.liveDot, live && styles.liveDotOn]} />
                        <Text style={[styles.liveText, live && styles.liveTextOn]}>{live ? 'Live' : '…'}</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={[styles.statCard, pendingTodayCount > 0 && styles.statCardAlert]}>
                        <Text style={styles.statValue}>{pendingTodayCount}</Text>
                        <Text style={styles.statLabel}>Needs approval</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{openOfficeCount}</Text>
                        <Text style={styles.statLabel}>Office open</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>
                            {(data?.approvedPickups.length ?? 0) +
                                (data?.approvedAbsences.length ?? 0) +
                                (data?.approvedNurse.length ?? 0) +
                                (data?.approvedSwim.length ?? 0)}
                        </Text>
                        <Text style={styles.statLabel}>Approved</Text>
                    </View>
                </View>

                {companySlug === 'north-shore-day-camp' ? (
                    <View style={styles.linkRow}>
                        <TouchableOpacity
                            style={styles.linkBtn}
                            onPress={() => navigation.navigate('DayCampModule', { moduleId: 'parent-portal-dashboard' })}
                        >
                            <Text style={styles.linkBtnText}>Portal Dashboard</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.linkBtn}
                            onPress={() => navigation.navigate('DayCampModule', { moduleId: 'pending-transport-changes' })}
                        >
                            <Text style={styles.linkBtnText}>Pending Changes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.linkBtn}
                            onPress={() => navigation.navigate('Transport')}
                        >
                            <Text style={styles.linkBtnText}>Transport</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                <Text style={styles.sectionTitle}>Incoming — needs approval</Text>
                {!data?.pendingPickups.length &&
                !data?.pendingAbsences.length &&
                !data?.pendingNurse.length &&
                !data?.pendingSwim.length ? (
                    <Text style={styles.empty}>No pending changes for today.</Text>
                ) : null}
                {data?.pendingPickups.map((p) => (
                    <View key={p.id} style={styles.pendingCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardName}>{p.camperName}</Text>
                            <Text style={styles.cardType}>
                                Pickup · {PICKUP_CHANGE_LABELS[p.change_type] ?? p.change_type}
                            </Text>
                            <Text style={styles.cardMeta}>{p.familyName}</Text>
                        </View>
                        <TouchableOpacity style={styles.approveBtn} onPress={() => approvePickup(p.id, p.camperName)}>
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>
                    </View>
                ))}
                {data?.pendingAbsences.map((a) => (
                    <View key={a.id} style={styles.pendingCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardName}>{a.camperName}</Text>
                            <Text style={styles.cardType}>
                                Absence · {ABSENCE_TYPE_LABELS[a.absence_type] ?? a.absence_type}
                            </Text>
                            <Text style={styles.cardMeta}>{a.familyName}</Text>
                        </View>
                        <TouchableOpacity style={styles.approveBtn} onPress={() => approveAbsence(a.id, a.camperName)}>
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>
                    </View>
                ))}
                {data?.pendingNurse.map((n) => (
                    <View key={n.id} style={styles.pendingCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardName}>{n.camper_name}</Text>
                            <Text style={styles.cardType}>Nurse · Sent home</Text>
                            {n.reason ? <Text style={styles.cardMeta}>{n.reason}</Text> : null}
                        </View>
                        <TouchableOpacity style={styles.approveBtn} onPress={() => approveNurse(n.id, n.camper_name)}>
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>
                    </View>
                ))}
                {data?.pendingSwim.map((s) => (
                    <View key={s.id} style={styles.pendingCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardName}>{s.camperName}</Text>
                            <Text style={styles.cardType}>Swim · Parent confirmed</Text>
                            {s.instructor ? <Text style={styles.cardMeta}>{s.instructor}</Text> : null}
                        </View>
                        <TouchableOpacity style={styles.approveBtn} onPress={() => approveSwim(s.id, s.camperName)}>
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                <Text style={styles.sectionTitle}>Office changes today</Text>
                {!data?.officeChanges.length ? (
                    <Text style={styles.empty}>No office changes logged.</Text>
                ) : (
                    data.officeChanges.map((row) => (
                        <TouchableOpacity
                            key={row.id}
                            style={[styles.officeRow, row.done && styles.officeRowDone]}
                            onPress={() => void toggleOffice(row.id, !row.done)}
                        >
                            <Ionicons
                                name={row.done ? 'checkbox' : 'square-outline'}
                                size={22}
                                color={row.done ? theme.colors.success : theme.colors.textSecondary}
                            />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[styles.cardName, row.done && styles.doneText]}>{row.camper_name}</Text>
                                <Text style={styles.cardMeta}>{row.note}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
    title: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
    subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    liveBadgeOn: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9ca3af' },
    liveDotOn: { backgroundColor: '#10b981' },
    liveText: { fontSize: 12, color: theme.colors.textSecondary },
    liveTextOn: { color: '#047857', fontWeight: '600' },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    statCardAlert: { borderColor: '#fcd34d', backgroundColor: '#fffbeb' },
    statValue: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
    statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
    linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    linkBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    linkBtnText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 10, color: theme.colors.text },
    empty: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 12 },
    pendingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        marginBottom: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#fcd34d',
        backgroundColor: '#fffbeb',
    },
    cardName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    cardType: { fontSize: 12, color: '#b45309', marginTop: 2 },
    cardMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    approveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
    },
    approveBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    officeRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        marginBottom: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    officeRowDone: { opacity: 0.65 },
    doneText: { textDecorationLine: 'line-through', color: theme.colors.textSecondary },
});
