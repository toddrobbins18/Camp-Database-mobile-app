import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    FlatList,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCamperReports } from '../api/evaluations';
import { useDivisionsLookup } from '../api/permissions';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

interface ReportsScreenProps {
    navigation: any;
}

const REPORT_TYPES = [
    'Incident Reports',
    'Staff Evaluations',
    'Awards',
    'Sports Events',
    'Schedule Conflicts',
    'Medication Schedule',
    'Allergy Report',
    'Re-Enrollment Report',
    'Trips',
    'Activities & Field Trips',
];

export const ReportsScreen = ({ navigation }: ReportsScreenProps) => {
    const queryClient = useQueryClient();
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [reportGenerated, setReportGenerated] = useState(false);
    const { data: dbDivisions = [] } = useDivisionsLookup(companyId);
    const DIVISIONS = ['All Divisions', ...dbDivisions.map((d: any) => d.name)];
    useEffect(() => {
        supabase.auth.getUser().then(async ({ data }) => {
            if (data.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('company_id')
                    .eq('id', data.user.id)
                    .single();
                setCompanyId(profile?.company_id || null);
            }
        });
    }, []);

    // Fetch camper reports from Supabase
    const { data: reports = [], isLoading: reportsLoading } = useCamperReports(companyId, '2026');

    const [reportType, setReportType] = useState('Incident Reports');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [showReportTypeDropdown, setShowReportTypeDropdown] = useState(false);
    const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [startDatePickerMonth, setStartDatePickerMonth] = useState(new Date().getMonth());
    const [startDatePickerYear, setStartDatePickerYear] = useState(new Date().getFullYear());
    const [endDatePickerMonth, setEndDatePickerMonth] = useState(new Date().getMonth());
    const [endDatePickerYear, setEndDatePickerYear] = useState(new Date().getFullYear());

    const formatDate = (date: Date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    const handleDateSelect = (date: Date, type: 'start' | 'end') => {
        const formatted = formatDate(date);
        if (type === 'start') {
            setStartDate(formatted);
            setShowStartDatePicker(false);
        } else {
            setEndDate(formatted);
            setShowEndDatePicker(false);
        }
    };

    const renderDatePicker = (type: 'start' | 'end', visible: boolean, onClose: () => void) => {
        const currentMonth = type === 'start' ? startDatePickerMonth : endDatePickerMonth;
        const currentYear = type === 'start' ? startDatePickerYear : endDatePickerYear;
        const today = new Date();
        const selectedDate = type === 'start' ? startDate : endDate;

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startingDayOfWeek = firstDayOfMonth.getDay();

        const monthDates = [];
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            monthDates.push(null);
        }
        // Add all days of the current month
        for (let i = 1; i <= daysInMonth; i++) {
            monthDates.push(new Date(currentYear, currentMonth, i));
        }

        return (
            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                <Pressable
                    style={styles.modalOverlay}
                    onPress={onClose}
                >
                    <Pressable style={styles.bottomSheetContainer} onPress={e => e.stopPropagation()}>
                        <View style={styles.dragger} />
                        <ScrollView showsVerticalScrollIndicator={false}>
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
                                    <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>
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
                                    <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
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
                                    const isSelected = selectedDate === formatDate(date);

                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.dateCell,
                                                isSelected && styles.selectedDateCell,
                                            ]}
                                            onPress={() => {
                                                const formatted = formatDate(date);
                                                if (type === 'start') {
                                                    setStartDate(formatted);
                                                } else {
                                                    setEndDate(formatted);
                                                }
                                                onClose();
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.dateText,
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
                                        const formatted = formatDate(today);
                                        if (type === 'start') setStartDate(formatted);
                                        else setEndDate(formatted);
                                        onClose();
                                    }}
                                >
                                    <Text style={styles.datePickerActionText}>Today</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
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
                    <Text style={styles.headerTitle}>Reports</Text>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.subtitle}>
                    View and export comprehensive reports across all modules
                </Text>

                {/* Master Reporting Center Card */}
                <StyledCard style={styles.masterCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="document-text" size={24} color={theme.colors.secondary} />
                        <Text style={styles.cardTitle}>Master Reporting Center</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>
                        Generate comprehensive reports and export data
                    </Text>

                    {/* Filter Section */}
                    <View style={styles.filterSection}>
                        {/* Report Type */}
                        <View style={styles.filterItem}>
                            <Text style={styles.filterLabel}>Report Type</Text>
                            <TouchableOpacity
                                style={styles.dropdown}
                                onPress={() => setShowReportTypeDropdown(!showReportTypeDropdown)}
                            >
                                <Text style={styles.dropdownText}>{reportType}</Text>
                                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                            {/* Report Type Dropdown Modal */}
                            <Modal
                                visible={showReportTypeDropdown}
                                transparent
                                animationType="slide"
                                onRequestClose={() => setShowReportTypeDropdown(false)}
                            >
                                <Pressable
                                    style={styles.modalOverlay}
                                    onPress={() => setShowReportTypeDropdown(false)}
                                >
                                    <Pressable style={styles.bottomSheetContainer} onPress={e => e.stopPropagation()}>
                                        <View style={styles.dragger} />
                                        <View style={styles.bottomSheetHeader}>
                                            <Text style={styles.modalTitle}>Select Report Type</Text>
                                        </View>
                                        <FlatList
                                            data={REPORT_TYPES}
                                            keyExtractor={(item) => item}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.dropdownItem,
                                                        reportType === item && styles.dropdownItemSelected,
                                                    ]}
                                                    onPress={() => {
                                                        setReportType(item);
                                                        setShowReportTypeDropdown(false);
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.dropdownItemText,
                                                            reportType === item && styles.dropdownItemTextSelected,
                                                        ]}
                                                    >
                                                        {item}
                                                    </Text>
                                                    {reportType === item && (
                                                        <Ionicons
                                                            name="checkmark"
                                                            size={20}
                                                            color={theme.colors.secondary}
                                                            style={styles.checkIcon}
                                                        />
                                                    )}
                                                </TouchableOpacity>
                                            )}
                                        />
                                    </Pressable>
                                </Pressable>
                            </Modal>
                        </View>

                        {/* Start Date */}
                        <View style={styles.filterItem}>
                            <Text style={styles.filterLabel}>Start Date</Text>
                            <TouchableOpacity
                                style={styles.dateInput}
                                onPress={() => setShowStartDatePicker(true)}
                            >
                                <Text style={[styles.dateInputText, !startDate && styles.placeholder]}>
                                    {startDate || 'mm/dd/yyyy'}
                                </Text>
                                <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                            {renderDatePicker('start', showStartDatePicker, () => setShowStartDatePicker(false))}
                        </View>

                        {/* End Date */}
                        <View style={styles.filterItem}>
                            <Text style={styles.filterLabel}>End Date</Text>
                            <TouchableOpacity
                                style={styles.dateInput}
                                onPress={() => setShowEndDatePicker(true)}
                            >
                                <Text style={[styles.dateInputText, !endDate && styles.placeholder]}>
                                    {endDate || 'mm/dd/yyyy'}
                                </Text>
                                <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                            {renderDatePicker('end', showEndDatePicker, () => setShowEndDatePicker(false))}
                        </View>

                        {/* Filter by Division */}
                        <View style={styles.filterItem}>
                            <Text style={styles.filterLabel}>Filter by Division</Text>
                            <TouchableOpacity
                                style={styles.divisionButton}
                                onPress={() => setShowDivisionDropdown(!showDivisionDropdown)}
                            >
                                <Ionicons name="filter-outline" size={20} color={theme.colors.textSecondary} />
                                <Text style={styles.divisionButtonText}>{selectedDivision}</Text>
                                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                            {/* Division Dropdown Modal */}
                            <Modal
                                visible={showDivisionDropdown}
                                transparent
                                animationType="slide"
                                onRequestClose={() => setShowDivisionDropdown(false)}
                            >
                                <Pressable
                                    style={styles.modalOverlay}
                                    onPress={() => setShowDivisionDropdown(false)}
                                >
                                    <Pressable style={styles.bottomSheetContainer} onPress={e => e.stopPropagation()}>
                                        <View style={styles.dragger} />
                                        <View style={styles.bottomSheetHeader}>
                                            <Text style={styles.modalTitle}>Select Divisions</Text>
                                        </View>
                                        <FlatList
                                            data={DIVISIONS}
                                            keyExtractor={(item) => item}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    style={styles.dropdownItem}
                                                    onPress={() => {
                                                        setSelectedDivision(item);
                                                        setShowDivisionDropdown(false);
                                                    }}
                                                >
                                                    <Text style={[
                                                        styles.dropdownItemText,
                                                        selectedDivision === item && styles.dropdownItemTextSelected
                                                    ]}>{item}</Text>
                                                    {selectedDivision === item && (
                                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} style={styles.checkIcon} />
                                                    )}
                                                </TouchableOpacity>
                                            )}
                                        />
                                    </Pressable>
                                </Pressable>
                            </Modal>
                        </View>

                        {/* Generate Report Button */}
                        <TouchableOpacity
                            style={styles.generateButton}
                            onPress={() => {
                                queryClient.invalidateQueries({ queryKey: ['camper_reports'] });
                                setReportGenerated(true);
                            }}
                        >
                            <Text style={styles.generateButtonText}>Generate Report</Text>
                        </TouchableOpacity>
                        {reportGenerated ? (
                            <Text style={[styles.subtitle, { marginTop: 8, color: theme.colors.primary }]}>
                                Report refreshed. Summary below.
                            </Text>
                        ) : null}
                    </View>

                    {/* Summary Cards */}
                    <View style={styles.summaryCards}>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryNumber}>{reports.length}</Text>
                            <Text style={styles.summaryLabel}>Total Reports</Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryNumber}>{reports.filter((r: any) => r.report_type === '10_day').length}</Text>
                            <Text style={styles.summaryLabel}>10-Day</Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryNumber}>{reports.filter((r: any) => r.report_type === 'end_of_summer').length}</Text>
                            <Text style={styles.summaryLabel}>End of Summer</Text>
                        </View>
                    </View>

                    {/* No Data Message */}
                    <View style={styles.emptyState}>
                        <Ionicons name="document-text-outline" size={64} color={theme.colors.textSecondary} />
                        <Text style={styles.emptyStateText}>
                            No data available for the selected criteria
                        </Text>
                        <Text style={styles.emptyStateSubtext}>Try adjusting your filters</Text>
                    </View>
                </StyledCard>
            </ScrollView>
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
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    headerTitle: {
        ...theme.typography.h2,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    masterCard: {
        marginBottom: theme.spacing.lg,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    cardTitle: {
        ...theme.typography.h3,
        marginLeft: theme.spacing.xs,
    },
    cardSubtitle: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    filterSection: {
        marginBottom: theme.spacing.lg,
    },
    filterItem: {
        marginBottom: theme.spacing.md,
    },
    filterLabel: {
        ...theme.typography.bodySmall,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
        color: theme.colors.text,
    },
    dropdown: {
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
    dropdownText: {
        ...theme.typography.body,
        flex: 1,
    },
    dropdownMenu: {
        marginTop: theme.spacing.xs,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxHeight: 200,
        ...theme.shadows.card,
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
    placeholder: {
        color: theme.colors.textSecondary,
    },
    divisionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        minHeight: 44,
    },
    divisionButtonText: {
        ...theme.typography.body,
        flex: 1,
        marginLeft: theme.spacing.xs,
    },
    divisionDropdown: {
        marginTop: theme.spacing.xs,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxHeight: 300,
        ...theme.shadows.card,
    },
    divisionDropdownTitle: {
        ...theme.typography.body,
        fontWeight: '600',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    divisionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonSelected: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.secondary,
    },
    divisionItemText: {
        ...theme.typography.body,
        flex: 1,
    },
    generateButton: {
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        marginTop: theme.spacing.sm,
    },
    generateButtonText: {
        ...theme.typography.body,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    summaryCards: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.md,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    summaryNumber: {
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    summaryLabel: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.xl,
    },
    emptyStateText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.md,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        alignItems: 'center', // Center the bottom sheet on large screens
    },
    bottomSheetContainer: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        maxHeight: '80%',
        width: '100%',
        maxWidth: 600, // prevent full width on large screens
        ...theme.shadows.card,
    },
    dragger: {
        width: 40,
        height: 4,
        backgroundColor: theme.colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: theme.spacing.lg,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    bottomSheetHeader: {
        marginBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingBottom: theme.spacing.sm,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dropdownItemSelected: {
        backgroundColor: theme.colors.secondary + '10',
    },
    checkIcon: {
        marginLeft: 'auto',
    },
    dropdownItemText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    dropdownItemTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
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
        borderRadius: 999, // full circle
    },
    selectedDateCell: {
        backgroundColor: theme.colors.primary,
    },
    todayDateCell: {
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    dateText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    selectedDateText: {
        color: 'white',
        fontWeight: 'bold',
    },
    todayDateText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    datePickerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
    },
    datePickerActionText: {
        color: theme.colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },

});
