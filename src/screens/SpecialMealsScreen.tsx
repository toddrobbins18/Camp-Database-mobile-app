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

interface SpecialMealsScreenProps {
    navigation: any;
}

const MEAL_TYPES = [
    'Breakfast',
    'Lunch',
    'Dinner',
    'Snack',
    'Dessert',
];

export const SpecialMealsScreen = ({ navigation }: SpecialMealsScreenProps) => {
    const [showAddMealModal, setShowAddMealModal] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

    // Add Meal Modal States
    const [mealDate, setMealDate] = useState('');
    const [mealType, setMealType] = useState('');
    const [menuItems, setMenuItems] = useState('');
    const [allergens, setAllergens] = useState('');
    const [showMealDatePicker, setShowMealDatePicker] = useState(false);
    const [showMealTypeDropdown, setShowMealTypeDropdown] = useState(false);

    // Date picker state
    const [mealDatePickerMonth, setMealDatePickerMonth] = useState(new Date().getMonth());
    const [mealDatePickerYear, setMealDatePickerYear] = useState(new Date().getFullYear());

    // Reuse date formatting function
    const formatDate = (date: Date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    const handleDateSelect = (date: Date) => {
        const formatted = formatDate(date);
        setMealDate(formatted);
        setShowMealDatePicker(false);
    };

    // Reuse date picker render function
    const renderDatePicker = (visible: boolean, onClose: () => void) => {
        const currentMonth = mealDatePickerMonth;
        const currentYear = mealDatePickerYear;
        const today = new Date();
        const selectedDateValue = mealDate;

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

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startingDayOfWeek = firstDayOfMonth.getDay();

        const monthDates = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            monthDates.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            monthDates.push(new Date(currentYear, currentMonth, i));
        }

        return (
            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <View style={styles.datePickerContainer} onStartShouldSetResponder={() => true}>
                        <View style={styles.datePickerHeader}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (currentMonth === 0) {
                                        setMealDatePickerMonth(11);
                                        setMealDatePickerYear(currentYear - 1);
                                    } else {
                                        setMealDatePickerMonth(currentMonth - 1);
                                    }
                                }}
                            >
                                <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.datePickerMonth}>
                                {monthNames[currentMonth]} {currentYear}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    if (currentMonth === 11) {
                                        setMealDatePickerMonth(0);
                                        setMealDatePickerYear(currentYear + 1);
                                    } else {
                                        setMealDatePickerMonth(currentMonth + 1);
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
                                const isToday = formatDate(date) === formatDate(today);
                                const isSelected =
                                    selectedDateValue && formatDate(date) === selectedDateValue;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.dateCell,
                                            isToday && styles.todayCell,
                                            isSelected && styles.selectedDateCell,
                                        ]}
                                        onPress={() => handleDateSelect(date)}
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
                                    setMealDate('');
                                    onClose();
                                }}
                            >
                                <Text style={styles.datePickerActionText}>Clear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    handleDateSelect(today);
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

    const handleAddMeal = () => {
        // TODO: Implement meal creation
        console.log('Adding special meal:', {
            mealDate,
            mealType,
            menuItems,
            allergens,
        });
        // Reset form
        setMealDate('');
        setMealType('');
        setMenuItems('');
        setAllergens('');
        setShowAddMealModal(false);
    };

    const handleCloseAddMealModal = () => {
        setMealDate('');
        setMealType('');
        setMenuItems('');
        setAllergens('');
        setShowAddMealModal(false);
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
                        <Text style={styles.headerTitle}>Special Meals Schedule</Text>
                        <Text style={styles.headerSubtitle}>
                            Plan and manage special dietary events
                        </Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity>
                            <Ionicons name="notifications-outline" size={24} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity>
                            <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
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
                            color={viewMode === 'calendar' ? theme.colors.surface : theme.colors.accent}
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
                            color={viewMode === 'list' ? theme.colors.surface : theme.colors.text}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addMealButton}
                        onPress={() => setShowAddMealModal(true)}
                    >
                        <Ionicons name="add" size={20} color={theme.colors.surface} />
                        <Text style={styles.addMealButtonText}>Add Special Meal</Text>
                    </TouchableOpacity>
                </View>

                {/* Empty State */}
                <View style={styles.emptyStateContainer}>
                    <StyledCard style={styles.emptyStateCard}>
                        <View style={styles.emptyStateContent}>
                            <View style={styles.emptyStateIconContainer}>
                                <Ionicons
                                    name="restaurant-outline"
                                    size={64}
                                    color={theme.colors.textSecondary}
                                />
                                <View style={styles.greenDot} />
                            </View>
                            <Text style={styles.emptyStateText}>
                                No special meals scheduled yet
                            </Text>
                        </View>
                    </StyledCard>
                </View>
            </ScrollView>

            {/* Add Special Meal Modal */}
            <Modal
                visible={showAddMealModal}
                transparent
                animationType="slide"
                onRequestClose={handleCloseAddMealModal}
            >
                <View style={styles.centeredModalOverlay}>
                    <View style={styles.addMealModalContainer}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderContent}>
                                <Text style={styles.modalTitle}>Add Special Meal</Text>
                                <Text style={styles.modalSubtitle}>
                                    Schedule a special meal for a specific date
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleCloseAddMealModal}
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
                            {/* Date */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Date</Text>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowMealDatePicker(true)}
                                >
                                    <Text
                                        style={[
                                            styles.dateInputText,
                                            !mealDate && styles.placeholder,
                                        ]}
                                    >
                                        {mealDate || 'mm/dd/yyyy'}
                                    </Text>
                                    <Ionicons
                                        name="calendar-outline"
                                        size={20}
                                        color={theme.colors.textSecondary}
                                    />
                                </TouchableOpacity>
                                {renderDatePicker(showMealDatePicker, () =>
                                    setShowMealDatePicker(false)
                                )}
                            </View>

                            {/* Meal Type */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Meal Type</Text>
                                <TouchableOpacity
                                    style={styles.mealTypeDropdown}
                                    onPress={() => setShowMealTypeDropdown(true)}
                                >
                                    <Text
                                        style={[
                                            styles.mealTypeDropdownText,
                                            !mealType && styles.placeholder,
                                        ]}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        {mealType || 'Select meal type'}
                                    </Text>
                                    <Ionicons
                                        name="chevron-down"
                                        size={20}
                                        color={theme.colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Meal Type Modal */}
                            <Modal
                                visible={showMealTypeDropdown}
                                transparent
                                animationType="slide"
                                onRequestClose={() => setShowMealTypeDropdown(false)}
                            >
                                <TouchableOpacity
                                    style={styles.modalOverlay}
                                    activeOpacity={1}
                                    onPress={() => setShowMealTypeDropdown(false)}
                                >
                                    <View
                                        style={styles.mealTypeModalContainer}
                                        onStartShouldSetResponder={() => true}
                                    >
                                        <View style={styles.mealTypeModalHeader}>
                                            <Text style={styles.mealTypeModalTitle}>Select Meal Type</Text>
                                            <TouchableOpacity
                                                onPress={() => setShowMealTypeDropdown(false)}
                                                style={styles.closeButton}
                                            >
                                                <Ionicons name="close" size={24} color={theme.colors.text} />
                                            </TouchableOpacity>
                                        </View>
                                        <FlatList
                                            data={MEAL_TYPES}
                                            keyExtractor={(item) => item}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.mealTypeModalItem,
                                                        mealType === item &&
                                                        styles.mealTypeModalItemSelected,
                                                    ]}
                                                    onPress={() => {
                                                        setMealType(item);
                                                        setShowMealTypeDropdown(false);
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.mealTypeModalItemText,
                                                            mealType === item &&
                                                            styles.mealTypeModalItemTextSelected,
                                                        ]}
                                                    >
                                                        {item}
                                                    </Text>
                                                    {mealType === item && (
                                                        <Ionicons
                                                            name="checkmark"
                                                            size={20}
                                                            color={theme.colors.secondary}
                                                        />
                                                    )}
                                                </TouchableOpacity>
                                            )}
                                        />
                                    </View>
                                </TouchableOpacity>
                            </Modal>

                            {/* Menu Items */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Menu Items</Text>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="List the special menu items..."
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={menuItems}
                                    onChangeText={setMenuItems}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* Allergens */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Allergens (optional)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g., Nuts, Dairy, Gluten"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={allergens}
                                    onChangeText={setAllergens}
                                />
                            </View>
                        </ScrollView>

                        {/* Modal Footer */}
                        <View style={styles.centeredModalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleCloseAddMealModal}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    (!mealDate || !mealType) && styles.submitButtonDisabled,
                                ]}
                                onPress={handleAddMeal}
                                disabled={!mealDate || !mealType}
                            >
                                <Text style={styles.submitButtonText}>Add Special Meal</Text>
                            </TouchableOpacity>
                        </View>
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
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
    },
    headerContent: {
        flex: 1,
        marginHorizontal: theme.spacing.md,
    },
    headerTitle: {
        ...theme.typography.h2,
        marginBottom: theme.spacing.xs,
    },
    headerSubtitle: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
    },
    viewModeButton: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    viewModeButtonActive: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    addMealButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
        gap: theme.spacing.xs,
    },
    addMealButtonText: {
        ...theme.typography.body,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    emptyStateContainer: {
        marginTop: theme.spacing.lg,
    },
    emptyStateCard: {
        minHeight: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateContent: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    emptyStateIconContainer: {
        position: 'relative',
        marginBottom: theme.spacing.lg,
    },
    greenDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.success,
        borderWidth: 2,
        borderColor: theme.colors.surface,
    },
    emptyStateText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    centeredModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    datePickerContainer: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        padding: theme.spacing.md,
        width: '100%',
        maxWidth: 600,
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
    },
    dateCellText: {
        ...theme.typography.body,
        fontSize: 14,
    },
    todayCell: {
        borderRadius: 20,
        backgroundColor: theme.colors.background,
    },
    selectedDateCell: {
        borderRadius: 20,
        backgroundColor: theme.colors.secondary,
    },
    selectedDateText: {
        color: theme.colors.surface,
        fontWeight: '600',
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
    addMealModalContainer: {
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
        alignItems: 'flex-start',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalHeaderContent: {
        flex: 1,
        marginRight: theme.spacing.md,
    },
    modalTitle: {
        ...theme.typography.h3,
        marginBottom: theme.spacing.xs,
    },
    modalSubtitle: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
    },
    closeButton: {
        padding: theme.spacing.xs,
    },
    modalContent: {
        flex: 1,
    },
    modalScrollContent: {
        padding: theme.spacing.lg,
    },
    formSection: {
        marginBottom: theme.spacing.lg,
    },
    formSectionWithDropdown: {
        marginTop: 320,
    },
    label: {
        ...theme.typography.body,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
        color: theme.colors.text,
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
    mealTypeContainer: {
        position: 'relative',
        zIndex: 1000,
    },
    mealTypeDropdown: {
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
    mealTypeDropdownText: {
        ...theme.typography.body,
        flex: 1,
    },
    mealTypeModalContainer: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        width: '100%',
        maxWidth: 600,
        maxHeight: '60%',
        ...theme.shadows.card,
    },
    mealTypeModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    mealTypeModalTitle: {
        ...theme.typography.h3,
    },
    mealTypeModalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    mealTypeModalItemSelected: {
        backgroundColor: '#fff7ed',
    },
    mealTypeModalItemText: {
        ...theme.typography.body,
    },
    mealTypeModalItemTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
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
    centeredModalFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
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
});
