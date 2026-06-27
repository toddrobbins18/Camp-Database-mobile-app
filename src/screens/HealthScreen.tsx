import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { UnifiedCalendar, CalendarWidgetEvent } from '../components/UnifiedCalendar';
import { useCompany } from '../contexts/CompanyContext';
import { useCampers, useDivisions, getCamperDivisionName } from '../api/campers';
import { useMedicationLogs, useAddMedicationLog, useSetMedicationAdministration, useDeleteMedicationLog, useHealthCenterAdmissions, useAddHealthCenterAdmission, useCheckoutHealthCenterAdmission, getAdmissionDisplayName, getAdmissionEntityLabel } from '../api/health';
import { supabase } from '../lib/supabase';
import { pickAndReadSpreadsheetRows } from '../lib/pickCsvDocument';
import { parseCsvDocument } from '../lib/csvLine';
import { uploadSpreadsheetRows } from '../lib/csvTableUpload';
import {
    STANDARD_MEAL_SCHEDULE_HHMM,
    STANDARD_MEAL_LABEL_ORDER,
    resolveBedtimeOptionFromDivisionName,
    formatMedicationMealTimeForDisplay,
} from '../constants/medicationBedtimeOptions';
import { defaultMedicationStartDate } from '../lib/medicationStartDate';
import { childMatchesGenderFilter } from '../lib/medicationSchedule';
import { filterActiveRoster } from '../lib/rosterStatus';
import {
    MEDICATION_MEAL_FILTER_OPTIONS,
    medicationMatchesListVisibility,
    getMealTimeSortPriority,
} from '../lib/medicationMealTimeDisplay';
import { MedicationMealTimeBadges } from '../components/nurse/MedicationMealTimeBadges';
import { lookupCamperOrStaffByRfid, lookupChildByRfid } from '../lib/rfidUtils';

const GENDER_FILTER_OPTIONS = [
    { value: 'all' as const, label: 'All Genders' },
    { value: 'boys' as const, label: 'Boys' },
    { value: 'girls' as const, label: 'Girls' },
];

const getChildDisplayName = (child: any) =>
    (child?.name != null && child.name !== '')
        ? String(child.name)
        : [child?.first_name, child?.last_name].filter(Boolean).join(' ').trim() || 'Unknown';

const RECURRENCE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Same copy as tyler-hill `CSVFormatGuide` — keeps Nurse CSV uploads consistent across web and mobile */
const CSV_GUIDE_TAB_ORDER = [
    'children',
    'staff',
    'medication_logs',
    'trips',
    'menu_items',
    'awards',
    'daily_notes',
    'incident_reports',
    'master_calendar',
    'sports_calendar',
] as const;

type CsvGuideTab = (typeof CSV_GUIDE_TAB_ORDER)[number];

const CSV_GUIDE_FORMATS: Record<
    CsvGuideTab,
    { title: string; columns: string; optionalColumns?: string; example: string; notes: string; shortLabel: string }
> = {
    children: {
        title: 'Children Roster',
        shortLabel: 'Children',
        columns:
            'first_name, last_name, person_id, age, grade, gender, guardian_phone, guardian_email, medical_notes, allergies, division_id, leader_id, emergency_contact, status, season',
        example:
            'John, Doe, P12345, 10, 5, Male, 555-1234, parent@email.com, None, Peanuts, <division_id>, <leader_id>, Jane Doe 555-5678, active, Summer 2024',
        notes:
            'REQUIRED: first_name, last_name, and person_id. division_id and leader_id must be valid UUIDs when provided.',
    },
    staff: {
        title: 'Staff Directory',
        shortLabel: 'Staff',
        columns: 'name, email, phone, role, department, hire_date, leader_id, status, season',
        example: 'Jane Smith, jane@thenest.com, 555-9876, Counselor, Activities, 2024-01-15, <leader_id>, active, Summer 2024',
        notes: 'leader_id must be a valid UUID. hire_date: YYYY-MM-DD',
    },
    medication_logs: {
        title: 'Medication Logs',
        shortLabel: 'Meds',
        columns: 'person_id, medication_name (required). dosage optional.',
        optionalColumns:
            'SCHEDULED TIME / Meal Time, START DATE / date, END DATE, NOTES, RECURRING (YES/NO), FREQUENCY, days_of_week. CampMinder Excel columns (CHILD NAME, LAST NAME, DIVISION, DOB) are ignored — camper is matched by person_id. Upload .csv or .xlsx.',
        example: '15956699, Supplements, 1 package, BEFORE BREAKFAST, Give with food, YES, DAILY, (start), (end)',
        notes:
            'REQUIRED: person_id + medication_name on each row (must match a camper in your roster for the selected season). All other columns are optional — missing dosage, dates, or meal time is fine. Excel date serials (e.g. 46198) are converted automatically. Defaults: start = Jun 26 (or today after camp opens), end = Aug 12 for daily recurring meds.',
    },
    trips: {
        title: 'Transportation/Trips',
        shortLabel: 'Trips',
        columns:
            'name, type, date, destination, departure_time, return_time, capacity, driver, chaperone, transportation_type, event_type, event_length, meal, status',
        example:
            'Zoo Trip, Field Trip, 2024-06-15, City Zoo, 09:00, 15:00, 30, John Driver, Jane Chaperone, Bus, Educational, Half Day, Packed Lunch, confirmed',
        notes: 'date: YYYY-MM-DD. type: Field Trip, Sports Event, Other',
    },
    menu_items: {
        title: 'Menu Items',
        shortLabel: 'Menu',
        columns: 'date, meal_type, items, allergens',
        example: '2024-06-15, Lunch, Chicken Nuggets\\, Fries\\, Apple Slices, Contains: Wheat\\, Soy',
        notes: 'meal_type: Breakfast, Lunch, Snack, Dinner. Use backslash before commas inside items/allergens.',
    },
    awards: {
        title: 'Awards',
        shortLabel: 'Awards',
        columns: 'child_id, title, category, date, description',
        example: '<child_id>, Best Sportsmanship, Sports, 2024-06-15, Showed excellent teamwork',
        notes: 'child_id must be valid UUID. date: YYYY-MM-DD',
    },
    daily_notes: {
        title: 'Daily Notes',
        shortLabel: 'Notes',
        columns: 'child_id, date, mood, activities, meals, nap, notes, created_by',
        example: '<child_id>, 2024-06-15, Happy, Arts and crafts\\, Swimming, Ate well, 1 hour, Great day, <staff_id>',
        notes: 'child_id and created_by must be UUIDs. Use backslash before commas in text fields.',
    },
    incident_reports: {
        title: 'Incident Reports',
        shortLabel: 'Incidents',
        columns: 'child_id, date, type, severity, description, reported_by, status',
        example: '<child_id>, 2024-06-15, Minor Injury, Low, Scraped knee on playground, Jane Smith, resolved',
        notes: 'child_id UUID. type: Injury, Illness, Behavioral, Other.',
    },
    master_calendar: {
        title: 'Master Calendar',
        shortLabel: 'Calendar',
        columns: 'event_date, title, type, description, time, location, division_id, created_by',
        example: '2024-06-20, Swimming Day, Activity, Pool day for all divisions, 10:00, Main Pool, <division_id>, <staff_id>',
        notes: 'event_date YYYY-MM-DD. division_id and created_by UUIDs may be empty.',
    },
    sports_calendar: {
        title: 'Sports Calendar',
        shortLabel: 'Sports',
        columns: 'event_date, title, sport_type, description, time, location, team, opponent, division_id, created_by',
        example: '2024-06-25, Championship Game, Basketball, Final game of season, 14:00, Main Court, Eagles, Hawks, <division_id>, <staff_id>',
        notes: 'sport_type follows camp sports list. UUIDs may be empty.',
    },
};

function medicationScheduleLabel(med: any): string {
    const divisionName = med.children?.division?.name ?? med.children?.group_name ?? null;
    const fromMeal = formatMedicationMealTimeForDisplay(med.meal_time, divisionName);
    if (fromMeal) return fromMeal;
    const st = med.scheduled_time;
    if (st === '08:00') return 'Before Breakfast';
    if (st === '09:00') return 'After Breakfast';
    if (st === '12:00') return 'Before Lunch';
    if (st === '13:00') return 'After Lunch';
    if (st === '18:00') return 'Before Dinner';
    if (st === '19:00') return 'After Dinner';
    return typeof st === 'string' ? st : '';
}

const medicationRowKey = (med: any) => `${med.id}-${med._displayDate ?? med.date}`;

const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
};

const formatSelectedDate = (date: Date) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const isSameCalendarDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();

