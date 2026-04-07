import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    Pressable,
    Alert,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { MobileUserMenu } from '../components/MobileUserMenu';
import { useCompany } from '../contexts/CompanyContext';
import { supabase } from '../lib/supabase';

type WolfForm = {
    officer_of_day: string;
    quote_of_the_day: string;
    laundry_info: string;
    phone_calls_info: string;
    notes: string;
};

const EMPTY_FORM: WolfForm = {
    officer_of_day: '',
    quote_of_the_day: '',
    laundry_info: '',
    phone_calls_info: '',
    notes: '',
};

const GUIDE_TABS = [
    'Children',
    'Staff',
    'Medications',
    'Menu',
    'Awards',
    'Incidents',
    'Calendar',
    'Sports',
    'Sports Academy',
    'Tutoring',
    'Daily Wolf',
];

const GUIDE_CONTENT: Record<string, { title: string; subtitle: string; required: string; example: string; note: string }> = {
    'Daily Wolf': {
        title: 'Daily Wolf Content',
        subtitle: 'CSV format for Daily Wolf management upload',
        required: 'date, officer_of_day, quote_of_the_day, laundry_info, phone_calls_info, notes',
        example: '2026-04-06, John Doe, Make today amazing!, Laundry after lunch, Bunks A-B at 6:30 PM, Have a great day at Timber Lake West!',
        note: 'REQUIRED: date. Other fields are optional but recommended.',
    },
    default: {
        title: 'Children Roster',
        subtitle: 'CSV format for children roster upload',
        required: 'first_name, last_name, person_id, age, grade, gender',
        example: 'John, Doe, P12345, 10, 5, Male',
        note: 'REQUIRED: first_name and last_name (or name). All other fields are optional.',
    },
};

