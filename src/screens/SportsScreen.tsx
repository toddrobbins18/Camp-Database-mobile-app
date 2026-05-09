import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    FlatList,
    Alert,
    ActivityIndicator,
    Pressable,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { UnifiedCalendar, type CalendarWidgetEvent } from '../components/UnifiedCalendar';
import { useCompany } from '../contexts/CompanyContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { pickAndReadCsvText } from '../lib/pickCsvDocument';
import { uploadCsvFromText } from '../lib/csvTableUpload';
import {
    useSportsEnrollments,
    useAddSportsEnrollment,
    useUpdateSportsEnrollment,
} from '../api/sports';
import { useCampers, useDivisions } from '../api/campers';

interface SportsScreenProps {
    navigation: any;
}



const GENDERS = ['All Genders', 'Boys', 'Girls'];

/** Match web SportsAcademy: compare normalized strings; support common DB spellings. */
function childGenderMatchesFilter(
    childGender: string | null | undefined,
    filter: (typeof GENDERS)[number],
): boolean {
    if (filter === 'All Genders') return true;
    const g = (childGender || '').toLowerCase().trim();
    const sel = filter === 'Boys' ? 'boys' : 'girls';
    if (g === sel) return true;
    if (filter === 'Boys') {
        return g === 'boy' || g === 'male' || g === 'm' || g.startsWith('boy');
    }
    return g === 'girl' || g === 'female' || g === 'f' || g.startsWith('girl');
}

const ENROLLMENT_SPORTS = [
    'Baseball',
    'Basketball',
    'Dance',
    'Football',
    'Golf',
    'Gymnastics',
    'Hockey',
    'Lacrosse',
    'Soccer',
    'Softball',
    'Tennis',
    'Volleyball',
    'Waterfront',
];

const SCHEDULE_PERIODS = [
    'Rest Hour',
    'Shower Hour',
    'Free Play',
    'Period #',
    'Other',
];

const SPORTS_CALENDAR_ACCENT = { bg: '#dbeafe', text: '#1d4ed8', marker: '#2563eb' };