export const HealthScreen = ({ navigation }: any) => {
    const queryClient = useQueryClient();
    const { companyId, season } = useCompany();
    const { data: campersData, isLoading: campersLoading, isError: campersError } = useCampers(companyId, season);
    const {
        data: healthCenterStaffData = [],
        isLoading: staffLoading,
        isError: staffError,
    } = useQuery({
        queryKey: ['health_center_staff', companyId, season],
        queryFn: async () => {
            if (!companyId || !season) return [];
            const { data, error } = await supabase
                .from('staff')
                .select('id, name, role, allergies, status')
                .eq('company_id', companyId)
                .eq('season', season)
                .or('status.eq.active,status.is.null')
                .order('name', { ascending: true });
            if (error) {
                console.error('[HEALTH] Failed to fetch staff for health center:', error);
                throw error;
            }
            return filterActiveRoster(data ?? []);
        },
        enabled: !!companyId && !!season,
        refetchOnMount: 'always',
        staleTime: 30_000,
    });
    const { data: divisionsData, isError: divisionsError } = useDivisions(companyId);
    const safeCampers = Array.isArray(campersData) ? campersData : [];
    const safeStaff = Array.isArray(healthCenterStaffData) ? healthCenterStaffData : [];
    const safeDivisions = Array.isArray(divisionsData) ? divisionsData : [];

    const [activeView, setActiveView] = useState('list'); // 'list' or 'calendar'
    const [activeTab, setActiveTab] = useState('Daily Log');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [selectedGender, setSelectedGender] = useState<'all' | 'boys' | 'girls'>('all');
    const [showDivisionPicker, setShowDivisionPicker] = useState(false);
    const [showGenderPicker, setShowGenderPicker] = useState(false);
    const [medMealFilter, setMedMealFilter] = useState('all');
    const [medSortBy, setMedSortBy] = useState<'meal_time' | 'name' | 'division' | 'gender'>('meal_time');
    const [showMealFilterPicker, setShowMealFilterPicker] = useState(false);
    const [showMedSortPicker, setShowMedSortPicker] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [rfidInput, setRfidInput] = useState('');
    const [healthCenterRfidInput, setHealthCenterRfidInput] = useState('');
    const [searchChildrenQuery, setSearchChildrenQuery] = useState('');
    const [admissionEntityType, setAdmissionEntityType] = useState<'camper' | 'staff'>('camper');
    const [selectedChild, setSelectedChild] = useState<string | null>(null);
    const [showAdmitModal, setShowAdmitModal] = useState(false);
    const [admitReason, setAdmitReason] = useState('');
    const [admitNotes, setAdmitNotes] = useState('');
    const [entityToAdmit, setEntityToAdmit] = useState<{ id: string; name: string; type: 'camper' | 'staff' } | null>(null);
    const [isAdmitting, setIsAdmitting] = useState(false);
    const admitLockRef = useRef(false);
    const [selectedMedicationChild, setSelectedMedicationChild] = useState<string>('');
    const [medicationName, setMedicationName] = useState('');
    const [dosage, setDosage] = useState('');
    const [mealTimesSelected, setMealTimesSelected] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'custom'>('daily');
    const [recurringDays, setRecurringDays] = useState<string[]>([]);
    const [recurringEndDate, setRecurringEndDate] = useState('');
    const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
    const [showChildPicker, setShowChildPicker] = useState(false);
    const [medCsvUploading, setMedCsvUploading] = useState(false);
    const [showCsvGuideModal, setShowCsvGuideModal] = useState(false);
    const [csvGuideTab, setCsvGuideTab] = useState<CsvGuideTab>('medication_logs');
    const [expandedHistoryChildId, setExpandedHistoryChildId] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);
    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const dateString = useMemo(() => {
        const d = selectedDate;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, [selectedDate]);
    const isSelectedDateToday = useMemo(() => isSameCalendarDay(selectedDate, new Date()), [selectedDate]);
    const medicationQueryDate = dateString;
    const selectedDateEmptyLabel = isSelectedDateToday
        ? 'No medications scheduled for today'
        : `No medications scheduled for ${formatSelectedDate(selectedDate)}`;
    const medicationStartDate = useMemo(
        () => defaultMedicationStartDate(season || String(new Date().getFullYear())),
        [season],
    );

    // Medications — always driven by selectedDate (matches web Nurse)
    const { data: medicationsData } = useMedicationLogs(companyId, medicationQueryDate, season);
    const addMedicationMutation = useAddMedicationLog();
    const setAdministrationMutation = useSetMedicationAdministration();
    const deleteMedicationMutation = useDeleteMedicationLog();
    const safeMedications = Array.isArray(medicationsData) ? medicationsData : [];

    const filteredCampersForNurse = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return safeCampers.filter((child: any) => {
            const displayName = getChildDisplayName(child).toLowerCase();
            const matchesSearch = !query || displayName.includes(query);
            const matchesDivision =
                selectedDivision === 'All Divisions' || child.division_id === selectedDivision;
            const matchesGender = childMatchesGenderFilter(child, selectedGender);
            return matchesSearch && matchesDivision && matchesGender;
        });
    }, [safeCampers, searchQuery, selectedDivision, selectedGender]);

    const visibleChildIds = useMemo(
        () => new Set(filteredCampersForNurse.map((child: any) => child.id)),
        [filteredCampersForNurse],
    );

    const visibleMedications = useMemo(
        () => safeMedications.filter((med: any) => visibleChildIds.has(med.child_id)),
        [safeMedications, visibleChildIds],
    );

    const activeListMedications = useMemo(() => {
        return visibleMedications.filter((med: any) => {
            const child = safeCampers.find((c: any) => c.id === med.child_id);
            const divisionName = child?.division?.name ?? med.children?.division?.name ?? null;
            const childName = child ? getChildDisplayName(child) : med.children?.name ?? '';
            return medicationMatchesListVisibility(med, {
                searchQuery,
                mealFilter: medMealFilter,
                divisionName,
                childName,
            });
        });
    }, [visibleMedications, safeCampers, searchQuery, medMealFilter]);

    const sortedActiveListMedications = useMemo(() => {
        const meds = [...activeListMedications];
        const resolveChild = (med: any) =>
            safeCampers.find((c: any) => c.id === med.child_id) ?? med.children;

        switch (medSortBy) {
            case 'name':
                return meds.sort((a, b) =>
                    (resolveChild(a)?.name || a.children?.name || '').localeCompare(
                        resolveChild(b)?.name || b.children?.name || '',
                    ),
                );
            case 'division':
                return meds.sort((a, b) => {
                    const childA = resolveChild(a);
                    const childB = resolveChild(b);
                    const divA = childA?.division?.sort_order ?? 999;
                    const divB = childB?.division?.sort_order ?? 999;
                    if (divA !== divB) return divA - divB;
                    return (childA?.name || a.children?.name || '').localeCompare(
                        childB?.name || b.children?.name || '',
                    );
                });
            case 'gender':
                return meds.sort((a, b) => {
                    const childA = resolveChild(a);
                    const childB = resolveChild(b);
                    const gA = String(childA?.gender ?? childA?.division?.gender ?? '');
                    const gB = String(childB?.gender ?? childB?.division?.gender ?? '');
                    if (gA !== gB) return gA.localeCompare(gB);
                    return (childA?.name || a.children?.name || '').localeCompare(
                        childB?.name || b.children?.name || '',
                    );
                });
            case 'meal_time':
            default:
                return meds.sort((a, b) => {
                    const divA = resolveChild(a)?.division?.name ?? a.children?.division?.name ?? null;
                    const divB = resolveChild(b)?.division?.name ?? b.children?.division?.name ?? null;
                    return (
                        getMealTimeSortPriority(a.meal_time, divA) -
                        getMealTimeSortPriority(b.meal_time, divB)
                    );
                });
        }
    }, [activeListMedications, medSortBy, safeCampers]);

    const sortedDailyLogChildIds = useMemo(() => {
        const childIds = [
            ...new Set(activeListMedications.map((med: any) => med.child_id)),
        ];
        const childRows = childIds
            .map((id) => safeCampers.find((c: any) => c.id === id))
            .filter(Boolean) as any[];

        return [...childRows].sort((a, b) => {
            switch (medSortBy) {
                case 'division': {
                    const divA = a.division?.sort_order ?? 999;
                    const divB = b.division?.sort_order ?? 999;
                    if (divA !== divB) return divA - divB;
                    return getChildDisplayName(a).localeCompare(getChildDisplayName(b));
                }
                case 'gender': {
                    const gA = String(a.gender ?? a.division?.gender ?? '');
                    const gB = String(b.gender ?? b.division?.gender ?? '');
                    if (gA !== gB) return gA.localeCompare(gB);
                    return getChildDisplayName(a).localeCompare(getChildDisplayName(b));
                }
                case 'name':
                    return getChildDisplayName(a).localeCompare(getChildDisplayName(b));
                case 'meal_time':
                default: {
                    const priorityA = Math.min(
                        ...activeListMedications
                            .filter((med: any) => med.child_id === a.id)
                            .map((med: any) =>
                                getMealTimeSortPriority(
                                    med.meal_time,
                                    a.division?.name ?? med.children?.division?.name ?? null,
                                ),
                            ),
                    );
                    const priorityB = Math.min(
                        ...activeListMedications
                            .filter((med: any) => med.child_id === b.id)
                            .map((med: any) =>
                                getMealTimeSortPriority(
                                    med.meal_time,
                                    b.division?.name ?? med.children?.division?.name ?? null,
                                ),
                            ),
                    );
                    if (priorityA !== priorityB) return priorityA - priorityB;
                    return getChildDisplayName(a).localeCompare(getChildDisplayName(b));
                }
            }
        }).map((child) => child.id);
    }, [activeListMedications, medSortBy, safeCampers]);

    const renderMedicationMetaBadges = (med: any, divisionName?: string | null) => (
        <View style={styles.medMetaBadgeRow}>
            {med.is_recurring ? (
                <View style={styles.recurringBadge}>
                    <Text style={styles.recurringBadgeText}>Recurring</Text>
                </View>
            ) : null}
            <MedicationMealTimeBadges mealTime={med.meal_time} divisionName={divisionName} />
        </View>
    );

    const renderMedFilterControls = () => (
        <View style={styles.medFilterRow}>
            <TouchableOpacity
                style={styles.medFilterDropdown}
                onPress={() => setShowMealFilterPicker(true)}
            >
                <Text style={styles.medFilterDropdownText} numberOfLines={1}>
                    {MEDICATION_MEAL_FILTER_OPTIONS.find((o) => o.value === medMealFilter)?.label ?? 'All meal times'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.medFilterDropdown}
                onPress={() => setShowMedSortPicker(true)}
            >
                <Ionicons name="swap-vertical-outline" size={16} color={theme.colors.text} />
                <Text style={styles.medFilterDropdownText} numberOfLines={1}>
                    {medSortBy === 'meal_time'
                        ? 'Sort by Meal Time'
                        : medSortBy === 'name'
                          ? 'Sort by Name'
                          : medSortBy === 'division'
                            ? 'Sort by Division'
                            : 'Sort by Gender'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
        </View>
    );

    const calendarWidgetEvents: CalendarWidgetEvent[] = useMemo(() => {
        if (!activeListMedications || activeListMedications.length === 0) return [];
        return activeListMedications.map((med: any) => ({
            id: med.id,
            title: med.medication_name || 'Medication',
            date: new Date((med.date || medicationQueryDate) + 'T00:00:00'),
            time: med.scheduled_time || '',
            location: '',
            type: 'health',
            accent: { bg: '#fce7f3', text: '#9d174d', marker: '#ec4899' },
        }));
    }, [activeListMedications, medicationQueryDate]);

    // Admissions
    const admissionsQuery = useHealthCenterAdmissions(companyId, season);
    const admissionsData = admissionsQuery.data;
    const safeAdmissions = Array.isArray(admissionsData) ? admissionsData : [];
    const addAdmissionMutation = useAddHealthCenterAdmission();
    const checkoutMutation = useCheckoutHealthCenterAdmission();

    useFocusEffect(
        useCallback(() => {
            if (companyId) {
                void queryClient.invalidateQueries({ queryKey: ['health_center_admissions', companyId, season] });
                void queryClient.invalidateQueries({ queryKey: ['health_center_staff', companyId, season] });
            }
        }, [companyId, season, queryClient]),
    );

    const currentlyAdmitted = useMemo(() => safeAdmissions.filter((a: any) => !a.checked_out_at), [safeAdmissions]);
    const admissionHistory = useMemo(() => safeAdmissions.filter((a: any) => a.checked_out_at), [safeAdmissions]);
    const groupedHistory = useMemo(() => {
        const acc: Record<string, { entity: any; entityType: 'Camper' | 'Staff'; admissions: any[] }> = {};
        admissionHistory.forEach((a: any) => {
            const key = a.child_id || a.staff_id || a.id;
            if (!acc[key]) {
                acc[key] = {
                    entity: a.children || a.staff,
                    entityType: getAdmissionEntityLabel(a),
                    admissions: [],
                };
            }
            acc[key].admissions.push(a);
        });
        return acc;
    }, [admissionHistory]);

    // Filter children based on search query
    const filteredChildren = useMemo(() => {
        return safeCampers.filter((child: any) => {
            const displayName = getChildDisplayName(child);
            const divisionName = child.division?.name || child.group_name || '';
            const matchesSearch = displayName.toLowerCase().includes(searchChildrenQuery.toLowerCase()) ||
                divisionName.toLowerCase().includes(searchChildrenQuery.toLowerCase());
            const matchesDivision = selectedDivision === 'All Divisions' || child.division_id === selectedDivision;
            return matchesSearch && matchesDivision;
        }).map((child: any) => ({
            id: child.id,
            name: getChildDisplayName(child),
            division: child.division?.name || child.group_name || 'N/A'
        }));
    }, [safeCampers, searchChildrenQuery, selectedDivision]);

    const filteredStaff = useMemo(() => {
        return safeStaff
            .filter((member: any) =>
                String(member.name ?? '').toLowerCase().includes(searchChildrenQuery.toLowerCase())
            )
            .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
    }, [safeStaff, searchChildrenQuery]);
    

    const handleAdmitEntity = async () => {
        if (admitLockRef.current) return;
        if (!entityToAdmit || !companyId) {
            Alert.alert('Cannot admit', 'Missing person or company information.');
            return;
        }

        admitLockRef.current = true;
        setIsAdmitting(true);

        const entityId = entityToAdmit.id;
        const entityName = entityToAdmit.name;
        const entityType = entityToAdmit.type;
        const reasonSnapshot = admitReason.trim() || null;
        const notesSnapshot = admitNotes.trim() || null;

        setShowAdmitModal(false);
        setAdmitReason('');
        setAdmitNotes('');
        setEntityToAdmit(null);

        console.log('[ADMIT] Starting admit for:', entityType, entityId, entityName);

        try {
            const checkColumn = entityType === 'staff' ? 'staff_id' : 'child_id';
            const { data: existing, error: checkErr } = await supabase
                .from('health_center_admissions')
                .select('id')
                .eq(checkColumn, entityId)
                .eq('company_id', companyId)
                .is('checked_out_at', null)
                .maybeSingle();

            console.log('[ADMIT] Duplicate check:', { existing, checkErr });

            if (existing) {
                Alert.alert('Already admitted', `${entityName} is already in the health center.`);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();

            const insertPayload: Record<string, unknown> = {
                company_id: companyId,
                reason: reasonSnapshot,
                notes: notesSnapshot,
                season: season || null,
                admitted_by: user?.id || null,
            };

            if (entityType === 'staff') {
                insertPayload.staff_id = entityId;
            } else {
                insertPayload.child_id = entityId;
            }

            console.log('[ADMIT] Insert payload:', insertPayload);

            const insertedRow = await addAdmissionMutation.mutateAsync(insertPayload as any);
            console.log('[ADMIT] Insert response:', { insertedRow });

            await queryClient.invalidateQueries({ queryKey: ['health_center_admissions'] });
            await admissionsQuery.refetch();
            console.log('[ADMIT] Refetch complete');

            const label = entityType === 'staff' ? 'Staff member' : 'Child';
            setTimeout(() => Alert.alert('Success', `${label} ${entityName} admitted to health center.`), 100);
        } catch (error: any) {
            console.error('[ADMIT] Error:', error);
            Alert.alert('Admit failed', error?.message || 'Could not complete admission.');
        } finally {
            admitLockRef.current = false;
            setIsAdmitting(false);
        }
    };

    const getAdmissionDuration = (admittedAt: string, checkedOutAt?: string | null) => {
        const start = new Date(admittedAt);
        const end = checkedOutAt ? new Date(checkedOutAt) : new Date();
        const diffMs = end.getTime() - start.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
        return `${diffMins}m`;
    };

    const handleCheckoutChild = async (admissionId: string) => {
        console.log('[CHECKOUT] Starting checkout for admission:', admissionId);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            console.log('[CHECKOUT] User:', user?.id);

            await checkoutMutation.mutateAsync({ id: admissionId, checkedOutBy: user?.id });
            console.log('[CHECKOUT] Response:', { ok: true });

            await queryClient.invalidateQueries({ queryKey: ['health_center_admissions'] });
            await admissionsQuery.refetch();
            console.log('[CHECKOUT] Refetch complete');
            Alert.alert('Success', 'Checked out from health center.');
        } catch (error: any) {
            console.error('[CHECKOUT] Error:', error);
            Alert.alert('Checkout failed', error?.message || 'Could not check out child.');
        }
    };

    const handleHealthCenterRfidScan = async () => {
        if (!companyId || !season) {
            Alert.alert('Error', 'Company or season is not available.');
            return;
        }

        try {
            const match = await lookupCamperOrStaffByRfid(healthCenterRfidInput, companyId, season);

            if (!match) {
                Alert.alert('Not Found', 'No camper or staff found with this RFID.');
                setHealthCenterRfidInput('');
                return;
            }

            const { entity, isStaff } = match;
            const checkCol = isStaff ? 'staff_id' : 'child_id';
            const { data: existing } = await supabase
                .from('health_center_admissions')
                .select('id')
                .eq('company_id', companyId)
                .eq(checkCol, entity.id)
                .is('checked_out_at', null)
                .maybeSingle();

            if (existing) {
                await handleCheckoutChild(existing.id);
            } else {
                setEntityToAdmit({ id: entity.id, name: entity.name, type: isStaff ? 'staff' : 'camper' });
                setAdmitReason('');
                setAdmitNotes('');
                setShowAdmitModal(true);
            }
            setHealthCenterRfidInput('');
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const handleMedicationRfidScan = async () => {
        if (!companyId || !season) {
            Alert.alert('Error', 'Company or season is not available.');
            return;
        }

        try {
            const child = await lookupChildByRfid(rfidInput, companyId, season);
            
            if (!child) {
                Alert.alert('Not Found', 'No camper found with this RFID.');
                setRfidInput('');
                return;
            }

            const todayMeds = activeListMedications.filter(
                (med: any) => med.child_id === child.id && !med.administered
            );

            if (todayMeds.length === 0) {
                Alert.alert('Up to date', `${child.name} has no pending medications today.`);
                setRfidInput('');
                return;
            }

            const sortedMeds = [...todayMeds].sort((a, b) => {
                if (!a.scheduled_time) return 1;
                if (!b.scheduled_time) return -1;
                return a.scheduled_time.localeCompare(b.scheduled_time);
            });

            const nextMed = sortedMeds[0];
            await handleMedicationAdministration(nextMed, true);
            Alert.alert('Administered', `${nextMed.medication_name} given to ${child.name}.`);
            setRfidInput('');
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const handleAddMedication = async () => {
        if (!selectedMedicationChild || !medicationName || !companyId) return;

        const child = safeCampers.find((c: any) => getChildDisplayName(c) === selectedMedicationChild);
        if (!child) return;

        const standardSlots = mealTimesSelected
            .filter((m) => m !== 'Bedtime')
            .map((m) => {
                const hhmm = STANDARD_MEAL_SCHEDULE_HHMM[m];
                return hhmm ? { scheduled_time: hhmm, meal_time: [m] } : null;
            })
            .filter(Boolean) as { scheduled_time: string; meal_time: string[] }[];

        const hasBedtime = mealTimesSelected.includes('Bedtime');
        const divisionName = getCamperDivisionName(child);
        const bedtimeOpt = hasBedtime ? resolveBedtimeOptionFromDivisionName(divisionName) : undefined;
        const bedtimeSlots =
            hasBedtime && bedtimeOpt
                ? [{ scheduled_time: bedtimeOpt.scheduledTimeHHmm, meal_time: ['Bedtime'] as string[] }]
                : [];

        if (standardSlots.length === 0 && bedtimeSlots.length === 0) {
            Alert.alert('Schedule required', 'Select at least one meal time.');
            return;
        }
        if (hasBedtime && !divisionName) {
            Alert.alert(
                'No division on file',
                'Assign a roster division to this camper before scheduling Bedtime.'
            );
            return;
        }
        if (hasBedtime && !bedtimeOpt) {
            Alert.alert(
                'Bedtime not mapped',
                divisionName
                    ? `No bedtime rule matched "${divisionName}".`
                    : 'Could not resolve bedtime for this camper.'
            );
            return;
        }
        if (isRecurring && recurringFrequency === 'custom' && recurringDays.length === 0) {
            Alert.alert('Custom days required', 'Please select at least one day for custom recurring medication.');
            return;
        }

        const slots = [...standardSlots, ...bedtimeSlots];
        const basePayload = {
            company_id: companyId,
            child_id: child.id as string,
            medication_name: medicationName,
            dosage: dosage || null,
            date: medicationStartDate,
            notes: notes || null,
            alert_sent: false,
            is_recurring: isRecurring,
            frequency: isRecurring ? recurringFrequency : null,
            days_of_week: isRecurring && recurringFrequency === 'custom' ? recurringDays : [],
            end_date: isRecurring && recurringEndDate ? recurringEndDate : null,
        };

        try {
            for (const slot of slots) {
                await addMedicationMutation.mutateAsync({
                    ...basePayload,
                    scheduled_time: slot.scheduled_time,
                    meal_time: slot.meal_time,
                });
            }
            setMedicationName('');
            setDosage('');
            setNotes('');
            setMealTimesSelected([]);
            setSelectedMedicationChild('');
            setIsRecurring(false);
            setRecurringFrequency('daily');
            setRecurringDays([]);
            setRecurringEndDate('');
        } catch (error: any) {
            Alert.alert('Error', error?.message ?? 'Could not add medication.');
        }
    };

    const submitMedicationAdministration = async (med: any, administered: boolean) => {
        if (!companyId || !season) return;
        try {
            await setAdministrationMutation.mutateAsync({
                med,
                companyId,
                season,
                dateString: medicationQueryDate,
                administered,
            });
        } catch (error: any) {
            Alert.alert(
                administered ? 'Error' : 'Nothing to undo',
                error?.message ?? 'Could not update medication.',
            );
        }
    };

    const handleMedicationAdministration = (med: any, administered: boolean) => {
        if (!administered) {
            Alert.alert(
                'Mark as not administered?',
                med.medication_name
                    ? `"${med.medication_name}" will be marked as pending again.`
                    : 'This medication will be marked as pending again.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Yes, undo',
                        style: 'destructive',
                        onPress: () => void submitMedicationAdministration(med, false),
                    },
                ],
            );
            return;
        }
        void submitMedicationAdministration(med, true);
    };

    const handleDeleteMedication = (med: any) => {
        setItemToDelete({ id: med._fromRecurringTemplate ? med._templateId : med.id });
        setIsDeleteConfirmVisible(true);
    };

    const handleDelete = async () => {
        if (!itemToDelete?.id) return;
        setIsDeleting(true);
        console.log('[DELETE] medication_logs', itemToDelete.id);
        try {
            await deleteMedicationMutation.mutateAsync(itemToDelete.id);
            console.log('[DELETE] medication_logs response', { ok: true });
            await queryClient.invalidateQueries({ queryKey: ['medication_logs'] });
            Alert.alert('Success', 'Medication log deleted.');
        } catch (error: any) {
            Alert.alert('Delete failed', error?.message ?? 'Unknown error');
        } finally {
            setIsDeleting(false);
            setIsDeleteConfirmVisible(false);
            setItemToDelete(null);
        }
    };

    const handleSelectedDateChange = (date: Date) => {
        setSelectedDate(date);
        setCurrentDate(date);
    };

    const handleUploadCSV = async () => {
        if (!companyId || !season) {
            Alert.alert('Missing context', 'Company or season is not available yet.');
            return;
        }
        const picked = await pickAndReadSpreadsheetRows(parseCsvDocument);
        if (!picked.ok) {
            if (picked.error === 'canceled') return;
            Alert.alert('Upload', picked.message || 'Could not read file.');
            return;
        }
        setMedCsvUploading(true);
        try {
            const result = await uploadSpreadsheetRows('medication_logs', picked.rows, { companyId, season });
            if (result.ok) {
                await queryClient.invalidateQueries({ queryKey: ['medication_logs'] });
                Alert.alert('Success', result.message);
            } else {
                Alert.alert('Upload failed', result.error);
            }
        } finally {
            setMedCsvUploading(false);
        }
    };

    const tabs = ['Daily Log', "Today's Medications", 'Health Center', 'Health Center Log', 'Add Medication'];

    // Build division options for the picker (store ids, display names)
    const divisions = ['All Divisions', ...safeDivisions.map((division: any) => division.id)];
    const getDivisionLabel = (divisionId: string) => {
        if (divisionId === 'All Divisions') return 'All Divisions';
        return safeDivisions.find((d: any) => d.id === divisionId)?.name ?? 'Unknown Division';
    };

    const hasError = campersError || divisionsError;
    const isLoadingCompany = !companyId || campersLoading;

    if (isLoadingCompany) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.secondary} />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (hasError) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingContainer}>
                    <Ionicons name="warning-outline" size={48} color={theme.colors.danger} />
                    <Text style={styles.errorTitle}>Something went wrong</Text>
                    <Text style={styles.errorMessage}>Unable to load nurse data. Try again later.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Title and Description Section */}
                <View style={styles.titleSection}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Nurse Dashboard</Text>
                        <Text style={styles.subtitle}>Manage children's daily medications</Text>
                    </View>
                </View>

                {/* View Controls */}
                <View style={styles.viewControls}>
                    <TouchableOpacity
                        style={[styles.viewControlBtn, activeView === 'list' && styles.viewControlBtnActive]}
                        onPress={() => setActiveView('list')}
                    >
                        <Ionicons
                            name="list-outline"
                            size={18}
                            color={activeView === 'list' ? 'white' : theme.colors.text}
                        />
                        <Text style={[styles.viewControlText, activeView === 'list' && styles.viewControlTextActive]}>
                            List
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.viewControlBtn, activeView === 'calendar' && styles.viewControlBtnActive]}
                        onPress={() => setActiveView('calendar')}
                    >
                        <Ionicons
                            name="calendar-outline"
                            size={18}
                            color={activeView === 'calendar' ? 'white' : theme.colors.text}
                        />
                        <Text style={[styles.viewControlText, activeView === 'calendar' && styles.viewControlTextActive]}>
                            Calendar
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.csvHelpOutlineBtn}
                        onPress={() => {
                            setCsvGuideTab('medication_logs');
                            setShowCsvGuideModal(true);
                        }}
                        accessibilityLabel="CSV upload format guide"
                        accessibilityRole="button"
                    >
                        <Ionicons name="help-circle-outline" size={22} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.uploadBtn, medCsvUploading && { opacity: 0.65 }]}
                        onPress={() => void handleUploadCSV()}
                        disabled={medCsvUploading}
                    >
                        <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.text} />
                        <Text style={styles.uploadBtnText}>{medCsvUploading ? 'Uploading…' : 'Upload CSV'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Search and Filter Section */}
                <View style={styles.searchFilterSection}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by child name..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.dropdownContainer}
                        onPress={() => setShowDivisionPicker(true)}
                    >
                        <Text style={styles.dropdownText}>{getDivisionLabel(selectedDivision)}</Text>
                        <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.dropdownContainer}
                        onPress={() => setShowGenderPicker(true)}
                    >
                        <Text style={styles.dropdownText}>
                            {GENDER_FILTER_OPTIONS.find((o) => o.value === selectedGender)?.label ?? 'All Genders'}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.sortBtn}>
                    <Ionicons name="swap-vertical-outline" size={16} color={theme.colors.text} />
                    <Text style={styles.sortBtnText}>Sort by Division</Text>
                </TouchableOpacity>

                {/* Conditional Content: Calendar or List View */}
                {activeView === 'calendar' ? (
                    <>
                        <UnifiedCalendar
                            events={calendarWidgetEvents}
                            currentDate={currentDate}
                            onCurrentDateChange={setCurrentDate}
                            selectedDate={selectedDate}
                            onSelectedDateChange={handleSelectedDateChange}
                            views={['Month', 'Week', 'Day', 'Agenda']}
                            showZoom={true}
                            showNavigation={true}
                        />

                        {/* Medications for Selected Date */}
                        <StyledCard style={styles.medicationDateCard}>
                            <Text style={styles.medicationDateTitle}>
                                Medications for {formatSelectedDate(selectedDate)}
                            </Text>
                            {isPastDate(selectedDate) && (
                                <Text style={styles.pastDateText}>Past date - View only with notes option</Text>
                            )}
                            {activeListMedications.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>No medications scheduled for this date</Text>
                                </View>
                            ) : (
                                <View style={{ marginTop: 12 }}>
                                    {sortedActiveListMedications.map((med: any) => (
                                        <View key={medicationRowKey(med)} style={styles.medicationCard}>
                                            <View style={styles.medicationCardHeader}>
                                                <Text style={styles.medicationCardName}>{med.children?.name}</Text>
                                                <View style={styles.medicationCardBadges}>
                                                    {med.administered ? (
                                                        <View style={[styles.statusBadge, styles.statusBadgeGiven]}>
                                                            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                                                            <Text style={styles.statusBadgeGivenText}>Given</Text>
                                                        </View>
                                                    ) : (
                                                        <View style={[styles.statusBadge, styles.statusBadgePending]}>
                                                            <Ionicons name="warning" size={14} color={theme.colors.warning || '#f59e0b'} />
                                                            <Text style={styles.statusBadgePendingText}>Pending</Text>
                                                        </View>
                                                    )}
                                                    <TouchableOpacity onPress={() => handleDeleteMedication(med)} style={styles.medicationCardIconBtn}>
                                                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger || '#ef4444'} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <Text style={styles.medicationCardDetail}>{med.medication_name}{med.dosage ? ` - ${med.dosage}` : ''}</Text>
                                            <Text style={styles.medicationCardTime}>{medicationScheduleLabel(med)}</Text>
                                            {!isPastDate(selectedDate) && (
                                                med.administered ? (
                                                    <TouchableOpacity
                                                        style={[styles.markAdministeredButton, styles.unadministerButton]}
                                                        onPress={() => handleMedicationAdministration(med, false)}
                                                    >
                                                        <Text style={styles.unadministerButtonText}>Mark as Not Administered</Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <TouchableOpacity
                                                        style={styles.markAdministeredButton}
                                                        onPress={() => handleMedicationAdministration(med, true)}
                                                    >
                                                        <Text style={styles.markAdministeredButtonText}>Mark as Administered</Text>
                                                    </TouchableOpacity>
                                                )
                                            )}
                                        </View>
                                    ))}
                                </View>
                            )}
                        </StyledCard>
                    </>
                ) : (
                    <>
                        {!isSelectedDateToday && (
                            <View style={styles.selectedDateBanner}>
                                <Ionicons name="calendar-outline" size={16} color={theme.colors.secondary} />
                                <Text style={styles.selectedDateBannerText}>
                                    Showing medications for {formatSelectedDate(selectedDate)}
                                </Text>
                                <TouchableOpacity onPress={() => handleSelectedDateChange(new Date())}>
                                    <Text style={styles.selectedDateBannerAction}>Today</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Tabs */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.tabsContainer}
                            contentContainerStyle={styles.tabsContent}
                        >
                            {tabs.map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.tab, activeTab === tab && styles.tabActive]}
                                    onPress={() => setActiveTab(tab)}
                                >
                                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Conditional Content Based on Active Tab */}
                        {activeTab === "Today's Medications" ? (
                            <StyledCard style={styles.todaysMedicationsCard}>
                                <Text style={styles.todaysMedicationsTitle}>
                                    {isSelectedDateToday ? "Today's Medications" : `Medications for ${formatSelectedDate(selectedDate)}`}
                                </Text>
                                <Text style={styles.todaysMedicationsSubtitle}>
                                    As-needed meds stay on the camper profile only. Given meds and meds without a meal time are hidden — search by child or medication name to find them.
                                </Text>
                                {renderMedFilterControls()}

                                {/* RFID Quick Check-In Card */}
                                <StyledCard style={styles.rfidCard}>
                                    <View style={styles.rfidHeader}>
                                        <Ionicons name="radio-outline" size={24} color={theme.colors.text} />
                                        <Text style={styles.rfidTitle}>RFID Quick Check-In</Text>
                                    </View>
                                    <Text style={styles.rfidDescription}>
                                        Scan camper's RFID bracelet to automatically administer their medications.
                                    </Text>

                                    <View style={styles.rfidInputContainer}>
                                        <TextInput
                                            style={styles.rfidInput}
                                            placeholder="Scan or type RFID..."
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={rfidInput}
                                            onChangeText={setRfidInput}
                                            onSubmitEditing={handleMedicationRfidScan}
                                            returnKeyType="done"
                                        />
                                        <TouchableOpacity style={styles.scanButton} onPress={handleMedicationRfidScan}>
                                            <Ionicons name="scan-outline" size={18} color="white" />
                                            <Text style={styles.scanButtonText}>Scan</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.clearButton}
                                            onPress={() => setRfidInput('')}
                                        >
                                            <Text style={styles.clearButtonText}>Clear</Text>
                                        </TouchableOpacity>
                                    </View>
                                </StyledCard>

                                {/* Empty State or List - card per medication with Pending/Given, Mark as Administered, Edit, Delete */}
                                {activeListMedications.length === 0 ? (
                                    <View style={styles.emptyStateRow}>
                                        <Text style={styles.emptyText}>{selectedDateEmptyLabel}</Text>
                                        <View style={styles.emptyDot} />
                                    </View>
                                ) : (
                                    sortedActiveListMedications.map((med: any) => (
                                        <View key={medicationRowKey(med)} style={styles.medicationCard}>
                                            <View style={styles.medicationCardHeader}>
                                                <Text style={styles.medicationCardName}>{med.children?.name}</Text>
                                                <View style={styles.medicationCardBadges}>
                                                    {med.administered ? (
                                                        <View style={[styles.statusBadge, styles.statusBadgeGiven]}>
                                                            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                                                            <Text style={styles.statusBadgeGivenText}>Given</Text>
                                                        </View>
                                                    ) : null}
                                                    <TouchableOpacity onPress={() => handleDeleteMedication(med)} style={styles.medicationCardIconBtn}>
                                                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger || '#ef4444'} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <Text style={styles.medicationCardDetail}>{med.medication_name}{med.dosage ? ` - ${med.dosage}` : ''}</Text>
                                            {renderMedicationMetaBadges(
                                                med,
                                                med.children?.division?.name ?? med.children?.group_name,
                                            )}
                                            {med.date ? (
                                                <View style={styles.medicationCardDateRow}>
                                                    <Ionicons name="calendar-outline" size={12} color={theme.colors.textSecondary} />
                                                    <Text style={styles.medicationCardDate}>Started: {new Date(med.date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
                                                </View>
                                            ) : null}
                                            {!isPastDate(selectedDate) && (
                                                med.administered ? (
                                                    <TouchableOpacity
                                                        style={[styles.markAdministeredButton, styles.unadministerButton]}
                                                        onPress={() => handleMedicationAdministration(med, false)}
                                                    >
                                                        <Text style={styles.unadministerButtonText}>Mark as Not Administered</Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <TouchableOpacity
                                                        style={styles.markAdministeredButton}
                                                        onPress={() => handleMedicationAdministration(med, true)}
                                                    >
                                                        <Text style={styles.markAdministeredButtonText}>Mark as Administered</Text>
                                                    </TouchableOpacity>
                                                )
                                            )}
                                        </View>
                                    ))
                                )}
                            </StyledCard>
                        ) : activeTab === 'Health Center' ? (
                            <View style={styles.healthCenterContainer}>
                                {/* Health Center Admissions Header */}
                                <View style={styles.healthCenterHeader}>
                                    <View style={styles.healthCenterTitleRow}>
                                        <Ionicons name="lock-closed-outline" size={20} color={theme.colors.secondary} />
                                        <Text style={styles.healthCenterTitle}>Health Center Admissions</Text>
                                    </View>
                                    <Text style={styles.healthCenterSubtitle}>
                                        Track overnight admissions to the health center
                                    </Text>
                                </View>

                                {/* Currently Admitted Section */}
                                <View style={styles.currentlyAdmittedSection}>
                                    <View style={styles.currentlyAdmittedHeader}>
                                        <Ionicons name="warning" size={20} color={currentlyAdmitted.length > 0 ? '#ef4444' : theme.colors.textSecondary} />
                                        <Text style={styles.currentlyAdmittedTitle}>Currently Admitted ({currentlyAdmitted.length})</Text>
                                    </View>
                                    {currentlyAdmitted.length === 0 ? (
                                        <View style={{ padding: 16, alignItems: 'center' }}>
                                            <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>No one currently admitted</Text>
                                        </View>
                                    ) : (
                                        currentlyAdmitted.map((admission: any) => {
                                            const name = getAdmissionDisplayName(admission);
                                            const entityLabel = getAdmissionEntityLabel(admission);
                                            return (
                                                <View key={admission.id} style={styles.admittedCard}>
                                                    <View style={styles.admittedCardContent}>
                                                        <View style={styles.admittedCardRow}>
                                                            <Text style={styles.admittedCardName}>{name}</Text>
                                                            <View style={styles.camperBadge}><Text style={styles.camperBadgeText}>{entityLabel}</Text></View>
                                                        </View>
                                                        <View style={styles.admittedCardTimeRow}>
                                                            <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                                                            <Text style={styles.admittedCardTime}>
                                                                Admitted {admission.admitted_at ? new Date(admission.admitted_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + new Date(admission.admitted_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
                                                            </Text>
                                                            <View style={styles.durationBadge}>
                                                                <Text style={styles.durationBadgeText}>{getAdmissionDuration(admission.admitted_at)}</Text>
                                                            </View>
                                                        </View>
                                                        {admission.reason ? (
                                                            <Text style={styles.admittedReason}><Text style={styles.admittedReasonLabel}>Reason: </Text>{admission.reason}</Text>
                                                        ) : null}
                                                        {admission.notes ? <Text style={styles.admittedNotes}>{admission.notes}</Text> : null}
                                                    </View>
                                                    <TouchableOpacity
                                                        style={styles.checkOutButton}
                                                        onPress={() => admission.id && handleCheckoutChild(admission.id)}
                                                    >
                                                        <Ionicons name="person-remove-outline" size={16} color="white" />
                                                        <Text style={styles.checkOutButtonText}>Check Out</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            );
                                        })
                                    )}
                                </View>

                                {/* RFID Quick Check-in / Check-Out Card */}
                                <StyledCard style={styles.rfidCard}>
                                    <View style={styles.rfidHeader}>
                                        <Ionicons name="radio-outline" size={24} color={theme.colors.secondary} />
                                        <Text style={styles.rfidTitle}>RFID Quick Check-in / Check-Out</Text>
                                    </View>
                                    <Text style={styles.rfidDescription}>
                                        Scan RFID to admit or check out - system auto-detects the action
                                    </Text>

                                    <View style={styles.rfidInputContainer}>
                                        <TextInput
                                            style={styles.rfidInput}
                                            placeholder="Scan or type RFID..."
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={healthCenterRfidInput}
                                            onChangeText={setHealthCenterRfidInput}
                                            onSubmitEditing={handleHealthCenterRfidScan}
                                            returnKeyType="done"
                                        />
                                        <TouchableOpacity style={styles.scanButton} onPress={handleHealthCenterRfidScan}>
                                            <Ionicons name="scan-outline" size={18} color="white" />
                                            <Text style={styles.scanButtonText}>Scan</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.clearButton}
                                            onPress={() => setHealthCenterRfidInput('')}
                                        >
                                            <Text style={styles.clearButtonText}>Clear</Text>
                                        </TouchableOpacity>
                                    </View>
                                </StyledCard>

                                {/* Campers / Staff Toggle */}
                                <View style={styles.admissionTypeToggle}>
                                    <TouchableOpacity
                                        style={[
                                            styles.admissionTypeButton,
                                            admissionEntityType === 'camper' && styles.admissionTypeButtonActive,
                                        ]}
                                        onPress={() => setAdmissionEntityType('camper')}
                                    >
                                        <Text
                                            style={[
                                                styles.admissionTypeButtonText,
                                                admissionEntityType === 'camper' && styles.admissionTypeButtonTextActive,
                                            ]}
                                        >
                                            Campers
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.admissionTypeButton,
                                            admissionEntityType === 'staff' && styles.admissionTypeButtonActive,
                                        ]}
                                        onPress={() => setAdmissionEntityType('staff')}
                                    >
                                        <Text
                                            style={[
                                                styles.admissionTypeButtonText,
                                                admissionEntityType === 'staff' && styles.admissionTypeButtonTextActive,
                                            ]}
                                        >
                                            Staff
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Search Section */}
                                <View style={styles.searchChildrenSection}>
                                    <Text style={styles.searchChildrenTitle}>
                                        Search {admissionEntityType === 'camper' ? 'Children' : 'Staff'}
                                    </Text>
                                    <View style={styles.searchChildrenInputContainer}>
                                        <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
                                        <TextInput
                                            style={styles.searchChildrenInput}
                                            placeholder="Search by name..."
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={searchChildrenQuery}
                                            onChangeText={setSearchChildrenQuery}
                                        />
                                    </View>
                                </View>

                                {/* Available Campers / Staff Section */}
                                <View style={styles.availableChildrenSection}>
                                    <View style={styles.availableChildrenHeader}>
                                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                                        <Text style={styles.availableChildrenTitle}>
                                            Available {admissionEntityType === 'camper' ? 'Children' : 'Staff'}
                                        </Text>
                                    </View>

                                    <ScrollView
                                        style={styles.childrenList}
                                        showsVerticalScrollIndicator={true}
                                    >
                                        {admissionEntityType === 'camper' ? (
                                            filteredChildren
                                                .filter((child: any) => !currentlyAdmitted.some((a: any) => a.child_id === child.id))
                                                .map((child) => {
                                                const isSelected = selectedChild === child.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={child.id}
                                                        style={[
                                                            styles.childCard,
                                                            isSelected && styles.childCardSelected
                                                        ]}
                                                        onPress={() => setSelectedChild(isSelected ? null : child.id)}
                                                    >
                                                        <View style={styles.childCardContent}>
                                                            <Text style={[
                                                                styles.childName,
                                                                isSelected && styles.childNameSelected
                                                            ]}>
                                                                {child.name}
                                                            </Text>
                                                            <View style={styles.childDivisionTag}>
                                                                <Text style={[
                                                                    styles.childDivisionText,
                                                                    isSelected && styles.childDivisionTextSelected
                                                                ]}>
                                                                    {child.division}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.admitButton,
                                                                isSelected && styles.admitButtonSelected
                                                            ]}
                                                            onPress={(e) => {
                                                                e.stopPropagation();
                                                                setEntityToAdmit({ id: child.id, name: child.name, type: 'camper' });
                                                                setShowAdmitModal(true);
                                                            }}
                                                        >
                                                            <Ionicons
                                                                name="person-add-outline"
                                                                size={16}
                                                                color={isSelected ? 'white' : theme.colors.text}
                                                            />
                                                            <Text style={[
                                                                styles.admitButtonText,
                                                                isSelected && styles.admitButtonTextSelected
                                                            ]}>
                                                                Admit
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </TouchableOpacity>
                                                );
                                            })
                                        ) : staffLoading ? (
                                            <View style={{ padding: 16, alignItems: 'center' }}>
                                                <ActivityIndicator size="small" color={theme.colors.secondary} />
                                                <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginTop: 8 }}>Loading staff...</Text>
                                            </View>
                                        ) : staffError ? (
                                            <View style={{ padding: 16, alignItems: 'center' }}>
                                                <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>Could not load staff. Go back and reopen this screen.</Text>
                                            </View>
                                        ) : filteredStaff.length === 0 ? (
                                            <View style={{ padding: 16, alignItems: 'center' }}>
                                                <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>No staff members found</Text>
                                            </View>
                                        ) : (
                                            filteredStaff
                                                .filter((member: any) => !currentlyAdmitted.some((a: any) => a.staff_id === member.id))
                                                .map((member: any) => (
                                                    <View key={member.id} style={styles.childCard}>
                                                        <View style={styles.childCardContent}>
                                                            <Text style={styles.childName}>{member.name}</Text>
                                                            {member.role ? (
                                                                <View style={styles.childDivisionTag}>
                                                                    <Text style={styles.childDivisionText}>{member.role}</Text>
                                                                </View>
                                                            ) : null}
                                                        </View>
                                                        <TouchableOpacity
                                                            style={styles.admitButton}
                                                            onPress={() => {
                                                                setEntityToAdmit({ id: member.id, name: member.name, type: 'staff' });
                                                                setShowAdmitModal(true);
                                                            }}
                                                        >
                                                            <Ionicons name="person-add-outline" size={16} color={theme.colors.text} />
                                                            <Text style={styles.admitButtonText}>Admit</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                ))
                                        )}
                                    </ScrollView>
                                </View>
                            </View>
                        ) : activeTab === 'Health Center Log' ? (
                            <StyledCard style={styles.healthCenterLogCard}>
                                <View style={styles.healthCenterLogHeader}>
                                    <Ionicons name="bar-chart-outline" size={24} color={theme.colors.text} />
                                    <Text style={styles.healthCenterLogTitle}>Health Center Admission History</Text>
                                </View>
                                <Text style={styles.healthCenterLogSubtitle}>
                                    Past health center admissions this season
                                </Text>
                                {Object.keys(groupedHistory).length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>No admission history found for this season</Text>
                                    </View>
                                ) : (
                                    <ScrollView style={{ marginTop: 16 }} nestedScrollEnabled>
                                        {Object.entries(groupedHistory).map(([entityKey, group]: [string, any]) => {
                                            const entity = group.entity;
                                            const entityAdmissions = group.admissions;
                                            const entityLabel = group.entityType;
                                            const isExpanded = expandedHistoryChildId === (entity?.id || entityKey);
                                            return (
                                                <View key={entityKey} style={styles.historyGroupCard}>
                                                    <TouchableOpacity
                                                        style={styles.historyGroupHeader}
                                                        onPress={() => setExpandedHistoryChildId(isExpanded ? null : (entity?.id || entityKey))}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={styles.historyHeaderTopRow}>
                                                            <View style={styles.historyGroupHeaderLeft}>
                                                                <Text style={styles.historyGroupName} numberOfLines={1}>{entity?.name || 'Unknown'}</Text>
                                                                <View style={styles.camperBadge}><Text style={styles.camperBadgeText}>{entityLabel}</Text></View>
                                                            </View>
                                                            <View style={styles.historyHeaderRightRow}>
                                                                <View style={styles.admissionCountBadge}>
                                                                    <Text style={styles.admissionCountText}>{entityAdmissions.length} {entityAdmissions.length === 1 ? 'admission' : 'admissions'}</Text>
                                                                </View>
                                                                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textSecondary} />
                                                            </View>
                                                        </View>
                                                        <View style={styles.historyHeaderBottomRow}>
                                                            <Text style={styles.historyGroupDivision} numberOfLines={1}>
                                                                {entityLabel === 'Staff' ? (entity?.role || 'Staff') : (entity?.group_name || '—')}
                                                            </Text>
                                                            <Text style={styles.historyLastDate}>
                                                                Last: {entityAdmissions[0]?.admitted_at ? new Date(entityAdmissions[0].admitted_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                                                            </Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                    {isExpanded && (
                                                        <View style={styles.historyGroupDetails}>
                                                            {entityAdmissions.map((admission: any, index: number) => (
                                                                <View key={admission.id} style={styles.historyDetailBlock}>
                                                                    <Text style={styles.historyDetailTitle}>Admission #{entityAdmissions.length - index}</Text>
                                                                    <Text style={styles.historyDetailTime}>
                                                                        {admission.admitted_at ? new Date(admission.admitted_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''} • {admission.admitted_at ? new Date(admission.admitted_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''} - {admission.checked_out_at ? new Date(admission.checked_out_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
                                                                    </Text>
                                                                    <View style={styles.durationBadge}>
                                                                        <Text style={styles.durationBadgeText}>{getAdmissionDuration(admission.admitted_at, admission.checked_out_at)}</Text>
                                                                    </View>
                                                                    {admission.reason ? <Text style={styles.historyDetailReason}><Text style={styles.admittedReasonLabel}>Reason: </Text>{admission.reason}</Text> : null}
                                                                    {admission.notes ? <Text style={styles.historyDetailNotes}><Text style={styles.admittedReasonLabel}>Notes: </Text>{admission.notes}</Text> : null}
                                                                </View>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </ScrollView>
                                )}
                            </StyledCard>
                        ) : activeTab === 'Add Medication' ? (
                            <StyledCard style={styles.addMedicationCard}>
                                <View style={styles.addMedicationHeader}>
                                    <Ionicons name="link-outline" size={24} color={theme.colors.text} />
                                    <Text style={styles.addMedicationTitle}>Add Medication</Text>
                                </View>
                                <Text style={styles.addMedicationSubtitle}>
                                    Schedule medication for a child
                                </Text>

                                {/* Form Fields */}
                                <View style={styles.formContainer}>
                                    {/* Child Selection */}
                                    <View style={styles.formField}>
                                        <Text style={styles.formLabel}>Child</Text>
                                        <TouchableOpacity
                                            style={styles.childPickerButton}
                                            onPress={() => setShowChildPicker(true)}
                                        >
                                            <Text style={[
                                                styles.childPickerText,
                                                !selectedMedicationChild && styles.childPickerPlaceholder
                                            ]}>
                                                {selectedMedicationChild || 'Select a child'}
                                            </Text>
                                            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Medication Name */}
                                    <View style={styles.formField}>
                                        <Text style={styles.formLabel}>Medication Name</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Enter medication name"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={medicationName}
                                            onChangeText={setMedicationName}
                                        />
                                    </View>

                                    {/* Dosage */}
                                    <View style={styles.formField}>
                                        <Text style={styles.formLabel}>Dosage</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="e.g., 5ml, 1 tablet"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={dosage}
                                            onChangeText={setDosage}
                                        />
                                    </View>

                                    {/* Meal Time */}
                                    <View style={styles.formField}>
                                        <Text style={styles.formLabel}>Meal Time</Text>
                                        <View style={styles.mealChipsWrap}>
                                            {STANDARD_MEAL_LABEL_ORDER.map((label) => {
                                                const selected = mealTimesSelected.includes(label);
                                                return (
                                                    <TouchableOpacity
                                                        key={label}
                                                        style={[styles.mealChip, selected && styles.mealChipSelected]}
                                                        onPress={() => {
                                                            setMealTimesSelected((prev) =>
                                                                prev.includes(label)
                                                                    ? prev.filter((x) => x !== label)
                                                                    : [...prev, label]
                                                            );
                                                        }}
                                                    >
                                                        <Text style={[styles.mealChipText, selected && styles.mealChipTextSelected]}>
                                                            {label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                            <TouchableOpacity
                                                style={[
                                                    styles.mealChip,
                                                    mealTimesSelected.includes('Bedtime') && styles.mealChipSelected,
                                                ]}
                                                onPress={() => {
                                                    setMealTimesSelected((prev) => {
                                                        if (prev.includes('Bedtime')) {
                                                            return prev.filter((x) => x !== 'Bedtime');
                                                        }
                                                        return [...prev, 'Bedtime'];
                                                    });
                                                }}
                                            >
                                                <Text
                                                    style={[
                                                        styles.mealChipText,
                                                        mealTimesSelected.includes('Bedtime') && styles.mealChipTextSelected,
                                                    ]}
                                                >
                                                    Bedtime
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                        {mealTimesSelected.includes('Bedtime') ? (
                                            <View style={[styles.bedtimeInfoBox, { marginTop: theme.spacing.md }]}>
                                                {!selectedMedicationChild ? (
                                                    <Text style={styles.bedtimeInfoMuted}>
                                                        Select a camper to see their bedtime (from roster division, US Eastern).
                                                    </Text>
                                                ) : (
                                                    (() => {
                                                        const row = safeCampers.find(
                                                            (c: any) => getChildDisplayName(c) === selectedMedicationChild
                                                        );
                                                        const divName = row ? getCamperDivisionName(row) : undefined;
                                                        const resolved = resolveBedtimeOptionFromDivisionName(divName);
                                                        if (!divName) {
                                                            return (
                                                                <Text style={styles.bedtimeInfoError}>
                                                                    This camper has no roster division — assign one before using
                                                                    Bedtime.
                                                                </Text>
                                                            );
                                                        }
                                                        if (!resolved) {
                                                            return (
                                                                <Text style={styles.bedtimeInfoError}>
                                                                    No bedtime mapped for division &quot;{divName}&quot;.
                                                                </Text>
                                                            );
                                                        }
                                                        return (
                                                            <>
                                                                <Text style={styles.bedtimeInfoTitle}>
                                                                    BEDTIME:{' '}
                                                                    <Text style={styles.bedtimeInfoBody}>{resolved.mealTimeLabel}</Text>
                                                                </Text>
                                                                <Text style={styles.bedtimeInfoCaption}>
                                                                    Uses camper division ({divName}). Missed-dose alerts use US Eastern
                                                                    (America/New_York).
                                                                </Text>
                                                            </>
                                                        );
                                                    })()
                                                )}
                                            </View>
                                        ) : null}
                                    </View>

                                    {/* Notes */}
                                    <View style={styles.formField}>
                                        <Text style={styles.formLabel}>Notes</Text>
                                        <TextInput
                                            style={styles.formTextArea}
                                            placeholder="Additional notes..."
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={notes}
                                            onChangeText={setNotes}
                                            multiline={true}
                                            numberOfLines={4}
                                        />
                                    </View>

                                    {/* Recurring Medication Checkbox */}
                                    <TouchableOpacity
                                        style={styles.checkboxContainer}
                                        onPress={() => {
                                            const next = !isRecurring;
                                            setIsRecurring(next);
                                            if (!next) {
                                                setRecurringFrequency('daily');
                                                setRecurringDays([]);
                                                setRecurringEndDate('');
                                                setShowFrequencyPicker(false);
                                            }
                                        }}
                                    >
                                        <View style={[
                                            styles.checkbox,
                                            isRecurring && styles.checkboxSelected
                                        ]}>
                                            {isRecurring && <Ionicons name="checkmark" size={16} color="white" />}
                                        </View>
                                        <Text style={styles.checkboxLabel}>Recurring medication</Text>
                                    </TouchableOpacity>

                                    {isRecurring && (
                                        <View style={styles.recurringSection}>
                                            <View style={styles.formField}>
                                                <Text style={styles.formLabel}>Frequency</Text>
                                                <TouchableOpacity
                                                    style={styles.childPickerButton}
                                                    onPress={() => setShowFrequencyPicker(true)}
                                                >
                                                    <Text style={styles.childPickerText}>
                                                        {recurringFrequency === 'daily' ? 'Daily' : recurringFrequency === 'weekly' ? 'Weekly' : 'Custom Days'}
                                                    </Text>
                                                    <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                                                </TouchableOpacity>
                                            </View>

                                            {recurringFrequency === 'custom' && (
                                                <View style={styles.formField}>
                                                    <Text style={styles.formLabel}>Days of Week</Text>
                                                    <View style={styles.daysWrap}>
                                                        {RECURRENCE_DAYS.map((day) => {
                                                            const selected = recurringDays.includes(day);
                                                            return (
                                                                <TouchableOpacity
                                                                    key={day}
                                                                    style={[styles.dayChip, selected && styles.dayChipSelected]}
                                                                    onPress={() => {
                                                                        setRecurringDays((prev) => (
                                                                            prev.includes(day)
                                                                                ? prev.filter((d) => d !== day)
                                                                                : [...prev, day]
                                                                        ));
                                                                    }}
                                                                >
                                                                    <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>
                                                                        {day.slice(0, 3)}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                    </View>
                                                </View>
                                            )}

                                            <View style={styles.formField}>
                                                <Text style={styles.formLabel}>End Date (optional)</Text>
                                                <TextInput
                                                    style={styles.formInput}
                                                    placeholder="YYYY-MM-DD"
                                                    placeholderTextColor={theme.colors.textSecondary}
                                                    value={recurringEndDate}
                                                    onChangeText={setRecurringEndDate}
                                                />
                                            </View>
                                        </View>
                                    )}

                                    {/* Add Medication Button */}
                                    <TouchableOpacity
                                        style={styles.addMedicationButton}
                                        onPress={() => void handleAddMedication()}
                                    >
                                        <Text style={styles.addMedicationButtonText}>Add Medication</Text>
                                    </TouchableOpacity>
                                </View>
                            </StyledCard>
                        ) : (
                            <StyledCard style={styles.medicationLogCard}>
                                <Text style={styles.logTitle}>Daily Medication Log</Text>
                                <Text style={styles.logDescription}>
                                    {isSelectedDateToday
                                        ? 'Mark off medications administered today. As-needed meds stay on the camper profile only. Given meds are hidden — search to find and undo.'
                                        : `Mark off medications administered on ${formatSelectedDate(selectedDate)}. As-needed meds stay on the camper profile only.`}
                                </Text>
                                {renderMedFilterControls()}
                                {activeListMedications.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>{selectedDateEmptyLabel}.</Text>
                                    </View>
                                ) : (
                                    <View style={{ marginTop: 12 }}>
                                        {sortedDailyLogChildIds.map((cid) => {
                                            const meds = sortedActiveListMedications.filter(
                                                (med: any) => med.child_id === cid,
                                            );
                                            const child = safeCampers.find((c: any) => c.id === cid);
                                            const name = child ? getChildDisplayName(child) : meds[0]?.children?.name || 'Unknown';
                                            const groupName =
                                                child?.division?.name ??
                                                meds[0]?.children?.division?.name ??
                                                meds[0]?.children?.group_name ??
                                                '';
                                            return (
                                                <View key={cid} style={styles.dailyLogChildCard}>
                                                        <View style={styles.dailyLogChildHeader}>
                                                            <Text style={styles.dailyLogChildName}>{name}</Text>
                                                            <View style={styles.divisionTagSmall}><Text style={styles.divisionTagSmallText}>{groupName}</Text></View>
                                                        </View>
                                                        {meds.map((med: any) => (
                                                            <View key={medicationRowKey(med)} style={styles.dailyLogMedRow}>
                                                                <Text style={styles.dailyLogMedDetail}>{med.medication_name}{med.dosage ? ` - ${med.dosage}` : ''}</Text>
                                                                {renderMedicationMetaBadges(
                                                                    med,
                                                                    meds[0]?.children?.division?.name ?? meds[0]?.children?.group_name,
                                                                )}
                                            {med.administered ? (
                                                <>
                                                    <View style={[styles.statusBadge, styles.statusBadgeGiven, { alignSelf: 'flex-start', marginTop: 4 }]}>
                                                        <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                                                        <Text style={styles.statusBadgeGivenText}>Given</Text>
                                                    </View>
                                                    {!isPastDate(selectedDate) && (
                                                        <TouchableOpacity
                                                            style={[styles.markAdministeredButton, styles.unadministerButton, { marginTop: 6 }]}
                                                            onPress={() => handleMedicationAdministration(med, false)}
                                                        >
                                                            <Text style={styles.unadministerButtonText}>Mark as Not Administered</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </>
                                            ) : (
                                                !isPastDate(selectedDate) && (
                                                    <TouchableOpacity
                                                        style={[styles.markAdministeredButton, { marginTop: 6 }]}
                                                        onPress={() => handleMedicationAdministration(med, true)}
                                                    >
                                                        <Text style={styles.markAdministeredButtonText}>Mark as Administered</Text>
                                                    </TouchableOpacity>
                                                )
                                            )}
                                                            </View>
                                                        ))}
                                                    </View>
                                                );
                                        })}
                                    </View>
                                )}
                            </StyledCard>
                        )}
                    </>
                )}

            </ScrollView>

            {/* Division Picker Modal */}
            <Modal
                visible={showDivisionPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDivisionPicker(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowDivisionPicker(false)}>
                    <Pressable style={styles.pickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Division</Text>
                            <TouchableOpacity onPress={() => setShowDivisionPicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            style={styles.pickerContent}
                            showsVerticalScrollIndicator={true}
                        >
                            {divisions.map((division) => (
                                <TouchableOpacity
                                    key={division}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        setSelectedDivision(division);
                                        setShowDivisionPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{getDivisionLabel(division)}</Text>
                                    {selectedDivision === division && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Gender Picker Modal */}
            <Modal
                visible={showGenderPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowGenderPicker(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowGenderPicker(false)}>
                    <Pressable style={styles.pickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Filter by Gender</Text>
                            <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerContent} showsVerticalScrollIndicator={true}>
                            {GENDER_FILTER_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        setSelectedGender(option.value);
                                        setShowGenderPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{option.label}</Text>
                                    {selectedGender === option.value && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={showMealFilterPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowMealFilterPicker(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowMealFilterPicker(false)}>
                    <Pressable style={styles.pickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Filter by Meal Time</Text>
                            <TouchableOpacity onPress={() => setShowMealFilterPicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerContent} showsVerticalScrollIndicator={true}>
                            {MEDICATION_MEAL_FILTER_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        setMedMealFilter(option.value);
                                        setShowMealFilterPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{option.label}</Text>
                                    {medMealFilter === option.value && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={showMedSortPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowMedSortPicker(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowMedSortPicker(false)}>
                    <Pressable style={styles.pickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Sort Medications</Text>
                            <TouchableOpacity onPress={() => setShowMedSortPicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerContent} showsVerticalScrollIndicator={true}>
                            {(
                                [
                                    { value: 'meal_time' as const, label: 'Sort by Meal Time' },
                                    { value: 'name' as const, label: 'Sort by Name' },
                                    { value: 'division' as const, label: 'Sort by Division' },
                                    { value: 'gender' as const, label: 'Sort by Gender' },
                                ] as const
                            ).map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        setMedSortBy(option.value);
                                        setShowMedSortPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{option.label}</Text>
                                    {medSortBy === option.value && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Admit Modal */}
            <Modal
                visible={showAdmitModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    if (!isAdmitting) {
                        setShowAdmitModal(false);
                        setAdmitReason('');
                        setAdmitNotes('');
                        setEntityToAdmit(null);
                    }
                }}
            >
                <Pressable
                    style={styles.admitModalOverlay}
                    onPress={() => {
                        if (!isAdmitting) {
                            setShowAdmitModal(false);
                            setAdmitReason('');
                            setAdmitNotes('');
                            setEntityToAdmit(null);
                        }
                    }}
                >
                    <Pressable style={styles.admitModal} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.admitModalTitle}>Admit to Health Center</Text>
                        {entityToAdmit && (
                            <Text style={styles.admitModalChildName}>{entityToAdmit.name}</Text>
                        )}

                        <Text style={styles.admitModalLabel}>Reason for admission (optional):</Text>
                        <TextInput
                            style={styles.admitReasonInput}
                            placeholder="Enter reason..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={admitReason}
                            onChangeText={setAdmitReason}
                            multiline={true}
                            numberOfLines={3}
                            editable={!isAdmitting}
                        />

                        <Text style={styles.admitModalLabel}>Additional notes (optional):</Text>
                        <TextInput
                            style={styles.admitReasonInput}
                            placeholder="Enter notes..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={admitNotes}
                            onChangeText={setAdmitNotes}
                            multiline={true}
                            numberOfLines={3}
                            editable={!isAdmitting}
                        />

                        <View style={styles.admitModalActions}>
                            <TouchableOpacity
                                style={[styles.admitConfirmButton, isAdmitting && { opacity: 0.6 }]}
                                onPress={handleAdmitEntity}
                                disabled={isAdmitting}
                            >
                                {isAdmitting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.admitConfirmButtonText}>Admit</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.admitCancelButton}
                                onPress={() => {
                                    setShowAdmitModal(false);
                                    setAdmitReason('');
                                    setAdmitNotes('');
                                    setEntityToAdmit(null);
                                }}
                                disabled={isAdmitting}
                            >
                                <Text style={styles.admitCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Child Picker Modal for Add Medication */}
            <Modal
                visible={showChildPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowChildPicker(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowChildPicker(false)}
                >
                    <Pressable
                        style={styles.pickerModal}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Child</Text>
                            <TouchableOpacity onPress={() => setShowChildPicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerContent}>
                            {filteredChildren.map((child: any) => (
                                <TouchableOpacity
                                    key={child.id}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        setSelectedMedicationChild(child.name);
                                        setShowChildPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{child.name}</Text>
                                    {selectedMedicationChild === child.name && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={showFrequencyPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowFrequencyPicker(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowFrequencyPicker(false)}
                >
                    <Pressable
                        style={styles.pickerModal}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Frequency</Text>
                            <TouchableOpacity onPress={() => setShowFrequencyPicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerContent}>
                            {[
                                { label: 'Daily', value: 'daily' },
                                { label: 'Weekly', value: 'weekly' },
                                { label: 'Custom Days', value: 'custom' },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        setRecurringFrequency(option.value as 'daily' | 'weekly' | 'custom');
                                        if (option.value !== 'custom') {
                                            setRecurringDays([]);
                                        }
                                        setShowFrequencyPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{option.label}</Text>
                                    {recurringFrequency === option.value && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={isDeleteConfirmVisible} transparent animationType="fade" onRequestClose={() => { setIsDeleteConfirmVisible(false); setItemToDelete(null); }}>
                <Pressable style={styles.deleteModalOverlay} onPress={() => { setIsDeleteConfirmVisible(false); setItemToDelete(null); }}>
                    <Pressable style={styles.deleteModalContent} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.deleteModalTitle}>Confirm Delete</Text>
                        <Text style={styles.deleteModalMessage}>Are you sure you want to delete this item? This cannot be undone.</Text>
                        <View style={styles.deleteModalActions}>
                            <TouchableOpacity style={styles.deleteModalCancelBtn} onPress={() => { setIsDeleteConfirmVisible(false); setItemToDelete(null); }} disabled={isDeleting}>
                                <Text style={styles.deleteModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.deleteModalConfirmBtn, isDeleting && { opacity: 0.6 }]} onPress={handleDelete} disabled={isDeleting}>
                                {isDeleting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.deleteModalConfirmText}>Delete</Text>}
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* CSV format guide — matches web Nurse CSVUploader help (tyler-hill) */}
            <Modal
                visible={showCsvGuideModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowCsvGuideModal(false)}
            >
                <Pressable style={styles.csvGuideOverlay} onPress={() => setShowCsvGuideModal(false)}>
                    <Pressable style={styles.csvGuideSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.csvGuideHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                <Ionicons name="document-text-outline" size={22} color={theme.colors.text} />
                                <Text style={styles.csvGuideTitle}>CSV Upload Format Guide</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowCsvGuideModal(false)} hitSlop={12}>
                                <Ionicons name="close" size={26} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.csvGuideSubtitle}>Medications tab opens by default on Nurse</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.csvGuideTabRow}>
                            {CSV_GUIDE_TAB_ORDER.map((key) => {
                                const active = csvGuideTab === key;
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[styles.csvGuideTab, active && styles.csvGuideTabActive]}
                                        onPress={() => setCsvGuideTab(key)}
                                    >
                                        <Text style={[styles.csvGuideTabText, active && styles.csvGuideTabTextActive]}>
                                            {CSV_GUIDE_FORMATS[key].shortLabel}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <ScrollView style={styles.csvGuideBody} showsVerticalScrollIndicator>
                            <Text style={styles.csvGuideSectionTitle}>{CSV_GUIDE_FORMATS[csvGuideTab].title}</Text>
                            <Text style={styles.csvGuideHint}>First row must be column headers</Text>

                            <Text style={styles.csvGuideLabel}>
                                {CSV_GUIDE_FORMATS[csvGuideTab].optionalColumns
                                    ? 'Required column headers'
                                    : 'Required columns'}
                            </Text>
                            <Text selectable style={styles.csvGuideMono}>
                                {CSV_GUIDE_FORMATS[csvGuideTab].columns}
                            </Text>

                            {CSV_GUIDE_FORMATS[csvGuideTab].optionalColumns ? (
                                <>
                                    <Text style={styles.csvGuideLabel}>Optional column headers</Text>
                                    <Text selectable style={styles.csvGuideMono}>
                                        {CSV_GUIDE_FORMATS[csvGuideTab].optionalColumns}
                                    </Text>
                                    <Text style={[styles.csvGuideHint, { marginTop: 6 }]}>
                                        Use one header row: required columns first (left to right), then optional
                                        columns.
                                    </Text>
                                </>
                            ) : null}

                            <Text style={styles.csvGuideLabel}>Example row</Text>
                            <Text selectable style={styles.csvGuideMono}>
                                {CSV_GUIDE_FORMATS[csvGuideTab].example}
                            </Text>

                            <View style={styles.csvGuideNotesBox}>
                                <Text style={styles.csvGuideNotesTitle}>Important</Text>
                                <Text style={styles.csvGuideNotesBody}>{CSV_GUIDE_FORMATS[csvGuideTab].notes}</Text>
                            </View>

                            <View style={styles.csvGuideTipsBox}>
                                <Text style={styles.csvGuideNotesTitle}>General tips</Text>
                                <Text style={styles.csvGuideTipsBullet}>• First row matches column names exactly</Text>
                                <Text style={styles.csvGuideTipsBullet}>• Commas separate values</Text>
                                <Text style={styles.csvGuideTipsBullet}>• Backslash before commas inside text fields</Text>
                                <Text style={styles.csvGuideTipsBullet}>• Max 1000 data rows per file</Text>
                                <Text style={styles.csvGuideTipsBullet}>• Dates: YYYY-MM-DD</Text>
                            </View>
                        </ScrollView>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
        gap: theme.spacing.md,
    },
    loadingText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    errorTitle: {
        ...theme.typography.h2,
        color: theme.colors.text,
        textAlign: 'center',
    },
    errorMessage: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: 100,
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    titleSection: {
        marginBottom: theme.spacing.lg,
    },
    titleContainer: {
        width: '100%',
    },
    title: {
        ...theme.typography.h1,
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
        flexShrink: 1,
    },
    subtitle: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    viewControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
        flexWrap: 'wrap',
    },
    viewControlBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
        flexShrink: 1,
        minWidth: 80,
    },
    viewControlBtnActive: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    viewControlText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 14,
    },
    viewControlTextActive: {
        color: 'white',
    },
    csvHelpOutlineBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        minHeight: 40,
        minWidth: 44,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
        flexShrink: 1,
        minWidth: 100,
    },
    uploadBtnText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 12,
        flexShrink: 1,
    },
    searchFilterSection: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    selectedDateBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    selectedDateBannerText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.text,
    },
    selectedDateBannerAction: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.secondary,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
        minWidth: 150,
        flexShrink: 1,
    },
    searchIcon: {
        marginRight: theme.spacing.xs,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    dropdownContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
        minWidth: 120,
        flexShrink: 1,
        flex: 1,
        maxWidth: 200,
    },
    dropdownText: {
        fontSize: 14,
        color: theme.colors.text,
        flexShrink: 1,
        flex: 1,
    },
    sortBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.md,
    },
    sortBtnText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 14,
    },
    tabsContainer: {
        marginBottom: theme.spacing.md,
    },
    tabsContent: {
        gap: theme.spacing.sm,
        paddingRight: theme.spacing.md,
    },
    tab: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        flexShrink: 0,
    },
    tabActive: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        flexShrink: 0,
    },
    tabTextActive: {
        color: 'white',
    },
    medicationLogCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        minHeight: 300,
        width: '100%',
    },
    logTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    logDescription: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: theme.spacing.xl,
    },
    emptyText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'flex-end',
    },
    pickerModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        height: '50%',
        paddingBottom: theme.spacing.xl,
        width: '100%',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    pickerTitle: {
        ...theme.typography.h2,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    pickerContent: {
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
    },
    pickerOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    pickerOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },
    // Upload CSV Modal Styles
    uploadModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    medicationDateCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        minHeight: 200,
    },
    medicationDateTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    pastDateText: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    // Today's Medications Styles
    todaysMedicationsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        minHeight: 400,
        width: '100%',
    },
    todaysMedicationsTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    todaysMedicationsSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    medFilterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
        width: '100%',
    },
    medFilterDropdown: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
    },
    medFilterDropdownText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.text,
    },
    medMetaBadgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    recurringBadge: {
        backgroundColor: '#ccfbf1',
        borderWidth: 1,
        borderColor: '#5eead4',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    recurringBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#115e59',
    },
    rfidCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        width: '100%',
    },
    rfidHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    rfidTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        flexShrink: 1,
        flex: 1,
    },
    rfidDescription: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    rfidInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    rfidInput: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        height: 44,
        outlineWidth: 0,
        outlineColor: 'transparent',
        minWidth: 150,
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
        height: 44,
        flexShrink: 0,
        minWidth: 70,
    },
    scanButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    clearButton: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        height: 44,
        justifyContent: 'center',
        flexShrink: 0,
        minWidth: 60,
    },
    clearButtonText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 14,
    },
    emptyStateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xs,
        marginTop: theme.spacing.xl,
    },
    emptyDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.secondary,
    },
    csvGuideOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: theme.spacing.md,
    },
    csvGuideSheet: {
        maxHeight: '88%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    csvGuideHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    csvGuideTitle: {
        ...theme.typography.h3,
        fontSize: 17,
        fontWeight: '700',
        color: theme.colors.text,
        flexShrink: 1,
    },
    csvGuideSubtitle: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.sm,
        paddingBottom: theme.spacing.xs,
    },
    csvGuideTabRow: {
        maxHeight: 48,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
    },
    csvGuideTab: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        marginRight: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    csvGuideTabActive: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    csvGuideTabText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
    csvGuideTabTextActive: {
        color: '#fff',
    },
    csvGuideBody: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        maxHeight: 420,
    },
    csvGuideSectionTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4,
    },
    csvGuideHint: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    csvGuideLabel: {
        ...theme.typography.bodySmall,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: theme.spacing.sm,
        marginBottom: 6,
    },
    csvGuideMono: {
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
        fontSize: 11,
        lineHeight: 16,
        color: theme.colors.text,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.sm,
        padding: theme.spacing.sm,
    },
    csvGuideNotesBox: {
        marginTop: theme.spacing.md,
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
    },
    csvGuideTipsBox: {
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.xl,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
    },
    csvGuideNotesTitle: {
        fontWeight: '700',
        fontSize: 13,
        color: theme.colors.text,
        marginBottom: 4,
    },
    csvGuideNotesBody: {
        fontSize: 13,
        color: theme.colors.text,
        lineHeight: 18,
    },
    csvGuideTipsBullet: {
        fontSize: 12,
        color: theme.colors.text,
        lineHeight: 17,
        marginTop: 2,
    },
    // Health Center Styles
    healthCenterContainer: {
        width: '100%',
    },
    healthCenterHeader: {
        marginBottom: theme.spacing.lg,
    },
    healthCenterTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    healthCenterTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    healthCenterSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    searchChildrenSection: {
        marginBottom: theme.spacing.lg,
    },
    searchChildrenTitle: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    searchChildrenInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
    },
    searchChildrenInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        marginLeft: theme.spacing.xs,
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    availableChildrenSection: {
        width: '100%',
    },
    availableChildrenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    availableChildrenTitle: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    childrenList: {
        maxHeight: 500,
        width: '100%',
    },
    childCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        width: '100%',
    },
    childCardSelected: {
        backgroundColor: '#FFA500',
        borderColor: '#FFA500',
    },
    childCardContent: {
        flex: 1,
    },
    childName: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    childNameSelected: {
        color: 'white',
    },
    childDivisionTag: {
        alignSelf: 'flex-start',
    },
    childDivisionText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    childDivisionTextSelected: {
        color: 'white',
    },
    admitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        gap: theme.spacing.xs,
    },
    admitButtonSelected: {
        backgroundColor: '#FFA500',
        borderColor: '#FFA500',
    },
    admitButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    admitButtonTextSelected: {
        color: 'white',
    },
    // Admit Modal Styles
    admitModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    admitModal: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '90%',
        maxWidth: 400,
    },
    admitModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 4,
    },
    admitModalChildName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.secondary,
        textAlign: 'center',
        marginBottom: 16,
    },
    admitModalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 6,
    },
    admitReasonInput: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: theme.colors.text,
        minHeight: 70,
        textAlignVertical: 'top',
        marginBottom: 12,
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    admitModalActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    admitConfirmButton: {
        flex: 1,
        backgroundColor: theme.colors.secondary,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    admitConfirmButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    admitCancelButton: {
        flex: 1,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    admitCancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
    },
    // Health Center Log Styles
    healthCenterLogCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        minHeight: 400,
        width: '100%',
    },
    healthCenterLogHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    healthCenterLogTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    healthCenterLogSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
    },
    currentlyAdmittedSection: {
        marginBottom: theme.spacing.lg,
    },
    admissionTypeToggle: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: 10,
        padding: 4,
        marginBottom: theme.spacing.md,
        maxWidth: 280,
    },
    admissionTypeButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    admissionTypeButtonActive: {
        backgroundColor: theme.colors.secondary,
    },
    admissionTypeButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    admissionTypeButtonTextActive: {
        color: '#fff',
    },
    currentlyAdmittedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    currentlyAdmittedTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    admittedCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(239, 68, 68, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    admittedCardContent: { flex: 1 },
    admittedCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    admittedCardName: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    camperBadge: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    camperBadgeText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    admittedCardTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
    },
    admittedCardTime: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    durationBadge: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    durationBadgeText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    admittedReason: {
        fontSize: 13,
        color: theme.colors.text,
        marginTop: 4,
    },
    admittedReasonLabel: {
        fontWeight: '600',
    },
    admittedNotes: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    checkOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    checkOutButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    historyGroupCard: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
    },
    historyGroupHeader: {
        gap: theme.spacing.xs,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
    },
    historyHeaderTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
    },
    historyGroupHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flex: 1,
        minWidth: 0,
    },
    historyHeaderRightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        flexShrink: 0,
    },
    historyGroupName: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        flexShrink: 1,
    },
    historyHeaderBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
    },
    historyGroupDivision: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
        flex: 1,
        minWidth: 0,
    },
    admissionCountBadge: {
        backgroundColor: theme.colors.secondary,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginBottom: 4,
    },
    admissionCountText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
    },
    historyLastDate: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        flexShrink: 0,
    },
    historyGroupDetails: {
        padding: theme.spacing.md,
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    historyDetailBlock: {
        borderLeftWidth: 2,
        borderLeftColor: 'rgba(59, 130, 246, 0.5)',
        paddingLeft: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    historyDetailTitle: {
        fontWeight: '600',
        fontSize: 14,
        color: theme.colors.text,
    },
    historyDetailTime: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    historyDetailReason: {
        fontSize: 13,
        color: theme.colors.text,
        marginTop: 4,
    },
    historyDetailNotes: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    medicationCard: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    medicationCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    medicationCardName: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    medicationCardBadges: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeGiven: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
    },
    statusBadgeGivenText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10b981',
    },
    statusBadgePending: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
    },
    statusBadgePendingText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#f59e0b',
    },
    medicationCardIconBtn: {
        padding: 10,
    },
    medicationCardDetail: {
        fontSize: 14,
        color: theme.colors.text,
    },
    medicationCardTime: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    medicationCardDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    medicationCardDate: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    markAdministeredButton: {
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    markAdministeredButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    unadministerButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    unadministerButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    dailyLogChildCard: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    dailyLogChildHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    dailyLogChildName: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    divisionTagSmall: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    divisionTagSmallText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    dailyLogMedRow: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.sm,
        marginTop: theme.spacing.xs,
    },
    dailyLogMedDetail: {
        fontSize: 14,
        color: theme.colors.text,
    },
    dailyLogMedTime: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    // Add Medication Styles
    addMedicationCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        width: '100%',
    },
    addMedicationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    addMedicationTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    addMedicationSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    formContainer: {
        width: '100%',
    },
    formField: {
        marginBottom: theme.spacing.lg,
    },
    formLabel: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    childPickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        height: 44,
    },
    childPickerText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    childPickerPlaceholder: {
        color: theme.colors.textSecondary,
    },
    formInput: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        height: 44,
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    mealTimeContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    mealTimeColumn: {
        flex: 1,
    },
    mealChipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    mealChip: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    mealChipSelected: {
        borderColor: theme.colors.secondary,
        backgroundColor: theme.colors.secondary,
    },
    mealChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
    },
    mealChipTextSelected: {
        color: 'white',
    },
    radioButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioCircleSelected: {
        borderColor: theme.colors.secondary,
        backgroundColor: theme.colors.secondary,
    },
    radioInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'white',
    },
    radioLabel: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    formTextArea: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        minHeight: 100,
        textAlignVertical: 'top',
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    checkboxLabel: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    recurringSection: {
        marginTop: -theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    bedtimeInfoBox: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
    },
    bedtimeInfoMuted: {
        ...theme.typography.body,
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    bedtimeInfoError: {
        ...theme.typography.body,
        fontSize: 13,
        color: '#b91c1c',
    },
    bedtimeInfoTitle: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    bedtimeInfoBody: {
        fontWeight: '400',
    },
    bedtimeInfoCaption: {
        ...theme.typography.body,
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    daysWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    dayChip: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
    },
    dayChipSelected: {
        borderColor: theme.colors.secondary,
        backgroundColor: theme.colors.secondary,
    },
    dayChipText: {
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: '600',
    },
    dayChipTextSelected: {
        color: 'white',
    },
    addMedicationButton: {
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    addMedicationButtonText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },

    // Upload CSV Modal Styles
    uploadModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        height: '50%',
    },
    uploadModalTitle: {
        ...theme.typography.h2,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
    },
    uploadOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
    },
    uploadOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },
    deleteModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    deleteModalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '85%', maxWidth: 340 },
    deleteModalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 8 },
    deleteModalMessage: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    deleteModalActions: { flexDirection: 'row', gap: 8 },
    deleteModalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
    deleteModalCancelText: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
    deleteModalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#dc2626', alignItems: 'center' },
    deleteModalConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
