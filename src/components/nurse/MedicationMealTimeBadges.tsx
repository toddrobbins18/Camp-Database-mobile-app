import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
    getMealTimeBadgeColors,
    parseMedicationMealTimeLabels,
} from '../../lib/medicationMealTimeDisplay';

type Props = {
    mealTime: string[] | string | null | undefined;
    divisionName?: string | null;
};

export function MedicationMealTimeBadges({ mealTime, divisionName }: Props) {
    const labels = parseMedicationMealTimeLabels(mealTime, divisionName);

    if (labels.length === 0) {
        return (
            <View style={[styles.badge, styles.noMealBadge]}>
                <Text style={styles.noMealText}>No meal time</Text>
            </View>
        );
    }

    return (
        <View style={styles.row}>
            {labels.map((label) => {
                const colors = getMealTimeBadgeColors(label);
                return (
                    <View
                        key={label}
                        style={[
                            styles.badge,
                            { backgroundColor: colors.bg, borderColor: colors.border },
                        ]}
                    >
                        <Text style={[styles.badgeText, { color: colors.text }]}>{label}</Text>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
    },
    badge: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    noMealBadge: {
        borderStyle: 'dashed',
        borderColor: '#94a3b8',
        backgroundColor: 'transparent',
    },
    noMealText: {
        fontSize: 11,
        color: '#64748b',
    },
});
