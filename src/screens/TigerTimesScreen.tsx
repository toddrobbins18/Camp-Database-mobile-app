import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    Platform,
    KeyboardAvoidingView,
    LayoutAnimation,
    UIManager,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../theme/theme';
import { useCompany } from '../contexts/CompanyContext';
import { supabase } from '../lib/supabase';
import { MobileUserMenu } from '../components/MobileUserMenu';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Match web `md:grid-cols-2` — side-by-side from this width. */
const TIGER_EDITOR_TWO_COL_MIN_WIDTH = 560;

function formatYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatSelectDateLabel(d: Date): string {
    const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
    ];
    return `${months[d.getMonth()]} ${ordinal(d.getDate())}, ${d.getFullYear()}`;
}

/** Same keys / defaults as web `DailyWolfManagement` + `CalendarColorSettings` (`tiger-times`). */
const TIGER_TIMES_CALENDAR_ID = 'tiger-times';
const TIGER_COLORS_STORAGE_KEY = `calendar-colors-${TIGER_TIMES_CALENDAR_ID}`;

const DEFAULT_TIGER_EVENT_COLORS = {
    Laundry: '#3b82f6',
    'Phone Calls': '#ef4444',
    'Outside Events': '#eab308',
    'Staff Days Off': '#7dd3fc',
    'OD Notes': '#ff69b4',
} as const;

type TigerColorLabel = keyof typeof DEFAULT_TIGER_EVENT_COLORS;

const TIGER_COLOR_ORDER: TigerColorLabel[] = [
    'Laundry',
    'Phone Calls',
    'Outside Events',
    'Staff Days Off',
    'OD Notes',
];

const HEX_PRESETS = [
    '#3b82f6',
    '#ef4444',
    '#eab308',
    '#7dd3fc',
    '#ff69b4',
    '#22c55e',
    '#a855f7',
    '#f97316',
    '#1f2937',
] as const;

