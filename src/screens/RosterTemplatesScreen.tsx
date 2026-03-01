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
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '../contexts/CompanyContext';

interface RosterTemplatesScreenProps {
    navigation: any;
}

interface Camper {
    id: string;
    name: string;
    division: string;
}



export const RosterTemplatesScreen = ({ navigation }: RosterTemplatesScreenProps) => {
    const { companyId, season } = useCompany();
    const queryClient = useQueryClient();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCampers, setSelectedCampers] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);

    // Fetch campers from Supabase
    const { data: campers = [] } = useQuery({
        queryKey: ['children_with_division', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('children')
                .select('id, first_name, last_name, division')
                .eq('company_id', companyId)
                .order('last_name', { ascending: true });
            if (error) throw error;
            return (data || []).map((c: any) => ({
                id: c.id,
                name: `${c.first_name} ${c.last_name}`.trim(),
                division: c.division || 'Unassigned',
            }));
        },
        enabled: !!companyId,
    });

    // Fetch divisions from Supabase
    const { data: divisions = ['All Divisions'] } = useQuery({
        queryKey: ['divisions', companyId],
        queryFn: async () => {
            if (!companyId) return ['All Divisions'];
            const { data, error } = await supabase
                .from('divisions')
                .select('name')
                .eq('company_id', companyId)
                .order('name', { ascending: true });
            if (error) return ['All Divisions'];
            return ['All Divisions', ...(data || []).map((d: any) => d.name)];
        },
        enabled: !!companyId,
    });

    // Fetch existing roster templates
    const { data: existingTemplates = [], isLoading: isLoadingTemplates } = useQuery({
        queryKey: ['roster_templates', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('roster_templates')
                .select('*, roster_template_children(child_id)')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId,
    });

    // Create template mutation
    const createTemplateMutation = useMutation({
        mutationFn: async (templateData: any) => {
            // 1. Create the template
            const { data: template, error: templateError } = await supabase
                .from('roster_templates')
                .insert([{
                    company_id: companyId,
                    name: templateData.name,
                    description: templateData.description || null,
                    season: season,
                }])
                .select()
                .single();
            if (templateError) throw templateError;

            // 2. Add children to the template
            if (templateData.camperIds.length > 0) {
                const childrenRecords = templateData.camperIds.map((childId: string) => ({
                    roster_template_id: template.id,
                    child_id: childId,
                }));
                const { error: childrenError } = await supabase
                    .from('roster_template_children')
                    .insert(childrenRecords);
                if (childrenError) throw childrenError;
            }

            return template;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roster_templates'] });
            Alert.alert('Success', 'Roster template created successfully');
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to create template');
        },
    });

    const filteredCampers = campers.filter((camper: any) => {
        const matchesSearch = camper.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDivision =
            selectedDivision === 'All Divisions' || camper.division === selectedDivision;
        return matchesSearch && matchesDivision;
    });

    const handleSelectCamper = (camperId: string) => {
        setSelectedCampers((prev) =>
            prev.includes(camperId)
                ? prev.filter((id) => id !== camperId)
                : [...prev, camperId]
        );
    };

    const handleSelectAll = () => {
        if (selectedCampers.length === filteredCampers.length) {
            setSelectedCampers([]);
        } else {
            setSelectedCampers(filteredCampers.map((camper) => camper.id));
        }
    };

    const handleClear = () => {
        setSelectedCampers([]);
    };

    const handleCreateTemplate = () => {
        if (!templateName.trim()) {
            Alert.alert('Validation', 'Please enter a template name');
            return;
        }
        createTemplateMutation.mutate({
            name: templateName,
            description,
            camperIds: selectedCampers,
        });
        // Reset form
        setTemplateName('');
        setDescription('');
        setSelectedCampers([]);
        setSearchQuery('');
        setSelectedDivision('All Divisions');
        setShowCreateModal(false);
    };

    const handleCloseModal = () => {
        setTemplateName('');
        setDescription('');
        setSelectedCampers([]);
        setSearchQuery('');
        setSelectedDivision('All Divisions');
        setShowCreateModal(false);
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
                        <Text style={styles.headerTitle}>Roster Templates</Text>
                        <Text style={styles.headerSubtitle}>
                            Create and manage reusable roster templates for sporting events
                        </Text>
                    </View>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Create Template Button in Header */}
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={() => setShowCreateModal(true)}
                    >
                        <Ionicons name="add" size={20} color={theme.colors.surface} />
                        <Text style={styles.createButtonText}>Create Template</Text>
                    </TouchableOpacity>
                </View>

                {/* Empty State Card */}
                <StyledCard style={styles.emptyStateCard}>
                    <View style={styles.emptyStateContent}>
                        <View style={styles.emptyStateIconContainer}>
                            <Ionicons name="people" size={64} color={theme.colors.textSecondary} />
                            <View style={styles.greenDot} />
                        </View>
                        <Text style={styles.emptyStateTitle}>No Roster Templates Yet</Text>
                        <Text style={styles.emptyStateDescription}>
                            Create roster templates to quickly assign campers to sporting events.
                        </Text>
                        <TouchableOpacity
                            style={styles.createFirstButton}
                            onPress={() => setShowCreateModal(true)}
                        >
                            <Ionicons name="add" size={20} color={theme.colors.surface} />
                            <Text style={styles.createFirstButtonText}>Create Your First Template</Text>
                        </TouchableOpacity>
                    </View>
                </StyledCard>
            </ScrollView>

            {/* Create Roster Template Modal */}
            <Modal
                visible={showCreateModal}
                transparent
                animationType="slide"
                onRequestClose={handleCloseModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create Roster Template</Text>
                            <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalContent}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={true}
                        >
                            {/* Template Name */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>
                                    Template Name <Text style={styles.required}>*</Text>
                                </Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g., Soccer A Team"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={templateName}
                                    onChangeText={setTemplateName}
                                />
                            </View>

                            {/* Description */}
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Description (optional)</Text>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Describe this roster..."
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* Select Campers Section */}
                            <View style={styles.formSection}>
                                <View style={styles.selectCampersHeader}>
                                    <Text style={styles.label}>
                                        Select Campers ({selectedCampers.length} selected)
                                    </Text>
                                    <View style={styles.selectCampersActions}>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={handleSelectAll}
                                        >
                                            <Text style={styles.actionButtonText}>Select All</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={handleClear}
                                        >
                                            <Text style={styles.actionButtonText}>Clear</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Search and Filter Bar */}
                                <View style={styles.searchFilterBar}>
                                    <View style={styles.searchContainer}>
                                        <Ionicons
                                            name="search-outline"
                                            size={20}
                                            color={theme.colors.textSecondary}
                                            style={styles.searchIcon}
                                        />
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search campers..."
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={styles.divisionDropdownButton}
                                        onPress={() => setShowDivisionDropdown(true)}
                                    >
                                        <Text style={styles.divisionDropdownText}>
                                            {selectedDivision}
                                        </Text>
                                        <Ionicons
                                            name="chevron-down"
                                            size={20}
                                            color={theme.colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>

                                {/* Division Picker Modal */}
                                <Modal
                                    visible={showDivisionDropdown}
                                    transparent
                                    animationType="slide"
                                    onRequestClose={() => setShowDivisionDropdown(false)}
                                >
                                    <TouchableOpacity
                                        style={styles.bottomSheetOverlay}
                                        activeOpacity={1}
                                        onPress={() => setShowDivisionDropdown(false)}
                                    >
                                        <TouchableOpacity
                                            activeOpacity={1}
                                            style={[styles.bottomSheetContainer, { maxHeight: '80%' }]}
                                            onPress={(e) => e.stopPropagation()}
                                        >
                                            <View style={[styles.modalScrollContent, { flexShrink: 1 }]}>
                                                <View style={styles.bottomSheetHeader}>
                                                    <Text style={styles.bottomSheetTitle}>Select Division</Text>
                                                    <TouchableOpacity onPress={() => setShowDivisionDropdown(false)}>
                                                        <Ionicons name="close" size={24} color={theme.colors.text} />
                                                    </TouchableOpacity>
                                                </View>
                                                <FlatList
                                                    data={divisions}
                                                    keyExtractor={(item) => item}
                                                    renderItem={({ item }) => (
                                                        <TouchableOpacity
                                                            style={styles.bottomSheetItem}
                                                            onPress={() => {
                                                                setSelectedDivision(item);
                                                                setShowDivisionDropdown(false);
                                                            }}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.bottomSheetItemText,
                                                                    selectedDivision === item &&
                                                                    styles.bottomSheetItemTextSelected,
                                                                ]}
                                                            >
                                                                {item}
                                                            </Text>
                                                            {selectedDivision === item && (
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
                                    </TouchableOpacity>
                                </Modal>

                                {/* Campers List */}
                                <View style={[styles.campersListContainer, showDivisionDropdown && styles.campersListSectionWithDropdown]}>
                                    <FlatList
                                        data={filteredCampers}
                                        keyExtractor={(item) => item.id}
                                        renderItem={({ item }) => {
                                            const isSelected = selectedCampers.includes(item.id);
                                            return (
                                                <TouchableOpacity
                                                    style={styles.camperItem}
                                                    onPress={() => handleSelectCamper(item.id)}
                                                >
                                                    <View style={styles.camperItemContent}>
                                                        <View
                                                            style={[
                                                                styles.radioButton,
                                                                isSelected && styles.radioButtonSelected,
                                                            ]}
                                                        >
                                                            {isSelected && (
                                                                <View style={styles.radioButtonInner} />
                                                            )}
                                                        </View>
                                                        <Text style={styles.camperName}>
                                                            {item.name}
                                                        </Text>
                                                    </View>
                                                    <View
                                                        style={[
                                                            styles.divisionTag,
                                                            item.division === 'CIT Girls' &&
                                                            styles.divisionTagHighlighted,
                                                        ]}
                                                    >
                                                        <Text style={styles.divisionTagText}>
                                                            {item.division}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        }}
                                        nestedScrollEnabled={true}
                                        scrollEnabled={true}
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        {/* Modal Footer */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleCloseModal}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    !templateName && styles.submitButtonDisabled,
                                ]}
                                onPress={handleCreateTemplate}
                                disabled={!templateName}
                            >
                                <Text style={styles.submitButtonText}>Create Template</Text>
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
    headerActions: {
        marginBottom: theme.spacing.lg,
        alignItems: 'flex-end',
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.xs,
    },
    createButtonText: {
        ...theme.typography.body,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    emptyStateCard: {
        minHeight: 400,
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
    emptyStateTitle: {
        ...theme.typography.h3,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    emptyStateDescription: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        textAlign: 'center',
        paddingHorizontal: theme.spacing.md,
    },
    createFirstButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.xs,
    },
    createFirstButtonText: {
        ...theme.typography.body,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
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
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        ...theme.typography.h3,
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
    label: {
        ...theme.typography.body,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
        color: theme.colors.text,
    },
    required: {
        color: theme.colors.danger,
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
    selectCampersHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    selectCampersActions: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    actionButton: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    actionButtonText: {
        ...theme.typography.bodySmall,
        color: theme.colors.text,
        fontWeight: '600',
    },
    searchFilterBar: {
        flexDirection: 'column',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        minHeight: 44,
    },
    searchIcon: {
        marginRight: theme.spacing.xs,
    },
    searchInput: {
        flex: 1,
        ...theme.typography.body,
        minHeight: 44,
    },
    divisionDropdownContainer: {
        position: 'relative',
        width: '100%',
        zIndex: 1000,
    },
    divisionDropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        minHeight: 44,
        backgroundColor: theme.colors.surface,
    },
    divisionDropdownText: {
        ...theme.typography.body,
        flex: 1,
    },
    divisionDropdownMenu: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: theme.spacing.xs,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxHeight: 300,
        zIndex: 1001,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    campersListSectionWithDropdown: {
        marginTop: 320,
    },
    divisionDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    divisionDropdownItemSelected: {
        backgroundColor: '#fff7ed',
    },
    checkIcon: {
        marginRight: theme.spacing.xs,
    },
    divisionDropdownItemText: {
        ...theme.typography.body,
        flex: 1,
    },
    divisionDropdownItemTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    campersListContainer: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        maxHeight: 300,
        marginTop: theme.spacing.sm,
    },
    camperItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    camperItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.secondary,
        marginRight: theme.spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonSelected: {
        borderColor: theme.colors.secondary,
    },
    radioButtonInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.secondary,
    },
    camperName: {
        ...theme.typography.body,
        flex: 1,
    },
    divisionTag: {
        backgroundColor: '#eff6ff',
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
    },
    divisionTagHighlighted: {
        backgroundColor: '#dcfce7',
    },
    divisionTagText: {
        ...theme.typography.bodySmall,
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    modalFooter: {
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
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    bottomSheetTitle: {
        ...theme.typography.h3,
    },
    bottomSheetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    bottomSheetItemText: {
        ...theme.typography.body,
        flex: 1,
    },
    bottomSheetItemTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    // Bottom Sheet Styles
    bottomSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    bottomSheetContainer: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        width: '100%',
        paddingBottom: theme.spacing.xl,
        ...theme.shadows.card,
    },
});
