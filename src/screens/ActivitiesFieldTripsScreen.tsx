import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Switch, Pressable } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

// Mock divisions data
const MOCK_DIVISIONS = [
    { id: '1', name: 'All Divisions', gender: '', sort_order: 0 },
    { id: '2', name: 'Freshmen A Girls', gender: 'female', sort_order: 1 },
    { id: '3', name: 'Freshmen B Girls', gender: 'female', sort_order: 2 },
    { id: '4', name: 'Cadet Girls', gender: 'female', sort_order: 3 },
    { id: '5', name: 'Sophomore Girls', gender: 'female', sort_order: 4 },
    { id: '6', name: 'Junior Girls', gender: 'female', sort_order: 5 },
    { id: '7', name: 'Senior Girls', gender: 'female', sort_order: 6 },
    { id: '8', name: 'Super Girls', gender: 'female', sort_order: 7 },
    { id: '9', name: 'Teen Girls', gender: 'female', sort_order: 8 },
    { id: '10', name: 'CIT Girls', gender: 'female', sort_order: 9 },
    { id: '11', name: 'Freshmen A Boys', gender: 'male', sort_order: 10 },
    { id: '12', name: 'Freshmen B Boys', gender: 'male', sort_order: 11 },
    { id: '13', name: 'Cadet Boys', gender: 'male', sort_order: 12 },
    { id: '14', name: 'Sophomore Boys', gender: 'male', sort_order: 13 },
    { id: '15', name: 'Junior Boys', gender: 'male', sort_order: 14 },
    { id: '16', name: 'Senior Boys', gender: 'male', sort_order: 15 },
    { id: '17', name: 'Super Boys', gender: 'male', sort_order: 16 },
    { id: '18', name: 'Teen Boys', gender: 'male', sort_order: 17 },
    { id: '19', name: 'CIT Boys', gender: 'male', sort_order: 18 },
];

// Mock activities data matching the screenshot
const MOCK_ACTIVITIES: any[] = [
    {
        id: '1',
        title: 'Junior Hershey/Dorney Trip',
        event_date: '2026-07-28',
        end_date: '2026-07-29',
        is_multi_day: true,
        activity_type: 'field-trip',
        home_away: 'away',
        divisions: [
            { id: '1', name: 'Junior Girls' },
            { id: '2', name: 'Junior Boys' }
        ],
        depart_from_camp: '',
        depart_from_activity: '',
        location: '',
        capacity: null,
        chaperone: '',
        description: '',
        meal_options: [],
        meal_notes: '',
    },
    {
        id: '2',
        title: 'Teen/CIT Cali Trip',
        event_date: '2026-07-29',
        end_date: '2026-08-03',
        is_multi_day: true,
        activity_type: 'field-trip',
        home_away: 'away',
        divisions: [],
        depart_from_camp: '',
        depart_from_activity: '',
        location: '',
        capacity: null,
        chaperone: '',
        description: '',
        meal_options: [],
        meal_notes: '',
    },
    {
        id: '3',
        title: 'Super Montreal Trip',
        event_date: '2026-07-30',
        end_date: '2026-08-01',
        is_multi_day: true,
        activity_type: 'field-trip',
        home_away: 'away',
        divisions: [
            { id: '1', name: 'Super Boys' },
            { id: '2', name: 'Super Girls' }
        ],
        depart_from_camp: '',
        depart_from_activity: '',
        location: '',
        capacity: null,
        chaperone: '',
        description: '',
        meal_options: [],
        meal_notes: '',
    },
];

type CalendarView = 'Month' | 'Week' | 'Day' | 'Agenda';

