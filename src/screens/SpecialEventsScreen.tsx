import React, { useState } from 'react';
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
