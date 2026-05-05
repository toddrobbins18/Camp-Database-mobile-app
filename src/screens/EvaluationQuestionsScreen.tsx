import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useEvaluationQuestions, useAddEvaluationQuestion, useDeleteEvaluationQuestion } from '../api/evaluations';
import { useCompany } from '../contexts/CompanyContext';

interface EvaluationQuestion {
    id: string;
    questionText: string;
    questionType: string;
    category: string;
    staffType: string;
    evaluatedBy: string;
    guidanceText?: string;
    displayOrder: number;
    options?: string;
    ratingOptions: number;
}

/** Stable fallback — `data ?? []` in useQuery destructuring is a new [] every render and breaks [dbQuestions] effects. */
const EMPTY_DB_QUESTIONS: unknown[] = [];

export const EvaluationQuestionsScreen = ({ navigation }: any) => {
    const [questionText, setQuestionText] = useState('');
    const [questionType, setQuestionType] = useState('Multiple Choice');
    const [category, setCategory] = useState('');
    const [staffType, setStaffType] = useState('Both');
    const [evaluatedBy, setEvaluatedBy] = useState('');
    const [guidanceText, setGuidanceText] = useState('');
    const [displayOrder, setDisplayOrder] = useState('0');
    const [options, setOptions] = useState('');
    const [showQuestionTypePicker, setShowQuestionTypePicker] = useState(false);
    const [showStaffTypePicker, setShowStaffTypePicker] = useState(false);
    const [expandedGuidance, setExpandedGuidance] = useState<Set<string>>(new Set());

    const questionTypes = ['Multiple Choice', 'Text Response', 'Rating Scale'];
    const staffTypes = ['Both', 'General Counselor', 'Specialist'];

    const { companyId } = useCompany();

    // Fetch evaluation questions from Supabase
    const { data: dbQuestionsData, isLoading: questionsLoading } = useEvaluationQuestions(companyId);
    const dbQuestions = dbQuestionsData ?? EMPTY_DB_QUESTIONS;
    const addQuestionMutation = useAddEvaluationQuestion();
    const deleteQuestionMutation = useDeleteEvaluationQuestion();

    // Map DB questions to local format, fall back to hardcoded defaults
    const defaultQuestions: EvaluationQuestion[] = [
        { id: '1', questionText: 'Shows enthusiasm and maintains a positive attitude', questionType: 'Rating Scale', category: 'ATTITUDE', staffType: 'General Counselor', evaluatedBy: 'Division Leader', ratingOptions: 5, displayOrder: 1 },
        { id: '2', questionText: 'Maintains clean and organized bunk environment', questionType: 'Rating Scale', category: 'BUNK MANAGEMENT', staffType: 'General Counselor', evaluatedBy: 'Division Leader', ratingOptions: 5, displayOrder: 2 },
        { id: '3', questionText: 'Demonstrates positive interactions with children', questionType: 'Rating Scale', category: 'CHILD INTERACTION', staffType: 'General Counselor', evaluatedBy: 'Division Leader', ratingOptions: 5, displayOrder: 3 },
        { id: '4', questionText: 'Displays effective behavior management techniques', questionType: 'Rating Scale', category: 'CHILD MANAGEMENT', staffType: 'General Counselor', evaluatedBy: 'Division Leader', ratingOptions: 5, displayOrder: 4 },
        { id: '5', questionText: 'Overall performance rating', questionType: 'Rating Scale', category: 'OVERALL', staffType: 'General Counselor', evaluatedBy: 'Division Leader', ratingOptions: 5, displayOrder: 5 },
    ];

    const [questions, setQuestions] = useState<EvaluationQuestion[]>(defaultQuestions);

    useEffect(() => {
        if (questionsLoading) return;

        const mapQuestionType = (qt: string) => {
            const t = String(qt || '').toLowerCase();
            if (t === 'rating') return 'Rating Scale';
            if (t === 'text') return 'Text Response';
            return 'Multiple Choice';
        };
        const mapStaffType = (st: string) => {
            const s = String(st || '').toLowerCase();
            if (s === 'specialist') return 'Specialist';
            if (s === 'general_counselor') return 'General Counselor';
            return 'Both';
        };

        setQuestions(
            dbQuestions.map((q: any) => {
                const optionsArray: string[] | null = Array.isArray(q.options) ? q.options : null;
                const optionsCount =
                    q.question_type === 'multiple_choice'
                        ? optionsArray?.length ?? 0
                        : q.question_type === 'rating'
                            ? optionsArray?.length ?? 5
                            : 0;

                return {
                    id: q.id,
                    questionText: q.question_text,
                    questionType: mapQuestionType(q.question_type),
                    category: q.category || 'GENERAL',
                    staffType: mapStaffType(q.staff_type),
                    evaluatedBy: q.evaluated_by || '',
                    guidanceText: q.guidance_text || undefined,
                    displayOrder: typeof q.display_order === 'number' ? q.display_order : 0,
                    options: optionsArray ? optionsArray.join(', ') : undefined,
                    ratingOptions: optionsCount,
                } as EvaluationQuestion;
            })
        );
    }, [dbQuestions, questionsLoading]);

    const handleAddQuestion = () => {
        if (addQuestionMutation.isPending) return;
        if (!companyId) {
            Alert.alert('Missing company', 'Please select a company before adding questions.');
            return;
        }
        const qText = questionText.trim();
        if (!qText) {
            Alert.alert('Validation error', 'Question text is required.');
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
                .map((o) => o.trim())
                .filter(Boolean);
            if (opts.length === 0) {
                Alert.alert('Validation error', 'Options are required for Multiple Choice questions.');
                return;
            }
            optionsArray = opts;
        } else if (questionTypeDb === 'rating') {
            const opts = options
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean);
            optionsArray = opts.length > 0 ? opts : ['1', '2', '3', '4', '5'];
        } else {
            optionsArray = null;
        }

        const payload = {
            company_id: companyId,
            question_text: qText,
            question_type: questionTypeDb,
            category: category.trim() ? category.trim() : null,
            options: optionsArray,
            staff_type: staffTypeDb,
            evaluated_by: evaluatedBy.trim() ? evaluatedBy.trim() : null,
            guidance_text: guidanceText.trim() ? guidanceText.trim() : null,
            display_order: parseInt(displayOrder) || 0,
        };

        addQuestionMutation.mutate(payload as any, {
            onSuccess: () => {
                Alert.alert('Success', 'Question added successfully.');
                setQuestionText('');
                setQuestionType('Multiple Choice');
                setCategory('');
                setStaffType('Both');
                setEvaluatedBy('');
                setGuidanceText('');
                setDisplayOrder('0');
                setOptions('');
                // Let the query refetch and update the library
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

    const handleDeleteQuestion = (id: string) => {
        deleteQuestionMutation.mutate(id);
        setQuestions(questions.filter(q => q.id !== id));
    };

    const toggleGuidance = (id: string) => {
        const newExpanded = new Set(expandedGuidance);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedGuidance(newExpanded);
    };

    const groupedQuestions = questions.reduce((acc, question) => {
        const key = `${question.staffType}-${question.category}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(question);
        return acc;
    }, {} as Record<string, EvaluationQuestion[]>);

    if (questionsLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={{ paddingVertical: theme.spacing.xl, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Ionicons name="menu" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Evaluation Questions</Text>
                <TouchableOpacity>
                    <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Title Section */}
                <View style={styles.titleSection}>
                    <Text style={styles.title}>Evaluation Questions</Text>
                    <Text style={styles.subtitle}>Manage questions for staff evaluations.</Text>
                </View>

                {/* Import Section */}
                <StyledCard style={styles.importCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.text} style={styles.sectionIcon} />
                        <Text style={styles.sectionTitle}>Import Tyler Hill Camp Standard Evaluations</Text>
                    </View>
                    <Text style={styles.sectionDescription}>
                        Import pre-configured evaluation forms with rating scales (1-5) and guidance text.
                    </Text>
                    <View style={styles.importButtons}>
                        <TouchableOpacity style={styles.importButton}>
                            <Ionicons name="cloud-upload-outline" size={18} color="white" />
                            <Text style={styles.importButtonText}>Import Specialist Evaluation (12 questions)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.importButton}>
                            <Ionicons name="cloud-upload-outline" size={18} color="white" />
                            <Text style={styles.importButtonText}>Import General Counselor (10 questions)</Text>
                        </TouchableOpacity>
                    </View>
                </StyledCard>

                {/* Add Question Form */}
                <StyledCard style={styles.addQuestionCard}>
                    <Text style={styles.addQuestionTitle}>Add Question</Text>

                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Question Text</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter the evaluation question..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={questionText}
                            onChangeText={setQuestionText}
                            multiline
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
                        {/* Question Type Bottom Sheet */}
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
                        />
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Staff Type</Text>
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
                        />
                    </View>

                    {questionType === 'Multiple Choice' && (
                        <View style={styles.formField}>
                            <Text style={styles.fieldLabel}>Options (comma-separated)</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g., Excellent, Good, Fair, Poor"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={options}
                                onChangeText={setOptions}
                            />
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.addButton, addQuestionMutation.isPending && { opacity: 0.7 }]}
                        disabled={addQuestionMutation.isPending}
                        onPress={handleAddQuestion}
                    >
                        {addQuestionMutation.isPending ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.addButtonText}>Add Question</Text>
                        )}
                    </TouchableOpacity>
                </StyledCard>

                {/* Questions Library */}
                <View style={styles.librarySection}>
                    <Text style={styles.libraryTitle}>Questions Library</Text>
                    <Text style={styles.librarySubtitle}>All evaluation questions organized by category</Text>

                    {Object.entries(groupedQuestions).map(([key, groupQuestions]) => {
                        const [staffType, category] = key.split('-');
                        return (
                            <View key={key} style={styles.categoryGroup}>
                                <View style={styles.categoryHeader}>
                                    <View style={[
                                        styles.staffTypeBadge,
                                        staffType === 'Specialist' && styles.specialistBadge
                                    ]}>
                                        <Text style={styles.staffTypeBadgeText}>{staffType}</Text>
                                    </View>
                                    <Text style={styles.categoryTitle}>{category}</Text>
                                </View>
                                {groupQuestions.map((question) => (
                                    <StyledCard key={question.id} style={styles.questionCard}>
                                        <Text style={styles.questionText}>{question.questionText}</Text>
                                        <View style={styles.questionDetails}>
                                            <Text style={styles.detailLabel}>rating</Text>
                                            <View style={styles.ratingBadge}>
                                                <Text style={styles.ratingBadgeText}>{question.ratingOptions} options</Text>
                                            </View>
                                            <Text style={styles.evaluatedBy}>
                                                Evaluated by: {question.evaluatedBy}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.guidanceToggle}
                                            onPress={() => toggleGuidance(question.id)}
                                        >
                                            <Ionicons
                                                name={expandedGuidance.has(question.id) ? "chevron-up" : "chevron-down"}
                                                size={16}
                                                color={theme.colors.textSecondary}
                                            />
                                            <Text style={styles.guidanceToggleText}>Show guidance</Text>
                                        </TouchableOpacity>
                                        {expandedGuidance.has(question.id) && question.guidanceText && (
                                            <View style={styles.guidanceContent}>
                                                <Text style={styles.guidanceText}>{question.guidanceText}</Text>
                                            </View>
                                        )}
                                        <View style={styles.questionActions}>
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => {
                                                    navigation.navigate('QuestionText', {
                                                        id: question.id,
                                                        questionText: question.questionText,
                                                        questionType: question.questionType,
                                                        category: question.category,
                                                        staffType: question.staffType,
                                                        evaluatedBy: question.evaluatedBy,
                                                        guidanceText: question.guidanceText,
                                                        displayOrder: question.displayOrder,
                                                        options: question.options,
                                                    });
                                                }}
                                            >
                                                <Ionicons name="pencil" size={16} color="#f97316" />
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleDeleteQuestion(question.id)}
                                            >
                                                <Ionicons name="trash" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    </StyledCard>
                                ))}
                            </View>
                        );
                    })}
                </View>
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
    scrollContent: {
        padding: theme.spacing.md,
    },
    titleSection: {
        marginBottom: theme.spacing.lg,
    },
    title: {
        ...theme.typography.h1,
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    importCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    sectionIcon: {
        marginRight: theme.spacing.xs,
    },
    sectionTitle: {
        ...theme.typography.h2,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    sectionDescription: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
        lineHeight: 20,
    },
    importButtons: {
        gap: theme.spacing.sm,
    },
    importButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f97316',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    importButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    addQuestionCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: '#e0f2fe',
    },
    addQuestionTitle: {
        ...theme.typography.h2,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
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
    librarySection: {
        marginTop: theme.spacing.md,
    },
    libraryTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    librarySubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    categoryGroup: {
        marginBottom: theme.spacing.xl,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    staffTypeBadge: {
        backgroundColor: '#14b8a6',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
    },
    specialistBadge: {
        backgroundColor: theme.colors.secondary,
    },
    staffTypeBadgeText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
    },
    categoryTitle: {
        ...theme.typography.h2,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    questionCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    questionText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    questionDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    detailLabel: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    ratingBadge: {
        backgroundColor: '#14b8a6',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
    },
    ratingBadgeText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
    },
    evaluatedBy: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
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
    guidanceToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginTop: theme.spacing.xs,
    },
    guidanceToggleText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    guidanceContent: {
        marginTop: theme.spacing.sm,
        paddingTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    guidanceText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    questionActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.sm,
        justifyContent: 'flex-end',
    },
    actionButton: {
        padding: theme.spacing.xs,
    },
    fab: {
        position: 'absolute',
        bottom: theme.spacing.xl,
        right: theme.spacing.xl,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.card,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 100,
    },
});

