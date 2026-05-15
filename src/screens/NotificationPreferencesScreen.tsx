import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { supabase } from '../lib/supabase';
import { MobileUserMenu } from '../components/MobileUserMenu';
import { enqueueSync, getCachedJson, isOnlineNow, setCachedJson } from '../offline/engine';

interface NotificationPreference {
    id?: string;
    notification_type: string;
    enabled: boolean;
    timing_options: string[];
    delivery_methods: string[];
}

const NOTIFICATION_TYPES = [
    { value: 'sports_academy', label: 'Sports Academy', description: 'Alerts for sports academy sessions' },
    { value: 'tutoring_therapy', label: 'Tutoring & Therapy', description: 'Scheduled tutoring/therapy reminders' },
    { value: 'appointments', label: 'Appointments', description: 'Medical and other appointments' },
    { value: 'activities_field_trips', label: 'Activities & Field Trips', description: 'Upcoming activities and trips' },
    { value: 'sports_events', label: 'Sports Events', description: 'Scheduled games and sports events' },
    { value: 'calendar_events', label: 'Calendar Events', description: 'Master calendar events' },
    { value: 'incident_reports', label: 'Incident Reports', description: 'When incidents are reported' },
    { value: 'health_center', label: 'Health Center', description: 'Health center admissions/discharges' },
];

const DELIVERY_OPTIONS = [
    { value: 'email', label: 'Email' },
    { value: 'in_app', label: 'In-App' },
];

export const NotificationPreferencesScreen = ({ navigation }: any) => {
    const { companyId } = useCompany();
    const [userId, setUserId] = useState<string | null>(null);
    const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    }, []);

    useEffect(() => {
        if (!companyId || !userId) {
            setLoading(false);
            return;
        }
        const fetchPrefs = async () => {
            setLoading(true);
            const cacheKey = `user_notification_preferences:${companyId}:${userId}`;
            try {
                const { data, error } = await supabase
                    .from('user_notification_preferences')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('company_id', companyId);
                if (error) throw error;
                const existing = data || [];
                const all = NOTIFICATION_TYPES.map(t => {
                    const ex = existing.find((p: any) => p.notification_type === t.value);
                    if (ex) {
                        return {
                            id: ex.id,
                            notification_type: ex.notification_type,
                            enabled: !!ex.enabled,
                            timing_options: Array.isArray(ex.timing_options) ? ex.timing_options : [],
                            delivery_methods: Array.isArray(ex.delivery_methods) ? ex.delivery_methods : ['email'],
                        };
                    }
                    return {
                        notification_type: t.value,
                        enabled: false,
                        timing_options: [],
                        delivery_methods: ['email'],
                    };
                });
                setPreferences(all);
                await setCachedJson(cacheKey, all);
            } catch {
                const cached = await getCachedJson<NotificationPreference[]>(cacheKey);
                if (cached) setPreferences(cached);
            } finally {
                setLoading(false);
            }
        };
        fetchPrefs();
    }, [companyId, userId]);

    const updatePref = (type: string, updates: Partial<NotificationPreference>) => {
        setPreferences(prev =>
            prev.map(p => (p.notification_type === type ? { ...p, ...updates } : p))
        );
    };

    const toggleDelivery = (type: string, method: string) => {
        const pref = preferences.find(p => p.notification_type === type);
        if (!pref) return;
        const has = pref.delivery_methods.includes(method);
        const next = has
            ? pref.delivery_methods.filter(m => m !== method)
            : [...pref.delivery_methods, method];
        if (next.length === 0) return;
        updatePref(type, { delivery_methods: next });
    };

    const handleSave = async () => {
        if (!companyId || !userId) return;
        setSaving(true);
        try {
            const rows = preferences.map((pref) => ({
                user_id: userId,
                company_id: companyId,
                notification_type: pref.notification_type,
                enabled: pref.enabled,
                timing_options: pref.timing_options,
                delivery_methods: pref.delivery_methods,
            }));
            if (await isOnlineNow()) {
                for (const row of rows) {
                    await supabase
                        .from('user_notification_preferences')
                        .upsert(row, { onConflict: 'user_id,company_id,notification_type' });
                }
            } else {
                await enqueueSync('user_notification_preferences.upsert_many', { rows });
            }
            await setCachedJson(`user_notification_preferences:${companyId}:${userId}`, preferences);
            Alert.alert('Saved', 'Notification preferences updated.');
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Loading preferences...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Ionicons name="menu" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notification Preferences</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Messages')}
                        style={styles.headerIconBtn}
                    >
                        <Ionicons name="notifications-outline" size={26} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <MobileUserMenu navigation={navigation} />
                </View>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <StyledCard style={styles.card}>
                    <Text style={styles.cardTitle}>Notification Preferences</Text>
                    <Text style={styles.cardSubtitle}>Choose which notifications you receive and how.</Text>
                    {NOTIFICATION_TYPES.map(t => {
                        const pref = preferences.find(p => p.notification_type === t.value);
                        if (!pref) return null;
                        return (
                            <View key={t.value} style={styles.prefRow}>
                                <View style={styles.prefHeader}>
                                    <Text style={styles.prefLabel}>{t.label}</Text>
                                    <Switch
                                        value={pref.enabled}
                                        onValueChange={v => updatePref(t.value, { enabled: v })}
                                        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                        thumbColor={theme.colors.surface}
                                    />
                                </View>
                                <Text style={styles.prefDesc}>{t.description}</Text>
                                {pref.enabled ? (
                                    <View style={styles.deliveryRow}>
                                        {DELIVERY_OPTIONS.map(d => (
                                            <TouchableOpacity
                                                key={d.value}
                                                style={styles.deliveryChip}
                                                onPress={() => toggleDelivery(t.value, d.value)}
                                            >
                                                <Ionicons
                                                    name={pref.delivery_methods.includes(d.value) ? 'checkbox' : 'square-outline'}
                                                    size={20}
                                                    color={theme.colors.primary}
                                                />
                                                <Text style={styles.deliveryLabel}>{d.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : null}
                            </View>
                        );
                    })}
                    <TouchableOpacity
                        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.saveBtnText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </StyledCard>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: theme.spacing.sm, color: theme.colors.textSecondary },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle: { ...theme.typography.h3 },
    headerSpacer: { width: 28 },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: { padding: theme.spacing.md },
    card: { padding: theme.spacing.lg },
    cardTitle: { ...theme.typography.h3, marginBottom: theme.spacing.xs },
    cardSubtitle: { ...theme.typography.body, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg },
    prefRow: {
        marginBottom: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    prefHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    prefLabel: { ...theme.typography.body, fontWeight: '600' },
    prefDesc: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, marginTop: 4 },
    deliveryRow: { flexDirection: 'row', marginTop: 8, gap: 12 },
    deliveryChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    deliveryLabel: { ...theme.typography.bodySmall },
    saveBtn: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { color: theme.colors.surface, fontWeight: '600' },
});