export const ActivitiesFieldTripsScreen = ({ navigation }: any) => {
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [isDivisionDropdownOpen, setIsDivisionDropdownOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
    const [calendarView, setCalendarView] = useState<CalendarView>('Month');
    const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 22)); // January 22, 2026
    const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1)); // January 2026
    const [sortBy, setSortBy] = useState<'date' | 'division'>('date');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<any>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [activityToDelete, setActivityToDelete] = useState<any>(null);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [helpModalTab, setHelpModalTab] = useState<string>('Trips');
    const [isUploadCSVModalOpen, setIsUploadCSVModalOpen] = useState(false);
    const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
    const [isActivityTypeDropdownOpen, setIsActivityTypeDropdownOpen] = useState(false);
    const [isLocationTypeDropdownOpen, setIsLocationTypeDropdownOpen] = useState(false);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    const [timePickerField, setTimePickerField] = useState<'depart_from_camp' | 'depart_from_activity' | null>(null);
    const [selectedTime, setSelectedTime] = useState({ hour: 0, minute: 0, ampm: 'AM' });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [datePickerField, setDatePickerField] = useState<'event_date' | 'end_date' | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [formData, setFormData] = useState({
        event_date: '',
        end_date: '',
        is_multi_day: false,
        title: '',
        activity_type: '',
        home_away: '',
        division_ids: [] as string[],
        depart_from_camp: '',
        depart_from_activity: '',
        location: '',
        capacity: '',
        chaperone: '',
        description: '',
        meal_options: [] as string[],
        meal_notes: '',
    });

    // Generate calendar days for the month
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Add previous month's trailing days
        const prevMonth = new Date(year, month - 1, 0);
        const prevMonthDays = prevMonth.getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthDays - i),
                isCurrentMonth: false,
            });
        }

        // Add current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            days.push({
                date: new Date(year, month, day),
                isCurrentMonth: true,
            });
        }

        // Add next month's leading days to fill the grid (6 rows * 7 days = 42)
        const remainingDays = 42 - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            days.push({
                date: new Date(year, month + 1, day),
                isCurrentMonth: false,
            });
        }

        return days;
    };

    const calendarDays = getDaysInMonth(currentMonth);

    const isSelectedDate = (date: Date) => {
        return date.getDate() === currentDate.getDate() &&
            date.getMonth() === currentDate.getMonth() &&
            date.getFullYear() === currentDate.getFullYear();
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const formatMonthYear = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    // Get week days starting from Sunday
    const getWeekDays = (date: Date) => {
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - day); // Go to Sunday

        const days = [];
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + i);
            days.push(dayDate);
        }
        return days;
    };

    // Format week range (e.g., "January 18 â€“ 24")
    const formatWeekRange = (date: Date) => {
        const weekDays = getWeekDays(date);
        const start = weekDays[0];
        const end = weekDays[6];

        if (start.getMonth() === end.getMonth()) {
            return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()} â€“ ${end.getDate()}`;
        } else {
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} â€“ ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
    };

    // Format day view date (e.g., "Thursday Jan 22")
    const formatDayDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    };

    // Format agenda range (e.g., "01/22/2026 â€“ 02/21/2026")
    const formatAgendaRange = (date: Date) => {
        const start = new Date(date);
        const end = new Date(date);
        end.setMonth(end.getMonth() + 1);

        const startStr = start.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        const endStr = end.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

        return `${startStr} â€“ ${endStr}`;
    };

    // Generate time slots (24 hours)
    const getTimeSlots = () => {
        const slots = [];
        for (let hour = 0; hour < 24; hour++) {
            const time12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            const ampm = hour < 12 ? 'AM' : 'PM';
            slots.push({
                hour,
                label: `${time12}:00 ${ampm}`,
            });
        }
        return slots;
    };

    const navigateCalendar = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            const today = new Date();
            setCurrentDate(today);
            setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
            return;
        }

        if (calendarView === 'Week') {
            // Navigate by week
            const newDate = new Date(currentDate);
            if (direction === 'prev') {
                newDate.setDate(newDate.getDate() - 7);
            } else {
                newDate.setDate(newDate.getDate() + 7);
            }
            setCurrentDate(newDate);
        } else if (calendarView === 'Day') {
            // Navigate by day
            const newDate = new Date(currentDate);
            if (direction === 'prev') {
                newDate.setDate(newDate.getDate() - 1);
            } else {
                newDate.setDate(newDate.getDate() + 1);
            }
            setCurrentDate(newDate);
        } else if (calendarView === 'Agenda') {
            // Navigate by month for agenda
            const newDate = new Date(currentDate);
            if (direction === 'prev') {
                newDate.setMonth(newDate.getMonth() - 1);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            setCurrentDate(newDate);
        } else {
            // Navigate by month
            const newMonth = new Date(currentMonth);
            if (direction === 'prev') {
                newMonth.setMonth(newMonth.getMonth() - 1);
            } else {
                newMonth.setMonth(newMonth.getMonth() + 1);
            }
            setCurrentMonth(newMonth);
        }
    };

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekDaysDates = getWeekDays(currentDate);
    const timeSlots = getTimeSlots();

    // Format date for activity cards
    const formatActivityDate = (startDate: string, endDate?: string, isMultiDay?: boolean) => {
        const start = new Date(startDate + 'T00:00:00');
        if (isMultiDay && endDate) {
            const end = new Date(endDate + 'T00:00:00');
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Format time for display (12-hour format)
    const formatTime = (timeString: string) => {
        if (!timeString) return '';
        // If time is in HH:MM format, convert to 12-hour
        if (timeString.includes(':')) {
            const [hours, minutes] = timeString.split(':');
            const hour = parseInt(hours);
            const minute = parseInt(minutes);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
        }
        return timeString;
    };

    // Parse time from 12-hour format to 24-hour format
    const parseTimeTo24Hour = (hour: number, minute: number, ampm: string) => {
        let hour24 = hour;
        if (ampm === 'PM' && hour !== 12) {
            hour24 = hour + 12;
        } else if (ampm === 'AM' && hour === 12) {
            hour24 = 0;
        }
        return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    };

    // Format date for display (MM/DD/YYYY)
    const formatDateForDisplay = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    // Format date for storage (YYYY-MM-DD)
    const formatDateForStorage = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Open time picker
    const openTimePicker = (field: 'depart_from_camp' | 'depart_from_activity') => {
        setTimePickerField(field);
        // Parse existing time if available
        const currentTime = formData[field];
        if (currentTime) {
            const [hours, minutes] = currentTime.split(':');
            const hour = parseInt(hours);
            const hour12 = hour % 12 || 12;
            const ampm = hour >= 12 ? 'PM' : 'AM';
            setSelectedTime({ hour: hour12, minute: parseInt(minutes), ampm });
        } else {
            setSelectedTime({ hour: 12, minute: 0, ampm: 'AM' });
        }
        setIsTimePickerOpen(true);
    };

    // Confirm time selection
    const confirmTimeSelection = () => {
        if (timePickerField) {
            const time24 = parseTimeTo24Hour(selectedTime.hour, selectedTime.minute, selectedTime.ampm);
            setFormData({ ...formData, [timePickerField]: time24 });
        }
        setIsTimePickerOpen(false);
        setTimePickerField(null);
    };

    // Calculate number of days for multi-day events
    const calculateDays = (startDate: string, endDate: string) => {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        const diffTime = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    // Group activities by month
    const groupActivitiesByMonth = () => {
        const grouped: Record<string, typeof MOCK_ACTIVITIES> = {};
        MOCK_ACTIVITIES.forEach(activity => {
            const date = new Date(activity.event_date + 'T00:00:00');
            const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (!grouped[monthKey]) {
                grouped[monthKey] = [];
            }
            grouped[monthKey].push(activity);
        });
        return grouped;
    };

    const groupedActivities = groupActivitiesByMonth();

    const renderActionSheetModal = () => {
        const isVisible = isActivityTypeDropdownOpen || isLocationTypeDropdownOpen;
        const title = isActivityTypeDropdownOpen ? 'Select Activity Type' : 'Select Location Type';

        let options: { value: string, label: string }[] = [];
        let currentValue = '';
        let onSelect: (val: string) => void = () => { };

        if (isActivityTypeDropdownOpen) {
            options = [
                { value: 'field-trip', label: 'Field Trip' },
                { value: 'arts-crafts', label: 'Arts & Crafts' },
                { value: 'nature', label: 'Nature Activity' },
                { value: 'water', label: 'Water Activity' },
                { value: 'outdoor', label: 'Outdoor Adventure' },
                { value: 'cultural', label: 'Cultural Activity' },
                { value: 'other', label: 'Other' },
            ];
            currentValue = formData.activity_type;
            onSelect = (val) => setFormData({ ...formData, activity_type: val });
        } else if (isLocationTypeDropdownOpen) {
            options = [
                { value: '', label: 'Not Specified' },
                { value: 'home', label: 'HOME' },
                { value: 'away', label: 'AWAY' },
            ];
            currentValue = formData.home_away;
            onSelect = (val) => setFormData({ ...formData, home_away: val });
        }

        return (
            <Modal
                visible={isVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    setIsActivityTypeDropdownOpen(false);
                    setIsLocationTypeDropdownOpen(false);
                }}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => {
                        setIsActivityTypeDropdownOpen(false);
                        setIsLocationTypeDropdownOpen(false);
                    }}
                >
                    <Pressable
                        style={styles.bottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>{title}</Text>
                        </View>
                        <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={{ maxHeight: 300 }}>
                            {options.map((option) => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.bottomSheetOption,
                                        currentValue === option.value && styles.bottomSheetOptionSelected
                                    ]}
                                    onPress={() => {
                                        onSelect(option.value);
                                        setIsActivityTypeDropdownOpen(false);
                                        setIsLocationTypeDropdownOpen(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.bottomSheetOptionText,
                                        currentValue === option.value && styles.bottomSheetOptionTextSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {currentValue === option.value && (
                                        <Ionicons name="checkmark" size={20} color={currentValue === option.value ? theme.colors.surface : theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </KeyboardAwareScrollView>
                        <TouchableOpacity
                            style={{
                                marginTop: 16,
                                padding: 12,
                                alignItems: 'center',
                                backgroundColor: '#f1f5f9',
                                borderRadius: 8
                            }}
                            onPress={() => {
                                setIsActivityTypeDropdownOpen(false);
                                setIsLocationTypeDropdownOpen(false);
                            }}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary }}>Cancel</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.headerTitleContainer}>
                    <View style={styles.headerTitleRow}>
                        <Ionicons name="leaf" size={24} color={theme.colors.primary} />
                        <Text style={styles.headerTitle}>Activities & Field Trips</Text>
                    </View>
                    <Text style={styles.headerSubtitle}>Schedule and manage activities and field trips for The Nest.</Text>
                </View>
            </View>



            <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Controls Bar */}
                <View style={styles.controlsBar}>
                    {/* Division Filter and Sort */}
                    <View style={styles.controlsLeft}>
                        <View style={styles.divisionFilterContainer}>
                            <TouchableOpacity
                                style={styles.divisionDropdown}
                                onPress={() => setIsDivisionDropdownOpen(!isDivisionDropdownOpen)}
                            >
                                <Text style={styles.divisionText}>{selectedDivision}</Text>
                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        {viewMode === 'list' && (
                            <TouchableOpacity
                                style={styles.sortButton}
                                onPress={() => setSortBy(sortBy === 'date' ? 'division' : 'date')}
                            >
                                <Text style={styles.sortButtonText}>
                                    Sort by {sortBy === 'date' ? 'Division' : 'Date'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>


                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        {/* View Toggle */}
                        <View style={styles.viewToggle}>
                            <TouchableOpacity
                                style={[
                                    styles.viewToggleButton,
                                    viewMode === 'calendar' && styles.viewToggleButtonActive
                                ]}
                                onPress={() => setViewMode('calendar')}
                            >
                                <Ionicons
                                    name="calendar"
                                    size={20}
                                    color={viewMode === 'calendar' ? theme.colors.surface : theme.colors.textSecondary}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.viewToggleButton,
                                    viewMode === 'list' && styles.viewToggleButtonActive
                                ]}
                                onPress={() => setViewMode('list')}
                            >
                                <Ionicons
                                    name="list"
                                    size={20}
                                    color={viewMode === 'list' ? theme.colors.surface : theme.colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Help Icon */}
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => setIsHelpModalOpen(true)}
                        >
                            <Ionicons name="help-circle-outline" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {/* Upload CSV Button */}
                        <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={() => setIsUploadCSVModalOpen(true)}
                        >
                            <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.surface} />
                            <Text style={styles.uploadButtonText}>Upload CSV</Text>
                        </TouchableOpacity>

                        {/* Add Activity Button */}
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => {
                                setEditingActivity(null);
                                setFormData({
                                    event_date: '',
                                    end_date: '',
                                    is_multi_day: false,
                                    title: '',
                                    activity_type: '',
                                    home_away: '',
                                    division_ids: [],
                                    depart_from_camp: '',
                                    depart_from_activity: '',
                                    location: '',
                                    capacity: '',
                                    chaperone: '',
                                    description: '',
                                    meal_options: [],
                                    meal_notes: '',
                                });
                                setIsAddActivityModalOpen(true);
                                setIsActivityTypeDropdownOpen(false);
                                setIsLocationTypeDropdownOpen(false);
                            }}
                        >
                            <Ionicons name="add" size={20} color={theme.colors.surface} />
                            <Text style={styles.addButtonText}>Add Activity</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Calendar View */}
                {viewMode === 'calendar' && (
                    <StyledCard style={styles.calendarCard}>
                        {/* Calendar Navigation */}
                        <View style={styles.calendarNavigation}>
                            {/* Top Row: Navigation and Date */}
                            <View style={styles.calendarNavTopRow}>
                                <View style={styles.calendarNavLeft}>
                                    <TouchableOpacity
                                        style={styles.navButton}
                                        onPress={() => navigateCalendar('today')}
                                    >
                                        <Text style={styles.navButtonText}>Today</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.navButton}
                                        onPress={() => navigateCalendar('prev')}
                                    >
                                        <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.navButton}
                                        onPress={() => navigateCalendar('next')}
                                    >
                                        <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.monthYearText} numberOfLines={1}>
                                    {calendarView === 'Week'
                                        ? formatWeekRange(currentDate)
                                        : calendarView === 'Day'
                                            ? formatDayDate(currentDate)
                                            : calendarView === 'Agenda'
                                                ? formatAgendaRange(currentDate)
                                                : formatMonthYear(currentMonth)}
                                </Text>
                            </View>

                            {/* Bottom Row: View Options */}
                            <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled"
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.viewOptionsScroll}
                                contentContainerStyle={styles.viewOptionsContainer}
                            >
                                {(['Month', 'Week', 'Day', 'Agenda'] as CalendarView[]).map((view) => (
                                    <TouchableOpacity
                                        key={view}
                                        style={[
                                            styles.viewOptionButton,
                                            calendarView === view && styles.viewOptionButtonActive
                                        ]}
                                        onPress={() => setCalendarView(view)}
                                    >
                                        <Text style={[
                                            styles.viewOptionText,
                                            calendarView === view && styles.viewOptionTextActive
                                        ]}>
                                            {view}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </KeyboardAwareScrollView>
                        </View>

                        {/* Calendar Grid */}
                        {calendarView === 'Week' ? (
                            <View style={styles.weekViewContainer}>
                                {/* Day headers row */}
                                <View style={styles.weekDayHeadersContainer}>
                                    <View style={styles.timeColumnHeader} />
                                    <View style={styles.weekDayHeadersRow}>
                                        {weekDaysDates.map((dayDate, index) => {
                                            const isCurrentDay = isToday(dayDate);

                                            return (
                                                <View
                                                    key={index}
                                                    style={[
                                                        styles.weekDayHeaderCell,
                                                        isCurrentDay && styles.weekDayHeaderCellToday
                                                    ]}
                                                >
                                                    <Text style={styles.weekDayHeaderText}>
                                                        {weekDays[index]}
                                                    </Text>
                                                    <Text style={[
                                                        styles.weekDayHeaderDate,
                                                        isCurrentDay && styles.weekDayHeaderDateToday
                                                    ]}>
                                                        {dayDate.getDate()}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Scrollable time grid */}
                                <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.weekScrollView} nestedScrollEnabled>
                                    <View style={styles.weekTimeGrid}>
                                        {/* Time column */}
                                        <View style={styles.timeColumn}>
                                            {timeSlots.map((slot, index) => (
                                                <View key={index} style={styles.timeSlot}>
                                                    <Text style={styles.timeSlotText}>{slot.label}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        {/* Day columns */}
                                        <View style={styles.weekDayColumns}>
                                            {weekDaysDates.map((dayDate, dayIndex) => {
                                                const isCurrentDay = isToday(dayDate);

                                                return (
                                                    <View
                                                        key={dayIndex}
                                                        style={[
                                                            styles.weekDayColumn,
                                                            isCurrentDay && styles.weekDayColumnToday
                                                        ]}
                                                    >
                                                        {timeSlots.map((slot, timeIndex) => (
                                                            <TouchableOpacity
                                                                key={timeIndex}
                                                                style={styles.weekTimeCell}
                                                                onPress={() => {
                                                                    // Handle time slot click
                                                                    setCurrentDate(dayDate);
                                                                }}
                                                            >
                                                                {/* Empty cell - activities would be rendered here */}
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                </KeyboardAwareScrollView>
                            </View>
                        ) : calendarView === 'Day' ? (
                            <View style={styles.dayViewContainer}>
                                {/* Day header */}
                                <View style={styles.dayHeaderContainer}>
                                    <View style={styles.timeColumnHeader} />
                                    <View style={[
                                        styles.dayHeaderCell,
                                        isToday(currentDate) && styles.dayHeaderCellToday
                                    ]}>
                                        <Text style={styles.dayHeaderText}>
                                            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
                                        </Text>
                                        <Text style={[
                                            styles.dayHeaderDate,
                                            isToday(currentDate) && styles.dayHeaderDateToday
                                        ]}>
                                            {currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </Text>
                                    </View>
                                </View>

                                {/* Scrollable time grid */}
                                <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.dayScrollView} nestedScrollEnabled>
                                    <View style={styles.dayTimeGrid}>
                                        {/* Time column */}
                                        <View style={styles.timeColumn}>
                                            {timeSlots.map((slot, index) => (
                                                <View key={index} style={styles.timeSlot}>
                                                    <Text style={styles.timeSlotText}>{slot.label}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        {/* Day column */}
                                        <View style={[
                                            styles.dayColumn,
                                            isToday(currentDate) && styles.dayColumnToday
                                        ]}>
                                            {timeSlots.map((slot, timeIndex) => (
                                                <TouchableOpacity
                                                    key={timeIndex}
                                                    style={styles.weekTimeCell}
                                                    onPress={() => {
                                                        // Handle time slot click
                                                    }}
                                                >
                                                    {/* Empty cell - activities would be rendered here */}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </KeyboardAwareScrollView>
                            </View>
                        ) : calendarView === 'Agenda' ? (
                            <View style={styles.agendaViewContainer}>
                                <View style={styles.agendaEmptyContainer}>
                                    <Text style={styles.agendaEmptyText}>
                                        There are no events in this range.
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.calendarGrid}>
                                {/* Week Day Headers */}
                                <View style={styles.weekDayRow}>
                                    {weekDays.map((day) => (
                                        <View key={day} style={styles.weekDayHeader}>
                                            <Text style={styles.weekDayText}>{day}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Calendar Days */}
                                <View style={styles.calendarDaysContainer}>
                                    {calendarDays.map((day, index) => {
                                        const isSelected = isSelectedDate(day.date);
                                        const isCurrentDay = isToday(day.date);

                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                style={[
                                                    styles.calendarDay,
                                                    !day.isCurrentMonth && styles.calendarDayOtherMonth,
                                                    isSelected && styles.calendarDaySelected,
                                                    isCurrentDay && !isSelected && styles.calendarDayToday
                                                ]}
                                                onPress={() => setCurrentDate(day.date)}
                                            >
                                                <Text style={[
                                                    styles.calendarDayText,
                                                    !day.isCurrentMonth && styles.calendarDayTextOtherMonth,
                                                    isSelected && styles.calendarDayTextSelected,
                                                    isCurrentDay && !isSelected && styles.calendarDayTextToday
                                                ]}>
                                                    {day.date.getDate()}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </StyledCard>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                    <View style={styles.listViewContainer}>
                        {Object.entries(groupedActivities).map(([month, activities]) => (
                            <View key={month} style={styles.monthGroup}>
                                <Text style={styles.monthHeader}>{month}</Text>
                                <View style={styles.activitiesList}>
                                    {activities.map((activity) => (
                                        <StyledCard key={activity.id} style={styles.activityCard}>
                                            <View style={styles.activityCardHeader}>
                                                <View style={styles.activityCardTitleContainer}>
                                                    <Text style={styles.activityCardTitle}>
                                                        {activity.title}
                                                    </Text>
                                                    <Text style={styles.activityCardDate}>
                                                        {formatActivityDate(
                                                            activity.event_date,
                                                            activity.end_date,
                                                            activity.is_multi_day
                                                        )}
                                                    </Text>
                                                </View>
                                                <View style={styles.activityCardActions}>
                                                    <Pressable
                                                        style={({ pressed }) => [
                                                            styles.actionIconButton,
                                                            pressed && styles.actionIconButtonPressed
                                                        ]}
                                                        onPress={() => {
                                                            setEditingActivity(activity);
                                                            setFormData({
                                                                event_date: activity.event_date,
                                                                end_date: activity.end_date || '',
                                                                is_multi_day: activity.is_multi_day || false,
                                                                title: activity.title,
                                                                activity_type: activity.activity_type,
                                                                home_away: activity.home_away || '',
                                                                division_ids: activity.divisions?.map((d: any) => d.id) || [],
                                                                depart_from_camp: activity.depart_from_camp || '',
                                                                depart_from_activity: activity.depart_from_activity || '',
                                                                location: activity.location || '',
                                                                capacity: activity.capacity?.toString() || '',
                                                                chaperone: activity.chaperone || '',
                                                                description: activity.description || '',
                                                                meal_options: activity.meal_options || [],
                                                                meal_notes: activity.meal_notes || '',
                                                            });
                                                            setIsEditModalOpen(true);
                                                        }}
                                                    >
                                                        <Ionicons name="pencil" size={20} color={theme.colors.textSecondary} />
                                                    </Pressable>
                                                    <TouchableOpacity
                                                        style={styles.actionIconButton}
                                                        onPress={() => {
                                                            setActivityToDelete(activity);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                    >
                                                        <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <View style={styles.activityCardBadges}>
                                                <View style={[styles.badge, styles.badgePrimary]}>
                                                    <Text style={styles.badgeText}>{activity.activity_type}</Text>
                                                </View>
                                                {activity.is_multi_day && activity.end_date && (
                                                    <View style={[styles.badge, styles.badgePrimary]}>
                                                        <Text style={styles.badgeText}>
                                                            {calculateDays(activity.event_date, activity.end_date)}-Day
                                                        </Text>
                                                    </View>
                                                )}
                                                {activity.home_away && (
                                                    <View style={[styles.badge, styles.badgeOutline]}>
                                                        <Text style={[styles.badgeText, styles.badgeTextOutline]}>
                                                            {activity.home_away.toUpperCase()}
                                                        </Text>
                                                    </View>
                                                )}
                                                {activity.divisions?.map((div: any) => (
                                                    <View key={div.id} style={[styles.badge, styles.badgeSecondary]}>
                                                        <Text style={[styles.badgeText, styles.badgeTextSecondary]}>{div.name}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </StyledCard>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

            </KeyboardAwareScrollView>

            {/* Division Dropdown Modal - Bottom Sheet */}
            <Modal
                visible={isDivisionDropdownOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsDivisionDropdownOpen(false)}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => setIsDivisionDropdownOpen(false)}
                >
                    <Pressable
                        style={styles.divisionBottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Bottom Sheet Header */}
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Division</Text>
                        </View>

                        {/* Bottom Sheet Options */}
                        <View style={styles.bottomSheetContent}>
                            <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled"
                                style={styles.divisionBottomSheetScroll}
                                showsVerticalScrollIndicator={false}
                            >
                                {MOCK_DIVISIONS.map((division) => (
                                    <TouchableOpacity
                                        key={division.id}
                                        style={[
                                            styles.bottomSheetOption,
                                            selectedDivision === division.name && styles.bottomSheetOptionSelected
                                        ]}
                                        onPress={() => {
                                            setSelectedDivision(division.name);
                                            setIsDivisionDropdownOpen(false);
                                        }}
                                    >
                                        <Ionicons
                                            name="people-outline"
                                            size={24}
                                            color={selectedDivision === division.name ? theme.colors.surface : theme.colors.secondary}
                                        />
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            selectedDivision === division.name && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {division.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </KeyboardAwareScrollView>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Upload CSV Bottom Sheet Modal */}
            <Modal
                visible={isUploadCSVModalOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsUploadCSVModalOpen(false)}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => setIsUploadCSVModalOpen(false)}
                >
                    <Pressable
                        style={styles.bottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Bottom Sheet Header */}
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select file</Text>
                        </View>

                        {/* Bottom Sheet Options */}
                        <View style={styles.bottomSheetContent}>
                            <TouchableOpacity
                                style={styles.bottomSheetOption}
                                onPress={() => {
                                    // TODO: Handle file selection
                                    console.log('Selected: Aloha downloads');
                                    setIsUploadCSVModalOpen(false);
                                }}
                            >
                                <Ionicons name="folder-outline" size={24} color={theme.colors.secondary} />
                                <Text style={styles.bottomSheetOptionText}>Aloha downloads</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.bottomSheetOption}
                                onPress={() => {
                                    // TODO: Handle file selection
                                    console.log('Selected: Other files');
                                    setIsUploadCSVModalOpen(false);
                                }}
                            >
                                <Ionicons name="document-text-outline" size={24} color={theme.colors.secondary} />
                                <Text style={styles.bottomSheetOptionText}>Other files</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Add Activity Bottom Sheet Modal */}
            <Modal
                visible={isAddActivityModalOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsAddActivityModalOpen(false)}
            >
                <Pressable
                    style={styles.centeredOverlay}
                    onPress={() => setIsAddActivityModalOpen(false)}
                >
                    <Pressable
                        style={styles.centeredModal}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled"
                            style={styles.addActivityBottomSheetScroll}
                            contentContainerStyle={styles.addActivityBottomSheetContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Modal Header */}
                            <View style={styles.addActivityBottomSheetHeader}>
                                <Text style={styles.addActivityBottomSheetTitle}>Add Activity/Field Trip</Text>
                                <TouchableOpacity
                                    onPress={() => setIsAddActivityModalOpen(false)}
                                >
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Form Content - Reuse the edit form structure */}
                            <View style={styles.addActivityFormContent}>
                                {/* Title Field */}
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Title *</Text>
                                    <TextInput
                                        style={styles.formTextInput}
                                        placeholder="Enter activity title"
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={formData.title}
                                        onChangeText={(text) => setFormData({ ...formData, title: text })}
                                    />
                                </View>

                                {/* Event Date */}
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Event Date *</Text>
                                    <TouchableOpacity
                                        style={styles.formInput}
                                        onPress={() => {
                                            setDatePickerField('event_date');
                                            setSelectedDate(formData.event_date ? new Date(formData.event_date) : new Date());
                                            setIsDatePickerOpen(true);
                                        }}
                                    >
                                        <Text style={[styles.formInputText, !formData.event_date && styles.formInputPlaceholder]}>
                                            {formData.event_date || 'Select event date'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Multi-day Toggle */}
                                <View style={styles.formField}>
                                    <View style={styles.switchContainer}>
                                        <Text style={styles.formLabel}>Multi-day Event</Text>
                                        <Switch
                                            value={formData.is_multi_day}
                                            onValueChange={(value) => setFormData({ ...formData, is_multi_day: value })}
                                            trackColor={{ false: theme.colors.border, true: theme.colors.secondary }}
                                            thumbColor={theme.colors.surface}
                                        />
                                    </View>
                                </View>

                                {/* End Date (if multi-day) */}
                                {formData.is_multi_day && (
                                    <View style={styles.formField}>
                                        <Text style={styles.formLabel}>End Date</Text>
                                        <TouchableOpacity
                                            style={styles.formInput}
                                            onPress={() => {
                                                setDatePickerField('end_date');
                                                setSelectedDate(formData.end_date ? new Date(formData.end_date) : new Date());
                                                setIsDatePickerOpen(true);
                                            }}
                                        >
                                            <Text style={[styles.formInputText, !formData.end_date && styles.formInputPlaceholder]}>
                                                {formData.end_date || 'Select end date'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* Activity Type */}
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Activity Type *</Text>
                                    <TouchableOpacity
                                        style={styles.formInput}
                                        onPress={() => setIsActivityTypeDropdownOpen(true)}
                                    >
                                        <Text style={[styles.formInputText, !formData.activity_type && styles.formInputPlaceholder]}>
                                            {formData.activity_type || 'Select activity type'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                {/* Home/Away */}
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Location Type</Text>
                                    <TouchableOpacity
                                        style={styles.formInput}
                                        onPress={() => setIsLocationTypeDropdownOpen(true)}
                                    >
                                        <Text style={[styles.formInputText, !formData.home_away && styles.formInputPlaceholder]}>
                                            {formData.home_away || 'Select location type'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                {/* Location */}
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Location</Text>
                                    <TextInput
                                        style={styles.formTextInput}
                                        placeholder="Enter location"
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={formData.location}
                                        onChangeText={(text) => setFormData({ ...formData, location: text })}
                                    />
                                </View>

                                {/* Description */}
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>Description</Text>
                                    <TextInput
                                        style={[styles.formTextInput, styles.formTextArea]}
                                        placeholder="Enter description"
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={formData.description}
                                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                                        multiline
                                        numberOfLines={4}
                                    />
                                </View>

                                {/* Action Buttons */}
                                <View style={styles.addActivityBottomSheetActions}>
                                    <TouchableOpacity
                                        style={styles.addActivityCancelButton}
                                        onPress={() => setIsAddActivityModalOpen(false)}
                                    >
                                        <Text style={styles.addActivityCancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.addActivitySaveButton}
                                        onPress={() => {
                                            // TODO: Handle save
                                            console.log('Save activity:', formData);
                                            setIsAddActivityModalOpen(false);
                                        }}
                                    >
                                        <Text style={styles.addActivitySaveButtonText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAwareScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Edit Activity Modal - Bottom Sheet */}
            <Modal
                visible={isEditModalOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    setIsEditModalOpen(false);
                    setEditingActivity(null);
                    setIsActivityTypeDropdownOpen(false);
                    setIsLocationTypeDropdownOpen(false);
                }}
            >
                <Pressable
                    style={styles.centeredOverlay}
                    onPress={() => {
                        setIsEditModalOpen(false);
                        setEditingActivity(null);
                        setIsActivityTypeDropdownOpen(false);
                        setIsLocationTypeDropdownOpen(false);
                    }}
                >
                    <Pressable
                        style={styles.centeredModal}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled"
                            style={styles.editActivityBottomSheetScroll}
                            contentContainerStyle={styles.editActivityBottomSheetContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Modal Header */}
                            <View style={styles.editModalHeader}>
                                <Text style={styles.editModalTitle}>
                                    {editingActivity ? 'Edit Activity/Field Trip' : 'Add Activity/Field Trip'}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setIsEditModalOpen(false);
                                        setEditingActivity(null);
                                    }}
                                >
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Multi-Day Toggle */}
                            <View style={styles.multiDayToggle}>
                                <View style={styles.multiDayToggleContent}>
                                    <Ionicons name="calendar-outline" size={20} color={theme.colors.text} />
                                    <View style={styles.multiDayToggleText}>
                                        <Text style={styles.multiDayToggleLabel}>Multi-Day Event</Text>
                                        <Text style={styles.multiDayToggleDescription}>
                                            Enable this for events spanning multiple days
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={formData.is_multi_day}
                                    onValueChange={(checked) => {
                                        setFormData({
                                            ...formData,
                                            is_multi_day: checked,
                                            end_date: checked ? formData.end_date : '',
                                        });
                                    }}
                                />
                            </View>

                            {/* Date Fields */}
                            <View style={formData.is_multi_day ? styles.dateFieldsRow : {}}>
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>
                                        {formData.is_multi_day ? 'Start Date' : 'Event Date'}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.dateInputContainer}
                                        onPress={() => {
                                            const currentDate = formData.event_date
                                                ? new Date(formData.event_date + 'T00:00:00')
                                                : new Date();
                                            setSelectedDate(currentDate);
                                            setDatePickerField('event_date');
                                            setIsDatePickerOpen(true);
                                        }}
                                    >
                                        <Text style={[styles.dateInputText, !formData.event_date && styles.dateInputPlaceholder]}>
                                            {formData.event_date
                                                ? formatDateForDisplay(formData.event_date)
                                                : 'mm/dd/yyyy'}
                                        </Text>
                                        <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                                {formData.is_multi_day && (
                                    <View style={styles.formField}>
                                        <Text style={styles.formLabel}>End Date</Text>
                                        <TouchableOpacity
                                            style={styles.dateInputContainer}
                                            onPress={() => {
                                                const currentDate = formData.end_date
                                                    ? new Date(formData.end_date + 'T00:00:00')
                                                    : new Date();
                                                setSelectedDate(currentDate);
                                                setDatePickerField('end_date');
                                                setIsDatePickerOpen(true);
                                            }}
                                        >
                                            <Text style={[styles.dateInputText, !formData.end_date && styles.dateInputPlaceholder]}>
                                                {formData.end_date
                                                    ? formatDateForDisplay(formData.end_date)
                                                    : 'mm/dd/yyyy'}
                                            </Text>
                                            <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Duration Badge */}
                            {formData.is_multi_day && formData.event_date && formData.end_date && (
                                <View style={[styles.badge, styles.badgePrimary, styles.durationBadge]}>
                                    <Text style={styles.badgeText}>
                                        {calculateDays(formData.event_date, formData.end_date)}-Day Event
                                    </Text>
                                </View>
                            )}

                            {/* Title */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Title</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={formData.title}
                                    onChangeText={(text) => setFormData({ ...formData, title: text })}
                                    placeholder="Activity title"
                                />
                            </View>

                            {/* Activity Type */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Activity Type</Text>
                                <View style={styles.dropdownContainer}>
                                    <TouchableOpacity
                                        style={styles.formInput}
                                        onPress={() => {
                                            setIsActivityTypeDropdownOpen(!isActivityTypeDropdownOpen);
                                            setIsLocationTypeDropdownOpen(false);
                                        }}
                                    >
                                        <Text style={formData.activity_type ? styles.formInputText : styles.formInputPlaceholder}>
                                            {formData.activity_type
                                                ? formData.activity_type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                                                : 'Select activity type'}
                                        </Text>
                                        <Ionicons
                                            name={isActivityTypeDropdownOpen ? "chevron-up" : "chevron-down"}
                                            size={20}
                                            color={theme.colors.textSecondary}
                                        />
                                    </TouchableOpacity>

                                </View>
                            </View>

                            {/* Location Type */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Location Type</Text>
                                <View style={styles.dropdownContainer}>
                                    <TouchableOpacity
                                        style={styles.formInput}
                                        onPress={() => {
                                            setIsLocationTypeDropdownOpen(!isLocationTypeDropdownOpen);
                                            setIsActivityTypeDropdownOpen(false);
                                        }}
                                    >
                                        <Text style={formData.home_away ? styles.formInputText : styles.formInputPlaceholder}>
                                            {formData.home_away
                                                ? formData.home_away.toUpperCase()
                                                : 'Select location type (optional)'}
                                        </Text>
                                        <Ionicons
                                            name={isLocationTypeDropdownOpen ? "chevron-up" : "chevron-down"}
                                            size={20}
                                            color={theme.colors.textSecondary}
                                        />
                                    </TouchableOpacity>

                                </View>
                            </View>

                            {/* Divisions */}
                            <View style={styles.formField}>
                                <View style={styles.divisionsHeader}>
                                    <Text style={styles.formLabel}>Divisions (select multiple)</Text>
                                    <View style={styles.divisionsActions}>
                                        <TouchableOpacity
                                            style={styles.selectAllButton}
                                            onPress={() => {
                                                setFormData({
                                                    ...formData,
                                                    division_ids: MOCK_DIVISIONS.filter(d => d.id !== '1').map(d => d.id),
                                                });
                                            }}
                                        >
                                            <Text style={styles.selectAllButtonText}>Select All</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.selectAllButton}
                                            onPress={() => {
                                                setFormData({ ...formData, division_ids: [] });
                                            }}
                                        >
                                            <Text style={styles.selectAllButtonText}>Deselect All</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.divisionsList} nestedScrollEnabled>
                                    {MOCK_DIVISIONS.filter(d => d.id !== '1').map((division) => (
                                        <TouchableOpacity
                                            key={division.id}
                                            style={styles.divisionCheckbox}
                                            onPress={() => {
                                                const isSelected = formData.division_ids.includes(division.id);
                                                setFormData({
                                                    ...formData,
                                                    division_ids: isSelected
                                                        ? formData.division_ids.filter(id => id !== division.id)
                                                        : [...formData.division_ids, division.id],
                                                });
                                            }}
                                        >
                                            <Ionicons
                                                name={formData.division_ids.includes(division.id) ? 'checkbox' : 'checkbox-outline'}
                                                size={20}
                                                color={formData.division_ids.includes(division.id) ? theme.colors.secondary : theme.colors.textSecondary}
                                            />
                                            <Text style={styles.divisionCheckboxText}>{division.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </KeyboardAwareScrollView>
                            </View>

                            {/* Optional Fields */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Depart from Camp (optional)</Text>
                                <TouchableOpacity
                                    style={styles.formInput}
                                    onPress={() => openTimePicker('depart_from_camp')}
                                >
                                    <Text style={formData.depart_from_camp ? styles.formInputText : styles.formInputPlaceholder}>
                                        {formData.depart_from_camp ? formatTime(formData.depart_from_camp) : '--:-- --'}
                                    </Text>
                                    <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Depart from Activity (optional)</Text>
                                <TouchableOpacity
                                    style={styles.formInput}
                                    onPress={() => openTimePicker('depart_from_activity')}
                                >
                                    <Text style={formData.depart_from_activity ? styles.formInputText : styles.formInputPlaceholder}>
                                        {formData.depart_from_activity ? formatTime(formData.depart_from_activity) : '--:-- --'}
                                    </Text>
                                    <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Location (optional)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={formData.location}
                                    onChangeText={(text) => setFormData({ ...formData, location: text })}
                                    placeholder="Location"
                                />
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Capacity (optional)</Text>
                                <View style={styles.capacityStepper}>
                                    <TextInput
                                        style={styles.capacityInput}
                                        value={formData.capacity}
                                        onChangeText={(text) => {
                                            // Only allow numbers
                                            const numericValue = text.replace(/[^0-9]/g, '');
                                            setFormData({ ...formData, capacity: numericValue });
                                        }}
                                        placeholder="Maximum number of participants"
                                        keyboardType="numeric"
                                    />
                                    <View style={styles.capacityButtons}>
                                        <TouchableOpacity
                                            style={[styles.capacityButton, styles.capacityButtonTop]}
                                            onPress={() => {
                                                const current = parseInt(formData.capacity) || 0;
                                                setFormData({ ...formData, capacity: (current + 1).toString() });
                                            }}
                                        >
                                            <Ionicons name="chevron-up" size={16} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.capacityButton}
                                            onPress={() => {
                                                const current = parseInt(formData.capacity) || 0;
                                                if (current > 0) {
                                                    setFormData({ ...formData, capacity: (current - 1).toString() });
                                                }
                                            }}
                                        >
                                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Chaperone (optional)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={formData.chaperone}
                                    onChangeText={(text) => setFormData({ ...formData, chaperone: text })}
                                    placeholder="Staff member name"
                                />
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Description (optional)</Text>
                                <TextInput
                                    style={[styles.formInput, styles.formTextArea]}
                                    value={formData.description}
                                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                                    placeholder="Description"
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            {/* Meal Options */}
                            <View style={styles.mealOptionsSection}>
                                <Text style={styles.mealOptionsTitle}>Meal Options</Text>
                                {['Breakfast', 'Snack', 'Lunch', 'Dinner', 'Other'].map((meal) => (
                                    <TouchableOpacity
                                        key={meal}
                                        style={styles.mealOption}
                                        onPress={() => {
                                            const isSelected = formData.meal_options.includes(meal);
                                            setFormData({
                                                ...formData,
                                                meal_options: isSelected
                                                    ? formData.meal_options.filter(m => m !== meal)
                                                    : [...formData.meal_options, meal],
                                            });
                                        }}
                                    >
                                        <Ionicons
                                            name={formData.meal_options.includes(meal) ? 'checkbox' : 'checkbox-outline'}
                                            size={20}
                                            color={formData.meal_options.includes(meal) ? theme.colors.secondary : theme.colors.textSecondary}
                                        />
                                        <Text style={styles.mealOptionText}>{meal}</Text>
                                    </TouchableOpacity>
                                ))}
                                {formData.meal_options.includes('Other') && (
                                    <View style={styles.formField}>
                                        <Text style={styles.formLabel}>Meal Notes</Text>
                                        <TextInput
                                            style={[styles.formInput, styles.formTextArea]}
                                            value={formData.meal_notes}
                                            onChangeText={(text) => setFormData({ ...formData, meal_notes: text })}
                                            placeholder="e.g., Other location serves lunch"
                                            multiline
                                            numberOfLines={2}
                                        />
                                    </View>
                                )}
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.modalActions}>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.cancelButton,
                                        pressed && styles.cancelButtonPressed
                                    ]}
                                    onPress={() => {
                                        setIsEditModalOpen(false);
                                        setEditingActivity(null);
                                        setIsActivityTypeDropdownOpen(false);
                                        setIsLocationTypeDropdownOpen(false);
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </Pressable>
                                <TouchableOpacity
                                    style={styles.updateButton}
                                    onPress={() => {
                                        // Handle update
                                        setIsEditModalOpen(false);
                                        setEditingActivity(null);
                                        setIsActivityTypeDropdownOpen(false);
                                        setIsLocationTypeDropdownOpen(false);
                                    }}
                                >
                                    <Text style={styles.updateButtonText}>
                                        {editingActivity ? 'Update' : 'Add'} Activity
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAwareScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={isDeleteModalOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsDeleteModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.deleteModalContainer}>
                        <Text style={styles.deleteModalTitle}>Delete Activity/Field Trip</Text>
                        <Text style={styles.deleteModalMessage}>
                            Are you sure you want to delete this activity? This action cannot be undone.
                        </Text>
                        <View style={styles.deleteModalActions}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.deleteCancelButton,
                                    pressed && styles.deleteCancelButtonPressed
                                ]}
                                onPress={() => {
                                    setIsDeleteModalOpen(false);
                                    setActivityToDelete(null);
                                }}
                            >
                                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
                            </Pressable>
                            <TouchableOpacity
                                style={styles.deleteConfirmButton}
                                onPress={() => {
                                    // Handle delete
                                    setIsDeleteModalOpen(false);
                                    setActivityToDelete(null);
                                }}
                            >
                                <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Date Picker Modal */}
            <Modal
                visible={isDatePickerOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    setIsDatePickerOpen(false);
                    setDatePickerField(null);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.datePickerModal}>
                        <View style={styles.datePickerHeader}>
                            <Text style={styles.datePickerTitle}>Select Date</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsDatePickerOpen(false);
                                    setDatePickerField(null);
                                }}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.datePickerContent}>
                            {/* Month Selection */}
                            <View style={styles.datePickerColumn}>
                                <Text style={styles.datePickerLabel}>Month</Text>
                                <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                                        const isSelected = selectedDate.getMonth() + 1 === month;
                                        return (
                                            <TouchableOpacity
                                                key={month}
                                                style={[
                                                    styles.datePickerOption,
                                                    isSelected && styles.datePickerOptionSelected
                                                ]}
                                                onPress={() => {
                                                    const newDate = new Date(selectedDate);
                                                    newDate.setMonth(month - 1);
                                                    setSelectedDate(newDate);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.datePickerOptionText,
                                                    isSelected && styles.datePickerOptionTextSelected
                                                ]}>
                                                    {monthNames[month - 1]}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </KeyboardAwareScrollView>
                            </View>

                            {/* Day Selection */}
                            <View style={styles.datePickerColumn}>
                                <Text style={styles.datePickerLabel}>Day</Text>
                                <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                                        const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
                                        const isSelected = selectedDate.getDate() === day;
                                        const isValid = day <= daysInMonth;
                                        return (
                                            <TouchableOpacity
                                                key={day}
                                                style={[
                                                    styles.datePickerOption,
                                                    isSelected && styles.datePickerOptionSelected,
                                                    !isValid && styles.datePickerOptionDisabled
                                                ]}
                                                onPress={() => {
                                                    if (isValid) {
                                                        const newDate = new Date(selectedDate);
                                                        newDate.setDate(day);
                                                        setSelectedDate(newDate);
                                                    }
                                                }}
                                                disabled={!isValid}
                                            >
                                                <Text style={[
                                                    styles.datePickerOptionText,
                                                    isSelected && styles.datePickerOptionTextSelected,
                                                    !isValid && styles.datePickerOptionTextDisabled
                                                ]}>
                                                    {day}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </KeyboardAwareScrollView>
                            </View>

                            {/* Year Selection */}
                            <View style={styles.datePickerColumn}>
                                <Text style={styles.datePickerLabel}>Year</Text>
                                <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => {
                                        const isSelected = selectedDate.getFullYear() === year;
                                        return (
                                            <TouchableOpacity
                                                key={year}
                                                style={[
                                                    styles.datePickerOption,
                                                    isSelected && styles.datePickerOptionSelected
                                                ]}
                                                onPress={() => {
                                                    const newDate = new Date(selectedDate);
                                                    newDate.setFullYear(year);
                                                    // Adjust day if it's invalid for the new year/month
                                                    const daysInMonth = new Date(year, newDate.getMonth() + 1, 0).getDate();
                                                    if (newDate.getDate() > daysInMonth) {
                                                        newDate.setDate(daysInMonth);
                                                    }
                                                    setSelectedDate(newDate);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.datePickerOptionText,
                                                    isSelected && styles.datePickerOptionTextSelected
                                                ]}>
                                                    {year}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </KeyboardAwareScrollView>
                            </View>
                        </View>

                        {/* Selected Date Display */}
                        <View style={styles.datePickerDisplay}>
                            <Text style={styles.datePickerDisplayText}>
                                {formatDateForDisplay(formatDateForStorage(selectedDate))}
                            </Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.datePickerActions}>
                            <TouchableOpacity
                                style={styles.datePickerCancelButton}
                                onPress={() => {
                                    setIsDatePickerOpen(false);
                                    setDatePickerField(null);
                                }}
                            >
                                <Text style={styles.datePickerCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.datePickerConfirmButton}
                                onPress={() => {
                                    if (datePickerField) {
                                        const dateString = formatDateForStorage(selectedDate);
                                        setFormData({ ...formData, [datePickerField]: dateString });
                                    }
                                    setIsDatePickerOpen(false);
                                    setDatePickerField(null);
                                }}
                            >
                                <Text style={styles.datePickerConfirmButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* CSV Upload Format Guide Modal */}
            <Modal
                visible={isHelpModalOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsHelpModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.helpModalContainer}>
                        {/* Header */}
                        <View style={styles.helpModalHeader}>
                            <Text style={styles.helpModalTitle}>CSV Upload Format Guide</Text>
                            <TouchableOpacity
                                style={styles.helpModalCloseButton}
                                onPress={() => setIsHelpModalOpen(false)}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Tabs */}
                        <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled"
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.helpModalTabs}
                            contentContainerStyle={styles.helpModalTabsContent}
                        >
                            {['Children', 'Staff', 'Medications', 'Trips', 'Menu', 'Awards', 'Daily Notes', 'Incidents', 'Calendar', 'Sports'].map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[
                                        styles.helpModalTab,
                                        helpModalTab === tab && styles.helpModalTabActive
                                    ]}
                                    onPress={() => setHelpModalTab(tab)}
                                >
                                    <Text style={[
                                        styles.helpModalTabText,
                                        helpModalTab === tab && styles.helpModalTabTextActive
                                    ]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </KeyboardAwareScrollView>

                        {/* Content */}
                        <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.helpModalContent}>
                            {helpModalTab === 'Trips' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Activities & Field Trips</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for activities and field trips upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        title, event_date, end_date, is_multi_day, activity_type, home_away, division_ids, depart_from_camp, depart_from_activity, location, capacity, chaperone, description, meal_options
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        Junior Hershey Trip, 2026-07-28, 2026-07-29, true, field-trip, away, ["1","2"], 08:00, 18:00, Hershey Park, 50, John Doe, Fun trip to Hershey Park, ["Lunch","Dinner"]
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ division_ids must be an array of valid division IDs</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ event_date and end_date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ is_multi_day: true or false</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ home_away: "home" or "away"</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ meal_options must be an array (e.g., ["Breakfast","Lunch"])</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use backslash before commas within text fields (e.g., "Item 1\, Item 2")</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Leave fields empty for optional columns</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Dates must be in YYYY-MM-DD format</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Time format: HH:MM (24-hour format)</Text>
                                </View>
                            )}
                            {helpModalTab === 'Staff' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Staff Directory</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for staff directory upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        name, email, phone, role, department, hire_date, leader_id, status, season
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        Jane Smith, jane@thenest.com, 555-9876, Counselor, Activities, 2024-01-15, {"<leader_id>"}, active, Summer 2024
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ leader_id must be a valid UUID from staff table</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ hire_date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use backslash before commas within text fields (e.g., "Item 1\, Item 2")</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Leave fields empty for optional columns</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Dates must be in YYYY-MM-DD format</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ UUIDs can be obtained from the backend for existing records</Text>
                                </View>
                            )}
                            {helpModalTab === 'Children' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Children Directory</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for children/camper directory upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        name, date_of_birth, gender, division_id, parent_name, parent_email, parent_phone, medical_notes, dietary_restrictions
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        John Doe, 2010-05-15, male, 1, Jane Doe, jane@example.com, 555-1234, None, Vegetarian
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ division_id must be a valid division ID</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ date_of_birth format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Dates must be in YYYY-MM-DD format</Text>
                                </View>
                            )}
                            {helpModalTab === 'Medications' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Medications</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for medications upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        camper_id, medication_name, dosage, frequency, start_date, end_date, notes
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        1, Advil, 200mg, Twice daily, 2024-07-01, 2024-08-31, Take with food
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ camper_id must be a valid camper ID</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                </View>
                            )}
                            {helpModalTab === 'Menu' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Menu</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for menu upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        date, meal_type, item_name, description, dietary_tags
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        2024-07-15, Lunch, Grilled Chicken, Delicious grilled chicken with sides, ["Gluten-Free","Dairy-Free"]
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ meal_type: Breakfast, Lunch, Dinner, or Snack</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                </View>
                            )}
                            {helpModalTab === 'Awards' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Awards</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for awards upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        camper_id, award_name, award_date, category, description
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        1, Camper of the Week, 2024-07-20, Recognition, Outstanding behavior
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ camper_id must be a valid camper ID</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                </View>
                            )}
                            {helpModalTab === 'Daily Notes' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Daily Notes</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for daily notes upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        camper_id, date, note_type, content, staff_id
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        1, 2024-07-15, General, Had a great day at the pool, 5
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ camper_id and staff_id must be valid IDs</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                </View>
                            )}
                            {helpModalTab === 'Incidents' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Incidents</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for incident reports upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        date, time, camper_id, incident_type, description, severity, staff_id
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        2024-07-15, 14:30, 1, Minor Injury, Scraped knee during activity, Low, 5
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ camper_id and staff_id must be valid IDs</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Time format: HH:MM</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                </View>
                            )}
                            {helpModalTab === 'Calendar' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Calendar Events</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for calendar events upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        title, event_date, end_date, event_type, description, location
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        Camp Fire, 2024-07-20, 2024-07-20, Event, Evening campfire with songs, Main Field
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                </View>
                            )}
                            {helpModalTab === 'Sports' && (
                                <View>
                                    <Text style={styles.helpModalHeading}>Sports</Text>
                                    <Text style={styles.helpModalDescription}>
                                        CSV format for sports activities upload
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Required Columns (first row):</Text>
                                    <Text style={styles.helpModalCode}>
                                        sport_name, date, time, location, division_ids, coach_id
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Example Data Row:</Text>
                                    <Text style={styles.helpModalCode}>
                                        Basketball, 2024-07-15, 10:00, Gym, ["1","2"], 5
                                    </Text>
                                    <Text style={styles.helpModalLabel}>Important Notes:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ division_ids must be an array of valid division IDs</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ coach_id must be a valid staff ID</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Date format: YYYY-MM-DD</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Time format: HH:MM</Text>
                                    <Text style={styles.helpModalLabel}>General Tips:</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ First row must contain column names exactly as shown</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Use commas to separate values</Text>
                                    <Text style={styles.helpModalBullet}>â€¢ Maximum 1000 rows per upload</Text>
                                </View>
                            )}
                        </KeyboardAwareScrollView>
                    </View>
                </View>
            </Modal>

            {/* Time Picker Modal */}
            <Modal
                visible={isTimePickerOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    setIsTimePickerOpen(false);
                    setTimePickerField(null);
                }}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => {
                        setIsTimePickerOpen(false);
                        setTimePickerField(null);
                    }}
                >
                    <Pressable
                        style={styles.bottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={[styles.timePickerHeader, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                            <Text style={styles.bottomSheetTitle}>Select Time</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsTimePickerOpen(false);
                                    setTimePickerField(null);
                                }}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.timePickerContent}>
                            {/* Hour Selection */}
                            <View style={styles.timePickerColumn}>
                                <Text style={styles.timePickerLabel}>Hour</Text>
                                <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.timePickerScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                                        <TouchableOpacity
                                            key={hour}
                                            style={[
                                                styles.timePickerOption,
                                                selectedTime.hour === hour && styles.timePickerOptionSelected
                                            ]}
                                            onPress={() => setSelectedTime({ ...selectedTime, hour })}
                                        >
                                            <Text style={[
                                                styles.timePickerOptionText,
                                                selectedTime.hour === hour && styles.timePickerOptionTextSelected
                                            ]}>
                                                {hour}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </KeyboardAwareScrollView>
                            </View>

                            {/* Minute Selection */}
                            <View style={styles.timePickerColumn}>
                                <Text style={styles.timePickerLabel}>Minute</Text>
                                <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.timePickerScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                    {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                                        <TouchableOpacity
                                            key={minute}
                                            style={[
                                                styles.timePickerOption,
                                                selectedTime.minute === minute && styles.timePickerOptionSelected
                                            ]}
                                            onPress={() => setSelectedTime({ ...selectedTime, minute })}
                                        >
                                            <Text style={[
                                                styles.timePickerOptionText,
                                                selectedTime.minute === minute && styles.timePickerOptionTextSelected
                                            ]}>
                                                {minute.toString().padStart(2, '0')}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </KeyboardAwareScrollView>
                            </View>

                            {/* AM/PM Selection */}
                            <View style={styles.timePickerColumn}>
                                <Text style={styles.timePickerLabel}>Period</Text>
                                <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.timePickerScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                    {['AM', 'PM'].map((period) => (
                                        <TouchableOpacity
                                            key={period}
                                            style={[
                                                styles.timePickerOption,
                                                selectedTime.ampm === period && styles.timePickerOptionSelected
                                            ]}
                                            onPress={() => setSelectedTime({ ...selectedTime, ampm: period })}
                                        >
                                            <Text style={[
                                                styles.timePickerOptionText,
                                                selectedTime.ampm === period && styles.timePickerOptionTextSelected
                                            ]}>
                                                {period}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </KeyboardAwareScrollView>
                            </View>
                        </View>

                        {/* Selected Time Display */}
                        <View style={styles.timePickerDisplay}>
                            <Text style={styles.timePickerDisplayText}>
                                {selectedTime.hour}:{selectedTime.minute.toString().padStart(2, '0')} {selectedTime.ampm}
                            </Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.timePickerActions}>
                            <TouchableOpacity
                                style={styles.timePickerCancelButton}
                                onPress={() => {
                                    setIsTimePickerOpen(false);
                                    setTimePickerField(null);
                                }}
                            >
                                <Text style={styles.timePickerCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.timePickerConfirmButton}
                                onPress={confirmTimeSelection}
                            >
                                <Text style={styles.timePickerConfirmButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
            {renderActionSheetModal()}
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    headerTitle: {
        ...theme.typography.h2,
        fontSize: 20,
    },
    headerSubtitle: {
        ...theme.typography.bodySmall,
        marginTop: 4,
        color: theme.colors.textSecondary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.md,
    },
    controlsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    controlsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flex: 1,
        flexWrap: 'wrap',
    },
    divisionFilterContainer: {
        minWidth: 150,
    },
    sortButton: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    sortButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    divisionDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 40,
    },
    divisionText: {
        ...theme.typography.body,
        fontSize: 14,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    viewToggle: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
    },
    viewToggleButton: {
        padding: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
    },
    viewToggleButtonActive: {
        backgroundColor: theme.colors.accent,
    },
    iconButton: {
        padding: theme.spacing.sm,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: theme.colors.textSecondary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    uploadButtonText: {
        color: theme.colors.surface,
        fontSize: 14,
        fontWeight: '500',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    addButtonText: {
        color: theme.colors.surface,
        fontSize: 14,
        fontWeight: '600',
    },
    calendarCard: {
        padding: 0,
        overflow: 'hidden',
    },
    calendarNavigation: {
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    calendarNavTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    calendarNavLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        flexShrink: 1,
    },
    navButton: {
        padding: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    navButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.secondary,
    },
    monthYearText: {
        ...theme.typography.h3,
        fontSize: 16,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: theme.spacing.sm,
    },
    viewOptionsScroll: {
        maxHeight: 40,
    },
    viewOptionsContainer: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
        paddingRight: theme.spacing.md,
    },
    viewOptions: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
    },
    viewOptionButton: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: theme.colors.background,
        minWidth: 60,
    },
    viewOptionButtonActive: {
        backgroundColor: theme.colors.secondary,
    },
    viewOptionText: {
        ...theme.typography.body,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    viewOptionTextActive: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    calendarGrid: {
        padding: theme.spacing.md,
    },
    weekDayRow: {
        flexDirection: 'row',
        marginBottom: theme.spacing.sm,
    },
    weekDayHeader: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: theme.spacing.xs,
    },
    weekDayText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    calendarDaysContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calendarDay: {
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    calendarDayOtherMonth: {
        backgroundColor: theme.colors.background,
    },
    calendarDaySelected: {
        backgroundColor: '#dbeafe', // Light blue
        borderColor: theme.colors.secondary,
    },
    calendarDayToday: {
        backgroundColor: '#f0f9ff', // Very light blue
    },
    calendarDayText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    calendarDayTextOtherMonth: {
        color: theme.colors.textSecondary,
        opacity: 0.5,
    },
    calendarDayTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    calendarDayTextToday: {
        color: theme.colors.secondary,
    },
    emptyText: {
        ...theme.typography.body,
        textAlign: 'center',
        color: theme.colors.textSecondary,
        padding: theme.spacing.xl,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdownModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        width: '80%',
        maxHeight: '60%',
        ...theme.shadows.card,
    },
    dropdownScroll: {
        maxHeight: 400,
    },
    dropdownItem: {
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dropdownItemSelected: {
        backgroundColor: '#eff6ff',
    },
    dropdownItemText: {
        ...theme.typography.body,
        fontSize: 14,
    },
    dropdownItemTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    // Week view styles
    weekViewContainer: {
        flex: 1,
        maxHeight: 600,
    },
    weekDayHeadersContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    timeColumnHeader: {
        width: 80,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
    },
    weekScrollView: {
        flex: 1,
    },
    weekDayHeadersRow: {
        flexDirection: 'row',
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    weekDayHeaderCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    weekDayHeaderCellToday: {
        backgroundColor: '#dbeafe', // Light blue
    },
    weekDayHeaderText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    weekDayHeaderDate: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    weekDayHeaderDateToday: {
        color: theme.colors.secondary,
    },
    weekTimeGrid: {
        flexDirection: 'row',
    },
    timeColumn: {
        width: 80,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
    },
    timeSlot: {
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingRight: theme.spacing.sm,
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        paddingTop: theme.spacing.xs,
    },
    timeSlotText: {
        ...theme.typography.bodySmall,
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    weekDayColumns: {
        flexDirection: 'row',
        flex: 1,
    },
    weekDayColumn: {
        flex: 1,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
    },
    weekDayColumnToday: {
        backgroundColor: '#f0f9ff', // Very light blue
    },
    weekTimeCell: {
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    // Day view styles
    dayViewContainer: {
        flex: 1,
        maxHeight: 600,
    },
    dayHeaderContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dayHeaderCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    dayHeaderCellToday: {
        backgroundColor: '#dbeafe', // Light blue
    },
    dayHeaderText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    dayHeaderDate: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    dayHeaderDateToday: {
        color: theme.colors.secondary,
    },
    dayScrollView: {
        flex: 1,
    },
    dayTimeGrid: {
        flexDirection: 'row',
    },
    dayColumn: {
        flex: 1,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
    },
    dayColumnToday: {
        backgroundColor: '#f0f9ff', // Very light blue
    },
    // Agenda view styles
    agendaViewContainer: {
        flex: 1,
        minHeight: 400,
        padding: theme.spacing.xl,
    },
    agendaEmptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    agendaEmptyText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    // List view styles
    listViewContainer: {
        gap: theme.spacing.lg,
    },
    monthGroup: {
        marginBottom: theme.spacing.lg,
    },
    monthHeader: {
        ...theme.typography.h2,
        fontSize: 20,
        marginBottom: theme.spacing.md,
        color: theme.colors.text,
    },
    activitiesList: {
        gap: theme.spacing.md,
    },
    activityCard: {
        padding: theme.spacing.md,
    },
    activityCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.sm,
    },
    activityCardTitleContainer: {
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    activityCardTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        marginBottom: theme.spacing.xs,
        color: theme.colors.text,
    },
    activityCardDate: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    activityCardActions: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
    },
    actionIconButton: {
        padding: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    actionIconButtonPressed: {
        backgroundColor: '#f3f4f6', // Light gray background on press
    },
    activityCardBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
    },
    badge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    badgePrimary: {
        backgroundColor: theme.colors.secondary,
    },
    badgeSecondary: {
        backgroundColor: '#e0e7ff', // Light blue
    },
    badgeOutline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    badgeText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.surface,
        fontWeight: '500',
    },
    badgeTextOutline: {
        color: theme.colors.textSecondary,
    },
    badgeTextSecondary: {
        color: theme.colors.text,
    },
    // Edit Modal Styles
    editModalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '90%',
        maxHeight: '90%',
        ...theme.shadows.card,
    },
    editModalScroll: {
        maxHeight: '90%',
    },
    editModalContent: {
        padding: theme.spacing.lg,
    },
    editModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    editModalTitle: {
        ...theme.typography.h2,
        fontSize: 20,
    },
    multiDayToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
    },
    multiDayToggleContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flex: 1,
    },
    multiDayToggleText: {
        flex: 1,
    },
    multiDayToggleLabel: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
    },
    multiDayToggleDescription: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    dateFieldsRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    formField: {
        marginBottom: theme.spacing.md,
    },
    formLabel: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '500',
        marginBottom: theme.spacing.xs,
        color: theme.colors.text,
    },
    formInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 40,
    },
    formInputText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    formInputPlaceholder: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    dropdownContainer: {
        zIndex: 10,
    },
    dropdownList: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.xs,
        maxHeight: 200,
        ...theme.shadows.card,
        elevation: 5, // For Android shadow
    },
    dropdownItemForm: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dropdownItemFormSelected: {
        backgroundColor: '#fff7ed', // Orange tint for selected/hovered item
    },
    dropdownItemFormText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    dropdownItemFormTextSelected: {
        color: theme.colors.text,
        fontWeight: '500',
    },
    formTextInput: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 40,
        fontSize: 14,
        color: theme.colors.text,
    },
    formTextArea: {
        minHeight: 80,
        textAlignVertical: 'top',
        paddingTop: theme.spacing.sm,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    durationBadge: {
        alignSelf: 'flex-start',
        marginBottom: theme.spacing.md,
    },
    divisionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    divisionsActions: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
    },
    selectAllButton: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.sm,
    },
    selectAllButtonText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.text,
    },
    divisionsList: {
        maxHeight: 200,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
    },
    divisionCheckbox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
    },
    divisionCheckboxText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    mealOptionsSection: {
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    mealOptionsTitle: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: theme.spacing.sm,
    },
    mealOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
    },
    mealOptionText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    cancelButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    cancelButtonPressed: {
        backgroundColor: theme.colors.accent, // Orange color on press
    },
    cancelButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    updateButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    updateButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.surface,
    },
    // Time Picker Styles
    timePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timePickerModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '85%',
        maxWidth: 400,
        ...theme.shadows.card,
        elevation: 5,
    },
    timePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    timePickerTitle: {
        ...theme.typography.h2,
        fontSize: 18,
    },
    timePickerContent: {
        flexDirection: 'row',
        padding: theme.spacing.md,
        maxHeight: 300,
    },
    timePickerColumn: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: theme.spacing.xs,
    },
    timePickerLabel: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    timePickerScroll: {
        width: '100%',
        maxHeight: 200,
    },
    timePickerOption: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.sm,
        marginVertical: theme.spacing.xs,
        alignItems: 'center',
        minWidth: 60,
    },
    timePickerOptionSelected: {
        backgroundColor: theme.colors.secondary,
    },
    timePickerOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },
    timePickerOptionTextSelected: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    timePickerDisplay: {
        padding: theme.spacing.md,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    timePickerDisplayText: {
        ...theme.typography.h2,
        fontSize: 24,
        color: theme.colors.text,
    },
    timePickerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
    },
    timePickerCancelButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    timePickerCancelButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    timePickerConfirmButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    timePickerConfirmButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.surface,
    },
    // Capacity Stepper Styles
    capacityStepper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
    },
    capacityInput: {
        flex: 1,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 40,
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    capacityButtons: {
        flexDirection: 'column',
        borderLeftWidth: 1,
        borderLeftColor: theme.colors.border,
    },
    capacityButton: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 40,
        backgroundColor: theme.colors.background,
    },
    capacityButtonTop: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    // Date Input Styles
    dateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 40,
    },
    dateInputText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    dateInputPlaceholder: {
        color: theme.colors.textSecondary,
    },
    // Date Picker Modal Styles
    datePickerModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '90%',
        maxWidth: 500,
        maxHeight: '80%',
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    datePickerTitle: {
        ...theme.typography.h2,
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    datePickerContent: {
        flexDirection: 'row',
        padding: theme.spacing.md,
        maxHeight: 300,
    },
    datePickerColumn: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: theme.spacing.xs,
    },
    datePickerLabel: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    datePickerScroll: {
        width: '100%',
        maxHeight: 250,
    },
    datePickerOption: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.sm,
        marginVertical: theme.spacing.xs,
        alignItems: 'center',
        minWidth: 60,
    },
    datePickerOptionSelected: {
        backgroundColor: theme.colors.secondary,
    },
    datePickerOptionDisabled: {
        opacity: 0.3,
    },
    datePickerOptionText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    datePickerOptionTextSelected: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    datePickerOptionTextDisabled: {
        color: theme.colors.textSecondary,
    },
    datePickerDisplay: {
        padding: theme.spacing.md,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    datePickerDisplayText: {
        ...theme.typography.h2,
        fontSize: 20,
        color: theme.colors.text,
    },
    datePickerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
    },
    datePickerCancelButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    datePickerCancelButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    datePickerConfirmButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    datePickerConfirmButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    // Delete Modal Styles
    deleteModalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        width: '90%',
        maxWidth: 500,
    },
    deleteModalTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    deleteModalMessage: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        lineHeight: 20,
    },
    deleteModalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.sm,
    },
    deleteCancelButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    deleteCancelButtonPressed: {
        backgroundColor: theme.colors.accent, // Orange color on press
    },
    deleteCancelButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    deleteConfirmButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    deleteConfirmButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    // Help Modal Styles
    helpModalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '95%',
        maxWidth: 800,
        maxHeight: '85%',
        overflow: 'hidden',
        alignSelf: 'center',
    },
    helpModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    helpModalTitle: {
        ...theme.typography.h2,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    helpModalCloseButton: {
        padding: theme.spacing.xs,
        minWidth: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    helpModalTabs: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    helpModalTabsContent: {
        paddingHorizontal: theme.spacing.sm,
    },
    helpModalTab: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
        marginRight: theme.spacing.xs,
    },
    helpModalTabActive: {
        borderBottomColor: theme.colors.secondary,
    },
    helpModalTabText: {
        ...theme.typography.body,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    helpModalTabTextActive: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    helpModalContent: {
        padding: theme.spacing.md,
        maxHeight: 400,
    },
    helpModalHeading: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    helpModalDescription: {
        ...theme.typography.body,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
        lineHeight: 18,
    },
    helpModalLabel: {
        ...theme.typography.body,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    helpModalCode: {
        ...theme.typography.body,
        fontSize: 11,
        fontFamily: 'monospace',
        color: theme.colors.text,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
        marginBottom: theme.spacing.sm,
        overflow: 'hidden',
        flexWrap: 'wrap',
    },
    helpModalBullet: {
        ...theme.typography.body,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
        paddingLeft: theme.spacing.sm,
        lineHeight: 18,
    },
    // Bottom Sheet Styles
    bottomSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        maxHeight: '40%',
    },
    divisionBottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        maxHeight: '60%',
    },
    divisionBottomSheetScroll: {
        maxHeight: 400,
    },
    bottomSheetHeader: {
        marginBottom: theme.spacing.lg,
    },
    bottomSheetTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    bottomSheetContent: {
        gap: theme.spacing.md,
    },
    bottomSheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
    },
    bottomSheetOptionSelected: {
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
    },
    bottomSheetOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },
    bottomSheetOptionTextSelected: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    // Add Activity Bottom Sheet Styles
    addActivityBottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '90%',
        paddingBottom: theme.spacing.xl,
    },
    addActivityBottomSheetScroll: {
        // removed flex: 1 to prevent collapse on mobile
    },
    addActivityBottomSheetContent: {
        paddingHorizontal: theme.spacing.md,
    },
    addActivityBottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        marginBottom: theme.spacing.md,
    },
    addActivityBottomSheetTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    addActivityFormContent: {
        gap: theme.spacing.md,
    },
    addActivityBottomSheetActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    addActivityCancelButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    addActivityCancelButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    addActivitySaveButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    addActivitySaveButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    // Edit Activity Bottom Sheet Styles
    editActivityBottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '90%',
        paddingBottom: theme.spacing.xl,
    },
    editActivityBottomSheetScroll: {
        // removed flex: 1 to prevent collapse on mobile
    },
    editActivityBottomSheetContent: {
        padding: theme.spacing.lg,
    },
    // Centered Modal Styles
    centeredOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.md,
        zIndex: 1000,
    },
    centeredModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '100%',
        maxWidth: 600,
        maxHeight: '90%',
        ...theme.shadows.card,
        elevation: 5,
        overflow: 'hidden',
    },
});

