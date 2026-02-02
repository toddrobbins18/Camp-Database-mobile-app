import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

export const IncidentReportsScreen = ({ navigation }: any) => {
    const [showBottomSheet, setShowBottomSheet] = useState(false);
    const [showAddIncidentModal, setShowAddIncidentModal] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('Children');
    const [activeSubTab, setActiveSubTab] = useState('Roster');

    // Form state
    const [date, setDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [incidentType, setIncidentType] = useState<string>('');
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [severity, setSeverity] = useState<string>('');
    const [showSeverityPicker, setShowSeverityPicker] = useState(false);
    const [description, setDescription] = useState<string>('');
    const [reportedBy, setReportedBy] = useState<string>('');
    const [status, setStatus] = useState<string>('Open');
    const [showStatusPicker, setShowStatusPicker] = useState(false);

    // Options
    const incidentTypes = ['Accident', 'Behavior', 'Medical', 'Injury', 'Other'];
    const severityLevels = ['Low', 'Medium', 'High', 'Critical'];
    const statusOptions = ['Open', 'Investigating', 'Resolved', 'Closed'];

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

    // Handle status selection
    const handleStatusSelect = (stat: string) => {
        setStatus(stat);
        setShowStatusPicker(false);
    };

    // Reset form when modal closes
    const handleCloseAddIncident = () => {
        setShowAddIncidentModal(false);
        // Reset form fields
        setSelectedChildren([]);
        setDate(new Date());
        setIncidentType('');
        setSeverity('');
        setStatus('Open');
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
                        <TouchableOpacity style={styles.helpIcon} onPress={() => setShowHelpModal(true)}>
                            <Ionicons name="help-circle-outline" size={24} color={theme.colors.textSecondary} />
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

            {/* CSV Upload Format Guide Modal */}
            <Modal
                visible={showHelpModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowHelpModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowHelpModal(false)}>
                    <Pressable style={styles.guideModal} onPress={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>CSV Upload Format Guide</Text>
                            <TouchableOpacity onPress={() => setShowHelpModal(false)}>
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
                <Pressable style={styles.centerModalOverlay} onPress={handleCloseAddIncident}>
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
                                <TouchableOpacity
                                    style={styles.inputContainer}
                                    onPress={() => setShowStatusPicker(true)}
                                >
                                    <TextInput
                                        style={styles.inputField}
                                        value={status}
                                        editable={false}
                                        pointerEvents="none"
                                    />
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
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

            {/* Status Picker Modal */}
            <Modal
                visible={showStatusPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowStatusPicker(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowStatusPicker(false)}>
                    <Pressable style={styles.pickerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Status</Text>
                            <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerScroll}>
                            {statusOptions.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[
                                        styles.pickerOption,
                                        status === option && styles.pickerOptionActive
                                    ]}
                                    onPress={() => handleStatusSelect(option)}
                                >
                                    <Text style={[
                                        styles.pickerOptionText,
                                        status === option && styles.pickerOptionTextActive
                                    ]}>{option}</Text>
                                    {status === option && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
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
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
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
        flex: 1,
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
    centerModalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    bottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        height: '50%',
        width: '100%',
    },
    bottomSheetHeader: {
        marginBottom: theme.spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        borderRadius: theme.borderRadius.xl,
        height: '80%',
        width: '90%',
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
    pickerScroll: {
        paddingHorizontal: theme.spacing.md,
        maxHeight: 300,
    },
    pickerOptionActive: {
        backgroundColor: theme.colors.secondary + '10',
    },
    pickerOptionTextActive: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
});

