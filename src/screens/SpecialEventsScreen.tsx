import React, { useState, useMemo } from 'react';
import {
    Alert,
    ActivityIndicator,
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    FlatList,
    Pressable,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { useDivisions } from '../api/campers';
import { useSpecialEvents, useAddSpecialEvent, useUpdateSpecialEvent } from '../api/calendar_events';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface SpecialEventsScreenProps {
    navigation: any;
}

const EVENT_TYPES = [
    'Special Event',
    'Evening Activity',
    'Campfire',
    'Movie Night',
    'Talent Show',
    'Game Night',
    'Other',
];

const EMOJI_PRESETS = ['🌙', '🏕️', '🎪', '⚽', '🏆', '🎯', '🚌', '🎨', '🎭', '🎵', '📸', '🍕'];

const HELP_CONTENT: Record<string, { title: string, subtitle: string, columns: string, example: string, notes?: string }> = {
    'Children': {
        title: 'Children Directory',
        subtitle: 'CSV format for children/camper directory upload',
        columns: 'first_name, last_name, dob, grade, division, parent_email, emergency_contact, allergies, medications',
        example: 'John, Doe, 2015-05-20, 5th, Junior Boys, parent@example.com, 555-0123, Peanuts, None',
        notes: 'dob format: YYYY-MM-DD'
    },
    'Staff': {
        title: 'Staff Directory',
        subtitle: 'CSV format for staff directory upload',
        columns: 'name, email, phone, role, department, hire_date, leader_id, status, season',
        example: 'Jane Smith, jane@thenest.com, 555-9876, Counselor, Activities, 2024-01-15, <leader_id>, active, Summer 2024',
        notes: 'leader_id must be a valid UUID from staff table. hire_date format: YYYY-MM-DD'
    },
    'Medications': {
        title: 'Medications List',
        subtitle: 'CSV format for camper medications',
        columns: 'camper_id, medication_name, dosage, frequency, time_of_day, instructions',
        example: '<camper_uuid>, Ibuprofen, 200mg, As needed, Morning, Take with food',
        notes: 'camper_id must be valid UUID'
    },
    'Trips': {
        title: 'Field Trips',
        subtitle: 'CSV format for scheduled trips',
        columns: 'trip_name, destination, date, division, cost, transport_mode, max_capacity',
        example: 'Zoo Visit, City Zoo, 2026-07-15, Junior Girls, 25.00, Bus, 40',
        notes: 'date format: YYYY-MM-DD'
    },
    'Menu': {
        title: 'Dining Menu',
        subtitle: 'CSV format for daily meals',
        columns: 'date, meal_type, main_dish, side_dish, vegetarian_option, dessert',
        example: '2026-07-10, Lunch, Grilled Chicken, Rice, Tofu Stir-fry, Brownie',
    },
    'Awards': {
        title: 'Awards & Achievements',
        subtitle: 'CSV format for camper awards',
        columns: 'award_name, description, criteria, date_awarded, recipient_id',
        example: 'Best Swimmer, Completed 10 laps, Swimming proficiency, 2026-07-20, <camper_uuid>',
    },
    'Daily Notes': {
        title: 'Daily Notes',
        subtitle: 'CSV format for daily camper/cabin notes',
        columns: 'date, division, cabin, note_text, author, importance',
        example: '2026-07-11, Junior Boys, Cabin 3, Everyone brushed teeth, Counselor Bob, Normal',
    },
    'Incidents': {
        title: 'Incident Reports',
        subtitle: 'CSV format for incident logging',
        columns: 'date, time, location, persons_involved, description, action_taken, staff_witness',
        example: '2026-07-12, 14:30, Pool, Billy Doe, Slipped on deck, First aid applied, Lifeguard Sarah',
    },
    'Calendar': {
        title: 'Camp Calendar',
        subtitle: 'CSV format for general calendar events',
        columns: 'event_name, start_date, end_date, location, description, is_all_day',
        example: 'Color War, 2026-08-01, 2026-08-03, Campgrounds, Annual Color War competition, true',
    },
    'Sports': {
        title: 'Sports Schedule',
        subtitle: 'CSV format for sports matches and practices',
        columns: 'sport_name, team_a, team_b, date, time, location, referee',
        example: 'Soccer, Cabin 1, Cabin 2, 2026-07-14, 15:00, Field A, Coach Mike',
    },
};

export const SpecialEventsScreen = ({ navigation }: SpecialEventsScreenProps) => {
    const { companyId, season } = useCompany();
    const queryClient = useQueryClient();
    const { data: divisionsData = [] } = useDivisions(companyId);
    const { data: specialEventsData = [], isLoading: isLoadingEvents } = useSpecialEvents(companyId, season);
    const addSpecialEventMutation = useAddSpecialEvent();
    const updateSpecialEventMutation = useUpdateSpecialEvent();

    const [showHelpModal, setShowHelpModal] = useState(false);
    const [selectedHelpTab, setSelectedHelpTab] = useState('Staff');

    const HELP_TABS = [
        'Children', 'Staff', 'Medications', 'Trips', 'Menu', 'Awards', 'Daily Notes', 'Incidents', 'Calendar', 'Sports'
    ];
    const today = new Date();
    const initialDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
    const [showAddEventModal, setShowAddEventModal] = useState(false);
    const [showUploadCSVModal, setShowUploadCSVModal] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    const [timePickerField, setTimePickerField] = useState<'startTime' | 'endTime' | null>(null);
    const [selectedTime, setSelectedTime] = useState({ hour: 12, minute: 0, ampm: 'PM' });

    // Add Event Modal States
    const [eventDate, setEventDate] = useState(initialDate);
    const [title, setTitle] = useState('');
    const [eventType, setEventType] = useState('');
    const [emoji, setEmoji] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [staffSearchQuery, setStaffSearchQuery] = useState('');
    const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
    const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);
    const [showEventDatePicker, setShowEventDatePicker] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<any>(null);
    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { data: staffData = [] } = useQuery({
        queryKey: ['special_events_staff', companyId, season],
        queryFn: async () => {
            if (!companyId || !season) return [];
            const { data, error } = await supabase
                .from('staff')
                .select('id, name, role')
                .eq('company_id', companyId)
                .eq('season', season)
                .order('name', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId && !!season,
    });

    // Date picker state
    const [datePickerMonth, setDatePickerMonth] = useState(new Date().getMonth());
    const [datePickerYear, setDatePickerYear] = useState(new Date().getFullYear());
    const [eventDatePickerMonth, setEventDatePickerMonth] = useState(new Date().getMonth());
    const [eventDatePickerYear, setEventDatePickerYear] = useState(new Date().getFullYear());

    const filteredEvents = useMemo(() => {
        let filtered = specialEventsData || [];
        if (selectedDate) {
            const parts = selectedDate.split('/');
            const selectedIso = parts.length === 3 ? `${parts[2]}-${parts[0]}-${parts[1]}` : selectedDate;
            filtered = filtered.filter((event: any) => event.event_date === selectedIso);
        }
        if (selectedDivision !== 'All Divisions') {
            filtered = filtered.filter((event: any) => {
                const eventDivisionIds = Array.isArray(event.divisions)
                    ? event.divisions.map((d: any) => d.id)
                    : [];
                return eventDivisionIds.includes(selectedDivision);
            });
        }
        return filtered;
    }, [specialEventsData, selectedDivision, selectedDate]);

    const groupedEvents = useMemo(() => {
        return filteredEvents.reduce((acc: Record<string, any[]>, event: any) => {
            const date = event.event_date || '';
            if (!acc[date]) acc[date] = [];
            acc[date].push(event);
            return acc;
        }, {});
    }, [filteredEvents]);

    const filteredStaff = useMemo(() => {
        if (!staffSearchQuery.trim()) return staffData;
        const term = staffSearchQuery.toLowerCase();
        return staffData.filter((s: any) => (s.name || '').toLowerCase().includes(term));
    }, [staffData, staffSearchQuery]);

    const selectedStaff = useMemo(
        () => staffData.filter((s: any) => selectedStaffIds.includes(s.id)),
        [staffData, selectedStaffIds]
    );

    // Reuse date formatting function
    const formatDate = (date: Date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    const handleDateSelect = (date: Date, type: 'filter' | 'event') => {
        const formatted = formatDate(date);
        if (type === 'filter') {
            setSelectedDate(formatted);
            setShowDatePicker(false);
        } else {
            setEventDate(formatted);
            setShowEventDatePicker(false);
        }
    };

    // Reuse date picker render function
    const renderDatePicker = (
        type: 'filter' | 'event',
        visible: boolean,
        onClose: () => void
    ) => {
        const currentMonth = type === 'filter' ? datePickerMonth : eventDatePickerMonth;
        const currentYear = type === 'filter' ? datePickerYear : eventDatePickerYear;
        const setCurrentMonth = type === 'filter' ? setDatePickerMonth : setEventDatePickerMonth;
        const setCurrentYear = type === 'filter' ? setDatePickerYear : setEventDatePickerYear;
        const today = new Date();
        const selectedDateValue = type === 'filter' ? selectedDate : eventDate;

        const MONTH_NAMES = [
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

        return (
            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={onClose}
                >
                    <View style={styles.datePickerBottomSheet} onStartShouldSetResponder={() => true}>
                        <View style={styles.datePickerHeader}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (currentMonth === 0) {
                                        setCurrentMonth(11);
                                        setCurrentYear(currentYear - 1);
                                    } else {
                                        setCurrentMonth(currentMonth - 1);
                                    }
                                }}
                            >
                                <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.datePickerMonth}>
                                {MONTH_NAMES[currentMonth]} {currentYear}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    if (currentMonth === 11) {
                                        setCurrentMonth(0);
                                        setCurrentYear(currentYear + 1);
                                    } else {
                                        setCurrentMonth(currentMonth + 1);
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
                                        onPress={() => handleDateSelect(date, type)}
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
                                    if (type === 'filter') setSelectedDate('');
                                    else setEventDate('');
                                    onClose();
                                }}
                            >
                                <Text style={styles.datePickerActionText}>Clear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    handleDateSelect(today, type);
                                }}
                            >
                                <Text style={styles.datePickerActionText}>Today</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        );
    };

    const handleDivisionToggle = (division: string) => {
        if (division === 'All Divisions') {
            if (selectedDivisions.length === divisionsData.length) {
                setSelectedDivisions([]);
            } else {
                setSelectedDivisions(divisionsData.map(d => d.id));
            }
        } else {
            setSelectedDivisions((prev) =>
                prev.includes(division)
                    ? prev.filter((d) => d !== division)
                    : [...prev, division]
            );
        }
    };

    const handleSelectAllDivisions = () => {
        setSelectedDivisions(divisionsData.map((d) => d.id));
    };

    const handleDeselectAllDivisions = () => {
        setSelectedDivisions([]);
    };

    const handleSubmitEvent = () => {
        if (!companyId || !season) {
            Alert.alert('Context missing', 'Company or season is not loaded yet. Please try again.');
            return;
        }
        if (!title.trim() || !eventType) {
            Alert.alert('Validation', 'Please add title and event type.');
            return;
        }
        // Parse date from MM/DD/YYYY to YYYY-MM-DD
        const dateParts = eventDate.split('/');
        const isoDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}` : eventDate;
        const chaperone = selectedStaff.map((s: any) => s.name).join(', ');
        const timeSlot = startTime && endTime
            ? `${startTime} - ${endTime}`
            : startTime || endTime || 'TBD';
        const payload = {
            title: title.trim(),
            event_date: isoDate,
            event_type: eventType.toLowerCase().replace(/ /g, '-'),
            emoji: emoji || undefined,
            time_slot: timeSlot,
            start_time: startTime || undefined,
            end_time: endTime || undefined,
            location: location || undefined,
            description: description || undefined,
            chaperone: chaperone || undefined,
            company_id: companyId,
            season,
            division_ids: selectedDivisions,
        };

        if (editingEventId) {
            updateSpecialEventMutation.mutate(
                { id: editingEventId, ...payload },
                {
                    onSuccess: () => {
                        handleCloseAddEventModal();
                    },
                    onError: (error: any) => {
                        Alert.alert('Error', error?.message || 'Failed to update event');
                    },
                }
            );
            return;
        }

        addSpecialEventMutation.mutate(payload, {
            onSuccess: () => {
                handleCloseAddEventModal();
            },
            onError: (error: any) => {
                Alert.alert('Error', error?.message || 'Failed to add event');
            },
        });
    };

    const handleCloseAddEventModal = () => {
        setEventDate(initialDate);
        setTitle('');
        setEventType('');
        setEmoji('');
        setStartTime('');
        setEndTime('');
        setSelectedDivisions([]);
        setLocation('');
        setDescription('');
        setSelectedStaffIds([]);
        setStaffSearchQuery('');
        setEditingEventId(null);
        setShowEventTypeDropdown(false);
        setIsTimePickerOpen(false);
        setTimePickerField(null);
        setShowAddEventModal(false);
    };

    const handleEditEvent = (event: any) => {
        const eventDateObj = new Date(`${event.event_date}T00:00:00`);
        setEventDate(formatDate(eventDateObj));
        setTitle(event.title || '');
        setEventType((event.event_type || '').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()));
        setEmoji(event.emoji || '');
        setStartTime(event.start_time || '');
        setEndTime(event.end_time || '');
        setSelectedDivisions(Array.isArray(event.divisions) ? event.divisions.map((d: any) => d.id) : []);
        setLocation(event.location || '');
        setDescription(event.description || '');
        setStaffSearchQuery('');
        setEditingEventId(event.id);

        const chaperoneNames = (event.chaperone || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
        const matchedIds = staffData
            .filter((staff: any) => chaperoneNames.includes(staff.name))
            .map((staff: any) => staff.id);
        setSelectedStaffIds(matchedIds);
        setShowAddEventModal(true);
    };

    const closeDeleteConfirmModal = () => {
        if (isDeleting) return;
        setIsDeleteConfirmVisible(false);
        setEventToDelete(null);
    };

    const handleDeleteEvent = (eventId: string) => {
        if (!companyId) return;
        setEventToDelete(eventId);
        setIsDeleteConfirmVisible(true);
    };

    const handleConfirmDelete = async () => {
        const id = typeof eventToDelete === 'string' ? eventToDelete : eventToDelete?.id;
        if (!id || !companyId) return;
        setIsDeleting(true);
        console.log('[DELETE] special_events_activities start', id);
        try {
            const { error } = await supabase
                .from('special_events_activities')
                .delete()
                .eq('id', id)
                .eq('company_id', companyId);
            console.log('[DELETE] special_events_activities response', { error: error?.message ?? null });
            if (error) {
                Alert.alert('Delete failed', error.message);
                return;
            }
            await queryClient.invalidateQueries({ queryKey: ['special_events', companyId, season] });
            await queryClient.invalidateQueries({ queryKey: ['calendar_events', companyId] });
            setIsDeleteConfirmVisible(false);
            setEventToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleStaffSelection = (staffId: string) => {
        setSelectedStaffIds((prev) =>
            prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
        );
    };

    const applySelectedTime = () => {
        const timeString = `${selectedTime.hour}:${selectedTime.minute.toString().padStart(2, '0')} ${selectedTime.ampm}`;
        if (timePickerField === 'startTime') setStartTime(timeString);
        if (timePickerField === 'endTime') setEndTime(timeString);
        setIsTimePickerOpen(false);
        setTimePickerField(null);
    };

    const handleSelectFileOption = (option: string) => {
        console.log('Selected:', option);
        setShowUploadCSVModal(false);
        // TODO: Handle file selection
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
                                name="calendar-outline"
                                size={24}
                                color={theme.colors.primary}
                                style={styles.titleIcon}
                            />
                            <Text style={styles.headerTitle} numberOfLines={2}>
                                Special Events & Evening Activities
                            </Text>
                        </View>
                        <Text style={styles.headerSubtitle}>
                            Special events and evening activities
                        </Text>
                    </View>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.helpButton}
                        onPress={() => setShowHelpModal(true)}
                    >
                        <Ionicons name="help-circle-outline" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={() => setShowUploadCSVModal(true)}
                    >
                        <Ionicons name="arrow-up-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.uploadButtonText}>Upload CSV</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addEventButton}
                        onPress={() => {
                            setEditingEventId(null);
                            setShowAddEventModal(true);
                        }}
                    >
                        <Ionicons name="add" size={20} color={theme.colors.surface} />
                        <Text style={styles.addEventButtonText}>Add Event</Text>
                    </TouchableOpacity>
                </View>

                {/* Filters Section */}
                <View style={styles.filtersSection}>
                    <View style={styles.filterItem}>
                        <Text style={styles.filterLabel}>Date</Text>
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={styles.dateInputText}>{selectedDate}</Text>
                            <Ionicons
                                name="calendar-outline"
                                size={20}
                                color={theme.colors.textSecondary}
                            />
                        </TouchableOpacity>
                        {renderDatePicker('filter', showDatePicker, () => setShowDatePicker(false))}
                    </View>

                    <View style={styles.filterItem}>
                        <Text style={styles.filterLabel}>Division Filter</Text>
                        <View style={styles.divisionDropdownContainer}>
                            <TouchableOpacity
                                style={styles.divisionDropdownButton}
                                onPress={() => setShowDivisionDropdown(true)}
                            >
                                <Text style={styles.divisionDropdownText}>{selectedDivision === 'All Divisions' ? 'All Divisions' : divisionsData.find(d => d.id === selectedDivision)?.name || 'Select Division'}</Text>
                                <Ionicons
                                    name="chevron-down"
                                    size={20}
                                    color={theme.colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Events List */}
                <View style={[styles.emptyStateContainer, showDivisionDropdown && styles.emptyStateContainerWithDropdown]}>
                    {isLoadingEvents ? (
                        <StyledCard style={styles.emptyStateCard}>
                            <ActivityIndicator size="large" color={theme.colors.secondary} />
                            <Text style={styles.emptyStateText}>Loading events...</Text>
                        </StyledCard>
                    ) : filteredEvents.length === 0 ? (
                        <StyledCard style={styles.emptyStateCard}>
                            <Text style={styles.emptyStateText}>
                                No events scheduled for this period
                            </Text>
                        </StyledCard>
                    ) : (
                        Object.entries(groupedEvents).map(([date, events]) => (
                            <View key={date} style={styles.dateGroup}>
                                <Text style={styles.dateGroupTitle}>
                                    {new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </Text>
                                {(events as any[]).map((event: any) => (
                                    <StyledCard key={event.id} style={styles.eventCard}>
                                        <View style={styles.eventCardHeader}>
                                            <Text style={styles.eventTitle}>
                                                {event.emoji ? `${event.emoji} ` : ''}
                                                {event.title}
                                            </Text>
                                            <View style={styles.eventActions}>
                                                <TouchableOpacity
                                                    style={styles.eventActionButton}
                                                    onPress={() => handleEditEvent(event)}
                                                >
                                                    <Ionicons name="pencil-outline" size={16} color={theme.colors.text} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.eventActionButton}
                                                    onPress={() => handleDeleteEvent(event.id)}
                                                >
                                                    <Ionicons name="trash-outline" size={16} color={theme.colors.text} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        <Text style={styles.eventTime}>
                                            {event.start_time && event.end_time
                                                ? `${event.start_time} - ${event.end_time}`
                                                : event.time_slot || event.start_time || 'TBD'}
                                        </Text>

                                        <View style={styles.eventBadgeRow}>
                                            {!!event.event_type && (
                                                <View style={styles.eventTypeBadge}>
                                                    <Text style={styles.eventTypeBadgeText}>
                                                        {event.event_type.replace(/-/g, ' ')}
                                                    </Text>
                                                </View>
                                            )}
                                            {Array.isArray(event.divisions) &&
                                                event.divisions.map((division: any) => (
                                                    <View key={`${event.id}-${division.id}`} style={styles.divisionTag}>
                                                        <Text style={styles.divisionTagText}>{division.name}</Text>
                                                    </View>
                                                ))}
                                        </View>

                                        {event.location ? (
                                            <Text style={styles.eventDetailText}>📍 {event.location}</Text>
                                        ) : null}
                                        {event.chaperone ? (
                                            <Text style={styles.eventDetailText}>👤 Staff: {event.chaperone}</Text>
                                        ) : null}
                                        {event.description ? (
                                            <Text style={styles.eventDescription} numberOfLines={2}>
                                                {event.description}
                                            </Text>
                                        ) : null}
                                    </StyledCard>
                                ))}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Add Event Modal */}
            <Modal
                visible={showAddEventModal}
                transparent
                animationType="slide"
                onRequestClose={handleCloseAddEventModal}
            >
                <Pressable style={styles.modalOverlay} onPress={handleCloseAddEventModal}>
                    <Pressable
                        style={styles.addEventModalContainer}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingEventId ? 'Edit Event' : 'Add Event'}</Text>
                            <TouchableOpacity onPress={handleCloseAddEventModal} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalContent}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={true}
                        >
                            {/* Event Date */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Event Date</Text>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowEventDatePicker(true)}
                                >
                                    <Text style={styles.dateInputText}>{eventDate}</Text>
                                    <Ionicons
                                        name="calendar-outline"
                                        size={20}
                                        color={theme.colors.textSecondary}
                                    />
                                </TouchableOpacity>
                                {renderDatePicker('event', showEventDatePicker, () =>
                                    setShowEventDatePicker(false)
                                )}
                            </View>

                            {/* Title */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Title</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder=""
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={title}
                                    onChangeText={setTitle}
                                />
                            </View>

                            {/* Event Type */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Event Type</Text>
                                <View style={styles.eventTypeContainer}>
                                    <TouchableOpacity
                                        style={styles.eventTypeDropdown}
                                        onPress={() =>
                                            setShowEventTypeDropdown((prev) => !prev)
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.eventTypeDropdownText,
                                                !eventType && styles.placeholder,
                                            ]}
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                        >
                                            {eventType || 'Select event type'}
                                        </Text>
                                        <Ionicons
                                            name={showEventTypeDropdown ? 'chevron-up' : 'chevron-down'}
                                            size={20}
                                            color={theme.colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                    {showEventTypeDropdown ? (
                                        <View style={styles.eventTypeDropdownMenu}>
                                            {EVENT_TYPES.map((item) => {
                                                const isSelected = eventType === item;
                                                return (
                                                    <TouchableOpacity
                                                        key={item}
                                                        style={[
                                                            styles.eventTypeDropdownItem,
                                                            isSelected && styles.eventTypeDropdownItemSelected,
                                                        ]}
                                                        onPress={() => {
                                                            setEventType(item);
                                                            setShowEventTypeDropdown(false);
                                                        }}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.eventTypeDropdownItemText,
                                                                isSelected && styles.eventTypeDropdownItemTextSelected,
                                                            ]}
                                                        >
                                                            {item}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    ) : null}
                                </View>
                            </View>

                            {/* Emoji */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Emoji Icon (optional)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Paste an emoji e.g. 🌙 ⛺ 🎪"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={emoji}
                                    onChangeText={setEmoji}
                                />
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.emojiRow}
                                >
                                    {EMOJI_PRESETS.map((item) => {
                                        const isSelected = emoji === item;
                                        return (
                                            <TouchableOpacity
                                                key={item}
                                                style={[styles.emojiChip, isSelected && styles.emojiChipSelected]}
                                                onPress={() => setEmoji(item)}
                                            >
                                                <Text style={styles.emojiChipText}>{item}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            {/* Time */}
                            <View style={styles.formSection}>
                                <View style={styles.timeRow}>
                                    <View style={styles.timeCol}>
                                        <Text style={styles.label}>Start Time</Text>
                                        <TouchableOpacity
                                            style={styles.timeInput}
                                            onPress={() => {
                                                setTimePickerField('startTime');
                                                setIsTimePickerOpen((prev) => (timePickerField === 'startTime' ? !prev : true));
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.timeInputText,
                                                    !startTime && styles.placeholder,
                                                ]}
                                            >
                                                {startTime || '--:-- --'}
                                            </Text>
                                            <Ionicons
                                                name="time-outline"
                                                size={20}
                                                color={theme.colors.textSecondary}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.timeCol}>
                                        <Text style={styles.label}>End Time</Text>
                                        <TouchableOpacity
                                            style={styles.timeInput}
                                            onPress={() => {
                                                setTimePickerField('endTime');
                                                setIsTimePickerOpen((prev) => (timePickerField === 'endTime' ? !prev : true));
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.timeInputText,
                                                    !endTime && styles.placeholder,
                                                ]}
                                            >
                                                {endTime || '--:-- --'}
                                            </Text>
                                            <Ionicons
                                                name="time-outline"
                                                size={20}
                                                color={theme.colors.textSecondary}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                {isTimePickerOpen ? (
                                    <View style={styles.inlineTimePicker}>
                                        <View style={styles.timePickerContent}>
                                            <View style={styles.timePickerColumn}>
                                                <Text style={styles.timePickerLabel}>Hour</Text>
                                                <ScrollView style={styles.timePickerScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                                                        <TouchableOpacity
                                                            key={hour}
                                                            style={[
                                                                styles.timePickerOption,
                                                                selectedTime.hour === hour && styles.timePickerOptionSelected,
                                                            ]}
                                                            onPress={() => setSelectedTime({ ...selectedTime, hour })}
                                                        >
                                                            <Text style={[
                                                                styles.timePickerOptionText,
                                                                selectedTime.hour === hour && styles.timePickerOptionTextSelected,
                                                            ]}>
                                                                {hour.toString().padStart(2, '0')}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                            <View style={styles.timePickerColumn}>
                                                <Text style={styles.timePickerLabel}>Minute</Text>
                                                <ScrollView style={styles.timePickerScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                                    {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                                                        <TouchableOpacity
                                                            key={minute}
                                                            style={[
                                                                styles.timePickerOption,
                                                                selectedTime.minute === minute && styles.timePickerOptionSelected,
                                                            ]}
                                                            onPress={() => setSelectedTime({ ...selectedTime, minute })}
                                                        >
                                                            <Text style={[
                                                                styles.timePickerOptionText,
                                                                selectedTime.minute === minute && styles.timePickerOptionTextSelected,
                                                            ]}>
                                                                {minute.toString().padStart(2, '0')}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                            <View style={styles.timePickerColumn}>
                                                <Text style={styles.timePickerLabel}>Period</Text>
                                                <ScrollView style={styles.timePickerScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                                    {['AM', 'PM'].map((period) => (
                                                        <TouchableOpacity
                                                            key={period}
                                                            style={[
                                                                styles.timePickerOption,
                                                                selectedTime.ampm === period && styles.timePickerOptionSelected,
                                                            ]}
                                                            onPress={() => setSelectedTime({ ...selectedTime, ampm: period })}
                                                        >
                                                            <Text style={[
                                                                styles.timePickerOptionText,
                                                                selectedTime.ampm === period && styles.timePickerOptionTextSelected,
                                                            ]}>
                                                                {period}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        </View>
                                        <View style={styles.inlineTimeActions}>
                                            <Text style={styles.timePickerBottomHint}>
                                                Select time then tap Enter
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.cancelButton}
                                                onPress={() => {
                                                    setIsTimePickerOpen(false);
                                                    setTimePickerField(null);
                                                }}
                                            >
                                                <Text style={styles.cancelButtonText}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.timeEnterButton}
                                                onPress={applySelectedTime}
                                            >
                                                <Text style={styles.timeEnterButtonText}>Enter</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : null}
                            </View>

                            {/* Divisions */}
                            <View style={styles.formSection}>
                                <View style={styles.divisionsHeader}>
                                    <Text style={styles.label}>
                                        Divisions (select multiple)
                                    </Text>
                                    <View style={styles.divisionsActions}>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={handleSelectAllDivisions}
                                        >
                                            <Text style={styles.actionButtonText}>Select All</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={handleDeselectAllDivisions}
                                        >
                                            <Text style={styles.actionButtonText}>Deselect All</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.divisionsListContainer}>
                                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                        {divisionsData.map((item) => {
                                            const isSelected = selectedDivisions.includes(item.id);
                                            return (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    style={styles.divisionCheckboxItem}
                                                    onPress={() => handleDivisionToggle(item.id)}
                                                >
                                                    <View
                                                        style={[
                                                            styles.checkbox,
                                                            isSelected && styles.checkboxSelected,
                                                        ]}
                                                    >
                                                        {isSelected && (
                                                            <Ionicons
                                                                name="checkmark"
                                                                size={16}
                                                                color={theme.colors.surface}
                                                            />
                                                        )}
                                                    </View>
                                                    <Text style={styles.divisionCheckboxText}>
                                                        {item.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            </View>

                            {/* Location */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Location (optional)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder=""
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={location}
                                    onChangeText={setLocation}
                                />
                            </View>

                            {/* Staff */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Staff (optional)</Text>
                                {selectedStaff.length > 0 && (
                                    <View style={styles.selectedStaffChips}>
                                        {selectedStaff.map((staff: any) => (
                                            <TouchableOpacity
                                                key={staff.id}
                                                style={styles.staffChip}
                                                onPress={() => toggleStaffSelection(staff.id)}
                                            >
                                                <Text style={styles.staffChipText}>{staff.name}</Text>
                                                <Ionicons name="close" size={14} color={theme.colors.surface} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                <View style={styles.searchContainer}>
                                    <Ionicons
                                        name="search-outline"
                                        size={20}
                                        color={theme.colors.textSecondary}
                                        style={styles.searchIcon}
                                    />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search staff to assign..."
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={staffSearchQuery}
                                        onChangeText={setStaffSearchQuery}
                                    />
                                </View>
                                <View style={styles.staffListContainer}>
                                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                        {filteredStaff.map((item: any) => {
                                            const isSelected = selectedStaffIds.includes(item.id);
                                            return (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    style={[
                                                        styles.staffRow,
                                                        isSelected && styles.staffRowSelected,
                                                    ]}
                                                    onPress={() => toggleStaffSelection(item.id)}
                                                >
                                                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                                        {isSelected ? (
                                                            <Ionicons name="checkmark" size={14} color={theme.colors.surface} />
                                                        ) : null}
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.staffName}>{item.name}</Text>
                                                        {!!item.role && (
                                                            <Text style={styles.staffRole}>{item.role}</Text>
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            </View>

                            {/* Description */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Description (optional)</Text>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder=""
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={description}
                                    onChangeText={setDescription}
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
                                onPress={handleCloseAddEventModal}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    (!title || !eventType) && styles.submitButtonDisabled,
                                ]}
                                onPress={handleSubmitEvent}
                                disabled={!title || !eventType}
                            >
                                <Text style={styles.submitButtonText}>{editingEventId ? 'Update Event' : 'Add Event'}</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Upload CSV Modal */}
            <Modal
                visible={showUploadCSVModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowUploadCSVModal(false)}
            >
                <Pressable style={styles.bottomSheetOverlay} onPress={() => setShowUploadCSVModal(false)}>
                    <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select file</Text>
                        </View>
                        <View style={styles.bottomSheetContent}>
                            <TouchableOpacity
                                style={styles.bottomSheetOption}
                                onPress={() => handleSelectFileOption('Aloha downloads')}
                            >
                                <Ionicons name="folder-outline" size={24} color={theme.colors.secondary} />
                                <Text style={styles.bottomSheetOptionText}>Aloha downloads</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.bottomSheetOption}
                                onPress={() => handleSelectFileOption('Other files')}
                            >
                                <Ionicons name="document-text-outline" size={24} color={theme.colors.secondary} />
                                <Text style={styles.bottomSheetOptionText}>Other files</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>


            {/* Help Modal (CSV Guide) */}
            <Modal
                visible={showHelpModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowHelpModal(false)}
            >
                <View style={[styles.bottomSheetOverlay, { justifyContent: 'center', alignItems: 'center' }]}>
                    <View style={styles.helpModalContainer}>
                        {/* Header */}
                        <View style={styles.helpModalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="document-text-outline" size={24} color={theme.colors.text} />
                                <Text style={styles.helpModalTitle}>CSV Upload Format Guide</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Tabs */}
                        <View style={styles.tabsContainer}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                                {HELP_TABS.map((tab) => (
                                    <TouchableOpacity
                                        key={tab}
                                        style={[
                                            styles.tabButton,
                                            selectedHelpTab === tab && styles.tabButtonSelected
                                        ]}
                                        onPress={() => setSelectedHelpTab(tab)}
                                    >
                                        <Text style={[
                                            styles.tabButtonText,
                                            selectedHelpTab === tab && styles.tabButtonTextSelected
                                        ]}>{tab}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Content */}
                        <ScrollView style={styles.helpModalContent}>
                            {HELP_CONTENT[selectedHelpTab] ? (
                                <>
                                    <Text style={styles.helpContentTitle}>{HELP_CONTENT[selectedHelpTab].title}</Text>
                                    <Text style={styles.helpContentSubtitle}>{HELP_CONTENT[selectedHelpTab].subtitle}</Text>

                                    <Text style={styles.sectionTitle}>Required Columns (first row):</Text>
                                    <View style={styles.codeBlock}>
                                        <Text style={styles.codeText}>{HELP_CONTENT[selectedHelpTab].columns}</Text>
                                    </View>

                                    <Text style={styles.sectionTitle}>Example Data Row:</Text>
                                    <View style={styles.codeBlock}>
                                        <Text style={styles.codeText}>{HELP_CONTENT[selectedHelpTab].example}</Text>
                                    </View>

                                    {HELP_CONTENT[selectedHelpTab].notes && (
                                        <View style={styles.infoBoxBlue}>
                                            <Text style={styles.infoBoxText}>
                                                <Text style={{ fontWeight: 'bold' }}>Important Notes:</Text> {HELP_CONTENT[selectedHelpTab].notes}
                                            </Text>
                                        </View>
                                    )}
                                </>
                            ) : null}

                            <View style={styles.infoBoxYellow}>
                                <Text style={styles.infoBoxTitle}>General Tips:</Text>
                                <View style={styles.bulletList}>
                                    <Text style={styles.bulletPoint}>• First row must contain column names exactly as shown</Text>
                                    <Text style={styles.bulletPoint}>• Use commas to separate values</Text>
                                    <Text style={styles.bulletPoint}>• Use backslash before commas within text fields (e.g., "Item 1\, Item 2")</Text>
                                    <Text style={styles.bulletPoint}>• Leave fields empty for optional columns</Text>
                                    <Text style={styles.bulletPoint}>• Maximum 1000 rows per upload</Text>
                                    <Text style={styles.bulletPoint}>• Dates must be in YYYY-MM-DD format</Text>
                                    <Text style={styles.bulletPoint}>• UUIDs can be obtained from the backend for existing records</Text>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Division Filter Modal */}
            <Modal
                visible={showDivisionDropdown}
                presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDivisionDropdown(false)}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => setShowDivisionDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Division</Text>
                            <TouchableOpacity onPress={() => setShowDivisionDropdown(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={[{ id: 'All Divisions', name: 'All Divisions' }, ...divisionsData]}
                            keyExtractor={(item: any) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.bottomSheetOption}
                                    onPress={() => {
                                        setSelectedDivision(item.id);
                                        setShowDivisionDropdown(false);
                                    }}
                                >
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            selectedDivision === item.id && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {item.name}
                                        </Text>
                                        {selectedDivision === item.id && (
                                            <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            )}
                            showsVerticalScrollIndicator={false}
                        />
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={isDeleteConfirmVisible}
                transparent
                animationType="fade"
                onRequestClose={closeDeleteConfirmModal}
            >
                <Pressable style={styles.deleteModalOverlay} onPress={closeDeleteConfirmModal}>
                    <Pressable style={styles.deleteModalContent} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.deleteModalTitle}>Confirm Delete</Text>
                        <Text style={styles.deleteModalMessage}>Are you sure? This cannot be undone.</Text>
                        <View style={styles.deleteModalActions}>
                            <TouchableOpacity
                                style={styles.deleteModalCancelBtn}
                                onPress={closeDeleteConfirmModal}
                                disabled={isDeleting}
                            >
                                <Text style={styles.deleteModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.deleteModalConfirmBtn, isDeleting && { opacity: 0.6 }]}
                                onPress={handleConfirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.deleteModalConfirmText}>Delete</Text>
                                )}
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
        paddingBottom: 100,
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
        alignItems: 'flex-start',
        marginBottom: theme.spacing.xs,
        gap: theme.spacing.sm,
    },
    titleIcon: {
        marginTop: 2,
        flexShrink: 0,
    },
    headerTitle: {
        ...theme.typography.h2,
        flex: 1,
        flexWrap: 'wrap',
    },
    headerSubtitle: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
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
    addEventButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
        gap: theme.spacing.xs,
    },
    addEventButtonText: {
        ...theme.typography.body,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    filtersSection: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    filterItem: {
        flex: 1,
    },
    filterLabel: {
        ...theme.typography.bodySmall,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
        color: theme.colors.text,
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
    divisionDropdownContainer: {
        position: 'relative',
        width: '100%',
        zIndex: 1000,
    },
    divisionDropdownButton: {
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
    divisionDropdownText: {
        ...theme.typography.body,
        flex: 1,
    },
    divisionDropdownMenu: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: theme.spacing.xs,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxHeight: 300,
        zIndex: 1001,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    divisionDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    divisionDropdownItemSelected: {
        backgroundColor: '#fff7ed',
    },
    checkIcon: {
        marginRight: theme.spacing.xs,
    },
    divisionDropdownItemText: {
        ...theme.typography.body,
        flex: 1,
    },
    divisionDropdownItemTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    emptyStateContainer: {
        marginTop: theme.spacing.lg,
    },
    emptyStateContainerWithDropdown: {
        marginTop: 350,
    },
    emptyStateCard: {
        minHeight: 200,
        justifyContent: 'center',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    emptyStateText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    bottomSheetOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        zIndex: 1000,
    },
    datePickerContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        width: '90%',
        maxWidth: 400,
        ...theme.shadows.card,
    },
    datePickerBottomSheet: {
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
    addEventModalContainer: {
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
        paddingBottom: 140,
    },
    formSection: {
        marginBottom: theme.spacing.lg,
    },
    label: {
        ...theme.typography.body,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
        color: theme.colors.text,
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
    textArea: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        ...theme.typography.body,
        minHeight: 100,
    },
    placeholder: {
        color: theme.colors.textSecondary,
    },
    eventTypeContainer: {
        position: 'relative',
        zIndex: 1000,
    },
    eventTypeDropdown: {
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
    eventTypeDropdownText: {
        ...theme.typography.body,
        flex: 1,
    },
    eventTypeDropdownMenu: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: theme.spacing.xs,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxHeight: 300,
        zIndex: 1001,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        marginBottom: theme.spacing.md,
    },
    eventTypeDropdownItem: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    eventTypeDropdownItemSelected: {
        backgroundColor: '#fff7ed',
    },
    eventTypeDropdownItemText: {
        ...theme.typography.body,
    },
    eventTypeDropdownItemTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    timeInput: {
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
    timeInputText: {
        ...theme.typography.body,
        flex: 1,
    },
    emojiRow: {
        gap: theme.spacing.xs,
        paddingTop: theme.spacing.sm,
        paddingBottom: 2,
    },
    emojiChip: {
        minWidth: 36,
        minHeight: 36,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    emojiChipSelected: {
        borderColor: theme.colors.secondary,
        backgroundColor: '#fff7ed',
    },
    emojiChipText: {
        fontSize: 20,
        fontFamily: Platform.OS === 'ios' ? 'AppleColorEmoji' : undefined,
    },
    timeRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    timeCol: {
        flex: 1,
    },
    inlineTimePicker: {
        marginTop: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.xs,
    },
    inlineTimeActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        paddingTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    timePickerBottomHint: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    timeEnterButton: {
        minWidth: 110,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: 12,
        backgroundColor: theme.colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    timeEnterButtonText: {
        ...theme.typography.body,
        color: theme.colors.surface,
        fontWeight: '700',
    },
    divisionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    divisionsActions: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    actionButton: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    actionButtonText: {
        ...theme.typography.bodySmall,
        color: theme.colors.text,
        fontWeight: '600',
    },
    divisionsListContainer: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        maxHeight: 300,
    },
    divisionCheckboxItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    divisionCheckboxText: {
        ...theme.typography.body,
        flex: 1,
    },
    dateGroup: {
        marginBottom: theme.spacing.lg,
    },
    dateGroupTitle: {
        ...theme.typography.h3,
        marginBottom: theme.spacing.sm,
    },
    eventCard: {
        marginBottom: theme.spacing.sm,
        padding: theme.spacing.md,
    },
    eventCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: theme.spacing.sm,
    },
    eventTitle: {
        ...theme.typography.body,
        fontWeight: '700',
        marginBottom: 2,
        flex: 1,
    },
    eventActions: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
    },
    eventActionButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
    },
    eventTime: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    eventBadgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.sm,
    },
    eventTypeBadge: {
        backgroundColor: '#1d4ed8',
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
    },
    eventTypeBadgeText: {
        ...theme.typography.bodySmall,
        color: theme.colors.surface,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    eventDetailText: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    eventDescription: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    selectedStaffChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.sm,
    },
    staffChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#22B8CF',
        borderRadius: 16,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 5,
    },
    staffChipText: {
        ...theme.typography.bodySmall,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    staffListContainer: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        maxHeight: 220,
        marginTop: theme.spacing.sm,
    },
    staffRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        gap: theme.spacing.sm,
    },
    staffRowSelected: {
        backgroundColor: '#f5f7ff',
    },
    staffName: {
        ...theme.typography.body,
        fontWeight: '600',
    },
    staffRole: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
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
        backgroundColor: theme.colors.secondary,
        // No opacity to keep it solid blue as requested
    },
    submitButtonText: {
        ...theme.typography.body,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    bottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.lg,
        paddingHorizontal: theme.spacing.md,
        width: '100%',
        maxHeight: '80%', // Allow taller sheet for long lists
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    bottomSheetHeader: {
        marginBottom: theme.spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: theme.spacing.sm, // Add padding for better spacing
        borderBottomWidth: 1, // Separator for header
        borderBottomColor: theme.colors.border,
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
        borderBottomWidth: 1, // Add separator lines between items
        borderBottomColor: theme.colors.border,
    },
    bottomSheetOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },
    bottomSheetOptionTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    timePickerContent: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.sm,
        maxHeight: 180,
        justifyContent: 'space-between',
    },
    timePickerColumn: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    timePickerLabel: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    timePickerScroll: {
        width: '100%',
        maxHeight: 120,
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
    // Help Modal Styles
    helpModalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '90%',
        maxWidth: 800,
        maxHeight: '90%',
        ...theme.shadows.card,
    },
    helpModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    helpModalTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    tabsContainer: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        paddingVertical: theme.spacing.sm,
    },
    tabButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: 20,
        marginRight: theme.spacing.sm,
        backgroundColor: 'transparent',
    },
    tabButtonSelected: {
        backgroundColor: theme.colors.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabButtonText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    tabButtonTextSelected: {
        color: theme.colors.text,
        fontWeight: 'bold',
    },
    helpModalContent: {
        padding: theme.spacing.lg,
    },
    helpContentTitle: {
        ...theme.typography.h2,
        marginBottom: theme.spacing.xs,
        color: theme.colors.text,
    },
    helpContentSubtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: theme.spacing.sm,
        color: theme.colors.text,
    },
    codeBlock: {
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.lg,
    },
    codeText: {
        fontFamily: 'monospace',
        fontSize: 13,
        color: theme.colors.text,
    },
    infoBoxBlue: {
        backgroundColor: '#e0f2fe', // Light blue
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.lg,
        borderLeftWidth: 4,
        borderLeftColor: '#0284c7', // Darker blue
    },
    infoBoxText: {
        ...theme.typography.body,
        color: '#0c4a6e', // Dark blue text
        fontSize: 14,
    },
    infoBoxYellow: {
        backgroundColor: '#fef9c3', // Light yellow
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.lg,
        borderLeftWidth: 4,
        borderLeftColor: '#ca8a04', // Darker yellow/gold
    },
    infoBoxTitle: {
        fontWeight: 'bold',
        marginBottom: theme.spacing.sm,
        color: '#713f12', // Brownish text
    },
    bulletList: {
        gap: 4,
    },
    bulletPoint: {
        ...theme.typography.body,
        fontSize: 14,
        color: '#713f12',
    },
    deleteModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteModalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '85%',
        maxWidth: 340,
    },
    deleteModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 8,
    },
    deleteModalMessage: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    deleteModalActions: {
        flexDirection: 'row',
        gap: 8,
    },
    deleteModalCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
    },
    deleteModalCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
    },
    deleteModalConfirmBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#dc2626',
        alignItems: 'center',
    },
    deleteModalConfirmText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
});
