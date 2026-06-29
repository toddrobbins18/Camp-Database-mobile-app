import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TIGER_CARDS: {
    key: string;
    label: string;
    field: 'laundry_info' | 'phone_calls_info' | 'outside_event' | 'staff_days_off' | 'od_notes';
    accent: string;
    iconBg: string;
    emoji: string;
    ion: keyof typeof Ionicons.glyphMap;
}[] = [
    {
        key: 'laundry',
        label: 'Laundry',
        field: 'laundry_info',
        accent: '#3b82f6',
        iconBg: '#dbeafe',
        emoji: '👕',
        ion: 'shirt-outline',
    },
    {
        key: 'phone',
        label: 'Phone Calls',
        field: 'phone_calls_info',
        accent: '#ef4444',
        iconBg: '#fee2e2',
        emoji: '☎️',
        ion: 'call-outline',
    },
    {
        key: 'outside',
        label: 'Movie / Entertainment',
        field: 'outside_event',
        accent: '#facc15',
        iconBg: '#fef9c3',
        emoji: '🎬',
        ion: 'film-outline',
    },
    {
        key: 'staff_off',
        label: 'Staff Days Off',
        field: 'staff_days_off',
        accent: '#06b6d4',
        iconBg: '#cffafe',
        emoji: '📅',
        ion: 'calendar-outline',
    },
    {
        key: 'od_notes',
        label: 'OD Notes',
        field: 'od_notes',
        accent: '#ec4899',
        iconBg: '#fce7f3',
        emoji: '❤️',
        ion: 'document-text-outline',
    },
];

function displayText(raw: string | null | undefined): { preview: string; hasInfo: boolean; full: string } {
    const full = (raw ?? '').trim();
    if (!full) {
        return { preview: 'No info', hasInfo: false, full: '' };
    }
    const oneLine = full.replace(/\s+/g, ' ');
    const preview = oneLine.length > 42 ? `${oneLine.slice(0, 42)}…` : oneLine;
    return { preview, hasInfo: true, full };
}

type Props = {
    companyId: string | null;
    season: string;
    todayYmd: string;
};

export function TigerTimesCategoryCards({ companyId, season, todayYmd }: Props) {
    const [sectionOpen, setSectionOpen] = useState(true);
    const [openCardKey, setOpenCardKey] = useState<string | null>(null);

    const { data: row, isLoading } = useQuery({
        queryKey: ['tigerTimesDashboard', companyId, season, todayYmd],
        queryFn: async () => {
            if (!companyId || !season) return null;
            const { data, error } = await supabase
                .from('daily_wolf_content')
                .select('*')
                .eq('company_id', companyId)
                .eq('date', todayYmd)
                .eq('season', season)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!companyId && !!season,
    });

    const toggleSection = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSectionOpen((o) => !o);
        if (sectionOpen) setOpenCardKey(null);
    };

    const toggleCard = (key: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpenCardKey((prev) => (prev === key ? null : key));
    };

    return (
        <View style={styles.wrap}>
            <TouchableOpacity
                style={styles.sectionHeader}
                onPress={toggleSection}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={sectionOpen ? 'Collapse Tiger Times categories' : 'Expand Tiger Times categories'}
            >
                <View style={styles.sectionHeaderLeft}>
                    <Ionicons name="newspaper-outline" size={22} color={theme.colors.text} />
                    <View>
                        <Text style={styles.sectionTitle}>Tiger Times</Text>
                        <Text style={styles.sectionSubtitle}>Laundry, calls, movies & OD</Text>
                    </View>
                </View>
                <Ionicons
                    name={sectionOpen ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={theme.colors.textSecondary}
                />
            </TouchableOpacity>

            {sectionOpen && (
                <View style={styles.grid}>
                    {isLoading ? (
                        <Text style={styles.loadingText}>Loading…</Text>
                    ) : (
                        TIGER_CARDS.map((c) => {
                            const raw = row?.[c.field] as string | undefined;
                            const { preview, hasInfo, full } = displayText(raw);
                            const expanded = openCardKey === c.key;

                            return (
                                <TouchableOpacity
                                    key={c.key}
                                    style={[styles.card, { borderTopColor: c.accent }]}
                                    onPress={() => toggleCard(c.key)}
                                    activeOpacity={0.92}
                                >
                                    <View style={styles.cardTop}>
                                        <View style={[styles.iconCircle, { backgroundColor: c.iconBg }]}>
                                            <Ionicons name={c.ion} size={20} color={c.accent} />
                                        </View>
                                        <Text style={styles.emoji}>{c.emoji}</Text>
                                        <View style={styles.cardTitleCol}>
                                            <Text style={styles.cardLabel}>{c.label}</Text>
                                            <Text
                                                style={[styles.cardPreview, !hasInfo && styles.cardPreviewMuted]}
                                                numberOfLines={expanded ? undefined : 2}
                                            >
                                                {expanded ? (hasInfo ? full : 'No info') : preview}
                                            </Text>
                                        </View>
                                        <Ionicons
                                            name={expanded ? 'chevron-up' : 'chevron-down'}
                                            size={18}
                                            color={theme.colors.textSecondary}
                                            style={styles.cardChevron}
                                        />
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>
            )}

            {!sectionOpen && (
                <TouchableOpacity style={styles.collapsedHint} onPress={toggleSection} activeOpacity={0.8}>
                    <View style={styles.dotRow}>
                        {TIGER_CARDS.map((c) => (
                            <View key={c.key} style={[styles.miniDot, { backgroundColor: c.accent }]} />
                        ))}
                    </View>
                    <Text style={styles.collapsedHintText}>Tap to expand categories</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 0,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    sectionSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    grid: {
        marginTop: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    loadingText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        paddingVertical: 8,
    },
    card: {
        backgroundColor: '#fafafa',
        borderRadius: theme.borderRadius.md,
        borderTopWidth: 4,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emoji: {
        fontSize: 22,
        lineHeight: 26,
        marginTop: 6,
    },
    cardTitleCol: {
        flex: 1,
        minWidth: 0,
    },
    cardLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4,
    },
    cardPreview: {
        fontSize: 13,
        color: theme.colors.text,
        lineHeight: 18,
    },
    cardPreviewMuted: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    cardChevron: {
        marginTop: 4,
    },
    collapsedHint: {
        marginTop: theme.spacing.sm,
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
    },
    dotRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 6,
    },
    miniDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    collapsedHintText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
});
