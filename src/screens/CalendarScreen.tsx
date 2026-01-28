import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

interface Event {
    id: string;
    title: string;
    date: Date;
    location: string;
    tags: string[];
    type: 'sports' | 'field-trip' | 'special-event';
    time?: string;
}

export const CalendarScreen = ({ navigation }: any) => {
    const [activeView, setActiveView] = useState('Month');
    const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // July 2026
    const [selectedDate, setSelectedDate] = useState(new Date(2026, 6, 1));
    const [showEventList, setShowEventList] = useState(false);

    // Search and filter states
    const [eventNameSearch, setEventNameSearch] = useState('');
    const [locationSearch, setLocationSearch] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [selectedTime, setSelectedTime] = useState('All Times');
    const [selectedLocationType, setSelectedLocationType] = useState('Home & Away');
    const [sortBy, setSortBy] = useState('Sort by Date');

    // Picker modals
    const [showDivisionPicker, setShowDivisionPicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showLocationTypePicker, setShowLocationTypePicker] = useState(false);
    const [showSortPicker, setShowSortPicker] = useState(false);

    // Sample event data matching the screenshots
    const events: Event[] = [
        { id: '1', title: 'Kamen Cup', date: new Date(2026, 6, 5), location: 'Equinunk', tags: ['Sports', 'Soccer', 'Teen Boys'], type: 'sports' },
        { id: '2', title: 'Soccer Cup', date: new Date(2026, 6, 6), location: 'Blue Ridge', tags: ['Sports', 'Soccer'], type: 'sports' },
        { id: '3', title: 'Equinunk Cup', date: new Date(2026, 6, 8), location: 'Equinunk', tags: ['Sports', 'Hockey', 'Junior Boys'], type: 'sports' },
        { id: '4', title: 'Falki Open', date: new Date(2026, 6, 8), location: 'Equinunk', tags: ['Sports', 'Tennis', 'Freshmen A Girls'], type: 'sports' },
        { id: '5', title: 'Boys Basketball Invitational', date: new Date(2026, 6, 13), location: 'Home', tags: ['Sports', 'Basketball', 'CIT Boys'], type: 'sports' },
        { id: '6', title: '3 v 3 Basketball Tourney', date: new Date(2026, 6, 15), location: 'Equinunk', tags: ['Sports', 'Basketball', 'Senior Boys'], type: 'sports' },
        { id: '7', title: 'Basketball Tourney', date: new Date(2026, 6, 16), location: 'Blue Ridge', tags: ['Sports', 'Basketball', 'Senior Girls'], type: 'sports' },
        { id: '8', title: 'Silent DJ Disco', date: new Date(2026, 6, 17), location: '', tags: ['Special Event', 'evening-activity'], type: 'special-event', time: '7:00 - 23 PM' },
        { id: '9', title: 'Girls Basketball Invitational', date: new Date(2026, 6, 20), location: 'Home', tags: ['Sports', 'Basketball', 'CIT Girls'], type: 'sports' },
        { id: '10', title: 'THC Dance Competition', date: new Date(2026, 6, 22), location: 'THC', tags: ['Sports', 'Dance', 'Freshmen A Girls'], type: 'sports' },
        { id: '11', title: 'Jacobs Cup', date: new Date(2026, 6, 22), location: 'Timber Lake Camp', tags: ['Sports', 'Basketball', 'Super Boys'], type: 'sports' },
        { id: '12', title: 'Soccer Cup', date: new Date(2026, 6, 23), location: 'Blue Ridge', tags: ['Sports', 'Soccer', 'Junior Girls'], type: 'sports' },
        { id: '13', title: 'Sixes Lax Tourney', date: new Date(2026, 6, 24), location: 'THC', tags: ['Sports', 'Lacrosse', 'Cadet Boys'], type: 'sports' },
        { id: '14', title: 'Laz Bowl', date: new Date(2026, 6, 27), location: 'Home', tags: ['Sports', 'Football', 'CIT Boys'], type: 'sports' },
        { id: '15', title: 'Junior Hershey/Dorney Trip', date: new Date(2026, 6, 28), location: '', tags: ['Field Trip', 'field-trip'], type: 'field-trip' },
        { id: '16', title: 'Franko Cup', date: new Date(2026, 6, 29), location: 'THC', tags: ['Sports', 'Football', 'Senior Girls'], type: 'sports' },
        { id: '17', title: 'Gordon Cup', date: new Date(2026, 6, 29), location: 'Timber Lake Camp', tags: ['Sports', 'Hockey'], type: 'sports' },
        { id: '18', title: 'Teen/CIT Cali Trip', date: new Date(2026, 6, 29), location: '', tags: ['Field Trip', 'field-trip'], type: 'field-trip' },
        { id: '19', title: 'Super Montreal Trip', date: new Date(2026, 6, 30), location: '', tags: ['Field Trip', 'field-trip'], type: 'field-trip' },
        { id: '20', title: 'Cubs Cup', date: new Date(2026, 7, 3), location: '', tags: ['Sports', 'Hockey', 'Freshmen B Boys'], type: 'sports' },
        { id: '21', title: 'Party Hardy- DJ - End of Year Bash', date: new Date(2026, 7, 12), location: '', tags: ['Special Event', 'evening-activity'], type: 'special-event', time: '7:00 - 22 PM' },
    ];

    // Options
    const divisions = ['All Divisions', 'Sports Academy', 'Field Trips', 'Special Events', 'Activities'];
    const timeOptions = ['All Times', 'Morning', 'Afternoon', 'Evening'];
    const locationTypes = ['Home & Away', 'Home', 'Away'];
    const sortOptions = ['Sort by Date', 'Sort by Name', 'Sort by Time', 'Sort by Location'];

    // Calendar functions
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Previous month days
        const prevMonth = new Date(year, month - 1, 0);
        const prevMonthDays = prevMonth.getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: prevMonthDays - i,
                isCurrentMonth: false,
                fullDate: new Date(year, month - 1, prevMonthDays - i)
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: i,
                isCurrentMonth: true,
                fullDate: new Date(year, month, i)
            });
        }

        // Next month days to fill the grid
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                date: i,
                isCurrentMonth: false,
                fullDate: new Date(year, month + 1, i)
            });
        }

        return days;
    };

    const navigateMonth = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            const today = new Date();
            setCurrentDate(today);
            setSelectedDate(today);
        } else {
            const newDate = new Date(currentDate);
            if (direction === 'prev') {
                newDate.setMonth(newDate.getMonth() - 1);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            setCurrentDate(newDate);
        }
    };

    const formatMonthYear = (date: Date) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const isSameDate = (date1: Date, date2: Date) => {
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    };

    const calendarDays = getDaysInMonth(currentDate);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Format date for event list
    const formatEventDate = (date: Date) => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
    };

    // Get event icon based on type
    const getEventIcon = (type: string) => {
        switch (type) {
            case 'sports':
                return 'trophy-outline';
            case 'field-trip':
                return 'people-outline';
            case 'special-event':
                return 'star-outline';
            default:
                return 'calendar-outline';
        }
    };

    // Get tag color
    const getTagStyle = (tag: string) => {
        if (tag === 'Sports') {
            return { backgroundColor: '#dbeafe', color: '#1e40af' };
        } else if (tag === 'Field Trip') {
            return { backgroundColor: '#dcfce7', color: '#166534' };
        } else if (tag === 'Special Event') {
            return { backgroundColor: '#f3e8ff', color: '#6b21a8' };
        } else if (tag.includes('Boys') || tag.includes('Girls') || tag.includes('Teen') || tag.includes('CIT') || tag.includes('Freshmen') || tag.includes('Junior') || tag.includes('Senior') || tag.includes('Cadet') || tag.includes('Super')) {
            return { backgroundColor: '#14b8a6', color: 'white' };
        } else {
            return { backgroundColor: 'white', color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border };
        }
    };

    // Filter events
    const filteredEvents = events.filter(event => {
        const matchesName = event.title.toLowerCase().includes(eventNameSearch.toLowerCase());
        const matchesLocation = event.location.toLowerCase().includes(locationSearch.toLowerCase());
        return matchesName && matchesLocation;
    }).sort((a, b) => {
        if (sortBy === 'Sort by Date') {
            return a.date.getTime() - b.date.getTime();
        } else if (sortBy === 'Sort by Name') {
            return a.title.localeCompare(b.title);
        } else if (sortBy === 'Sort by Location') {
            return a.location.localeCompare(b.location);
        }
        return 0;
    });

    // Group events by month
    const groupedEvents = filteredEvents.reduce((acc, event) => {
        const monthKey = `${event.date.getFullYear()}-${event.date.getMonth()}`;
        if (!acc[monthKey]) {
            acc[monthKey] = [];
        }
        acc[monthKey].push(event);
        return acc;
    }, {} as Record<string, Event[]>);

    const formatMonthHeader = (year: number, month: number) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[month]} ${year}`;
    };

    // Get week days for Week view
    const getWeekDays = (date: Date) => {
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day; // Get Monday
        weekStart.setDate(diff);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + i);
            days.push(dayDate);
        }
        return days;
    };

    // Get events for a specific date
    const getEventsForDate = (date: Date) => {
        return filteredEvents.filter(event => isSameDate(event.date, date));
    };

    // Get events for week
    const getWeekEvents = () => {
        const weekDays = getWeekDays(currentDate);
        const weekEvents: { [key: string]: Event[] } = {};
        weekDays.forEach(day => {
            const dayKey = `${day.getDate()}-${day.getMonth()}-${day.getFullYear()}`;
            weekEvents[dayKey] = getEventsForDate(day);
        });
        return { weekDays, weekEvents };
    };

    // Format time for display
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    // Get agenda events (sorted by date and time)
    const getAgendaEvents = () => {
        return filteredEvents.sort((a, b) => {
            const dateCompare = a.date.getTime() - b.date.getTime();
            if (dateCompare !== 0) return dateCompare;
            return (a.time || '').localeCompare(b.time || '');
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Title and Description Section */}
                <View style={styles.titleSection}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Master Calendar</Text>
                        <Text style={styles.subtitle}>Consolidated view of all events and activities for The Nest</Text>
                    </View>
                    <View style={styles.titleRight}>
                        <TouchableOpacity
                            style={styles.calendarIcon}
                            onPress={() => setShowEventList(false)}
                        >
                            <Ionicons name="calendar" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowEventList(!showEventList)}>
                            <Ionicons name="menu" size={28} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search and Filter Section */}
                <StyledCard style={styles.filterCard}>
                    <View style={styles.filterRow}>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by event name..."
                                placeholderTextColor={theme.colors.textSecondary}
                                value={eventNameSearch}
                                onChangeText={setEventNameSearch}
                            />
                        </View>
                    </View>

                    <View style={styles.filterRow}>
                        <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by location..."
                                placeholderTextColor={theme.colors.textSecondary}
                                value={locationSearch}
                                onChangeText={setLocationSearch}
                            />
                        </View>
                    </View>

                    <View style={styles.filterRow}>
                        <TouchableOpacity
                            style={styles.dropdownContainer}
                            onPress={() => setShowDivisionPicker(true)}
                        >
                            <Text style={styles.dropdownText}>{selectedDivision}</Text>
                            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dropdownContainer}
                            onPress={() => setShowTimePicker(true)}
                        >
                            <Text style={styles.dropdownText}>{selectedTime}</Text>
                            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.filterRow}>
                        <TouchableOpacity
                            style={styles.dropdownContainer}
                            onPress={() => setShowLocationTypePicker(true)}
                        >
                            <Text style={styles.dropdownText}>{selectedLocationType}</Text>
                            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dropdownContainer}
                            onPress={() => setShowSortPicker(true)}
                        >
                            <Text style={styles.dropdownText}>{sortBy}</Text>
                            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </StyledCard>

                {/* Event List View */}
                {showEventList ? (
                    <View style={styles.eventListView}>
                        {Object.entries(groupedEvents).map(([monthKey, monthEvents]) => {
                            const [year, month] = monthKey.split('-').map(Number);
                            return (
                                <View key={monthKey}>
                                    <Text style={styles.monthHeader}>{formatMonthHeader(year, month)}</Text>
                                    {monthEvents.map((event) => (
                                        <StyledCard key={event.id} style={styles.eventCard}>
                                            <View style={styles.eventIconContainer}>
                                                <Ionicons
                                                    name={getEventIcon(event.type)}
                                                    size={24}
                                                    color={theme.colors.textSecondary}
                                                />
                                            </View>
                                            <View style={styles.eventContent}>
                                                <Text style={styles.eventTitle}>{event.title}</Text>
                                                <Text style={styles.eventDate}>{formatEventDate(event.date)}</Text>
                                                {event.time && (
                                                    <View style={styles.eventTimeContainer}>
                                                        <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                                                        <Text style={styles.eventTime}>{event.time}</Text>
                                                    </View>
                                                )}
                                                <View style={styles.eventTags}>
                                                    {event.tags.map((tag, index) => {
                                                        const tagStyle = getTagStyle(tag);
                                                        return (
                                                            <View
                                                                key={index}
                                                                style={[styles.eventTag, tagStyle]}
                                                            >
                                                                <Text style={[styles.eventTagText, { color: tagStyle.color }]}>
                                                                    {tag}
                                                                </Text>
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                                {event.location && (
                                                    <View style={styles.eventLocation}>
                                                        <Ionicons name="location" size={14} color="#ef4444" />
                                                        <Text style={styles.eventLocationText}>{event.location}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </StyledCard>
                                    ))}
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    /* Calendar Section */
                    <StyledCard style={styles.calendarCard}>
                        {/* Navigation Buttons */}
                        <View style={styles.calendarNav}>
                            <TouchableOpacity
                                style={styles.navButton}
                                onPress={() => navigateMonth('today')}
                            >
                                <Text style={styles.navButtonText}>Today</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.navButton}
                                onPress={() => navigateMonth('prev')}
                            >
                                <Text style={styles.navButtonText}>Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.navButton}
                                onPress={() => navigateMonth('next')}
                            >
                                <Text style={styles.navButtonText}>Next</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Month and Year */}
                        <Text style={styles.monthYear}>{formatMonthYear(currentDate)}</Text>

                        {/* View Tabs */}
                        <View style={styles.viewTabs}>
                            {['Month', 'Week', 'Day', 'Agenda'].map((view) => (
                                <TouchableOpacity
                                    key={view}
                                    style={[
                                        styles.viewTab,
                                        activeView === view && styles.viewTabActive
                                    ]}
                                    onPress={() => setActiveView(view)}
                                >
                                    <Text style={[
                                        styles.viewTabText,
                                        activeView === view && styles.viewTabTextActive
                                    ]}>
                                        {view}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Conditional View Rendering */}
                        {activeView === 'Month' && (
                            <View style={styles.calendarGrid}>
                                {/* Week Day Headers */}
                                <View style={styles.weekHeader}>
                                    {weekDays.map((day) => (
                                        <View key={day} style={styles.weekDayHeader}>
                                            <Text style={styles.weekDayText}>{day}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Calendar Days */}
                                <View style={styles.daysGrid}>
                                    {calendarDays.map((day, index) => {
                                        const isSelected = isSameDate(day.fullDate, selectedDate);
                                        const isToday = isSameDate(day.fullDate, new Date());
                                        const dayEvents = getEventsForDate(day.fullDate);

                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                style={[
                                                    styles.dayCell,
                                                    !day.isCurrentMonth && styles.dayCellOtherMonth,
                                                    isSelected && styles.dayCellSelected
                                                ]}
                                                onPress={() => {
                                                    setSelectedDate(day.fullDate);
                                                    if (!day.isCurrentMonth) {
                                                        setCurrentDate(day.fullDate);
                                                    }
                                                }}
                                            >
                                                <Text style={[
                                                    styles.dayText,
                                                    !day.isCurrentMonth && styles.dayTextOtherMonth,
                                                    isSelected && styles.dayTextSelected,
                                                    isToday && !isSelected && styles.dayTextToday
                                                ]}>
                                                    {day.date}
                                                </Text>
                                                {/* Event indicator dot */}
                                                {dayEvents.length > 0 && day.isCurrentMonth && (
                                                    <View style={styles.eventDot} />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {activeView === 'Week' && (() => {
                            const { weekDays: weekDaysList, weekEvents } = getWeekEvents();
                            return (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={styles.weekViewContainer}>
                                        {weekDaysList.map((day, index) => {
                                            const dayEvents = weekEvents[`${day.getDate()}-${day.getMonth()}-${day.getFullYear()}`] || [];
                                            const isSelected = isSameDate(day, selectedDate);
                                            const isToday = isSameDate(day, new Date());

                                            return (
                                                <View key={index} style={styles.weekDayColumn}>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.weekDayHeaderCell,
                                                            isSelected && styles.weekDayHeaderCellSelected,
                                                            isToday && !isSelected && styles.weekDayHeaderCellToday
                                                        ]}
                                                        onPress={() => setSelectedDate(day)}
                                                    >
                                                        <Text style={styles.weekDayName}>{weekDays[day.getDay()]}</Text>
                                                        <Text style={[
                                                            styles.weekDayNumber,
                                                            isSelected && styles.weekDayNumberSelected
                                                        ]}>
                                                            {day.getDate()}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <ScrollView style={styles.weekEventsList}>
                                                        {dayEvents.map(event => (
                                                            <TouchableOpacity key={event.id} style={styles.weekEventItem}>
                                                                <Text style={styles.weekEventTime}>
                                                                    {event.time || formatTime(event.date)}
                                                                </Text>
                                                                <Text style={styles.weekEventTitle}>{event.title}</Text>
                                                                {event.location && (
                                                                    <Text style={styles.weekEventLocation}>{event.location}</Text>
                                                                )}
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </ScrollView>
                            );
                        })()}

                        {activeView === 'Day' && (() => {
                            const dayEvents = getEventsForDate(selectedDate);
                            return (
                                <View style={styles.dayViewContainer}>
                                    <View style={styles.dayHeader}>
                                        <Text style={styles.dayHeaderDate}>
                                            {formatEventDate(selectedDate)}
                                        </Text>
                                        <Text style={styles.dayHeaderYear}>
                                            {selectedDate.getFullYear()}
                                        </Text>
                                    </View>
                                    <ScrollView style={styles.dayEventsList}>
                                        {dayEvents.length > 0 ? (
                                            dayEvents.map(event => (
                                                <StyledCard key={event.id} style={styles.dayEventCard}>
                                                    <View style={styles.dayEventHeader}>
                                                        <Text style={styles.dayEventTime}>
                                                            {event.time || formatTime(event.date)}
                                                        </Text>
                                                        <Ionicons
                                                            name={getEventIcon(event.type)}
                                                            size={20}
                                                            color={theme.colors.secondary}
                                                        />
                                                    </View>
                                                    <Text style={styles.dayEventTitle}>{event.title}</Text>
                                                    {event.location && (
                                                        <View style={styles.dayEventLocation}>
                                                            <Ionicons name="location" size={14} color="#ef4444" />
                                                            <Text style={styles.dayEventLocationText}>{event.location}</Text>
                                                        </View>
                                                    )}
                                                    {event.tags && event.tags.length > 0 && (
                                                        <View style={styles.dayEventTags}>
                                                            {event.tags.map((tag, idx) => {
                                                                const tagStyle = getTagStyle(tag);
                                                                return (
                                                                    <View key={idx} style={[styles.dayEventTag, tagStyle]}>
                                                                        <Text style={[styles.dayEventTagText, { color: tagStyle.color }]}>
                                                                            {tag}
                                                                        </Text>
                                                                    </View>
                                                                );
                                                            })}
                                                        </View>
                                                    )}
                                                </StyledCard>
                                            ))
                                        ) : (
                                            <View style={styles.emptyDayState}>
                                                <Text style={styles.emptyDayText}>No events scheduled for this day</Text>
                                            </View>
                                        )}
                                    </ScrollView>
                                </View>
                            );
                        })()}

                        {activeView === 'Agenda' && (
                            <ScrollView style={styles.agendaViewContainer}>
                                {getAgendaEvents().length > 0 ? (
                                    getAgendaEvents().map(event => (
                                        <StyledCard key={event.id} style={styles.agendaEventCard}>
                                            <View style={styles.agendaEventDate}>
                                                <Text style={styles.agendaEventDay}>{event.date.getDate()}</Text>
                                                <Text style={styles.agendaEventMonth}>
                                                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][event.date.getMonth()]}
                                                </Text>
                                            </View>
                                            <View style={styles.agendaEventContent}>
                                                <View style={styles.agendaEventHeader}>
                                                    <Text style={styles.agendaEventTime}>
                                                        {event.time || formatTime(event.date)}
                                                    </Text>
                                                    <Ionicons
                                                        name={getEventIcon(event.type)}
                                                        size={18}
                                                        color={theme.colors.secondary}
                                                    />
                                                </View>
                                                <Text style={styles.agendaEventTitle}>{event.title}</Text>
                                                {event.location && (
                                                    <View style={styles.agendaEventLocation}>
                                                        <Ionicons name="location" size={12} color="#ef4444" />
                                                        <Text style={styles.agendaEventLocationText}>{event.location}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </StyledCard>
                                    ))
                                ) : (
                                    <View style={styles.emptyAgendaState}>
                                        <Text style={styles.emptyAgendaText}>No events found</Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </StyledCard>
                )}

            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="chatbubble" size={24} color="white" />
            </TouchableOpacity>

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
                        <View style={styles.pickerContent}>
                            {divisions.map((division) => (
                                <TouchableOpacity
                                    key={division}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        setSelectedDivision(division);
                                        setShowDivisionPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{division}</Text>
                                    {selectedDivision === division && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Time Picker Modal */}
            <Modal
                visible={showTimePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowTimePicker(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowTimePicker(false)}>
                    <Pressable style={styles.pickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Time</Text>
                            <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.pickerContent}>
                            {timeOptions.map((time) => (
                                <TouchableOpacity
                                    key={time}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        setSelectedTime(time);
                                        setShowTimePicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{time}</Text>
                                    {selectedTime === time && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Location Type Picker Modal */}
            <Modal
                visible={showLocationTypePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowLocationTypePicker(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowLocationTypePicker(false)}>
                    <Pressable style={styles.pickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Location Type</Text>
                            <TouchableOpacity onPress={() => setShowLocationTypePicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.pickerContent}>
                            {locationTypes.map((location) => (
                                <TouchableOpacity
                                    key={location}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        setSelectedLocationType(location);
                                        setShowLocationTypePicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{location}</Text>
                                    {selectedLocationType === location && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Sort Picker Modal */}
            <Modal
                visible={showSortPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSortPicker(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowSortPicker(false)}>
                    <Pressable style={styles.pickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Sort By</Text>
                            <TouchableOpacity onPress={() => setShowSortPicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.pickerContent}>
                            {sortOptions.map((sort) => (
                                <TouchableOpacity
                                    key={sort}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        setSortBy(sort);
                                        setShowSortPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{sort}</Text>
                                    {sortBy === sort && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
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
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    titleSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.lg,
        flexWrap: 'wrap',
    },
    titleContainer: {
        flex: 1,
        minWidth: '50%',
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
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    titleRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    calendarIcon: {
        width: 40,
        height: 40,
        backgroundColor: theme.colors.accent,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    filterRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
    },
    searchIcon: {
        marginRight: theme.spacing.xs,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    dropdownContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
    },
    dropdownText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    calendarCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
    },
    calendarNav: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    navButton: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    navButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    monthYear: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
        textAlign: 'center',
    },
    viewTabs: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: theme.borderRadius.md,
        padding: 4,
        marginBottom: theme.spacing.md,
    },
    viewTab: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
        borderRadius: theme.borderRadius.sm,
    },
    viewTabActive: {
        backgroundColor: theme.colors.surface,
    },
    viewTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    viewTabTextActive: {
        color: theme.colors.text,
    },
    calendarGrid: {
        marginTop: theme.spacing.sm,
    },
    weekHeader: {
        flexDirection: 'row',
        marginBottom: theme.spacing.xs,
    },
    weekDayHeader: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
    },
    weekDayText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.xs,
        position: 'relative',
    },
    dayCellOtherMonth: {
        opacity: 0.4,
    },
    dayCellSelected: {
        backgroundColor: '#dbeafe',
        borderRadius: theme.borderRadius.md,
    },
    dayText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    dayTextOtherMonth: {
        color: theme.colors.textSecondary,
    },
    dayTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '700',
    },
    dayTextToday: {
        fontWeight: '700',
    },
    eventDot: {
        position: 'absolute',
        bottom: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.secondary,
    },
    fab: {
        position: 'absolute',
        bottom: theme.spacing.xl,
        right: theme.spacing.xl,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.card,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    // Picker Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    pickerModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '50%',
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
        color: theme.colors.text,
    },
    pickerContent: {
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
    },
    pickerOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    pickerOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },
    // Event List Styles
    eventListView: {
        gap: theme.spacing.md,
    },
    monthHeader: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
    },
    eventCard: {
        flexDirection: 'row',
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.card,
    },
    eventIconContainer: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
    },
    eventContent: {
        flex: 1,
    },
    eventTitle: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    eventDate: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    eventTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
    },
    eventTime: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    eventTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
    },
    eventTag: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
    },
    eventTagText: {
        fontSize: 12,
        fontWeight: '500',
    },
    eventLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginTop: theme.spacing.xs,
    },
    eventLocationText: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.text,
    },
    // Week View Styles
    weekViewContainer: {
        flexDirection: 'row',
        minHeight: 400,
    },
    weekDayColumn: {
        width: 120,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
        paddingHorizontal: theme.spacing.sm,
    },
    weekDayHeaderCell: {
        padding: theme.spacing.sm,
        alignItems: 'center',
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
    },
    weekDayHeaderCellSelected: {
        backgroundColor: theme.colors.secondary,
    },
    weekDayHeaderCellToday: {
        backgroundColor: '#FFA500',
    },
    weekDayName: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    weekDayNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    weekDayNumberSelected: {
        color: 'white',
    },
    weekEventsList: {
        flex: 1,
    },
    weekEventItem: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.sm,
        padding: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.secondary,
    },
    weekEventTime: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    weekEventTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
    },
    weekEventLocation: {
        fontSize: 10,
        color: theme.colors.textSecondary,
    },
    // Day View Styles
    dayViewContainer: {
        marginTop: theme.spacing.md,
    },
    dayHeader: {
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dayHeaderDate: {
        ...theme.typography.h1,
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.text,
    },
    dayHeaderYear: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    dayEventsList: {
        maxHeight: 500,
    },
    dayEventCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    dayEventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    dayEventTime: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.secondary,
    },
    dayEventTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    dayEventLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.sm,
    },
    dayEventLocationText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    dayEventTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
    },
    dayEventTag: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
    },
    dayEventTagText: {
        fontSize: 12,
        fontWeight: '500',
    },
    emptyDayState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
    },
    emptyDayText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    // Agenda View Styles
    agendaViewContainer: {
        marginTop: theme.spacing.md,
        maxHeight: 500,
    },
    agendaEventCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    agendaEventDate: {
        width: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
        paddingRight: theme.spacing.md,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
    },
    agendaEventDay: {
        ...theme.typography.h2,
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
    },
    agendaEventMonth: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
    },
    agendaEventContent: {
        flex: 1,
    },
    agendaEventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    agendaEventTime: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    agendaEventTitle: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    agendaEventLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    agendaEventLocationText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    emptyAgendaState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
    },
    emptyAgendaText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
});