function normalizeHex(input: string): string | null {
    let t = input.trim();
    if (!t.startsWith('#')) t = `#${t}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t.toLowerCase();
    return null;
}

const TLC_EDITOR_CARDS: {
    key: string;
    title: string;
    description: string;
    field: 'laundry_info' | 'phone_calls_info' | 'outside_event' | 'od_notes' | 'staff_days_off';
    colorLabel: TigerColorLabel;
    emoji: string;
    placeholder: string;
    minHeight: number;
    /** In two-column layout, span full row (web `md:col-span-2`). */
    wideGridFullWidth?: boolean;
}[] = [
    {
        key: 'laundry',
        title: 'Laundry',
        description: 'Laundry schedule and information',
        field: 'laundry_info',
        colorLabel: 'Laundry',
        emoji: '👕',
        placeholder: 'Enter laundry information',
        minHeight: 100,
    },
    {
        key: 'phone',
        title: 'Phone Calls',
        description: 'Phone call schedule and notes',
        field: 'phone_calls_info',
        colorLabel: 'Phone Calls',
        emoji: '📞',
        placeholder: 'Enter phone call information',
        minHeight: 100,
    },
    {
        key: 'outside',
        title: 'Outside Event',
        description: 'External events and activities',
        field: 'outside_event',
        colorLabel: 'Outside Events',
        emoji: '🌐',
        placeholder: 'Enter outside event details',
        minHeight: 100,
    },
    {
        key: 'od_notes',
        title: 'OD Notes',
        description: 'Officer of the Day notes',
        field: 'od_notes',
        colorLabel: 'OD Notes',
        emoji: '💗',
        placeholder: 'Enter OD notes',
        minHeight: 100,
    },
    {
        key: 'staff_off',
        title: 'Staff Days Off',
        description: 'Staff schedule and days off information',
        field: 'staff_days_off',
        colorLabel: 'Staff Days Off',
        emoji: '🗓️',
        placeholder: 'Enter staff days off information',
        minHeight: 140,
        wideGridFullWidth: true,
    },
];

const CREATE_GREEN = '#15803d';
const SETTINGS_ORANGE = '#f97316';
const SETTINGS_ORANGE_BORDER = '#ea580c';

export const TigerTimesScreen = ({ navigation }: { navigation: any }) => {
    const { width: windowWidth } = useWindowDimensions();
    const editorTwoColumn = windowWidth >= TIGER_EDITOR_TWO_COL_MIN_WIDTH;
    const { companyId, season, isTimberLakeCamp } = useCompany();
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
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

    const [tigerColors, setTigerColors] = useState<Record<TigerColorLabel, string>>(() => ({
        ...DEFAULT_TIGER_EVENT_COLORS,
    }));
    const [showEventColorsModal, setShowEventColorsModal] = useState(false);
    const [colorPickerLabel, setColorPickerLabel] = useState<TigerColorLabel | null>(null);
    const [hexDraft, setHexDraft] = useState('');

    const dateStr = formatYmd(selectedDate);

    const setField = (field: (typeof TLC_EDITOR_CARDS)[number]['field'], value: string) => {
        switch (field) {
            case 'laundry_info':
                setLaundryInfo(value);
                break;
            case 'phone_calls_info':
                setPhoneCallsInfo(value);
                break;
            case 'outside_event':
                setOutsideEvent(value);
                break;
            case 'od_notes':
                setOdNotes(value);
                break;
            case 'staff_days_off':
                setStaffDaysOff(value);
                break;
        }
    };

    const getField = (field: (typeof TLC_EDITOR_CARDS)[number]['field']): string => {
        switch (field) {
            case 'laundry_info':
                return laundryInfo;
            case 'phone_calls_info':
                return phoneCallsInfo;
            case 'outside_event':
                return outsideEvent;
            case 'od_notes':
                return odNotes;
            case 'staff_days_off':
                return staffDaysOff;
        }
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const raw = await AsyncStorage.getItem(TIGER_COLORS_STORAGE_KEY);
                if (cancelled) return;
                if (raw) {
                    const parsed = JSON.parse(raw) as Partial<Record<TigerColorLabel, string>>;
                    setTigerColors({ ...DEFAULT_TIGER_EVENT_COLORS, ...parsed });
                }
            } catch {
                if (!cancelled) setTigerColors({ ...DEFAULT_TIGER_EVENT_COLORS });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const persistTigerColorOverrides = useCallback(async (merged: Record<TigerColorLabel, string>) => {
        const overrides: Partial<Record<TigerColorLabel, string>> = {};
        (TIGER_COLOR_ORDER as TigerColorLabel[]).forEach((k) => {
            if (merged[k] !== DEFAULT_TIGER_EVENT_COLORS[k]) overrides[k] = merged[k];
        });
        if (Object.keys(overrides).length === 0) {
            await AsyncStorage.removeItem(TIGER_COLORS_STORAGE_KEY);
        } else {
            await AsyncStorage.setItem(TIGER_COLORS_STORAGE_KEY, JSON.stringify(overrides));
        }
    }, []);

    const handleTigerColorChange = useCallback(
        (label: TigerColorLabel, hex: string) => {
            const normalized = normalizeHex(hex);
            if (!normalized) {
                Alert.alert('Invalid color', 'Enter a hex color like #3b82f6.');
                return;
            }
            setTigerColors((prev) => {
                const next = { ...prev, [label]: normalized };
                void persistTigerColorOverrides(next);
                return next;
            });
            setColorPickerLabel(null);
        },
        [persistTigerColorOverrides]
    );

    const handleTigerColorsReset = useCallback(() => {
        setTigerColors({ ...DEFAULT_TIGER_EVENT_COLORS });
        void AsyncStorage.removeItem(TIGER_COLORS_STORAGE_KEY);
    }, []);

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

    const handleSave = async () => {
        if (!companyId || !season || !isTimberLakeCamp || !rowId) return;
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
            const { error } = await supabase.from('daily_wolf_content').update(payload).eq('id', rowId);
            if (error) throw error;
            Alert.alert('Saved', 'Tiger Times content updated.');
        } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const createTodaysEntry = async () => {
        if (!companyId || !season || !isTimberLakeCamp) return;
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('daily_wolf_content')
                .insert({
                    company_id: companyId,
                    date: dateStr,
                    season,
                    officer_of_day: '',
                    laundry_info: '',
                    phone_calls_info: '',
                    quote_of_the_day: '',
                    notes: '',
                    picture_day: '',
                    outside_event: '',
                    staff_days_off: '',
                    od_notes: '',
                })
                .select('id')
                .single();
            if (error) throw error;
            if (data?.id) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setRowId(data.id);
            }
            Alert.alert('Created', 'New entry created successfully.');
        } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Failed to create entry. Check your permissions.');
        } finally {
            setSaving(false);
        }
    };

    const onHelpPress = () => {
        Alert.alert(
            'Tiger Times',
            'Pick a date, then create an entry if none exists. Edit category cards and tap Save to update. Bulk CSV import is available on the web app.'
        );
    };

    const onUploadPress = () => {
        Alert.alert(
            'Upload',
            'Bulk CSV upload for Tiger Times (daily_wolf_content) is available on the web app’s Tiger Times page.'
        );
    };

    if (!isTimberLakeCamp) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
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
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
                </TouchableOpacity>
                <MobileUserMenu navigation={navigation} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.secondary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <Text style={styles.pageTitle}>Tiger Times</Text>
                    <Text style={styles.pageSubtitle}>Manage daily content for Tiger Times</Text>

                    <View style={styles.toolbarRow}>
                        <View style={styles.dateBlock}>
                            <Text style={styles.selectDateLabel}>Select Date</Text>
                            <TouchableOpacity
                                style={styles.datePickerBtn}
                                onPress={() => setShowDatePicker(true)}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="calendar-outline" size={18} color={theme.colors.text} />
                                <Text style={styles.datePickerBtnText}>{formatSelectDateLabel(selectedDate)}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.toolbarActions}>
                            <Pressable
                                onPress={() => setShowEventColorsModal(true)}
                                accessibilityLabel="Event color settings"
                                style={({ pressed }) => [
                                    styles.iconToolBtn,
                                    showEventColorsModal && styles.settingsGearActive,
                                    pressed && styles.settingsGearActive,
                                ]}
                            >
                                {({ pressed }) => (
                                    <Ionicons
                                        name="settings-outline"
                                        size={22}
                                        color={showEventColorsModal || pressed ? '#fff' : theme.colors.text}
                                    />
                                )}
                            </Pressable>
                            <TouchableOpacity style={styles.iconToolBtn} onPress={onHelpPress} accessibilityLabel="Help">
                                <Ionicons name="help-circle-outline" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.uploadOutlineBtn} onPress={onUploadPress}>
                                <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.text} />
                                <Text style={styles.uploadOutlineBtnText}>Upload</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {!rowId ? (
                        <View style={styles.mainCard}>
                            <Text style={styles.emptyText}>No content exists for this date.</Text>
                            <TouchableOpacity
                                style={[styles.createEntryBtn, saving && styles.btnDisabled]}
                                onPress={createTodaysEntry}
                                disabled={saving}
                                activeOpacity={0.9}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.createEntryBtnText}>Create Entry</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <View
                                style={[
                                    styles.editorGrid,
                                    editorTwoColumn && styles.editorGridTwoColumn,
                                ]}
                            >
                                {TLC_EDITOR_CARDS.map((c) => (
                                    <View
                                        key={c.key}
                                        style={[
                                            styles.categoryCard,
                                            editorTwoColumn &&
                                                (c.wideGridFullWidth
                                                    ? styles.categoryCardGridFull
                                                    : styles.categoryCardGridHalf),
                                            { borderTopColor: tigerColors[c.colorLabel] },
                                        ]}
                                    >
                                        <View style={styles.categoryHeader}>
                                            <Text style={styles.categoryEmoji}>{c.emoji}</Text>
                                            <View style={styles.categoryTitleCol}>
                                                <Text style={styles.categoryTitle}>{c.title}</Text>
                                                <Text style={styles.categoryDesc}>{c.description}</Text>
                                            </View>
                                        </View>
                                        <TextInput
                                            style={[styles.categoryInput, { minHeight: c.minHeight }]}
                                            value={getField(c.field)}
                                            onChangeText={(t) => setField(c.field, t)}
                                            multiline
                                            placeholder={c.placeholder}
                                            placeholderTextColor={theme.colors.textSecondary}
                                        />
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.saveBtn, saving && styles.btnDisabled]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            )}

            <Modal
                visible={showEventColorsModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowEventColorsModal(false)}
            >
                <View style={styles.eventColorsOverlay}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowEventColorsModal(false)}
                        accessibilityLabel="Dismiss"
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.eventColorsSheetWrap}
                    >
                        <View style={styles.eventColorsCard}>
                            <View style={styles.eventColorsHeader}>
                                <Text style={styles.eventColorsTitle}>Event Colors</Text>
                                <TouchableOpacity
                                    style={styles.eventColorsResetBtn}
                                    onPress={handleTigerColorsReset}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.eventColorsResetBtnText}>Reset</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.eventColorsList} keyboardShouldPersistTaps="handled">
                                {TIGER_COLOR_ORDER.map((label) => (
                                    <TouchableOpacity
                                        key={label}
                                        style={styles.eventColorRow}
                                        onPress={() => {
                                            setHexDraft(tigerColors[label]);
                                            setColorPickerLabel(label);
                                        }}
                                        activeOpacity={0.85}
                                    >
                                        <View style={styles.swatchFrame}>
                                            <View
                                                style={[styles.swatchFill, { backgroundColor: tigerColors[label] }]}
                                            />
                                        </View>
                                        <Text style={styles.eventColorLabel}>{label}</Text>
                                        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity
                                style={styles.eventColorsCloseRow}
                                onPress={() => setShowEventColorsModal(false)}
                            >
                                <Text style={styles.eventColorsCloseText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            <Modal
                visible={colorPickerLabel !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setColorPickerLabel(null)}
            >
                <View style={styles.eventColorsOverlay}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setColorPickerLabel(null)}
                        accessibilityLabel="Dismiss"
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.eventColorsSheetWrap}
                    >
                        <View style={styles.hexPickerCard}>
                            <Text style={styles.hexPickerTitle}>{colorPickerLabel ?? ''}</Text>
                            <Text style={styles.hexPickerHint}>Hex color (#RRGGBB)</Text>
                            <TextInput
                                style={styles.hexInput}
                                value={hexDraft}
                                onChangeText={setHexDraft}
                                autoCapitalize="none"
                                autoCorrect={false}
                                placeholder="#3b82f6"
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                            <Text style={styles.hexPresetsLabel}>Presets</Text>
                            <View style={styles.hexPresetRow}>
                                {HEX_PRESETS.map((h) => (
                                    <TouchableOpacity
                                        key={h}
                                        style={[styles.hexPresetDot, { backgroundColor: h }]}
                                        onPress={() => setHexDraft(h)}
                                    />
                                ))}
                            </View>
                            <View style={styles.hexPickerActions}>
                                <TouchableOpacity
                                    style={styles.hexPickerCancel}
                                    onPress={() => setColorPickerLabel(null)}
                                >
                                    <Text style={styles.hexPickerCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.hexPickerApply}
                                    onPress={() =>
                                        colorPickerLabel && handleTigerColorChange(colorPickerLabel, hexDraft)
                                    }
                                >
                                    <Text style={styles.hexPickerApplyText}>Apply</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {showDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={(ev, d) => {
                        setShowDatePicker(false);
                        if (ev.type === 'dismissed') return;
                        if (d) setSelectedDate(d);
                    }}
                />
            )}
            {showDatePicker && (Platform.OS === 'ios' || Platform.OS === 'web') && (
                <Modal transparent visible={showDatePicker} animationType="slide">
                    <View style={styles.iosPickerWrap}>
                        <Pressable style={{ flex: 1 }} onPress={() => setShowDatePicker(false)} />
                        <View style={styles.iosPickerInner}>
                            <DateTimePicker
                                value={selectedDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                themeVariant="light"
                                onChange={(_, d) => d && setSelectedDate(d)}
                            />
                            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDatePicker(false)}>
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
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.primary,
        letterSpacing: -0.5,
    },
    pageSubtitle: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        marginTop: 8,
        marginBottom: theme.spacing.lg,
    },
    scroll: { paddingHorizontal: theme.spacing.md, paddingBottom: 48 },
    toolbarRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    dateBlock: { flexGrow: 1, minWidth: 200 },
    selectDateLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
    },
    datePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingVertical: 10,
        paddingHorizontal: 14,
        maxWidth: 320,
    },
    datePickerBtnText: {
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.text,
        flex: 1,
    },
    toolbarActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
    },
    iconToolBtn: {
        width: 42,
        height: 42,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsGearActive: {
        backgroundColor: SETTINGS_ORANGE,
        borderColor: SETTINGS_ORANGE_BORDER,
    },
    eventColorsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    eventColorsSheetWrap: {
        width: '100%',
        maxWidth: 360,
        zIndex: 2,
    },
    eventColorsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        ...theme.shadows.card,
        maxHeight: 420,
    },
    eventColorsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    eventColorsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
    },
    eventColorsResetBtn: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: CREATE_GREEN,
        backgroundColor: theme.colors.surface,
    },
    eventColorsResetBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: CREATE_GREEN,
    },
    eventColorsList: { maxHeight: 280 },
    eventColorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    swatchFrame: {
        width: 36,
        height: 36,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 3,
        backgroundColor: '#f9fafb',
    },
    swatchFill: { flex: 1, borderRadius: 4 },
    eventColorLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
    },
    eventColorsCloseRow: {
        marginTop: theme.spacing.sm,
        paddingTop: theme.spacing.sm,
        alignItems: 'center',
    },
    eventColorsCloseText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.secondary,
    },
    hexPickerCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        width: '100%',
        ...theme.shadows.card,
    },
    hexPickerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4,
    },
    hexPickerHint: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    hexInput: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    hexPresetsLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    hexPresetRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: theme.spacing.lg,
    },
    hexPresetDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.12)',
    },
    hexPickerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    hexPickerCancel: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    hexPickerCancelText: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    hexPickerApply: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: theme.borderRadius.md,
        backgroundColor: CREATE_GREEN,
    },
    hexPickerApplyText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    uploadOutlineBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    uploadOutlineBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    mainCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.lg,
        ...theme.shadows.card,
    },
    emptyText: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    createEntryBtn: {
        alignSelf: 'flex-start',
        backgroundColor: CREATE_GREEN,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: theme.borderRadius.md,
        minWidth: 140,
        alignItems: 'center',
    },
    createEntryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    editorGrid: {
        width: '100%',
        gap: theme.spacing.md,
    },
    editorGridTwoColumn: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: theme.spacing.md,
        columnGap: theme.spacing.sm,
    },
    categoryCardGridHalf: {
        width: '48%',
        flexGrow: 0,
    },
    categoryCardGridFull: {
        width: '100%',
    },
    categoryCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderTopWidth: 3,
        padding: theme.spacing.md,
        ...theme.shadows.card,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 12,
    },
    categoryEmoji: { fontSize: 22, lineHeight: 26 },
    categoryTitleCol: { flex: 1 },
    categoryTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
    categoryDesc: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
    categoryInput: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: theme.colors.text,
        backgroundColor: '#fafafa',
        textAlignVertical: 'top',
    },
    saveBtn: {
        marginTop: theme.spacing.lg,
        backgroundColor: CREATE_GREEN,
        paddingVertical: 14,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    btnDisabled: { opacity: 0.65 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    muted: { color: theme.colors.textSecondary, textAlign: 'center' },
    iosPickerWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    iosPickerInner: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 24,
        paddingTop: 8,
    },
    doneBtn: {
        marginTop: 8,
        marginHorizontal: theme.spacing.md,
        backgroundColor: theme.colors.secondary,
        paddingVertical: 12,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
