import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

export const IncidentReportsScreen = ({ navigation }: any) => {
    const [showBottomSheet, setShowBottomSheet] = useState(false);
    const [showAddIncidentModal, setShowAddIncidentModal] = useState(false);
    const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    
    // Form state
    const [date, setDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [incidentType, setIncidentType] = useState<string>('');
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [severity, setSeverity] = useState<string>('');
    const [showSeverityPicker, setShowSeverityPicker] = useState(false);
    const [description, setDescription] = useState<string>('');
    const [reportedBy, setReportedBy] = useState<string>('');
    
    // Options
    const incidentTypes = ['Accident', 'Behavior', 'Medical', 'Injury', 'Other'];
    const severityLevels = ['Low', 'Medium', 'High', 'Critical'];

    const handleUploadCSV = () => {
        setShowBottomSheet(true);
    };

    const handleCloseBottomSheet = () => {
        setShowBottomSheet(false);
    };

    const handleSelectOption = (option: string) => {
        // TODO: Handle file selection
        console.log('Selected:', option);
        setShowBottomSheet(false);
    };

    const handleAddIncident = () => {
        setShowAddIncidentModal(true);
    };


    const toggleChildSelection = (childName: string) => {
        setSelectedChildren(prev => 
            prev.includes(childName) 
                ? prev.filter(name => name !== childName)
                : [...prev, childName]
        );
    };

    const handleAddTag = () => {
        if (tagInput.trim()) {
            setTags(prev => [...prev, tagInput.trim()]);
            setTagInput('');
        }
    };

    // Date formatting helper
    const formatDate = (date: Date): string => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    // Handle date selection
    const handleDateSelect = (selectedDate: Date) => {
        setDate(selectedDate);
        setShowDatePicker(false);
    };

    // Handle type selection
    const handleTypeSelect = (type: string) => {
        setIncidentType(type);
        setShowTypePicker(false);
    };

    // Handle severity selection
    const handleSeveritySelect = (sev: string) => {
        setSeverity(sev);
        setShowSeverityPicker(false);
    };

    // Reset form when modal closes
    const handleCloseAddIncident = () => {
        setShowAddIncidentModal(false);
        // Reset form fields
        setSelectedChildren([]);
        setDate(new Date());
        setIncidentType('');
        setSeverity('');
        setDescription('');
        setReportedBy('');
        setTags([]);
        setTagInput('');
    };

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

                {/* Title and Description Section */}
                <View style={styles.titleSection}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Incident Reports</Text>
                        <Text style={styles.subtitle}>Track and manage incident reports</Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity style={styles.helpIcon}>
                            <Ionicons name="help-circle-outline" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadCSV}>
                            <Ionicons name="cloud-upload-outline" size={18} color="white" />
                            <Text style={styles.uploadBtnText}>Upload CSV</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.addBtn} onPress={handleAddIncident}>
                            <Ionicons name="add" size={18} color="white" />
                            <Text style={styles.addBtnText}>Add Incident</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Main Content Card */}
                <StyledCard style={styles.contentCard}>
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No incident reports found</Text>
                    </View>
                </StyledCard>

            </ScrollView>

            {/* Bottom Sheet Modal */}
            <Modal
                visible={showBottomSheet}
                transparent={true}
                animationType="slide"
                onRequestClose={handleCloseBottomSheet}
            >
                <Pressable style={styles.modalOverlay} onPress={handleCloseBottomSheet}>
                    <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
                        {/* Bottom Sheet Header */}
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select file</Text>
                        </View>

                        {/* Bottom Sheet Options */}
                        <View style={styles.bottomSheetContent}>
                            <TouchableOpacity 
                                style={styles.bottomSheetOption}
                                onPress={() => handleSelectOption('Aloha downloads')}
                            >
                                <Ionicons name="folder-outline" size={24} color={theme.colors.secondary} />
                                <Text style={styles.bottomSheetOptionText}>Aloha downloads</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.bottomSheetOption}
                                onPress={() => handleSelectOption('Other files')}
                            >
                                <Ionicons name="document-text-outline" size={24} color={theme.colors.secondary} />
                                <Text style={styles.bottomSheetOptionText}>Other files</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Add Incident Modal */}
            <Modal
                visible={showAddIncidentModal}
                transparent={true}
                animationType="slide"
                onRequestClose={handleCloseAddIncident}
            >
                <Pressable style={styles.modalOverlay} onPress={handleCloseAddIncident}>
                    <Pressable style={styles.addIncidentModal} onPress={(e) => e.stopPropagation()}>
                        <ScrollView style={styles.addIncidentScroll} showsVerticalScrollIndicator={false}>
                            {/* Modal Header */}
                            <View style={styles.addIncidentHeader}>
                                <Text style={styles.addIncidentTitle}>Add Incident Report</Text>
                                <TouchableOpacity onPress={handleCloseAddIncident}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Children Involved Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Children Involved *</Text>
                                <View style={styles.searchContainer}>
                                    <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search children..."
                                        placeholderTextColor={theme.colors.textSecondary}
                                    />
                                </View>
                                <ScrollView 
                                    style={styles.childrenList}
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={true}
                                >
                                    {[
                                        'Abby Weiss', 
                                        'Adam Elliott', 
                                        'Addison Brewer', 
                                        'Adrianna Gelb', 
                                        'Aiden Feld', 
                                        'Aiden Leon',
                                        'Alexandra Stone',
                                        'Amelia Chen',
                                        'Andrew Martinez',
                                        'Anna Johnson'
                                    ].map((child) => (
                                        <TouchableOpacity 
                                            key={child} 
                                            style={styles.childItem}
                                            onPress={() => toggleChildSelection(child)}
                                        >
                                            <View style={[styles.checkbox, selectedChildren.includes(child) && styles.checkboxChecked]}>
                                                {selectedChildren.includes(child) && (
                                                    <Ionicons name="checkmark" size={16} color="white" />
                                                )}
                                            </View>
                                            <Text style={styles.childName}>{child}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Date Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Date</Text>
                                <TouchableOpacity 
                                    style={styles.inputContainer}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <TextInput
                                        style={styles.inputField}
                                        value={formatDate(date)}
                                        editable={false}
                                        pointerEvents="none"
                                    />
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Type Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Type</Text>
                                <TouchableOpacity 
                                    style={styles.inputContainer}
                                    onPress={() => setShowTypePicker(true)}
                                >
                                    <TextInput
                                        style={styles.inputField}
                                        placeholder="Select Incident type"
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={incidentType}
                                        editable={false}
                                        pointerEvents="none"
                                    />
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Severity Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Severity</Text>
                                <TouchableOpacity 
                                    style={styles.inputContainer}
                                    onPress={() => setShowSeverityPicker(true)}
                                >
                                    <TextInput
                                        style={styles.inputField}
                                        placeholder="Select Severity"
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={severity}
                                        editable={false}
                                        pointerEvents="none"
                                    />
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Description Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Description</Text>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Describe the Incident..."
                                    placeholderTextColor={theme.colors.textSecondary}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    value={description}
                                    onChangeText={setDescription}
                                />
                            </View>

                            {/* Tags Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Tags (Optional)</Text>
                                <View style={styles.tagInputContainer}>
                                    <TextInput
                                        style={styles.tagInput}
                                        placeholder="Add tag (e.g., Verbal, Physical, Friendship)"
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={tagInput}
                                        onChangeText={setTagInput}
                                    />
                                    <TouchableOpacity style={styles.addTagBtn} onPress={handleAddTag}>
                                        <Text style={styles.addTagBtnText}>Add</Text>
                                    </TouchableOpacity>
                                </View>
                                {tags.length > 0 && (
                                    <View style={styles.tagsContainer}>
                                        {tags.map((tag, index) => (
                                            <View key={index} style={styles.tag}>
                                                <Text style={styles.tagText}>{tag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Reported By Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Reported By</Text>
                                <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.inputField}
                                    placeholder="Enter reporter name"
                                    placeholderTextColor={theme.colors.textSecondary}
                                        value={reportedBy}
                                        onChangeText={setReportedBy}
                                />
                                </View>
                            </View>

                            {/* Status Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Status</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.inputField}
                                        value="Open"
                                        editable={false}
                                    />
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </View>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.formActions}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={handleCloseAddIncident}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.submitBtn}>
                                    <Text style={styles.submitBtnText}>Add Incident</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

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
                        <View style={styles.datePickerContainer}>
                            <ScrollView style={styles.dateScrollView}>
                                {/* Month Selection */}
                                <View style={styles.dateSection}>
                                    <Text style={styles.dateSectionTitle}>Month</Text>
                                    <View style={styles.dateOptionsRow}>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                                            <TouchableOpacity
                                                key={month}
                                                style={[
                                                    styles.dateOption,
                                                    date.getMonth() + 1 === month && styles.dateOptionSelected
                                                ]}
                                                onPress={() => {
                                                    const newDate = new Date(date);
                                                    newDate.setMonth(month - 1);
                                                    setDate(newDate);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.dateOptionText,
                                                    date.getMonth() + 1 === month && styles.dateOptionTextSelected
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
                                                    date.getDate() === day && styles.dateOptionSelected
                                                ]}
                                                onPress={() => {
                                                    const newDate = new Date(date);
                                                    newDate.setDate(day);
                                                    setDate(newDate);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.dateOptionText,
                                                    date.getDate() === day && styles.dateOptionTextSelected
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
                                                    date.getFullYear() === year && styles.dateOptionSelected
                                                ]}
                                                onPress={() => {
                                                    const newDate = new Date(date);
                                                    newDate.setFullYear(year);
                                                    setDate(newDate);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.dateOptionText,
                                                    date.getFullYear() === year && styles.dateOptionTextSelected
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
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Type Picker Modal */}
            <Modal
                visible={showTypePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowTypePicker(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowTypePicker(false)}>
                    <Pressable style={styles.pickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Incident Type</Text>
                            <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.pickerContent}>
                            {incidentTypes.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={styles.pickerOption}
                                    onPress={() => handleTypeSelect(type)}
                                >
                                    <Text style={styles.pickerOptionText}>{type}</Text>
                                    {incidentType === type && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Severity Picker Modal */}
            <Modal
                visible={showSeverityPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSeverityPicker(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowSeverityPicker(false)}>
                    <Pressable style={styles.pickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Severity</Text>
                            <TouchableOpacity onPress={() => setShowSeverityPicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.pickerContent}>
                            {severityLevels.map((level) => (
                                <TouchableOpacity
                                    key={level}
                                    style={styles.pickerOption}
                                    onPress={() => handleSeveritySelect(level)}
                                >
                                    <Text style={styles.pickerOptionText}>{level}</Text>
                                    {severity === level && (
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
    headerCenter: {
        flex: 1,
        alignItems: 'center',
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
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    helpIcon: {
        padding: theme.spacing.xs,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fa8c16', // Orange color
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    uploadBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary, // Blue color
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    addBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    contentCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        minHeight: 400,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    // Bottom Sheet Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
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
    // Add Incident Modal Styles
    addIncidentModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '90%',
        paddingBottom: theme.spacing.xl,
    },
    addIncidentScroll: {
        paddingHorizontal: theme.spacing.md,
    },
    addIncidentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    addIncidentTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
        marginBottom: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        marginLeft: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    childrenList: {
        marginTop: theme.spacing.sm,
        maxHeight: 220, // Shows approximately 5 items, rest will scroll
    },
    childItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    childName: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
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
    tagInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    tagInput: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
        fontSize: 14,
        color: theme.colors.text,
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    addTagBtn: {
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        height: 44,
        justifyContent: 'center',
    },
    addTagBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.sm,
    },
    tag: {
        backgroundColor: '#e0e7ff',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    tagText: {
        fontSize: 12,
        color: theme.colors.secondary,
    },
    formActions: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.lg,
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
    submitBtn: {
        flex: 1,
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    submitBtnText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    // Picker Modal Styles
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
    datePickerContainer: {
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
        maxHeight: 400,
    },
    dateScrollView: {
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
    },
    pickerConfirmBtnText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});

