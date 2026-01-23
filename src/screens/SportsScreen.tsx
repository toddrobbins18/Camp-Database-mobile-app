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

interface SportsScreenProps {
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

const GENDERS = ['All Genders', 'Boys', 'Girls'];
const SPORTS = ['All Sports', 'Soccer', 'Basketball', 'Tennis', 'Swimming', 'Baseball', 'Volleyball'];

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

export const SportsScreen = ({ navigation }: SportsScreenProps) => {
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [selectedGender, setSelectedGender] = useState('All Genders');
    const [selectedSport, setSelectedSport] = useState('All Sports');
    const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
    const [showGenderDropdown, setShowGenderDropdown] = useState(false);
    const [showSportDropdown, setShowSportDropdown] = useState(false);
    const [showCalendarView, setShowCalendarView] = useState(false);
    const [selectedDate, setSelectedDate] = useState('01/22/2026');
    const [showAddEnrollmentModal, setShowAddEnrollmentModal] = useState(false);

    // Add Enrollment Modal States
    const [camper, setCamper] = useState('');
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

    // Calendar state
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

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

    const handleDateSelect = (date: Date) => {
        setSelectedDate(formatDate(date));
    };

    const handleEnrollmentDateSelect = (date: Date, type: 'start' | 'end') => {
        const formatted = formatDate(date);
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
    ): JSX.Element => {
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
            </Modal>
        );
    };

    const handleAddEnrollment = () => {
        // TODO: Implement enrollment creation
        console.log('Adding enrollment:', {
            camper,
            sportName,
            instructor,
            schedulePeriod,
            startDate,
            endDate,
            notes,
        });
        // Reset form
        setCamper('');
        setSportName('');
        setInstructor('');
        setSchedulePeriod('');
        setStartDate('');
        setEndDate('');
        setNotes('');
        setShowAddEnrollmentModal(false);
    };

    const handleCloseAddEnrollmentModal = () => {
        setCamper('');
        setSportName('');
        setInstructor('');
        setSchedulePeriod('');
        setStartDate('');
        setEndDate('');
        setNotes('');
        setShowAddEnrollmentModal(false);
    };

