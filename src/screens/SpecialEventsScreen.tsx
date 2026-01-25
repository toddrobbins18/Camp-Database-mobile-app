import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable } from 'react-native';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

interface SpecialEvent {
    id: string;
    title: string;
    date: Date;
    time?: string;
    location?: string;
    division?: string;
    description?: string;
}

export const SpecialEventsScreen = ({ navigation }: any) => {
    const [showAddEventModal, setShowAddEventModal] = useState(false);
    const [showUploadCSVModal, setShowUploadCSVModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showDivisionPicker, setShowDivisionPicker] = useState(false);
    
    // Filter states
    const [selectedDate, setSelectedDate] = useState(new Date(2026, 0, 25));
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    
    // Add Event form states
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState(new Date(2026, 0, 25));
    const [newEventTime, setNewEventTime] = useState('');
    const [newEventLocation, setNewEventLocation] = useState('');
    const [newEventDivision, setNewEventDivision] = useState('');
    const [newEventDescription, setNewEventDescription] = useState('');

    // Sample events
    const [events, setEvents] = useState<SpecialEvent[]>([
        { 
            id: '1', 
            title: 'Silent DJ Disco', 
            date: new Date(2026, 0, 17), 
            time: '7:00 - 23 PM',
            location: 'Main Hall',
            division: 'All Divisions'
        },
        { 
            id: '2', 
            title: 'End of Year Bash', 
            date: new Date(2026, 0, 25), 
            time: '7:00 - 22 PM',
            location: 'Camp Grounds',
            division: 'All Divisions'
        },
    ]);

    const divisions = ['All Divisions', 'Freshmen A', 'Freshmen B', 'Cadet', 'Sophomore', 'Junior', 'Senior', 'Super', 'Teen', 'CIT'];

    const formatDate = (date: Date): string => {
interface SpecialEventsScreenProps {
    navigation: any;
}

// Reuse divisions from existing code
const DIVISIONS = [
    'All Divisions',
    'Freshmen A Girls',
    'Freshmen B Girls',
    'Cadet Girls',
    'Sophomore Girls',
    'Junior Girls',
    'Senior Girls',
    'Super Girls',
    'Teen Girls',
    'CIT Girls',
    'Freshmen A Boys',
    'Freshmen B Boys',
    'Cadet Boys',
    'Sophomore Boys',
    'Junior Boys',
    'Senior Boys',
    'Super Boys',
    'Teen Boys',
    'CIT Boys',
];

const EVENT_TYPES = [
    'Special Event',
    'Evening Activity',
    'Campfire',
    'Movie Night',
    'Talent Show',
    'Game Night',
    'Other',
];

export const SpecialEventsScreen = ({ navigation }: SpecialEventsScreenProps) => {
    const [selectedDate, setSelectedDate] = useState('01/22/2026');
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
    const [showAddEventModal, setShowAddEventModal] = useState(false);

    // Add Event Modal States
    const [eventDate, setEventDate] = useState('01/22/2026');
    const [title, setTitle] = useState('');
    const [eventType, setEventType] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
    const [location, setLocation] = useState('');
    const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);
    const [showEventDatePicker, setShowEventDatePicker] = useState(false);

    // Date picker state
    const [datePickerMonth, setDatePickerMonth] = useState(new Date().getMonth());
    const [datePickerYear, setDatePickerYear] = useState(new Date().getFullYear());
    const [eventDatePickerMonth, setEventDatePickerMonth] = useState(new Date().getMonth());
    const [eventDatePickerYear, setEventDatePickerYear] = useState(new Date().getFullYear());

    // Reuse date formatting function
    const formatDate = (date: Date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    const filteredEvents = events.filter(event => {
        if (selectedDivision !== 'All Divisions' && event.division !== selectedDivision) return false;
        const eventDate = event.date;
        if (eventDate.getDate() !== selectedDate.getDate() ||
            eventDate.getMonth() !== selectedDate.getMonth() ||
            eventDate.getFullYear() !== selectedDate.getFullYear()) return false;
        return true;
    });

    const handleAddEvent = () => {
        if (!newEventTitle.trim()) return;

        const newEvent: SpecialEvent = {
            id: Date.now().toString(),
            title: newEventTitle.trim(),
            date: new Date(newEventDate),
            time: newEventTime || undefined,
            location: newEventLocation || undefined,
            division: newEventDivision || 'All Divisions',
            description: newEventDescription || undefined,
        };

        setEvents([...events, newEvent]);
        setShowAddEventModal(false);
        // Reset form
        setNewEventTitle('');
        setNewEventDate(new Date(2026, 0, 25));
        setNewEventTime('');
        setNewEventLocation('');
        setNewEventDivision('');
        setNewEventDescription('');
    };

    const handleDeleteEvent = (id: string) => {
        setEvents(events.filter(event => event.id !== id));
    };

    const handleSelectFileOption = (option: string) => {
        console.log('Selected:', option);
        setShowUploadCSVModal(false);
        // TODO: Handle file selection
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

        return (
            <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <View style={styles.datePickerContainer} onStartShouldSetResponder={() => true}>
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
                                {monthNames[currentMonth]} {currentYear}
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
                </TouchableOpacity>
            </Modal>
        );
    };

    const handleDivisionToggle = (division: string) => {
        if (division === 'All Divisions') {
            if (selectedDivisions.length === DIVISIONS.length - 1) {
                setSelectedDivisions([]);
            } else {
                setSelectedDivisions(DIVISIONS.filter((d) => d !== 'All Divisions'));
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
        setSelectedDivisions(DIVISIONS.filter((d) => d !== 'All Divisions'));
    };

    const handleDeselectAllDivisions = () => {
        setSelectedDivisions([]);
    };

    const handleAddEvent = () => {
        // TODO: Implement event creation
        console.log('Adding event:', {
            eventDate,
            title,
            eventType,
            startTime,
            endTime,
            selectedDivisions,
            location,
        });
        // Reset form
        setEventDate('01/22/2026');
        setTitle('');
        setEventType('');
        setStartTime('');
        setEndTime('');
        setSelectedDivisions([]);
        setLocation('');
        setShowAddEventModal(false);
    };

    const handleCloseAddEventModal = () => {
        setEventDate('01/22/2026');
        setTitle('');
        setEventType('');
        setStartTime('');
        setEndTime('');
        setSelectedDivisions([]);
        setLocation('');
        setShowAddEventModal(false);
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

                {/* Title Section */}
                <View style={styles.titleSection}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Special Events & Evening Activities</Text>
                        <Text style={styles.subtitle}>Special events and evening activities.</Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity style={styles.iconButton}>
                            <Ionicons name="checkmark-circle-outline" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.uploadBtn}
                            onPress={() => setShowUploadCSVModal(true)}
                        >
                            <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.text} />
                            <Text style={styles.uploadBtnText}>Upload CSV</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.addBtn}
                            onPress={() => setShowAddEventModal(true)}
                        >
                            <Ionicons name="add" size={18} color="white" />
                            <Text style={styles.addBtnText}>Add Event</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Filters Section */}
                <StyledCard style={styles.filterCard}>
                    <View style={styles.filterRow}>
                        <View style={styles.filterItem}>
                            <Text style={styles.filterLabel}>Date</Text>
                            <TouchableOpacity 
                                style={styles.filterInput}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={styles.filterInputText}>{formatDate(selectedDate)}</Text>
                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.filterItem}>
                            <Text style={styles.filterLabel}>Division Filter</Text>
                            <TouchableOpacity 
                                style={styles.filterInput}
                                onPress={() => setShowDivisionPicker(true)}
                            >
                                <Text style={styles.filterInputText}>{selectedDivision}</Text>
                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </StyledCard>

                {/* Events List */}
                <StyledCard style={styles.eventsCard}>
                    {filteredEvents.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No events scheduled for this period</Text>
                        </View>
                    ) : (
                        <View style={styles.eventsList}>
                            {filteredEvents.map((event) => (
                                <View key={event.id} style={styles.eventCard}>
                                    <View style={styles.eventHeader}>
                                        <View style={styles.eventHeaderLeft}>
                                            <Text style={styles.eventTitle}>{event.title}</Text>
                                            {event.time && (
                                                <Text style={styles.eventTime}>{event.time}</Text>
                                            )}
                                        </View>
                                        <TouchableOpacity onPress={() => handleDeleteEvent(event.id)}>
                                            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                    {event.location && (
                                        <View style={styles.eventLocation}>
                                            <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
                                            <Text style={styles.eventLocationText}>{event.location}</Text>
                                        </View>
                                    )}
                                    {event.division && event.division !== 'All Divisions' && (
                                        <View style={styles.eventDivision}>
                                            <Text style={styles.eventDivisionText}>{event.division}</Text>
                                        </View>
                                    )}
                                    {event.description && (
                                        <Text style={styles.eventDescription}>{event.description}</Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </StyledCard>
                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.helpButton}>
                        <Ionicons name="help-circle-outline" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.uploadButton}>
                        <Ionicons name="arrow-up-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.uploadButtonText}>Upload CSV</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addEventButton}
                        onPress={() => setShowAddEventModal(true)}
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
                                onPress={() => setShowDivisionDropdown(!showDivisionDropdown)}
                            >
                                <Text style={styles.divisionDropdownText}>{selectedDivision}</Text>
                                <Ionicons
                                    name="chevron-down"
                                    size={20}
                                    color={theme.colors.textSecondary}
                                />
                            </TouchableOpacity>
                            {showDivisionDropdown && (
                                <View style={styles.divisionDropdownMenu}>
                                    <FlatList
                                        data={DIVISIONS}
                                        keyExtractor={(item) => item}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={[
                                                    styles.divisionDropdownItem,
                                                    selectedDivision === item &&
                                                        styles.divisionDropdownItemSelected,
                                                ]}
                                                onPress={() => {
                                                    setSelectedDivision(item);
                                                    setShowDivisionDropdown(false);
                                                }}
                                            >
                                                {selectedDivision === item && (
                                                    <Ionicons
                                                        name="checkmark"
                                                        size={20}
                                                        color={theme.colors.secondary}
                                                        style={styles.checkIcon}
                                                    />
                                                )}
                                                <Text
                                                    style={[
                                                        styles.divisionDropdownItemText,
                                                        selectedDivision === item &&
                                                            styles.divisionDropdownItemTextSelected,
                                                    ]}
                                                >
                                                    {item}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        nestedScrollEnabled={true}
                                    />
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Empty State */}
                <View style={[styles.emptyStateContainer, showDivisionDropdown && styles.emptyStateContainerWithDropdown]}>
                    <StyledCard style={styles.emptyStateCard}>
                        <Text style={styles.emptyStateText}>
                            No events scheduled for this period
                        </Text>
                    </StyledCard>
                </View>
            </ScrollView>

            {/* Add Event Modal */}
            <Modal
                visible={showAddEventModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAddEventModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowAddEventModal(false)}>
                    <Pressable style={styles.addEventModal} onPress={(e) => e.stopPropagation()}>
                        <ScrollView style={styles.addEventScroll}>
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>Add Event</Text>
                                    <Text style={styles.modalSubtitle}>Add a new special event or evening activity</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowAddEventModal(false)}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Event Title</Text>
                                <TextInput
                                    style={styles.inputField}
                                    placeholder="Enter event title"
                                    value={newEventTitle}
                                    onChangeText={setNewEventTitle}
                                />
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Date</Text>
                                <TouchableOpacity 
                                    style={styles.inputContainer}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={styles.inputField}>{formatDate(newEventDate)}</Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Time (optional)</Text>
                                <TextInput
                                    style={styles.inputField}
                                    placeholder="e.g., 7:00 - 23 PM"
                                    value={newEventTime}
                                    onChangeText={setNewEventTime}
                                />
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Location (optional)</Text>
                                <TextInput
                                    style={styles.inputField}
                                    placeholder="Enter location"
                                    value={newEventLocation}
                                    onChangeText={setNewEventLocation}
                                />
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Division</Text>
                                <TouchableOpacity 
                                    style={styles.inputContainer}
                                    onPress={() => setShowDivisionPicker(true)}
                                >
                                    <Text style={styles.inputField}>{newEventDivision || 'Select division'}</Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Description (optional)</Text>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Enter event description"
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    value={newEventDescription}
                                    onChangeText={setNewEventDescription}
                                />
                            </View>

                            <TouchableOpacity style={styles.addEventBtn} onPress={handleAddEvent}>
                                <Text style={styles.addEventBtnText}>Add Event</Text>
                            </TouchableOpacity>
                        </ScrollView>
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
                <Pressable style={styles.modalOverlay} onPress={() => setShowUploadCSVModal(false)}>
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

            {/* Date Picker Modal */}
            <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDatePicker(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
                    <Pressable style={styles.pickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Date</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.datePickerContainer}>
                            {/* Month Selection */}
                            <View style={styles.dateSection}>
                                <Text style={styles.dateSectionTitle}>Month</Text>
                                <View style={styles.dateOptionsRow}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                                        <TouchableOpacity
                                            key={month}
                                            style={[
                                                styles.dateOption,
                                                (showAddEventModal ? newEventDate : selectedDate).getMonth() + 1 === month && styles.dateOptionSelected
                                            ]}
                                            onPress={() => {
                                                const date = showAddEventModal ? newEventDate : selectedDate;
                                                const newDate = new Date(date);
                                                newDate.setMonth(month - 1);
                                                if (showAddEventModal) {
                                                    setNewEventDate(newDate);
                                                } else {
                                                    setSelectedDate(newDate);
                                                }
                                            }}
                                        >
                                            <Text style={[
                                                styles.dateOptionText,
                                                (showAddEventModal ? newEventDate : selectedDate).getMonth() + 1 === month && styles.dateOptionTextSelected
                                            ]}>
                                                {month}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Day Selection */}
                            <View style={styles.dateSection}>
                                <Text style={styles.dateSectionTitle}>Day</Text>
                                <View style={styles.dateOptionsRow}>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                        <TouchableOpacity
                                            key={day}
                                            style={[
                                                styles.dateOption,
                                                (showAddEventModal ? newEventDate : selectedDate).getDate() === day && styles.dateOptionSelected
                                            ]}
                                            onPress={() => {
                                                const date = showAddEventModal ? newEventDate : selectedDate;
                                                const newDate = new Date(date);
                                                newDate.setDate(day);
                                                if (showAddEventModal) {
                                                    setNewEventDate(newDate);
                                                } else {
                                                    setSelectedDate(newDate);
                                                }
                                            }}
                                        >
                                            <Text style={[
                                                styles.dateOptionText,
                                                (showAddEventModal ? newEventDate : selectedDate).getDate() === day && styles.dateOptionTextSelected
                                            ]}>
                                                {day}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Year Selection */}
                            <View style={styles.dateSection}>
                                <Text style={styles.dateSectionTitle}>Year</Text>
                                <View style={styles.dateOptionsRow}>
                                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                                        <TouchableOpacity
                                            key={year}
                                            style={[
                                                styles.dateOption,
                                                (showAddEventModal ? newEventDate : selectedDate).getFullYear() === year && styles.dateOptionSelected
                                            ]}
                                            onPress={() => {
                                                const date = showAddEventModal ? newEventDate : selectedDate;
                                                const newDate = new Date(date);
                                                newDate.setFullYear(year);
                                                if (showAddEventModal) {
                                                    setNewEventDate(newDate);
                                                } else {
                                                    setSelectedDate(newDate);
                                                }
                                            }}
                                        >
                                            <Text style={[
                                                styles.dateOptionText,
                                                (showAddEventModal ? newEventDate : selectedDate).getFullYear() === year && styles.dateOptionTextSelected
                                            ]}>
                                                {year}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>
                        <TouchableOpacity 
                            style={styles.pickerConfirmBtn}
                            onPress={() => setShowDatePicker(false)}
                        >
                            <Text style={styles.pickerConfirmBtnText}>Confirm</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

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
                        <ScrollView style={styles.pickerContent}>
                            {divisions.map((division) => (
                                <TouchableOpacity
                                    key={division}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        if (showAddEventModal) {
                                            setNewEventDivision(division);
                                        } else {
                                            setSelectedDivision(division);
                                        }
                                        setShowDivisionPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{division}</Text>
                                    {(showAddEventModal ? newEventDivision : selectedDivision) === division && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
                transparent
                animationType="slide"
                onRequestClose={handleCloseAddEventModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.addEventModalContainer}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Event</Text>
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
                                            setShowEventTypeDropdown(!showEventTypeDropdown)
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
                                            name="chevron-down"
                                            size={20}
                                            color={theme.colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                                {showEventTypeDropdown && (
                                    <View style={styles.eventTypeDropdownMenu}>
                                        <FlatList
                                            data={EVENT_TYPES}
                                            keyExtractor={(item) => item}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.eventTypeDropdownItem,
                                                        eventType === item &&
                                                            styles.eventTypeDropdownItemSelected,
                                                    ]}
                                                    onPress={() => {
                                                        setEventType(item);
                                                        setShowEventTypeDropdown(false);
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.eventTypeDropdownItemText,
                                                            eventType === item &&
                                                                styles.eventTypeDropdownItemTextSelected,
                                                        ]}
                                                    >
                                                        {item}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                            nestedScrollEnabled={true}
                                        />
                                    </View>
                                )}
                            </View>

                            {/* Start Time */}
                            <View style={[styles.formSection, showEventTypeDropdown && styles.formSectionWithDropdown]}>
                                <Text style={styles.label}>Start Time</Text>
                                <View style={styles.timeInput}>
                                    <Text
                                        style={[
                                            styles.timeInputText,
                                            !startTime && styles.placeholder,
                                        ]}
                                    >
                                        {startTime || '--:--'}
                                    </Text>
                                    <Ionicons
                                        name="time-outline"
                                        size={20}
                                        color={theme.colors.textSecondary}
                                    />
                                </View>
                            </View>

                            {/* End Time */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>End Time</Text>
                                <View style={styles.timeInput}>
                                    <Text
                                        style={[
                                            styles.timeInputText,
                                            !endTime && styles.placeholder,
                                        ]}
                                    >
                                        {endTime || '--:--'}
                                    </Text>
                                    <Ionicons
                                        name="time-outline"
                                        size={20}
                                        color={theme.colors.textSecondary}
                                    />
                                </View>
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
                                    <FlatList
                                        data={DIVISIONS.filter((d) => d !== 'All Divisions')}
                                        keyExtractor={(item) => item}
                                        renderItem={({ item }) => {
                                            const isSelected = selectedDivisions.includes(item);
                                            return (
                                                <TouchableOpacity
                                                    style={styles.divisionCheckboxItem}
                                                    onPress={() => handleDivisionToggle(item)}
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
                                                        {item}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        }}
                                        nestedScrollEnabled={true}
                                        scrollEnabled={true}
                                    />
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
                        </ScrollView>

                        {/* Modal Footer */}
                        <View style={styles.modalFooter}>
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
                                onPress={handleAddEvent}
                                disabled={!title || !eventType}
                            >
                                <Text style={styles.submitButtonText}>Add Event</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
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
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    titleSection: {
        marginBottom: theme.spacing.lg,
    },
    titleContainer: {
        marginBottom: theme.spacing.sm,
    },
    title: {
        ...theme.typography.h1,
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
        marginTop: theme.spacing.md,
    },
    iconButton: {
        padding: theme.spacing.xs,
    },
    uploadBtn: {
        flexDirection: 'row',
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
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    uploadBtnText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 12,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    addBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12,
    },
    filterCard: {
        marginBottom: theme.spacing.md,
    },
    filterRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        flexWrap: 'wrap',
    },
    filterItem: {
        flex: 1,
        minWidth: 150,
    },
    filterLabel: {
        ...theme.typography.body,
        fontSize: 14,
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
    filterInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
    },
    filterInputText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    eventsCard: {
        marginBottom: theme.spacing.md,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        padding: theme.spacing.xl,
    },
    emptyText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    eventsList: {
        gap: theme.spacing.md,
    },
    eventCard: {
        padding: theme.spacing.md,
        backgroundColor: '#f9fafb',
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.sm,
    },
    eventHeaderLeft: {
        flex: 1,
    },
    eventTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: theme.spacing.xs,
    },
    eventTime: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    eventLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
    },
    eventLocationText: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    eventDivision: {
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        marginBottom: theme.spacing.xs,
    },
    eventDivisionText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: 'white',
        fontWeight: '600',
    },
    eventDescription: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        marginTop: theme.spacing.xs,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    addEventModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '90%',
        paddingBottom: theme.spacing.xl,
    },
    addEventScroll: {
        paddingHorizontal: theme.spacing.md,
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
    },
    emptyStateText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    datePickerContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        width: '90%',
        maxWidth: 400,
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
        borderRadius: theme.borderRadius.lg,
        width: '90%',
        maxWidth: 600,
        maxHeight: '90%',
        ...theme.shadows.card,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: theme.spacing.xs,
    },
    modalSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    formSection: {
        marginTop: theme.spacing.lg,
        paddingHorizontal: theme.spacing.md,
    },
    formLabel: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: theme.spacing.sm,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
    },
    inputField: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        paddingVertical: 0,
    },
    textArea: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        minHeight: 100,
    },
    addEventBtn: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.xl,
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    addEventBtnText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    bottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        maxHeight: '30%',
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
    bottomSheetOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },
    pickerModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '60%',
        paddingBottom: theme.spacing.xl,
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
    },
    pickerContent: {
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
    },
    pickerOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...theme.typography.h3,
    },
    closeButton: {
        padding: theme.spacing.xs,
    },
    modalContent: {
        flex: 1,
    },
    modalScrollContent: {
        padding: theme.spacing.lg,
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
    formSectionWithDropdown: {
        marginTop: 320,
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
    pickerOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },
    datePickerContainer: {
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
        maxHeight: 300,
    },
    dateSection: {
        marginBottom: theme.spacing.lg,
    },
    dateSectionTitle: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: theme.spacing.sm,
    },
    dateOptionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
    },
    dateOption: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minWidth: 50,
        alignItems: 'center',
    },
    dateOptionSelected: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    dateOptionText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    dateOptionTextSelected: {
        color: 'white',
        fontWeight: '600',
    },
    pickerConfirmBtn: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
        marginHorizontal: theme.spacing.md,
    },
    pickerConfirmBtnText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});

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
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
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
});
