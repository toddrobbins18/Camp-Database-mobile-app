import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Pressable,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { MobileUserMenu } from '../components/MobileUserMenu';

import { useCompany } from '../contexts/CompanyContext';
import { useMenuItems, useAddMenuItem, MenuItem } from '../api/menu';
import { supabase } from '../lib/supabase';
import { ModalPickerOverlay } from '../components/ModalPickerOverlay';
import { UnifiedCalendar, type CalendarWidgetEvent } from '../components/UnifiedCalendar';

type AddMenuSubsheet = 'date' | 'mealType' | null;

export const MenuScreen = ({ navigation }: any) => {
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showSelectFileModal, setShowSelectFileModal] = useState(false);
    const [showAddMenuItemModal, setShowAddMenuItemModal] = useState(false);
    const [activeTab, setActiveTab] = useState('Children');
    const [activeSubTab, setActiveSubTab] = useState('Roster');
    const { companyId } = useCompany();
    const { data: menuItemsList = [] } = useMenuItems(companyId);
    const addMenuItemMutation = useAddMenuItem();
    const [itemToDelete, setItemToDelete] = useState<any>(null);
    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Add Menu Item form states
    const [menuDate, setMenuDate] = useState(new Date(2026, 0, 22));
    const [mealType, setMealType] = useState('');
    const [menuItemsText, setMenuItemsText] = useState('');
    const [allergens, setAllergens] = useState('');
    const [addMenuSubsheet, setAddMenuSubsheet] = useState<AddMenuSubsheet>(null);
    const [calendarCurrentDate, setCalendarCurrentDate] = useState(new Date());
    const [calendarSelectedDate, setCalendarSelectedDate] = useState(new Date());

    const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    const closeAddMenuTransientUi = () => {
        setAddMenuSubsheet(null);
    };

    const handleUploadCSV = () => {
        setShowSelectFileModal(true);
    };

    const handleAddMenuItem = () => {
        closeAddMenuTransientUi();
        setShowAddMenuItemModal(true);
    };

    const handleSelectFileOption = (option: string) => {
        console.log('Selected:', option);
        setShowSelectFileModal(false);
        // TODO: Handle file selection
    };

    const formatDate = (date: Date): string => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    const handleCloseAddMenuItem = () => {
        closeAddMenuTransientUi();
        setShowAddMenuItemModal(false);
        // Reset form
        setMenuDate(new Date(2026, 0, 22));
        setMealType('');
        setMenuItemsText('');
        setAllergens('');
    };

    const handleSaveMenuItem = () => {
        if (!mealType || !menuItemsText.trim() || !companyId) {
            // Basic validation - could show an alert here
            return;
        }

        const formattedDate = `${menuDate.getFullYear()}-${String(menuDate.getMonth() + 1).padStart(2, '0')}-${String(menuDate.getDate()).padStart(2, '0')}`;

        addMenuItemMutation.mutate({
            company_id: companyId,
            date: formattedDate,
            meal_type: mealType,
            items: menuItemsText.trim(),
            allergens: allergens.trim() || null,
        }, {
            onSuccess: handleCloseAddMenuItem
        });
    };

    const handleDeleteMenuItemPress = (item: MenuItem) => {
        setItemToDelete(item);
        setIsDeleteConfirmVisible(true);
    };

    const handleDelete = async () => {
        if (!itemToDelete?.id || !companyId) return;
        setIsDeleting(true);
        console.log('[DELETE] menu_items', itemToDelete.id);
        try {
            const { error } = await supabase.from('menu_items').delete().eq('id', itemToDelete.id);
            console.log('[DELETE] menu_items response', error);
            if (error) throw error;
            await queryClient.invalidateQueries({ queryKey: ['menu_items', companyId] });
            await queryClient.invalidateQueries({ queryKey: ['dashboard_meals'] });
            Alert.alert('Success', 'Menu item deleted.');
        } catch (error: any) {
            Alert.alert('Delete failed', error?.message ?? 'Unknown error');
        } finally {
            setIsDeleting(false);
            setIsDeleteConfirmVisible(false);
            setItemToDelete(null);
        }
    };

    const getMealTypeColor = (type?: string) => {
        if (!type) return '#f3f4f6';
        switch (type.toLowerCase()) {
            case 'breakfast':
                return '#fef3c7';
            case 'lunch':
                return '#dbeafe';
            case 'dinner':
                return '#e0e7ff';
            case 'snack':
                return '#fce7f3';
            default:
                return '#f3f4f6';
        }
    };

    const calendarEvents = useMemo<CalendarWidgetEvent[]>(() => {
        return menuItemsList.map((item) => {
            const parsedDate = new Date(`${item.date}T00:00:00`);
            const meal = item.meal_type || 'Meal';
            const preview = item.items?.split(',')[0]?.trim() || item.items || 'Menu item';
            return {
                id: item.id || `${item.date}-${meal}-${preview}`,
                title: `${meal}: ${preview}`,
                date: parsedDate,
                type: 'special-event',
                tags: ['Menu'],
                accent: { bg: '#eef2ff', text: '#3730a3', marker: '#4f46e5' },
            };
        });
    }, [menuItemsList]);

    const selectedDateMenuItems = useMemo(() => {
        const y = calendarSelectedDate.getFullYear();
        const m = String(calendarSelectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(calendarSelectedDate.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${d}`;
        return menuItemsList.filter((item) => item.date === key);
    }, [menuItemsList, calendarSelectedDate]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerRight}>
                        <MobileUserMenu navigation={navigation} />
                    </View>
                </View>

                {/* Title and Description Section */}
                <View style={styles.titleSection}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Menu Management</Text>
                        <Text style={styles.subtitle}>Manage daily meal menus</Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsContainer}>
                        <View style={styles.iconButton}>
                            <View style={styles.orangeIcon}>
                                <Ionicons name="calendar-outline" size={20} color="white" />
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
                        >
                            <Ionicons
                                name={viewMode === 'list' ? 'calendar-outline' : 'list-outline'}
                                size={20}
                                color={theme.colors.text}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => setShowGuideModal(true)}
                        >
                            <Ionicons name="help-circle-outline" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadCSV}>
                            <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.text} />
                            <Text style={styles.uploadBtnText}>Upload CSV</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.addBtn} onPress={handleAddMenuItem}>
                            <Ionicons name="add" size={18} color="white" />
                            <Text style={styles.addBtnText} numberOfLines={1}>Add Menu</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Main Content Card */}
                <StyledCard style={styles.contentCard}>
                    {viewMode === 'calendar' ? (
                        <View>
                            <UnifiedCalendar
                                events={calendarEvents}
                                currentDate={calendarCurrentDate}
                                onCurrentDateChange={setCalendarCurrentDate}
                                selectedDate={calendarSelectedDate}
                                onSelectedDateChange={setCalendarSelectedDate}
                                showZoom={false}
                            />
                            <View style={styles.selectedDayPanel}>
                                <Text style={styles.selectedDayTitle}>
                                    {calendarSelectedDate.toLocaleDateString(undefined, {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </Text>
                                {selectedDateMenuItems.length === 0 ? (
                                    <Text style={styles.selectedDayEmptyText}>No menu items for this date.</Text>
                                ) : (
                                    selectedDateMenuItems.map((item) => (
                                        <View key={item.id || `${item.date}-${item.meal_type}`} style={styles.selectedDayMealRow}>
                                            <Text style={styles.selectedDayMealType}>{item.meal_type}</Text>
                                            <Text style={styles.selectedDayMealItems}>{item.items}</Text>
                                        </View>
                                    ))
                                )}
                            </View>
                        </View>
                    ) : menuItemsList.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No menu items found. Add your first menu item!</Text>
                        </View>
                    ) : (
                        <View style={styles.listContainer}>
                            {menuItemsList.map((item) => (
                                <View
                                    key={item.id}
                                    style={[
                                        styles.listItem,
                                        { backgroundColor: getMealTypeColor(item.meal_type) }
                                    ]}
                                >
                                    <View style={styles.menuItemHeader}>
                                        <View style={styles.menuItemHeaderLeft}>
                                            <Text style={styles.menuItemMealType}>{item.meal_type}</Text>
                                            <Text style={styles.menuItemDate}>{item.date}</Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteMenuItemPress(item)}
                                            style={styles.deleteButton}
                                        >
                                            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={styles.menuItemText}>{item.items}</Text>
                                    {item.allergens && (
                                        <View style={styles.allergenContainer}>
                                            <Ionicons name="warning-outline" size={14} color={theme.colors.warning} />
                                            <Text style={styles.allergenText}>{item.allergens}</Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </StyledCard>

            </ScrollView>

            {/* CSV Upload Format Guide Modal */}
            <Modal
                visible={showGuideModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowGuideModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowGuideModal(false)}>
                    <Pressable style={styles.guideModal} onPress={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>CSV Upload Format Guide</Text>
                            <TouchableOpacity onPress={() => setShowGuideModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Main Tabs */}
                        <View style={styles.mainTabs}>
                            {['Children', 'Staff', 'Medical'].map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.mainTab, activeTab === tab && styles.mainTabActive]}
                                    onPress={() => {
                                        setActiveTab(tab);
                                        if (tab === 'Children') {
                                            setActiveSubTab('Roster');
                                        }
                                    }}
                                >
                                    <Text style={[styles.mainTabText, activeTab === tab && styles.mainTabTextActive]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Sub Tabs (only for Children) */}
                        {activeTab === 'Children' && (
                            <View style={styles.subTabs}>
                                {['Roster', 'Daily Notes', 'Medical'].map((subTab) => (
                                    <TouchableOpacity
                                        key={subTab}
                                        style={[styles.subTab, activeSubTab === subTab && styles.subTabActive]}
                                        onPress={() => setActiveSubTab(subTab)}
                                    >
                                        <Text style={[styles.subTabText, activeSubTab === subTab && styles.subTabTextActive]}>
                                            {subTab}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Scrollable Content */}
                        <ScrollView
                            style={styles.guideContent}
                            horizontal={true}
                            showsHorizontalScrollIndicator={true}
                            contentContainerStyle={styles.guideContentContainer}
                        >
                            <View style={styles.guideSection}>
                                <Text style={styles.sectionTitle}>
                                    {activeTab === 'Children' && activeSubTab === 'Roster' ? 'Children Roster' :
                                        activeTab === 'Children' && activeSubTab === 'Daily Notes' ? 'Daily Notes' :
                                            activeTab === 'Children' && activeSubTab === 'Medical' ? 'Children Medical' :
                                                activeTab === 'Staff' ? 'Staff' : 'Medical'}
                                </Text>
                                <Text style={styles.sectionSubtitle}>
                                    {activeTab === 'Children' && activeSubTab === 'Roster' ? 'CSV format for children roster upload' :
                                        activeTab === 'Children' && activeSubTab === 'Daily Notes' ? 'CSV format for daily notes upload' :
                                            activeTab === 'Children' && activeSubTab === 'Medical' ? 'CSV format for children medical upload' :
                                                activeTab === 'Staff' ? 'CSV format for staff upload' : 'CSV format for medical upload'}
                                </Text>

                                {/* Required Columns */}
                                <View style={styles.codeBox}>
                                    <Text style={styles.codeText}>
                                        {activeTab === 'Children' && activeSubTab === 'Roster'
                                            ? 'first_name, last_name, person_id, age, grade, gender, guardian_phone, guardian_email'
                                            : activeTab === 'Children' && activeSubTab === 'Daily Notes'
                                                ? 'date, child_id, mood, activities, meals, nap, notes'
                                                : activeTab === 'Children' && activeSubTab === 'Medical'
                                                    ? 'child_id, medical_notes, allergies, division_id, leader_id, emergency_contact'
                                                    : activeTab === 'Staff'
                                                        ? 'first_name, last_name, email, role, department, phone, hire_date'
                                                        : 'patient_id, condition, medication, notes, date'}
                                    </Text>
                                </View>

                                {/* Example Data */}
                                <View style={styles.codeBox}>
                                    <Text style={styles.codeText}>
                                        {activeTab === 'Children' && activeSubTab === 'Roster'
                                            ? 'John, Doe, P12345, 10, 5, Male, 555-1234, parent@email.com, None, Peanuts, division'
                                            : activeTab === 'Children' && activeSubTab === 'Daily Notes'
                                                ? '2026-07-15, child-uuid-123, Happy, Swimming, Breakfast, Yes, Had a great day'
                                                : activeTab === 'Children' && activeSubTab === 'Medical'
                                                    ? 'child-uuid-123, Asthma, Peanuts, division-uuid, leader-uuid, Jane Doe 555-5678'
                                                    : activeTab === 'Staff'
                                                        ? 'Jane, Smith, jane@email.com, Counselor, Activities, 555-9876, 2026-01-15'
                                                        : 'patient-uuid, Fever, Tylenol, Monitor temperature, 2026-07-15'}
                                    </Text>
                                </View>

                                {/* Important Notes */}
                                <Text style={styles.importantNote}>
                                    {activeTab === 'Children' && activeSubTab === 'Roster'
                                        ? 'REQUIRED: first_name, last_name, and person_id. All other fields are optional.'
                                        : activeTab === 'Children' && activeSubTab === 'Daily Notes'
                                            ? 'REQUIRED: date, child_id. All other fields are optional.'
                                            : activeTab === 'Children' && activeSubTab === 'Medical'
                                                ? 'REQUIRED: child_id. division_id and leader_id must be valid UUIDs from divisions and staff tables if provided.'
                                                : activeTab === 'Staff'
                                                    ? 'REQUIRED: first_name, last_name, email, role. All other fields are optional.'
                                                    : 'REQUIRED: patient_id, condition, date. All other fields are optional.'}
                                </Text>

                                {/* General Tips */}
                                <View style={styles.tipsBox}>
                                    <Text style={styles.tipsTitle}>General Tips:</Text>
                                    <Text style={styles.tipItem}>• First row must contain column names exactly as shown.</Text>
                                    <Text style={styles.tipItem}>• Use commas to separate values.</Text>
                                    <Text style={styles.tipItem}>• Use backslash before commas within text fields (e.g., "Item 1\, Item 2").</Text>
                                    <Text style={styles.tipItem}>• Leave fields empty for optional columns.</Text>
                                    <Text style={styles.tipItem}>• Maximum 1000 rows per upload.</Text>
                                    <Text style={styles.tipItem}>• Dates must be in YYYY-MM-DD format.</Text>
                                    <Text style={styles.tipItem}>• UUIDs can be obtained from the backend for existing records.</Text>
                                </View>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Select File Bottom Sheet Modal */}
            <Modal
                visible={showSelectFileModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSelectFileModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowSelectFileModal(false)}>
                    <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
                        {/* Bottom Sheet Header */}
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select file</Text>
                        </View>

                        {/* Bottom Sheet Options */}
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

            {/* Add Menu Item Modal */}
            <Modal
                visible={showAddMenuItemModal}
                transparent={true}
                animationType="slide"
                onRequestClose={handleCloseAddMenuItem}
            >
                <Pressable style={styles.centerModalOverlay} onPress={handleCloseAddMenuItem}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.addMenuItemKeyboardRoot}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
                    >
                        <Pressable style={styles.addMenuItemModal} onPress={(e) => e.stopPropagation()}>
                        <KeyboardAwareScrollView
                            style={styles.addMenuItemScroll}
                            contentContainerStyle={styles.addMenuItemScrollContent}
                            enableOnAndroid
                            enableAutomaticScroll
                            extraScrollHeight={Platform.OS === 'ios' ? 160 : 200}
                            extraHeight={32}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                        >
                            {/* Modal Header */}
                            <View style={styles.addMenuItemHeader}>
                                <View>
                                    <Text style={styles.addMenuItemTitle}>Add Menu Item</Text>
                                    <Text style={styles.addMenuItemSubtitle}>Add a new item to the menu</Text>
                                </View>
                                <TouchableOpacity onPress={handleCloseAddMenuItem}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Date Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Date</Text>
                                <TouchableOpacity
                                    style={styles.inputContainer}
                                    onPress={() => setAddMenuSubsheet('date')}
                                >
                                    <TextInput
                                        style={styles.inputField}
                                        value={formatDate(menuDate)}
                                        editable={false}
                                        pointerEvents="none"
                                    />
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Meal Type Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Meal Type</Text>
                                <TouchableOpacity
                                    style={styles.inputContainer}
                                    onPress={() => setAddMenuSubsheet('mealType')}
                                >
                                    <TextInput
                                        style={styles.inputField}
                                        placeholder="Select meal type"
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={mealType}
                                        editable={false}
                                        pointerEvents="none"
                                    />
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Menu Items Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Menu Items</Text>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="e.g., Pancakes, Fresh Fruit, Milk."
                                    placeholderTextColor={theme.colors.textSecondary}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    value={menuItemsText}
                                    onChangeText={setMenuItemsText}
                                    scrollEnabled
                                />
                            </View>

                            {/* Allergens Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Allergens (optional)</Text>
                                <TextInput
                                    style={styles.inputField}
                                    placeholder="e.g., Contains dairy, nuts."
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={allergens}
                                    onChangeText={setAllergens}
                                />
                            </View>

                            {/* Action Button */}
                            <View style={styles.formActions}>
                                <TouchableOpacity style={styles.addMenuItemBtn} onPress={handleSaveMenuItem}>
                                    <Text style={styles.addMenuItemBtnText}>Add Menu Item</Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAwareScrollView>
                        </Pressable>
                    </KeyboardAvoidingView>
                </Pressable>
                {addMenuSubsheet ? (
                    <ModalPickerOverlay
                        visible
                        onClose={() => setAddMenuSubsheet(null)}
                        title={addMenuSubsheet === 'date' ? 'Select Date' : 'Select Meal Type'}
                    >
                        {addMenuSubsheet === 'date' ? (
                            <View style={styles.datePickerContainer}>
                                <ScrollView style={{ maxHeight: 320 }}>
                                    <View style={styles.dateSection}>
                                        <Text style={styles.dateSectionTitle}>Month</Text>
                                        <View style={styles.dateOptionsRow}>
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                                                <TouchableOpacity
                                                    key={month}
                                                    style={[
                                                        styles.dateOption,
                                                        menuDate.getMonth() + 1 === month && styles.dateOptionSelected,
                                                    ]}
                                                    onPress={() => {
                                                        const next = new Date(menuDate);
                                                        next.setMonth(month - 1);
                                                        setMenuDate(next);
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.dateOptionText,
                                                            menuDate.getMonth() + 1 === month && styles.dateOptionTextSelected,
                                                        ]}
                                                    >
                                                        {month}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                    <View style={styles.dateSection}>
                                        <Text style={styles.dateSectionTitle}>Day</Text>
                                        <View style={styles.dateOptionsRow}>
                                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                                <TouchableOpacity
                                                    key={day}
                                                    style={[
                                                        styles.dateOption,
                                                        menuDate.getDate() === day && styles.dateOptionSelected,
                                                    ]}
                                                    onPress={() => {
                                                        const next = new Date(menuDate);
                                                        next.setDate(day);
                                                        setMenuDate(next);
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.dateOptionText,
                                                            menuDate.getDate() === day && styles.dateOptionTextSelected,
                                                        ]}
                                                    >
                                                        {day}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                    <View style={styles.dateSection}>
                                        <Text style={styles.dateSectionTitle}>Year</Text>
                                        <View style={styles.dateOptionsRow}>
                                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                                                <TouchableOpacity
                                                    key={year}
                                                    style={[
                                                        styles.dateOption,
                                                        menuDate.getFullYear() === year && styles.dateOptionSelected,
                                                    ]}
                                                    onPress={() => {
                                                        const next = new Date(menuDate);
                                                        next.setFullYear(year);
                                                        setMenuDate(next);
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.dateOptionText,
                                                            menuDate.getFullYear() === year && styles.dateOptionTextSelected,
                                                        ]}
                                                    >
                                                        {year}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </ScrollView>
                                <TouchableOpacity style={styles.pickerConfirmBtn} onPress={() => setAddMenuSubsheet(null)}>
                                    <Text style={styles.pickerConfirmBtnText}>Confirm</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.pickerContent}>
                                {mealTypes.map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={styles.pickerOption}
                                        onPress={() => {
                                            setMealType(type);
                                            setAddMenuSubsheet(null);
                                        }}
                                    >
                                        <Text style={styles.pickerOptionText}>{type}</Text>
                                        {mealType === type && (
                                            <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </ModalPickerOverlay>
                ) : null}
            </Modal>

            <Modal visible={isDeleteConfirmVisible} transparent animationType="fade" onRequestClose={() => { setIsDeleteConfirmVisible(false); setItemToDelete(null); }}>
                <Pressable style={styles.deleteModalOverlay} onPress={() => { setIsDeleteConfirmVisible(false); setItemToDelete(null); }}>
                    <Pressable style={styles.deleteModalContent} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.deleteModalTitle}>Confirm Delete</Text>
                        <Text style={styles.deleteModalMessage}>Are you sure you want to delete this item? This cannot be undone.</Text>
                        <View style={styles.deleteModalActions}>
                            <TouchableOpacity style={styles.deleteModalCancelBtn} onPress={() => { setIsDeleteConfirmVisible(false); setItemToDelete(null); }} disabled={isDeleting}>
                                <Text style={styles.deleteModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.deleteModalConfirmBtn, isDeleting && { opacity: 0.6 }]} onPress={handleDelete} disabled={isDeleting}>
                                {isDeleting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.deleteModalConfirmText}>Delete</Text>}
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
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleSection: {
        marginBottom: theme.spacing.lg,
    },
    titleContainer: {
        width: '100%',
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
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        flexWrap: 'wrap',
        flexShrink: 1,
    },
    iconButton: {
        padding: theme.spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
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
        flexShrink: 1,
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
        flexShrink: 1,
    },
    addBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12,
    },
    contentCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        minHeight: 400,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
    },
    emptyText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    listContainer: {
        gap: theme.spacing.md,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
    },
    listItem: {
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    gridItem: {
        width: '48%',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    selectedDayPanel: {
        marginTop: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
    },
    selectedDayTitle: {
        ...theme.typography.h3,
        fontSize: 20,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    selectedDayEmptyText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    selectedDayMealRow: {
        marginBottom: theme.spacing.sm,
    },
    selectedDayMealType: {
        ...theme.typography.body,
        fontWeight: '700',
        color: theme.colors.text,
    },
    selectedDayMealItems: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    menuItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.sm,
    },
    menuItemHeaderLeft: {
        flex: 1,
    },
    menuItemMealType: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    menuItemDate: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    deleteButton: {
        padding: theme.spacing.xs,
    },
    menuItemText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
        lineHeight: 20,
    },
    allergenContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginTop: theme.spacing.xs,
        paddingTop: theme.spacing.xs,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    allergenText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.warning,
        flex: 1,
    },
    // Modal Styles
    /** Full-screen dim behind bottom-sheet pickers; use inside RN Modal so it stacks above other modals (web). */
    pickerRootOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    centerModalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    guideModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '90%',
        paddingBottom: theme.spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        color: theme.colors.text,
    },
    mainTabs: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    mainTab: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        marginRight: theme.spacing.sm,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    mainTabActive: {
        borderBottomColor: theme.colors.secondary,
    },
    mainTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    mainTabTextActive: {
        color: theme.colors.secondary,
    },
    subTabs: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    subTab: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        marginRight: theme.spacing.sm,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    subTabActive: {
        borderBottomColor: theme.colors.secondary,
    },
    subTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    subTabTextActive: {
        color: theme.colors.secondary,
    },
    guideContent: {
        // Removed flex: 1 to prevent collapse on mobile
    },
    guideContentContainer: {
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    guideSection: {
        minWidth: 600,
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
        width: '100%',
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
    // Add Menu Item Modal Styles
    addMenuItemKeyboardRoot: {
        width: '90%',
        maxHeight: '90%',
    },
    addMenuItemModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        maxHeight: '85%',
        width: '100%',
        paddingBottom: theme.spacing.md,
        overflow: 'hidden',
    },
    addMenuItemScroll: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.md,
    },
    addMenuItemScrollContent: {
        flexGrow: 1,
        paddingBottom: theme.spacing.xl,
    },
    addMenuItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    addMenuItemTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    addMenuItemSubtitle: {
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
        color: theme.colors.text,
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
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    textArea: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        minHeight: 100,
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    formActions: {
        paddingHorizontal: theme.spacing.md,
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.lg,
    },
    addMenuItemBtn: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    addMenuItemBtnText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    // Date Picker Styles
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
    datePickerContainer: {
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
        maxHeight: 300,
    },
    dateSection: {
        marginBottom: theme.spacing.lg,
    },
    dateSectionTitle: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    dateOptionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
    },
    dateOption: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minWidth: 50,
        alignItems: 'center',
    },
    dateOptionSelected: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    dateOptionText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    dateOptionTextSelected: {
        color: 'white',
        fontWeight: '600',
    },
    pickerConfirmBtn: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
        marginHorizontal: theme.spacing.md,
    },
    pickerConfirmBtnText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    deleteModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    deleteModalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '85%', maxWidth: 340 },
    deleteModalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 8 },
    deleteModalMessage: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    deleteModalActions: { flexDirection: 'row', gap: 8 },
    deleteModalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
    deleteModalCancelText: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
    deleteModalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#dc2626', alignItems: 'center' },
    deleteModalConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

