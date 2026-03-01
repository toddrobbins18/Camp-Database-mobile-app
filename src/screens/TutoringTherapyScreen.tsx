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
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useTutoringTherapy, useAddTutoringEntry, useDeleteTutoringEntry } from '../api/rainy_day_tutoring';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface TutoringTherapyScreenProps {
    navigation: any;
}

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

const SERVICES = [
    'All Services',
    'Math Tutoring',
    'Reading Tutoring',
    'Science Tutoring',
    'Speech Therapy',
    'Occupational Therapy',
    'Physical Therapy',
    'Behavioral Therapy',
    'Music Therapy',
    'Art Therapy',
    'ESL Tutoring',
];

// Fetch campers from Supabase instead of hardcoding
const SCHEDULE_PERIODS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

export const TutoringTherapyScreen = ({ navigation }: TutoringTherapyScreenProps) => {
    // Fetch tutoring data from Supabase
    const { data: enrollments = [], isLoading: enrollmentsLoading } = useTutoringTherapy('2026');
    const addEntryMutation = useAddTutoringEntry();
    const deleteEntryMutation = useDeleteTutoringEntry();

    // Fetch campers from Supabase
    const { data: CAMPERS = [] } = useQuery({
        queryKey: ['campers_for_tutoring'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('children')
                .select('id, first_name, last_name')
                .order('last_name', { ascending: true });
            if (error) throw error;
            return (data || []).map((c: any) => `${c.first_name} ${c.last_name}`);
        },
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [selectedGender, setSelectedGender] = useState('All Genders');
    const [selectedService, setSelectedService] = useState('All Services');

    // Dropdown states
    const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
    const [showGenderDropdown, setShowGenderDropdown] = useState(false);
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);

    // Add Enrollment Modal states
    const [showAddEnrollmentModal, setShowAddEnrollmentModal] = useState(false);
    const [selectedCamper, setSelectedCamper] = useState('');
    const [selectedServiceType, setSelectedServiceType] = useState('');
    const [instructorName, setInstructorName] = useState('');
    const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [notes, setNotes] = useState('');

    // Modal dropdown states
    const [showCamperDropdown, setShowCamperDropdown] = useState(false);
    const [showServiceTypeDropdown, setShowServiceTypeDropdown] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    // Date picker states
    const [startDatePickerMonth, setStartDatePickerMonth] = useState(new Date().getMonth());
    const [startDatePickerYear, setStartDatePickerYear] = useState(new Date().getFullYear());
    const [endDatePickerMonth, setEndDatePickerMonth] = useState(new Date().getMonth());
    const [endDatePickerYear, setEndDatePickerYear] = useState(new Date().getFullYear());

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const formatDate = (d: Date) => {
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        return `${month}/${day}/${year}`;
    };

    const togglePeriod = (period: string) => {
        if (selectedPeriods.includes(period)) {
            setSelectedPeriods(selectedPeriods.filter(p => p !== period));
        } else {
            setSelectedPeriods([...selectedPeriods, period]);
        }
    };

    const renderBottomSheetDropdown = (
        visible: boolean,
        onClose: () => void,
        data: string[],
        selected: string,
        onSelect: (item: string) => void,
        title?: string
    ) => {
        return (
            <Modal
                visible={visible}
                transparent
                animationType="slide"
                onRequestClose={onClose}
            >
                <TouchableOpacity
                    style={styles.bottomSheetOverlay}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <View style={styles.bottomSheetContainer} onStartShouldSetResponder={() => true}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>{title || 'Select Option'}</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={data}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.bottomSheetItem,
                                        selected === item && styles.bottomSheetItemSelected,
                                    ]}
                                    onPress={() => {
                                        onSelect(item);
                                        onClose();
                                    }}
                                >
                                    {selected === item && (
                                        <Ionicons
                                            name="checkmark"
                                            size={20}
                                            color={theme.colors.secondary}
                                            style={styles.checkIcon}
                                        />
                                    )}
                                    <Text
                                        style={[
                                            styles.bottomSheetItemText,
                                            selected === item && styles.bottomSheetItemTextSelected,
                                        ]}
                                    >
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            nestedScrollEnabled={true}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        );
    };

    const renderDatePicker = (visible: boolean, onClose: () => void, date: string, onSelect: (date: string) => void, month: number, year: number, setMonth: (m: number) => void, setYear: (y: number) => void) => {
        const today = new Date();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startingDayOfWeek = firstDayOfMonth.getDay();

        const monthDates = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            monthDates.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            monthDates.push(new Date(year, month, i));
        }

        return (
            <Modal
                visible={visible}
                transparent
                animationType="slide"
                onRequestClose={onClose}
            >
                <TouchableOpacity
                    style={styles.bottomSheetOverlay}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <View style={styles.datePickerBottomSheet} onStartShouldSetResponder={() => true}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Date</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.datePickerHeader}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (month === 0) {
                                        setMonth(11);
                                        setYear(year - 1);
                                    } else {
                                        setMonth(month - 1);
                                    }
                                }}
                            >
                                <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.datePickerMonth}>
                                {monthNames[month]} {year}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    if (month === 11) {
                                        setMonth(0);
                                        setYear(year + 1);
                                    } else {
                                        setMonth(month + 1);
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
                            {monthDates.map((d, index) => {
                                if (!d) {
                                    return <View key={index} style={styles.dateCell} />;
                                }
                                const dateStr = formatDate(d);
                                const isToday = formatDate(d) === formatDate(today);
                                const isSelected = date && formatDate(d) === date;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.dateCell,
                                            isToday && styles.todayCell,
                                            isSelected && styles.selectedDateCell,
                                        ]}
                                        onPress={() => {
                                            onSelect(dateStr);
                                            onClose();
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.dateCellText,
                                                isSelected && styles.selectedDateText,
                                            ]}
                                        >
                                            {d.getDate()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <View style={styles.datePickerActions}>
                            <TouchableOpacity
                                onPress={() => {
                                    onSelect('');
                                    onClose();
                                }}
                            >
                                <Text style={styles.datePickerActionText}>Clear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    onSelect(formatDate(today));
                                    onClose();
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

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>Tutoring & Therapy</Text>
                        <Text style={styles.headerSubtitle}>Manage tutoring and therapy enrollments</Text>
                    </View>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Add Enrollment Button */}
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddEnrollmentModal(true)}
                >
                    <Ionicons name="add" size={20} color={theme.colors.surface} />
                    <Text style={styles.addButtonText}>Add Enrollment</Text>
                </TouchableOpacity>

                {/* Filters Section */}
                <StyledCard style={styles.filtersCard}>
                    <View style={styles.filtersHeader}>
                        <Ionicons name="filter-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.filtersTitle}>Filters</Text>
                    </View>

                    {/* Search */}
                    <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>Search</Text>
                        <View style={styles.searchInputContainer}>
                            <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search campers or services..."
                                placeholderTextColor={theme.colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>

                    {/* Division Dropdown */}
                    <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>Division</Text>
                        <TouchableOpacity
                            style={styles.dropdownInput}
                            onPress={() => {
                                setShowDivisionDropdown(true);
                                setShowGenderDropdown(false);
                                setShowServiceDropdown(false);
                            }}
                        >
                            <Text style={[styles.dropdownText, !selectedDivision && styles.placeholder]}>
                                {selectedDivision || 'Select Division'}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Gender Dropdown */}
                    <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>Gender</Text>
                        <TouchableOpacity
                            style={styles.dropdownInput}
                            onPress={() => {
                                setShowGenderDropdown(true);
                                setShowDivisionDropdown(false);
                                setShowServiceDropdown(false);
                            }}
                        >
                            <Text style={[styles.dropdownText, !selectedGender && styles.placeholder]}>
                                {selectedGender || 'Select Gender'}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Service Dropdown */}
                    <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>Service</Text>
                        <TouchableOpacity
                            style={styles.dropdownInput}
                            onPress={() => {
                                setShowServiceDropdown(true);
                                setShowDivisionDropdown(false);
                                setShowGenderDropdown(false);
                            }}
                        >
                            <Text style={[styles.dropdownText, !selectedService && styles.placeholder]}>
                                {selectedService || 'Select Service'}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </StyledCard>

                {/* Content Area - Show live enrollments or empty state */}
                <View style={styles.contentArea}>
                    {enrollmentsLoading ? (
                        <ActivityIndicator size="large" color={theme.colors.secondary} />
                    ) : enrollments.length === 0 ? (
                        <Text style={styles.emptyStateText}>No enrollments found</Text>
                    ) : (
                        enrollments.map((entry: any) => (
                            <StyledCard key={entry.id} style={{ marginBottom: 8, padding: 12 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: '600', color: theme.colors.text }}>{entry.service_type}</Text>
                                        <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                                            Instructor: {entry.instructor || 'N/A'} • Periods: {(entry.schedule_periods || []).join(', ') || 'N/A'}
                                        </Text>
                                        {entry.notes && <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>{entry.notes}</Text>}
                                    </View>
                                    <TouchableOpacity onPress={() => deleteEntryMutation.mutate(entry.id)}>
                                        <Ionicons name="trash-outline" size={20} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            </StyledCard>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Bottom Sheet Dropdowns */}
            {renderBottomSheetDropdown(
                showDivisionDropdown,
                () => setShowDivisionDropdown(false),
                DIVISIONS,
                selectedDivision,
                setSelectedDivision,
                'Select Division'
            )}
            {renderBottomSheetDropdown(
                showGenderDropdown,
                () => setShowGenderDropdown(false),
                GENDERS,
                selectedGender,
                setSelectedGender,
                'Select Gender'
            )}
            {renderBottomSheetDropdown(
                showServiceDropdown,
                () => setShowServiceDropdown(false),
                SERVICES,
                selectedService,
                setSelectedService,
                'Select Service'
            )}

            {/* Add Enrollment Modal */}
            <Modal
                visible={showAddEnrollmentModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAddEnrollmentModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Enrollment</Text>
                            <TouchableOpacity onPress={() => setShowAddEnrollmentModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={true}>
                            {/* Camper */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>
                                    Camper <Text style={styles.required}>*</Text>
                                </Text>
                                <TouchableOpacity
                                    style={styles.modalDropdownInput}
                                    onPress={() => {
                                        setShowCamperDropdown(true);
                                        setShowServiceTypeDropdown(false);
                                    }}
                                >
                                    <Text style={[styles.modalDropdownText, !selectedCamper && styles.placeholder]}>
                                        {selectedCamper || 'Select camper'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Service Type */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>
                                    Service Type <Text style={styles.required}>*</Text>
                                </Text>
                                <TouchableOpacity
                                    style={styles.modalDropdownInput}
                                    onPress={() => {
                                        setShowServiceTypeDropdown(true);
                                        setShowCamperDropdown(false);
                                    }}
                                >
                                    <Text style={[styles.modalDropdownText, !selectedServiceType && styles.placeholder]}>
                                        {selectedServiceType || 'Select service type'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Instructor/Therapist */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Instructor/Therapist</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter instructor/therapist name"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={instructorName}
                                    onChangeText={setInstructorName}
                                />
                            </View>

                            {/* Schedule Periods */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Schedule Periods</Text>
                                <View style={styles.periodsGrid}>
                                    {SCHEDULE_PERIODS.map((period) => (
                                        <TouchableOpacity
                                            key={period}
                                            style={[
                                                styles.periodButton,
                                                selectedPeriods.includes(period) && styles.periodButtonSelected,
                                            ]}
                                            onPress={() => togglePeriod(period)}
                                        >
                                            <Text
                                                style={[
                                                    styles.periodButtonText,
                                                    selectedPeriods.includes(period) && styles.periodButtonTextSelected,
                                                ]}
                                            >
                                                {period}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Start Date */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Start Date</Text>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => {
                                        setShowStartDatePicker(true);
                                        setShowEndDatePicker(false);
                                    }}
                                >
                                    <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                                    <Text style={[styles.dateInputText, !startDate && styles.placeholder]}>
                                        {startDate || 'Pick a date'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* End Date */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>End Date</Text>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => {
                                        setShowEndDatePicker(true);
                                        setShowStartDatePicker(false);
                                    }}
                                >
                                    <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                                    <Text style={[styles.dateInputText, !endDate && styles.placeholder]}>
                                        {endDate || 'Pick a date'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Notes */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Notes</Text>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Additional notes..."
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
                                onPress={() => setShowAddEnrollmentModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.createButton, (!selectedCamper || !selectedServiceType) && styles.createButtonDisabled]}
                                onPress={() => {
                                    if (selectedCamper && selectedServiceType) {
                                        // Save to Supabase
                                        addEntryMutation.mutate({
                                            child_id: selectedCamper, // Note: in real use, this should be the camper's UUID
                                            service_type: selectedServiceType,
                                            instructor: instructorName || undefined,
                                            schedule_periods: selectedPeriods,
                                            start_date: startDate || undefined,
                                            end_date: endDate || undefined,
                                            notes: notes || undefined,
                                            season: '2026',
                                        }, {
                                            onSuccess: () => {
                                                Alert.alert('Success', 'Enrollment created!');
                                                setShowAddEnrollmentModal(false);
                                                setSelectedCamper('');
                                                setSelectedServiceType('');
                                                setInstructorName('');
                                                setSelectedPeriods([]);
                                                setStartDate('');
                                                setEndDate('');
                                                setNotes('');
                                            },
                                            onError: () => {
                                                Alert.alert('Error', 'Failed to create enrollment.');
                                            },
                                        });
                                    }
                                }}
                            >
                                <Text style={styles.createButtonText}>Create Enrollment</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Bottom Sheet Dropdowns */}
            {renderBottomSheetDropdown(
                showCamperDropdown,
                () => setShowCamperDropdown(false),
                CAMPERS,
                selectedCamper,
                setSelectedCamper,
                'Select Camper'
            )}
            {renderBottomSheetDropdown(
                showServiceTypeDropdown,
                () => setShowServiceTypeDropdown(false),
                SERVICES.filter(s => s !== 'All Services'),
                selectedServiceType,
                setSelectedServiceType,
                'Select Service Type'
            )}

            {/* Date Pickers */}
            {renderDatePicker(
                showStartDatePicker,
                () => setShowStartDatePicker(false),
                startDate,
                setStartDate,
                startDatePickerMonth,
                startDatePickerYear,
                setStartDatePickerMonth,
                setStartDatePickerYear
            )}
            {renderDatePicker(
                showEndDatePicker,
                () => setShowEndDatePicker(false),
                endDate,
                setEndDate,
                endDatePickerMonth,
                endDatePickerYear,
                setEndDatePickerMonth,
                setEndDatePickerYear
            )}
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
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
    },
    headerContent: {
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xs,
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.lg,
    },
    addButtonText: {
        color: theme.colors.surface,
        fontSize: 14,
        fontWeight: '600',
    },
    filtersCard: {
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    filtersHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.lg,
    },
    filtersTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    filterGroup: {
        marginBottom: theme.spacing.lg,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        height: 44,
        backgroundColor: theme.colors.surface,
    },
    searchIcon: {
        marginRight: theme.spacing.xs,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
    },
    dropdownInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        height: 44,
        backgroundColor: theme.colors.surface,
    },
    dropdownText: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    placeholder: {
        color: theme.colors.textSecondary,
    },
    contentArea: {
        minHeight: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    // Bottom Sheet Styles
    bottomSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    bottomSheetContainer: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.lg,
        borderTopRightRadius: theme.borderRadius.lg,
        maxHeight: '80%',
        paddingBottom: theme.spacing.lg,
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    bottomSheetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    bottomSheetItemSelected: {
        backgroundColor: '#fff7ed',
    },
    checkIcon: {
        marginRight: theme.spacing.md,
    },
    bottomSheetItemText: {
        fontSize: 16,
        color: theme.colors.text,
        flex: 1,
    },
    bottomSheetItemTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    modalContainer: {
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
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    modalContent: {
        padding: theme.spacing.lg,
        maxHeight: 500,
    },
    formGroup: {
        marginBottom: theme.spacing.lg,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    required: {
        color: theme.colors.danger,
    },
    modalDropdownInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        height: 44,
        backgroundColor: theme.colors.surface,
    },
    modalDropdownText: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    textInput: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        height: 44,
    },
    periodsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    periodButton: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        minWidth: 60,
        alignItems: 'center',
    },
    periodButtonSelected: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    periodButtonText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    periodButtonTextSelected: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        height: 44,
        backgroundColor: theme.colors.surface,
    },
    dateInputText: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    textArea: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        minHeight: 100,
        textAlignVertical: 'top',
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
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '600',
    },
    createButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    createButtonDisabled: {
        backgroundColor: theme.colors.textSecondary,
        opacity: 0.5,
    },
    createButtonText: {
        fontSize: 14,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    // Date Picker Bottom Sheet
    datePickerBottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.lg,
        borderTopRightRadius: theme.borderRadius.lg,
        maxHeight: '80%',
        paddingBottom: theme.spacing.lg,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    datePickerMonth: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    datePickerWeekdays: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
    },
    weekdayText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        width: 30,
        textAlign: 'center',
    },
    datePickerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    dateCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateCellText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    todayCell: {
        backgroundColor: theme.colors.background,
        borderRadius: 20,
    },
    selectedDateCell: {
        backgroundColor: theme.colors.secondary,
        borderRadius: 20,
    },
    selectedDateText: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    datePickerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.md,
    },
    datePickerActionText: {
        color: theme.colors.secondary,
        fontWeight: '600',
        fontSize: 14,
    },
});
