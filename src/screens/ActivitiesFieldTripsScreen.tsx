import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

const ScreenHeader = ({ navigation }: { navigation: any }) => (
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
);

// Division options matching the screenshot
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

export const ActivitiesFieldTripsScreen = ({ navigation }: any) => {
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [calendarView, setCalendarView] = useState<'Month' | 'Week' | 'Day' | 'Agenda'>('Month');
    const [selectedDate, setSelectedDate] = useState(new Date(2026, 0, 22)); // January 22, 2026
    const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1)); // January 2026
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

        // Add next month's leading days to fill the grid
        const remainingDays = 42 - days.length; // 6 rows * 7 days
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
        return date.getDate() === selectedDate.getDate() &&
               date.getMonth() === selectedDate.getMonth() &&
               date.getFullYear() === selectedDate.getFullYear();
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

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newMonth = new Date(currentMonth);
        if (direction === 'prev') {
            newMonth.setMonth(newMonth.getMonth() - 1);
        } else {
            newMonth.setMonth(newMonth.getMonth() + 1);
        }
        setCurrentMonth(newMonth);
    };

    const navigateWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        if (direction === 'prev') {
            newDate.setDate(newDate.getDate() - 7);
        } else {
            newDate.setDate(newDate.getDate() + 7);
        }
        setSelectedDate(newDate);
        setCurrentMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
    };

    const navigateDay = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        if (direction === 'prev') {
            newDate.setDate(newDate.getDate() - 1);
        } else {
            newDate.setDate(newDate.getDate() + 1);
        }
        setSelectedDate(newDate);
        setCurrentMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
    };

    const navigateAgenda = (direction: 'prev' | 'next') => {
        const newMonth = new Date(currentMonth);
        if (direction === 'prev') {
            newMonth.setMonth(newMonth.getMonth() - 1);
        } else {
            newMonth.setMonth(newMonth.getMonth() + 1);
        }
        setCurrentMonth(newMonth);
        // Set selected date to first day of the month
        setSelectedDate(new Date(newMonth.getFullYear(), newMonth.getMonth(), 1));
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
        setSelectedDate(today);
    };

    // Get week dates starting from Sunday
    const getWeekDates = (date: Date) => {
        const weekDates = [];
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day; // Get Sunday of the week
        startOfWeek.setDate(diff);
        
        for (let i = 0; i < 7; i++) {
            const weekDate = new Date(startOfWeek);
            weekDate.setDate(startOfWeek.getDate() + i);
            weekDates.push(weekDate);
        }
        return weekDates;
    };

    // Format week range (e.g., "January 18 - 24")
    const formatWeekRange = (date: Date) => {
        const weekDates = getWeekDates(date);
        const start = weekDates[0];
        const end = weekDates[6];
        const month = start.toLocaleDateString('en-US', { month: 'long' });
        
        if (start.getMonth() === end.getMonth()) {
            return `${month} ${start.getDate()} - ${end.getDate()}`;
        } else {
            const endMonth = end.toLocaleDateString('en-US', { month: 'long' });
            return `${month} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
        }
    };

    // Format day (e.g., "Thursday Jan 22")
    const formatDay = (date: Date) => {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = date.getDate();
        return `${dayName} ${month} ${day}`;
    };

    // Format agenda date range (e.g., "01/22/2026 – 02/21/2026")
    const formatAgendaRange = (date: Date) => {
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const startStr = start.toLocaleDateString('en-US', { 
            month: '2-digit', 
            day: '2-digit', 
            year: 'numeric' 
        });
        const endStr = end.toLocaleDateString('en-US', { 
            month: '2-digit', 
            day: '2-digit', 
            year: 'numeric' 
        });
        
        return `${startStr} – ${endStr}`;
    };

    // Generate time slots (24 hours)
    const getTimeSlots = () => {
        const slots = [];
        for (let hour = 0; hour < 24; hour++) {
            const time = new Date();
            time.setHours(hour, 0, 0, 0);
            const timeString = time.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
            slots.push(timeString);
        }
        return slots;
    };

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekDates = getWeekDates(selectedDate);
    const timeSlots = getTimeSlots();

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <ScreenHeader navigation={navigation} />

                {/* Action Bar */}
                <View style={styles.actionBar}>
                    <View style={styles.actionBarLeft}>
                        <View style={styles.dropdownContainer}>
                            <TouchableOpacity 
                                style={styles.divisionDropdown}
                                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <Text style={styles.divisionText}>{selectedDivision}</Text>
                                <Ionicons 
                                    name={isDropdownOpen ? "chevron-up" : "chevron-down"} 
                                    size={16} 
                                    color={theme.colors.text} 
                                />
                            </TouchableOpacity>
                            
                            {/* Dropdown Options */}
                            <Modal
                                visible={isDropdownOpen}
                                transparent={true}
                                animationType="fade"
                                onRequestClose={() => setIsDropdownOpen(false)}
                            >
                                <TouchableOpacity 
                                    style={styles.modalOverlay}
                                    activeOpacity={1}
                                    onPress={() => setIsDropdownOpen(false)}
                                >
                                    <View style={styles.dropdownMenu}>
                                        <FlatList
                                            data={DIVISIONS}
                                            keyExtractor={(item, index) => `${item}-${index}`}
                                            renderItem={({ item, index }) => (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.dropdownItem,
                                                        selectedDivision === item && styles.dropdownItemSelected,
                                                        index === DIVISIONS.length - 1 && styles.dropdownItemLast
                                                    ]}
                                                    onPress={() => {
                                                        setSelectedDivision(item);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.dropdownItemText,
                                                            selectedDivision === item && styles.dropdownItemTextSelected
                                                        ]}
                                                    >
                                                        {item}
                                                    </Text>
                                                    {selectedDivision === item && (
                                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                                    )}
                                                </TouchableOpacity>
                                            )}
                                            style={styles.dropdownList}
                                        />
                                    </View>
                                </TouchableOpacity>
                            </Modal>
                        </View>
                    </View>
                    <View style={styles.actionBarRight}>
                        <TouchableOpacity
                            style={[styles.iconButton, viewMode === 'calendar' && styles.iconButtonActive]}
                            onPress={() => setViewMode('calendar')}
                        >
                            <Ionicons 
                                name="calendar" 
                                size={20} 
                                color={viewMode === 'calendar' ? 'white' : theme.colors.text} 
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.iconButton, viewMode === 'list' && styles.iconButtonActive]}
                            onPress={() => setViewMode('list')}
                        >
                            <Ionicons 
                                name="list" 
                                size={20} 
                                color={viewMode === 'list' ? 'white' : theme.colors.text} 
                            />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.iconButton, { marginLeft: theme.spacing.xs }]}>
                            <Ionicons name="help-circle-outline" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.uploadButton, { marginLeft: theme.spacing.xs }]}>
                            <Ionicons name="cloud-upload-outline" size={16} color={theme.colors.text} />
                            <Text style={styles.uploadButtonText}>Upload CSV</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.addButton, { marginLeft: theme.spacing.xs }]}>
                            <Ionicons name="add" size={20} color="white" />
                            <Text style={styles.addButtonText}>Add Activity</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Calendar Navigation */}
                <View style={styles.calendarNav}>
                    <View style={styles.calendarNavLeft}>
                        <TouchableOpacity style={styles.navButton} onPress={goToToday}>
                            <Text style={styles.navButtonText}>Today</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.navButton} 
                            onPress={() => {
                                if (calendarView === 'Week') {
                                    navigateWeek('prev');
                                } else if (calendarView === 'Day') {
                                    navigateDay('prev');
                                } else if (calendarView === 'Agenda') {
                                    navigateAgenda('prev');
                                } else {
                                    navigateMonth('prev');
                                }
                            }}
                        >
                            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.navButton} 
                            onPress={() => {
                                if (calendarView === 'Week') {
                                    navigateWeek('next');
                                } else if (calendarView === 'Day') {
                                    navigateDay('next');
                                } else if (calendarView === 'Agenda') {
                                    navigateAgenda('next');
                                } else {
                                    navigateMonth('next');
                                }
                            }}
                        >
                            <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.monthYearText}>
                            {calendarView === 'Week' 
                                ? formatWeekRange(selectedDate) 
                                : calendarView === 'Day'
                                ? formatDay(selectedDate)
                                : calendarView === 'Agenda'
                                ? formatAgendaRange(currentMonth)
                                : formatMonthYear(currentMonth)}
                        </Text>
                    </View>
                    <View style={styles.viewToggles}>
                        {(['Month', 'Week', 'Day', 'Agenda'] as const).map((view) => (
                            <TouchableOpacity
                                key={view}
                                style={[
                                    styles.viewToggleBtn,
                                    calendarView === view && styles.viewToggleBtnActive
                                ]}
                                onPress={() => setCalendarView(view)}
                            >
                                <Text
                                    style={[
                                        styles.viewToggleText,
                                        calendarView === view && styles.viewToggleTextActive
                                    ]}
                                >
                                    {view}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Calendar Grid - Month View */}
                {viewMode === 'calendar' && calendarView === 'Month' && (
                    <View style={styles.calendarContainer}>
                        {/* Day Names Header */}
                        <View style={styles.dayNamesRow}>
                            {dayNames.map((day) => (
                                <View key={day} style={styles.dayNameCell}>
                                    <Text style={styles.dayNameText}>{day}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Calendar Days Grid */}
                        <View style={styles.calendarGrid}>
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
                                        ]}
                                        onPress={() => setSelectedDate(day.date)}
                                    >
                                        <Text
                                            style={[
                                                styles.calendarDayText,
                                                !day.isCurrentMonth && styles.calendarDayTextOtherMonth,
                                                isSelected && styles.calendarDayTextSelected,
                                                isCurrentDay && !isSelected && styles.calendarDayTextToday,
                                            ]}
                                        >
                                            {day.date.getDate()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Day View */}
                {viewMode === 'calendar' && calendarView === 'Day' && (
                    <View style={styles.dayContainer}>
                        {/* Time column header */}
                        <View style={styles.dayTimeHeader}>
                            <View style={styles.timeColumnHeader} />
                        </View>
                        
                        {/* Day header */}
                        <View style={styles.dayHeader}>
                            <View style={styles.singleDayHeader}>
                                <Text style={styles.singleDayLabel}>
                                    {formatDay(selectedDate)}
                                </Text>
                            </View>
                        </View>

                        {/* Scrollable time grid */}
                        <ScrollView 
                            style={styles.dayTimeGrid}
                            showsVerticalScrollIndicator={true}
                        >
                            {/* Time slots and day column */}
                            <View style={styles.dayGridContent}>
                                {/* Time column */}
                                <View style={styles.timeColumn}>
                                    {timeSlots.map((time, index) => (
                                        <View key={index} style={styles.timeSlot}>
                                            <Text style={styles.timeSlotText}>{time}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Single day column */}
                                <View style={styles.singleDayColumn}>
                                    {timeSlots.map((time, timeIndex) => (
                                        <TouchableOpacity
                                            key={timeIndex}
                                            style={styles.dayTimeCell}
                                            onPress={() => {
                                                // Handle time slot click
                                            }}
                                        />
                                    ))}
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                )}

                {/* Week View */}
                {viewMode === 'calendar' && calendarView === 'Week' && (
                    <View style={styles.weekContainer}>
                        {/* Time column header */}
                        <View style={styles.weekTimeHeader}>
                            <View style={styles.timeColumnHeader} />
                        </View>
                        
                        {/* Days header */}
                        <View style={styles.weekDaysHeader}>
                            {weekDates.map((date, index) => {
                                const isSelected = isSelectedDate(date);
                                const isCurrentDay = isToday(date);
                                const dayName = dayNames[date.getDay()];
                                
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.weekDayHeader,
                                            isSelected && styles.weekDayHeaderSelected
                                        ]}
                                        onPress={() => setSelectedDate(date)}
                                    >
                                        <Text
                                            style={[
                                                styles.weekDayLabel,
                                                isSelected && styles.weekDayLabelSelected,
                                                isCurrentDay && !isSelected && styles.weekDayLabelToday
                                            ]}
                                        >
                                            {date.getDate()} {dayName}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Scrollable time grid */}
                        <ScrollView 
                            style={styles.weekTimeGrid}
                            showsVerticalScrollIndicator={true}
                        >
                            {/* Time slots and day columns */}
                            <View style={styles.weekGridContent}>
                                {/* Time column */}
                                <View style={styles.timeColumn}>
                                    {timeSlots.map((time, index) => (
                                        <View key={index} style={styles.timeSlot}>
                                            <Text style={styles.timeSlotText}>{time}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Day columns */}
                                <View style={styles.weekDaysGrid}>
                                    {weekDates.map((date, dayIndex) => {
                                        const isSelected = isSelectedDate(date);
                                        
                                        return (
                                            <View 
                                                key={dayIndex}
                                                style={[
                                                    styles.weekDayColumn,
                                                    isSelected && styles.weekDayColumnSelected
                                                ]}
                                            >
                                                {timeSlots.map((time, timeIndex) => (
                                                    <TouchableOpacity
                                                        key={timeIndex}
                                                        style={styles.weekTimeCell}
                                                        onPress={() => {
                                                            // Handle time slot click
                                                        }}
                                                    />
                                                ))}
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                )}

                {/* Agenda View */}
                {viewMode === 'calendar' && calendarView === 'Agenda' && (
                    <View style={styles.agendaContainer}>
                        <View style={styles.agendaContent}>
                            <Text style={styles.agendaEmptyText}>
                                There are no events in this range.
                            </Text>
                        </View>
                    </View>
                )}

                {/* List View (for other views or when list mode is selected) */}
                {viewMode === 'list' && (
                    <View style={styles.listContainer}>
                        <Text style={styles.emptyStateText}>No activities scheduled</Text>
                    </View>
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
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.lg,
    },
    headerTitleContainer: {
        flex: 1,
        marginHorizontal: theme.spacing.md,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    headerTitle: {
        ...theme.typography.h1,
        marginLeft: theme.spacing.sm,
    },
    headerSubtitle: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        flexWrap: 'wrap',
    },
    actionBarLeft: {
        flex: 1,
        minWidth: 150,
    },
    divisionDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: 'space-between',
    },
    divisionText: {
        ...theme.typography.bodySmall,
        color: theme.colors.text,
        flex: 1,
    },
    dropdownContainer: {
        position: 'relative',
        zIndex: 1000,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        paddingTop: 120,
    },
    dropdownMenu: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        marginHorizontal: theme.spacing.md,
        maxHeight: 400,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
        elevation: 5,
    },
    dropdownList: {
        maxHeight: 400,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dropdownItemLast: {
        borderBottomWidth: 0,
    },
    dropdownItemSelected: {
        backgroundColor: '#f0f9ff',
    },
    dropdownItemText: {
        ...theme.typography.bodySmall,
        color: theme.colors.text,
        flex: 1,
    },
    dropdownItemTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    actionBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: theme.spacing.sm,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconButtonActive: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: theme.spacing.xs,
    },
    uploadButtonText: {
        ...theme.typography.bodySmall,
        color: theme.colors.text,
        fontWeight: '600',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    addButtonText: {
        ...theme.typography.bodySmall,
        color: 'white',
        fontWeight: '600',
    },
    calendarNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        flexWrap: 'wrap',
    },
    calendarNavLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        flexWrap: 'wrap',
        marginBottom: theme.spacing.sm,
    },
    navButton: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.xs,
    },
    navButtonText: {
        ...theme.typography.bodySmall,
        color: theme.colors.text,
        fontWeight: '600',
    },
    monthYearText: {
        ...theme.typography.h3,
        marginLeft: theme.spacing.sm,
        marginRight: theme.spacing.sm,
    },
    viewToggles: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: 4,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginTop: theme.spacing.sm,
    },
    viewToggleBtn: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    viewToggleBtnActive: {
        backgroundColor: theme.colors.secondary,
    },
    viewToggleText: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    viewToggleTextActive: {
        color: 'white',
    },
    calendarContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    dayNamesRow: {
        flexDirection: 'row',
        marginBottom: theme.spacing.xs,
    },
    dayNameCell: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
    },
    dayNameText: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calendarDay: {
        width: '14.28%',
        minHeight: 50,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        padding: theme.spacing.xs,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    calendarDayOtherMonth: {
        opacity: 0.3,
    },
    calendarDaySelected: {
        backgroundColor: '#e0e7ff',
        borderRadius: theme.borderRadius.sm,
        borderColor: theme.colors.secondary,
    },
    calendarDayText: {
        ...theme.typography.bodySmall,
        color: theme.colors.text,
    },
    calendarDayTextOtherMonth: {
        color: theme.colors.textSecondary,
    },
    calendarDayTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '700',
    },
    calendarDayTextToday: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    listContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    emptyStateText: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
    },
    weekContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
        overflow: 'hidden',
    },
    weekTimeHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    timeColumnHeader: {
        width: 60,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
    },
    weekDaysHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        marginLeft: 60,
    },
    weekDayHeader: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.md,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
    },
    weekDayHeaderSelected: {
        backgroundColor: '#e0e7ff',
    },
    weekDayLabel: {
        ...theme.typography.bodySmall,
        color: theme.colors.text,
        fontWeight: '600',
    },
    weekDayLabelSelected: {
        color: theme.colors.secondary,
        fontWeight: '700',
    },
    weekDayLabelToday: {
        color: theme.colors.secondary,
    },
    weekTimeGrid: {
        maxHeight: 600,
    },
    weekGridContent: {
        flexDirection: 'row',
    },
    timeColumn: {
        width: 60,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
    },
    timeSlot: {
        height: 60,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingRight: theme.spacing.xs,
        paddingTop: theme.spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    timeSlotText: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        fontSize: 11,
    },
    weekDaysGrid: {
        flex: 1,
        flexDirection: 'row',
    },
    weekDayColumn: {
        flex: 1,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
    },
    weekDayColumnSelected: {
        backgroundColor: '#f0f9ff',
    },
    weekTimeCell: {
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dayContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
        overflow: 'hidden',
    },
    dayTimeHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dayHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        marginLeft: 60,
    },
    singleDayHeader: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.md,
    },
    singleDayLabel: {
        ...theme.typography.h3,
        color: theme.colors.text,
        fontWeight: '600',
    },
    dayTimeGrid: {
        maxHeight: 600,
    },
    dayGridContent: {
        flexDirection: 'row',
    },
    singleDayColumn: {
        flex: 1,
    },
    dayTimeCell: {
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    agendaContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
        minHeight: 300,
    },
    agendaContent: {
        padding: theme.spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
    },
    agendaEmptyText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
});

