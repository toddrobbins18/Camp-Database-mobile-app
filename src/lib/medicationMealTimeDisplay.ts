import {
    findBedtimeOptionFromStoredMealLabel,
    resolveBedtimeOptionFromDivisionName,
    STANDARD_MEAL_LABEL_ORDER,
} from '../constants/medicationBedtimeOptions';

export const MEAL_TIME_BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'Before Breakfast': { bg: '#fef3c7', text: '#78350f', border: '#fcd34d' },
    'After Breakfast': { bg: '#ffedd5', text: '#7c2d12', border: '#fdba74' },
    'Before Lunch': { bg: '#e0f2fe', text: '#0c4a6e', border: '#7dd3fc' },
    'After Lunch': { bg: '#dbeafe', text: '#1e3a8a', border: '#93c5fd' },
    'Before Dinner': { bg: '#ede9fe', text: '#4c1d95', border: '#c4b5fd' },
    'After Dinner': { bg: '#f3e8ff', text: '#581c87', border: '#d8b4fe' },
    Bedtime: { bg: '#e0e7ff', text: '#312e81', border: '#a5b4fc' },
};

const BEDTIME_VARIANT_COLORS = [
    { bg: '#e0e7ff', text: '#312e81', border: '#a5b4fc' },
    { bg: '#fae8ff', text: '#701a75', border: '#e9d5ff' },
    { bg: '#ccfbf1', text: '#134e4a', border: '#5eead4' },
    { bg: '#ffe4e6', text: '#881337', border: '#fda4af' },
];

function hashLabel(label: string): number {
    let h = 0;
    for (let i = 0; i < label.length; i++) h = (h + label.charCodeAt(i) * (i + 1)) % 997;
    return h;
}

export function parseMedicationMealTimeLabels(
    mealTime: string[] | string | null | undefined,
    divisionName?: string | null,
): string[] {
    if (mealTime == null) return [];
    const rawList = Array.isArray(mealTime) ? mealTime : [mealTime];
    const labels: string[] = [];

    for (const raw of rawList) {
        const first = String(raw ?? '').trim();
        if (!first) continue;
        if (first === 'Bedtime') {
            const resolved = resolveBedtimeOptionFromDivisionName(divisionName);
            labels.push(resolved?.mealTimeLabel ?? 'Bedtime');
            continue;
        }
        const bedtimeMatch = findBedtimeOptionFromStoredMealLabel(first);
        if (bedtimeMatch) {
            labels.push(bedtimeMatch.mealTimeLabel);
            continue;
        }
        labels.push(first);
    }
    return labels;
}

export function medicationHasMealTime(
    mealTime: string[] | string | null | undefined,
    divisionName?: string | null,
): boolean {
    return parseMedicationMealTimeLabels(mealTime, divisionName).length > 0;
}

export function getMealTimeBadgeColors(label: string) {
    for (const standard of STANDARD_MEAL_LABEL_ORDER) {
        if (label === standard || label.includes(standard)) {
            return MEAL_TIME_BADGE_COLORS[standard];
        }
    }
    return BEDTIME_VARIANT_COLORS[hashLabel(label) % BEDTIME_VARIANT_COLORS.length];
}

export const MEDICATION_MEAL_FILTER_OPTIONS = [
    { value: 'all', label: 'All meal times' },
    ...STANDARD_MEAL_LABEL_ORDER.map((meal) => ({ value: meal, label: meal })),
    { value: 'Bedtime', label: 'Bedtime' },
] as const;

export function medicationMatchesMealFilter(
    mealTime: string[] | string | null | undefined,
    divisionName: string | null | undefined,
    filter: string,
): boolean {
    if (filter === 'all') return true;
    const labels = parseMedicationMealTimeLabels(mealTime, divisionName);
    if (filter === 'Bedtime') {
        return labels.some(
            (l) =>
                l === 'Bedtime' ||
                l.toLowerCase().includes('bedtime') ||
                !!findBedtimeOptionFromStoredMealLabel(l),
        );
    }
    return labels.some((l) => l === filter || l.includes(filter));
}

export function medicationMatchesListVisibility(
    med: {
        administered?: boolean;
        meal_time?: string[] | string | null;
        medication_name?: string | null;
    },
    options: {
        searchQuery: string;
        mealFilter: string;
        divisionName?: string | null;
        childName?: string | null;
    },
): boolean {
    const searchLower = options.searchQuery.trim().toLowerCase();
    const isSearching = searchLower.length > 0;
    const childName = (options.childName ?? '').toLowerCase();
    const medName = (med.medication_name ?? '').toLowerCase();
    const matchesSearch =
        isSearching && (childName.includes(searchLower) || medName.includes(searchLower));

    if (med.administered) return matchesSearch;

    const hasMeal = medicationHasMealTime(med.meal_time, options.divisionName);
    if (!hasMeal) return matchesSearch;

    return medicationMatchesMealFilter(med.meal_time, options.divisionName, options.mealFilter);
}

const MEAL_TIME_ORDER = [
    'Before Breakfast',
    'After Breakfast',
    'Before Lunch',
    'After Lunch',
    'Before Dinner',
    'After Dinner',
    'Bedtime',
];

export function getMealTimeSortPriority(
    mealTime: string[] | string | null | undefined,
    divisionName?: string | null,
): number {
    const labels = parseMedicationMealTimeLabels(mealTime, divisionName);
    const first = labels[0];
    if (!first) return 999;
    const index = MEAL_TIME_ORDER.findIndex((mt) => first.includes(mt));
    if (index >= 0) return index;
    if (findBedtimeOptionFromStoredMealLabel(first)) return 6;
    return 999;
}