    const renderCalendarView = () => {
        // Reuse calendar logic from existing code
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

        const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
        const lastDayOfMonth = new Date(calendarYear, calendarMonth + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startingDayOfWeek = firstDayOfMonth.getDay();

        const monthDates = [];
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            monthDates.push(null);
        }
        // Add all days of the current month
        for (let i = 1; i <= daysInMonth; i++) {
            monthDates.push(new Date(calendarYear, calendarMonth, i));
        }

        const today = new Date();
        const selectedDateObj = selectedDate
            ? (() => {
                  const [month, day, year] = selectedDate.split('/').map(Number);
                  return new Date(year, month - 1, day);
              })()
            : null;

        return (
            <View style={styles.calendarViewContainer}>
                {/* Calendar Widget */}
                <StyledCard style={styles.calendarCard}>
                    <View style={styles.calendarHeader}>
                        <TouchableOpacity
                            onPress={() => {
                                if (calendarMonth === 0) {
                                    setCalendarMonth(11);
                                    setCalendarYear(calendarYear - 1);
                                } else {
                                    setCalendarMonth(calendarMonth - 1);
                                }
                            }}
                        >
                            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.calendarMonthYear}>
                            {monthNames[calendarMonth]} {calendarYear}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                if (calendarMonth === 11) {
                                    setCalendarMonth(0);
                                    setCalendarYear(calendarYear + 1);
                                } else {
                                    setCalendarMonth(calendarMonth + 1);
                                }
                            }}
                        >
                            <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.calendarWeekdays}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                            <Text key={day} style={styles.calendarWeekday}>
                                {day}
                            </Text>
                        ))}
                    </View>

                    <View style={styles.calendarGrid}>
                        {monthDates.map((date, index) => {
                            if (!date) {
                                return <View key={index} style={styles.calendarDay} />;
                            }
                            const dateStr = formatDate(date);
                            const isToday = formatDate(date) === formatDate(today);
                            const isSelected =
                                selectedDateObj &&
                                formatDate(date) === formatDate(selectedDateObj);
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.calendarDay,
                                        isToday && styles.calendarDayToday,
                                        isSelected && styles.calendarDaySelected,
                                    ]}
                                    onPress={() => handleDateSelect(date)}
                                >
                                    <Text
                                        style={[
                                            styles.calendarDayText,
                                            isToday && styles.calendarDayTextToday,
                                            isSelected && styles.calendarDayTextSelected,
                                        ]}
                                    >
                                        {date.getDate()}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </StyledCard>

                {/* Daily Schedule View - Below Calendar */}
                <StyledCard style={styles.scheduleCard}>
                    <Text style={styles.scheduleDate}>
                        {selectedDateObj ? formatDateLong(selectedDateObj) : 'Select a date'}
                    </Text>
                    <Text style={styles.scheduleEmptyText}>
                        No activities scheduled for this date
                    </Text>
                </StyledCard>
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
                    <TouchableOpacity style={styles.helpButton}>
                        <Ionicons name="help-circle-outline" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.uploadButton}>
                        <Ionicons name="arrow-up-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.uploadButtonText}>Upload CSV</Text>
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
                                style={styles.filterDropdown}
                                onPress={() => {
                                    setShowDivisionDropdown(!showDivisionDropdown);
                                    setShowGenderDropdown(false);
                                    setShowSportDropdown(false);
                                }}
                            >
                                <Text style={styles.filterDropdownText}>{selectedDivision}</Text>
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
                                style={styles.filterDropdown}
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
                                style={styles.filterDropdown}
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
                    <View style={styles.emptyStateContainer}>
                        <StyledCard style={styles.emptyStateCard}>
                            <Text style={styles.emptyStateText}>
                                No sports academy enrollments found
                            </Text>
                        </StyledCard>
                    </View>
                )}
            </ScrollView>

            {/* Filter Dropdown Modals - Top Layer */}
            {showDivisionDropdown && (
                <Modal
                    visible={showDivisionDropdown}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowDivisionDropdown(false)}
                >
                    <TouchableOpacity
                        style={styles.dropdownModalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowDivisionDropdown(false)}
                    >
                        <View style={styles.dropdownModalContent}>
                            <View style={styles.filterDropdownMenuModal}>
                                <FlatList
                                    data={DIVISIONS}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.filterDropdownItem,
                                                selectedDivision === item &&
                                                    styles.filterDropdownItemSelected,
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
                                                    styles.filterDropdownItemText,
                                                    selectedDivision === item &&
                                                        styles.filterDropdownItemTextSelected,
                                                ]}
                                            >
                                                {item}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    nestedScrollEnabled={true}
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}

            {showGenderDropdown && (
                <Modal
                    visible={showGenderDropdown}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowGenderDropdown(false)}
                >
                    <TouchableOpacity
                        style={styles.dropdownModalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowGenderDropdown(false)}
                    >
                        <View style={styles.dropdownModalContent}>
                            <View style={styles.filterDropdownMenuModal}>
                                <FlatList
                                    data={GENDERS}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.filterDropdownItem,
                                                selectedGender === item &&
                                                    styles.filterDropdownItemSelected,
                                            ]}
                                            onPress={() => {
                                                setSelectedGender(item);
                                                setShowGenderDropdown(false);
                                            }}
                                        >
                                            {selectedGender === item && (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={20}
                                                    color={theme.colors.secondary}
                                                    style={styles.checkIcon}
                                                />
                                            )}
                                            <Text
                                                style={[
                                                    styles.filterDropdownItemText,
                                                    selectedGender === item &&
                                                        styles.filterDropdownItemTextSelected,
                                                ]}
                                            >
                                                {item}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    nestedScrollEnabled={true}
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}

            {showSportDropdown && (
                <Modal
                    visible={showSportDropdown}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowSportDropdown(false)}
                >
                    <TouchableOpacity
                        style={styles.dropdownModalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowSportDropdown(false)}
                    >
                        <View style={styles.dropdownModalContent}>
                            <View style={styles.filterDropdownMenuModal}>
                                <FlatList
                                    data={SPORTS}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.filterDropdownItem,
                                                selectedSport === item &&
                                                    styles.filterDropdownItemSelected,
                                            ]}
                                            onPress={() => {
                                                setSelectedSport(item);
                                                setShowSportDropdown(false);
                                            }}
                                        >
                                            {selectedSport === item && (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={20}
                                                    color={theme.colors.secondary}
                                                    style={styles.checkIcon}
                                                />
                                            )}
                                            <Text
                                                style={[
                                                    styles.filterDropdownItemText,
                                                    selectedSport === item &&
                                                        styles.filterDropdownItemTextSelected,
                                                ]}
                                            >
                                                {item}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    nestedScrollEnabled={true}
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}

            {/* Add Enrollment Modal */}
            <Modal
                visible={showAddEnrollmentModal}
                transparent
                animationType="slide"
                onRequestClose={handleCloseAddEnrollmentModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.addEnrollmentModalContainer}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Enrollment</Text>
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
                        >
                            {/* Camper */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>
                                    Camper <Text style={styles.required}>*</Text>
                                </Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Type to search for a camper..."
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={camper}
                                    onChangeText={setCamper}
                                />
                            </View>

                            {/* Sport Name */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>
                                    Sport Name <Text style={styles.required}>*</Text>
                                </Text>
                                <View style={styles.sportNameContainer}>
                                    <TouchableOpacity
                                        style={styles.sportNameDropdown}
                                        onPress={() =>
                                            setShowSportNameDropdown(!showSportNameDropdown)
                                        }
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
                                {showSportNameDropdown && (
                                    <View style={styles.sportNameDropdownMenu}>
                                        <FlatList
                                            data={ENROLLMENT_SPORTS}
                                            keyExtractor={(item) => item}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.sportNameDropdownItem,
                                                        sportName === item &&
                                                            styles.sportNameDropdownItemSelected,
                                                    ]}
                                                    onPress={() => {
                                                        setSportName(item);
                                                        setShowSportNameDropdown(false);
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.sportNameDropdownItemText,
                                                            sportName === item &&
                                                                styles.sportNameDropdownItemTextSelected,
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

                            {/* Instructor */}
                            <View style={[styles.formSection, showSportNameDropdown && styles.formSectionWithDropdown]}>
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
                                    {renderEnrollmentDatePicker(
                                        'start',
                                        showStartDatePicker,
                                        () => setShowStartDatePicker(false)
                                    )}
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
                                    {renderEnrollmentDatePicker(
                                        'end',
                                        showEndDatePicker,
                                        () => setShowEndDatePicker(false)
                                    )}
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
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleCloseAddEnrollmentModal}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    (!camper || !sportName) && styles.submitButtonDisabled,
                                ]}
                                onPress={handleAddEnrollment}
                                disabled={!camper || !sportName}
                            >
                                <Text style={styles.submitButtonText}>Add Enrollment</Text>
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
    filterDropdownText: {
        ...theme.typography.bodySmall,
        flex: 1,
    },
    dropdownModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    dropdownModalContent: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        paddingTop: 280,
        paddingHorizontal: theme.spacing.md,
    },
    filterDropdownMenuModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxHeight: 300,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    filterDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    filterDropdownItemSelected: {
        backgroundColor: '#fff7ed',
    },
    checkIcon: {
        marginRight: theme.spacing.xs,
    },
    filterDropdownItemText: {
        ...theme.typography.bodySmall,
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
        gap: theme.spacing.md,
    },
    calendarCard: {
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    calendarMonthYear: {
        ...theme.typography.h3,
        fontSize: 18,
    },
    calendarWeekdays: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    calendarWeekday: {
        ...theme.typography.bodySmall,
        fontWeight: '600',
        width: '14.28%',
        textAlign: 'center',
        color: theme.colors.textSecondary,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        marginTop: theme.spacing.sm,
    },
    calendarDay: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 40,
    },
    calendarDayToday: {
        borderRadius: 20,
        backgroundColor: theme.colors.background,
    },
    calendarDaySelected: {
        borderRadius: 20,
        backgroundColor: theme.colors.secondary,
    },
    calendarDayText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    calendarDayTextToday: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    calendarDayTextSelected: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    scheduleCard: {
        padding: theme.spacing.lg,
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
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addEnrollmentModalContainer: {
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
    sportNameDropdownMenu: {
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
    sportNameDropdownItem: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    sportNameDropdownItemSelected: {
        backgroundColor: '#fff7ed',
    },
    sportNameDropdownItemText: {
        ...theme.typography.body,
    },
    sportNameDropdownItemTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
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
});
