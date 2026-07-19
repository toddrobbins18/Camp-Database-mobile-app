import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StyledCard } from './StyledCard';
import { theme } from '../theme/theme';
import {
    formatOutlookDateDisplay,
    groupOutlookItemsByKind,
    type PersonOutlookItem,
} from '../lib/personScheduleOutlook';
import { formatTime12Hour } from '../lib/formatTime';
import { usePersonScheduleOutlook } from '../api/personScheduleOutlook';

type PersonThreeDayOutlookProps = {
    personType: 'child' | 'staff';
    personId: string;
    companyId: string;
    season?: string | null;
    divisionId?: string | null;
    staffName?: string | null;
};

function formatItemSubtitle(item: PersonOutlookItem): string {
    return [
        formatOutlookDateDisplay(item.date),
        item.endDate && item.endDate !== item.date
            ? `– ${formatOutlookDateDisplay(item.endDate)}`
            : null,
        item.time ? formatTime12Hour(item.time) || item.time : null,
        item.location,
    ]
        .filter(Boolean)
        .join(' · ');
}

function OutlookSection({
    title,
    icon,
    color,
    items,
    emptyLabel,
}: {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    items: PersonOutlookItem[];
    emptyLabel: string;
}) {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Ionicons name={icon} size={16} color={color} />
                <Text style={styles.sectionTitle}>{title}</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{items.length}</Text>
                </View>
            </View>
            {items.length === 0 ? (
                <Text style={styles.emptySectionText}>{emptyLabel}</Text>
            ) : (
                items.map((item) => (
                    <View key={item.id} style={styles.itemCard}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.itemSubtitle}>{formatItemSubtitle(item)}</Text>
                        {item.meta ? <Text style={styles.itemMeta}>{item.meta}</Text> : null}
                    </View>
                ))
            )}
        </View>
    );
}

export function PersonThreeDayOutlook({
    personType,
    personId,
    companyId,
    season,
    divisionId,
    staffName,
}: PersonThreeDayOutlookProps) {
    const { data: items = [], isLoading } = usePersonScheduleOutlook({
        personType,
        personId,
        companyId,
        season,
        divisionId,
        staffName,
    });

    const grouped = useMemo(() => groupOutlookItemsByKind(items), [items]);

    return (
        <StyledCard style={styles.card}>
            <View style={styles.header}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                <View style={styles.headerText}>
                    <Text style={styles.title}>Three Day Outlook</Text>
                    <Text style={styles.subtitle}>
                        Trips, sporting events, and activities assigned over the next 3 days
                    </Text>
                </View>
            </View>

            {isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
            ) : items.length === 0 ? (
                <Text style={styles.emptyText}>Nothing scheduled in the next 3 days.</Text>
            ) : (
                <View style={styles.sections}>
                    <OutlookSection
                        title="Trips"
                        icon="bus-outline"
                        color="#0284c7"
                        items={grouped.trips}
                        emptyLabel="No trips"
                    />
                    <OutlookSection
                        title="Sporting Events"
                        icon="trophy-outline"
                        color={theme.colors.primary}
                        items={grouped.sports}
                        emptyLabel="No sporting events"
                    />
                    <OutlookSection
                        title="Activities"
                        icon="fitness-outline"
                        color="#059669"
                        items={grouped.activities}
                        emptyLabel="No activities"
                    />
                </View>
            )}
        </StyledCard>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: theme.spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    headerText: {
        flex: 1,
    },
    title: {
        ...theme.typography.h3,
        marginBottom: 4,
    },
    subtitle: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
    },
    loader: {
        marginVertical: theme.spacing.md,
    },
    emptyText: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
    },
    sections: {
        gap: theme.spacing.lg,
    },
    section: {
        gap: theme.spacing.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    sectionTitle: {
        ...theme.typography.body,
        fontWeight: '600',
        flex: 1,
    },
    countBadge: {
        backgroundColor: theme.colors.border,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    countBadgeText: {
        ...theme.typography.caption,
        fontWeight: '600',
    },
    emptySectionText: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        paddingLeft: 22,
    },
    itemCard: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.sm,
    },
    itemTitle: {
        ...theme.typography.body,
        fontWeight: '600',
    },
    itemSubtitle: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    itemMeta: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
});
