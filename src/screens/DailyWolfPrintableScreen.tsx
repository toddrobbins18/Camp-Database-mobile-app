import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Share,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { MobileUserMenu } from '../components/MobileUserMenu';
import { useCompany } from '../contexts/CompanyContext';
import {
    useTodayBirthdays,
    useDailyWolfContentRow,
    useTodaySportsCalendar,
    useTodaySpecialEventsActivities,
} from '../api/dashboard';

const FOOTER_TAGLINE = 'Have a great day at Timber Lake West!';

function formatLongDate(d: Date): string {
    return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

export const DailyWolfPrintableScreen = ({ navigation }: any) => {
    const { companyId, season, isTimberLakeWest } = useCompany();
    const [showPrintPreview, setShowPrintPreview] = useState(false);

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const longDate = formatLongDate(today);

    const { data: birthdays = [], isLoading: loadingBirthdays } = useTodayBirthdays(companyId, todayMonth, todayDay);
    const { data: dailyWolfRow, isLoading: loadingWolf } = useDailyWolfContentRow(
        companyId,
        todayString,
        season ?? null,
        isTimberLakeWest,
    );
    const { data: sportsToday = [], isLoading: loadingSports } = useTodaySportsCalendar(
        companyId,
        todayString,
        season ?? null,
        isTimberLakeWest,
    );
    const { data: specialActivitiesToday = [], isLoading: loadingSpecial } = useTodaySpecialEventsActivities(
        companyId,
        todayString,
        season ?? null,
        isTimberLakeWest,
    );

    const loading = loadingBirthdays || loadingWolf || loadingSports || loadingSpecial;

    const eveningEvents = useMemo(
        () => specialActivitiesToday.filter((e: any) => e.event_type === 'evening-activity'),
        [specialActivitiesToday],
    );

    const birthdayLine = useMemo(() => {
        if (!birthdays.length) return 'None today';
        return birthdays.map((p: any) => p.name).join(', ');
    }, [birthdays]);

    const odText = dailyWolfRow?.officer_of_day?.trim() || 'N/A';
    const laundryText = dailyWolfRow?.laundry_info?.trim() || 'TBD';
    const phoneText = dailyWolfRow?.phone_calls_info?.trim() || 'TBD';
    const quoteText = dailyWolfRow?.quote_of_the_day?.trim() || '';
    const notesText = dailyWolfRow?.notes?.trim() || '';

    const athleticsLines = useMemo(() => {
        if (!sportsToday.length) return null;
        return sportsToday.map((s: any) => {
            const parts = [s.time, s.title, s.location].filter(Boolean);
            return parts.join(' — ') || s.title;
        });
    }, [sportsToday]);

    const eveningLines = useMemo(() => {
        if (!eveningEvents.length) return null;
        return eveningEvents.map((e: any) => {
            const parts = [e.time_slot, e.title, e.location].filter(Boolean);
            return parts.join(' — ') || e.title;
        });
    }, [eveningEvents]);

    const sharePlainText = useMemo(() => {
        const lines = [
            'THE DAILY WOLF',
            longDate,
            '',
            `Birthday Wishes`,
            birthdayLine,
            '',
            `OD`,
            odText,
            '',
            `Laundry`,
            laundryText,
            '',
            `Phone Calls`,
            phoneText,
            '',
            `Athletics`,
            athleticsLines?.length ? athleticsLines.join('\n') : 'No athletic events scheduled',
            '',
            `Quote of the Day`,
            quoteText || '—',
            '',
            `Evening Activities`,
            eveningLines?.length ? eveningLines.join('\n') : 'No evening activities scheduled',
            '',
            `Notes`,
            notesText || '—',
            '',
            FOOTER_TAGLINE,
        ];
        return lines.join('\n');
    }, [
        longDate,
        birthdayLine,
        odText,
        laundryText,
        phoneText,
        quoteText,
        notesText,
        athleticsLines,
        eveningLines,
    ]);

    const renderReportBody = () => (
        <View style={styles.reportInner}>
            <Text style={styles.banner}>THE DAILY WOLF</Text>
            <Text style={styles.dateText}>{longDate}</Text>

            <Text style={styles.sectionHeading}>Birthday Wishes</Text>
            <Text style={styles.sectionBody}>{birthdayLine}</Text>

            <Text style={styles.sectionHeading}>OD</Text>
            <Text style={styles.sectionBody}>{odText}</Text>

            <Text style={styles.sectionHeading}>Laundry</Text>
            <Text style={styles.sectionBody}>{laundryText}</Text>

            <Text style={styles.sectionHeading}>Phone Calls</Text>
            <Text style={styles.sectionBody}>{phoneText}</Text>

            <Text style={styles.sectionHeading}>Athletics</Text>
            <Text style={styles.sectionBody}>
                {athleticsLines?.length ? athleticsLines.join('\n') : 'No athletic events scheduled'}
            </Text>

            <Text style={styles.sectionHeading}>Quote of the Day</Text>
            <Text style={[styles.sectionBody, styles.quoteText]}>{quoteText || '—'}</Text>

            <Text style={styles.sectionHeading}>Evening Activities</Text>
            <Text style={styles.sectionBody}>
                {eveningLines?.length ? eveningLines.join('\n') : 'No evening activities scheduled'}
            </Text>

            <Text style={styles.sectionHeading}>Notes</Text>
            <Text style={styles.sectionBody}>{notesText || '—'}</Text>

            <Text style={styles.footerTagline}>{FOOTER_TAGLINE}</Text>
        </View>
    );

    const handleShare = async () => {
        try {
            await Share.share({ title: 'The Daily Wolf', message: sharePlainText });
        } catch {
            /* dismissed */
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scroll}>
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

                <View style={styles.titleRow}>
                    <Text style={styles.pageTitle}>Daily Wolf Printable</Text>
                    <TouchableOpacity
                        style={styles.printBtn}
                        onPress={() => setShowPrintPreview(true)}
                        disabled={loading}
                    >
                        <Ionicons name="print-outline" size={18} color={theme.colors.text} />
                        <Text style={styles.printBtnText}>Print</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color={theme.colors.secondary} />
                        <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                ) : (
                    <View style={styles.mainPaper}>{renderReportBody()}</View>
                )}
            </ScrollView>

            <Modal
                visible={showPrintPreview}
                animationType="slide"
                presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
                onRequestClose={() => setShowPrintPreview(false)}
            >
                <SafeAreaView style={styles.modalSafe}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Print</Text>
                        <TouchableOpacity onPress={() => setShowPrintPreview(false)} hitSlop={12}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                        {renderReportBody()}
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                            <Ionicons name="share-outline" size={20} color="#fff" />
                            <Text style={styles.shareBtnText}>Share / Print</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scroll: { flex: 1 },
    scrollContent: { padding: theme.spacing.md, paddingBottom: 40 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    headerIconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.md,
    },
    pageTitle: {
        flex: 1,
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.text,
    },
    printBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#fff',
    },
    printBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    loadingBox: {
        minHeight: 200,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
    },
    loadingText: { marginTop: theme.spacing.md, color: theme.colors.textSecondary },
    mainPaper: {
        backgroundColor: '#fff',
        paddingVertical: theme.spacing.sm,
    },
    reportInner: { paddingRight: theme.spacing.xs },
    banner: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 6,
    },
    dateText: {
        fontSize: 15,
        color: theme.colors.text,
        marginBottom: theme.spacing.lg,
    },
    sectionHeading: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: theme.spacing.md,
        marginBottom: 4,
    },
    sectionBody: {
        fontSize: 15,
        color: theme.colors.text,
        lineHeight: 22,
    },
    quoteText: { fontStyle: 'italic' },
    footerTagline: {
        marginTop: theme.spacing.xl,
        fontSize: 15,
        color: theme.colors.text,
        lineHeight: 22,
    },
    modalSafe: { flex: 1, backgroundColor: '#f8fafc' },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    modalScroll: { flex: 1 },
    modalScrollContent: { padding: theme.spacing.md, backgroundColor: '#fff', margin: theme.spacing.md, borderRadius: 8 },
    modalFooter: {
        padding: theme.spacing.md,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#f27a21',
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
