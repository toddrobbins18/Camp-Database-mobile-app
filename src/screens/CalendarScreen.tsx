import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { useCalendarEvents, useDivisions, type CalendarEvent, type EventSource } from '../api/calendar_events';
import { UnifiedCalendar, type CalendarWidgetEvent } from '../components/UnifiedCalendar';

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
    if (t.toUpperCase().includes('AM') || t.toUpperCase().includes('PM')) {
      return t.toUpperCase();
    }
    const m = t.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (!m) return t;
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const ampm = (m[3] || '').toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(min).padStart(2, '0')} ${period}`;
}

export const CalendarScreen = ({ navigation }: any) => {
    const { companyId, season, companySlug, availableCompanies, isTimberLakeWest } = useCompany();
    const activeCompany = React.useMemo(
        () => availableCompanies.find((c) => c.id === companyId) ?? { slug: companySlug, name: isTimberLakeWest ? 'Timber Lake West' : undefined },
        [availableCompanies, companyId, companySlug, isTimberLakeWest],
    );
    const queryClient = useQueryClient();
    const { data: liveEvents = [], isLoading: isLoadingEvents } = useCalendarEvents(
        companyId,
        season || '2026',
        activeCompany,
    );
    const { data: divisionsList = [] } = useDivisions(companyId);

    useFocusEffect(
        useCallback(() => {
            if (!companyId) return;
            void queryClient.invalidateQueries({ queryKey: ['calendar_events', companyId] });
        }, [companyId, queryClient]),
    );
    const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1));
    const [selectedDate, setSelectedDate] = useState(new Date(2026, 6, 1));
    const [showEventList, setShowEventList] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    // Search and filter states
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

    // Options for dropdowns
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

    // Filter and sort events
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

    // Format date for event list
    const formatEventDate = (date: Date) => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
    };

    const getSourceIcon = (source: EventSource) => {
        switch (source) {
            case 'sports_calendar': return 'trophy-outline';
            case 'activities_field_trips': return 'people-outline';
            case 'special_events_activities': return 'star-outline';
            case 'tiger_times': return 'sparkles-outline';
            case 'daily_wolf': return 'newspaper-outline';
            default: return 'calendar-outline';
        }
    };
    const getSourceLabel = (source: EventSource) => {
        switch (source) {
            case 'sports_calendar': return 'Sports';
            case 'activities_field_trips': return 'Field Trip';
            case 'special_events_activities': return 'Special Event';
            case 'tiger_times': return 'Tiger Times';
            case 'daily_wolf': return 'Daily Wolf';
            default: return 'Event';
        }
    };

    const getDayAccent = (source?: EventSource) => {
        switch (source) {
            case 'sports_calendar':
                return { bg: '#dbeafe', text: '#1d4ed8', marker: '#2563eb' };
            case 'activities_field_trips':
                return { bg: '#dcfce7', text: '#166534', marker: '#16a34a' };
            case 'special_events_activities':
                return { bg: '#f3e8ff', text: '#7e22ce', marker: '#a855f7' };
            case 'tiger_times':
                return { bg: '#fef3c7', text: '#92400e', marker: '#f59e0b' };
            case 'daily_wolf':
                return { bg: '#e0f2fe', text: '#0369a1', marker: '#0ea5e9' };
            default:
                return { bg: '#e5e7eb', text: theme.colors.text, marker: theme.colors.secondary };
        }
    };

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

    // Map filtered events to CalendarWidget format
    const calendarWidgetEvents: CalendarWidgetEvent[] = filteredAndSorted.map((e) => ({
        id: e.id,
        title: e.title,
        date: new Date(e.date + 'T00:00:00'),
        time: e.time,
        location: e.location || '',
        type: e.type,
        tags: e.tags || [],
        accent: getDayAccent(e.source),
    }));

    // Group events by month for list view
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
                            style={[styles.viewToggleBtn, !showEventList && styles.viewToggleBtnActive]}
                            onPress={() => setShowEventList(false)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: !showEventList }}
                            accessibilityLabel="Calendar view"
                        >
                            <Ionicons
                                name="calendar-outline"
                                size={22}
                                color={!showEventList ? '#fff' : theme.colors.text}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.viewToggleBtn, showEventList && styles.viewToggleBtnActive]}
                            onPress={() => setShowEventList(true)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: showEventList }}
                            accessibilityLabel="List view"
                        >
                            <Ionicons
                                name="menu"
                                size={24}
                                color={showEventList ? '#fff' : theme.colors.text}
                            />
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

                {/* Event List View */}
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
                    <UnifiedCalendar
                        events={calendarWidgetEvents}
                        currentDate={currentDate}
                        onCurrentDateChange={setCurrentDate}
                        selectedDate={selectedDate}
                        onSelectedDateChange={setSelectedDate}
                        onEventPress={(evt) => {
                            const calEvt = filteredAndSorted.find(e => e.id === evt.id);
                            if (calEvt) setSelectedEvent(calEvt);
                        }}
                        views={['Week', 'Day']}
                        initialView="Week"
                        showZoom={true}
                        showNavigation={true}
                        getEventAccent={(evt) => evt.accent || { bg: '#e5e7eb', text: '#1e293b', marker: '#6b7280' }}
                        getTagStyle={getTagStyle}
                    />
                )}

            </ScrollView>


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

            {/* Event Detail Modal */}
            <Modal
                visible={!!selectedEvent}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedEvent(null)}
            >
                <Pressable style={styles.eventDetailModalOverlay} onPress={() => setSelectedEvent(null)}>
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
                                        {(selectedEvent?.originalData?.divisions?.length ?? 0) > 0
                                            ? (selectedEvent?.originalData?.divisions ?? []).map((d: any) => d.name).join(', ')
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
    viewToggleBtn: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    viewToggleBtnActive: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
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
    // Picker Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    /** Centered dimmed backdrop for event detail (pickers stay bottom-sheet). */
    eventDetailModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
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
    pickerOptionActive: {
        backgroundColor: theme.colors.background,
    },
    pickerOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },
    pickerOptionTextActive: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    // Event List Styles
    eventListView: {
        gap: theme.spacing.md,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
    },
    emptyText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.textSecondary,
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
    eventTag: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
    },
    eventTagText: {
        fontSize: 12,
        fontWeight: '500',
    },
    eventDetailModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '100%',
        maxWidth: 420,
        maxHeight: '85%',
        ...theme.shadows.card,
        elevation: 12,
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
});
