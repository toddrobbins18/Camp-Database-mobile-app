import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
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

// Mock activities data (empty for now as per screenshot)
const MOCK_ACTIVITIES: any[] = [];

type CalendarView = 'Month' | 'Week' | 'Day' | 'Agenda';

export const ActivitiesFieldTripsScreen = ({ navigation }: any) => {
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [isDivisionDropdownOpen, setIsDivisionDropdownOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [calendarView, setCalendarView] = useState<CalendarView>('Month');
    const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 22)); // January 22, 2026
    const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1)); // January 2026

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

    // Format week range (e.g., "January 18 – 24")
    const formatWeekRange = (date: Date) => {
        const weekDays = getWeekDays(date);
        const start = weekDays[0];
        const end = weekDays[6];
        
        if (start.getMonth() === end.getMonth()) {
            return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()} – ${end.getDate()}`;
        } else {
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
    };

    // Format day view date (e.g., "Thursday Jan 22")
    const formatDayDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    };

    // Format agenda range (e.g., "01/22/2026 – 02/21/2026")
    const formatAgendaRange = (date: Date) => {
        const start = new Date(date);
        const end = new Date(date);
        end.setMonth(end.getMonth() + 1);
        
        const startStr = start.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        const endStr = end.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        
        return `${startStr} – ${endStr}`;
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

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Ionicons name="menu" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <View style={styles.headerTitleRow}>
                        <Ionicons name="leaf" size={24} color={theme.colors.primary} />
                        <Text style={styles.headerTitle}>Activities & Field Trips</Text>
                    </View>
                    <Text style={styles.headerSubtitle}>Schedule and manage activities and field trips for The Nest.</Text>
                </View>
                <TouchableOpacity>
                    <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Controls Bar */}
                <View style={styles.controlsBar}>
                    {/* Division Filter */}
                    <View style={styles.divisionFilterContainer}>
                        <TouchableOpacity
                            style={styles.divisionDropdown}
                            onPress={() => setIsDivisionDropdownOpen(!isDivisionDropdownOpen)}
                        >
                            <Text style={styles.divisionText}>{selectedDivision}</Text>
                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {/* Division Dropdown Modal */}
                        <Modal
                            visible={isDivisionDropdownOpen}
                            transparent={true}
                            animationType="fade"
                            onRequestClose={() => setIsDivisionDropdownOpen(false)}
                        >
                            <TouchableOpacity
                                style={styles.modalOverlay}
                                activeOpacity={1}
                                onPress={() => setIsDivisionDropdownOpen(false)}
                            >
                                <View style={styles.dropdownModal}>
                                    <ScrollView style={styles.dropdownScroll}>
                                        {MOCK_DIVISIONS.map((division) => (
                                            <TouchableOpacity
                                                key={division.id}
                                                style={[
                                                    styles.dropdownItem,
                                                    selectedDivision === division.name && styles.dropdownItemSelected
                                                ]}
                                                onPress={() => {
                                                    setSelectedDivision(division.name);
                                                    setIsDivisionDropdownOpen(false);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.dropdownItemText,
                                                    selectedDivision === division.name && styles.dropdownItemTextSelected
                                                ]}>
                                                    {division.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </TouchableOpacity>
                        </Modal>
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
                        <TouchableOpacity style={styles.iconButton}>
                            <Ionicons name="help-circle-outline" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {/* Upload CSV Button */}
                        <TouchableOpacity style={styles.uploadButton}>
                            <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.surface} />
                            <Text style={styles.uploadButtonText}>Upload CSV</Text>
                        </TouchableOpacity>

                        {/* Add Activity Button */}
                        <TouchableOpacity style={styles.addButton}>
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
                            <ScrollView 
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
                            </ScrollView>
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
                                <ScrollView style={styles.weekScrollView} nestedScrollEnabled>
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
                                </ScrollView>
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
                                <ScrollView style={styles.dayScrollView} nestedScrollEnabled>
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
                                </ScrollView>
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

                {/* List View (placeholder for now) */}
                {viewMode === 'list' && (
                    <StyledCard>
                        <Text style={styles.emptyText}>List view coming soon</Text>
                    </StyledCard>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: theme.spacing.md,
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
        marginTop: theme.spacing.xs,
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
    divisionFilterContainer: {
        flex: 1,
        minWidth: 150,
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
});
