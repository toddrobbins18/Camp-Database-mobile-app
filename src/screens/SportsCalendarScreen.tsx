import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

interface SportsEvent {
    id: string;
    title: string;
    date: Date;
    location: string;
    sport: string;
    division: string;
    gender: string;
    eventType: string;
}

export const SportsCalendarScreen = ({ navigation }: any) => {
    const [activeView, setActiveView] = useState('Month');
    const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); // January 2026
    const [selectedDate, setSelectedDate] = useState(new Date(2026, 0, 25));
    const [showAddEventModal, setShowAddEventModal] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showUploadCSVModal, setShowUploadCSVModal] = useState(false);
    
    // Search and filter states
    const [eventSearch, setEventSearch] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [selectedGender, setSelectedGender] = useState('All Genders');
    const [selectedSport, setSelectedSport] = useState('All Sports');
    const [selectedEventType, setSelectedEventType] = useState('All Event Types');
    const [selectedLocation, setSelectedLocation] = useState('All Locations');
    const [sortBy, setSortBy] = useState('Sort by Date');
    
    // Picker modals
    const [showDivisionPicker, setShowDivisionPicker] = useState(false);
    const [showGenderPicker, setShowGenderPicker] = useState(false);
    const [showSportPicker, setShowSportPicker] = useState(false);
    const [showEventTypePicker, setShowEventTypePicker] = useState(false);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [showSortPicker, setShowSortPicker] = useState(false);
    
    // Add Event form states
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState(new Date(2026, 0, 25));
    const [newEventLocation, setNewEventLocation] = useState('');
    const [newEventSport, setNewEventSport] = useState('');
    const [newEventDivision, setNewEventDivision] = useState('');
    const [newEventGender, setNewEventGender] = useState('');
    const [newEventType, setNewEventType] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Sample sports events
    const [events, setEvents] = useState<SportsEvent[]>([
        { id: '1', title: 'Basketball Tournament', date: new Date(2026, 0, 15), location: 'Home', sport: 'Basketball', division: 'Senior Boys', gender: 'Boys', eventType: 'Tournament' },
        { id: '2', title: 'Soccer Match', date: new Date(2026, 0, 20), location: 'Away', sport: 'Soccer', division: 'Junior Girls', gender: 'Girls', eventType: 'Match' },
        { id: '3', title: 'Tennis Championship', date: new Date(2026, 0, 25), location: 'Home', sport: 'Tennis', division: 'CIT Boys', gender: 'Boys', eventType: 'Championship' },
    ]);

    const divisions = ['All Divisions', 'Freshmen A', 'Freshmen B', 'Cadet', 'Sophomore', 'Junior', 'Senior', 'Super', 'Teen', 'CIT'];
    const genders = ['All Genders', 'Boys', 'Girls'];
    const sports = ['All Sports', 'Basketball', 'Soccer', 'Tennis', 'Football', 'Hockey', 'Lacrosse', 'Baseball', 'Volleyball'];
    const eventTypes = ['All Event Types', 'Tournament', 'Match', 'Championship', 'Practice', 'Friendly'];
    const locations = ['All Locations', 'Home', 'Away', 'Neutral'];
    const sortOptions = ['Sort by Date', 'Sort by Name', 'Sort by Sport', 'Sort by Location'];

    const formatDate = (date: Date): string => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

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
        const totalCells = days.length;
        const remainingCells = 42 - totalCells; // 6 rows x 7 days
        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                date: i,
                isCurrentMonth: false,
                fullDate: new Date(year, month + 1, i)
            });
        }
        
        return days;
    };

    const getEventsForDate = (date: Date) => {
        return events.filter(event => {
            const eventDate = event.date;
            return eventDate.getDate() === date.getDate() &&
                   eventDate.getMonth() === date.getMonth() &&
                   eventDate.getFullYear() === date.getFullYear();
        });
    };

    const isSameDate = (date1: Date, date2: Date) => {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    };

    const filteredEvents = events.filter(event => {
        if (eventSearch && !event.title.toLowerCase().includes(eventSearch.toLowerCase())) return false;
        if (selectedDivision !== 'All Divisions' && event.division !== selectedDivision) return false;
        if (selectedGender !== 'All Genders' && event.gender !== selectedGender) return false;
        if (selectedSport !== 'All Sports' && event.sport !== selectedSport) return false;
        if (selectedEventType !== 'All Event Types' && event.eventType !== selectedEventType) return false;
        if (selectedLocation !== 'All Locations' && event.location !== selectedLocation) return false;
        return true;
    });

    const handleAddEvent = () => {
        if (!newEventTitle.trim() || !newEventSport) return;

        const newEvent: SportsEvent = {
            id: Date.now().toString(),
            title: newEventTitle.trim(),
            date: new Date(newEventDate),
            location: newEventLocation || 'Home',
            sport: newEventSport,
            division: newEventDivision || 'All Divisions',
            gender: newEventGender || 'All Genders',
            eventType: newEventType || 'Match',
        };

        setEvents([...events, newEvent]);
        setShowAddEventModal(false);
        // Reset form
        setNewEventTitle('');
        setNewEventDate(new Date(2026, 0, 25));
        setNewEventLocation('');
        setNewEventSport('');
        setNewEventDivision('');
        setNewEventGender('');
        setNewEventType('');
    };

    const handleDeleteEvent = (id: string) => {
        setEvents(events.filter(event => event.id !== id));
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        const today = new Date(2026, 0, 25);
        setCurrentDate(today);
        setSelectedDate(today);
    };

    const handleSelectFileOption = (option: string) => {
        console.log('Selected:', option);
        setShowUploadCSVModal(false);
        // TODO: Handle file selection
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Title Section */}
                <View style={styles.titleSection}>
                    <View style={styles.titleContainer}>
                        <View style={styles.titleRow}>
                            <Ionicons name="trophy-outline" size={32} color={theme.colors.text} />
                            <Text style={styles.title}>Sports Calendar</Text>
                        </View>
                        <Text style={styles.subtitle}>Track sports events and games</Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsContainer}>
                        <View style={styles.iconButton}>
                            <View style={styles.orangeIcon}>
                                <Ionicons name="restaurant-outline" size={20} color="white" />
                            </View>
                        </View>
                        <TouchableOpacity style={styles.iconButton}>
                            <Ionicons name="list-outline" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.iconButton}
                            onPress={() => setShowGuideModal(true)}
                        >
                            <Ionicons name="help-circle-outline" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.uploadBtn}
                            onPress={() => setShowUploadCSVModal(true)}
                        >
                            <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.text} />
                            <Text style={styles.uploadBtnText}>Upload DSV</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.addBtn}
                            onPress={() => setShowAddEventModal(true)}
                        >
                            <Ionicons name="add" size={18} color="white" />
                            <Text style={styles.addBtnText}>Add Event</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Filters Card */}
                <StyledCard style={styles.filterCard}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search events..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={eventSearch}
                            onChangeText={setEventSearch}
                        />
                    </View>
                    <View style={styles.filterRow}>
                        <TouchableOpacity 
                            style={styles.filterChip}
                            onPress={() => setShowDivisionPicker(true)}
                        >
                            <Text style={styles.filterText}>{selectedDivision}</Text>
                            <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.filterChip}
                            onPress={() => setShowGenderPicker(true)}
                        >
                            <Text style={styles.filterText}>{selectedGender}</Text>
                            <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.filterChip}
                            onPress={() => setShowSportPicker(true)}
                        >
                            <Text style={styles.filterText}>{selectedSport}</Text>
                            <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.filterRow}>
                        <TouchableOpacity 
                            style={styles.filterChip}
                            onPress={() => setShowEventTypePicker(true)}
                        >
                            <Text style={styles.filterText}>{selectedEventType}</Text>
                            <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.filterChip}
                            onPress={() => setShowLocationPicker(true)}
                        >
                            <Text style={styles.filterText}>{selectedLocation}</Text>
                            <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.filterChip}
                            onPress={() => setShowSortPicker(true)}
                        >
                            <Text style={styles.filterText}>{sortBy}</Text>
                            <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </StyledCard>

                {/* Calendar Card */}
                <StyledCard style={styles.calendarCard}>
                    {/* Calendar Navigation */}
                    <View style={styles.calendarNav}>
                        <TouchableOpacity onPress={goToToday}>
                            <Text style={styles.navButton}>Today</Text>
                        </TouchableOpacity>
                        <View style={styles.navButtons}>
                            <TouchableOpacity onPress={() => navigateMonth('prev')}>
                                <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.monthYear}>
                                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </Text>
                            <TouchableOpacity onPress={() => navigateMonth('next')}>
                                <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* View Toggles */}
                    <View style={styles.viewToggles}>
                        {['Month', 'Week', 'Day', 'Agenda'].map((view) => (
                            <TouchableOpacity
                                key={view}
                                style={[
                                    styles.viewToggle,
                                    activeView === view && styles.viewToggleActive
                                ]}
                                onPress={() => setActiveView(view)}
                            >
                                <Text style={[
                                    styles.viewToggleText,
                                    activeView === view && styles.viewToggleTextActive
                                ]}>
                                    {view}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Calendar Grid */}
                    {activeView === 'Month' && (
                        <View style={styles.calendarGrid}>
                            {/* Day Headers */}
                            {dayNames.map((day) => (
                                <View key={day} style={styles.dayHeader}>
                                    <Text style={styles.dayHeaderText}>{day}</Text>
                                </View>
                            ))}
                            
                            {/* Calendar Days */}
                            {getDaysInMonth(currentDate).map((day, index) => {
                                const dayEvents = getEventsForDate(day.fullDate);
                                const isSelected = isSameDate(day.fullDate, selectedDate);
                                const isToday = isSameDate(day.fullDate, new Date(2026, 0, 25));
                                
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.calendarDay,
                                            !day.isCurrentMonth && styles.calendarDayOtherMonth,
                                            isSelected && styles.calendarDaySelected,
                                            isToday && styles.calendarDayToday
                                        ]}
                                        onPress={() => setSelectedDate(day.fullDate)}
                                    >
                                        <Text style={[
                                            styles.dayNumber,
                                            !day.isCurrentMonth && styles.dayNumberOtherMonth,
                                            isSelected && styles.dayNumberSelected
                                        ]}>
                                            {day.date}
                                        </Text>
                                        {dayEvents.length > 0 && (
                                            <View style={styles.eventIndicator}>
                                                <View style={styles.eventDot} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* Selected Date Events */}
                    {activeView === 'Month' && getEventsForDate(selectedDate).length > 0 && (
                        <View style={styles.selectedDateEvents}>
                            <Text style={styles.selectedDateTitle}>
                                Events on {formatDate(selectedDate)}
                            </Text>
                            {getEventsForDate(selectedDate).map((event) => (
                                <View key={event.id} style={styles.eventItem}>
                                    <View style={styles.eventItemContent}>
                                        <Text style={styles.eventItemTitle}>{event.title}</Text>
                                        <Text style={styles.eventItemDetails}>
                                            {event.sport} • {event.location} • {event.division}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDeleteEvent(event.id)}>
                                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                </StyledCard>
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="search" size={24} color="white" />
            </TouchableOpacity>

            {/* Add Event Modal */}
            <Modal
                visible={showAddEventModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAddEventModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowAddEventModal(false)}>
                    <Pressable style={styles.addEventModal} onPress={(e) => e.stopPropagation()}>
                        <ScrollView style={styles.addEventScroll}>
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>Add Event</Text>
                                    <Text style={styles.modalSubtitle}>Add a new sports event</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowAddEventModal(false)}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Event Title</Text>
                                <TextInput
                                    style={styles.inputField}
                                    placeholder="Enter event title"
                                    value={newEventTitle}
                                    onChangeText={setNewEventTitle}
                                />
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Date</Text>
                                <TouchableOpacity 
                                    style={styles.inputContainer}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={styles.inputField}>{formatDate(newEventDate)}</Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Sport</Text>
                                <TouchableOpacity 
                                    style={styles.inputContainer}
                                    onPress={() => setShowSportPicker(true)}
                                >
                                    <Text style={styles.inputField}>{newEventSport || 'Select sport'}</Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Location</Text>
                                <TextInput
                                    style={styles.inputField}
                                    placeholder="Enter location"
                                    value={newEventLocation}
                                    onChangeText={setNewEventLocation}
                                />
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Division</Text>
                                <TouchableOpacity 
                                    style={styles.inputContainer}
                                    onPress={() => setShowDivisionPicker(true)}
                                >
                                    <Text style={styles.inputField}>{newEventDivision || 'Select division'}</Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.addEventBtn} onPress={handleAddEvent}>
                                <Text style={styles.addEventBtnText}>Add Event</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Pickers - Similar structure to MenuScreen */}
            {/* Division Picker */}
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
                        <ScrollView style={styles.pickerContent}>
                            {divisions.map((division) => (
                                <TouchableOpacity
                                    key={division}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        if (showAddEventModal) {
                                            setNewEventDivision(division);
                                        } else {
                                            setSelectedDivision(division);
                                        }
                                        setShowDivisionPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{division}</Text>
                                    {(showAddEventModal ? newEventDivision : selectedDivision) === division && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Sport Picker */}
            <Modal
                visible={showSportPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSportPicker(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowSportPicker(false)}>
                    <Pressable style={styles.pickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Sport</Text>
                            <TouchableOpacity onPress={() => setShowSportPicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerContent}>
                            {sports.map((sport) => (
                                <TouchableOpacity
                                    key={sport}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        if (showAddEventModal) {
                                            setNewEventSport(sport);
                                        } else {
                                            setSelectedSport(sport);
                                        }
                                        setShowSportPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{sport}</Text>
                                    {(showAddEventModal ? newEventSport : selectedSport) === sport && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* CSV Upload Format Guide Modal */}
            <Modal
                visible={showGuideModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowGuideModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowGuideModal(false)}>
                    <Pressable style={styles.guideModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>CSV Upload Format Guide</Text>
                            <TouchableOpacity onPress={() => setShowGuideModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.guideContent}>
                            <View style={styles.guideSection}>
                                <Text style={styles.sectionTitle}>Sports Events CSV Format</Text>
                                <Text style={styles.sectionSubtitle}>
                                    CSV format for sports events upload
                                </Text>

                                {/* Required Columns */}
                                <View style={styles.codeBox}>
                                    <Text style={styles.codeText}>
                                        event_title, event_date, sport, location, division, gender, event_type
                                    </Text>
                                </View>

                                {/* Example Data */}
                                <View style={styles.codeBox}>
                                    <Text style={styles.codeText}>
                                        Basketball Tournament, 2026-01-15, Basketball, Home, Senior Boys, Boys, Tournament
                                    </Text>
                                </View>

                                {/* Important Notes */}
                                <Text style={styles.importantNote}>
                                    REQUIRED: event_title, event_date, and sport. All other fields are optional.
                                </Text>

                                {/* General Tips */}
                                <View style={styles.tipsBox}>
                                    <Text style={styles.tipsTitle}>General Tips:</Text>
                                    <Text style={styles.tipItem}>• First row must contain column names exactly as shown.</Text>
                                    <Text style={styles.tipItem}>• Use commas to separate values.</Text>
                                    <Text style={styles.tipItem}>• Dates must be in YYYY-MM-DD format.</Text>
                                    <Text style={styles.tipItem}>• Location can be: Home, Away, or Neutral.</Text>
                                    <Text style={styles.tipItem}>• Event types: Tournament, Match, Championship, Practice, Friendly.</Text>
                                    <Text style={styles.tipItem}>• Maximum 1000 rows per upload.</Text>
                                </View>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Upload CSV Modal */}
            <Modal
                visible={showUploadCSVModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowUploadCSVModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowUploadCSVModal(false)}>
                    <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select file</Text>
                        </View>
                        <View style={styles.bottomSheetContent}>
                            <TouchableOpacity 
                                style={styles.bottomSheetOption}
                                onPress={() => handleSelectFileOption('Aloha downloads')}
                            >
                                <Ionicons name="folder-outline" size={24} color={theme.colors.secondary} />
                                <Text style={styles.bottomSheetOptionText}>Aloha downloads</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.bottomSheetOption}
                                onPress={() => handleSelectFileOption('Other files')}
                            >
                                <Ionicons name="document-text-outline" size={24} color={theme.colors.secondary} />
                                <Text style={styles.bottomSheetOptionText}>Other files</Text>
                            </TouchableOpacity>
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
        marginBottom: theme.spacing.lg,
    },
    titleSection: {
        marginBottom: theme.spacing.lg,
    },
    titleContainer: {
        marginBottom: theme.spacing.sm,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    title: {
        ...theme.typography.h1,
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.text,
    },
    subtitle: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        flexWrap: 'wrap',
        marginTop: theme.spacing.md,
    },
    iconButton: {
        padding: theme.spacing.xs,
    },
    orangeIcon: {
        width: 40,
        height: 40,
        backgroundColor: theme.colors.accent,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    uploadBtnText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 12,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    addBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12,
    },
    filterCard: {
        marginBottom: theme.spacing.md,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
        marginBottom: theme.spacing.md,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        marginLeft: theme.spacing.xs,
    },
    filterRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        gap: theme.spacing.xs,
    },
    filterText: {
        fontSize: 12,
        color: theme.colors.text,
    },
    calendarCard: {
        marginBottom: theme.spacing.md,
    },
    calendarNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    navButton: {
        fontSize: 14,
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    navButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    monthYear: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
    },
    viewToggles: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.md,
    },
    viewToggle: {
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    viewToggleActive: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    viewToggleText: {
        fontSize: 12,
        color: theme.colors.text,
        fontWeight: '600',
    },
    viewToggleTextActive: {
        color: 'white',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayHeader: {
        width: '14.28%',
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
    },
    dayHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    calendarDay: {
        width: '14.28%',
        aspectRatio: 1,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.xs,
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
    },
    calendarDayOtherMonth: {
        backgroundColor: '#f9fafb',
    },
    calendarDaySelected: {
        backgroundColor: '#dbeafe',
        borderColor: theme.colors.secondary,
    },
    calendarDayToday: {
        borderWidth: 2,
        borderColor: theme.colors.secondary,
    },
    dayNumber: {
        fontSize: 12,
        color: theme.colors.text,
    },
    dayNumberOtherMonth: {
        color: theme.colors.textSecondary,
    },
    dayNumberSelected: {
        fontWeight: '700',
        color: theme.colors.secondary,
    },
    eventIndicator: {
        marginTop: theme.spacing.xs,
    },
    eventDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.secondary,
    },
    selectedDateEvents: {
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    selectedDateTitle: {
        ...theme.typography.h3,
        fontSize: 16,
        marginBottom: theme.spacing.sm,
    },
    eventItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.sm,
        backgroundColor: '#f3f4f6',
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.xs,
    },
    eventItemContent: {
        flex: 1,
    },
    eventItemTitle: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
    },
    eventItemDetails: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    addEventModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '90%',
        paddingBottom: theme.spacing.xl,
    },
    addEventScroll: {
        paddingHorizontal: theme.spacing.md,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: theme.spacing.xs,
    },
    modalSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    formSection: {
        marginTop: theme.spacing.lg,
        paddingHorizontal: theme.spacing.md,
    },
    formLabel: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: theme.spacing.sm,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
    },
    inputField: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        paddingVertical: 0,
    },
    addEventBtn: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.xl,
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    addEventBtnText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    pickerModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '60%',
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
    // Guide Modal Styles
    guideModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '90%',
        paddingBottom: theme.spacing.xl,
    },
    guideContent: {
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
    },
    guideSection: {
        paddingBottom: theme.spacing.xl,
    },
    sectionTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    sectionSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    codeBox: {
        backgroundColor: '#f3f4f6',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    codeText: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: theme.colors.text,
    },
    importantNote: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '600',
        marginBottom: theme.spacing.md,
    },
    tipsBox: {
        backgroundColor: '#fef3c7',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    tipsTitle: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    tipItem: {
        ...theme.typography.bodySmall,
        fontSize: 13,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    // Bottom Sheet Styles
    bottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        maxHeight: '30%',
    },
    bottomSheetHeader: {
        marginBottom: theme.spacing.lg,
    },
    bottomSheetTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    bottomSheetContent: {
        gap: theme.spacing.md,
    },
    bottomSheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
    },
    bottomSheetOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },
});

