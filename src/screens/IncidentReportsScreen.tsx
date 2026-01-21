import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
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

    const handleCloseAddIncident = () => {
        setShowAddIncidentModal(false);
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
                                <View style={styles.childrenList}>
                                    {['Abby Weiss', 'Adam Elliott', 'Addison Brewer', 'Adrianna Gelb', 'Aiden Feld', 'Aiden Leon'].map((child) => (
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
                                </View>
                            </View>

                            {/* Date Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Date</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.inputField}
                                        value="01/21/2026"
                                        editable={false}
                                    />
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </View>
                            </View>

                            {/* Type Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Type</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.inputField}
                                        placeholder="Select Incident type"
                                        placeholderTextColor={theme.colors.textSecondary}
                                    />
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </View>
                            </View>

                            {/* Severity Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Severity</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.inputField}
                                        value="Medium"
                                        editable={false}
                                    />
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                </View>
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
                                <TextInput
                                    style={styles.inputField}
                                    placeholder="Enter reporter name"
                                    placeholderTextColor={theme.colors.textSecondary}
                                />
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
    },
    childrenList: {
        marginTop: theme.spacing.sm,
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
});

