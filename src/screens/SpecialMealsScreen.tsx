import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    FlatList,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { UnifiedCalendar, type CalendarWidgetEvent } from '../components/UnifiedCalendar';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '../contexts/CompanyContext';

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

function normalizeMealTypeForForm(raw: string): string {
    const found = MEAL_TYPES.find((t) => t.toLowerCase() === String(raw).toLowerCase());
    return found ?? raw;
}

function isoDateToMmDdYyyy(iso: string): string {
    const parts = String(iso).split('T')[0].split('-');
    if (parts.length !== 3) return '';
    const [y, m, d] = parts;
    return `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
}

export const SpecialMealsScreen = ({ navigation }: SpecialMealsScreenProps) => {
    const { companyId, season } = useCompany();
    const queryClient = useQueryClient();

    const [showAddMealModal, setShowAddMealModal] = useState(false);
    const [editingMealId, setEditingMealId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

    // Add Meal Modal States
    const [mealDate, setMealDate] = useState('');
    const [mealType, setMealType] = useState('');
    const [menuItems, setMenuItems] = useState('');
    const [allergens, setAllergens] = useState('');
    const [showMealDatePicker, setShowMealDatePicker] = useState(false);
    const [showMealTypeDropdown, setShowMealTypeDropdown] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Date picker state
    const [mealDatePickerMonth, setMealDatePickerMonth] = useState(new Date().getMonth());
    const [mealDatePickerYear, setMealDatePickerYear] = useState(new Date().getFullYear());
    const [mealToDelete, setMealToDelete] = useState<any>(null);
    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);

    // Fetch special meals from Supabase
    const { data: specialMeals = [], isLoading: isLoadingMeals } = useQuery({
        queryKey: ['special_meals', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('special_meals')
                .select('*')
                .eq('company_id', companyId)
                .or(`season.eq.${season},season.is.null`)
                .order('date', { ascending: true });
            if (error) throw error;
            return (data || []).map((meal: any) => ({
                ...meal,
                // Backward-compatible mapping in case legacy data had menu_items.
                items: meal.items ?? meal.menu_items ?? '',
            }));
        },
        enabled: !!companyId,
    });

    // Add special meal mutation
    const addMealMutation = useMutation({
        mutationFn: async (mealData: any) => {
            // Convert mm/dd/yyyy to yyyy-mm-dd
            const parts = mealData.date.split('/');
            const isoDate = `${parts[2]}-${parts[0]}-${parts[1]}`;
            const { data, error } = await supabase
                .from('special_meals')
                .insert([{
                    company_id: companyId,
                    season: season,
                    date: isoDate,
                    meal_type: mealData.mealType,
                    items: mealData.menuItems,
                    allergens: mealData.allergens || null,
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['special_meals'] });
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to add special meal');
        },
    });

    const updateMealMutation = useMutation({
        mutationFn: async (payload: { id: string; date: string; mealType: string; menuItems: string; allergens: string }) => {
            const parts = payload.date.split('/');
            const isoDate = `${parts[2]}-${parts[0]}-${parts[1]}`;
            const { error } = await supabase
                .from('special_meals')
                .update({
                    date: isoDate,
                    meal_type: payload.mealType,
                    items: payload.menuItems,
                    allergens: payload.allergens || null,
                })
                .eq('id', payload.id)
                .eq('company_id', companyId!);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['special_meals'] });
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to update special meal');
        },
    });

    const deleteMealMutation = useMutation({
        mutationFn: async (mealId: string) => {
            const { error } = await supabase
                .from('special_meals')
                .delete()
                .eq('id', mealId)
                .eq('company_id', companyId!);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['special_meals'] });
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to delete special meal');
        },
    });

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

    const openAddMealModal = () => {
        setEditingMealId(null);
        setMealDate('');
        setMealType('');
        setMenuItems('');
        setAllergens('');
        setShowAddMealModal(true);
    };

    const openEditMeal = (meal: any) => {
        setEditingMealId(meal.id);
        setMealDate(isoDateToMmDdYyyy(meal.date));
        setMealType(normalizeMealTypeForForm(meal.meal_type));
        setMenuItems(meal.items ?? meal.menu_items ?? '');
        setAllergens(meal.allergens ?? '');
        setShowAddMealModal(true);
    };

    const handleSaveMeal = () => {
        if (!companyId || !season) {
            Alert.alert('Context missing', 'Company or season is not loaded yet.');
            return;
        }
        if (!mealDate || !mealType || !menuItems.trim()) {
            Alert.alert('Validation', 'Please fill Date, Meal Type, and Menu Items');
            return;
        }
        const payload = { date: mealDate, mealType, menuItems, allergens };
        const onDone = (message: string) => {
            setMealDate('');
            setMealType('');
            setMenuItems('');
            setAllergens('');
            setEditingMealId(null);
            setShowAddMealModal(false);
            Alert.alert('Success', message);
        };

        if (editingMealId) {
            updateMealMutation.mutate(
                { id: editingMealId, ...payload },
                { onSuccess: () => onDone('Special meal updated successfully') }
            );
        } else {
            addMealMutation.mutate(payload, {
                onSuccess: () => onDone('Special meal added successfully'),
            });
        }
    };

    const handleDeleteMeal = (meal: any) => {
        setMealToDelete(meal);
        setIsDeleteConfirmVisible(true);
    };

    const closeDeleteConfirmModal = () => {
        if (deleteMealMutation.isPending) return;
        setIsDeleteConfirmVisible(false);
        setMealToDelete(null);
    };

    const handleConfirmDelete = () => {
        const id = mealToDelete?.id;
        if (!id) return;
        deleteMealMutation.mutate(id, {
            onSuccess: () => {
                setIsDeleteConfirmVisible(false);
                setMealToDelete(null);
            },
        });
    };

    const handleCloseAddMealModal = () => {
        setMealDate('');
        setMealType('');
        setMenuItems('');
        setAllergens('');
        setEditingMealId(null);
        setShowAddMealModal(false);
    };

    const groupedMeals = useMemo(() => {
        return (specialMeals || []).reduce((acc: Record<string, any[]>, meal: any) => {
            if (!acc[meal.date]) acc[meal.date] = [];
            acc[meal.date].push(meal);
            return acc;
        }, {});
    }, [specialMeals]);

    const calendarWidgetEvents = useMemo<CalendarWidgetEvent[]>(
        () =>
            (specialMeals || [])
                .filter((meal: any) => meal?.date)
                .map((meal: any) => {
                    const parts = [meal.meal_type, meal.items].filter(Boolean);
                    return {
                        id: String(meal.id),
                        title: parts.length ? parts.join(': ') : 'Special Meal',
                        date: new Date(`${meal.date}T00:00:00`),
                        time: '',
                        location: '',
                        type: 'special-event',
                        accent: { bg: '#fef3c7', text: '#92400e', marker: '#f59e0b' },
                    };
                }),
        [specialMeals],
    );

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
                        onPress={openAddMealModal}
                    >
                        <Ionicons name="add" size={20} color={theme.colors.surface} />
                        <Text style={styles.addMealButtonText}>Add Special Meal</Text>
                    </TouchableOpacity>
                </View>

                {/* Meals List / Empty State */}
                {isLoadingMeals ? (
                    <View style={styles.emptyStateContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : specialMeals.length === 0 ? (
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
                ) : (
                    viewMode === 'calendar' ? (
                        <UnifiedCalendar
                            events={calendarWidgetEvents}
                            currentDate={currentDate}
                            onCurrentDateChange={setCurrentDate}
                            selectedDate={selectedDate}
                            onSelectedDateChange={setSelectedDate}
                            onEventPress={(evt) => {
                                const meal = (specialMeals as any[]).find(
                                    (m) => String(m.id) === String(evt.id)
                                );
                                if (meal) openEditMeal(meal);
                            }}
                            onDatePress={(date) => {
                                setEditingMealId(null);
                                setMealDate(formatDate(date));
                                setMealType('');
                                setMenuItems('');
                                setAllergens('');
                                setShowAddMealModal(true);
                            }}
                            views={['Month', 'Week', 'Day', 'Agenda']}
                            showZoom={true}
                            showNavigation={true}
                        />
                    ) : (
                        <View style={styles.emptyStateContainer}>
                            {Object.entries(groupedMeals).map(([date, meals]) => (
                                <StyledCard key={date} style={styles.dayGroupCard}>
                                    <Text style={styles.dayGroupTitle}>
                                        {new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </Text>
                                    {(meals as any[]).map((meal: any) => (
                                        <View key={meal.id} style={styles.mealRow}>
                                            <View style={styles.mealRowMain}>
                                                <View style={styles.mealTagsRow}>
                                                    <View style={styles.mealBadge}>
                                                        <Text style={styles.mealBadgeText}>
                                                            {normalizeMealTypeForForm(meal.meal_type)}
                                                        </Text>
                                                    </View>
                                                    {meal.allergens ? (
                                                        <View style={styles.mealAllergenBadge}>
                                                            <Text style={styles.mealAllergenBadgeText}>
                                                                Contains: {meal.allergens}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                                <Text style={styles.mealItemsText}>{meal.items}</Text>
                                            </View>
                                            <View style={styles.mealRowActions}>
                                                <TouchableOpacity
                                                    style={styles.mealRowActionBtn}
                                                    onPress={() => openEditMeal(meal)}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                    accessibilityLabel="Edit meal"
                                                >
                                                    <Ionicons
                                                        name="create-outline"
                                                        size={20}
                                                        color={theme.colors.text}
                                                    />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.mealRowActionBtn}
                                                    onPress={() => handleDeleteMeal(meal)}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                    accessibilityLabel="Delete meal"
                                                >
                                                    <Ionicons
                                                        name="trash-outline"
                                                        size={20}
                                                        color={theme.colors.danger}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </StyledCard>
                            ))}
                        </View>
                    )
                )}
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
                                <Text style={styles.modalTitle}>
                                    {editingMealId ? 'Edit Special Meal' : 'Add Special Meal'}
                                </Text>
                                <Text style={styles.modalSubtitle}>
                                    {editingMealId
                                        ? 'Update the special meal details'
                                        : 'Schedule a special meal for a specific date'}
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
                                presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
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
                                    (!mealDate ||
                                        !mealType ||
                                        !menuItems.trim() ||
                                        addMealMutation.isPending ||
                                        updateMealMutation.isPending) &&
                                        styles.submitButtonDisabled,
                                ]}
                                onPress={handleSaveMeal}
                                disabled={
                                    !mealDate ||
                                    !mealType ||
                                    !menuItems.trim() ||
                                    addMealMutation.isPending ||
                                    updateMealMutation.isPending
                                }
                            >
                                <Text style={styles.submitButtonText}>
                                    {editingMealId ? 'Update Special Meal' : 'Add Special Meal'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirm Modal */}
            <Modal
                visible={isDeleteConfirmVisible}
                transparent
                animationType="fade"
                onRequestClose={closeDeleteConfirmModal}
            >
                <View style={styles.centeredModalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={closeDeleteConfirmModal}
                    />
                    <View style={styles.deleteModalContent}>
                        <Text style={styles.deleteModalTitle}>Delete special meal?</Text>
                        <Text style={styles.deleteModalMessage}>
                            This cannot be undone.
                        </Text>
                        <View style={styles.deleteModalActions}>
                            <TouchableOpacity
                                style={styles.deleteModalCancelBtn}
                                onPress={closeDeleteConfirmModal}
                                disabled={deleteMealMutation.isPending}
                            >
                                <Text style={styles.deleteModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.deleteModalConfirmBtn, deleteMealMutation.isPending && { opacity: 0.7 }]}
                                onPress={handleConfirmDelete}
                                disabled={deleteMealMutation.isPending}
                            >
                                {deleteMealMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.deleteModalConfirmText}>Delete</Text>
                                )}
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
    dayGroupCard: {
        marginBottom: theme.spacing.md,
        padding: theme.spacing.md,
    },
    dayGroupTitle: {
        ...theme.typography.h3,
        marginBottom: theme.spacing.sm,
    },
    mealRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    mealRowMain: {
        flex: 1,
        minWidth: 0,
    },
    mealTagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
    },
    mealBadge: {
        backgroundColor: '#eff6ff',
        borderRadius: theme.borderRadius.sm,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
    },
    mealBadgeText: {
        ...theme.typography.bodySmall,
        color: '#1d4ed8',
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    mealAllergenBadge: {
        backgroundColor: '#fef2f2',
        borderRadius: theme.borderRadius.sm,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
    },
    mealAllergenBadgeText: {
        fontSize: 12,
        color: theme.colors.danger,
        fontWeight: '600',
    },
    mealItemsText: {
        ...theme.typography.body,
        color: theme.colors.text,
    },
    mealRowActions: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 2,
        flexShrink: 0,
    },
    mealRowActionBtn: {
        padding: theme.spacing.xs,
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        zIndex: 1000,
    },
    centeredModalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
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
        // removed flex: 1 to prevent collapse on mobile
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
    deleteModalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '85%',
        maxWidth: 360,
        padding: theme.spacing.lg,
        ...theme.shadows.card,
    },
    deleteModalTitle: {
        ...theme.typography.h3,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
    },
    deleteModalMessage: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
    },
    deleteModalActions: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    deleteModalCancelBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
    },
    deleteModalCancelText: {
        ...theme.typography.body,
        color: theme.colors.text,
        fontWeight: '600',
    },
    deleteModalConfirmBtn: {
        flex: 1,
        backgroundColor: theme.colors.danger,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
    },
    deleteModalConfirmText: {
        ...theme.typography.body,
        color: theme.colors.surface,
        fontWeight: '600',
    },
});
