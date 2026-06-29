import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Share, Modal, Pressable, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { supabase } from '../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '../contexts/CompanyContext';
import {
    useTodayBirthdays,
    useDailyNewsSchedule,
    useTodaySportsCalendar,
    useTodaySpecialEventsActivities,
    useDailyWolfContentRow,
} from '../api/dashboard';
import * as DocumentPicker from 'expo-document-picker';
import { uploadDailyWolfDocument, pathFromFileUrl, getSignedUrl } from '../api/storage';
import { isOnlineNow } from '../offline/engine';
import { Linking } from 'react-native';
import { divisionNamesLabel, formatPrintableTime } from '../lib/dailyWolfPrintableUtils';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

export const DailyNewsScreen = ({ navigation }: any) => {
    const { companyId, season, isTimberLakeWest } = useCompany();
    const queryClient = useQueryClient();
    const [showDailyWolfUpload, setShowDailyWolfUpload] = useState(false);
    const [dailyWolfDate, setDailyWolfDate] = useState(new Date().toISOString().split('T')[0]);
    const [dailyWolfFileUri, setDailyWolfFileUri] = useState<string | null>(null);
    const [dailyWolfFileName, setDailyWolfFileName] = useState('');
    const [dailyWolfUploading, setDailyWolfUploading] = useState(false);

    const currentDate = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dayName = dayNames[currentDate.getDay()];
    const monthName = monthNames[currentDate.getMonth()];
    const day = currentDate.getDate();
    const year = currentDate.getFullYear();
    const formattedDate = `${dayName}, ${monthName} ${day}, ${year}`;
    const todayString = currentDate.toISOString().split('T')[0];
    const todayMonth = currentDate.getMonth() + 1;
    const todayDay = currentDate.getDate();

    // Birthdays: same as Dashboard (children + staff, name + type/age) – aligned with main app Daily Notes
    const { data: birthdays = [] } = useTodayBirthdays(companyId, season ?? null, todayMonth, todayDay);

    // Today's schedule: same as main app Daily Notes – sports_calendar + activities_field_trips + special_events_activities by event_date & season
    const { data: scheduleEvents = [] } = useDailyNewsSchedule(companyId, todayString, season ?? null);
    const { data: sportsToday = [] } = useTodaySportsCalendar(
        companyId,
        todayString,
        season ?? null,
        isTimberLakeWest,
    );
    const { data: specialActivitiesToday = [] } = useTodaySpecialEventsActivities(
        companyId,
        todayString,
        season ?? null,
        isTimberLakeWest,
    );
    const { data: dailyWolfRow } = useDailyWolfContentRow(
        companyId,
        todayString,
        season ?? null,
        isTimberLakeWest,
    );

    // Today's menu from menu_items (same schema as web, with season filter like main app)
    const { data: meals = null } = useQuery({
        queryKey: ['daily_meals', companyId, todayString, season],
        queryFn: async () => {
            if (!companyId) return null;
            try {
                let q = supabase
                    .from('menu_items')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('date', todayString);
                if (season) {
                    q = q.or(`season.eq.${season},season.is.null`);
                }
                const { data, error } = await q;
                if (error) return null;
                const out: Record<string, string> = { breakfast: '', lunch: '', dinner: '', snack: '' };
                (data || []).forEach((item: any) => {
                    const type = (item.meal_type || '').toLowerCase();
                    const content = item.items ?? item.description ?? '';
                    if (type in out) out[type] = content;
                });
                return out;
            } catch {
                return null;
            }
        },
        enabled: !!companyId,
    });

    // Daily Wolf documents (PDFs)
    const { data: dailyWolfDocs = [] } = useQuery({
        queryKey: ['daily_wolf_documents', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('daily_wolf_documents')
                .select('*')
                .eq('company_id', companyId)
                .eq('season', season || '2026')
                .order('date', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId,
    });

    const pickDailyWolfFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
            if (result.assets?.[0]) {
                setDailyWolfFileName(result.assets[0].name);
                setDailyWolfFileUri(result.assets[0].uri);
            }
        } catch (_) {}
    };

    const uploadDailyWolf = async () => {
        if (!companyId || !dailyWolfFileUri || !dailyWolfFileName) {
            Alert.alert('Missing info', 'Please select a PDF and date.');
            return;
        }
        if (!(await isOnlineNow())) {
            Alert.alert('Offline', 'PDF upload requires internet. Please reconnect and try again.');
            return;
        }
        setDailyWolfUploading(true);
        try {
            const response = await fetch(dailyWolfFileUri);
            const arrayBuffer = await response.arrayBuffer();
            const storagePath = await uploadDailyWolfDocument({
                companyId,
                season: season || '2026',
                date: dailyWolfDate,
                fileName: dailyWolfFileName,
                file: arrayBuffer,
            });
            const { data: { user } } = await supabase.auth.getUser();
            const { data: urlData } = supabase.storage.from('daily-wolf-documents').getPublicUrl(storagePath);
            const { error } = await supabase.from('daily_wolf_documents').insert({
                company_id: companyId,
                season: season || '2026',
                date: dailyWolfDate,
                file_name: dailyWolfFileName,
                file_url: urlData.publicUrl,
                uploaded_by: user?.id ?? null,
            });
            if (error) throw error;
            Alert.alert('Uploaded', 'The Bear PDF uploaded successfully.');
            setShowDailyWolfUpload(false);
            setDailyWolfFileUri(null);
            setDailyWolfFileName('');
            queryClient.invalidateQueries({ queryKey: ['daily_wolf_documents'] });
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Upload failed');
        } finally {
            setDailyWolfUploading(false);
        }
    };

    const handlePrint = async () => {
        try {
            const lines = [
                `Daily News – ${formattedDate}`,
                '',
                'Birthdays: ' + (birthdays.length ? birthdays.map((p: any) => (p.type === 'child' ? `${p.name} (Turning ${p.age} today!)` : `${p.name} (Staff)`)).join(', ') : 'None today'),
                '',
                'Today’s events: ' + (scheduleEvents.length ? scheduleEvents.map((e: any) => e.title || e.description).join('; ') : 'None'),
                '',
                'Meals – Breakfast: ' + (meals?.breakfast || 'TBD'),
                'Lunch: ' + (meals?.lunch || 'TBD'),
                'Dinner: ' + (meals?.dinner || 'TBD'),
            ];
            await Share.share({
                message: lines.join('\n'),
                title: 'Daily News',
            });
        } catch (e) {
            // User cancelled or share failed
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>
                        {isTimberLakeWest ? 'Daily Wolf' : 'Tyler Hill Daily News'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.printButton}
                    onPress={handlePrint}
                >
                    <Ionicons name="print-outline" size={20} color={theme.colors.text} style={styles.printIcon} />
                    {!isSmallScreen && <Text style={styles.printButtonText}>Print</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* News Content Card */}
                <StyledCard style={styles.newsCard}>
                    {/* Header Section */}
                    <View style={styles.newsHeader}>
                        <Text style={styles.newsTitle}>
                            {isTimberLakeWest ? 'THE DAILY WOLF' : 'TYLER HILL DAILY NEWS'}
                        </Text>
                        <Text style={styles.newsSubtitle}>
                            {isTimberLakeWest ? 'TIMBER LAKE WEST' : 'HOME OF THE BEARS'}
                        </Text>
                        <Text style={styles.newsDate}>{formattedDate}</Text>
                    </View>

                    {/* Birthday Wishes – same data as Dashboard (children + staff) */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="gift-outline" size={20} color={theme.colors.text} style={styles.sectionIcon} />
                            <Text style={styles.sectionTitle}>Birthday Wishes</Text>
                        </View>
                        {birthdays.length === 0 ? (
                            <Text style={styles.birthdayNames}>No birthdays today</Text>
                        ) : (
                            <Text style={styles.birthdayNames}>
                                🎉 {birthdays.map((p: any) => p.name).join(', ')}
                            </Text>
                        )}
                    </View>

                    {/* Today's Schedule – sports + activities + special events (same as main app Daily Notes) */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Today's Schedule</Text>
                        {scheduleEvents.length === 0 ? (
                            <Text style={styles.emptyMessage}>No events scheduled for today</Text>
                        ) : (
                            scheduleEvents.map((event: any) => (
                                <View key={event.id} style={styles.scheduleItem}>
                                    <Text style={styles.menuLabel}>{event.time || '—'}</Text>
                                    <View style={styles.scheduleEventContent}>
                                        <Text style={styles.menuValue}>{event.title}</Text>
                                        {event.location ? <Text style={styles.eventType}>@ {event.location}</Text> : null}
                                        {event.description ? <Text style={styles.eventType}>{event.description}</Text> : null}
                                    </View>
                                    <Text style={styles.eventType}>[{event.type}]</Text>
                                </View>
                            ))
                        )}
                    </View>

                    {/* Today's Menu */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Today's Menu</Text>
                        <View style={styles.menuContainer}>
                            <View style={styles.menuItem}>
                                <Text style={styles.menuLabel}>Breakfast:</Text>
                                <Text style={styles.menuValue}>{meals?.breakfast?.trim() || '—'}</Text>
                            </View>
                            <View style={styles.menuItem}>
                                <Text style={styles.menuLabel}>Lunch:</Text>
                                <Text style={styles.menuValue}>{meals?.lunch?.trim() || '—'}</Text>
                            </View>
                            <View style={styles.menuItem}>
                                <Text style={styles.menuLabel}>Snack:</Text>
                                <Text style={styles.menuValue}>{meals?.snack?.trim() || '—'}</Text>
                            </View>
                            <View style={styles.menuItem}>
                                <Text style={styles.menuLabel}>Dinner:</Text>
                                <Text style={styles.menuValue}>{meals?.dinner?.trim() || '—'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Timber Lake West additions (match Daily Wolf printable/main dashboard content) */}
                    {isTimberLakeWest && (
                        <>
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Athletics</Text>
                                {sportsToday.length === 0 ? (
                                    <Text style={styles.emptyMessage}>No athletic events scheduled</Text>
                                ) : (
                                    sportsToday.map((evt: any) => (
                                        <View key={`dw-ath-${evt.id}`} style={styles.scheduleItem}>
                                            <Text style={styles.menuLabel}>{evt.time || '—'}</Text>
                                            <View style={styles.scheduleEventContent}>
                                                <Text style={styles.menuValue}>{evt.title || 'Untitled event'}</Text>
                                                <Text style={styles.eventType}>
                                                    {evt.location || 'TBD'}
                                                    {evt.sport_type ? ` • ${evt.sport_type}` : ''}
                                                </Text>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Quote of the Day</Text>
                                <Text style={styles.emptyMessage}>
                                    {dailyWolfRow?.quote_of_the_day?.trim()
                                        ? `"${dailyWolfRow.quote_of_the_day.trim()}"`
                                        : 'No quote set'}
                                </Text>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>OD</Text>
                                <Text style={styles.birthdayNames}>
                                    {dailyWolfRow?.officer_of_day?.trim() || 'TBD'}
                                </Text>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Laundry</Text>
                                <Text style={styles.birthdayNames}>
                                    {dailyWolfRow?.laundry_info?.trim() || 'TBD'}
                                </Text>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Phone Calls</Text>
                                <Text style={styles.birthdayNames}>
                                    {dailyWolfRow?.phone_calls_info?.trim() || 'TBD'}
                                </Text>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Evening Activities</Text>
                                {specialActivitiesToday.filter((e: any) => e.event_type === 'evening-activity').length === 0 ? (
                                    <Text style={styles.emptyMessage}>No evening activities scheduled</Text>
                                ) : (
                                    specialActivitiesToday
                                        .filter((e: any) => e.event_type === 'evening-activity')
                                        .map((evt: any) => {
                                            const divisionLabel = divisionNamesLabel(evt.divisions ?? []);
                                            return (
                                            <View key={`dw-evening-${evt.id}`} style={styles.scheduleItem}>
                                                <Text style={styles.menuLabel}>{formatPrintableTime(evt.time_slot)}</Text>
                                                <View style={styles.scheduleEventContent}>
                                                    <Text style={styles.menuValue}>{evt.title || 'Untitled event'}</Text>
                                                    {divisionLabel ? (
                                                        <Text style={styles.eventType}>{divisionLabel}</Text>
                                                    ) : null}
                                                    <Text style={styles.eventType}>{evt.location || 'TBD'}</Text>
                                                </View>
                                            </View>
                                            );
                                        })
                                )}
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Notes</Text>
                                <Text style={styles.birthdayNames}>
                                    {dailyWolfRow?.notes?.trim() || 'No notes added'}
                                </Text>
                            </View>
                        </>
                    )}
                </StyledCard>

                {/* The Bear PDFs (Tyler Hill branding; storage/table keys remain daily_wolf_*) */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="document-text-outline" size={20} color={theme.colors.text} style={styles.sectionIcon} />
                        <Text style={styles.sectionTitle}>The Bear PDFs</Text>
                        <TouchableOpacity style={styles.uploadPdfButton} onPress={() => setShowDailyWolfUpload(true)}>
                            <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                            <Text style={styles.uploadPdfButtonText}>Upload PDF</Text>
                        </TouchableOpacity>
                    </View>
                    {dailyWolfDocs.length === 0 ? (
                        <Text style={styles.emptyMessage}>No Bear PDFs uploaded yet</Text>
                    ) : (
                        dailyWolfDocs.slice(0, 10).map((doc: any) => (
                            <View key={doc.id} style={styles.docRow}>
                                <Text style={styles.docName}>{doc.file_name}</Text>
                                <Text style={styles.docDate}>{doc.date}</Text>
                                <TouchableOpacity
                                    onPress={async () => {
                                        const path = pathFromFileUrl(doc.file_url, 'daily-wolf-documents');
                                        if (path) {
                                            try {
                                                const url = await getSignedUrl('dailyWolfDocuments', path);
                                                Linking.openURL(url);
                                            } catch (_) {}
                                        }
                                    }}
                                >
                                    <Text style={styles.viewPdfLink}>View</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            <Modal visible={showDailyWolfUpload} transparent animationType="slide">
                <Pressable style={styles.modalOverlay} onPress={() => setShowDailyWolfUpload(false)}>
                    <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                        <Text style={styles.modalTitle}>Upload The Bear PDF</Text>
                        <Text style={styles.label}>Date</Text>
                        <TextInput
                            style={styles.input}
                            value={dailyWolfDate}
                            onChangeText={setDailyWolfDate}
                            placeholder="YYYY-MM-DD"
                        />
                        <Text style={styles.label}>PDF File</Text>
                        <TouchableOpacity style={styles.chooseFileBtn} onPress={pickDailyWolfFile}>
                            <Text style={styles.chooseFileBtnText}>{dailyWolfFileName || 'Choose file'}</Text>
                        </TouchableOpacity>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDailyWolfUpload(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.uploadBtn, dailyWolfUploading && { opacity: 0.7 }]}
                                onPress={uploadDailyWolf}
                                disabled={dailyWolfUploading}
                            >
                                {dailyWolfUploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.uploadBtnText}>Upload</Text>}
                            </TouchableOpacity>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        minHeight: 60,
    },
    menuButton: {
        padding: theme.spacing.xs,
    },
    headerTitleContainer: {
        flex: 1,
        marginHorizontal: theme.spacing.md,
    },
    headerTitle: {
        ...theme.typography.h1,
        fontSize: isSmallScreen ? 18 : 24,
        fontWeight: '700',
        color: theme.colors.text,
    },
    printButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minHeight: 44,
    },
    printIcon: {
        marginRight: isSmallScreen ? 0 : theme.spacing.xs,
    },
    printButtonText: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 12 : 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.md,
    },
    newsCard: {
        padding: theme.spacing.lg,
    },
    newsHeader: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        paddingBottom: theme.spacing.lg,
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.border,
    },
    newsTitle: {
        ...theme.typography.h1,
        fontSize: isSmallScreen ? 20 : 24,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
        letterSpacing: 1,
        textAlign: 'center',
    },
    newsSubtitle: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 14 : 16,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    newsDate: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 12 : 14,
        color: theme.colors.text,
        fontWeight: '500',
        textAlign: 'center',
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    sectionIcon: {
        marginRight: theme.spacing.xs,
    },
    sectionTitle: {
        ...theme.typography.h3,
        fontSize: isSmallScreen ? 16 : 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    birthdayNames: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 14 : 16,
        color: theme.colors.text,
        lineHeight: isSmallScreen ? 20 : 24,
    },
    scheduleItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        gap: theme.spacing.sm,
    },
    scheduleEventContent: {
        flex: 1,
    },
    eventType: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 12 : 13,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 2,
    },
    emptyMessage: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 14 : 16,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    menuContainer: {
        gap: theme.spacing.md,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.xs,
    },
    menuLabel: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 14 : 16,
        fontWeight: '600',
        color: theme.colors.text,
        minWidth: 80,
    },
    menuValue: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 14 : 16,
        color: theme.colors.text,
        flex: 1,
    },
    uploadPdfButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        gap: 4,
        marginLeft: 'auto',
    },
    uploadPdfButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    docRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        gap: theme.spacing.sm,
    },
    docName: { flex: 1, fontSize: 14, color: theme.colors.text },
    docDate: { fontSize: 13, color: theme.colors.textSecondary },
    viewPdfLink: { fontSize: 14, color: theme.colors.primary, fontWeight: '500' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: theme.spacing.lg,
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
    },
    modalTitle: { ...theme.typography.h3, marginBottom: theme.spacing.md },
    label: { fontSize: 14, fontWeight: '500', color: theme.colors.text, marginBottom: 4 },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.sm,
        padding: theme.spacing.sm,
        marginBottom: theme.spacing.md,
        fontSize: 14,
    },
    chooseFileBtn: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.sm,
        padding: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    chooseFileBtnText: { fontSize: 14, color: theme.colors.text },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
    cancelBtn: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md },
    cancelBtnText: { fontSize: 14, color: theme.colors.textSecondary },
    uploadBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.sm,
        minWidth: 80,
        alignItems: 'center',
    },
    uploadBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

