import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useAddEvaluationQuestion, useUpdateEvaluationQuestion } from '../api/evaluations';
import { useCompany } from '../contexts/CompanyContext';

export const QuestionTextScreen = ({ navigation, route }: any) => {
    const initial = route?.params ?? {};
    const [questionText, setQuestionText] = useState(initial.questionText ?? '');
    const [questionType, setQuestionType] = useState(initial.questionType ?? 'Multiple Choice');
    const [category, setCategory] = useState(initial.category ?? '');
    const [staffType, setStaffType] = useState(initial.staffType ?? 'Both');
    const [evaluatedBy, setEvaluatedBy] = useState(initial.evaluatedBy ?? '');
    const [guidanceText, setGuidanceText] = useState(initial.guidanceText ?? '');
    const [displayOrder, setDisplayOrder] = useState(String(initial.displayOrder ?? '0'));
    const [options, setOptions] = useState(initial.options ?? '');
    const [showStaffTypePicker, setShowStaffTypePicker] = useState(false);
    const [showQuestionTypePicker, setShowQuestionTypePicker] = useState(false);

    const staffTypes = ['Both', 'General Counselor', 'Specialist'];
    const questionTypes = ['Multiple Choice', 'Text Response', 'Rating Scale'];
    const addQuestionMutation = useAddEvaluationQuestion();
    const updateQuestionMutation = useUpdateEvaluationQuestion();
    const { companyId } = useCompany();

    const editingId = (initial.id ?? initial.questionId ?? null) as string | null;
    const isEditing = !!editingId;
    const isSubmitting = addQuestionMutation.isPending || updateQuestionMutation.isPending;

    const handleSave = () => {
        if (isSubmitting) return;
        if (!companyId) {
            Alert.alert('Missing company', 'Please select a company before adding questions.');
            return;
        }
        if (!questionText.trim()) {
            Alert.alert('Error', 'Question text is required.');
            return;
        }

        const questionTypeDb =
            questionType === 'Multiple Choice'
                ? 'multiple_choice'
                : questionType === 'Rating Scale'
                    ? 'rating'
                    : 'text';

        const staffTypeDb =
            staffType === 'Specialist'
                ? 'specialist'
                : staffType === 'General Counselor'
                    ? 'general_counselor'
                    : 'both';

        let optionsArray: string[] | null = null;
        if (questionTypeDb === 'multiple_choice') {
            const opts = options
                .split(',')
                .map((o: string) => o.trim())
                .filter(Boolean);
            if (opts.length === 0) {
                Alert.alert('Validation error', 'Options are required for Multiple Choice questions.');
                return;
            }
            optionsArray = opts;
        } else if (questionTypeDb === 'rating') {
            const opts = options
                .split(',')
                .map((o: string) => o.trim())
                .filter(Boolean);
            optionsArray = opts.length > 0 ? opts : ['1', '2', '3', '4', '5'];
        } else {
            optionsArray = null;
        }

        const payload = {
            ...(isEditing ? {} : { company_id: companyId }),
            question_text: questionText.trim(),
            question_type: questionTypeDb,
            category: category.trim() ? category.trim() : null,
            options: optionsArray,
            staff_type: staffTypeDb,
            evaluated_by: evaluatedBy.trim() ? evaluatedBy.trim() : null,
            guidance_text: guidanceText.trim() ? guidanceText.trim() : null,
            display_order: parseInt(displayOrder) || 0,
        } as any;

        if (isEditing && editingId) {
            updateQuestionMutation.mutate(
                { id: editingId, ...payload },
                {
                    onSuccess: () => {
                        Alert.alert('Success', 'Question updated successfully.');
                        navigation.goBack();
                    },
                    onError: (err: any) => {
                        const msg =
                            err instanceof Error
                                ? err.message
                                : String(err?.message || err || 'Failed to update question.');
                        const lc = msg.toLowerCase();
                        if (lc.includes('rls') || lc.includes('permission') || lc.includes('forbidden') || lc.includes('403')) {
                            Alert.alert(
                                'Permission denied',
                                'You need admin access (and a valid company_id) to update evaluation questions.'
                            );
                            return;
                        }
                        Alert.alert('Error updating question', msg);
                    },
                }
            );
            return;
        }

        addQuestionMutation.mutate(payload, {
            onSuccess: () => {
                Alert.alert('Success', 'Question added successfully.');
                navigation.goBack();
            },
            onError: (err: any) => {
                const msg =
                    err instanceof Error ? err.message : String(err?.message || err || 'Failed to add question.');
                const lc = msg.toLowerCase();
                if (lc.includes('rls') || lc.includes('permission') || lc.includes('forbidden') || lc.includes('403')) {
                    Alert.alert(
                        'Permission denied',
                        'You need admin access (and a valid company_id) to add evaluation questions.'
                    );
                    return;
                }
                Alert.alert('Error adding question', msg);
            },
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={28} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditing ? 'Edit Question' : 'Add Question'}</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <StyledCard style={styles.formCard}>
                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Question Text</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            placeholder="Enter the evaluation question..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={questionText}
                            onChangeText={setQuestionText}
                            multiline
                            numberOfLines={3}
                            outlineWidth={0}
                            outlineColor="transparent"
                        />
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Question Type</Text>
                        <TouchableOpacity
                            style={styles.dropdownButton}
                            onPress={() => setShowQuestionTypePicker(!showQuestionTypePicker)}
                        >
                            <Text style={styles.dropdownText}>{questionType}</Text>
                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <Modal
                            visible={showQuestionTypePicker}
                            transparent={true}
                            animationType="slide"
                            onRequestClose={() => setShowQuestionTypePicker(false)}
                        >
                            <Pressable style={styles.bottomSheetOverlay} onPress={() => setShowQuestionTypePicker(false)}>
                                <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
                                    <View style={styles.bottomSheetHeader}>
                                        <Text style={styles.bottomSheetTitle}>Select Question Type</Text>
                                    </View>
                                    <ScrollView style={styles.bottomSheetScroll}>
                                        {questionTypes.map((type) => (
                                            <TouchableOpacity
                                                key={type}
                                                style={[
                                                    styles.bottomSheetOption,
                                                    questionType === type && styles.bottomSheetOptionSelected
                                                ]}
                                                onPress={() => {
                                                    setQuestionType(type);
                                                    setShowQuestionTypePicker(false);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.bottomSheetOptionText,
                                                    questionType === type && styles.bottomSheetOptionTextSelected
                                                ]}>
                                                    {type}
                                                </Text>
                                                {questionType === type && (
                                                    <Ionicons name="checkmark" size={20} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </Pressable>
                            </Pressable>
                        </Modal>
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Category</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g., Communication, Teamwork"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={category}
                            onChangeText={setCategory}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Staff type</Text>
                        <TouchableOpacity
                            style={styles.dropdownButton}
                            onPress={() => setShowStaffTypePicker(!showStaffTypePicker)}
                        >
                            <Text style={styles.dropdownText}>{staffType}</Text>
                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        {/* Staff Type Bottom Sheet */}
                        <Modal
                            visible={showStaffTypePicker}
                            transparent={true}
                            animationType="slide"
                            onRequestClose={() => setShowStaffTypePicker(false)}
                        >
                            <Pressable style={styles.bottomSheetOverlay} onPress={() => setShowStaffTypePicker(false)}>
                                <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
                                    <View style={styles.bottomSheetHeader}>
                                        <Text style={styles.bottomSheetTitle}>Select Staff Type</Text>
                                    </View>
                                    <ScrollView style={styles.bottomSheetScroll}>
                                        {staffTypes.map((type) => (
                                            <TouchableOpacity
                                                key={type}
                                                style={[
                                                    styles.bottomSheetOption,
                                                    staffType === type && styles.bottomSheetOptionSelected
                                                ]}
                                                onPress={() => {
                                                    setStaffType(type);
                                                    setShowStaffTypePicker(false);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.bottomSheetOptionText,
                                                    staffType === type && styles.bottomSheetOptionTextSelected
                                                ]}>
                                                    {type}
                                                </Text>
                                                {staffType === type && (
                                                    <Ionicons name="checkmark" size={20} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </Pressable>
                            </Pressable>
                        </Modal>
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Evaluated By</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g., Division Leader, Head Specialist"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={evaluatedBy}
                            onChangeText={setEvaluatedBy}
                            outlineWidth={0}
                            outlineColor="transparent"
                        />
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Guidance Text (optional)</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            placeholder="Bullet points to help evaluators rate consistently..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={guidanceText}
                            onChangeText={setGuidanceText}
                            multiline
                            numberOfLines={4}
                            outlineWidth={0}
                            outlineColor="transparent"
                        />
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Display Order</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="0"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={displayOrder}
                            onChangeText={setDisplayOrder}
                            keyboardType="numeric"
                            outlineWidth={0}
                            outlineColor="transparent"
                        />
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Options (comma-separated)</Text>
                        {questionType === 'Multiple Choice' ? (
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g., Excellent, Good, Fair, Poor"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={options}
                                onChangeText={setOptions}
                                outlineWidth={0}
                                outlineColor="transparent"
                            />
                        ) : (
                            <Text style={styles.helpText}>Options are not needed for this question type.</Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.addButton, isSubmitting && { opacity: 0.7 }]}
                        disabled={isSubmitting}
                        onPress={handleSave}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.addButtonText}>{isEditing ? 'Update Question' : 'Add Question'}</Text>
                        )}
                    </TouchableOpacity>
                </StyledCard>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    headerRight: {
        width: 28,
    },
    scrollContent: {
        padding: theme.spacing.md,
    },
    formCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
    },
    formField: {
        marginBottom: theme.spacing.md,
        position: 'relative',
    },
    fieldLabel: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    textInput: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    dropdownText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    // Bottom Sheet Styles
    bottomSheetOverlay: {
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
        maxHeight: '50%',
        width: '100%',
    },
    bottomSheetHeader: {
        marginBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingBottom: theme.spacing.sm,
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    bottomSheetScroll: {
        // No specific styles needed for now
    },
    bottomSheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    bottomSheetOptionText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    bottomSheetOptionTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    bottomSheetOptionSelected: {
        backgroundColor: theme.colors.secondary + '10',
    },
    addButton: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.sm,
    },
    addButtonText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});

