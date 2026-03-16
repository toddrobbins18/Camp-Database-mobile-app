import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { useAddMenuItem } from '../api/menu';

export const AddMenuItemScreen = ({ navigation }: any) => {
    const { companyId } = useCompany();
    const addMenuItemMutation = useAddMenuItem();
    const [menuDate, setMenuDate] = useState(new Date());
    const [mealType, setMealType] = useState('');
    const [menuItems, setMenuItems] = useState('');
    const [allergens, setAllergens] = useState('');
    const [showMealTypePicker, setShowMealTypePicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

    const formatDate = (date: Date): string => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    const dateToISO = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    const handleSave = () => {
        if (!companyId) {
            Alert.alert('Error', 'Company not loaded.');
            return;
        }
        const meal = (mealType || '').trim().toLowerCase();
        if (!meal || !['breakfast', 'lunch', 'dinner', 'snack'].includes(meal)) {
            Alert.alert('Required', 'Please select a meal type.');
            return;
        }
        if (!(menuItems || '').trim()) {
            Alert.alert('Required', 'Please enter menu items.');
            return;
        }
        addMenuItemMutation.mutate(
            {
                company_id: companyId,
                date: dateToISO(menuDate),
                meal_type: meal,
                items: (menuItems || '').trim(),
                allergens: (allergens || '').trim() || null,
            },
            {
                onSuccess: () => {
                    navigation.goBack();
                },
                onError: (err: any) => {
                    Alert.alert('Error', err?.message || 'Failed to add menu item.');
                },
            }
        );
    };

    const handleCancel = () => {
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleCancel}>
                        <Ionicons name="arrow-back" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Add Menu Item</Text>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Title Section */}
                <View style={styles.titleSection}>
                    <Text style={styles.title}>Add Menu Item</Text>
                    <Text style={styles.subtitle}>Add a new item to the menu</Text>
                </View>

                {/* Form Card */}
                <StyledCard style={styles.formCard}>
                    {/* Date Section */}
                    <View style={styles.formSection}>
                        <Text style={styles.formLabel}>Date</Text>
                        <TouchableOpacity 
                            style={styles.inputContainer}
                            onPress={() => setShowDatePicker(true)}
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
                            onPress={() => setShowMealTypePicker(true)}
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
                            value={menuItems}
                            onChangeText={setMenuItems}
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

                    {/* Action Buttons */}
                    <View style={styles.formActions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, addMenuItemMutation.isPending && styles.saveBtnDisabled]}
                            onPress={handleSave}
                            disabled={addMenuItemMutation.isPending}
                        >
                            {addMenuItemMutation.isPending ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.saveBtnText}>Add Menu Item</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </StyledCard>
            </ScrollView>

            {/* Date Picker Modal */}
            <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDatePicker(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
                    <Pressable style={styles.pickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Date</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.datePickerContainer}>
                            {/* Month Selection */}
                            <View style={styles.dateSection}>
                                <Text style={styles.dateSectionTitle}>Month</Text>
                                <View style={styles.dateOptionsRow}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                                        <TouchableOpacity
                                            key={month}
                                            style={[
                                                styles.dateOption,
                                                menuDate.getMonth() + 1 === month && styles.dateOptionSelected
                                            ]}
                                            onPress={() => {
                                                const newDate = new Date(menuDate);
                                                newDate.setMonth(month - 1);
                                                setMenuDate(newDate);
                                            }}
                                        >
                                            <Text style={[
                                                styles.dateOptionText,
                                                menuDate.getMonth() + 1 === month && styles.dateOptionTextSelected
                                            ]}>
                                                {month}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Day Selection */}
                            <View style={styles.dateSection}>
                                <Text style={styles.dateSectionTitle}>Day</Text>
                                <View style={styles.dateOptionsRow}>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                        <TouchableOpacity
                                            key={day}
                                            style={[
                                                styles.dateOption,
                                                menuDate.getDate() === day && styles.dateOptionSelected
                                            ]}
                                            onPress={() => {
                                                const newDate = new Date(menuDate);
                                                newDate.setDate(day);
                                                setMenuDate(newDate);
                                            }}
                                        >
                                            <Text style={[
                                                styles.dateOptionText,
                                                menuDate.getDate() === day && styles.dateOptionTextSelected
                                            ]}>
                                                {day}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Year Selection */}
                            <View style={styles.dateSection}>
                                <Text style={styles.dateSectionTitle}>Year</Text>
                                <View style={styles.dateOptionsRow}>
                                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                                        <TouchableOpacity
                                            key={year}
                                            style={[
                                                styles.dateOption,
                                                menuDate.getFullYear() === year && styles.dateOptionSelected
                                            ]}
                                            onPress={() => {
                                                const newDate = new Date(menuDate);
                                                newDate.setFullYear(year);
                                                setMenuDate(newDate);
                                            }}
                                        >
                                            <Text style={[
                                                styles.dateOptionText,
                                                menuDate.getFullYear() === year && styles.dateOptionTextSelected
                                            ]}>
                                                {year}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>
                        <TouchableOpacity 
                            style={styles.pickerConfirmBtn}
                            onPress={() => setShowDatePicker(false)}
                        >
                            <Text style={styles.pickerConfirmBtnText}>Confirm</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Meal Type Picker Modal */}
            <Modal
                visible={showMealTypePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowMealTypePicker(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowMealTypePicker(false)}>
                    <Pressable style={styles.pickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Meal Type</Text>
                            <TouchableOpacity onPress={() => setShowMealTypePicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.pickerContent}>
                            {mealTypes.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        setMealType(type);
                                        setShowMealTypePicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{type}</Text>
                                    {mealType === type && (
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
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    headerTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '600',
        color: theme.colors.text,
    },
    headerSpacer: {
        width: 28,
    },
    titleSection: {
        marginBottom: theme.spacing.lg,
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
    formCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
    },
    formSection: {
        marginBottom: theme.spacing.lg,
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
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginTop: theme.spacing.lg,
    },
    cancelBtn: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    cancelBtnText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    saveBtn: {
        flex: 1,
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    saveBtnDisabled: {
        opacity: 0.7,
    },
    saveBtnText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
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
});

