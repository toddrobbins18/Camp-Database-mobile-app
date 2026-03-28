import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { supabase } from '../lib/supabase';
import { MobileUserMenu } from '../components/MobileUserMenu';

function formatYmd(d: Date): string {
    return d.toISOString().split('T')[0];
}

export const TigerTimesScreen = ({ navigation }: { navigation: any }) => {
    const { companyId, season, isTimberLakeCamp } = useCompany();
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rowId, setRowId] = useState<string | null>(null);

    const [officerOfDay, setOfficerOfDay] = useState('');
    const [laundryInfo, setLaundryInfo] = useState('');
    const [phoneCallsInfo, setPhoneCallsInfo] = useState('');
    const [quoteOfTheDay, setQuoteOfTheDay] = useState('');
    const [notes, setNotes] = useState('');
    const [pictureDay, setPictureDay] = useState('');
    const [outsideEvent, setOutsideEvent] = useState('');
    const [staffDaysOff, setStaffDaysOff] = useState('');
    const [odNotes, setOdNotes] = useState('');

    const dateStr = formatYmd(selectedDate);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!companyId || !season || !isTimberLakeCamp) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('daily_wolf_content')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('date', dateStr)
                    .eq('season', season)
                    .maybeSingle();
                if (cancelled) return;
                if (error) throw error;
                if (data) {
                    setRowId(data.id);
                    setOfficerOfDay(data.officer_of_day || '');
                    setLaundryInfo(data.laundry_info || '');
                    setPhoneCallsInfo(data.phone_calls_info || '');
                    setQuoteOfTheDay(data.quote_of_the_day || '');
                    setNotes(data.notes || '');
                    setPictureDay((data as any).picture_day || '');
                    setOutsideEvent((data as any).outside_event || '');
                    setStaffDaysOff((data as any).staff_days_off || '');
                    setOdNotes((data as any).od_notes || '');
                } else {
                    setRowId(null);
                    setOfficerOfDay('');
                    setLaundryInfo('');
                    setPhoneCallsInfo('');
                    setQuoteOfTheDay('');
                    setNotes('');
                    setPictureDay('');
                    setOutsideEvent('');
                    setStaffDaysOff('');
                    setOdNotes('');
                }
            } catch {
                if (!cancelled) Alert.alert('Error', 'Could not load Tiger Times content.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [companyId, season, dateStr, isTimberLakeCamp]);

    const navigateDate = (dir: 'prev' | 'next') => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + (dir === 'next' ? 1 : -1));
        setSelectedDate(d);
    };

    const handleSave = async () => {
        if (!companyId || !season || !isTimberLakeCamp) return;
        setSaving(true);
        try {
            const payload = {
                officer_of_day: officerOfDay,
                laundry_info: laundryInfo,
                phone_calls_info: phoneCallsInfo,
                quote_of_the_day: quoteOfTheDay,
                notes,
                picture_day: pictureDay,
                outside_event: outsideEvent,
                staff_days_off: staffDaysOff,
                od_notes: odNotes,
            };

            if (rowId) {
                const { error } = await supabase.from('daily_wolf_content').update(payload).eq('id', rowId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('daily_wolf_content')
                    .insert({
                        company_id: companyId,
                        date: dateStr,
                        season,
                        ...payload,
                    })
                    .select('id')
                    .single();
                if (error) throw error;
                if (data?.id) setRowId(data.id);
            }
            Alert.alert('Saved', 'Tiger Times content updated.');
        } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    if (!isTimberLakeCamp) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Tiger Times</Text>
                    <MobileUserMenu navigation={navigation} />
                </View>
                <View style={styles.centered}>
                    <Text style={styles.muted}>Tiger Times is only available for Timber Lake Camp.</Text>
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
                <Text style={styles.headerTitle}>Tiger Times</Text>
                <MobileUserMenu navigation={navigation} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.secondary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <View style={styles.dateRow}>
                        <TouchableOpacity onPress={() => navigateDate('prev')} style={styles.dateBtn}>
                            <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.dateText}>{dateStr}</Text>
                        <TouchableOpacity onPress={() => navigateDate('next')} style={styles.dateBtn}>
                            <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <StyledCard style={styles.card}>
                        <Field label="Officer of the Day" value={officerOfDay} onChangeText={setOfficerOfDay} />
                        <Field label="Laundry" value={laundryInfo} onChangeText={setLaundryInfo} multiline />
                        <Field label="Phone calls" value={phoneCallsInfo} onChangeText={setPhoneCallsInfo} multiline />
                        <Field label="Outside events" value={outsideEvent} onChangeText={setOutsideEvent} multiline />
                        <Field label="Staff days off" value={staffDaysOff} onChangeText={setStaffDaysOff} multiline />
                        <Field label="OD notes" value={odNotes} onChangeText={setOdNotes} multiline />
                        <Field label="Quote of the day" value={quoteOfTheDay} onChangeText={setQuoteOfTheDay} multiline />
                        <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
                        <Field label="Picture day" value={pictureDay} onChangeText={setPictureDay} multiline />
                    </StyledCard>

                    <TouchableOpacity
                        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>Save</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

function Field({
    label,
    value,
    onChangeText,
    multiline,
}: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    multiline?: boolean;
}) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[styles.input, multiline && styles.inputMulti]}
                value={value}
                onChangeText={onChangeText}
                multiline={multiline}
                placeholderTextColor={theme.colors.textSecondary}
                placeholder={`Enter ${label.toLowerCase()}…`}
            />
        </View>
    );
}

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
    muted: { color: theme.colors.textSecondary, textAlign: 'center' },
    scroll: { padding: theme.spacing.md, paddingBottom: 48 },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
        gap: 16,
    },
    dateBtn: { padding: 8 },
    dateText: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
    card: { padding: theme.spacing.md, marginBottom: theme.spacing.md },
    field: { marginBottom: 14 },
    label: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: theme.colors.text,
        backgroundColor: theme.colors.surface,
    },
    inputMulti: { minHeight: 72, textAlignVertical: 'top' },
    saveBtn: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: 14,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