/** Match web `date-fns` `format(date, 'yyyy-MM-dd')` — local calendar date, not UTC. */
function formatDateLocalYmd(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Focused input border (web Daily Wolf — coral when active). */
const INPUT_FOCUS_BORDER = '#E67E6E';
/** Date trigger + calendar accent (web — orange). */
const CALENDAR_ORANGE = '#f27a21';

type FocusField = 'officer' | 'quote' | 'laundry' | 'phone' | 'notes' | null;

const formatDisplayDate = (date: Date) => {
    const day = date.getDate();
    const suffix =
        day % 10 === 1 && day !== 11
            ? 'st'
            : day % 10 === 2 && day !== 12
              ? 'nd'
              : day % 10 === 3 && day !== 13
                ? 'rd'
                : 'th';
    return `${date.toLocaleDateString('en-US', { month: 'long' })} ${day}${suffix}, ${date.getFullYear()}`;
};

type DailyWolfRow = {
    id: string;
    officer_of_day?: string | null;
    quote_of_the_day?: string | null;
    laundry_info?: string | null;
    phone_calls_info?: string | null;
    notes?: string | null;
};

export const DailyWolfManagementScreen = ({ navigation }: any) => {
    const { companyId, season } = useCompany();
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [activeHelpTab, setActiveHelpTab] = useState('Children');
    const [form, setForm] = useState<WolfForm>(EMPTY_FORM);
    const [focusedField, setFocusedField] = useState<FocusField>(null);
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(false);

    const selectedYmd = useMemo(() => formatDateLocalYmd(selectedDate), [selectedDate]);

    const { data: existingRow, isFetching } = useQuery({
        queryKey: ['daily_wolf_management_row', companyId, season, selectedYmd],
        queryFn: async () => {
            if (!companyId || !season) return null;
            const { data, error } = await supabase
                .from('daily_wolf_content')
                .select('*')
                .eq('company_id', companyId)
                .eq('season', season)
                .eq('date', selectedYmd)
                .maybeSingle();
            if (error) throw error;
            return data as DailyWolfRow | null;
        },
        enabled: !!companyId && !!season,
    });

    useEffect(() => {
        if (existingRow) {
            setForm({
                officer_of_day: existingRow.officer_of_day ?? '',
                quote_of_the_day: existingRow.quote_of_the_day ?? '',
                laundry_info: existingRow.laundry_info ?? '',
                phone_calls_info: existingRow.phone_calls_info ?? '',
                notes: existingRow.notes ?? '',
            });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [existingRow]);

    const saveField = useCallback(
        async (field: keyof WolfForm, value: string) => {
            const rowId = existingRow?.id;
            if (!rowId) return;
            setSaving(true);
            try {
                const { error } = await supabase
                    .from('daily_wolf_content')
                    .update({ [field]: value })
                    .eq('id', rowId);
                if (error) throw error;
                await queryClient.invalidateQueries({ queryKey: ['daily_wolf_management_row'] });
                await queryClient.invalidateQueries({ queryKey: ['daily_wolf_content_dashboard'] });
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Failed to save';
                Alert.alert('Save failed', msg);
            } finally {
                setSaving(false);
            }
        },
        [existingRow?.id, queryClient],
    );

    const blurField = useCallback(
        (field: keyof WolfForm, value: string) => {
            setFocusedField(null);
            void saveField(field, value);
        },
        [saveField],
    );

    useEffect(() => {
        if (!companyId) return;
        const channel = supabase
            .channel(`daily_wolf_content_${companyId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'daily_wolf_content',
                    filter: `company_id=eq.${companyId}`,
                },
                () => {
                    void queryClient.invalidateQueries({ queryKey: ['daily_wolf_management_row'] });
                    void queryClient.invalidateQueries({ queryKey: ['daily_wolf_content_dashboard'] });
                },
            )
            .subscribe();
        return () => {
            void supabase.removeChannel(channel);
        };
    }, [companyId, queryClient]);

    const createTodaysEntry = async () => {
        if (!companyId || !season) {
            Alert.alert('Error', 'Camp or season missing');
            return;
        }
        setCreating(true);
        try {
            const { error } = await supabase.from('daily_wolf_content').insert({
                company_id: companyId,
                date: selectedYmd,
                season,
                officer_of_day: '',
                quote_of_the_day: '',
                laundry_info: '',
                phone_calls_info: '',
                notes: '',
            });
            if (error) throw error;
            await queryClient.invalidateQueries({ queryKey: ['daily_wolf_management_row'] });
            await queryClient.invalidateQueries({ queryKey: ['daily_wolf_content_dashboard'] });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to create entry';
            Alert.alert('Error', msg);
        } finally {
            setCreating(false);
        }
    };

    const guide = GUIDE_CONTENT[activeHelpTab] || GUIDE_CONTENT.default;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Messages')}
                            style={styles.headerIconBtn}
                        >
                            <Ionicons name="notifications-outline" size={24} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <MobileUserMenu navigation={navigation} />
                    </View>
                </View>

                <View style={styles.titleSection}>
                    <Text style={styles.title}>Daily Wolf Management</Text>
                    <Text style={styles.subtitle}>Manage daily content for The Daily Wolf</Text>
                </View>

                <View style={styles.topControls}>
                    <View style={styles.dateWrap}>
                        <Text style={styles.controlLabel}>Select Date</Text>
                        <TouchableOpacity
                            style={[styles.dateBtn, showDatePicker && styles.dateBtnActive]}
                            onPress={() => setShowDatePicker((open) => !open)}
                            activeOpacity={0.85}
                        >
                            <Ionicons
                                name="calendar-outline"
                                size={16}
                                color={showDatePicker ? '#ffffff' : theme.colors.textSecondary}
                            />
                            <Text style={[styles.dateBtnText, showDatePicker && styles.dateBtnTextActive]}>
                                {formatDisplayDate(selectedDate)}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.rightControls}>
                        <TouchableOpacity style={styles.iconSquare} onPress={() => setShowHelpModal(true)}>
                            <Ionicons name="help-circle-outline" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.uploadBtn}
                            onPress={() => Alert.alert('Upload CSV', 'CSV upload wiring can be added next.')}
                        >
                            <Ionicons name="cloud-upload-outline" size={16} color={theme.colors.text} />
                            <Text style={styles.uploadBtnText}>Upload CSV</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {!existingRow && !isFetching ? (
                    <StyledCard style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No content exists for this date.</Text>
                        <TouchableOpacity
                            style={[styles.createBtn, creating && { opacity: 0.7 }]}
                            onPress={() => void createTodaysEntry()}
                            disabled={creating}
                        >
                            <Text style={styles.createBtnText}>
                                {creating ? 'Creating…' : 'Create Entry'}
                            </Text>
                        </TouchableOpacity>
                    </StyledCard>
                ) : isFetching && !existingRow ? (
                    <StyledCard style={styles.emptyCard}>
                        <Text style={styles.emptyText}>Loading content…</Text>
                    </StyledCard>
                ) : (
                    <View style={styles.grid}>
                        <StyledCard style={styles.gridCard}>
                            <Text style={styles.cardTitle}>Super OD</Text>
                            <Text style={styles.cardSub}>Super OD information</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    focusedField === 'officer' && styles.inputFocused,
                                ]}
                                placeholder="Enter OD name/details"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={form.officer_of_day}
                                editable={!saving}
                                onChangeText={(v) => setForm((p) => ({ ...p, officer_of_day: v }))}
                                onFocus={() => setFocusedField('officer')}
                                onBlur={() => blurField('officer_of_day', form.officer_of_day)}
                            />
                        </StyledCard>

                        <StyledCard style={styles.gridCard}>
                            <Text style={styles.cardTitle}>Quote of the Day</Text>
                            <Text style={styles.cardSub}>Daily inspirational quote</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    focusedField === 'quote' && styles.inputFocused,
                                ]}
                                placeholder="Enter quote"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={form.quote_of_the_day}
                                editable={!saving}
                                onChangeText={(v) => setForm((p) => ({ ...p, quote_of_the_day: v }))}
                                onFocus={() => setFocusedField('quote')}
                                onBlur={() => blurField('quote_of_the_day', form.quote_of_the_day)}
                            />
                        </StyledCard>

                        <StyledCard style={styles.gridCard}>
                            <Text style={styles.cardTitle}>Laundry Schedule</Text>
                            <Text style={styles.cardSub}>Laundry times and information</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    styles.textArea,
                                    focusedField === 'laundry' && styles.inputFocused,
                                ]}
                                multiline
                                placeholder="Enter laundry schedule"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={form.laundry_info}
                                editable={!saving}
                                onChangeText={(v) => setForm((p) => ({ ...p, laundry_info: v }))}
                                onFocus={() => setFocusedField('laundry')}
                                onBlur={() => blurField('laundry_info', form.laundry_info)}
                            />
                        </StyledCard>

                        <StyledCard style={styles.gridCard}>
                            <Text style={styles.cardTitle}>Phone Calls</Text>
                            <Text style={styles.cardSub}>Phone call schedule and notes</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    styles.textArea,
                                    focusedField === 'phone' && styles.inputFocused,
                                ]}
                                multiline
                                placeholder="Enter phone call information"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={form.phone_calls_info}
                                editable={!saving}
                                onChangeText={(v) => setForm((p) => ({ ...p, phone_calls_info: v }))}
                                onFocus={() => setFocusedField('phone')}
                                onBlur={() => blurField('phone_calls_info', form.phone_calls_info)}
                            />
                        </StyledCard>

                        <StyledCard style={styles.notesCard}>
                            <Text style={styles.cardTitle}>General Notes</Text>
                            <Text style={styles.cardSub}>Additional daily notes and announcements</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    styles.notesArea,
                                    focusedField === 'notes' && styles.inputFocused,
                                ]}
                                multiline
                                placeholder="Enter general notes"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={form.notes}
                                editable={!saving}
                                onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
                                onFocus={() => setFocusedField('notes')}
                                onBlur={() => blurField('notes', form.notes)}
                            />
                        </StyledCard>
                    </View>
                )}
            </ScrollView>

            <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
                    <Pressable style={styles.dateModalContent} onPress={(e) => e.stopPropagation()}>
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                            themeVariant="light"
                            accentColor={CALENDAR_ORANGE}
                            onChange={(event, dt) => {
                                if (Platform.OS === 'android') {
                                    setShowDatePicker(false);
                                }
                                if (event.type === 'dismissed') return;
                                if (dt) setSelectedDate(dt);
                            }}
                        />
                        <TouchableOpacity
                            style={[styles.dateDoneBtn, { backgroundColor: CALENDAR_ORANGE }]}
                            onPress={() => setShowDatePicker(false)}
                        >
                            <Text style={styles.dateDoneText}>Done</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={showHelpModal} transparent animationType="fade" onRequestClose={() => setShowHelpModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowHelpModal(false)}>
                    <Pressable style={styles.helpModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.helpHeader}>
                            <Text style={styles.helpTitle}>CSV Upload Format Guide</Text>
                            <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.helpTabsWrap}>
                            {GUIDE_TABS.map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.helpTab, activeHelpTab === tab && styles.helpTabActive]}
                                    onPress={() => setActiveHelpTab(tab)}
                                >
                                    <Text style={[styles.helpTabText, activeHelpTab === tab && styles.helpTabTextActive]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <ScrollView style={styles.helpBody}>
                            <Text style={styles.helpBodyTitle}>{guide.title}</Text>
                            <Text style={styles.helpBodySub}>{guide.subtitle}</Text>

                            <Text style={styles.helpLabel}>Required Columns (first row):</Text>
                            <View style={styles.codeBox}>
                                <Text style={styles.codeText}>{guide.required}</Text>
                            </View>

                            <Text style={styles.helpLabel}>Example Data Row:</Text>
                            <View style={styles.codeBox}>
                                <Text style={styles.codeText}>{guide.example}</Text>
                            </View>

                            <View style={styles.noteBox}>
                                <Text style={styles.noteText}>{guide.note}</Text>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { padding: theme.spacing.md, paddingBottom: 100 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    headerIconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    titleSection: { marginBottom: theme.spacing.md },
    title: { ...theme.typography.h1, fontSize: 36, color: theme.colors.text },
    subtitle: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
        flexWrap: 'wrap',
    },
    dateWrap: { minWidth: 220 },
    controlLabel: { fontSize: 13, color: theme.colors.text, marginBottom: 6, fontWeight: '600' },
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#f8fafc',
        height: 40,
        paddingHorizontal: 10,
    },
    dateBtnActive: {
        backgroundColor: CALENDAR_ORANGE,
        borderColor: CALENDAR_ORANGE,
    },
    dateBtnText: { color: theme.colors.text, fontSize: 14 },
    dateBtnTextActive: { color: '#ffffff', fontWeight: '600' },
    rightControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconSquare: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 10,
        height: 36,
    },
    uploadBtnText: { fontSize: 13, color: theme.colors.text, fontWeight: '600' },
    emptyCard: { padding: theme.spacing.md },
    emptyText: { color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
    createBtn: {
        alignSelf: 'flex-start',
        backgroundColor: '#f97316',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    createBtnText: { color: '#fff', fontWeight: '700' },
    grid: { gap: theme.spacing.md, flexDirection: 'row', flexWrap: 'wrap' },
    gridCard: {
        width: '100%',
        ...(Platform.OS === 'web' ? ({ maxWidth: '49%' } as any) : {}),
    },
    notesCard: { width: '100%' },
    cardTitle: { ...theme.typography.h3, fontSize: 28, color: theme.colors.text, marginBottom: 2 },
    cardSub: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#f8fafc',
        minHeight: 42,
        paddingHorizontal: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        outlineStyle: 'none',
        outlineWidth: 0,
    },
    inputFocused: {
        borderColor: INPUT_FOCUS_BORDER,
        borderWidth: 1,
        backgroundColor: '#fff',
    },
    textArea: { minHeight: 90, textAlignVertical: 'top', paddingTop: 10 },
    notesArea: { minHeight: 120, textAlignVertical: 'top', paddingTop: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    dateModalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '92%',
        maxWidth: 420,
        padding: theme.spacing.md,
    },
    dateDoneBtn: {
        marginTop: theme.spacing.sm,
        alignSelf: 'flex-end',
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
    },
    dateDoneText: { color: '#fff', fontWeight: '600' },
    helpModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '95%',
        maxWidth: 980,
        maxHeight: '85%',
        padding: theme.spacing.md,
    },
    helpHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    helpTitle: { ...theme.typography.h3, fontSize: 22, color: theme.colors.text },
    helpTabsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: theme.spacing.md },
    helpTab: {
        backgroundColor: '#f1f5f9',
        borderRadius: theme.borderRadius.sm,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    helpTabActive: { backgroundColor: '#e2e8f0' },
    helpTabText: { color: theme.colors.textSecondary, fontSize: 12 },
    helpTabTextActive: { color: theme.colors.text, fontWeight: '700' },
    helpBody: { flex: 1 },
    helpBodyTitle: { ...theme.typography.h3, color: theme.colors.text, marginBottom: 4 },
    helpBodySub: { color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
    helpLabel: { fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
    codeBox: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    codeText: { fontSize: 12, color: theme.colors.text, fontFamily: 'monospace' },
    noteBox: {
        backgroundColor: '#f1f5f9',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
    },
    noteText: { color: theme.colors.text, fontSize: 12 },
});

