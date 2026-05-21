import React, { useMemo, useState, type ReactNode } from 'react';
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
import { StyledCard } from '../components/StyledCard';
import { MobileUserMenu } from '../components/MobileUserMenu';
import { useCompany } from '../contexts/CompanyContext';
import {
    useTodayBirthdays,
    useDailyWolfContentRow,
    useTodaySportsCalendar,
    useTodaySpecialEventsActivities,
    useTodayMeals,
} from '../api/dashboard';

const FOOTER_TAGLINE = 'Have a great day at Timber Lake West!';
const MEAL_KEYS = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

function formatLongDate(d: Date): string {
    return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatLocalDateYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function SectionBlock({
    title,
    icon,
    children,
}: {
    title: string;
    icon?: ReactNode;
    children: ReactNode;
}) {
    return (
        <StyledCard style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
                {icon}
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            {children}
        </StyledCard>
    );
}

function EmptyHint({ children }: { children: string }) {
    return <Text style={styles.emptyHint}>{children}</Text>;
}

export const DailyWolfPrintableScreen = ({ navigation }: any) => {
    const { companyId, season, isTimberLakeWest } = useCompany();
    const [showPrintPreview, setShowPrintPreview] = useState(false);

    const today = new Date();
    const todayString = formatLocalDateYmd(today);
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const longDate = formatLongDate(today);

    const { data: birthdays = [], isLoading: loadingBirthdays } = useTodayBirthdays(
        companyId,
        season ?? null,
        todayMonth,
        todayDay,
    );
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
    const { data: specialActivitiesToday = [], isLoading: loadingSpecial } =
        useTodaySpecialEventsActivities(companyId, todayString, season ?? null, isTimberLakeWest);
    const { data: meals, isLoading: loadingMeals } = useTodayMeals(companyId, todayString, season ?? null);

    const loading = loadingBirthdays || loadingWolf || loadingSports || loadingSpecial || loadingMeals;

    const hasAnyMenu = MEAL_KEYS.some((k) => meals?.[k]?.trim());
    const hasBirthdays = birthdays.length > 0;

    const birthdayLine = useMemo(() => {
        if (!birthdays.length) return null;
        return birthdays.map((p: any) => p.name).join(', ');
    }, [birthdays]);

    const odText = dailyWolfRow?.officer_of_day?.trim() || '';
    const laundryText = dailyWolfRow?.laundry_info?.trim() || 'TBD';
    const phoneText = dailyWolfRow?.phone_calls_info?.trim() || 'TBD';
    const quoteText = dailyWolfRow?.quote_of_the_day?.trim() || '';
    const notesText = dailyWolfRow?.notes?.trim() || '';

    const menuShareLines = useMemo(() => {
        return MEAL_KEYS.map((k) => {
            const label = k.charAt(0).toUpperCase() + k.slice(1);
            const body = meals?.[k]?.trim();
            return body ? `${label}: ${body}` : label;
        });
    }, [meals]);

    const sharePlainText = useMemo(() => {
        const lines = [
            'THE DAILY WOLF',
            longDate,
            '',
            'Birthday Wishes',
            birthdayLine || 'None today',
            '',
            'Menu',
            hasAnyMenu ? menuShareLines.join('\n') : 'No menu items for today',
            '',
            'Super OD',
            odText || '—',
            '',
            'Laundry',
            laundryText,
            '',
            'Phone Calls',
            phoneText,
            '',
            'Athletics',
            sportsToday.length
                ? sportsToday
                      .map((s: any) => [s.time, s.title, s.location].filter(Boolean).join(' — '))
                      .join('\n')
                : 'No athletic events scheduled',
            '',
            'Quote of the Day',
            quoteText || '—',
            '',
            'Special Events',
            specialActivitiesToday.length
                ? specialActivitiesToday
                      .map((e: any) => [e.time_slot, e.title, e.location].filter(Boolean).join(' — '))
                      .join('\n')
                : 'No special events scheduled',
            '',
            'Notes',
            notesText || '—',
            '',
            FOOTER_TAGLINE,
        ];
        return lines.join('\n');
    }, [
        longDate,
        birthdayLine,
        hasAnyMenu,
        menuShareLines,
        odText,
        laundryText,
        phoneText,
        quoteText,
        notesText,
        sportsToday,
        specialActivitiesToday,
    ]);

    const renderReportBody = () => (
        <View style={styles.bulletin}>
            <View style={styles.masthead}>
                <Text style={styles.mastheadTitle}>THE DAILY WOLF</Text>
                <Text style={styles.mastheadSub}>Timber Lake West</Text>
                <Text style={styles.mastheadDate}>{longDate}</Text>
            </View>

            <View
                style={[
                    styles.birthdayBanner,
                    hasBirthdays ? styles.birthdayBannerActive : null,
                ]}
            >
                <View style={styles.sectionHeader}>
                    <Ionicons name="gift-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.sectionTitle}>Birthday Wishes</Text>
                </View>
                {hasBirthdays ? (
                    <Text style={styles.birthdayNames}>🎉 {birthdayLine}</Text>
                ) : (
                    <EmptyHint>No birthdays today</EmptyHint>
                )}
            </View>

            <SectionBlock
                title="Menu"
                icon={<Ionicons name="restaurant-outline" size={18} color={theme.colors.primary} />}
            >
                {hasAnyMenu ? (
                    <View style={styles.menuGrid}>
                        {MEAL_KEYS.map((mealKey) => {
                            const value = meals?.[mealKey]?.trim();
                            return (
                                <View key={mealKey} style={styles.menuCell}>
                                    <Text style={styles.menuCellLabel}>
                                        {mealKey.charAt(0).toUpperCase() + mealKey.slice(1)}
                                    </Text>
                                    {value ? (
                                        <Text style={styles.menuCellBody}>{value}</Text>
                                    ) : null}
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <EmptyHint>No menu items for today</EmptyHint>
                )}
            </SectionBlock>

            <View style={styles.adminRow}>
                <StyledCard style={styles.adminCard}>
                    <Text style={styles.adminLabel}>Super OD</Text>
                    <Text style={styles.adminValue}>{odText || '—'}</Text>
                </StyledCard>
                <StyledCard style={styles.adminCard}>
                    <Text style={styles.adminLabel}>Laundry</Text>
                    <Text style={styles.adminValue}>{laundryText}</Text>
                </StyledCard>
                <StyledCard style={styles.adminCard}>
                    <Text style={styles.adminLabel}>Phone Calls</Text>
                    <Text style={styles.adminValue}>{phoneText}</Text>
                </StyledCard>
            </View>

            <SectionBlock
                title="Athletics"
                icon={<Ionicons name="trophy-outline" size={18} color={theme.colors.primary} />}
            >
                {sportsToday.length > 0 ? (
                    sportsToday.map((s: any) => (
                        <View key={s.id} style={styles.listRow}>
                            <Text style={styles.listTime}>{s.time || '—'}</Text>
                            <View style={styles.listBody}>
                                <Text style={styles.listTitle}>{s.title}</Text>
                                {s.location ? (
                                    <Text style={styles.listMeta}>{s.location}</Text>
                                ) : null}
                            </View>
                        </View>
                    ))
                ) : (
                    <EmptyHint>No athletic events scheduled</EmptyHint>
                )}
            </SectionBlock>

            <SectionBlock
                title="Special Events"
                icon={<Ionicons name="sparkles-outline" size={18} color={theme.colors.primary} />}
            >
                {specialActivitiesToday.length > 0 ? (
                    specialActivitiesToday.map((e: any) => (
                        <View key={e.id} style={styles.listRow}>
                            <Text style={styles.listTime}>{e.time_slot || '—'}</Text>
                            <View style={styles.listBody}>
                                <Text style={styles.listTitle}>{e.title}</Text>
                                {e.location ? (
                                    <Text style={styles.listMeta}>{e.location}</Text>
                                ) : null}
                            </View>
                        </View>
                    ))
                ) : (
                    <EmptyHint>No special events scheduled</EmptyHint>
                )}
            </SectionBlock>

            <View style={styles.quoteBox}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="chatbox-ellipses-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.sectionTitle}>Quote of the Day</Text>
                </View>
                <Text style={styles.quoteText}>
                    {quoteText ? `"${quoteText}"` : '"Make today amazing!"'}
                </Text>
            </View>

            <SectionBlock title="Notes">
                <Text style={styles.notesBody}>
                    {notesText || 'Have a great day at Timber Lake West!'}
                </Text>
            </SectionBlock>

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
                    <StyledCard style={styles.mainPaper}>{renderReportBody()}</StyledCard>
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
                    <ScrollView
                        style={styles.modalScroll}
                        contentContainerStyle={styles.modalScrollContent}
                    >
                        <StyledCard>{renderReportBody()}</StyledCard>
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
    container: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { flex: 1 },
    scrollContent: { padding: theme.spacing.md, paddingBottom: 40 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    headerIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.md,
    },
    pageTitle: {
        flex: 1,
        fontSize: 26,
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
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
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
        padding: 0,
        overflow: 'hidden',
    },
    bulletin: {
        padding: theme.spacing.md,
    },
    masthead: {
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: theme.colors.text,
        paddingBottom: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    mastheadTitle: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: 2,
        color: theme.colors.text,
    },
    mastheadSub: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        letterSpacing: 1,
        marginTop: 4,
        textTransform: 'uppercase',
    },
    mastheadDate: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 8,
    },
    birthdayBanner: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        backgroundColor: theme.colors.surface,
    },
    birthdayBannerActive: {
        backgroundColor: '#fffbeb',
        borderColor: '#fcd34d',
    },
    birthdayNames: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 4,
    },
    sectionCard: {
        marginBottom: theme.spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: theme.spacing.sm,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: theme.colors.text,
    },
    emptyHint: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    menuCell: {
        width: '48%',
        minHeight: 72,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        backgroundColor: theme.colors.background,
    },
    menuCellLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.primary,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    menuCellBody: {
        fontSize: 13,
        color: theme.colors.text,
        lineHeight: 18,
    },
    adminRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    adminCard: {
        flex: 1,
        minWidth: '30%',
        marginBottom: 0,
        padding: theme.spacing.sm,
    },
    adminLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    adminValue: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
    },
    listRow: {
        flexDirection: 'row',
        gap: 10,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
    },
    listTime: {
        width: 72,
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    listBody: { flex: 1 },
    listTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    listMeta: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    quoteBox: {
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
    },
    quoteText: {
        fontSize: 16,
        fontStyle: 'italic',
        color: theme.colors.text,
        textAlign: 'center',
        lineHeight: 22,
    },
    notesBody: {
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 20,
    },
    footerTagline: {
        marginTop: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    modalSafe: { flex: 1, backgroundColor: theme.colors.background },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    modalScroll: { flex: 1 },
    modalScrollContent: { padding: theme.spacing.md },
    modalFooter: {
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
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
