import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isMediumScreen = width < 414;
const isLargeScreen = width >= 414;

// Mock awards data - empty for now to show empty state
const MOCK_AWARDS: any[] = [];

// Mock children data
const MOCK_CHILDREN = [
    { id: '1', name: 'Abby Weiss' },
    { id: '2', name: 'Adam Elliott' },
    { id: '3', name: 'Addison Brewer' },
    { id: '4', name: 'Adrianna Gelb' },
    { id: '5', name: 'Aiden Feld' },
    { id: '6', name: 'Aiden Leon' },
    { id: '7', name: 'Aidan Waisz' },
    { id: '8', name: 'John Doe' },
    { id: '9', name: 'Jane Smith' },
    { id: '10', name: 'Mike Johnson' },
    { id: '11', name: 'Sarah Williams' },
];

const YEAR_END_AWARDS = [
    "Camper of the Year",
    "Starfish",
    "Spirit",
    "Achievement",
    "Color War Captain"
];

const STARFISH_VALUES = [
    "Sportsmanship",
    "Appreciation",
    "Friendship",
    "Sensitivity",
    "Tolerance",
    "Respect",
    "Integrity",
    "Helpfulness"
];

export const AwardsScreen = ({ navigation }: any) => {
    const [awards] = useState(MOCK_AWARDS);
    const [isCSVGuideOpen, setIsCSVGuideOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('awards');
    const [isAddAwardModalOpen, setIsAddAwardModalOpen] = useState(false);
    
    // Add Award Form State
    const [selectedChild, setSelectedChild] = useState('');
    const [childSearchText, setChildSearchText] = useState('');
    const [showChildDropdown, setShowChildDropdown] = useState(false);
    const [weeklyStarfishValues, setWeeklyStarfishValues] = useState<string[]>([]);
    const [yearEndAward, setYearEndAward] = useState('');
    const [showYearEndDropdown, setShowYearEndDropdown] = useState(false);
    const [date, setDate] = useState(new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }));
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [notes, setNotes] = useState('');

    // Calculate statistics - all will be 0 with empty data
    const totalAchievements = awards.length;
    const childrenWithAwards = new Set(awards.map(award => award.childId)).size;
    const thisMonth = awards.filter(award => {
        const awardDate = new Date(award.date);
        const now = new Date();
        return awardDate.getMonth() === now.getMonth() && awardDate.getFullYear() === now.getFullYear();
    }).length;

    const handleAddAward = () => {
        setIsAddAwardModalOpen(true);
    };

    const handleCloseAddAward = () => {
        setIsAddAwardModalOpen(false);
        // Reset form
        setSelectedChild('');
        setChildSearchText('');
        setShowChildDropdown(false);
        setWeeklyStarfishValues([]);
        setYearEndAward('');
        setShowYearEndDropdown(false);
        const today = new Date();
        setDate(today.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }));
        setSelectedDate(today);
        setShowDatePicker(false);
        setNotes('');
    };

    const handleDateSelect = (day: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(day);
        setSelectedDate(newDate);
        setDate(newDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }));
        setShowDatePicker(false);
    };

    const handleMonthChange = (increment: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(selectedDate.getMonth() + increment);
        setSelectedDate(newDate);
    };

    const handleYearChange = (increment: number) => {
        const newDate = new Date(selectedDate);
        newDate.setFullYear(selectedDate.getFullYear() + increment);
        setSelectedDate(newDate);
    };

    const toggleWeeklyStarfish = (value: string) => {
        setWeeklyStarfishValues(prev => 
            prev.includes(value) 
                ? prev.filter(v => v !== value)
                : [...prev, value]
        );
    };

    const handleSubmitAward = () => {
        // TODO: Submit award to backend
        handleCloseAddAward();
    };

    const filteredChildren = childSearchText.length > 0
        ? MOCK_CHILDREN.filter(child => 
            child.name.toLowerCase().includes(childSearchText.toLowerCase())
          )
        : MOCK_CHILDREN;

    const handleUploadCSV = () => {
        // TODO: Open CSV upload functionality
    };

    const handleHelp = () => {
        setIsCSVGuideOpen(true);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                style={styles.scrollView} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <View style={styles.headerSection}>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>
                            Awards & Achievements
                        </Text>
                    <Text style={styles.headerSubtitle}>
                        Celebrating success across all children
                    </Text>
                </View>
                    
                    {/* Action Buttons - Below title on small screens, to the right on larger */}
                    <View style={styles.actionButtons}>
                    <TouchableOpacity
                            style={styles.helpButton}
                        onPress={handleHelp}
                    >
                            <Ionicons name="help-circle" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={handleUploadCSV}
                        >
                            <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.text} style={styles.uploadIcon} />
                            <Text style={styles.uploadButtonText}>Upload CSV</Text>
                        </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleAddAward}
                    >
                        <Ionicons name="add" size={20} color={theme.colors.surface} style={styles.addIcon} />
                            <Text style={styles.addButtonText}>Add Award</Text>
                    </TouchableOpacity>
                </View>
            </View>

                {/* Summary Cards - Three cards in a row */}
                <View style={styles.summaryCards}>
                    <StyledCard style={styles.summaryCard}>
                        <Text style={styles.summaryCardLabel}>Total Achievements</Text>
                        <Text style={styles.summaryCardValue}>{totalAchievements}</Text>
                    </StyledCard>
                    <StyledCard style={styles.summaryCard}>
                        <Text style={styles.summaryCardLabel}>Children with Awards</Text>
                        <Text style={styles.summaryCardValue}>{childrenWithAwards}</Text>
                    </StyledCard>
                    <StyledCard style={styles.summaryCard}>
                        <Text style={styles.summaryCardLabel}>This Month</Text>
                        <Text style={styles.summaryCardValue}>{thisMonth}</Text>
                    </StyledCard>
                </View>

                {/* Empty State */}
                <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateText}>No awards found. Add your first achievement!</Text>
                    </View>
            </ScrollView>

            {/* Add New Award Modal */}
            <Modal
                visible={isAddAwardModalOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCloseAddAward}
            >
                <View style={styles.addAwardModalOverlay}>
                    <View style={styles.addAwardModalContainer}>
                        {/* Modal Header */}
                        <View style={styles.addAwardModalHeader}>
                            <Text style={styles.addAwardModalTitle}>Add New Award</Text>
                            <TouchableOpacity
                                style={styles.addAwardModalCloseButton}
                                onPress={handleCloseAddAward}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView 
                            style={styles.addAwardModalContent}
                            showsVerticalScrollIndicator={true}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Child Selection */}
                            <View style={[styles.formField, styles.childFormField]}>
                                <Text style={styles.formLabel}>Child</Text>
                                <View style={styles.childSelectContainer}>
                                    <TextInput
                                        style={styles.childInput}
                                        placeholder="Type to search for a child..."
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={childSearchText}
                                        onChangeText={(text) => {
                                            setChildSearchText(text);
                                            setShowChildDropdown(true);
                                        }}
                                        onFocus={() => setShowChildDropdown(true)}
                                        onBlur={() => {
                                            // Delay closing to allow item selection
                                            setTimeout(() => setShowChildDropdown(false), 200);
                                        }}
                                    />
                                    {showChildDropdown && (
                                        <View style={styles.childDropdown}>
                                            <ScrollView 
                                                style={styles.childDropdownScroll}
                                                nestedScrollEnabled={true}
                                                keyboardShouldPersistTaps="handled"
                                                showsVerticalScrollIndicator={true}
                                            >
                                                {filteredChildren.length > 0 ? (
                                                    filteredChildren.map((child) => (
                                                        <TouchableOpacity
                                                            key={child.id}
                                                            style={[
                                                                styles.childDropdownItem,
                                                                selectedChild === child.id && styles.childDropdownItemSelected
                                                            ]}
                                                            onPress={() => {
                                                                setSelectedChild(child.id);
                                                                setChildSearchText(child.name);
                                                                setShowChildDropdown(false);
                                                            }}
                                                        >
                                                            <Text style={[
                                                                styles.childDropdownText,
                                                                selectedChild === child.id && styles.childDropdownTextSelected
                                                            ]}>
                                                                {child.name}
                                                            </Text>
                                                            {selectedChild === child.id && (
                                                                <Ionicons name="checkmark" size={18} color={theme.colors.surface} />
                                                            )}
                                                        </TouchableOpacity>
                                                    ))
                                                ) : (
                                                    <View style={styles.childDropdownItem}>
                                                        <Text style={styles.childDropdownText}>No children found</Text>
                                                    </View>
                                                )}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Weekly Starfish */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Weekly Starfish (multi-select)</Text>
                                <View style={styles.starfishGrid}>
                                    {STARFISH_VALUES.map((value, index) => (
                                        <TouchableOpacity
                                            key={value}
                                            style={styles.starfishItem}
                                            onPress={() => toggleWeeklyStarfish(value)}
                                        >
                                            <View style={[
                                                styles.radioButton,
                                                weeklyStarfishValues.includes(value) && styles.radioButtonSelected
                                            ]}>
                                                {weeklyStarfishValues.includes(value) && (
                                                    <View style={styles.radioButtonInner} />
                                                )}
                                            </View>
                                            <Text style={styles.starfishLabel}>{value}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Year End Award */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Year End Award</Text>
                                <TouchableOpacity
                                    style={styles.selectInput}
                                    onPress={() => setShowYearEndDropdown(!showYearEndDropdown)}
                                >
                                    <Text style={[
                                        styles.selectInputText,
                                        !yearEndAward && styles.selectInputPlaceholder
                                    ]}>
                                        {yearEndAward || 'Select award type...'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                                {showYearEndDropdown && (
                                    <View style={styles.selectDropdown}>
                                        {YEAR_END_AWARDS.map((award) => (
                                            <TouchableOpacity
                                                key={award}
                                                style={styles.selectDropdownItem}
                                                onPress={() => {
                                                    setYearEndAward(award);
                                                    setShowYearEndDropdown(false);
                                                }}
                                            >
                                                <Text style={styles.selectDropdownText}>{award}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Date */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Date</Text>
                                <TouchableOpacity
                                    style={styles.dateInputContainer}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <TextInput
                                        style={styles.dateInput}
                                        value={date}
                                        placeholder="MM/DD/YYYY"
                                        placeholderTextColor={theme.colors.textSecondary}
                                        editable={false}
                                        pointerEvents="none"
                                    />
                                    <TouchableOpacity 
                                        style={styles.dateIconButton}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            </View>

                            {/* Notes */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Notes (optional)</Text>
                                <TextInput
                                    style={styles.notesInput}
                                    placeholder="Additional notes..."
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={notes}
                                    onChangeText={setNotes}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.addAwardModalActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={handleCloseAddAward}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.addAwardButton}
                                    onPress={handleSubmitAward}
                                >
                                    <Text style={styles.addAwardButtonText}>Add Award</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Date Picker Modal */}
            <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDatePicker(false)}
            >
                <View style={styles.datePickerOverlay}>
                    <View style={styles.datePickerContainer}>
                        <View style={styles.datePickerHeader}>
                            <Text style={styles.datePickerTitle}>Select Date</Text>
                            <TouchableOpacity
                                style={styles.datePickerCloseButton}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Month/Year Selector */}
                        <View style={styles.datePickerMonthYear}>
                            <TouchableOpacity
                                style={styles.datePickerNavButton}
                                onPress={() => handleYearChange(-1)}
                            >
                                <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.datePickerNavButton}
                                onPress={() => handleMonthChange(-1)}
                            >
                                <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.datePickerMonthYearText}>
                                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </Text>
                            <TouchableOpacity
                                style={styles.datePickerNavButton}
                                onPress={() => handleMonthChange(1)}
                            >
                                <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.datePickerNavButton}
                                onPress={() => handleYearChange(1)}
                            >
                                <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Day Grid */}
                        <View style={styles.datePickerDaysContainer}>
                            <View style={styles.datePickerDaysGrid}>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                                    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
                                    const isSelected = selectedDate.getDate() === day;
                                    const isValid = day <= daysInMonth;
                                    return (
                                        <TouchableOpacity
                                            key={day}
                                            style={[
                                                styles.datePickerDay,
                                                isSelected && styles.datePickerDaySelected,
                                                !isValid && styles.datePickerDayDisabled
                                            ]}
                                            onPress={() => {
                                                if (isValid) {
                                                    handleDateSelect(day);
                                                }
                                            }}
                                            disabled={!isValid}
                                        >
                                            <Text style={[
                                                styles.datePickerDayText,
                                                isSelected && styles.datePickerDayTextSelected,
                                                !isValid && styles.datePickerDayTextDisabled
                                            ]}>
                                                {day}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* CSV Upload Format Guide Modal */}
            <Modal
                visible={isCSVGuideOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsCSVGuideOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>CSV Upload Format Guide</Text>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setIsCSVGuideOpen(false)}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Tabs */}
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            style={styles.tabsContainer}
                            contentContainerStyle={styles.tabsContent}
                        >
                            {[
                                { key: 'children', label: 'Children' },
                                { key: 'staff', label: 'Staff' },
                                { key: 'medications', label: 'Medications' },
                                { key: 'trips', label: 'Trips' },
                                { key: 'menu', label: 'Menu' },
                                { key: 'awards', label: 'Awards' },
                                { key: 'daily_notes', label: 'Daily Notes' },
                                { key: 'incidents', label: 'Incidents' },
                                { key: 'calendar', label: 'Calendar' },
                                { key: 'sports', label: 'Sports' }
                            ].map((tab) => (
                                <TouchableOpacity
                                    key={tab.key}
                                    style={[
                                        styles.tab,
                                        activeTab === tab.key && styles.tabActive
                                    ]}
                                    onPress={() => setActiveTab(tab.key)}
                                >
                                    <Text style={[
                                        styles.tabText,
                                        activeTab === tab.key && styles.tabTextActive
                                    ]}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Tab Content */}
                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={true}>
                            {renderTabContent(activeTab)}
            </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

// CSV Format Data
const csvFormats: Record<string, { title: string; subtitle: string; columns: string; example: string; notes?: string }> = {
    children: {
        title: "Children Roster",
        subtitle: "CSV format for children roster upload",
        columns: "first_name, last_name, person_id, age, grade, gender, guardian_phone, guardian_email, medical_notes, allergies, division_id, leader_id, emergency_contact, status, season",
        example: "John, Doe, P12345, 10, 5, Male, 555-1234, parent@email.com, None, Peanuts, <division_id>, <leader_id>, Jane Doe 555-5678, active, Summer 2024",
        notes: "REQUIRED: first_name, last_name, and person_id. All other fields are optional. division_id and leader_id must be valid UUIDs from divisions and staff tables if provided"
    },
    staff: {
        title: "Staff Directory",
        subtitle: "CSV format for staff directory upload",
        columns: "name, email, phone, role, department, hire_date, leader_id, status, season",
        example: "Jane Smith, jane@thenest.com, 555-9876, Counselor, Activities, 2024-01-15, <leader_id>, active, Summer 2024",
        notes: "leader_id must be a valid UUID from staff table. hire_date format: YYYY-MM-DD"
    },
    medications: {
        title: "Medication Logs",
        subtitle: "CSV format for medication logs upload",
        columns: "child_id, medication_name, dosage, meal_time, date, notes, is_recurring, frequency, days_of_week, end_date",
        example: "<child_id>, Tylenol, 5ml, Before Breakfast, 2024-01-15, Take with food, false, daily, , ",
        notes: "child_id must be valid UUID. meal_time options: Before Breakfast, After Breakfast, Before Lunch, After Lunch, Before Dinner, After Dinner, Bedtime. date format: YYYY-MM-DD"
    },
    trips: {
        title: "Transportation/Trips",
        subtitle: "CSV format for transportation/trips upload",
        columns: "name, type, date, destination, departure_time, return_time, capacity, driver, chaperone, transportation_type, event_type, event_length, meal, status",
        example: "Zoo Trip, Field Trip, 2024-06-15, City Zoo, 09:00, 15:00, 30, John Driver, Jane Chaperone, Bus, Educational, Half Day, Packed Lunch, confirmed",
        notes: "date format: YYYY-MM-DD. type options: Field Trip, Sports Event, Other"
    },
    menu: {
        title: "Menu Items",
        subtitle: "CSV format for menu items upload",
        columns: "date, meal_type, items, allergens",
        example: "2024-06-15, Lunch, Chicken Nuggets\\, Fries\\, Apple Slices, Contains: Wheat\\, Soy",
        notes: "date format: YYYY-MM-DD. meal_type options: Breakfast, Lunch, Snack, Dinner. Use backslash before commas within items/allergens"
    },
    awards: {
        title: "Awards",
        subtitle: "CSV format for awards upload",
        columns: "child_id, title, category, date, description",
        example: "<child_id>, Best Sportsmanship, Sports, 2024-06-15, Showed excellent teamwork during soccer",
        notes: "child_id must be valid UUID. date format: YYYY-MM-DD"
    },
    daily_notes: {
        title: "Daily Notes",
        subtitle: "CSV format for daily notes upload",
        columns: "child_id, date, mood, activities, meals, nap, notes, created_by",
        example: "<child_id>, 2024-06-15, Happy, Arts and crafts\\, Swimming, Ate well, 1 hour, Great day overall, <staff_id>",
        notes: "child_id and created_by must be valid UUIDs. date format: YYYY-MM-DD. Use backslash before commas within text fields"
    },
    incidents: {
        title: "Incident Reports",
        subtitle: "CSV format for incident reports upload",
        columns: "child_id, date, type, severity, description, reported_by, status",
        example: "<child_id>, 2024-06-15, Minor Injury, Low, Scraped knee on playground, Jane Smith, resolved",
        notes: "child_id must be valid UUID. date format: YYYY-MM-DD. type options: Injury, Illness, Behavioral, Other"
    },
    calendar: {
        title: "Master Calendar",
        subtitle: "CSV format for master calendar upload",
        columns: "event_date, title, type, description, time, location, division_id, created_by",
        example: "2024-06-20, Swimming Day, Activity, Pool day for all divisions, 10:00, Main Pool, <division_id>, <staff_id>",
        notes: "event_date format: YYYY-MM-DD. division_id and created_by must be valid UUIDs or leave empty"
    },
    sports: {
        title: "Sports Calendar",
        subtitle: "CSV format for sports calendar upload",
        columns: "event_date, title, sport_type, description, time, location, team, opponent, division_id, created_by",
        example: "2024-06-25, Championship Game, Basketball, Final game of season, 14:00, Main Court, Eagles, Hawks, <division_id>, <staff_id>",
        notes: "event_date format: YYYY-MM-DD. sport_type options: Baseball, Basketball, Dance, Football, Golf, Gymnastics, Hockey, Lacrosse, Soccer, Softball, Tennis, Volleyball, Waterfront. division_id and created_by can be empty"
    }
};

const renderTabContent = (tab: string) => {
    const format = csvFormats[tab];
    if (!format) return null;

    return (
        <View style={styles.formatContainer}>
            <View style={styles.formatHeader}>
                <Text style={styles.formatTitle}>{format.title}</Text>
                <Text style={styles.formatSubtitle}>{format.subtitle}</Text>
            </View>

            <View style={styles.formatSection}>
                <Text style={styles.sectionTitle}>Required Columns (first row):</Text>
                <View style={styles.codeBlock}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <Text style={styles.codeText}>{format.columns}</Text>
                    </ScrollView>
                </View>
            </View>

            <View style={styles.formatSection}>
                <Text style={styles.sectionTitle}>Example Data Row:</Text>
                <View style={styles.codeBlock}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <Text style={styles.codeText}>{format.example}</Text>
                    </ScrollView>
                </View>
            </View>

            {format.notes && (
                <View style={styles.notesContainer}>
                    <Text style={styles.notesTitle}>Important Notes:</Text>
                    <Text style={styles.notesText}>{format.notes}</Text>
                </View>
            )}

            <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>General Tips:</Text>
                <View style={styles.tipsList}>
                    <Text style={styles.tipItem}>• First row must contain column names exactly as shown</Text>
                    <Text style={styles.tipItem}>• Use commas to separate values</Text>
                    <Text style={styles.tipItem}>• Use backslash before commas within text fields (e.g., "Item 1\, Item 2")</Text>
                    <Text style={styles.tipItem}>• Leave fields empty for optional columns</Text>
                    <Text style={styles.tipItem}>• Maximum 1000 rows per upload</Text>
                    <Text style={styles.tipItem}>• Dates must be in YYYY-MM-DD format</Text>
                    <Text style={styles.tipItem}>• UUIDs can be obtained from the backend for existing records</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
    },
    headerSection: {
        marginBottom: theme.spacing.xl,
    },
    headerTextContainer: {
        marginBottom: theme.spacing.lg,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        lineHeight: 34,
    },
    headerSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    helpButton: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
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
        height: 40,
    },
    uploadIcon: {
        marginRight: theme.spacing.xs,
    },
    uploadButtonText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
        height: 40,
    },
    addIcon: {
        marginRight: theme.spacing.xs,
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.surface,
    },
    summaryCards: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl,
    },
    summaryCard: {
        flex: 1,
        padding: theme.spacing.lg,
        alignItems: 'flex-start',
        justifyContent: 'center',
        minHeight: 100,
        minWidth: 0,
    },
    summaryCardLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
        fontWeight: '500',
    },
    summaryCardValue: {
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.text,
    },
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.xl * 2,
        paddingHorizontal: theme.spacing.md,
    },
    emptyStateText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        width: '100%',
        maxHeight: '90%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        paddingTop: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        flex: 1,
    },
    modalCloseButton: {
        padding: theme.spacing.xs,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabsContainer: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    tabsContent: {
        paddingHorizontal: theme.spacing.sm,
    },
    tab: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
        marginRight: theme.spacing.xs,
    },
    tabActive: {
        borderBottomColor: theme.colors.secondary,
    },
    tabText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    tabTextActive: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    modalContent: {
        flex: 1,
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    formatContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    formatHeader: {
        marginBottom: theme.spacing.lg,
    },
    formatTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    formatSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    formatSection: {
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    codeBlock: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxWidth: '100%',
    },
    codeText: {
        fontSize: 11,
        fontFamily: 'monospace',
        color: theme.colors.text,
        lineHeight: 16,
    },
    notesContainer: {
        backgroundColor: '#eff6ff',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    notesTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    notesText: {
        fontSize: 12,
        color: theme.colors.text,
        lineHeight: 18,
    },
    tipsContainer: {
        backgroundColor: '#fef3c7',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    tipsTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    tipsList: {
        gap: theme.spacing.xs,
    },
    tipItem: {
        fontSize: 12,
        color: theme.colors.text,
        lineHeight: 18,
        marginBottom: theme.spacing.xs,
    },
    // Add Award Modal Styles
    addAwardModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addAwardModalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '90%',
        maxWidth: 500,
        maxHeight: '90%',
        overflow: 'hidden',
    },
    addAwardModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    addAwardModalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: theme.colors.text,
    },
    addAwardModalCloseButton: {
        padding: theme.spacing.xs,
    },
    addAwardModalContent: {
        padding: theme.spacing.lg,
        maxHeight: 600,
    },
    formField: {
        marginBottom: theme.spacing.lg,
    },
    childFormField: {
        zIndex: 1000,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    childSelectContainer: {
        position: 'relative',
        zIndex: 1000,
    },
    childInput: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        minHeight: 44,
    },
    childDropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.xs,
        maxHeight: 250,
        zIndex: 9999,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        overflow: 'hidden',
    },
    childDropdownScroll: {
        maxHeight: 250,
    },
    childDropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    childDropdownItemSelected: {
        backgroundColor: '#FF6B35', // Orange color like in screenshot
    },
    childDropdownText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    childDropdownTextSelected: {
        color: theme.colors.surface, // White text on orange background
    },
    starfishGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    starfishItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '48%',
        gap: theme.spacing.sm,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonSelected: {
        borderColor: theme.colors.secondary,
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.secondary,
    },
    starfishLabel: {
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: '500',
    },
    selectInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 44,
    },
    selectInputText: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    selectInputPlaceholder: {
        color: theme.colors.textSecondary,
    },
    selectDropdown: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.xs,
        maxHeight: 200,
        zIndex: 1000,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    selectDropdownItem: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    selectDropdownText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    dateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        minHeight: 44,
    },
    dateInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        paddingVertical: theme.spacing.sm,
    },
    dateIconButton: {
        padding: theme.spacing.xs,
    },
    notesInput: {
        backgroundColor: theme.colors.background,
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
    addAwardModalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.md,
        marginTop: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    cancelButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
    },
    addAwardButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    addAwardButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.surface,
    },
    // Date Picker Modal Styles
    datePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    datePickerContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '85%',
        maxWidth: 400,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    datePickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    datePickerCloseButton: {
        padding: theme.spacing.xs,
    },
    datePickerMonthYear: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    datePickerNavButton: {
        padding: theme.spacing.xs,
    },
    datePickerMonthYearText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        flex: 1,
        textAlign: 'center',
    },
    datePickerDaysContainer: {
        padding: theme.spacing.md,
    },
    datePickerDaysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    datePickerDay: {
        width: '13%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.md,
        margin: '0.5%',
        backgroundColor: theme.colors.background,
    },
    datePickerDaySelected: {
        backgroundColor: theme.colors.secondary,
    },
    datePickerDayDisabled: {
        opacity: 0.3,
    },
    datePickerDayText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    datePickerDayTextSelected: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    datePickerDayTextDisabled: {
        color: theme.colors.textSecondary,
    },
});

