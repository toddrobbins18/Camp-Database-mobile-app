import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { useCalendarEvents, useDivisions, type CalendarEvent, type EventSource } from '../api/calendar_events';

interface Event {
    id: string;
    title: string;
    date: Date;
    location: string;
    tags: string[];
    type: string;
    time?: string;
    source?: EventSource;
    divisionName?: string;
    description?: string;
    home_away?: string;
    originalData?: any;
}

// Time-of-day from time string (for filter): morning 6-12, afternoon 12-17, evening 17-21, else night
function getTimeOfDayFromTime(timeStr?: string): string {
    if (!timeStr || typeof timeStr !== 'string') return 'unknown';
    const trimmed = timeStr.trim();
    const match = trimmed.match(/(\d{1,2})(?::\d{2})?\s*(am|pm)?/i);
    if (!match) return 'unknown';
    let hour = parseInt(match[1], 10);
    const ampm = (match[2] || '').toLowerCase();
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    if (!ampm && hour <= 23 && hour >= 0) { /* 24h */ }
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

// Format time for display (e.g. "9:00 AM")
function formatTime12Hour(timeStr?: string): string {
    if (!timeStr || typeof timeStr !== 'string') return '';
    const t = timeStr.trim();
    const m = t.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (!m) return t;
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const ampm = (m[3] || '').toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (!ampm && h >= 0 && h <= 23) { /* 24h */ } else if (!ampm) { if (h >= 12) { h -= 12; } }
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(min).padStart(2, '0')} ${period}`;
}

export const CalendarScreen = ({ navigation }: any) => {
    const ZOOM_BAR_WIDTH = 120;
    const ZOOM_THUMB_SIZE = 16;
    const { height: viewportHeight } = useWindowDimensions();
    const { companyId, season } = useCompany();
    const { data: liveEvents = [], isLoading: isLoadingEvents } = useCalendarEvents(companyId, season || '2026');
    const { data: divisionsList = [] } = useDivisions(companyId);
    const [activeView, setActiveView] = useState('Month');
    const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1));
    const [selectedDate, setSelectedDate] = useState(new Date(2026, 6, 1));
    const [showEventList, setShowEventList] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    // Search and filter states (values match web: all, division id, morning/afternoon/evening/night, home/away/neutral)
    const [eventNameSearch, setEventNameSearch] = useState('');
    const [locationSearch, setLocationSearch] = useState('');
    const [selectedDivision, setSelectedDivision] = useState<string>('all');
    const [selectedTime, setSelectedTime] = useState<string>('all');
    const [selectedLocationType, setSelectedLocationType] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('date');

    // Picker modals
    const [showDivisionPicker, setShowDivisionPicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showLocationTypePicker, setShowLocationTypePicker] = useState(false);
    const [showSortPicker, setShowSortPicker] = useState(false);
    const [calendarZoomOffset, setCalendarZoomOffset] = useState(0);
    const [zoomBarWidth, setZoomBarWidth] = useState(ZOOM_BAR_WIDTH);

    // Options for dropdowns (labels and values)
    const timeOptions: { label: string; value: string }[] = [
        { label: 'All Times', value: 'all' },
        { label: 'Morning', value: 'morning' },
        { label: 'Afternoon', value: 'afternoon' },
        { label: 'Evening', value: 'evening' },
        { label: 'Night', value: 'night' },
    ];
    const locationTypes: { label: string; value: string }[] = [
        { label: 'Home & Away', value: 'all' },
        { label: 'Home', value: 'home' },
        { label: 'Away', value: 'away' },
        { label: 'Neutral', value: 'neutral' },
    ];
    const sortOptions: { label: string; value: string }[] = [
        { label: 'Sort by Date', value: 'date' },
        { label: 'Sort by Division', value: 'division' },
        { label: 'Sort by Source', value: 'source' },
    ];

    const minCalendarHeight = 320;
    const maxCalendarHeight = 900;
    const autoCalendarHeight = useMemo(() => {
        const available = viewportHeight - 380;
        return Math.max(minCalendarHeight, Math.min(maxCalendarHeight, available));
    }, [viewportHeight]);
    const effectiveCalendarHeight = Math.max(
        minCalendarHeight,
        Math.min(maxCalendarHeight, autoCalendarHeight + calendarZoomOffset)
    );
    const monthGridHeight = Math.max(240, effectiveCalendarHeight - 48);
    const monthCellHeight = Math.max(34, Math.floor(monthGridHeight / 6) - 6);

    const handleZoomOut = () => {
        setCalendarZoomOffset((prev) => Math.max(prev - 80, minCalendarHeight - autoCalendarHeight));
    };
    const handleZoomIn = () => {
        setCalendarZoomOffset((prev) => Math.min(prev + 80, maxCalendarHeight - autoCalendarHeight));
    };
    const handleAutoAdjust = () => {
        setCalendarZoomOffset(0);
    };

    const setZoomFromRatio = (ratio: number) => {
        const safeRatio = Number.isFinite(ratio) ? ratio : 0;
        const clamped = Math.max(0, Math.min(1, safeRatio));
        const targetHeight = minCalendarHeight + clamped * (maxCalendarHeight - minCalendarHeight);
        const nextOffset = targetHeight - autoCalendarHeight;
        setCalendarZoomOffset(Number.isFinite(nextOffset) ? nextOffset : 0);
    };

    const zoomRatio = (effectiveCalendarHeight - minCalendarHeight) / (maxCalendarHeight - minCalendarHeight);
    const isDraggingZoomRef = useRef(false);

    // Map CalendarEvent[] to Event[] and apply filters/sort (aligned with web)
    const filteredAndSorted: CalendarEvent[] = liveEvents
        .filter((event: CalendarEvent) => {
            if (selectedDivision !== 'all' && event.divisionId !== selectedDivision) return false;
            if (eventNameSearch && !event.title.toLowerCase().includes(eventNameSearch.toLowerCase())) return false;
            if (locationSearch && (!event.location || !event.location.toLowerCase().includes(locationSearch.toLowerCase()))) return false;
            if (selectedTime !== 'all') {
                const eventTimeOfDay = getTimeOfDayFromTime(event.time);
                if (eventTimeOfDay !== selectedTime) return false;
            }
            if (selectedLocationType !== 'all' && event.source === 'sports_calendar') {
                if ((event.home_away || '') !== selectedLocationType) return false;
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'division') {
                const na = a.divisionName || '';
                const nb = b.divisionName || '';
                return na.localeCompare(nb);
            }
            if (sortBy === 'source') return a.source.localeCompare(b.source);
            const da = new Date(a.date + 'T00:00:00').getTime();
            const db = new Date(b.date + 'T00:00:00').getTime();
            if (da !== db) return da - db;
            return (a.time || '').localeCompare(b.time || '');
        });

    const events: Event[] = filteredAndSorted.map((e: CalendarEvent) => ({
        id: e.id,
        title: e.title,
        date: new Date(e.date + 'T00:00:00'),
        location: e.location || '',
        tags: e.tags || [],
        type: e.type,
        time: e.time,
        source: e.source,
        divisionName: e.divisionName,
        description: e.description,
        home_away: e.home_away,
        originalData: e.originalData,
    }));

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

    // Get event icon and label by source (match web)
    const getSourceIcon = (source: EventSource) => {
        switch (source) {
            case 'sports_calendar': return 'trophy-outline';
            case 'activities_field_trips': return 'people-outline';
            case 'special_events_activities': return 'star-outline';
            default: return 'calendar-outline';
        }
    };
    const getSourceLabel = (source: EventSource) => {
        switch (source) {
            case 'sports_calendar': return 'Sports';
            case 'activities_field_trips': return 'Field Trip';
            case 'special_events_activities': return 'Special Event';
            default: return 'Event';
        }
    };
    const getEventIcon = (type: string) => {
        if (type === 'sports' || type === 'field-trip' || type === 'special-event') {
            return type === 'sports' ? 'trophy-outline' : type === 'field-trip' ? 'people-outline' : 'star-outline';
        }
        return 'calendar-outline';
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

    // Group events by month (events already filtered and sorted above)
    const groupedEvents = events.reduce((acc, event) => {
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
        return events.filter(event => isSameDate(event.date, date));
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
        return [...events].sort((a, b) => {
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
                            <Text style={styles.dropdownText} numberOfLines={1}>
                                {selectedDivision === 'all' ? 'All Divisions' : (divisionsList.find(d => d.id === selectedDivision)?.name || 'All Divisions')}
                            </Text>
                            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dropdownContainer}
                            onPress={() => setShowTimePicker(true)}
                        >
                            <Text style={styles.dropdownText}>{timeOptions.find(o => o.value === selectedTime)?.label || 'All Times'}</Text>
                            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.filterRow}>
                        <TouchableOpacity
                            style={styles.dropdownContainer}
                            onPress={() => setShowLocationTypePicker(true)}
                        >
                            <Text style={styles.dropdownText}>{locationTypes.find(o => o.value === selectedLocationType)?.label || 'Home & Away'}</Text>
                            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dropdownContainer}
                            onPress={() => setShowSortPicker(true)}
                        >
                            <Text style={styles.dropdownText}>{sortOptions.find(o => o.value === sortBy)?.label || 'Sort by Date'}</Text>
                            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </StyledCard>

                {/* Event List View (match web: icon, title, date, source/type/division badges, time, location, description) */}
                {showEventList ? (
                    <View style={styles.eventListView}>
                        {events.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No events match your filters</Text>
                            </View>
                        ) : Object.entries(groupedEvents).map(([monthKey, monthEvents]) => {
                            const [year, month] = monthKey.split('-').map(Number);
                            return (
                                <View key={monthKey}>
                                    <Text style={styles.monthHeader}>{formatMonthHeader(year, month)}</Text>
                                    {monthEvents.map((event) => {
                                        const calEvent = filteredAndSorted.find(e => e.id === event.id);
                                        return (
                                            <TouchableOpacity
                                                key={event.id}
                                                activeOpacity={0.8}
                                                onPress={() => calEvent && setSelectedEvent(calEvent)}
                                            >
                                                <StyledCard style={styles.eventCard}>
                                                    <View style={styles.eventCardHeader}>
                                                        <View style={styles.eventIconContainer}>
                                                            <Ionicons
                                                                name={getSourceIcon(event.source!)}
                                                                size={22}
                                                                color={theme.colors.text}
                                                            />
                                                        </View>
                                                        <View style={styles.eventContent}>
                                                            <Text style={styles.eventTitle}>{event.title}</Text>
                                                            <Text style={styles.eventDate}>{formatEventDate(event.date)}</Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.eventCardBadges}>
                                                        <View style={[styles.eventTag, styles.eventTagSource]}>
                                                            <Text style={styles.eventTagSourceText}>{getSourceLabel(event.source!)}</Text>
                                                        </View>
                                                        <View style={[styles.eventTag, styles.eventTagOutline]}>
                                                            <Text style={styles.eventTagText}>{event.type}</Text>
                                                        </View>
                                                        {event.divisionName ? (
                                                            <View style={[styles.eventTag, styles.eventTagDivision]}>
                                                                <Text style={styles.eventTagDivisionText}>{event.divisionName}</Text>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                    {event.time ? (
                                                        <View style={styles.eventMetaRow}>
                                                            <Ionicons name="time-outline" size={14} color="#92400e" />
                                                            <Text style={styles.eventMetaText}>{formatTime12Hour(event.time)}</Text>
                                                        </View>
                                                    ) : null}
                                                    {event.location ? (
                                                        <View style={styles.eventMetaRow}>
                                                            <Ionicons name="location-outline" size={14} color="#ef4444" />
                                                            <Text style={styles.eventMetaText}>{event.location}</Text>
                                                        </View>
                                                    ) : null}
                                                    {event.description ? (
                                                        <Text style={styles.eventDescription} numberOfLines={2}>{event.description}</Text>
                                                    ) : null}
                                                </StyledCard>
                                            </TouchableOpacity>
                                        );
                                    })}
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

                        <View style={styles.zoomControlsRow}>
                            <TouchableOpacity style={styles.zoomControlButton} onPress={handleZoomOut}>
                                <Ionicons name="remove" size={16} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Pressable
                                style={[styles.zoomBarTrack, { width: ZOOM_BAR_WIDTH }]}
                                onLayout={(e) => {
                                    const w = e.nativeEvent.layout.width;
                                    if (Number.isFinite(w) && w > 0) setZoomBarWidth(w);
                                }}
                                onPress={(event) => {
                                    const tappedX = event.nativeEvent.locationX;
                                    setZoomFromRatio(tappedX / zoomBarWidth);
                                }}
                                onStartShouldSetResponder={() => true}
                                onMoveShouldSetResponder={() => true}
                                onResponderGrant={(event) => {
                                    isDraggingZoomRef.current = true;
                                    const x = event.nativeEvent.locationX;
                                    setZoomFromRatio(x / zoomBarWidth);
                                }}
                                onResponderMove={(event) => {
                                    if (!isDraggingZoomRef.current) return;
                                    const x = event.nativeEvent.locationX;
                                    setZoomFromRatio(x / zoomBarWidth);
                                }}
                                onResponderRelease={() => {
                                    isDraggingZoomRef.current = false;
                                }}
                                onResponderTerminate={() => {
                                    isDraggingZoomRef.current = false;
                                }}
                            >
                                <View
                                    style={[
                                        styles.zoomBarFill,
                                        {
                                            width: `${zoomRatio * 100}%`,
                                        },
                                    ]}
                                />
                                <View
                                    style={[
                                        styles.zoomBarThumb,
                                        {
                                            left: zoomRatio * (zoomBarWidth - ZOOM_THUMB_SIZE),
                                        },
                                    ]}
                                />
                            </Pressable>
                            <TouchableOpacity style={styles.zoomControlButton} onPress={handleZoomIn}>
                                <Ionicons name="add" size={16} color={theme.colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.zoomControlButton} onPress={handleAutoAdjust}>
                                <Ionicons name="expand-outline" size={16} color={theme.colors.text} />
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
                            <View style={[styles.calendarGrid, { height: effectiveCalendarHeight }]}>
                                {/* Week Day Headers */}
                                <View style={styles.weekHeader}>
                                    {weekDays.map((day) => (
                                        <View key={day} style={styles.weekDayHeader}>
                                            <Text style={styles.weekDayText}>{day}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Calendar Days */}
                                <View style={[styles.daysGrid, { height: monthGridHeight }]}>
                                    {calendarDays.map((day, index) => {
                                        const isSelected = isSameDate(day.fullDate, selectedDate);
                                        const isToday = isSameDate(day.fullDate, new Date());
                                        const dayEvents = getEventsForDate(day.fullDate);

                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                style={[
                                                    styles.dayCell,
                                                    { height: monthCellHeight },
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
                                                    <ScrollView style={[styles.weekEventsList, { maxHeight: Math.max(220, effectiveCalendarHeight - 80) }]}>
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
                                    <ScrollView style={[styles.dayEventsList, { maxHeight: effectiveCalendarHeight }]}>
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
                            <ScrollView style={[styles.agendaViewContainer, { maxHeight: effectiveCalendarHeight }]}>
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
                            <TouchableOpacity
                                style={[styles.pickerOption, selectedDivision === 'all' && styles.pickerOptionActive]}
                                onPress={() => { setSelectedDivision('all'); setShowDivisionPicker(false); }}
                            >
                                <Text style={[styles.pickerOptionText, selectedDivision === 'all' && styles.pickerOptionTextActive]}>All Divisions</Text>
                                {selectedDivision === 'all' && <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />}
                            </TouchableOpacity>
                            {divisionsList.map((div) => (
                                <TouchableOpacity
                                    key={div.id}
                                    style={[styles.pickerOption, selectedDivision === div.id && styles.pickerOptionActive]}
                                    onPress={() => { setSelectedDivision(div.id); setShowDivisionPicker(false); }}
                                >
                                    <Text style={[styles.pickerOptionText, selectedDivision === div.id && styles.pickerOptionTextActive]}>{div.name}</Text>
                                    {selectedDivision === div.id && <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />}
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
                            {timeOptions.map((o) => (
                                <TouchableOpacity
                                    key={o.value}
                                    style={[styles.pickerOption, selectedTime === o.value && styles.pickerOptionActive]}
                                    onPress={() => { setSelectedTime(o.value); setShowTimePicker(false); }}
                                >
                                    <Text style={[styles.pickerOptionText, selectedTime === o.value && styles.pickerOptionTextActive]}>{o.label}</Text>
                                    {selectedTime === o.value && <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />}
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
                            {locationTypes.map((o) => (
                                <TouchableOpacity
                                    key={o.value}
                                    style={[styles.pickerOption, selectedLocationType === o.value && styles.pickerOptionActive]}
                                    onPress={() => { setSelectedLocationType(o.value); setShowLocationTypePicker(false); }}
                                >
                                    <Text style={[styles.pickerOptionText, selectedLocationType === o.value && styles.pickerOptionTextActive]}>{o.label}</Text>
                                    {selectedLocationType === o.value && <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />}
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
                            {sortOptions.map((o) => (
                                <TouchableOpacity
                                    key={o.value}
                                    style={[styles.pickerOption, sortBy === o.value && styles.pickerOptionActive]}
                                    onPress={() => { setSortBy(o.value); setShowSortPicker(false); }}
                                >
                                    <Text style={[styles.pickerOptionText, sortBy === o.value && styles.pickerOptionTextActive]}>{o.label}</Text>
                                    {sortBy === o.value && <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Event Detail Modal (match web: title, badges, division, date, time, location, home/away, description) */}
            <Modal
                visible={!!selectedEvent}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedEvent(null)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setSelectedEvent(null)}>
                    <Pressable style={styles.eventDetailModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.eventDetailHeader}>
                            <View style={styles.eventDetailTitleRow}>
                                <Ionicons name={getSourceIcon(selectedEvent?.source!)} size={24} color={theme.colors.text} />
                                <Text style={styles.eventDetailTitle}>{selectedEvent?.title}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.eventDetailScroll} showsVerticalScrollIndicator={false}>
                            <View style={styles.eventDetailBadges}>
                                <View style={[styles.eventTag, styles.eventTagSource]}>
                                    <Text style={styles.eventTagSourceText}>{selectedEvent && getSourceLabel(selectedEvent.source)}</Text>
                                </View>
                                <View style={[styles.eventTag, styles.eventTagOutline]}>
                                    <Text style={styles.eventTagText}>{selectedEvent?.type}</Text>
                                </View>
                            </View>
                            {(selectedEvent?.divisionName || (selectedEvent?.originalData?.divisions?.length > 0)) && (
                                <View style={styles.eventDetailRow}>
                                    <Ionicons name="people-outline" size={18} color={theme.colors.textSecondary} />
                                    <Text style={styles.eventDetailRowText}>
                                        {selectedEvent?.originalData?.divisions?.length > 0
                                            ? selectedEvent.originalData.divisions.map((d: any) => d.name).join(', ')
                                            : selectedEvent?.divisionName}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.eventDetailRow}>
                                <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
                                <Text style={styles.eventDetailRowText}>
                                    {selectedEvent?.date && new Date(selectedEvent.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                </Text>
                            </View>
                            {selectedEvent?.time && (
                                <View style={styles.eventDetailRow}>
                                    <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} />
                                    <Text style={styles.eventDetailRowText}>{formatTime12Hour(selectedEvent.time)}</Text>
                                </View>
                            )}
                            {selectedEvent?.location && (
                                <View style={styles.eventDetailRow}>
                                    <Ionicons name="location-outline" size={18} color={theme.colors.textSecondary} />
                                    <Text style={styles.eventDetailRowText}>{selectedEvent.location}</Text>
                                </View>
                            )}
                            {selectedEvent?.source === 'sports_calendar' && selectedEvent?.originalData?.home_away && (
                                <View style={styles.eventDetailRow}>
                                    <Ionicons name={selectedEvent.originalData.home_away === 'home' ? 'home-outline' : 'airplane-outline'} size={18} color={theme.colors.textSecondary} />
                                    <Text style={styles.eventDetailRowText}>{String(selectedEvent.originalData.home_away).charAt(0).toUpperCase() + String(selectedEvent.originalData.home_away).slice(1)}</Text>
                                </View>
                            )}
                            {selectedEvent?.source === 'sports_calendar' && selectedEvent?.originalData?.team && selectedEvent?.originalData?.opponent && (
                                <View style={styles.eventDetailVs}>
                                    <Text style={styles.eventDetailVsText}>{selectedEvent.originalData.team} vs {selectedEvent.originalData.opponent}</Text>
                                </View>
                            )}
                            {selectedEvent?.description && (
                                <View style={styles.eventDetailDescription}>
                                    <Text style={styles.eventDetailDescriptionText}>{selectedEvent.description}</Text>
                                </View>
                            )}
                        </ScrollView>
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
    zoomControlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.md,
    },
    zoomControlButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
    },
    zoomLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        minWidth: 56,
        textAlign: 'center',
    },
    zoomBarTrack: {
        height: 8,
        borderRadius: 999,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        position: 'relative',
        marginHorizontal: 2,
    },
    zoomBarFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#0ea5e9',
        borderRadius: 999,
    },
    zoomBarThumb: {
        position: 'absolute',
        width: 16,
        height: 16,
        top: -4,
        borderRadius: 8,
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderColor: theme.colors.secondary,
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
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    eventCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.sm,
    },
    eventIconContainer: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.sm,
    },
    eventContent: {
        flex: 1,
    },
    eventCardBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: theme.spacing.sm,
    },
    eventTagSource: {
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
    },
    eventTagSourceText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1e40af',
    },
    eventTagOutline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    eventTagDivision: {
        backgroundColor: '#14b8a6',
    },
    eventTagDivisionText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
    },
    eventMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    eventMetaText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    eventDescription: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
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
    eventDetailModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginHorizontal: theme.spacing.lg,
        maxHeight: '85%',
    },
    eventDetailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    eventDetailTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flex: 1,
    },
    eventDetailTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        flex: 1,
    },
    eventDetailScroll: {
        padding: theme.spacing.lg,
        maxHeight: 400,
    },
    eventDetailBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: theme.spacing.md,
    },
    eventDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    eventDetailRowText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    eventDetailVs: {
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
    },
    eventDetailVsText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    eventDetailDescription: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.md,
        marginTop: theme.spacing.sm,
    },
    eventDetailDescriptionText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
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
