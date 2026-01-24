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

interface SportsCalendarScreenProps {
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
const SPORTS = [
    'All Sports',
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
const EVENT_TYPES = [
    'All Event Types',
    'Invitational',
    'WC One Day Tournament',
    'WC Knock Out Tournament',
    'Exhibition/Friendly',
    'Other',
];
const LOCATIONS = [
    'All Locations',
    'Blue Ridge',
    'Equinunk',
    'Home',
    'THC',
    'Timber Lake Camp',
];
const SORT_OPTIONS = [
    'Sort by Date',
    'Sort by Division',
    'Sort by Sport',
    'Sort by Location',
    'Sort by Event Type',
];
const SPORT_TYPES = [
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
    'Other',
];
const HOME_OR_AWAY = ['Home', 'Away'];
const MEAL_OPTIONS = ['Breakfast', 'Snack', 'Lunch', 'Dinner', 'Other'];
const STAFF_ASSIGNMENT = ['Division will provide coach', 'Division will provide ref'];

export const SportsCalendarScreen = ({ navigation }: SportsCalendarScreenProps) => {
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [calendarView, setCalendarView] = useState<'Month' | 'Week' | 'Day' | 'Agenda'>(
        'Month'
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [selectedGender, setSelectedGender] = useState('All Genders');
    const [selectedSport, setSelectedSport] = useState('All Sports');
    const [selectedEventType, setSelectedEventType] = useState('All Event Types');
    const [selectedLocation, setSelectedLocation] = useState('All Locations');
    const [selectedSort, setSelectedSort] = useState('Sort by Date');

    // Dropdown states
    const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
    const [showGenderDropdown, setShowGenderDropdown] = useState(false);
    const [showSportDropdown, setShowSportDropdown] = useState(false);
    const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);

    // Calendar state
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Add Event Modal states
    const [showAddEventModal, setShowAddEventModal] = useState(false);
    const [eventDate, setEventDate] = useState('');
    const [eventTitle, setEventTitle] = useState('');
    const [sportType, setSportType] = useState('');
    const [eventType, setEventType] = useState('');
    const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
    const [homeOrAway, setHomeOrAway] = useState('');
    const [location, setLocation] = useState('');
    const [team, setTeam] = useState('');
    const [opponent, setOpponent] = useState('');
    const [description, setDescription] = useState('');
    const [mealOption, setMealOption] = useState('');
    const [staffAssignment, setStaffAssignment] = useState('');

    const [headerHeight, setHeaderHeight] = useState(0);

    // Modal dropdown states
    const [showSportTypeDropdown, setShowSportTypeDropdown] = useState(false);
    const [showModalEventTypeDropdown, setShowModalEventTypeDropdown] = useState(false);
    const [showHomeOrAwayDropdown, setShowHomeOrAwayDropdown] = useState(false);
    
    // Dropdown position measurements
    const [sportTypeInputLayout, setSportTypeInputLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [eventTypeInputLayout, setEventTypeInputLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [homeOrAwayInputLayout, setHomeOrAwayInputLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [modalContainerLayout, setModalContainerLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [scrollViewOffset, setScrollViewOffset] = useState(0);
    const [showEventDatePicker, setShowEventDatePicker] = useState(false);
    const [eventDatePickerMonth, setEventDatePickerMonth] = useState(new Date().getMonth());
    const [eventDatePickerYear, setEventDatePickerYear] = useState(new Date().getFullYear());

    // Sample events data (in a real app, this would come from an API)
    const [events, setEvents] = useState<any[]>([
        {
            id: '1',
            title: 'Falki Open',
            date: 'Wed, Jul 8',
            location: 'Home',
            tags: [
                { label: 'Tennis', type: 'sport' },
                { label: 'Invitational', type: 'eventType' },
                { label: 'Freshmen B Girls', type: 'division' },
                { label: 'Cadet Girls', type: 'division' },
                { label: 'Sophomore Girls', type: 'division' },
                { label: 'Junior Girls', type: 'division' },
                { label: 'Senior Girls', type: 'division' },
                { label: 'Super Girls', type: 'division' },
                { label: 'Teen Girls', type: 'division' },
                { label: 'CIT Girls', type: 'division' },
                { label: 'Freshmen A Boys', type: 'division' },
                { label: 'Freshmen B Boys', type: 'division' },
                { label: 'Cadet Boys', type: 'division' },
                { label: 'Sophomore Boys', type: 'division' },
                { label: 'Senior Boys', type: 'division' },
                { label: 'Super Boys', type: 'division' },
                { label: 'Teen Boys', type: 'division' },
                { label: 'CIT Boys', type: 'division' },
                { label: '0 roster', type: 'roster' },
            ],
        },
        {
            id: '2',
            title: 'THC Dance Competition',
            date: 'Wed, Jul 22',
            location: 'THC',
            tags: [
                { label: 'Dance', type: 'sport' },
                { label: 'Invitational', type: 'eventType' },
                { label: 'Freshmen A Girls', type: 'division' },
                { label: 'Freshmen B Girls', type: 'division' },
                { label: 'Cadet Girls', type: 'division' },
                { label: 'Sophomore Girls', type: 'division' },
                { label: 'Junior Girls', type: 'division' },
                { label: 'Senior Girls', type: 'division' },
                { label: 'Super Girls', type: 'division' },
                { label: 'Teen Girls', type: 'division' },
                { label: 'CIT Girls', type: 'division' },
                { label: '0 roster', type: 'roster' },
            ],
        },
        {
            id: '3',
            title: 'Soccer Cup',
            date: 'Thu, Jul 23',
            location: 'Blue Ridge',
            tags: [
                { label: 'Soccer', type: 'sport' },
                { label: 'Invitational', type: 'eventType' },
                { label: 'Junior Girls', type: 'division' },
                { label: '0 roster', type: 'roster' },
            ],
        },
        {
            id: '4',
            title: 'Basketball Tourney',
            date: 'Thu, Jul 16',
            location: 'Blue Ridge',
            tags: [
                { label: 'Basketball', type: 'sport' },
                { label: 'Invitational', type: 'eventType' },
                { label: 'Senior Girls', type: 'division' },
                { label: '0 roster', type: 'roster' },
            ],
        },
        {
            id: '5',
            title: 'Franko Cup',
            date: 'Wed, Jul 29',
            location: 'THC',
            tags: [
                { label: 'Football', type: 'sport' },
                { label: 'Invitational', type: 'eventType' },
                { label: 'Senior Girls', type: 'division' },
                { label: 'Junior Girls', type: 'division' },
                { label: '0 roster', type: 'roster' },
            ],
        },
        {
            id: '6',
            title: 'Girls Basketball Invitational',
            date: 'Mon, Jul 20',
            location: 'Home',
            tags: [
                { label: 'Tournament', type: 'sport' },
                { label: 'Other', type: 'eventType' },
                { label: 'CIT Girls', type: 'division' },
                { label: 'Teen Girls', type: 'division' },
                { label: 'Super Girls', type: 'division' },
                { label: 'Senior Girls', type: 'division' },
                { label: '0 roster', type: 'roster' },
            ],
        },
        {
            id: '7',
            title: 'Sixes Lax Tourney',
            date: 'Fri, Jul 24',
            location: 'THC',
            tags: [
                { label: 'Lacrosse', type: 'sport' },
                { label: 'Invitational', type: 'eventType' },
                { label: 'Cadet Boys', type: 'division' },
                { label: 'Sophomore Boys', type: 'division' },
                { label: 'Junior Boys', type: 'division' },
                { label: 'Senior Boys', type: 'division' },
                { label: '0 roster', type: 'roster' },
            ],
        },
    ]);

    // Event Detail Modal states
    const [showEventDetailModal, setShowEventDetailModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);

    // Edit Event Modal states
    const [showEditEventModal, setShowEditEventModal] = useState(false);

    // Delete Event Confirmation Modal states
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

    // Manage Roster Modal states
    const [showManageRosterModal, setShowManageRosterModal] = useState(false);
    const [rosterTab, setRosterTab] = useState<'campers' | 'staff' | 'templates'>('campers');
    const [selectedCampers, setSelectedCampers] = useState<string[]>([]);
    const [camperSearchQuery, setCamperSearchQuery] = useState('');
    const [camperSortBy, setCamperSortBy] = useState('Name');
    const [campers] = useState([
        { id: '1', name: 'Abby Weiss', grade: '11th' },
        { id: '2', name: 'Adam Elliott', grade: '4th' },
        { id: '3', name: 'Addison Brewer', grade: '6th' },
        { id: '4', name: 'Alex Johnson', grade: '9th' },
        { id: '5', name: 'Amanda Smith', grade: '10th' },
    ]);

    // Staff Assignments states
    const [coachAssignment, setCoachAssignment] = useState('Division will provide');
    const [referees, setReferees] = useState<string[]>([]);
    const [refereeInput, setRefereeInput] = useState('');
    const [showRefereeDropdown, setShowRefereeDropdown] = useState(false);
    const [availableReferees] = useState([
        'John Smith',
        'Jane Doe',
        'Mike Johnson',
        'Sarah Williams',
    ]);

    // Saved Templates states
    const [savedTemplates, setSavedTemplates] = useState<any[]>([]);

    // CSV Upload Format Guide Modal states
    const [showCSVGuideModal, setShowCSVGuideModal] = useState(false);
    const [csvGuideTab, setCsvGuideTab] = useState('Sports');

    const formatDate = (date: Date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

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

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
    };

    const goToToday = () => {
        const today = new Date();
        setCalendarMonth(today.getMonth());
        setCalendarYear(today.getFullYear());
        setSelectedDate(today);
        if (calendarView === 'Week' || calendarView === 'Day') {
            // Ensure we're viewing the current week/day
        }
    };

    const goToPreviousMonth = () => {
        if (calendarMonth === 0) {
            setCalendarMonth(11);
            setCalendarYear(calendarYear - 1);
        } else {
            setCalendarMonth(calendarMonth - 1);
        }
    };

    const goToNextMonth = () => {
        if (calendarMonth === 11) {
            setCalendarMonth(0);
            setCalendarYear(calendarYear + 1);
        } else {
            setCalendarMonth(calendarMonth + 1);
        }
    };

    const goToPreviousWeek = () => {
        const currentDate = new Date(calendarYear, calendarMonth, selectedDate?.getDate() || 1);
        currentDate.setDate(currentDate.getDate() - 7);
        setCalendarMonth(currentDate.getMonth());
        setCalendarYear(currentDate.getFullYear());
        setSelectedDate(currentDate);
    };

    const goToNextWeek = () => {
        const currentDate = new Date(calendarYear, calendarMonth, selectedDate?.getDate() || 1);
        currentDate.setDate(currentDate.getDate() + 7);
        setCalendarMonth(currentDate.getMonth());
        setCalendarYear(currentDate.getFullYear());
        setSelectedDate(currentDate);
    };

    const goToPreviousDay = () => {
        const currentDate = new Date(calendarYear, calendarMonth, selectedDate?.getDate() || 1);
        currentDate.setDate(currentDate.getDate() - 1);
        setCalendarMonth(currentDate.getMonth());
        setCalendarYear(currentDate.getFullYear());
        setSelectedDate(currentDate);
    };

    const goToNextDay = () => {
        const currentDate = new Date(calendarYear, calendarMonth, selectedDate?.getDate() || 1);
        currentDate.setDate(currentDate.getDate() + 1);
        setCalendarMonth(currentDate.getMonth());
        setCalendarYear(currentDate.getFullYear());
        setSelectedDate(currentDate);
    };

    const getWeekRange = () => {
        const today = selectedDate || new Date();
        const startOfWeek = new Date(today);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day;
        startOfWeek.setDate(diff);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return { start: startOfWeek, end: endOfWeek };
    };

    const getWeekDays = () => {
        const { start } = getWeekRange();
        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            days.push(date);
        }
        return days;
    };

    const getTimeSlots = () => {
        const slots = [];
        for (let hour = 0; hour < 24; hour++) {
            slots.push(hour);
        }
        return slots;
    };

    const formatTime = (hour: number) => {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:00 ${period}`;
    };

    const getCurrentTimePosition = () => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        return currentHour + currentMinute / 60;
    };

    const isCurrentDay = (date: Date) => {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    const renderWeekView = () => {
        const weekDays = getWeekDays();
        const timeSlots = getTimeSlots();
        const today = new Date();
        const currentTimePos = getCurrentTimePosition();

        return (
            <View style={styles.weekViewContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.weekViewHorizontalScroll}
                    contentContainerStyle={styles.weekViewHorizontalContent}
                >
                    <View style={styles.weekViewGrid}>
                        {/* Time column */}
                        <View style={styles.weekTimeColumn}>
                            <View style={styles.weekTimeHeader} />
                            <ScrollView
                                showsVerticalScrollIndicator={true}
                                style={styles.weekTimeScroll}
                            >
                                {timeSlots.map((hour) => (
                                    <View key={hour} style={styles.weekTimeSlot}>
                                        <Text style={styles.weekTimeText}>{formatTime(hour)}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Day columns */}
                        {weekDays.map((day, dayIndex) => {
                            const isToday = isCurrentDay(day);
                            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
                                day.getDay()
                            ];
                            return (
                                <View key={dayIndex} style={styles.weekDayColumn}>
                                    {/* Day header */}
                                    <View
                                        style={[
                                            styles.weekDayHeader,
                                            isToday && styles.weekDayHeaderToday,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.weekDayHeaderText,
                                                isToday && styles.weekDayHeaderTextToday,
                                            ]}
                                        >
                                            {day.getDate()} {dayName}
                                        </Text>
                                    </View>

                                    {/* Time slots for this day */}
                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        style={styles.weekDayScroll}
                                    >
                                        {timeSlots.map((hour) => {
                                            const isCurrentTimeSlot =
                                                isToday && hour <= currentTimePos && hour + 1 > currentTimePos;
                                            return (
                                                <View
                                                    key={hour}
                                                    style={[
                                                        styles.weekTimeSlotCell,
                                                        isToday && styles.weekTimeSlotCellToday,
                                                    ]}
                                                >
                                                    {isCurrentTimeSlot && (
                                                        <View style={styles.currentTimeIndicator} />
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
        );
    };

    const renderDayView = () => {
        const timeSlots = getTimeSlots();
        const today = selectedDate || new Date();
        const isToday = isCurrentDay(today);
        const currentTimePos = getCurrentTimePosition();
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
            today.getDay()
        ];
        const monthName = monthNames[today.getMonth()];

        return (
            <View style={styles.dayViewContainer}>
                <ScrollView style={styles.dayViewScroll} showsVerticalScrollIndicator={true}>
                    <View style={styles.dayViewGrid}>
                        {/* Time column */}
                        <View style={styles.dayTimeColumn}>
                            {timeSlots.map((hour) => (
                                <View key={hour} style={styles.dayTimeSlot}>
                                    <Text style={styles.dayTimeText}>{formatTime(hour)}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Main content area */}
                        <View style={styles.dayContentColumn}>
                            {timeSlots.map((hour) => {
                                const isCurrentTimeSlot =
                                    isToday && hour <= currentTimePos && hour + 1 > currentTimePos;
                                const isEvenHour = hour % 2 === 0;
                                return (
                                    <View
                                        key={hour}
                                        style={[
                                            styles.dayTimeSlotCell,
                                            isEvenHour ? styles.dayTimeSlotCellEven : styles.dayTimeSlotCellOdd,
                                        ]}
                                    >
                                        {isCurrentTimeSlot && (
                                            <View style={styles.currentTimeIndicator} />
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
    };

    const renderAgendaView = () => {
        const filteredEvents = events.filter((event) => {
            // Filter events based on selected filters
            if (selectedDivision !== 'All Divisions' && !event.tags?.some((t: any) => t.label === selectedDivision)) {
                return false;
            }
            if (selectedSport !== 'All Sports' && !event.tags?.some((t: any) => t.type === 'sport' && t.label === selectedSport)) {
                return false;
            }
            if (selectedEventType !== 'All Event Types' && !event.tags?.some((t: any) => t.type === 'eventType' && t.label === selectedEventType)) {
                return false;
            }
            if (selectedLocation !== 'All Locations' && event.location !== selectedLocation) {
                return false;
            }
            return true;
        });

        if (filteredEvents.length === 0) {
            return (
                <View style={styles.agendaViewContainer}>
                    <Text style={styles.agendaEmptyText}>There are no events in this range.</Text>
                </View>
            );
        }

        return (
            <View style={styles.agendaViewContainerWithEvents}>
                <ScrollView 
                    style={styles.agendaScrollView}
                    contentContainerStyle={styles.agendaScrollContent}
                >
                    {filteredEvents.map((event, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.agendaEventItem}
                            onPress={() => {
                                setSelectedEvent(event);
                                setShowEventDetailModal(true);
                            }}
                        >
                            <View style={styles.agendaEventContent}>
                                <Text style={styles.agendaEventTitle}>{event.title}</Text>
                                <Text style={styles.agendaEventDate}>{event.date}</Text>
                                <Text style={styles.agendaEventLocation}>{event.location}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const renderCalendar = () => {
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
        const todayStr = formatDate(today);
        const selectedDateStr = selectedDate ? formatDate(selectedDate) : null;

        return (
            <StyledCard style={styles.calendarCard}>
                <View style={styles.calendarGrid}>
                    {/* Weekday headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <View key={day} style={styles.weekdayHeader}>
                            <Text style={styles.weekdayText}>{day}</Text>
                        </View>
                    ))}

                    {/* Calendar dates */}
                    {monthDates.map((date, index) => {
                        if (!date) {
                            return <View key={index} style={styles.calendarDateCell} />;
                        }
                        const dateStr = formatDate(date);
                        const isToday = dateStr === todayStr;
                        const isSelected = selectedDateStr === dateStr;
                        const isPreviousMonth = date.getMonth() !== calendarMonth;

                        return (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.calendarDateCell,
                                    isToday && styles.todayCell,
                                    isSelected && styles.selectedDateCell,
                                ]}
                                onPress={() => handleDateSelect(date)}
                            >
                                <Text
                                    style={[
                                        styles.dateText,
                                        isPreviousMonth && styles.previousMonthDate,
                                        isToday && styles.todayDateText,
                                        isSelected && styles.selectedDateText,
                                    ]}
                                >
                                    {date.getDate()}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </StyledCard>
        );
    };

    const renderEventDatePicker = () => {
        const today = new Date();
        const firstDayOfMonth = new Date(eventDatePickerYear, eventDatePickerMonth, 1);
        const lastDayOfMonth = new Date(eventDatePickerYear, eventDatePickerMonth + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startingDayOfWeek = firstDayOfMonth.getDay();

        const monthDates = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            monthDates.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            monthDates.push(new Date(eventDatePickerYear, eventDatePickerMonth, i));
        }

        return (
            <Modal
                visible={showEventDatePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowEventDatePicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowEventDatePicker(false)}
                >
                    <View style={styles.datePickerContainer} onStartShouldSetResponder={() => true}>
                        <View style={styles.datePickerHeader}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (eventDatePickerMonth === 0) {
                                        setEventDatePickerMonth(11);
                                        setEventDatePickerYear(eventDatePickerYear - 1);
                                    } else {
                                        setEventDatePickerMonth(eventDatePickerMonth - 1);
                                    }
                                }}
                            >
                                <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.datePickerMonth}>
                                {monthNames[eventDatePickerMonth]} {eventDatePickerYear}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    if (eventDatePickerMonth === 11) {
                                        setEventDatePickerMonth(0);
                                        setEventDatePickerYear(eventDatePickerYear + 1);
                                    } else {
                                        setEventDatePickerMonth(eventDatePickerMonth + 1);
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
                                const dateStr = formatDate(date);
                                const isToday = formatDate(date) === formatDate(today);
                                const isSelected = eventDate && formatDate(date) === eventDate;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.dateCell,
                                            isToday && styles.todayCell,
                                            isSelected && styles.selectedDateCell,
                                        ]}
                                        onPress={() => {
                                            setEventDate(dateStr);
                                            setShowEventDatePicker(false);
                                        }}
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
                                    setEventDate('');
                                    setShowEventDatePicker(false);
                                }}
                            >
                                <Text style={styles.datePickerActionText}>Clear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setEventDate(formatDate(today));
                                    setShowEventDatePicker(false);
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

    const renderDropdownModal = (
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
                animationType="fade"
                onRequestClose={onClose}
            >
                <TouchableOpacity
                    style={styles.dropdownModalOverlay}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <View style={styles.dropdownModalContent}>
                        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                            <View style={styles.filterDropdownMenuModal}>
                                <FlatList
                                    data={data}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.filterDropdownItem,
                                                selected === item && styles.filterDropdownItemSelected,
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
                                                    color={theme.colors.surface}
                                                    style={styles.checkIcon}
                                                />
                                            )}
                                            <Text
                                                style={[
                                                    styles.filterDropdownItemText,
                                                    selected === item &&
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
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        );
    };

    const renderModalDropdown = (
        visible: boolean,
        onClose: () => void,
        data: string[],
        selected: string,
        onSelect: (item: string) => void
    ) => {
        return (
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={onClose}
            >
                <TouchableOpacity
                    style={styles.mobileDropdownOverlay}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <View style={styles.mobileDropdownContainer}>
                        <View style={styles.mobileDropdownMenu}>
                            <FlatList
                                data={data}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.filterDropdownItem,
                                            selected === item && styles.filterDropdownItemSelected,
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
                                                color={theme.colors.surface}
                                                style={styles.checkIcon}
                                            />
                                        )}
                                        <Text
                                            style={[
                                                styles.filterDropdownItemText,
                                                selected === item &&
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
                            <Text style={styles.headerTitle}>Sports Calendar</Text>
                        </View>
                        <Text style={styles.headerSubtitle}>Track sports events and games</Text>
                    </View>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Action Buttons Row */}
                <View style={styles.actionButtonsRow}>
                    <View style={styles.viewModeButtons}>
                        <TouchableOpacity
                            style={[
                                styles.viewModeButton,
                                viewMode === 'calendar' && styles.viewModeButtonActive,
                            ]}
                            onPress={() => setViewMode('calendar')}
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
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.viewModeButton,
                                viewMode === 'list' && styles.viewModeButtonActive,
                            ]}
                            onPress={() => setViewMode('list')}
                        >
                            <Ionicons
                                name="list-outline"
                                size={20}
                                color={
                                    viewMode === 'list' ? theme.colors.surface : theme.colors.text
                                }
                            />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={styles.helpButton}
                        onPress={() => setShowCSVGuideModal(true)}
                    >
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

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons
                        name="search-outline"
                        size={20}
                        color={theme.colors.textSecondary}
                        style={styles.searchIcon}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search events..."
                        placeholderTextColor={theme.colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Sort Dropdown */}
                <View style={styles.sortContainer}>
                    <View style={styles.filterButtonWrapper}>
                        <TouchableOpacity
                            style={styles.sortDropdown}
                            onPress={() => {
                                setShowSortDropdown(true);
                                setShowDivisionDropdown(false);
                                setShowGenderDropdown(false);
                                setShowSportDropdown(false);
                                setShowEventTypeDropdown(false);
                                setShowLocationDropdown(false);
                            }}
                        >
                            <Text style={styles.sortDropdownText}>{selectedSort}</Text>
                            <Ionicons
                                name="chevron-down"
                                size={16}
                                color={theme.colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Filter Row */}
                <View style={styles.filtersRow}>
                    <View style={styles.filterButtonWrapper}>
                        <TouchableOpacity
                            style={[
                                styles.filterButton,
                                selectedDivision !== 'All Divisions' && styles.filterButtonActive,
                            ]}
                            onPress={() => {
                                setShowDivisionDropdown(true);
                                setShowGenderDropdown(false);
                                setShowSportDropdown(false);
                                setShowEventTypeDropdown(false);
                                setShowLocationDropdown(false);
                                setShowSortDropdown(false);
                            }}
                        >
                            <Text
                                style={[
                                    styles.filterButtonText,
                                    selectedDivision !== 'All Divisions' &&
                                        styles.filterButtonTextActive,
                                ]}
                            >
                                Divisions
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.filterButtonWrapper}>
                        <TouchableOpacity
                            style={[
                                styles.filterButton,
                                selectedGender !== 'All Genders' && styles.filterButtonActive,
                            ]}
                            onPress={() => {
                                setShowGenderDropdown(true);
                                setShowDivisionDropdown(false);
                                setShowSportDropdown(false);
                                setShowEventTypeDropdown(false);
                                setShowLocationDropdown(false);
                                setShowSortDropdown(false);
                            }}
                        >
                            <Text
                                style={[
                                    styles.filterButtonText,
                                    selectedGender !== 'All Genders' && styles.filterButtonTextActive,
                                ]}
                            >
                                {selectedGender}
                            </Text>
                            <Ionicons
                                name="chevron-down"
                                size={16}
                                color={theme.colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.filterButtonWrapper}>
                        <TouchableOpacity
                            style={[
                                styles.filterButton,
                                selectedSport !== 'All Sports' && styles.filterButtonActive,
                            ]}
                            onPress={() => {
                                setShowSportDropdown(true);
                                setShowDivisionDropdown(false);
                                setShowGenderDropdown(false);
                                setShowEventTypeDropdown(false);
                                setShowLocationDropdown(false);
                                setShowSortDropdown(false);
                            }}
                        >
                            <Text
                                style={[
                                    styles.filterButtonText,
                                    selectedSport !== 'All Sports' && styles.filterButtonTextActive,
                                ]}
                            >
                                {selectedSport}
                            </Text>
                            <Ionicons
                                name="chevron-down"
                                size={16}
                                color={theme.colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.filterButtonWrapper}>
                        <TouchableOpacity
                            style={[
                                styles.filterButton,
                                selectedEventType !== 'All Event Types' && styles.filterButtonActive,
                            ]}
                            onPress={() => {
                                setShowEventTypeDropdown(true);
                                setShowDivisionDropdown(false);
                                setShowGenderDropdown(false);
                                setShowSportDropdown(false);
                                setShowLocationDropdown(false);
                                setShowSortDropdown(false);
                            }}
                        >
                            <Text
                                style={[
                                    styles.filterButtonText,
                                    selectedEventType !== 'All Event Types' &&
                                        styles.filterButtonTextActive,
                                ]}
                            >
                                {selectedEventType}
                            </Text>
                            <Ionicons
                                name="chevron-down"
                                size={16}
                                color={theme.colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.filterButtonWrapper}>
                        <TouchableOpacity
                            style={[
                                styles.filterButton,
                                selectedLocation !== 'All Locations' && styles.filterButtonActive,
                            ]}
                            onPress={() => {
                                setShowLocationDropdown(true);
                                setShowDivisionDropdown(false);
                                setShowGenderDropdown(false);
                                setShowSportDropdown(false);
                                setShowEventTypeDropdown(false);
                                setShowSortDropdown(false);
                            }}
                        >
                            <Text
                                style={[
                                    styles.filterButtonText,
                                    selectedLocation !== 'All Locations' &&
                                        styles.filterButtonTextActive,
                                ]}
                            >
                                {selectedLocation}
                            </Text>
                            <Ionicons
                                name="chevron-down"
                                size={16}
                                color={theme.colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Calendar Navigation */}
                <View style={styles.calendarNavigation}>
                    <View style={styles.calendarNavLeft}>
                        <TouchableOpacity style={styles.navButton} onPress={goToToday}>
                            <Text style={styles.navButtonText}>Today</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.navButton}
                            onPress={
                                calendarView === 'Week'
                                    ? goToPreviousWeek
                                    : calendarView === 'Day'
                                    ? goToPreviousDay
                                    : goToPreviousMonth
                            }
                        >
                            <Text style={styles.navButtonText}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.navButton}
                            onPress={
                                calendarView === 'Week'
                                    ? goToNextWeek
                                    : calendarView === 'Day'
                                    ? goToNextDay
                                    : goToNextMonth
                            }
                        >
                            <Text style={styles.navButtonText}>Next</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.calendarMonthYear}>
                        {calendarView === 'Week'
                            ? (() => {
                                  const { start, end } = getWeekRange();
                                  return `${monthNames[start.getMonth()]} ${start.getDate()} – ${end.getDate()}`;
                              })()
                            : calendarView === 'Day'
                            ? (() => {
                                  const day = selectedDate || new Date();
                                  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day.getDay()];
                                  return `${dayName} ${monthNames[day.getMonth()].substring(0, 3)} ${day.getDate()}`;
                              })()
                            : calendarView === 'Agenda'
                            ? (() => {
                                  const today = new Date();
                                  const start = new Date(today.getFullYear(), today.getMonth(), 1);
                                  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                                  return `${formatDate(start)} – ${formatDate(end)}`;
                              })()
                            : `${monthNames[calendarMonth]} ${calendarYear}`}
                    </Text>
                    <View style={styles.viewToggles}>
                        {['Month', 'Week', 'Day', 'Agenda'].map((view) => (
                            <TouchableOpacity
                                key={view}
                                style={[
                                    styles.viewToggleButton,
                                    calendarView === view && styles.viewToggleButtonActive,
                                ]}
                                onPress={() => {
                                    setCalendarView(view as any);
                                    if (!selectedDate) {
                                        setSelectedDate(new Date());
                                    }
                                }}
                            >
                                <Text
                                    style={[
                                        styles.viewToggleText,
                                        calendarView === view && styles.viewToggleTextActive,
                                    ]}
                                >
                                    {view}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Calendar */}
                {viewMode === 'calendar' && (
                    <View style={styles.calendarViewWrapper}>
                        {calendarView === 'Week' ? (
                            renderWeekView()
                        ) : calendarView === 'Day' ? (
                            renderDayView()
                        ) : calendarView === 'Agenda' ? (
                            renderAgendaView()
                        ) : (
                            renderCalendar()
                        )}
                    </View>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                    <View style={styles.listViewContainer}>
                        {events.length === 0 ? (
                            <StyledCard style={styles.emptyStateCard}>
                                <Text style={styles.emptyStateText}>No events found</Text>
                            </StyledCard>
                        ) : (
                            <View style={styles.eventsContainer}>
                                <Text style={styles.monthHeader}>
                                    {monthNames[calendarMonth]} {calendarYear}
                                </Text>
                                <View style={styles.eventsGrid}>
                                    {events.map((event, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={() => {
                                                setSelectedEvent(event);
                                                setShowEventDetailModal(true);
                                            }}
                                        >
                                            <StyledCard style={styles.eventCard}>
                                                <View style={styles.eventCardHeader}>
                                                    <View style={styles.eventCardTitleRow}>
                                                        <Text style={styles.eventCardTitle}>
                                                            {event.title}
                                                        </Text>
                                                        <View style={styles.eventCardActions}>
                                                            {/* View Roster */}
                                                            <TouchableOpacity
                                                                style={styles.eventActionIcon}
                                                                onPress={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedEvent(event);
                                                                    setShowEventDetailModal(true);
                                                                }}
                                                            >
                                                                <Ionicons
                                                                    name="people-outline"
                                                                    size={18}
                                                                    color={theme.colors.textSecondary}
                                                                />
                                                            </TouchableOpacity>
                                                            {/* Manage Roster */}
                                                            <TouchableOpacity
                                                                style={styles.eventActionIcon}
                                                                onPress={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedEvent(event);
                                                                    setShowManageRosterModal(true);
                                                                }}
                                                            >
                                                                <Ionicons
                                                                    name="person-add-outline"
                                                                    size={18}
                                                                    color={theme.colors.textSecondary}
                                                                />
                                                            </TouchableOpacity>
                                                            {/* Edit Event */}
                                                            <TouchableOpacity
                                                                style={styles.eventActionIcon}
                                                                onPress={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedEvent(event);
                                                                    // Populate form
                                                                    setEventTitle(event.title || '');
                                                                    setEventDate(event.date || '');
                                                                    
                                                                    const sportTag = event.tags?.find((t: any) => t.type === 'sport');
                                                                    const typeTag = event.tags?.find((t: any) => t.type === 'eventType');
                                                                    const divisionTags = event.tags?.filter((t: any) => t.type === 'division') || [];
                                                                    
                                                                    setSportType(sportTag ? sportTag.label : '');
                                                                    setEventType(typeTag ? typeTag.label : '');
                                                                    setSelectedDivisions(divisionTags.map((t: any) => t.label));
                                                                    setLocation(event.location || '');
                                                                    
                                                                    setShowEditEventModal(true);
                                                                }}
                                                            >
                                                                <Ionicons
                                                                    name="pencil-outline"
                                                                    size={18}
                                                                    color={theme.colors.textSecondary}
                                                                />
                                                            </TouchableOpacity>
                                                            {/* Delete Event */}
                                                            <TouchableOpacity
                                                                style={styles.eventActionIcon}
                                                                onPress={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedEvent(event);
                                                                    setShowDeleteConfirmModal(true);
                                                                }}
                                                            >
                                                                <Ionicons
                                                                    name="trash-outline"
                                                                    size={18}
                                                                    color={theme.colors.danger}
                                                                />
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                    <Text style={styles.eventCardDate}>{event.date}</Text>
                                                </View>
                                            <View style={styles.eventTagsContainer}>
                                                {event.tags?.map((tag: any, tagIndex: number) => (
                                                    <View
                                                        key={tagIndex}
                                                        style={[
                                                            styles.eventTag,
                                                            tag.type === 'sport' && styles.sportTag,
                                                            tag.type === 'eventType' &&
                                                                styles.eventTypeTag,
                                                            tag.type === 'division' && styles.divisionTag,
                                                            tag.type === 'roster' && styles.rosterTag,
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.eventTagText,
                                                                tag.type === 'sport' && styles.sportTagText,
                                                                tag.type === 'eventType' &&
                                                                    styles.eventTypeTagText,
                                                                tag.type === 'division' &&
                                                                    styles.divisionTagText,
                                                                tag.type === 'roster' && styles.rosterTagText,
                                                            ]}
                                                        >
                                                            {tag.label}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                            <View style={styles.eventLocation}>
                                                <Ionicons
                                                    name="location-outline"
                                                    size={16}
                                                    color={theme.colors.danger}
                                                />
                                                <Text style={styles.eventLocationText}>
                                                    {event.location}
                                                </Text>
                                            </View>
                                        </StyledCard>
                                    </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Dropdown Modals */}
            {renderDropdownModal(
                showSortDropdown,
                () => setShowSortDropdown(false),
                SORT_OPTIONS,
                selectedSort,
                setSelectedSort
            )}
            {renderDropdownModal(
                showDivisionDropdown,
                () => setShowDivisionDropdown(false),
                DIVISIONS,
                selectedDivision,
                setSelectedDivision
            )}
            {renderDropdownModal(
                showGenderDropdown,
                () => setShowGenderDropdown(false),
                GENDERS,
                selectedGender,
                setSelectedGender
            )}
            {renderDropdownModal(
                showSportDropdown,
                () => setShowSportDropdown(false),
                SPORTS,
                selectedSport,
                setSelectedSport
            )}
            {renderDropdownModal(
                showEventTypeDropdown,
                () => setShowEventTypeDropdown(false),
                EVENT_TYPES,
                selectedEventType,
                setSelectedEventType
            )}
            {renderDropdownModal(
                showLocationDropdown,
                () => setShowLocationDropdown(false),
                LOCATIONS,
                selectedLocation,
                setSelectedLocation
            )}

            {/* Add Event Modal */}
            <Modal
                visible={showAddEventModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAddEventModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View 
                        style={styles.addEventModalContainer}
                        onLayout={(e) => {
                            const { x, y, width, height } = e.nativeEvent.layout;
                            setModalContainerLayout({ x, y, width, height });
                        }}
                    >
                        {/* Modal Header */}
                        <View 
                            style={styles.modalHeader}
                            onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
                        >
                            <Text style={styles.modalTitle}>Add Sports Event</Text>
                            <TouchableOpacity
                                onPress={() => setShowAddEventModal(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {(showSportTypeDropdown ||
                            showModalEventTypeDropdown ||
                            showHomeOrAwayDropdown) && (
                            <TouchableOpacity
                                style={styles.modalDropdownOverlay}
                                activeOpacity={1}
                                onPress={() => {
                                    setShowSportTypeDropdown(false);
                                    setShowModalEventTypeDropdown(false);
                                    setShowHomeOrAwayDropdown(false);
                                }}
                            />
                        )}
                        <ScrollView
                            style={styles.modalContent}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                            removeClippedSubviews={false}
                            onScroll={(e) => {
                                setScrollViewOffset(e.nativeEvent.contentOffset.y);
                            }}
                            scrollEventThrottle={16}
                        >
                            {/* Event Date */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Event Date</Text>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowEventDatePicker(true)}
                                >
                                    <Text
                                        style={[
                                            styles.dateInputText,
                                            !eventDate && styles.placeholder,
                                        ]}
                                    >
                                        {eventDate || 'mm/dd/yyyy'}
                                    </Text>
                                    <Ionicons
                                        name="calendar-outline"
                                        size={20}
                                        color={theme.colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Title */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Title</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter event title"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={eventTitle}
                                    onChangeText={setEventTitle}
                                />
                            </View>

                            {/* Sport Type */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>
                                    Sport Type <Text style={styles.required}>*</Text>
                                </Text>
                                <View 
                                    style={styles.dropdownContainer}
                                    onLayout={(e) => setSportTypeInputLayout(e.nativeEvent.layout)}
                                >
                                    <TouchableOpacity
                                        style={styles.dropdownInput}
                                        onPress={() => {
                                            setShowSportTypeDropdown(!showSportTypeDropdown);
                                            setShowModalEventTypeDropdown(false);
                                            setShowHomeOrAwayDropdown(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.dropdownInputText,
                                                !sportType && styles.placeholder,
                                            ]}
                                        >
                                            {sportType || 'Select sport type'}
                                        </Text>
                                        <Ionicons
                                            name="chevron-down"
                                            size={20}
                                            color={theme.colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Event Type */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Event Type</Text>
                                <View 
                                    style={styles.dropdownContainer}
                                    onLayout={(e) => setEventTypeInputLayout(e.nativeEvent.layout)}
                                >
                                    <TouchableOpacity
                                        style={styles.dropdownInput}
                                        onPress={() => {
                                            setShowModalEventTypeDropdown(!showModalEventTypeDropdown);
                                            setShowSportTypeDropdown(false);
                                            setShowHomeOrAwayDropdown(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.dropdownInputText,
                                                !eventType && styles.placeholder,
                                            ]}
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
                            </View>

                            {/* Divisions */}
                            <View style={styles.formSection}>
                                <View style={styles.divisionsHeader}>
                                    <Text style={styles.label}>Divisions (optional)</Text>
                                    <View style={styles.divisionsActions}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedDivisions(
                                                    DIVISIONS.filter((d) => d !== 'All Divisions')
                                                );
                                            }}
                                        >
                                            <Text style={styles.divisionsActionText}>Select All</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedDivisions([]);
                                            }}
                                        >
                                            <Text style={styles.divisionsActionText}>
                                                Deselect All
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <ScrollView
                                    style={styles.divisionsList}
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={true}
                                >
                                    {DIVISIONS.filter((d) => d !== 'All Divisions').map(
                                        (division) => (
                                            <TouchableOpacity
                                                key={division}
                                                style={styles.radioButtonContainer}
                                                onPress={() => {
                                                    if (selectedDivisions.includes(division)) {
                                                        setSelectedDivisions(
                                                            selectedDivisions.filter(
                                                                (d) => d !== division
                                                            )
                                                        );
                                                    } else {
                                                        setSelectedDivisions([
                                                            ...selectedDivisions,
                                                            division,
                                                        ]);
                                                    }
                                                }}
                                            >
                                                <View
                                                    style={[
                                                        styles.radioButton,
                                                        selectedDivisions.includes(division) &&
                                                            styles.radioButtonSelected,
                                                    ]}
                                                >
                                                    {selectedDivisions.includes(division) && (
                                                        <View style={styles.radioButtonInner} />
                                                    )}
                                                </View>
                                                <Text style={styles.radioButtonLabel}>{division}</Text>
                                            </TouchableOpacity>
                                        )
                                    )}
                                </ScrollView>
                            </View>

                            {/* Home or Away */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Home or Away</Text>
                                <View 
                                    style={styles.dropdownContainer}
                                    onLayout={(e) => setHomeOrAwayInputLayout(e.nativeEvent.layout)}
                                >
                                    <TouchableOpacity
                                        style={styles.dropdownInput}
                                        onPress={() => {
                                            setShowHomeOrAwayDropdown(!showHomeOrAwayDropdown);
                                            setShowSportTypeDropdown(false);
                                            setShowModalEventTypeDropdown(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.dropdownInputText,
                                                !homeOrAway && styles.placeholder,
                                            ]}
                                        >
                                            {homeOrAway || 'Select home/away'}
                                        </Text>
                                        <Ionicons
                                            name="chevron-down"
                                            size={20}
                                            color={theme.colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Location */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Location (optional)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter location"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={location}
                                    onChangeText={setLocation}
                                />
                            </View>

                            {/* Team */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Team (optional)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter team name"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={team}
                                    onChangeText={setTeam}
                                />
                            </View>

                            {/* Opponent */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Opponent (optional)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter opponent name"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={opponent}
                                    onChangeText={setOpponent}
                                />
                            </View>

                            {/* Description */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Description (optional)</Text>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Enter description"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* Meal Options */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Meal Options</Text>
                                <View style={styles.radioGroup}>
                                    {MEAL_OPTIONS.map((option) => (
                                        <TouchableOpacity
                                            key={option}
                                            style={styles.radioButtonContainer}
                                            onPress={() =>
                                                setMealOption(mealOption === option ? '' : option)
                                            }
                                        >
                                            <View
                                                style={[
                                                    styles.radioButton,
                                                    mealOption === option &&
                                                        styles.radioButtonSelected,
                                                ]}
                                            >
                                                {mealOption === option && (
                                                    <View style={styles.radioButtonInner} />
                                                )}
                                            </View>
                                            <Text style={styles.radioButtonLabel}>{option}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Staff Assignment */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Staff Assignment</Text>
                                <View style={styles.radioGroup}>
                                    {STAFF_ASSIGNMENT.map((assignment) => (
                                        <TouchableOpacity
                                            key={assignment}
                                            style={styles.radioButtonContainer}
                                            onPress={() =>
                                                setStaffAssignment(
                                                    staffAssignment === assignment ? '' : assignment
                                                )
                                            }
                                        >
                                            <View
                                                style={[
                                                    styles.radioButton,
                                                    staffAssignment === assignment &&
                                                        styles.radioButtonSelected,
                                                ]}
                                            >
                                                {staffAssignment === assignment && (
                                                    <View style={styles.radioButtonInner} />
                                                )}
                                            </View>
                                            <Text style={styles.radioButtonLabel}>{assignment}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>

                        {/* Dropdowns rendered outside ScrollView for proper z-index layering */}
                        {showSportTypeDropdown && sportTypeInputLayout && (
                            <View
                                style={[
                                    styles.modalDropdownMenuAbsolute,
                                    {
                                        top: sportTypeInputLayout.y - scrollViewOffset + sportTypeInputLayout.height + headerHeight + 4,
                                        left: sportTypeInputLayout.x,
                                        width: sportTypeInputLayout.width,
                                        zIndex: 2000,
                                        elevation: 10,
                                    },
                                ]}
                                collapsable={false}
                                pointerEvents="box-none"
                            >
                                <FlatList
                                    data={SPORT_TYPES}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.filterDropdownItem,
                                                sportType === item &&
                                                    styles.filterDropdownItemSelected,
                                            ]}
                                            onPress={() => {
                                                setSportType(item);
                                                setShowSportTypeDropdown(false);
                                            }}
                                        >
                                            {sportType === item && (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={20}
                                                    color={theme.colors.surface}
                                                    style={styles.checkIcon}
                                                />
                                            )}
                                            <Text
                                                style={[
                                                    styles.filterDropdownItemText,
                                                    sportType === item &&
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
                        )}
                        {showModalEventTypeDropdown && eventTypeInputLayout && (
                            <View
                                style={[
                                    styles.modalDropdownMenuAbsolute,
                                    {
                                        top: eventTypeInputLayout.y - scrollViewOffset + eventTypeInputLayout.height + headerHeight + 4,
                                        left: eventTypeInputLayout.x,
                                        width: eventTypeInputLayout.width,
                                        zIndex: 2000,
                                        elevation: 10,
                                    },
                                ]}
                                collapsable={false}
                                pointerEvents="box-none"
                            >
                                <FlatList
                                    data={EVENT_TYPES.filter((e) => e !== 'All Event Types')}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.filterDropdownItem,
                                                eventType === item &&
                                                    styles.filterDropdownItemSelected,
                                            ]}
                                            onPress={() => {
                                                setEventType(item);
                                                setShowModalEventTypeDropdown(false);
                                            }}
                                        >
                                            {eventType === item && (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={20}
                                                    color={theme.colors.surface}
                                                    style={styles.checkIcon}
                                                />
                                            )}
                                            <Text
                                                style={[
                                                    styles.filterDropdownItemText,
                                                    eventType === item &&
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
                        )}
                        {showHomeOrAwayDropdown && homeOrAwayInputLayout && (
                            <View
                                style={[
                                    styles.modalDropdownMenuAbsolute,
                                    {
                                        top: homeOrAwayInputLayout.y - scrollViewOffset + homeOrAwayInputLayout.height + headerHeight + 4,
                                        left: homeOrAwayInputLayout.x,
                                        width: homeOrAwayInputLayout.width,
                                        zIndex: 2000,
                                        elevation: 10,
                                    },
                                ]}
                                collapsable={false}
                                pointerEvents="box-none"
                            >
                                <FlatList
                                    data={HOME_OR_AWAY}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.filterDropdownItem,
                                                homeOrAway === item &&
                                                    styles.filterDropdownItemSelected,
                                            ]}
                                            onPress={() => {
                                                setHomeOrAway(item);
                                                setShowHomeOrAwayDropdown(false);
                                            }}
                                        >
                                            {homeOrAway === item && (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={20}
                                                    color={theme.colors.surface}
                                                    style={styles.checkIcon}
                                                />
                                            )}
                                            <Text
                                                style={[
                                                    styles.filterDropdownItemText,
                                                    homeOrAway === item &&
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
                        )}


                        {/* Modal Footer */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowAddEventModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    !sportType && styles.submitButtonDisabled,
                                ]}
                                onPress={() => {
                                    if (!sportType) return;
                                    // TODO: Implement event creation
                                    console.log('Adding event:', {
                                        eventDate,
                                        eventTitle,
                                        sportType,
                                        eventType,
                                        selectedDivisions,
                                        homeOrAway,
                                        location,
                                        team,
                                        opponent,
                                        description,
                                        mealOption,
                                        staffAssignment,
                                    });
                                    // Reset form
                                    setEventDate('');
                                    setEventTitle('');
                                    setSportType('');
                                    setEventType('');
                                    setSelectedDivisions([]);
                                    setHomeOrAway('');
                                    setLocation('');
                                    setTeam('');
                                    setOpponent('');
                                    setDescription('');
                                    setMealOption('');
                                    setStaffAssignment('');
                                    setShowAddEventModal(false);
                                }}
                                disabled={!sportType}
                            >
                                <Text style={styles.submitButtonText}>Add Event</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Event Date Picker Modal */}
            {renderEventDatePicker()}


            {/* Event Detail Modal */}
            <Modal
                visible={showEventDetailModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowEventDetailModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.eventDetailModalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {selectedEvent?.title || 'Event Details'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowEventDetailModal(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.eventDetailContent}>
                            <View style={styles.rosterCountSection}>
                                <View style={styles.rosterCountHeader}>
                                    <Ionicons
                                        name="people-outline"
                                        size={24}
                                        color={theme.colors.secondary}
                                    />
                                    <Text style={styles.rosterCountLabel}>Roster Count</Text>
                                </View>
                                <Text style={styles.rosterCountNumber}>
                                    {selectedEvent?.rosterCount || 0}
                                </Text>
                            </View>

                            <View style={styles.eventDetailActions}>
                                <TouchableOpacity
                                    style={styles.manageRosterButton}
                                    onPress={() => {
                                        setShowEventDetailModal(false);
                                        setShowManageRosterModal(true);
                                    }}
                                >
                                    <Ionicons
                                        name="people"
                                        size={20}
                                        color={theme.colors.surface}
                                    />
                                    <Text style={styles.manageRosterButtonText}>Manage Roster</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.editEventButton}
                                    onPress={() => {
                                        // Populate edit form with selected event data
                                        if (selectedEvent) {
                                            setEventDate(selectedEvent.date || '');
                                            setEventTitle(selectedEvent.title || '');
                                            
                                            const sportTag = selectedEvent.tags?.find((t: any) => t.type === 'sport');
                                            const typeTag = selectedEvent.tags?.find((t: any) => t.type === 'eventType');
                                            const divisionTags = selectedEvent.tags?.filter((t: any) => t.type === 'division') || [];
                                            
                                            setSportType(sportTag ? sportTag.label : '');
                                            setEventType(typeTag ? typeTag.label : '');
                                            setSelectedDivisions(divisionTags.map((t: any) => t.label));
                                            setLocation(selectedEvent.location || '');
                                            
                                            // Keep these if they exist in the object (from API) or default to empty
                                            setTeam(selectedEvent.team || '');
                                            setOpponent(selectedEvent.opponent || '');
                                            setDescription(selectedEvent.description || '');
                                            setMealOption(selectedEvent.mealOption || '');
                                            setStaffAssignment(selectedEvent.staffAssignment || '');
                                        }
                                        setShowEventDetailModal(false);
                                        setShowEditEventModal(true);
                                    }}
                                >
                                    <Ionicons
                                        name="pencil-outline"
                                        size={20}
                                        color={theme.colors.text}
                                    />
                                    <Text style={styles.editEventButtonText}>Edit Event</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.deleteEventButton}
                                    onPress={() => {
                                        setShowEventDetailModal(false);
                                        setShowDeleteConfirmModal(true);
                                    }}
                                >
                                    <Ionicons
                                        name="trash-outline"
                                        size={20}
                                        color={theme.colors.surface}
                                    />
                                    <Text style={styles.deleteEventButtonText}>Delete Event</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Manage Roster Modal */}
            <Modal
                visible={showManageRosterModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowManageRosterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.manageRosterModalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Manage Roster: {selectedEvent?.title || 'Event'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowManageRosterModal(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Tabs */}
                        <View style={styles.rosterTabs}>
                            <TouchableOpacity
                                style={[
                                    styles.rosterTab,
                                    rosterTab === 'campers' && styles.rosterTabActive,
                                ]}
                                onPress={() => setRosterTab('campers')}
                            >
                                <Text
                                    style={[
                                        styles.rosterTabText,
                                        rosterTab === 'campers' && styles.rosterTabTextActive,
                                    ]}
                                >
                                    Select Campers
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.rosterTab,
                                    rosterTab === 'staff' && styles.rosterTabActive,
                                ]}
                                onPress={() => setRosterTab('staff')}
                            >
                                <Text
                                    style={[
                                        styles.rosterTabText,
                                        rosterTab === 'staff' && styles.rosterTabTextActive,
                                    ]}
                                >
                                    Staff Assignments
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.rosterTab,
                                    rosterTab === 'templates' && styles.rosterTabActive,
                                ]}
                                onPress={() => setRosterTab('templates')}
                            >
                                <Text
                                    style={[
                                        styles.rosterTabText,
                                        rosterTab === 'templates' && styles.rosterTabTextActive,
                                    ]}
                                >
                                    Saved Templates
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Tab Content */}
                        {rosterTab === 'campers' && (
                            <View style={styles.rosterTabContent}>
                                {/* Search Section */}
                                <View style={styles.camperSearchSection}>
                                    <View style={styles.camperSearchInput}>
                                        <Ionicons
                                            name="search-outline"
                                            size={20}
                                            color={theme.colors.textSecondary}
                                            style={styles.searchIcon}
                                        />
                                        <TextInput
                                            style={styles.camperSearchTextInput}
                                            placeholder="Search by name..."
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={camperSearchQuery}
                                            onChangeText={setCamperSearchQuery}
                                        />
                                    </View>
                                    <TouchableOpacity style={styles.camperSortDropdown}>
                                        <Text style={styles.camperSortText}>{camperSortBy}</Text>
                                        <Ionicons
                                            name="chevron-down"
                                            size={16}
                                            color={theme.colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>

                                {/* Selected Count */}
                                <Text style={styles.selectedCountText}>
                                    {selectedCampers.length} of {campers.length} campers selected
                                </Text>

                                {/* Campers List */}
                                <ScrollView
                                    style={styles.campersList}
                                    contentContainerStyle={styles.campersListContent}
                                >
                                    {campers
                                        .filter((camper) =>
                                            camper.name
                                                .toLowerCase()
                                                .includes(camperSearchQuery.toLowerCase())
                                        )
                                        .map((camper) => (
                                            <TouchableOpacity
                                                key={camper.id}
                                                style={styles.camperItem}
                                                onPress={() => {
                                                    if (selectedCampers.includes(camper.id)) {
                                                        setSelectedCampers(
                                                            selectedCampers.filter(
                                                                (id) => id !== camper.id
                                                            )
                                                        );
                                                    } else {
                                                        setSelectedCampers([
                                                            ...selectedCampers,
                                                            camper.id,
                                                        ]);
                                                    }
                                                }}
                                            >
                                                <View
                                                    style={[
                                                        styles.camperRadioButton,
                                                        selectedCampers.includes(camper.id) &&
                                                            styles.camperRadioButtonSelected,
                                                    ]}
                                                >
                                                    {selectedCampers.includes(camper.id) && (
                                                        <View style={styles.camperRadioButtonInner} />
                                                    )}
                                                </View>
                                                <View style={styles.camperInfo}>
                                                    <Text style={styles.camperName}>{camper.name}</Text>
                                                    <Text style={styles.camperGrade}>
                                                        Grade: {camper.grade}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                </ScrollView>

                                {/* Save as Template Button */}
                                <TouchableOpacity
                                    style={styles.saveTemplateButton}
                                    onPress={() => {
                                        if (selectedCampers.length > 0) {
                                            const templateName = `Template ${savedTemplates.length + 1}`;
                                            setSavedTemplates([
                                                ...savedTemplates,
                                                {
                                                    name: templateName,
                                                    camperCount: selectedCampers.length,
                                                    campers: selectedCampers,
                                                },
                                            ]);
                                            // Show success message or toast
                                            console.log('Template saved:', templateName);
                                        }
                                    }}
                                >
                                    <Ionicons
                                        name="document-outline"
                                        size={20}
                                        color={theme.colors.secondary}
                                    />
                                    <Text style={styles.saveTemplateButtonText}>Save as Template</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {rosterTab === 'staff' && (
                            <View style={styles.rosterTabContent}>
                                {/* Coaches Section */}
                                <View style={styles.staffSection}>
                                    <Text style={styles.staffSectionTitle}>Coaches</Text>
                                    <View style={styles.coachAssignmentContainer}>
                                        <Text style={styles.coachAssignmentText}>
                                            Coach assignment pending - Division will provide
                                        </Text>
                                        <View style={styles.divisionProvideTag}>
                                            <Text style={styles.divisionProvideTagText}>
                                                Division will provide
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Referees Section */}
                                <View style={styles.staffSection}>
                                    <Text style={styles.staffSectionTitle}>Referees</Text>
                                    <View style={styles.refereeInputContainer}>
                                        <TextInput
                                            style={styles.refereeInput}
                                            placeholder="Add referee..."
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={refereeInput}
                                            onChangeText={setRefereeInput}
                                            onFocus={() => setShowRefereeDropdown(true)}
                                        />
                                        <TouchableOpacity onPress={() => setShowRefereeDropdown(true)}>
                                            <Ionicons
                                                name="chevron-down"
                                                size={20}
                                                color={theme.colors.textSecondary}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    {referees.length === 0 ? (
                                        <Text style={styles.noRefereesText}>No referees assigned</Text>
                                    ) : (
                                        <View style={styles.refereesList}>
                                            {referees.map((referee, index) => (
                                                <View key={index} style={styles.refereeTag}>
                                                    <Text style={styles.refereeTagText}>
                                                        {referee}
                                                    </Text>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setReferees(
                                                                referees.filter((r) => r !== referee)
                                                            );
                                                        }}
                                                    >
                                                        <Ionicons
                                                            name="close-circle"
                                                            size={18}
                                                            color={theme.colors.textSecondary}
                                                        />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {rosterTab === 'templates' && (
                            <View style={styles.rosterTabContent}>
                                {savedTemplates.length === 0 ? (
                                    <View style={styles.templatesEmptyState}>
                                        <Text style={styles.templatesEmptyStateTitle}>
                                            No saved templates
                                        </Text>
                                        <Text style={styles.templatesEmptyStateText}>
                                            Create rosters and save them as templates for quick reuse
                                        </Text>
                                    </View>
                                ) : (
                                    <ScrollView style={styles.templatesList}>
                                        {savedTemplates.map((template, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={styles.templateItem}
                                                onPress={() => {
                                                    // TODO: Load template
                                                    console.log('Load template:', template);
                                                }}
                                            >
                                                <Ionicons
                                                    name="document-outline"
                                                    size={24}
                                                    color={theme.colors.secondary}
                                                />
                                                <View style={styles.templateInfo}>
                                                    <Text style={styles.templateName}>
                                                        {template.name}
                                                    </Text>
                                                    <Text style={styles.templateDetails}>
                                                        {template.camperCount} campers
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setSavedTemplates(
                                                            savedTemplates.filter(
                                                                (_, i) => i !== index
                                                            )
                                                        );
                                                    }}
                                                >
                                                    <Ionicons
                                                        name="trash-outline"
                                                        size={20}
                                                        color={theme.colors.danger}
                                                    />
                                                </TouchableOpacity>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
                        )}

                        {/* Modal Footer */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowManageRosterModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.submitButton}
                                onPress={() => {
                                    // TODO: Implement save roster
                                    console.log('Save roster:', selectedCampers);
                                    setShowManageRosterModal(false);
                                }}
                            >
                                <Text style={styles.submitButtonText}>Save Roster</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Referee Dropdown Modal */}
            <Modal
                visible={showRefereeDropdown}
                transparent
                animationType="fade"
                onRequestClose={() => setShowRefereeDropdown(false)}
            >
                <TouchableOpacity
                    style={styles.dropdownModalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowRefereeDropdown(false)}
                >
                    <View style={styles.dropdownModalContent}>
                        <View style={styles.filterDropdownMenuModal}>
                            <FlatList
                                data={availableReferees}
                                keyExtractor={(item, index) => `${item}-${index}`}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.refereeDropdownItem}
                                        onPress={() => {
                                            if (!referees.includes(item)) {
                                                setReferees([...referees, item]);
                                            }
                                            setRefereeInput('');
                                            setShowRefereeDropdown(false);
                                        }}
                                    >
                                        <Text style={styles.refereeDropdownItemText}>{item}</Text>
                                    </TouchableOpacity>
                                )}
                                nestedScrollEnabled={true}
                            />
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Edit Event Modal */}
            <Modal
                visible={showEditEventModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowEditEventModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.addEventModalContainer}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Sports Event</Text>
                            <TouchableOpacity
                                onPress={() => setShowEditEventModal(false)}
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
                            {/* Event Date */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Event Date</Text>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowEventDatePicker(true)}
                                >
                                    <Text
                                        style={[
                                            styles.dateInputText,
                                            !eventDate && styles.placeholder,
                                        ]}
                                    >
                                        {eventDate || 'mm/dd/yyyy'}
                                    </Text>
                                    <Ionicons
                                        name="calendar-outline"
                                        size={20}
                                        color={theme.colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Title */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Title</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter event title"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={eventTitle}
                                    onChangeText={setEventTitle}
                                />
                            </View>

                            {/* Sport Type */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>
                                    Sport Type <Text style={styles.required}>*</Text>
                                </Text>
                                <TouchableOpacity
                                    style={styles.dropdownInput}
                                    onPress={() => setShowSportTypeDropdown(true)}
                                >
                                    <Text
                                        style={[
                                            styles.dropdownInputText,
                                            !sportType && styles.placeholder,
                                        ]}
                                    >
                                        {sportType || 'Select sport type'}
                                    </Text>
                                    <Ionicons
                                        name="chevron-down"
                                        size={20}
                                        color={theme.colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Event Type */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Event Type</Text>
                                <TouchableOpacity
                                    style={styles.dropdownInput}
                                    onPress={() => setShowModalEventTypeDropdown(true)}
                                >
                                    <Text
                                        style={[
                                            styles.dropdownInputText,
                                            !eventType && styles.placeholder,
                                        ]}
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

                            {/* Divisions */}
                            <View style={styles.formSection}>
                                <View style={styles.divisionsHeader}>
                                    <Text style={styles.label}>Divisions (optional)</Text>
                                    <View style={styles.divisionsActions}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedDivisions(
                                                    DIVISIONS.filter((d) => d !== 'All Divisions')
                                                );
                                            }}
                                        >
                                            <Text style={styles.divisionsActionText}>Select All</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedDivisions([]);
                                            }}
                                        >
                                            <Text style={styles.divisionsActionText}>
                                                Deselect All
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <ScrollView
                                    style={styles.divisionsList}
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={true}
                                >
                                    {DIVISIONS.filter((d) => d !== 'All Divisions').map(
                                        (division) => (
                                            <TouchableOpacity
                                                key={division}
                                                style={styles.radioButtonContainer}
                                                onPress={() => {
                                                    if (selectedDivisions.includes(division)) {
                                                        setSelectedDivisions(
                                                            selectedDivisions.filter(
                                                                (d) => d !== division
                                                            )
                                                        );
                                                    } else {
                                                        setSelectedDivisions([
                                                            ...selectedDivisions,
                                                            division,
                                                        ]);
                                                    }
                                                }}
                                            >
                                                <View
                                                    style={[
                                                        styles.radioButton,
                                                        selectedDivisions.includes(division) &&
                                                            styles.radioButtonSelected,
                                                    ]}
                                                >
                                                    {selectedDivisions.includes(division) && (
                                                        <View style={styles.radioButtonInner} />
                                                    )}
                                                </View>
                                                <Text style={styles.radioButtonLabel}>{division}</Text>
                                            </TouchableOpacity>
                                        )
                                    )}
                                </ScrollView>
                            </View>

                            {/* Home or Away */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Home or Away</Text>
                                <TouchableOpacity
                                    style={styles.dropdownInput}
                                    onPress={() => setShowHomeOrAwayDropdown(true)}
                                >
                                    <Text
                                        style={[
                                            styles.dropdownInputText,
                                            !homeOrAway && styles.placeholder,
                                        ]}
                                    >
                                        {homeOrAway || 'Select home/away'}
                                    </Text>
                                    <Ionicons
                                        name="chevron-down"
                                        size={20}
                                        color={theme.colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Location */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Location (optional)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter location"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={location}
                                    onChangeText={setLocation}
                                />
                            </View>

                            {/* Team */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Team (optional)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter team name"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={team}
                                    onChangeText={setTeam}
                                />
                            </View>

                            {/* Opponent */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Opponent (optional)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter opponent name"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={opponent}
                                    onChangeText={setOpponent}
                                />
                            </View>

                            {/* Description */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Description (optional)</Text>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Enter description"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* Meal Options */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Meal Options</Text>
                                <View style={styles.radioGroup}>
                                    {MEAL_OPTIONS.map((option) => (
                                        <TouchableOpacity
                                            key={option}
                                            style={styles.radioButtonContainer}
                                            onPress={() =>
                                                setMealOption(mealOption === option ? '' : option)
                                            }
                                        >
                                            <View
                                                style={[
                                                    styles.radioButton,
                                                    mealOption === option &&
                                                        styles.radioButtonSelected,
                                                ]}
                                            >
                                                {mealOption === option && (
                                                    <View style={styles.radioButtonInner} />
                                                )}
                                            </View>
                                            <Text style={styles.radioButtonLabel}>{option}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Staff Assignment */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Staff Assignment</Text>
                                <View style={styles.radioGroup}>
                                    {STAFF_ASSIGNMENT.map((assignment) => (
                                        <TouchableOpacity
                                            key={assignment}
                                            style={styles.radioButtonContainer}
                                            onPress={() =>
                                                setStaffAssignment(
                                                    staffAssignment === assignment ? '' : assignment
                                                )
                                            }
                                        >
                                            <View
                                                style={[
                                                    styles.radioButton,
                                                    staffAssignment === assignment &&
                                                        styles.radioButtonSelected,
                                                ]}
                                            >
                                                {staffAssignment === assignment && (
                                                    <View style={styles.radioButtonInner} />
                                                )}
                                            </View>
                                            <Text style={styles.radioButtonLabel}>{assignment}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>

                        {/* Dropdowns rendered outside ScrollView for proper z-index layering */}
                        {showSportTypeDropdown && sportTypeInputLayout && (
                            <View
                                style={[
                                    styles.modalDropdownMenuAbsolute,
                                    {
                                        top: sportTypeInputLayout.y - scrollViewOffset + sportTypeInputLayout.height + headerHeight + 4,
                                        left: sportTypeInputLayout.x,
                                        width: sportTypeInputLayout.width,
                                        zIndex: 2000,
                                        elevation: 10,
                                    },
                                ]}
                                collapsable={false}
                                pointerEvents="box-none"
                            >
                                <FlatList
                                    data={SPORT_TYPES}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.filterDropdownItem,
                                                sportType === item &&
                                                    styles.filterDropdownItemSelected,
                                            ]}
                                            onPress={() => {
                                                setSportType(item);
                                                setShowSportTypeDropdown(false);
                                            }}
                                        >
                                            {sportType === item && (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={20}
                                                    color={theme.colors.surface}
                                                    style={styles.checkIcon}
                                                />
                                            )}
                                            <Text
                                                style={[
                                                    styles.filterDropdownItemText,
                                                    sportType === item &&
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
                        )}
                        {showModalEventTypeDropdown && eventTypeInputLayout && (
                            <View
                                style={[
                                    styles.modalDropdownMenuAbsolute,
                                    {
                                        top: eventTypeInputLayout.y - scrollViewOffset + eventTypeInputLayout.height + headerHeight + 4,
                                        left: eventTypeInputLayout.x,
                                        width: eventTypeInputLayout.width,
                                        zIndex: 2000,
                                        elevation: 10,
                                    },
                                ]}
                                collapsable={false}
                                pointerEvents="box-none"
                            >
                                <FlatList
                                    data={EVENT_TYPES.filter((e) => e !== 'All Event Types')}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.filterDropdownItem,
                                                eventType === item &&
                                                    styles.filterDropdownItemSelected,
                                            ]}
                                            onPress={() => {
                                                setEventType(item);
                                                setShowModalEventTypeDropdown(false);
                                            }}
                                        >
                                            {eventType === item && (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={20}
                                                    color={theme.colors.surface}
                                                    style={styles.checkIcon}
                                                />
                                            )}
                                            <Text
                                                style={[
                                                    styles.filterDropdownItemText,
                                                    eventType === item &&
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
                        )}
                        {showHomeOrAwayDropdown && homeOrAwayInputLayout && (
                            <View
                                style={[
                                    styles.modalDropdownMenuAbsolute,
                                    {
                                        top: homeOrAwayInputLayout.y - scrollViewOffset + homeOrAwayInputLayout.height + headerHeight + 4,
                                        left: homeOrAwayInputLayout.x,
                                        width: homeOrAwayInputLayout.width,
                                        zIndex: 2000,
                                        elevation: 10,
                                    },
                                ]}
                                collapsable={false}
                                pointerEvents="box-none"
                            >
                                <FlatList
                                    data={HOME_OR_AWAY}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.filterDropdownItem,
                                                homeOrAway === item &&
                                                    styles.filterDropdownItemSelected,
                                            ]}
                                            onPress={() => {
                                                setHomeOrAway(item);
                                                setShowHomeOrAwayDropdown(false);
                                            }}
                                        >
                                            {homeOrAway === item && (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={20}
                                                    color={theme.colors.surface}
                                                    style={styles.checkIcon}
                                                />
                                            )}
                                            <Text
                                                style={[
                                                    styles.filterDropdownItemText,
                                                    homeOrAway === item &&
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
                        )}

                        {/* Modal Footer */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowEditEventModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    !sportType && styles.submitButtonDisabled,
                                ]}
                                onPress={() => {
                                    if (!sportType) return;
                                    // TODO: Implement event update
                                    console.log('Updating event:', {
                                        eventDate,
                                        eventTitle,
                                        sportType,
                                        eventType,
                                        selectedDivisions,
                                        homeOrAway,
                                        location,
                                        team,
                                        opponent,
                                        description,
                                        mealOption,
                                        staffAssignment,
                                    });
                                    setShowEditEventModal(false);
                                }}
                                disabled={!sportType}
                            >
                                <Text style={styles.submitButtonText}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={showDeleteConfirmModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteConfirmModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.deleteConfirmModalContainer}>
                        <Text style={styles.deleteConfirmTitle}>Delete Event?</Text>
                        <Text style={styles.deleteConfirmMessage}>
                            This action cannot be undone. This will permanently delete the sports
                            event.
                        </Text>
                        <View style={styles.deleteConfirmActions}>
                            <TouchableOpacity
                                style={styles.deleteCancelButton}
                                onPress={() => setShowDeleteConfirmModal(false)}
                            >
                                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteConfirmButton}
                                onPress={() => {
                                    // TODO: Implement delete
                                    console.log('Deleting event:', selectedEvent);
                                    setEvents(events.filter((e) => e.id !== selectedEvent?.id));
                                    setShowDeleteConfirmModal(false);
                                    setSelectedEvent(null);
                                }}
                            >
                                <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* CSV Upload Format Guide Modal */}
            <Modal
                visible={showCSVGuideModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCSVGuideModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.csvGuideModalContainer}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.csvGuideHeaderContent}>
                                <Ionicons
                                    name="document-text-outline"
                                    size={24}
                                    color={theme.colors.secondary}
                                />
                                <Text style={styles.modalTitle}>CSV Upload Format Guide</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowCSVGuideModal(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Tabs - Two Rows */}
                        <View style={styles.csvGuideTabsContainer}>
                            {/* First Row */}
                            <View style={styles.csvGuideTabsRow}>
                                {['Children', 'Staff', 'Medications', 'Trips', 'Menu'].map(
                                    (tab) => (
                                        <TouchableOpacity
                                            key={tab}
                                            style={[
                                                styles.csvGuideTab,
                                                csvGuideTab === tab && styles.csvGuideTabActive,
                                            ]}
                                            onPress={() => setCsvGuideTab(tab)}
                                        >
                                            <Text
                                                style={[
                                                    styles.csvGuideTabText,
                                                    csvGuideTab === tab &&
                                                        styles.csvGuideTabTextActive,
                                                ]}
                                            >
                                                {tab}
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                )}
                            </View>
                            {/* Second Row */}
                            <View style={styles.csvGuideTabsRow}>
                                {['Awards', 'Daily Notes', 'Incidents', 'Calendar', 'Sports'].map(
                                    (tab) => (
                                        <TouchableOpacity
                                            key={tab}
                                            style={[
                                                styles.csvGuideTab,
                                                csvGuideTab === tab && styles.csvGuideTabActive,
                                            ]}
                                            onPress={() => setCsvGuideTab(tab)}
                                        >
                                            <Text
                                                style={[
                                                    styles.csvGuideTabText,
                                                    csvGuideTab === tab &&
                                                        styles.csvGuideTabTextActive,
                                                ]}
                                            >
                                                {tab}
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                )}
                            </View>
                        </View>

                        {/* Tab Content */}
                        <ScrollView
                            style={styles.csvGuideContent}
                            contentContainerStyle={styles.csvGuideScrollContent}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                        >
                            {csvGuideTab === 'Children' && (
                                <View style={styles.csvGuideSection}>
                                    <Text style={styles.csvGuideTitle}>Children Roster</Text>
                                    <Text style={styles.csvGuideSubtitle}>
                                        CSV format for children roster upload
                                    </Text>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>
                                            Required Columns (first row):
                                        </Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                first_name, last_name, person_id, age, grade, gender,
                                                guardian_phone, guardian_email, medical_notes,
                                                allergies, division_id, leader_id,
                                                emergency_contact, status, season
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>Example Data Row:</Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                John, Doe, P12345, 10, 5, Male, 555-1234,
                                                parent@email.com, None, Peanuts, {'<division_id>'},
                                                {'<leader_id>'}, Jane Doe 555-5678, active, Summer
                                                2024
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideImportantBox}>
                                        <Text style={styles.csvGuideImportantTitle}>Important Notes:</Text>
                                        <Text style={styles.csvGuideImportantText}>
                                            REQUIRED: first_name, last_name, and person_id. All other
                                            fields are optional. division_id and leader_id must be valid
                                            UUIDs from divisions and staff tables if provided.
                                        </Text>
                                    </View>

                                    <View style={styles.csvGuideTipsBox}>
                                        <Text style={styles.csvGuideTipsTitle}>General Tips:</Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • First row must contain column names exactly as shown
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use commas to separate values
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use backslash before commas within text fields (e.g.,
                                            "Item 1\, Item 2")
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Leave fields empty for optional columns
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Maximum 1000 rows per upload
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Dates must be in YYYY-MM-DD format
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • UUIDs can be obtained from the backend for existing
                                            records
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {csvGuideTab === 'Staff' && (
                                <View style={styles.csvGuideSection}>
                                    <Text style={styles.csvGuideTitle}>Staff Directory</Text>
                                    <Text style={styles.csvGuideSubtitle}>
                                        CSV format for staff directory upload
                                    </Text>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>
                                            Required Columns (first row):
                                        </Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                name, email, phone, role, department, hire_date,
                                                leader_id, status, season
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>Example Data Row:</Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                Jane Smith, jane@thenest.com, 555-9876, Counselor,
                                                Activities, 2024-01-15, {'<leader_id>'}, active, Summer
                                                2024
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideImportantBox}>
                                        <Text style={styles.csvGuideImportantTitle}>Important Notes:</Text>
                                        <Text style={styles.csvGuideImportantText}>
                                            leader_id must be a valid UUID from staff table. hire_date
                                            format: YYYY-MM-DD
                                        </Text>
                                    </View>

                                    <View style={styles.csvGuideTipsBox}>
                                        <Text style={styles.csvGuideTipsTitle}>General Tips:</Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • First row must contain column names exactly as shown
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use commas to separate values
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use backslash before commas within text fields (e.g.,
                                            "Item 1\, Item 2")
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Leave fields empty for optional columns
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Maximum 1000 rows per upload
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Dates must be in YYYY-MM-DD format
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • UUIDs can be obtained from the backend for existing
                                            records
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {csvGuideTab === 'Medications' && (
                                <View style={styles.csvGuideSection}>
                                    <Text style={styles.csvGuideTitle}>Medication Logs</Text>
                                    <Text style={styles.csvGuideSubtitle}>
                                        CSV format for medication logs upload
                                    </Text>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>
                                            Required Columns (first row):
                                        </Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                child_id, medication_name, dosage, meal_time, date,
                                                notes, is_recurring, frequency, days_of_week, end_date
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>Example Data Row:</Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                {'<child_id>'}, Tylenol, 5ml, Before Breakfast,
                                                2024-01-15, Take with food, false, daily,,
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideImportantBox}>
                                        <Text style={styles.csvGuideImportantTitle}>Important Notes:</Text>
                                        <Text style={styles.csvGuideImportantText}>
                                            child_id must be a valid UUID. meal_time options: Before
                                            Breakfast, After Breakfast, Before Lunch, After Lunch,
                                            Before Dinner, After Dinner, Bedtime. date format:
                                            YYYY-MM-DD
                                        </Text>
                                    </View>

                                    <View style={styles.csvGuideTipsBox}>
                                        <Text style={styles.csvGuideTipsTitle}>General Tips:</Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • First row must contain column names exactly as shown
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use commas to separate values
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use backslash before commas within text fields (e.g.,
                                            "Item 1\, Item 2")
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Leave fields empty for optional columns
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Maximum 1000 rows per upload
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Dates must be in YYYY-MM-DD format
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • UUIDs can be obtained from the backend for existing
                                            records
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {csvGuideTab === 'Trips' && (
                                <View style={styles.csvGuideSection}>
                                    <Text style={styles.csvGuideTitle}>Transportation/Trips</Text>
                                    <Text style={styles.csvGuideSubtitle}>
                                        CSV format for transportation/trips upload
                                    </Text>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>
                                            Required Columns (first row):
                                        </Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                name, type, date, destination, departure_time,
                                                return_time, capacity, driver, chaperone,
                                                transportation_type, event_type, event_length, meal,
                                                status
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>Example Data Row:</Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                Zoo Trip, Field Trip, 2024-06-15, City Zoo, 09:00,
                                                15:00, 30, John Driver, Jane Chaperone, Bus,
                                                Educational, Half Day, Packed Lunch, confirmed
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideImportantBox}>
                                        <Text style={styles.csvGuideImportantTitle}>Important Notes:</Text>
                                        <Text style={styles.csvGuideImportantText}>
                                            date format: YYYY-MM-DD. type options: Field Trip, Sports
                                            Event, Other
                                        </Text>
                                    </View>

                                    <View style={styles.csvGuideTipsBox}>
                                        <Text style={styles.csvGuideTipsTitle}>General Tips:</Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • First row must contain column names exactly as shown
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use commas to separate values
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use backslash before commas within text fields (e.g.,
                                            "Item 1\, Item 2")
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Leave fields empty for optional columns
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Maximum 1000 rows per upload
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Dates must be in YYYY-MM-DD format
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • UUIDs can be obtained from the backend for existing
                                            records
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {csvGuideTab === 'Menu' && (
                                <View style={styles.csvGuideSection}>
                                    <Text style={styles.csvGuideTitle}>Menu Items</Text>
                                    <Text style={styles.csvGuideSubtitle}>
                                        CSV format for menu items upload
                                    </Text>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>
                                            Required Columns (first row):
                                        </Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                date, meal_type, items, allergens
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>Example Data Row:</Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                2024-06-15, Lunch, Chicken Nuggets\, Fries\,
                                                Apple Slices, Contains: Wheat\, Soy
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideImportantBox}>
                                        <Text style={styles.csvGuideImportantTitle}>Important Notes:</Text>
                                        <Text style={styles.csvGuideImportantText}>
                                            date format: YYYY-MM-DD. meal_type options: Breakfast,
                                            Lunch, Snack, Dinner. Use backslash before commas within
                                            items/allergens
                                        </Text>
                                    </View>

                                    <View style={styles.csvGuideTipsBox}>
                                        <Text style={styles.csvGuideTipsTitle}>General Tips:</Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • First row must contain column names exactly as shown
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use commas to separate values
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use backslash before commas within text fields (e.g.,
                                            "Item 1\, Item 2")
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Leave fields empty for optional columns
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Maximum 1000 rows per upload
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Dates must be in YYYY-MM-DD format
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • UUIDs can be obtained from the backend for existing
                                            records
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {csvGuideTab === 'Awards' && (
                                <View style={styles.csvGuideSection}>
                                    <Text style={styles.csvGuideTitle}>Awards</Text>
                                    <Text style={styles.csvGuideSubtitle}>
                                        CSV format for awards upload
                                    </Text>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>
                                            Required Columns (first row):
                                        </Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                child_id, title, category, date, description
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>Example Data Row:</Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                {'<child_id>'}, Best Sportsmanship, Sports,
                                                2024-06-15, Showed excellent teamwork during soccer
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideImportantBox}>
                                        <Text style={styles.csvGuideImportantTitle}>Important Notes:</Text>
                                        <Text style={styles.csvGuideImportantText}>
                                            child_id must be valid UUID. date format: YYYY-MM-DD
                                        </Text>
                                    </View>

                                    <View style={styles.csvGuideTipsBox}>
                                        <Text style={styles.csvGuideTipsTitle}>General Tips:</Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • First row must contain column names exactly as shown
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use commas to separate values
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use backslash before commas within text fields (e.g.,
                                            "Item 1\, Item 2")
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Leave fields empty for optional columns
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Maximum 1000 rows per upload
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Dates must be in YYYY-MM-DD format
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • UUIDs can be obtained from the backend for existing
                                            records
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {csvGuideTab === 'Daily Notes' && (
                                <View style={styles.csvGuideSection}>
                                    <Text style={styles.csvGuideTitle}>Daily Notes</Text>
                                    <Text style={styles.csvGuideSubtitle}>
                                        CSV format for daily notes upload
                                    </Text>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>
                                            Required Columns (first row):
                                        </Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                child_id, date, mood, activities, meals, nap, notes,
                                                created_by
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>Example Data Row:</Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                {'<child_id>'}, 2024-06-15, Happy, Arts and crafts\,
                                                Swimming, Ate well, 1 hour, Great day overall, {'<staff_id>'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideImportantBox}>
                                        <Text style={styles.csvGuideImportantTitle}>Important Notes:</Text>
                                        <Text style={styles.csvGuideImportantText}>
                                            child_id and created_by must be valid UUIDs. date format:
                                            YYYY-MM-DD. Use backslash before commas within text fields
                                        </Text>
                                    </View>

                                    <View style={styles.csvGuideTipsBox}>
                                        <Text style={styles.csvGuideTipsTitle}>General Tips:</Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • First row must contain column names exactly as shown
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use commas to separate values
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use backslash before commas within text fields (e.g.,
                                            "Item 1\, Item 2")
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Leave fields empty for optional columns
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Maximum 1000 rows per upload
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Dates must be in YYYY-MM-DD format
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • UUIDs can be obtained from the backend for existing
                                            records
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {csvGuideTab === 'Incidents' && (
                                <View style={styles.csvGuideSection}>
                                    <Text style={styles.csvGuideTitle}>Incident Reports</Text>
                                    <Text style={styles.csvGuideSubtitle}>
                                        CSV format for incident reports upload
                                    </Text>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>
                                            Required Columns (first row):
                                        </Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                child_id, date, type, severity, description,
                                                reported_by, status
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>Example Data Row:</Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                {'<child_id>'}, 2024-06-15, Minor Injury, Low,
                                                Scraped knee on playground, Jane Smith, resolved
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideImportantBox}>
                                        <Text style={styles.csvGuideImportantTitle}>Important Notes:</Text>
                                        <Text style={styles.csvGuideImportantText}>
                                            child_id must be valid UUID. date format: YYYY-MM-DD.
                                            type options: Injury, Illness, Behavioral, Other
                                        </Text>
                                    </View>

                                    <View style={styles.csvGuideTipsBox}>
                                        <Text style={styles.csvGuideTipsTitle}>General Tips:</Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • First row must contain column names exactly as shown
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use commas to separate values
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use backslash before commas within text fields (e.g.,
                                            "Item 1\, Item 2")
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Leave fields empty for optional columns
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Maximum 1000 rows per upload
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Dates must be in YYYY-MM-DD format
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • UUIDs can be obtained from the backend for existing
                                            records
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {csvGuideTab === 'Calendar' && (
                                <View style={styles.csvGuideSection}>
                                    <Text style={styles.csvGuideTitle}>Master Calendar</Text>
                                    <Text style={styles.csvGuideSubtitle}>
                                        CSV format for master calendar upload
                                    </Text>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>
                                            Required Columns (first row):
                                        </Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                event_date, title, type, description, time, location,
                                                division_id, created_by
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>Example Data Row:</Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                2024-06-20, Swimming Day, Activity, Pool day for all
                                                divisions, 10:00, Main Pool, {'<division_id>'}, {'<staff_id>'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideImportantBox}>
                                        <Text style={styles.csvGuideImportantTitle}>Important Notes:</Text>
                                        <Text style={styles.csvGuideImportantText}>
                                            event_date format: YYYY-MM-DD. division_id and created_by
                                            must be valid UUIDs or leave empty
                                        </Text>
                                    </View>

                                    <View style={styles.csvGuideTipsBox}>
                                        <Text style={styles.csvGuideTipsTitle}>General Tips:</Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • First row must contain column names exactly as shown
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use commas to separate values
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use backslash before commas within text fields (e.g.,
                                            "Item 1\, Item 2")
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Leave fields empty for optional columns
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Maximum 1000 rows per upload
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Dates must be in YYYY-MM-DD format
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • UUIDs can be obtained from the backend for existing
                                            records
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {csvGuideTab === 'Sports' && (
                                <View style={styles.csvGuideSection}>
                                    <Text style={styles.csvGuideTitle}>Sports Calendar</Text>
                                    <Text style={styles.csvGuideSubtitle}>
                                        CSV format for sports calendar upload
                                    </Text>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>
                                            Required Columns (first row):
                                        </Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                event_date, title, sport_type, description, time,
                                                location, team, opponent, division_id, created_by
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideInfoBox}>
                                        <Text style={styles.csvGuideInfoTitle}>Example Data Row:</Text>
                                        <View style={styles.csvGuideCodeBox}>
                                            <Text style={styles.csvGuideCodeText}>
                                                2024-06-25, Championship Game, Basketball, Final game
                                                of season, 14:00, Main Court, Eagles, Hawks, {'<division_id>'}, {'<staff_id>'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.csvGuideImportantBox}>
                                        <Text style={styles.csvGuideImportantTitle}>Important Notes:</Text>
                                        <Text style={styles.csvGuideImportantText}>
                                            event_date format: YYYY-MM-DD. sport_type options:
                                            Baseball, Basketball, Dance, Football, Golf, Gymnastics,
                                            Hockey, Lacrosse, Soccer, Softball, Tennis, Volleyball,
                                            Waterfront. division_id and created_by can be empty
                                        </Text>
                                    </View>

                                    <View style={styles.csvGuideTipsBox}>
                                        <Text style={styles.csvGuideTipsTitle}>General Tips:</Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • First row must contain column names exactly as shown
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use commas to separate values
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Use backslash before commas within text fields (e.g.,
                                            "Item 1\, Item 2")
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Leave fields empty for optional columns
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Maximum 1000 rows per upload
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • Dates must be in YYYY-MM-DD format
                                        </Text>
                                        <Text style={styles.csvGuideTipItem}>
                                            • UUIDs can be obtained from the backend for existing
                                            records
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </ScrollView>
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
        paddingBottom: theme.spacing.xl,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
    },
    headerContent: {
        flex: 1,
        marginHorizontal: theme.spacing.md,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
    },
    titleIcon: {
        flexShrink: 0,
    },
    headerTitle: {
        ...theme.typography.h1,
        flex: 1,
    },
    headerSubtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    viewModeButtons: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
    },
    viewModeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minWidth: 44,
        minHeight: 44,
    },
    viewModeButtonActive: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    helpButton: {
        padding: theme.spacing.sm,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    uploadButtonText: {
        ...theme.typography.body,
        color: theme.colors.text,
    },
    addEventButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    addEventButtonText: {
        ...theme.typography.body,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    searchIcon: {
        marginRight: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        ...theme.typography.body,
    },
    sortContainer: {
        marginBottom: theme.spacing.md,
        position: 'relative',
        zIndex: 1000,
    },
    sortDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    sortDropdownText: {
        ...theme.typography.body,
    },
    filtersRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
        flexWrap: 'wrap',
        position: 'relative',
        zIndex: 1000,
    },
    filterButtonWrapper: {
        position: 'relative',
        zIndex: 1001,
        elevation: 100,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minHeight: 36,
    },
    filterButtonActive: {
        backgroundColor: '#fff7ed',
        borderColor: theme.colors.secondary,
    },
    filterButtonText: {
        ...theme.typography.bodySmall,
    },
    filterButtonTextActive: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    calendarNavigation: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
        paddingHorizontal: theme.spacing.xs,
        position: 'relative',
        zIndex: 1,
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    calendarNavLeft: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
        flexShrink: 0,
    },
    calendarNavButtons: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
    },
    navButton: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minWidth: 50,
    },
    navButtonText: {
        ...theme.typography.body,
    },
    calendarMonthYear: {
        ...theme.typography.body,
        fontWeight: '600',
        textAlign: 'center',
        flex: 1,
        minWidth: 120,
        marginHorizontal: theme.spacing.xs,
    },
    viewToggles: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
        flexShrink: 0,
    },
    viewToggleButton: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minWidth: 60,
    },
    viewToggleButtonActive: {
        backgroundColor: '#e5e5e5',
        borderWidth: 2,
        borderColor: '#000',
    },
    viewToggleText: {
        ...theme.typography.bodySmall,
    },
    viewToggleTextActive: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    calendarCard: {
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    weekdayHeader: {
        width: '14.28%',
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    weekdayText: {
        ...theme.typography.bodySmall,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    calendarDateCell: {
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.xs,
    },
    todayCell: {
        borderRadius: 20,
        backgroundColor: theme.colors.background,
    },
    selectedDateCell: {
        borderRadius: 20,
        backgroundColor: theme.colors.secondary,
    },
    dateText: {
        ...theme.typography.body,
        fontSize: 14,
    },
    previousMonthDate: {
        color: theme.colors.textSecondary,
        opacity: 0.5,
    },
    todayDateText: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    selectedDateText: {
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
    dropdownOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        elevation: 99,
        backgroundColor: 'transparent',
    },
    dropdownModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
    },
    dropdownModalContent: {
        width: '100%',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: 120,
        justifyContent: 'flex-start',
        alignItems: 'stretch',
    },
    mobileDropdownOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        paddingTop: 100,
    },
    mobileDropdownContainer: {
        width: '100%',
        paddingHorizontal: theme.spacing.lg,
    },
    mobileDropdownMenu: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxHeight: 400,
        width: '100%',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    filterDropdownMenu: {
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
        zIndex: 10002,
        elevation: 102,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        overflow: 'hidden',
    },
    filterDropdownMenuModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxHeight: 300,
        width: '100%',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        alignSelf: 'stretch',
    },
    filterDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        minHeight: 44,
    },
    filterDropdownItemSelected: {
        backgroundColor: theme.colors.accent,
    },
    checkIcon: {
        marginRight: theme.spacing.xs,
    },
    filterDropdownItemText: {
        ...theme.typography.body,
        flex: 1,
    },
    filterDropdownItemTextSelected: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    listViewContainer: {
        marginTop: theme.spacing.lg,
    },
    eventsContainer: {
        marginTop: theme.spacing.md,
    },
    monthHeader: {
        ...theme.typography.h3,
        marginBottom: theme.spacing.md,
    },
    eventsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
    },
    eventCard: {
        width: '100%',
        marginBottom: theme.spacing.md,
        padding: theme.spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.danger,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        ...theme.shadows.card,
    },
    eventCardHeader: {
        marginBottom: theme.spacing.sm,
    },
    eventCardTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.xs,
    },
    eventCardTitle: {
        ...theme.typography.h3,
        flex: 1,
        marginRight: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    eventCardActions: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
    },
    eventActionIcon: {
        padding: theme.spacing.xs,
    },
    eventCardDate: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
    },
    eventTagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.sm,
        width: '100%',
    },
    eventTag: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        maxWidth: '100%',
    },
    sportTag: {
        backgroundColor: '#3b82f6',
    },
    eventTypeTag: {
        backgroundColor: '#e0f2fe',
    },
    divisionTag: {
        backgroundColor: '#14b8a6',
    },
    rosterTag: {
        backgroundColor: theme.colors.danger,
    },
    eventTagText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        flexShrink: 1,
    },
    sportTagText: {
        color: theme.colors.surface,
    },
    eventTypeTagText: {
        color: '#0369a1',
    },
    divisionTagText: {
        color: theme.colors.surface,
    },
    rosterTagText: {
        color: theme.colors.surface,
    },
    eventLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    eventLocationText: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addEventModalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '90%',
        maxWidth: 600,
        maxHeight: '90%',
        overflow: 'visible',
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
        overflow: 'visible',
    },
    modalScrollContent: {
        padding: theme.spacing.lg,
        overflow: 'visible',
    },
    formSection: {
        marginBottom: theme.spacing.lg,
        overflow: 'visible',
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
    textInput: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        ...theme.typography.body,
        minHeight: 44,
    },
    dropdownInput: {
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
    dropdownInputText: {
        ...theme.typography.body,
        flex: 1,
    },
    divisionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    divisionsActions: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    divisionsActionText: {
        ...theme.typography.bodySmall,
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    divisionsList: {
        maxHeight: 200,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        backgroundColor: theme.colors.background,
    },
    radioGroup: {
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
    textArea: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        ...theme.typography.body,
        minHeight: 100,
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
    formSectionWithDropdown: {
        marginTop: 320,
    },
    dropdownInputContainer: {
        position: 'relative',
        zIndex: 1,
    },
    modalDropdownWrapper: {
        position: 'relative',
        zIndex: 10003,
        elevation: 103,
    },
    dropdownContainer: {
        position: 'relative',
        zIndex: 10000,
    },
    modalDropdownOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'transparent',
    },
    modalDropdownMenu: {
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
        zIndex: 99999,
        elevation: 99999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        overflow: 'hidden',
    },
    modalDropdownMenuAbsolute: {
        position: 'absolute',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxHeight: 300,
        zIndex: 99999,
        elevation: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        overflow: 'hidden',
    },
    modalDropdownMenuOutside: {
        position: 'absolute',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxHeight: 300,
        zIndex: 99999,
        elevation: 99999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        overflow: 'hidden',
    },
    eventDetailModalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '90%',
        maxWidth: 500,
        ...theme.shadows.card,
    },
    eventDetailContent: {
        padding: theme.spacing.lg,
    },
    rosterCountSection: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        paddingVertical: theme.spacing.lg,
    },
    rosterCountHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    rosterCountLabel: {
        ...theme.typography.body,
        fontWeight: '600',
    },
    rosterCountNumber: {
        ...theme.typography.h1,
        fontSize: 48,
        color: theme.colors.text,
    },
    eventDetailActions: {
        gap: theme.spacing.md,
    },
    manageRosterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    manageRosterButtonText: {
        ...theme.typography.body,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    editEventButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    editEventButtonText: {
        ...theme.typography.body,
        color: theme.colors.text,
        fontWeight: '600',
    },
    deleteEventButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.danger,
    },
    deleteEventButtonText: {
        ...theme.typography.body,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    manageRosterModalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '90%',
        maxWidth: 600,
        maxHeight: '90%',
        ...theme.shadows.card,
    },
    rosterTabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    rosterTab: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    rosterTabActive: {
        borderBottomColor: theme.colors.secondary,
    },
    rosterTabText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    rosterTabTextActive: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    rosterTabContent: {
        flex: 1,
        padding: theme.spacing.lg,
    },
    camperSearchSection: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    camperSearchInput: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    camperSearchTextInput: {
        flex: 1,
        ...theme.typography.body,
        marginLeft: theme.spacing.sm,
    },
    camperSortDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    camperSortText: {
        ...theme.typography.body,
    },
    selectedCountText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    campersList: {
        flex: 1,
        maxHeight: 400,
        marginBottom: theme.spacing.md,
    },
    campersListContent: {
        paddingBottom: theme.spacing.md,
    },
    camperItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    camperRadioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.secondary,
        marginRight: theme.spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    camperRadioButtonSelected: {
        borderColor: theme.colors.secondary,
    },
    camperRadioButtonInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.secondary,
    },
    camperInfo: {
        flex: 1,
    },
    camperName: {
        ...theme.typography.body,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
    },
    camperGrade: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
    },
    saveTemplateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.secondary,
        marginBottom: theme.spacing.md,
    },
    saveTemplateButtonText: {
        ...theme.typography.body,
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    staffSection: {
        marginBottom: theme.spacing.xl,
    },
    staffSectionWithDropdown: {
        marginBottom: 250,
    },
    staffSectionTitle: {
        ...theme.typography.h3,
        marginBottom: theme.spacing.md,
    },
    coachAssignmentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
    },
    coachAssignmentText: {
        ...theme.typography.body,
        flex: 1,
        marginRight: theme.spacing.md,
    },
    divisionProvideTag: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        backgroundColor: '#14b8a6',
        borderRadius: theme.borderRadius.md,
    },
    divisionProvideTagText: {
        ...theme.typography.bodySmall,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    refereeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        marginBottom: theme.spacing.md,
        position: 'relative',
        zIndex: 1,
    },
    refereeInput: {
        flex: 1,
        ...theme.typography.body,
    },
    refereeDropdownItem: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    refereeDropdownItemText: {
        ...theme.typography.body,
    },
    noRefereesText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    refereesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.sm,
    },
    refereeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    refereeTagText: {
        ...theme.typography.bodySmall,
    },
    templatesEmptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.xl,
        minHeight: 200,
    },
    templatesEmptyStateTitle: {
        ...theme.typography.h3,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    templatesEmptyStateText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    templatesList: {
        flex: 1,
    },
    templateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        gap: theme.spacing.md,
    },
    templateInfo: {
        flex: 1,
    },
    templateName: {
        ...theme.typography.body,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
    },
    templateDetails: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
    },
    deleteConfirmModalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        width: '90%',
        maxWidth: 400,
        ...theme.shadows.card,
    },
    deleteConfirmTitle: {
        ...theme.typography.h2,
        marginBottom: theme.spacing.md,
    },
    deleteConfirmMessage: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        lineHeight: 24,
    },
    deleteConfirmActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.md,
    },
    deleteCancelButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.secondary,
    },
    deleteCancelButtonText: {
        ...theme.typography.body,
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    deleteConfirmButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    deleteConfirmButtonText: {
        ...theme.typography.body,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    csvGuideModalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '95%',
        maxWidth: 600,
        maxHeight: '90%',
        ...theme.shadows.card,
    },
    csvGuideHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    csvGuideTabsContainer: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    csvGuideTabsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        flexWrap: 'wrap',
        marginBottom: theme.spacing.xs,
    },
    csvGuideTab: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
    },
    csvGuideTabActive: {
        borderColor: theme.colors.secondary,
        borderWidth: 2,
    },
    csvGuideTabText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    csvGuideTabTextActive: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    csvGuideContent: {
        flex: 1,
    },
    csvGuideScrollContent: {
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.lg,
    },
    csvGuideSection: {
        gap: theme.spacing.md,
    },
    csvGuideTitle: {
        ...theme.typography.h2,
        marginTop: 0,
        marginBottom: theme.spacing.xs,
    },
    csvGuideSubtitle: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        marginTop: 0,
        marginBottom: theme.spacing.md,
    },
    csvGuideInfoBox: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    csvGuideInfoTitle: {
        ...theme.typography.body,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
    },
    csvGuideInfoText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    csvGuideCodeBox: {
        backgroundColor: '#f5f5f5',
        borderRadius: theme.borderRadius.sm,
        padding: theme.spacing.sm,
        marginTop: theme.spacing.xs,
    },
    csvGuideCodeText: {
        ...theme.typography.bodySmall,
        fontFamily: 'monospace',
        color: theme.colors.text,
        lineHeight: 20,
    },
    csvGuideImportantBox: {
        backgroundColor: '#e3f2fd',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        marginTop: theme.spacing.xs,
        borderWidth: 1,
        borderColor: '#90caf9',
    },
    csvGuideImportantTitle: {
        ...theme.typography.body,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
        color: '#1976d2',
    },
    csvGuideImportantText: {
        ...theme.typography.body,
        color: '#1565c0',
        lineHeight: 22,
    },
    csvGuideTipsBox: {
        backgroundColor: '#fff9c4',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        marginTop: theme.spacing.xs,
        borderWidth: 1,
        borderColor: '#fdd835',
    },
    csvGuideTipsTitle: {
        ...theme.typography.body,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
        color: '#f57f17',
    },
    csvGuideTipItem: {
        ...theme.typography.bodySmall,
        color: '#f9a825',
        marginBottom: theme.spacing.xs,
        lineHeight: 20,
    },
    // Week View Styles
    weekViewContainer: {
        minHeight: 300,
        maxHeight: 500,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        marginBottom: theme.spacing.md,
    },
    weekViewHorizontalScroll: {
        height: '100%',
    },
    weekViewHorizontalContent: {
        paddingRight: theme.spacing.md,
    },
    weekViewGrid: {
        flexDirection: 'row',
        minWidth: '100%',
    },
    weekTimeColumn: {
        width: 80,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
    },
    weekTimeHeader: {
        height: 40,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    weekTimeScroll: {
        height: 460,
    },
    weekTimeSlot: {
        height: 60,
        justifyContent: 'flex-start',
        paddingTop: theme.spacing.xs,
        paddingLeft: theme.spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    weekTimeText: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    weekDayColumn: {
        width: 80,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
    },
    weekDayHeader: {
        height: 40,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
    },
    weekDayHeaderToday: {
        backgroundColor: '#e3f2fd',
    },
    weekDayHeaderText: {
        ...theme.typography.bodySmall,
        fontWeight: '600',
        color: theme.colors.text,
    },
    weekDayHeaderTextToday: {
        color: theme.colors.text,
    },
    weekDayScroll: {
        height: 460,
    },
    weekTimeSlotCell: {
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        position: 'relative',
    },
    weekTimeSlotCellToday: {
        backgroundColor: '#e3f2fd',
    },
    // Day View Styles
    dayViewContainer: {
        minHeight: 300,
        maxHeight: 500,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        marginBottom: theme.spacing.md,
    },
    dayViewScroll: {
        height: '100%',
    },
    dayViewGrid: {
        flexDirection: 'row',
    },
    dayTimeColumn: {
        width: 80,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
    },
    dayTimeSlot: {
        height: 60,
        justifyContent: 'flex-start',
        paddingTop: theme.spacing.xs,
        paddingLeft: theme.spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dayTimeText: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    dayContentColumn: {
        flex: 1,
    },
    dayTimeSlotCell: {
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        position: 'relative',
    },
    dayTimeSlotCellEven: {
        backgroundColor: '#e3f2fd',
    },
    dayTimeSlotCellOdd: {
        backgroundColor: theme.colors.surface,
    },
    currentTimeIndicator: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: '#4caf50',
        zIndex: 10,
    },
    // Agenda View Styles
    agendaViewContainer: {
        minHeight: 300,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    agendaEmptyText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    agendaViewContainerWithEvents: {
        minHeight: 300,
        maxHeight: 500,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        marginBottom: theme.spacing.md,
    },
    agendaScrollView: {
        width: '100%',
    },
    agendaScrollContent: {
        padding: theme.spacing.md,
    },
    agendaEventItem: {
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    agendaEventContent: {
        gap: theme.spacing.xs,
    },
    agendaEventTitle: {
        ...theme.typography.h3,
        color: theme.colors.text,
    },
    agendaEventDate: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    agendaEventLocation: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
    },
    calendarViewWrapper: {
        width: '100%',
    },
});