export const SportsScreen = ({ navigation }: SportsScreenProps) => {
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [selectedGender, setSelectedGender] = useState<(typeof GENDERS)[number]>('All Genders');
    const [selectedSport, setSelectedSport] = useState('All Sports');
    const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
    const [showGenderDropdown, setShowGenderDropdown] = useState(false);
    const [showSportDropdown, setShowSportDropdown] = useState(false);
    const [showCalendarView, setShowCalendarView] = useState(false);
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [showAddEnrollmentModal, setShowAddEnrollmentModal] = useState(false);
    const [sportsCsvUploading, setSportsCsvUploading] = useState(false);

    const { companyId, season } = useCompany();
    const queryClient = useQueryClient();
    const { data: campersData = [] } = useCampers(companyId, season);
    const { data: enrollmentsData = [] } = useSportsEnrollments(companyId, season);
    const { data: divisionsData = [] } = useDivisions(companyId);

    /** All Sports + catalog (same as add form) + any sports only present in enrollments — matches Division/Gender always-full pickers. */
    const sportFilterOptions = useMemo(() => {
        const fromEnrollments = new Set(
            enrollmentsData.map((e) => e.sport_name).filter(Boolean) as string[],
        );
        const merged = new Set<string>([...ENROLLMENT_SPORTS, ...fromEnrollments]);
        const sorted = [...merged].sort((a, b) => a.localeCompare(b));
        return ['All Sports', ...sorted];
    }, [enrollmentsData]);

    const filteredEnrollments = useMemo(() => {
        let filtered = enrollmentsData;
        
        if (selectedDivision !== 'All Divisions') {
            filtered = filtered.filter(e => e.children?.division_id === selectedDivision);
        }
        if (selectedGender !== 'All Genders') {
            filtered = filtered.filter((e) =>
                childGenderMatchesFilter(e.children?.gender, selectedGender),
            );
        }
        if (selectedSport !== 'All Sports') {
            filtered = filtered.filter(e => e.sport_name === selectedSport);
        }
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(e => 
                (e.children?.name && e.children.name.toLowerCase().includes(lowerQuery)) ||
                (e.sport_name && e.sport_name.toLowerCase().includes(lowerQuery)) ||
                (e.instructor && e.instructor.toLowerCase().includes(lowerQuery))
            );
        }
        return filtered;
    }, [enrollmentsData, selectedDivision, selectedGender, selectedSport, searchQuery]);

    const calendarWidgetEvents = useMemo((): CalendarWidgetEvent[] => {
        const out: CalendarWidgetEvent[] = [];
        for (const enroll of filteredEnrollments) {
            if (!enroll.id || !enroll.start_date) continue;
            const startRaw = enroll.start_date.split('T')[0];
            const endRaw = (enroll.end_date || enroll.start_date).split('T')[0];
            const [sy, sm, sd] = startRaw.split('-').map(Number);
            const [ey, em, ed] = endRaw.split('-').map(Number);
            if (!Number.isFinite(sy) || !Number.isFinite(sm) || !Number.isFinite(sd)) continue;
            let cur = new Date(sy, sm - 1, sd);
            const end = new Date(
                Number.isFinite(ey) ? ey : sy,
                Number.isFinite(em) ? em - 1 : sm - 1,
                Number.isFinite(ed) ? ed : sd,
            );
            if (cur > end) continue;
            while (cur.getTime() <= end.getTime()) {
                const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
                out.push({
                    id: `${enroll.id}__${iso}`,
                    title: enroll.sport_name || 'Sports Event',
                    date: new Date(cur.getFullYear(), cur.getMonth(), cur.getDate()),
                    time: enroll.schedule_periods?.filter(Boolean).join(', ') || undefined,
                    location: enroll.instructor || undefined,
                    type: 'sports',
                    tags: enroll.children?.name ? [enroll.children.name] : undefined,
                    accent: SPORTS_CALENDAR_ACCENT,
                });
                const next = new Date(cur);
                next.setDate(next.getDate() + 1);
                cur = next;
            }
        }
        return out;
    }, [filteredEnrollments]);

    const addEnrollmentMutation = useAddSportsEnrollment();
    const updateEnrollmentMutation = useUpdateSportsEnrollment();
    const [itemToDelete, setItemToDelete] = useState<any>(null);
    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingEnrollment, setEditingEnrollment] = useState<any | null>(null);

    // Add Enrollment Modal States
    const [selectedChildId, setSelectedChildId] = useState('');
    const [showCamperDropdown, setShowCamperDropdown] = useState(false);
    const [sportName, setSportName] = useState('');
    const [instructor, setInstructor] = useState('');
    const [schedulePeriod, setSchedulePeriod] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [notes, setNotes] = useState('');
    const [showSportNameDropdown, setShowSportNameDropdown] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [startDatePickerMonth, setStartDatePickerMonth] = useState(new Date().getMonth());
    const [startDatePickerYear, setStartDatePickerYear] = useState(new Date().getFullYear());
    const [endDatePickerMonth, setEndDatePickerMonth] = useState(new Date().getMonth());
    const [endDatePickerYear, setEndDatePickerYear] = useState(new Date().getFullYear());

    // Help modal state
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [activeHelpTab, setActiveHelpTab] = useState('Children');

    // Reuse date formatting function
    const formatDate = (date: Date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    const formatDateLong = (date: Date) => {
        const monthNames = [
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
        return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    const handleEnrollmentDateSelect = (date: Date, type: 'start' | 'end') => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}`; // Format for DB: YYYY-MM-DD
        if (type === 'start') {
            setStartDate(formatted);
            setShowStartDatePicker(false);
        } else {
            setEndDate(formatted);
            setShowEndDatePicker(false);
        }
    };

    // Reuse date picker render function for enrollment modal
    const renderEnrollmentDatePicker = (
        type: 'start' | 'end',
        visible: boolean,
        onClose: () => void
    ) => {
        const currentMonth = type === 'start' ? startDatePickerMonth : endDatePickerMonth;
        const currentYear = type === 'start' ? startDatePickerYear : endDatePickerYear;
        const today = new Date();
        const selectedDateValue = type === 'start' ? startDate : endDate;

        const monthNames = [
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

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startingDayOfWeek = firstDayOfMonth.getDay();

        const monthDates = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            monthDates.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            monthDates.push(new Date(currentYear, currentMonth, i));
        }

        if (!visible) return null;

        return (
            <View
                style={[StyleSheet.absoluteFillObject, { zIndex: 10000, elevation: 10000 }]}
                pointerEvents="box-none"
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <View style={styles.datePickerContainer} onStartShouldSetResponder={() => true}>
                        <View style={styles.datePickerHeader}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (type === 'start') {
                                        if (startDatePickerMonth === 0) {
                                            setStartDatePickerMonth(11);
                                            setStartDatePickerYear(startDatePickerYear - 1);
                                        } else {
                                            setStartDatePickerMonth(startDatePickerMonth - 1);
                                        }
                                    } else {
                                        if (endDatePickerMonth === 0) {
                                            setEndDatePickerMonth(11);
                                            setEndDatePickerYear(endDatePickerYear - 1);
                                        } else {
                                            setEndDatePickerMonth(endDatePickerMonth - 1);
                                        }
                                    }
                                }}
                            >
                                <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.datePickerMonth}>
                                {monthNames[currentMonth]} {currentYear}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    if (type === 'start') {
                                        if (startDatePickerMonth === 11) {
                                            setStartDatePickerMonth(0);
                                            setStartDatePickerYear(startDatePickerYear + 1);
                                        } else {
                                            setStartDatePickerMonth(startDatePickerMonth + 1);
                                        }
                                    } else {
                                        if (endDatePickerMonth === 11) {
                                            setEndDatePickerMonth(0);
                                            setEndDatePickerYear(endDatePickerYear + 1);
                                        } else {
                                            setEndDatePickerMonth(endDatePickerMonth + 1);
                                        }
                                    }
                                }}
                            >
                                <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.datePickerWeekdays}>
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                                <Text key={day} style={styles.weekdayText}>
                                    {day}
                                </Text>
                            ))}
                        </View>
                        <View style={styles.datePickerGrid}>
                            {monthDates.map((date, index) => {
                                if (!date) {
                                    return <View key={index} style={styles.dateCell} />;
                                }
                                const isToday = formatDate(date) === formatDate(today);
                                const isSelected =
                                    selectedDateValue && formatDate(date) === selectedDateValue;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.dateCell,
                                            isToday && styles.todayCell,
                                            isSelected && styles.selectedDateCell,
                                        ]}
                                        onPress={() => handleEnrollmentDateSelect(date, type)}
                                    >
                                        <Text
                                            style={[
                                                styles.dateCellText,
                                                isSelected && styles.selectedDateText,
                                            ]}
                                        >
                                            {date.getDate()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <View style={styles.datePickerActions}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (type === 'start') setStartDate('');
                                    else setEndDate('');
                                    onClose();
                                }}
                            >
                                <Text style={styles.datePickerActionText}>Clear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    handleEnrollmentDateSelect(today, type);
                                }}
                            >
                                <Text style={styles.datePickerActionText}>Today</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    const handleAddEnrollment = () => {
        if (!companyId || !season) {
            Alert.alert('Context missing', 'Company or season is not loaded yet.');
            return;
        }
        if (!selectedChildId || !sportName) {
            Alert.alert('Validation', 'Please select camper and sport.');
            return;
        }

        const payload = {
            child_id: selectedChildId,
            sport_name: sportName,
            instructor,
            schedule_periods: schedulePeriod ? [schedulePeriod] : [],
            start_date: startDate || null,
            end_date: endDate || null,
            notes,
            company_id: companyId,
            season,
        };

        const onSuccess = () => {
            // Reset form
            setSelectedChildId('');
            setSportName('');
            setInstructor('');
            setSchedulePeriod('');
            setStartDate('');
            setEndDate('');
            setNotes('');
            setEditingEnrollment(null);
            setShowAddEnrollmentModal(false);
        };

        const onError = (error: any) => {
            Alert.alert('Error', error?.message || (editingEnrollment ? 'Failed to update enrollment' : 'Failed to add enrollment'));
        };

        if (editingEnrollment?.id) {
            updateEnrollmentMutation.mutate({
                id: editingEnrollment.id,
                updates: payload,
            }, {
                onSuccess,
                onError,
            });
            return;
        }

        addEnrollmentMutation.mutate(payload, {
            onSuccess: () => {
                onSuccess();
            },
            onError,
        });
    };

    const handleCloseAddEnrollmentModal = () => {
        setSelectedChildId('');
        setSportName('');
        setInstructor('');
        setSchedulePeriod('');
        setStartDate('');
        setEndDate('');
        setNotes('');
        setEditingEnrollment(null);
        setShowAddEnrollmentModal(false);
    };

    const handleEditEnrollment = (enroll: any) => {
        setEditingEnrollment(enroll);
        setSelectedChildId(enroll.child_id || '');
        setSportName(enroll.sport_name || '');
        setInstructor(enroll.instructor || '');
        const periods = Array.isArray(enroll.schedule_periods) ? enroll.schedule_periods : [];
        setSchedulePeriod(periods[0] || '');
        setStartDate(enroll.start_date || '');
        setEndDate(enroll.end_date || '');
        setNotes(enroll.notes || '');
        setShowAddEnrollmentModal(true);
    };

    const handleDeleteEnrollment = (enrollmentId: string) => {
        if (!enrollmentId) {
            Alert.alert('Error', 'Cannot delete: missing enrollment id');
            return;
        }
        setItemToDelete({ id: enrollmentId });
        setIsDeleteConfirmVisible(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete?.id) return;
        setIsDeleting(true);
        try {
            console.log('[DELETE] Starting delete for:', itemToDelete.id);
            const { error, status } = await supabase
                .from('sports_academy')
                .delete()
                .eq('id', itemToDelete.id);
            console.log('[DELETE] Response:', { error, status });
            if (error) {
                Alert.alert('Delete failed', error.message);
            } else {
                queryClient.invalidateQueries({ queryKey: ['sports_enrollments'] });
                Alert.alert('Success', 'Item deleted');
            }
        } finally {
            setIsDeleting(false);
            setIsDeleteConfirmVisible(false);
            setItemToDelete(null);
        }
    };

    const renderCalendarView = () => {
        const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

        const todaysEnrollments = filteredEnrollments.filter(e => {
            if (!selectedDateStr) return false;
            if (e.start_date && e.end_date) {
                return selectedDateStr >= e.start_date.split('T')[0] && selectedDateStr <= e.end_date.split('T')[0];
            }
            if (e.start_date) {
                return e.start_date.split('T')[0] === selectedDateStr;
            }
            return false;
        });

        return (
            <View style={styles.calendarViewContainer}>
                <StyledCard style={styles.scheduleCard}>
                    <Text style={styles.scheduleDate}>{formatDateLong(selectedDate)}</Text>
                    {todaysEnrollments.length === 0 ? (
                        <Text style={styles.scheduleEmptyText}>
                            No activities scheduled for this date
                        </Text>
                    ) : (
                        todaysEnrollments.map(enroll => (
                            <View key={enroll.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                                <Text style={{ ...theme.typography.body, fontWeight: '600' }}>{enroll.sport_name}</Text>
                                <Text style={{ ...theme.typography.bodySmall, color: theme.colors.textSecondary }}>
                                    {enroll.children?.name} • {enroll.instructor || 'No Instructor'}
                                </Text>
                            </View>
                        ))
                    )}
                </StyledCard>

                <UnifiedCalendar
                    events={calendarWidgetEvents}
                    currentDate={currentDate}
                    onCurrentDateChange={setCurrentDate}
                    selectedDate={selectedDate}
                    onSelectedDateChange={setSelectedDate}
                    onEventPress={(evt) => {
                        const enrollId = evt.id.split('__')[0];
                        const enroll = filteredEnrollments.find(e => e.id === enrollId);
                        if (enroll) handleEditEnrollment(enroll);
                    }}
                    views={['Month', 'Week', 'Day', 'Agenda']}
                    showZoom
                    showNavigation
                />
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <View style={styles.titleRow}>
                            <Ionicons
                                name="trophy-outline"
                                size={24}
                                color={theme.colors.primary}
                                style={styles.titleIcon}
                            />
                            <Text style={styles.headerTitle}>Sports Academy</Text>
                        </View>
                        <Text style={styles.headerSubtitle}>
                            Manage camper sports academy enrollments
                        </Text>
                    </View>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Action Buttons - First Row */}
                <View style={styles.actionButtonsRow}>
                    <View style={styles.viewModeButtons}>
                        <TouchableOpacity
                            style={[
                                styles.viewModeButton,
                                viewMode === 'list' && styles.viewModeButtonActive,
                            ]}
                            onPress={() => {
                                setViewMode('list');
                                setShowCalendarView(false);
                            }}
                        >
                            <Ionicons
                                name="list-outline"
                                size={20}
                                color={viewMode === 'list' ? theme.colors.surface : theme.colors.text}
                            />
                            <Text
                                style={[
                                    styles.viewModeButtonText,
                                    viewMode === 'list' && styles.viewModeButtonTextActive,
                                ]}
                            >
                                List
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.viewModeButton,
                                viewMode === 'calendar' && styles.viewModeButtonActive,
                            ]}
                            onPress={() => {
                                setViewMode('calendar');
                                setShowCalendarView(true);
                            }}
                        >
                            <Ionicons
                                name="calendar-outline"
                                size={20}
                                color={
                                    viewMode === 'calendar'
                                        ? theme.colors.surface
                                        : theme.colors.text
                                }
                            />
                            <Text
                                style={[
                                    styles.viewModeButtonText,
                                    viewMode === 'calendar' && styles.viewModeButtonTextActive,
                                ]}
                            >
                                Calendar
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.helpButton} onPress={() => setShowHelpModal(true)}>
                        <Ionicons name="help-circle-outline" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.uploadButton, sportsCsvUploading && { opacity: 0.65 }]}
                        disabled={sportsCsvUploading}
                        onPress={async () => {
                            if (!companyId || !season) {
                                Alert.alert('Missing context', 'Company or season is not available yet.');
                                return;
                            }
                            const picked = await pickAndReadCsvText();
                            if (!picked.ok) {
                                if (picked.error === 'canceled') return;
                                Alert.alert('CSV', picked.message || 'Could not read file.');
                                return;
                            }
                            setSportsCsvUploading(true);
                            try {
                                const result = await uploadCsvFromText('sports_academy', picked.text, { companyId, season });
                                if (result.ok) {
                                    await queryClient.invalidateQueries({ queryKey: ['sports_enrollments'] });
                                    Alert.alert('Success', result.message);
                                } else {
                                    Alert.alert('Upload failed', result.error);
                                }
                            } finally {
                                setSportsCsvUploading(false);
                            }
                        }}
                    >
                        <Ionicons name="arrow-up-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.uploadButtonText}>{sportsCsvUploading ? 'Uploading…' : 'Upload CSV'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Action Buttons - Second Row */}
                <View style={styles.actionButtonsRowSecond}>
                    <TouchableOpacity
                        style={styles.addEnrollmentButton}
                        onPress={() => setShowAddEnrollmentModal(true)}
                    >
                        <Ionicons name="add" size={20} color={theme.colors.surface} />
                        <Text style={styles.addEnrollmentButtonText}>Add Enrollment</Text>
                    </TouchableOpacity>
                </View>

                {/* Search and Filters */}
                <View style={styles.searchFilterSection}>
                    <View style={styles.searchContainer}>
                        <Ionicons
                            name="search-outline"
                            size={20}
                            color={theme.colors.textSecondary}
                            style={styles.searchIcon}
                        />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by camper, sport, instructor..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <View style={styles.filtersRow}>
                        {/* Division Filter */}
                        <View style={styles.filterItem}>
                            <TouchableOpacity
                                style={[styles.filterDropdown, styles.filterDropdownTouchable]}
                                onPress={() => {
                                    setShowDivisionDropdown(!showDivisionDropdown);
                                    setShowGenderDropdown(false);
                                    setShowSportDropdown(false);
                                }}
                            >
                                <Text style={styles.filterDropdownText}>{selectedDivision === 'All Divisions' ? 'All Divisions' : divisionsData.find(d => d.id === selectedDivision)?.name || 'Select Division'}</Text>
                                <Ionicons
                                    name="chevron-down"
                                    size={16}
                                    color={theme.colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Gender Filter */}
                        <View style={styles.filterItem}>
                            <TouchableOpacity
                                style={[styles.filterDropdown, styles.filterDropdownTouchable]}
                                onPress={() => {
                                    setShowGenderDropdown(!showGenderDropdown);
                                    setShowDivisionDropdown(false);
                                    setShowSportDropdown(false);
                                }}
                            >
                                <Text style={styles.filterDropdownText}>{selectedGender}</Text>
                                <Ionicons
                                    name="chevron-down"
                                    size={16}
                                    color={theme.colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Sport Filter */}
                        <View style={styles.filterItem}>
                            <TouchableOpacity
                                style={[styles.filterDropdown, styles.filterDropdownTouchable]}
                                onPress={() => {
                                    setShowSportDropdown(!showSportDropdown);
                                    setShowDivisionDropdown(false);
                                    setShowGenderDropdown(false);
                                }}
                            >
                                <Text style={styles.filterDropdownText}>{selectedSport}</Text>
                                <Ionicons
                                    name="chevron-down"
                                    size={16}
                                    color={theme.colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Calendar View */}
                {viewMode === 'calendar' && showCalendarView && (
                    <View style={styles.calendarViewWrapper}>
                        {renderCalendarView()}
                    </View>
                )}

                {/* List View / Empty State */}
                {viewMode === 'list' && (
                    <View style={styles.listContainer}>
                        {filteredEnrollments.length === 0 ? (
                            <View style={styles.emptyStateContainer}>
                                <StyledCard style={styles.emptyStateCard}>
                                    <Text style={styles.emptyStateText}>
                                        No sports academy enrollments found
                                    </Text>
                                </StyledCard>
                            </View>
                        ) : (
                            filteredEnrollments.map(enroll => (
                                <StyledCard key={enroll.id} style={{ padding: theme.spacing.md, marginBottom: theme.spacing.md }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                                        <Text style={{ ...theme.typography.h3 }}>{enroll.children?.name || 'Unknown Camper'}</Text>
                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                            <TouchableOpacity onPress={() => handleEditEnrollment(enroll)}>
                                                <Ionicons name="pencil-outline" size={20} color={theme.colors.text} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => {
                                                if (enroll.id) handleDeleteEnrollment(enroll.id);
                                            }}>
                                                <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <View style={{ gap: 4 }}>
                                        <Text style={{ ...theme.typography.body }}>Sport: <Text style={{ fontWeight: '600' }}>{enroll.sport_name}</Text></Text>
                                        <Text style={{ ...theme.typography.bodySmall, color: theme.colors.textSecondary }}>Instructor: {enroll.instructor || 'N/A'}</Text>
                                        <Text style={{ ...theme.typography.bodySmall, color: theme.colors.textSecondary }}>Period: {enroll.schedule_periods?.join(', ') || 'N/A'}</Text>
                                        <Text style={{ ...theme.typography.bodySmall, color: theme.colors.textSecondary }}>Dates: {enroll.start_date || 'N/A'} to {enroll.end_date || 'N/A'}</Text>
                                    </View>
                                </StyledCard>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Filter Dropdown Modals - Top Layer */}
            {showDivisionDropdown && (
                <Modal
                    visible={showDivisionDropdown}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowDivisionDropdown(false)}
                >
                    <View style={styles.filterModalRoot}>
                        <Pressable
                            style={styles.filterModalBackdrop}
                            onPress={() => setShowDivisionDropdown(false)}
                            accessibilityLabel="Dismiss"
                        />
                        <View style={styles.filterDropdownMenuModal}>
                            <View style={styles.filterDropdownHeader}>
                                <Text style={styles.filterDropdownTitle}>Select Division</Text>
                                <TouchableOpacity
                                    onPress={() => setShowDivisionDropdown(false)}
                                    style={styles.closeButton}
                                >
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={[{ id: 'All Divisions', name: 'All Divisions' }, ...divisionsData]}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.filterDropdownItem,
                                            selectedDivision === item.id &&
                                                styles.filterDropdownItemSelected,
                                        ]}
                                        onPress={() => {
                                            setSelectedDivision(item.id);
                                            setShowDivisionDropdown(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.filterDropdownItemText,
                                                selectedDivision === item.id &&
                                                    styles.filterDropdownItemTextSelected,
                                            ]}
                                        >
                                            {item.name}
                                        </Text>
                                        {selectedDivision === item.id && (
                                            <Ionicons
                                                name="checkmark"
                                                size={20}
                                                color={theme.colors.secondary}
                                                style={styles.checkIcon}
                                            />
                                        )}
                                    </TouchableOpacity>
                                )}
                                nestedScrollEnabled={true}
                            />
                        </View>
                    </View>
                </Modal>
            )}

            {showGenderDropdown && (
                <Modal
                    visible={showGenderDropdown}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowGenderDropdown(false)}
                >
                    <View style={styles.filterModalRoot}>
                        <Pressable
                            style={styles.filterModalBackdrop}
                            onPress={() => setShowGenderDropdown(false)}
                            accessibilityLabel="Dismiss"
                        />
                        <View style={styles.filterDropdownMenuModal}>
                            <View style={styles.filterDropdownHeader}>
                                <Text style={styles.filterDropdownTitle}>Select Gender</Text>
                                <TouchableOpacity
                                    onPress={() => setShowGenderDropdown(false)}
                                    style={styles.closeButton}
                                >
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={GENDERS}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.filterDropdownItem,
                                            selectedGender === item && styles.filterDropdownItemSelected,
                                        ]}
                                        onPress={() => {
                                            setSelectedGender(item);
                                            setShowGenderDropdown(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.filterDropdownItemText,
                                                selectedGender === item &&
                                                    styles.filterDropdownItemTextSelected,
                                            ]}
                                        >
                                            {item}
                                        </Text>
                                        {selectedGender === item && (
                                            <Ionicons
                                                name="checkmark"
                                                size={20}
                                                color={theme.colors.secondary}
                                                style={styles.checkIcon}
                                            />
                                        )}
                                    </TouchableOpacity>
                                )}
                                nestedScrollEnabled={true}
                            />
                        </View>
                    </View>
                </Modal>
            )}

            {showSportDropdown && (
                <Modal
                    visible={showSportDropdown}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowSportDropdown(false)}
                >
                    <View style={styles.filterModalRoot}>
                        <Pressable
                            style={styles.filterModalBackdrop}
                            onPress={() => setShowSportDropdown(false)}
                            accessibilityLabel="Dismiss"
                        />
                        <View style={styles.filterDropdownMenuModal}>
                            <View style={styles.filterDropdownHeader}>
                                <Text style={styles.filterDropdownTitle}>Select Sport</Text>
                                <TouchableOpacity
                                    onPress={() => setShowSportDropdown(false)}
                                    style={styles.closeButton}
                                >
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={sportFilterOptions}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.filterDropdownItem,
                                            selectedSport === item && styles.filterDropdownItemSelected,
                                        ]}
                                        onPress={() => {
                                            setSelectedSport(item);
                                            setShowSportDropdown(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.filterDropdownItemText,
                                                selectedSport === item &&
                                                    styles.filterDropdownItemTextSelected,
                                            ]}
                                        >
                                            {item}
                                        </Text>
                                        {selectedSport === item && (
                                            <Ionicons
                                                name="checkmark"
                                                size={20}
                                                color={theme.colors.secondary}
                                                style={styles.checkIcon}
                                            />
                                        )}
                                    </TouchableOpacity>
                                )}
                                nestedScrollEnabled={true}
                            />
                        </View>
                    </View>
                </Modal>
            )}

            {/* Add Enrollment Modal */}
            <Modal
                visible={showAddEnrollmentModal}
                transparent
                animationType="slide"
                onRequestClose={handleCloseAddEnrollmentModal}
            >
                <View style={{ flex: 1 }}>
                <View style={styles.centeredModalOverlay}>
                    <View style={styles.addEnrollmentModalContainer}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingEnrollment ? 'Edit Enrollment' : 'Add Enrollment'}</Text>
                            <TouchableOpacity
                                onPress={handleCloseAddEnrollmentModal}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalContent}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={true}
                            keyboardShouldPersistTaps="always"
                        >
                            {/* Camper */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>
                                    Camper <Text style={styles.required}>*</Text>
                                </Text>
                                <TouchableOpacity
                                    style={styles.sportNameDropdown}
                                    onPress={() => setShowCamperDropdown(true)}
                                >
                                    <Text
                                        style={[
                                            styles.sportNameDropdownText,
                                            !selectedChildId && styles.placeholder,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {campersData.find(c => c.id === selectedChildId)?.name || 'Select camper'}
                                    </Text>
                                    <Ionicons
                                        name="chevron-down"
                                        size={20}
                                        color={theme.colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Sport Name */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>
                                    Sport Name <Text style={styles.required}>*</Text>
                                </Text>
                                <TouchableOpacity
                                    style={styles.sportNameDropdown}
                                    onPress={() => setShowSportNameDropdown(true)}
                                >
                                    <Text
                                        style={[
                                            styles.sportNameDropdownText,
                                            !sportName && styles.placeholder,
                                        ]}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        {sportName || 'Select sport'}
                                    </Text>
                                    <Ionicons
                                        name="chevron-down"
                                        size={20}
                                        color={theme.colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Instructor */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Instructor</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Instructor name"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={instructor}
                                    onChangeText={setInstructor}
                                />
                            </View>

                            {/* Schedule Periods */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Schedule Periods</Text>
                                <View style={styles.schedulePeriodsContainer}>
                                    {SCHEDULE_PERIODS.map((period) => (
                                        <TouchableOpacity
                                            key={period}
                                            style={styles.radioButtonContainer}
                                            onPress={() =>
                                                setSchedulePeriod(
                                                    schedulePeriod === period ? '' : period
                                                )
                                            }
                                        >
                                            <View
                                                style={[
                                                    styles.radioButton,
                                                    schedulePeriod === period &&
                                                    styles.radioButtonSelected,
                                                ]}
                                            >
                                                {schedulePeriod === period && (
                                                    <View style={styles.radioButtonInner} />
                                                )}
                                            </View>
                                            <Text style={styles.radioButtonLabel}>{period}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Start Date and End Date */}
                            <View style={styles.dateRow}>
                                <View style={styles.dateField}>
                                    <Text style={styles.label}>Start Date</Text>
                                    <TouchableOpacity
                                        style={styles.dateInput}
                                        onPress={() => setShowStartDatePicker(true)}
                                    >
                                        <Text
                                            style={[
                                                styles.dateInputText,
                                                !startDate && styles.placeholder,
                                            ]}
                                        >
                                            {startDate || 'mm/dd/yyyy'}
                                        </Text>
                                        <Ionicons
                                            name="calendar-outline"
                                            size={20}
                                            color={theme.colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.dateField}>
                                    <Text style={styles.label}>End Date</Text>
                                    <TouchableOpacity
                                        style={styles.dateInput}
                                        onPress={() => setShowEndDatePicker(true)}
                                    >
                                        <Text
                                            style={[
                                                styles.dateInputText,
                                                !endDate && styles.placeholder,
                                            ]}
                                        >
                                            {endDate || 'mm/dd/yyyy'}
                                        </Text>
                                        <Ionicons
                                            name="calendar-outline"
                                            size={20}
                                            color={theme.colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Notes */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Notes</Text>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Additional notes about the enrollment"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={notes}
                                    onChangeText={setNotes}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>
                        </ScrollView>

                        {/* Modal Footer */}
                        <View style={styles.centeredModalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleCloseAddEnrollmentModal}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    (!selectedChildId || !sportName) && styles.submitButtonDisabled,
                                ]}
                                onPress={handleAddEnrollment}
                                disabled={!selectedChildId || !sportName}
                            >
                                <Text style={styles.submitButtonText}>{editingEnrollment ? 'Update Enrollment' : 'Add Enrollment'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
                {renderEnrollmentDatePicker(
                    'start',
                    showStartDatePicker,
                    () => setShowStartDatePicker(false)
                )}
                {renderEnrollmentDatePicker(
                    'end',
                    showEndDatePicker,
                    () => setShowEndDatePicker(false)
                )}
                {showCamperDropdown ? (
                    <View
                        style={[StyleSheet.absoluteFillObject, { zIndex: 10000, elevation: 10000 }]}
                        pointerEvents="box-none"
                    >
                        <View style={styles.filterModalRoot}>
                            <Pressable
                                style={styles.filterModalBackdrop}
                                onPress={() => setShowCamperDropdown(false)}
                                accessibilityLabel="Dismiss"
                            />
                            <View style={styles.filterDropdownMenuModal}>
                                <View style={styles.filterDropdownHeader}>
                                    <Text style={styles.filterDropdownTitle}>Select Camper</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowCamperDropdown(false)}
                                        style={styles.closeButton}
                                    >
                                        <Ionicons name="close" size={24} color={theme.colors.text} />
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={campersData}
                                    keyExtractor={(item) => item.id || `camper-${item.name}`}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.filterDropdownItem,
                                                selectedChildId === item.id && styles.filterDropdownItemSelected,
                                            ]}
                                            onPress={() => {
                                                if (item.id) setSelectedChildId(item.id);
                                                setShowCamperDropdown(false);
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterDropdownItemText,
                                                    selectedChildId === item.id &&
                                                        styles.filterDropdownItemTextSelected,
                                                ]}
                                            >
                                                {item.name}
                                            </Text>
                                            {selectedChildId === item.id && (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={20}
                                                    color={theme.colors.secondary}
                                                    style={styles.checkIcon}
                                                />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                    nestedScrollEnabled
                                />
                            </View>
                        </View>
                    </View>
                ) : null}
                {showSportNameDropdown ? (
                    <View
                        style={[StyleSheet.absoluteFillObject, { zIndex: 10000, elevation: 10000 }]}
                        pointerEvents="box-none"
                    >
                        <View style={styles.filterModalRoot}>
                            <Pressable
                                style={styles.filterModalBackdrop}
                                onPress={() => setShowSportNameDropdown(false)}
                                accessibilityLabel="Dismiss"
                            />
                            <View style={styles.filterDropdownMenuModal}>
                                <View style={styles.filterDropdownHeader}>
                                    <Text style={styles.filterDropdownTitle}>Select Sport</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowSportNameDropdown(false)}
                                        style={styles.closeButton}
                                    >
                                        <Ionicons name="close" size={24} color={theme.colors.text} />
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={ENROLLMENT_SPORTS}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.filterDropdownItem,
                                                sportName === item && styles.filterDropdownItemSelected,
                                            ]}
                                            onPress={() => {
                                                setSportName(item);
                                                setShowSportNameDropdown(false);
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterDropdownItemText,
                                                    sportName === item && styles.filterDropdownItemTextSelected,
                                                ]}
                                            >
                                                {item}
                                            </Text>
                                            {sportName === item && (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={20}
                                                    color={theme.colors.secondary}
                                                    style={styles.checkIcon}
                                                />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                    nestedScrollEnabled
                                />
                            </View>
                        </View>
                    </View>
                ) : null}
                </View>
            </Modal>

            {/* CSV Upload Help Modal */}
            <Modal
                visible={showHelpModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowHelpModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.helpModalContainer}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>CSV Upload Format Guide</Text>
                            <TouchableOpacity
                                onPress={() => setShowHelpModal(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Tabs - Horizontal Scrollable */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.tabScrollContainer}
                            contentContainerStyle={styles.tabScrollContent}
                        >
                            <TouchableOpacity
                                style={[styles.tabScrollable, activeHelpTab === 'Children' && styles.activeTabScrollable]}
                                onPress={() => setActiveHelpTab('Children')}
                            >
                                <Text style={[styles.tabText, activeHelpTab === 'Children' && styles.activeTabText]}>
                                    Children
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabScrollable, activeHelpTab === 'Staff' && styles.activeTabScrollable]}
                                onPress={() => setActiveHelpTab('Staff')}
                            >
                                <Text style={[styles.tabText, activeHelpTab === 'Staff' && styles.activeTabText]}>
                                    Staff
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabScrollable, activeHelpTab === 'Medications' && styles.activeTabScrollable]}
                                onPress={() => setActiveHelpTab('Medications')}
                            >
                                <Text style={[styles.tabText, activeHelpTab === 'Medications' && styles.activeTabText]}>
                                    Medications
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabScrollable, activeHelpTab === 'Trips' && styles.activeTabScrollable]}
                                onPress={() => setActiveHelpTab('Trips')}
                            >
                                <Text style={[styles.tabText, activeHelpTab === 'Trips' && styles.activeTabText]}>
                                    Trips
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabScrollable, activeHelpTab === 'Menus' && styles.activeTabScrollable]}
                                onPress={() => setActiveHelpTab('Menus')}
                            >
                                <Text style={[styles.tabText, activeHelpTab === 'Menus' && styles.activeTabText]}>
                                    Menus
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabScrollable, activeHelpTab === 'Awards' && styles.activeTabScrollable]}
                                onPress={() => setActiveHelpTab('Awards')}
                            >
                                <Text style={[styles.tabText, activeHelpTab === 'Awards' && styles.activeTabText]}>
                                    Awards
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabScrollable, activeHelpTab === 'Daily Notes' && styles.activeTabScrollable]}
                                onPress={() => setActiveHelpTab('Daily Notes')}
                            >
                                <Text style={[styles.tabText, activeHelpTab === 'Daily Notes' && styles.activeTabText]}>
                                    Daily Notes
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabScrollable, activeHelpTab === 'Incidents' && styles.activeTabScrollable]}
                                onPress={() => setActiveHelpTab('Incidents')}
                            >
                                <Text style={[styles.tabText, activeHelpTab === 'Incidents' && styles.activeTabText]}>
                                    Incidents
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabScrollable, activeHelpTab === 'Calendar' && styles.activeTabScrollable]}
                                onPress={() => setActiveHelpTab('Calendar')}
                            >
                                <Text style={[styles.tabText, activeHelpTab === 'Calendar' && styles.activeTabText]}>
                                    Calendar
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabScrollable, activeHelpTab === 'Sports' && styles.activeTabScrollable]}
                                onPress={() => setActiveHelpTab('Sports')}
                            >
                                <Text style={[styles.tabText, activeHelpTab === 'Sports' && styles.activeTabText]}>
                                    Sports
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>

                        <ScrollView style={styles.helpModalContent}>
                            {activeHelpTab === 'Children' && (
                                <>
                                    <Text style={styles.helpSectionTitle}>Children Directory</Text>
                                    <Text style={styles.helpSectionSubtitle}>
                                        CSV format for children/camper directory upload
                                    </Text>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Required Columns (first row):</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                first_name, last_name, dob, grade, division, parentEmail, emergencyContact, medicalInfo
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Example Data Row:</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                John, Doe, 2015-07-20, 4th, Junior Boys, parent@example.com, 555-0123, Peanuts, None
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Important Notes:</Text>
                                        <View style={styles.noteBoxBlue}>
                                            <Text style={styles.noteTextBlue}>
                                                dob format: YYYY-MM-DD
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>General Tips:</Text>
                                        <View style={styles.tipBox}>
                                            <Text style={styles.tipText}>• First row must have column headers exactly as shown</Text>
                                            <Text style={styles.tipText}>• Use commas to separate values</Text>
                                            <Text style={styles.tipText}>• Use "double quotes" for text containing commas (e.g. "Smith, Jr.")</Text>
                                            <Text style={styles.tipText}>• Leave fields empty for optional columns</Text>
                                            <Text style={styles.tipText}>• Maximum 1000 rows per upload</Text>
                                            <Text style={styles.tipText}>• UTF-8 encoding recommended</Text>
                                            <Text style={styles.tipText}>• JUUIDs can be obtained from the backend for existing records</Text>
                                        </View>
                                    </View>
                                </>
                            )}

                            {activeHelpTab === 'Staff' && (
                                <>
                                    <Text style={styles.helpSectionTitle}>Staff Directory</Text>
                                    <Text style={styles.helpSectionSubtitle}>
                                        CSV format for staff directory upload
                                    </Text>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Required Columns (first row):</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                _new, email, phone, role, department, hire_date, leader_id, status, exacti
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Example Data Row:</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                Jane Smith, jane@camp.com, 555-0124, Counselor, Activities, 2024-06-15, leader-14, active, Summer 2024
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Important Notes:</Text>
                                        <View style={styles.noteBoxBlue}>
                                            <Text style={styles.noteTextBlue}>
                                                leader_id must be a valid UUID from staff table. hire_date format: YYYY-MM-DD
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>General Tips:</Text>
                                        <View style={styles.tipBox}>
                                            <Text style={styles.tipText}>• First row must have column headers exactly as shown</Text>
                                            <Text style={styles.tipText}>• Use commas to separate values</Text>
                                            <Text style={styles.tipText}>• Use "double quotes" for text containing commas (e.g. "item 1")</Text>
                                            <Text style={styles.tipText}>• Leave fields empty for optional columns</Text>
                                            <Text style={styles.tipText}>• Maximum 1000 rows per upload</Text>
                                            <Text style={styles.tipText}>• UTF-8 encoding recommended</Text>
                                            <Text style={styles.tipText}>• JUUIDs can be obtained from the backend for existing records</Text>
                                        </View>
                                    </View>
                                </>
                            )}

                            {activeHelpTab === 'Medications' && (
                                <>
                                    <Text style={styles.helpSectionTitle}>Medications</Text>
                                    <Text style={styles.helpSectionSubtitle}>
                                        CSV format for medication records upload
                                    </Text>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Required Columns (first row):</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                camper_name, medication_name, dosage, frequency, prescribing_doctor, notes
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Example Data Row:</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                John Doe, Advil, 200mg, Twice daily, Dr. Johnson, Take with food
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Important Notes:</Text>
                                        <View style={styles.noteBoxBlue}>
                                            <Text style={styles.noteTextBlue}>
                                                camper_name must match existing camper records
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>General Tips:</Text>
                                        <View style={styles.tipBox}>
                                            <Text style={styles.tipText}>• First row must have column headers exactly as shown</Text>
                                            <Text style={styles.tipText}>• Use commas to separate values</Text>
                                            <Text style={styles.tipText}>• Use "double quotes" for text containing commas</Text>
                                            <Text style={styles.tipText}>• Leave fields empty for optional columns</Text>
                                            <Text style={styles.tipText}>• Maximum 1000 rows per upload</Text>
                                            <Text style={styles.tipText}>• UTF-8 encoding recommended</Text>
                                            <Text style={styles.tipText}>• JUUIDs can be obtained from the backend for existing records</Text>
                                        </View>
                                    </View>
                                </>
                            )}

                            {activeHelpTab === 'Trips' && (
                                <>
                                    <Text style={styles.helpSectionTitle}>Trips</Text>
                                    <Text style={styles.helpSectionSubtitle}>
                                        CSV format for field trips/activities upload
                                    </Text>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Required Columns (first row):</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                trip_name, trip_type, start_date, end_date, departure_time, return_time, notes
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Example Data Row:</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                Museum Visit, Field Trip, 2026-07-15, 2026-07-15, 09:00, 15:00, Bring packed lunch
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Important Notes:</Text>
                                        <View style={styles.noteBoxBlue}>
                                            <Text style={styles.noteTextBlue}>
                                                Date format: YYYY-MM-DD. Time format: HH:MM
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>General Tips:</Text>
                                        <View style={styles.tipBox}>
                                            <Text style={styles.tipText}>• First row must have column headers exactly as shown</Text>
                                            <Text style={styles.tipText}>• Use commas to separate values</Text>
                                            <Text style={styles.tipText}>• Use "double quotes" for text containing commas</Text>
                                            <Text style={styles.tipText}>• Leave fields empty for optional columns</Text>
                                            <Text style={styles.tipText}>• Maximum 1000 rows per upload</Text>
                                            <Text style={styles.tipText}>• UTF-8 encoding recommended</Text>
                                            <Text style={styles.tipText}>• JUUIDs can be obtained from the backend for existing records</Text>
                                        </View>
                                    </View>
                                </>
                            )}

                            {activeHelpTab === 'Menus' && (
                                <>
                                    <Text style={styles.helpSectionTitle}>Menus</Text>
                                    <Text style={styles.helpSectionSubtitle}>
                                        CSV format for menu/meals upload
                                    </Text>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Required Columns (first row):</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                date, meal_type, menu_items, dietary_notes
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Example Data Row:</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                2026-07-20, Lunch, Pizza | Salad | Fruit, Vegetarian options available
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Important Notes:</Text>
                                        <View style={styles.noteBoxBlue}>
                                            <Text style={styles.noteTextBlue}>
                                                Date format: YYYY-MM-DD. Use | (pipe) to separate multiple menu items
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>General Tips:</Text>
                                        <View style={styles.tipBox}>
                                            <Text style={styles.tipText}>• First row must have column headers exactly as shown</Text>
                                            <Text style={styles.tipText}>• Use commas to separate values</Text>
                                            <Text style={styles.tipText}>• Use "double quotes" for text containing commas</Text>
                                            <Text style={styles.tipText}>• Leave fields empty for optional columns</Text>
                                            <Text style={styles.tipText}>• Maximum 1000 rows per upload</Text>
                                            <Text style={styles.tipText}>• UTF-8 encoding recommended</Text>
                                            <Text style={styles.tipText}>• JUUIDs can be obtained from the backend for existing records</Text>
                                        </View>
                                    </View>
                                </>
                            )}

                            {activeHelpTab === 'Awards' && (
                                <>
                                    <Text style={styles.helpSectionTitle}>Awards</Text>
                                    <Text style={styles.helpSectionSubtitle}>
                                        CSV format for camper awards upload
                                    </Text>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Required Columns (first row):</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                camper_name, award_name, award_type, date_awarded, notes
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Example Data Row:</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                John Doe, Best Swimmer, Sports, 2026-07-25, Outstanding performance
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Important Notes:</Text>
                                        <View style={styles.noteBoxBlue}>
                                            <Text style={styles.noteTextBlue}>
                                                camper_name must match existing records. date_awarded format: YYYY-MM-DD
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>General Tips:</Text>
                                        <View style={styles.tipBox}>
                                            <Text style={styles.tipText}>• First row must have column headers exactly as shown</Text>
                                            <Text style={styles.tipText}>• Use commas to separate values</Text>
                                            <Text style={styles.tipText}>• Use "double quotes" for text containing commas</Text>
                                            <Text style={styles.tipText}>• Leave fields empty for optional columns</Text>
                                            <Text style={styles.tipText}>• Maximum 1000 rows per upload</Text>
                                            <Text style={styles.tipText}>• UTF-8 encoding recommended</Text>
                                            <Text style={styles.tipText}>• JUUIDs can be obtained from the backend for existing records</Text>
                                        </View>
                                    </View>
                                </>
                            )}

                            {activeHelpTab === 'Daily Notes' && (
                                <>
                                    <Text style={styles.helpSectionTitle}>Daily Notes</Text>
                                    <Text style={styles.helpSectionSubtitle}>
                                        CSV format for daily camper notes upload
                                    </Text>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Required Columns (first row):</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                camper_name, date, note_type, note_content, staff_name
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Example Data Row:</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                John Doe, 2026-07-15, Behavior, Great participation today, Jane Smith
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Important Notes:</Text>
                                        <View style={styles.noteBoxBlue}>
                                            <Text style={styles.noteTextBlue}>
                                                date format: YYYY-MM-DD. staff_name must match existing staff records
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>General Tips:</Text>
                                        <View style={styles.tipBox}>
                                            <Text style={styles.tipText}>• First row must have column headers exactly as shown</Text>
                                            <Text style={styles.tipText}>• Use commas to separate values</Text>
                                            <Text style={styles.tipText}>• Use "double quotes" for text containing commas</Text>
                                            <Text style={styles.tipText}>• Leave fields empty for optional columns</Text>
                                            <Text style={styles.tipText}>• Maximum 1000 rows per upload</Text>
                                            <Text style={styles.tipText}>• UTF-8 encoding recommended</Text>
                                            <Text style={styles.tipText}>• JUUIDs can be obtained from the backend for existing records</Text>
                                        </View>
                                    </View>
                                </>
                            )}

                            {activeHelpTab === 'Incidents' && (
                                <>
                                    <Text style={styles.helpSectionTitle}>Incidents</Text>
                                    <Text style={styles.helpSectionSubtitle}>
                                        CSV format for incident reports upload
                                    </Text>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Required Columns (first row):</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                camper_name, incident_date, incident_type, description, action_taken, reported_by
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Example Data Row:</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                John Doe, 2026-07-15, Minor Injury, Scraped knee during sports, First aid applied, Nurse Kelly
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Important Notes:</Text>
                                        <View style={styles.noteBoxBlue}>
                                            <Text style={styles.noteTextBlue}>
                                                incident_date format: YYYY-MM-DD. All incidents must be documented
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>General Tips:</Text>
                                        <View style={styles.tipBox}>
                                            <Text style={styles.tipText}>• First row must have column headers exactly as shown</Text>
                                            <Text style={styles.tipText}>• Use commas to separate values</Text>
                                            <Text style={styles.tipText}>• Use "double quotes" for text containing commas</Text>
                                            <Text style={styles.tipText}>• Leave fields empty for optional columns</Text>
                                            <Text style={styles.tipText}>• Maximum 1000 rows per upload</Text>
                                            <Text style={styles.tipText}>• UTF-8 encoding recommended</Text>
                                            <Text style={styles.tipText}>• JUUIDs can be obtained from the backend for existing records</Text>
                                        </View>
                                    </View>
                                </>
                            )}

                            {activeHelpTab === 'Calendar' && (
                                <>
                                    <Text style={styles.helpSectionTitle}>Calendar</Text>
                                    <Text style={styles.helpSectionSubtitle}>
                                        CSV format for calendar events upload
                                    </Text>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Required Columns (first row):</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                event_name, event_type, start_date, end_date, start_time, end_time, location, notes
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Example Data Row:</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                Campfire Night, Activity, 2026-07-20, 2026-07-20, 19:00, 21:00, Main Field, Bring blankets
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Important Notes:</Text>
                                        <View style={styles.noteBoxBlue}>
                                            <Text style={styles.noteTextBlue}>
                                                Date format: YYYY-MM-DD. Time format: HH:MM (24-hour)
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>General Tips:</Text>
                                        <View style={styles.tipBox}>
                                            <Text style={styles.tipText}>• First row must have column headers exactly as shown</Text>
                                            <Text style={styles.tipText}>• Use commas to separate values</Text>
                                            <Text style={styles.tipText}>• Use "double quotes" for text containing commas</Text>
                                            <Text style={styles.tipText}>• Leave fields empty for optional columns</Text>
                                            <Text style={styles.tipText}>• Maximum 1000 rows per upload</Text>
                                            <Text style={styles.tipText}>• UTF-8 encoding recommended</Text>
                                            <Text style={styles.tipText}>• JUUIDs can be obtained from the backend for existing records</Text>
                                        </View>
                                    </View>
                                </>
                            )}

                            {activeHelpTab === 'Sports' && (
                                <>
                                    <Text style={styles.helpSectionTitle}>Sports</Text>
                                    <Text style={styles.helpSectionSubtitle}>
                                        CSV format for sports academy enrollments
                                    </Text>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Required Columns (first row):</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                camper_name, sport, instructor, schedule_period, start_date, end_date, notes
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Example Data Row:</Text>
                                        <View style={styles.codeBlock}>
                                            <Text style={styles.codeText}>
                                                John Doe, Basketball, Coach Johnson, Period 1, 2026-06-15, 2026-08-15, Advanced group
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>Important Notes:</Text>
                                        <View style={styles.noteBoxBlue}>
                                            <Text style={styles.noteTextBlue}>
                                                camper_name must match existing camper. Date format: YYYY-MM-DD
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.helpSection}>
                                        <Text style={styles.helpLabel}>General Tips:</Text>
                                        <View style={styles.tipBox}>
                                            <Text style={styles.tipText}>• First row must have column headers exactly as shown</Text>
                                            <Text style={styles.tipText}>• Use commas to separate values</Text>
                                            <Text style={styles.tipText}>• Use "double quotes" for text containing commas</Text>
                                            <Text style={styles.tipText}>• Leave fields empty for optional columns</Text>
                                            <Text style={styles.tipText}>• Maximum 1000 rows per upload</Text>
                                            <Text style={styles.tipText}>• UTF-8 encoding recommended</Text>
                                            <Text style={styles.tipText}>• JUUIDs can be obtained from the backend for existing records</Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal visible={isDeleteConfirmVisible} transparent animationType="fade" onRequestClose={() => { setIsDeleteConfirmVisible(false); setItemToDelete(null); }}>
                <Pressable style={styles.deleteModalOverlay} onPress={() => { setIsDeleteConfirmVisible(false); setItemToDelete(null); }}>
                    <Pressable style={styles.deleteModalContent} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.deleteModalTitle}>Confirm Delete</Text>
                        <Text style={styles.deleteModalMessage}>Are you sure? This cannot be undone.</Text>
                        <View style={styles.deleteModalActions}>
                            <TouchableOpacity style={styles.deleteModalCancelBtn} onPress={() => { setIsDeleteConfirmVisible(false); setItemToDelete(null); }} disabled={isDeleting}>
                                <Text style={styles.deleteModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.deleteModalConfirmBtn, isDeleting && { opacity: 0.6 }]} onPress={handleConfirmDelete} disabled={isDeleting}>
                                {isDeleting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.deleteModalConfirmText}>Delete</Text>}
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
    scrollContent: {
        padding: theme.spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
    },
    headerContent: {
        flex: 1,
        marginHorizontal: theme.spacing.md,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
        gap: theme.spacing.sm,
    },
    titleIcon: {
        flexShrink: 0,
    },
    headerTitle: {
        ...theme.typography.h2,
        flex: 1,
    },
    headerSubtitle: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    actionButtonsRowSecond: {
        flexDirection: 'row',
        marginBottom: theme.spacing.lg,
    },
    viewModeButtons: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    viewModeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.xs,
    },
    viewModeButtonActive: {
        backgroundColor: theme.colors.secondary,
    },
    viewModeButtonText: {
        ...theme.typography.body,
        fontWeight: '600',
        color: theme.colors.text,
    },
    viewModeButtonTextActive: {
        color: theme.colors.surface,
    },
    listContainer: {
        marginTop: theme.spacing.lg,
    },
    rightActionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    helpButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: theme.spacing.xs,
    },
    uploadButtonText: {
        ...theme.typography.body,
        color: theme.colors.text,
    },
    addEnrollmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
        gap: theme.spacing.xs,
    },
    addEnrollmentButtonText: {
        ...theme.typography.body,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    searchFilterSection: {
        marginBottom: theme.spacing.lg,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        minHeight: 44,
        marginBottom: theme.spacing.md,
    },
    searchIcon: {
        marginRight: theme.spacing.xs,
    },
    searchInput: {
        flex: 1,
        ...theme.typography.body,
    },
    filtersRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    filterItem: {
        flex: 1,
    },
    filterDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        minHeight: 36,
    },
    /** Web: avoid thick focus ring on one control (dropdowns should look identical). */
    filterDropdownTouchable:
        Platform.OS === 'web'
            ? { outlineStyle: 'none' as const, outlineWidth: 0 as const }
            : {},
    filterDropdownText: {
        ...theme.typography.bodySmall,
        flex: 1,
    },
    filterModalRoot: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    filterModalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    filterDropdownMenuModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        width: '100%',
        maxWidth: 600,
        maxHeight: '60%',
        ...theme.shadows.card,
    },
    filterDropdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    filterDropdownTitle: {
        ...theme.typography.h3,
    },
    filterDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        justifyContent: 'space-between',
    },
    filterDropdownItemSelected: {
        backgroundColor: '#fff7ed',
    },
    checkIcon: {
        // marginRight removed as icon is now on the right
    },
    filterDropdownItemText: {
        ...theme.typography.body,
        flex: 1,
    },
    filterDropdownItemTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    calendarViewWrapper: {
        marginTop: theme.spacing.lg,
    },
    calendarViewContainer: {
        flexDirection: 'column',
        gap: theme.spacing.xs,
    },
    scheduleCard: {
        padding: theme.spacing.md,
    },
    scheduleDate: {
        ...theme.typography.h3,
        marginBottom: theme.spacing.md,
    },
    scheduleEmptyText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    emptyStateContainer: {
        marginTop: theme.spacing.lg,
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        zIndex: 1000,
    },
    centeredModalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    addEnrollmentModalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        width: '90%',
        maxWidth: 600,
        maxHeight: '90%',
        ...theme.shadows.card,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        ...theme.typography.h3,
    },
    closeButton: {
        padding: theme.spacing.xs,
    },
    modalContent: {
        // removed flex: 1 to prevent collapse on mobile
    },
    modalScrollContent: {
        padding: theme.spacing.lg,
    },
    formSection: {
        marginBottom: theme.spacing.lg,
    },
    formSectionWithDropdown: {
        marginTop: 320,
    },
    label: {
        ...theme.typography.body,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
        color: theme.colors.text,
    },
    required: {
        color: theme.colors.danger,
    },
    textInput: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        ...theme.typography.body,
        minHeight: 44,
    },
    placeholder: {
        color: theme.colors.textSecondary,
    },
    sportNameContainer: {
        position: 'relative',
        zIndex: 1000,
    },
    sportNameDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        minHeight: 44,
    },
    sportNameDropdownText: {
        ...theme.typography.body,
        flex: 1,
    },
    schedulePeriodsContainer: {
        gap: theme.spacing.md,
    },
    radioButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.secondary,
        marginRight: theme.spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonSelected: {
        borderColor: theme.colors.secondary,
    },
    radioButtonInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.secondary,
    },
    radioButtonLabel: {
        ...theme.typography.body,
        flex: 1,
    },
    dateRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    dateField: {
        flex: 1,
    },
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        minHeight: 44,
    },
    dateInputText: {
        ...theme.typography.body,
        flex: 1,
    },
    textArea: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        ...theme.typography.body,
        minHeight: 100,
    },
    datePickerContainer: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        padding: theme.spacing.md,
        width: '100%',
        maxWidth: 600,
        ...theme.shadows.card,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    datePickerMonth: {
        ...theme.typography.h3,
        fontSize: 18,
    },
    datePickerWeekdays: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: theme.spacing.sm,
    },
    weekdayText: {
        ...theme.typography.bodySmall,
        fontWeight: '600',
        width: 40,
        textAlign: 'center',
    },
    datePickerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        marginBottom: theme.spacing.md,
    },
    dateCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateCellText: {
        ...theme.typography.body,
        fontSize: 14,
    },
    todayCell: {
        borderRadius: 20,
        backgroundColor: theme.colors.background,
    },
    selectedDateCell: {
        borderRadius: 20,
        backgroundColor: theme.colors.secondary,
    },
    selectedDateText: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    datePickerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.md,
    },
    datePickerActionText: {
        ...theme.typography.body,
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    centeredModalFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    cancelButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cancelButtonText: {
        ...theme.typography.body,
        color: theme.colors.text,
        fontWeight: '600',
    },
    submitButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    submitButtonDisabled: {
        backgroundColor: theme.colors.textSecondary,
        opacity: 0.5,
    },
    submitButtonText: {
        ...theme.typography.body,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    emptyStateCard: {
        padding: theme.spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
    emptyStateText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    // Help Modal Styles
    helpModalContainer: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        width: '100%',
        maxWidth: 600,
        maxHeight: '90%',
        ...theme.shadows.card,
    },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    tab: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: theme.colors.secondary,
    },
    tabText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    activeTabText: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    tabScrollContainer: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    tabScrollContent: {
        paddingHorizontal: theme.spacing.xs,
    },
    tabScrollable: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
        minWidth: 80,
    },
    activeTabScrollable: {
        backgroundColor: '#e0e7ff',
        borderRadius: theme.borderRadius.sm,
        borderBottomWidth: 0,
    },
    helpModalContent: {
        padding: theme.spacing.lg,
    },
    helpSectionTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        marginBottom: theme.spacing.xs,
    },
    helpSectionSubtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    helpSection: {
        marginBottom: theme.spacing.lg,
    },
    helpLabel: {
        ...theme.typography.body,
        fontWeight: '600',
        marginBottom: theme.spacing.sm,
    },
    codeBlock: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.sm,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    codeText: {
        ...theme.typography.bodySmall,
        fontFamily: 'monospace',
        color: theme.colors.text,
    },
    noteBox: {
        backgroundColor: '#FFF8E1',
        borderRadius: theme.borderRadius.sm,
        padding: theme.spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: '#FFC107',
    },
    noteText: {
        ...theme.typography.bodySmall,
        color: '#7A6800',
        marginBottom: theme.spacing.xs,
    },
    noteBoxBlue: {
        backgroundColor: '#E3F2FD',
        borderRadius: theme.borderRadius.sm,
        padding: theme.spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
    },
    noteTextBlue: {
        ...theme.typography.bodySmall,
        color: '#0D47A1',
    },
    tipBox: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.sm,
        padding: theme.spacing.md,
    },
    tipText: {
        ...theme.typography.bodySmall,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
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
