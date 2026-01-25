import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

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

    const questionTypes = ['Multiple Choice', 'Rating Scale', 'Text', 'Yes/No'];
    const staffTypes = ['Both', 'General Counselor', 'Specialist'];

    const [questions, setQuestions] = useState<EvaluationQuestion[]>([
        {
            id: '1',
            questionText: 'Shows enthusiasm and maintains a positive attitude',
            questionType: 'Rating Scale',
            category: 'ATTITUDE',
            staffType: 'General Counselor',
            evaluatedBy: 'Division Leader',
            ratingOptions: 5,
            displayOrder: 1,
        },
        {
            id: '2',
            questionText: 'Maintains clean and organized bunk environment',
            questionType: 'Rating Scale',
            category: 'BUNK MANAGEMENT',
            staffType: 'General Counselor',
            evaluatedBy: 'Division Leader',
            ratingOptions: 5,
            displayOrder: 2,
        },
        {
            id: '3',
            questionText: 'Demonstrates positive interactions with children',
            questionType: 'Rating Scale',
            category: 'CHILD INTERACTION',
            staffType: 'General Counselor',
            evaluatedBy: 'Division Leader',
            ratingOptions: 5,
            displayOrder: 3,
        },
        {
            id: '4',
            questionText: 'Displays effective behavior management techniques',
            questionType: 'Rating Scale',
            category: 'CHILD MANAGEMENT',
            staffType: 'General Counselor',
            evaluatedBy: 'Division Leader',
            ratingOptions: 5,
            displayOrder: 4,
        },
        {
            id: '5',
            questionText: 'Communicates effectively with parents and administration',
            questionType: 'Rating Scale',
            category: 'COMMUNICATION',
            staffType: 'General Counselor',
            evaluatedBy: 'Division Leader',
            ratingOptions: 5,
            displayOrder: 5,
        },
        {
            id: '6',
            questionText: 'Overall performance rating',
            questionType: 'Rating Scale',
            category: 'OVERALL',
            staffType: 'General Counselor',
            evaluatedBy: 'Division Leader',
            ratingOptions: 5,
            displayOrder: 6,
        },
        {
            id: '7',
            questionText: 'Participates actively in all camp activities and programs',
            questionType: 'Rating Scale',
            category: 'PARTICIPATION',
            staffType: 'General Counselor',
            evaluatedBy: 'Division Leader',
            ratingOptions: 5,
            displayOrder: 7,
        },
        {
            id: '8',
            questionText: 'Complies with camp rules and policies (rules/standards/routines/curfew/language/uniform/etc.)',
            questionType: 'Rating Scale',
            category: 'PROFESSIONALISM',
            staffType: 'General Counselor',
            evaluatedBy: 'Division Leader',
            ratingOptions: 5,
            displayOrder: 8,
        },
        {
            id: '9',
            questionText: 'Demonstrates consistent reliability and attendance',
            questionType: 'Rating Scale',
            category: 'PROFESSIONALISM',
            staffType: 'General Counselor',
            evaluatedBy: 'Division Leader',
            ratingOptions: 5,
            displayOrder: 9,
        },
        {
            id: '10',
            questionText: 'Cooperates with Division Leader and other staff members',
            questionType: 'Rating Scale',
            category: 'TEAMWORK',
            staffType: 'General Counselor',
            evaluatedBy: 'Division Leader',
            ratingOptions: 5,
            displayOrder: 10,
        },
        {
            id: '11',
            questionText: 'Shows enthusiasm and maintains a positive attitude',
            questionType: 'Rating Scale',
            category: 'ATTITUDE',
            staffType: 'Specialist',
            evaluatedBy: 'Division Leader',
            ratingOptions: 5,
            displayOrder: 1,
        },
        {
            id: '12',
            questionText: 'Demonstrates positive interactions with children',
            questionType: 'Rating Scale',
            category: 'CHILD INTERACTION',
            staffType: 'Specialist',
            evaluatedBy: 'Division Leader',
            ratingOptions: 5,
            displayOrder: 2,
        },
        {
            id: '13',
            questionText: 'Displays effective behavior management techniques',
            questionType: 'Rating Scale',
            category: 'CHILD MANAGEMENT',
            staffType: 'Specialist',
            evaluatedBy: 'Head Specialist',
            ratingOptions: 5,
            displayOrder: 3,
        },
        {
            id: '14',
            questionText: 'Communicates effectively with staff and administration',
            questionType: 'Rating Scale',
            category: 'COMMUNICATION',
            staffType: 'Specialist',
            evaluatedBy: 'Head Specialist',
            ratingOptions: 5,
            displayOrder: 4,
        },
        {
            id: '15',
            questionText: 'Shows initiative and problem-solving abilities',
            questionType: 'Rating Scale',
            category: 'LEADERSHIP',
            staffType: 'Specialist',
            evaluatedBy: 'Head Specialist',
            ratingOptions: 5,
            displayOrder: 5,
        },
        {
            id: '16',
            questionText: 'Overall performance rating',
            questionType: 'Rating Scale',
            category: 'OVERALL',
            staffType: 'Specialist',
            evaluatedBy: 'Both',
            ratingOptions: 5,
            displayOrder: 6,
        },
    ]);

    const handleAddQuestion = () => {
        if (questionText.trim()) {
            const newQuestion: EvaluationQuestion = {
                id: Date.now().toString(),
                questionText: questionText.trim(),
                questionType,
                category: category.trim(),
                staffType,
                evaluatedBy: evaluatedBy.trim(),
                guidanceText: guidanceText.trim() || undefined,
                displayOrder: parseInt(displayOrder) || 0,
                options: options.trim() || undefined,
                ratingOptions: 5,
            };
            setQuestions([...questions, newQuestion]);
            // Reset form
            setQuestionText('');
            setCategory('');
            setEvaluatedBy('');
            setGuidanceText('');
            setDisplayOrder('0');
            setOptions('');
        }
    };

    const handleDeleteQuestion = (id: string) => {
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
                        {showQuestionTypePicker && (
                            <View style={styles.dropdown}>
                                {questionTypes.map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.dropdownOption,
                                            questionType === type && styles.dropdownOptionSelected
                                        ]}
                                        onPress={() => {
                                            setQuestionType(type);
                                            setShowQuestionTypePicker(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.dropdownOptionText,
                                            questionType === type && styles.dropdownOptionTextSelected
                                        ]}>
                                            {type}
                                        </Text>
                                        {questionType === type && (
                                            <Ionicons name="checkmark" size={18} color={theme.colors.secondary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
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
                        {showStaffTypePicker && (
                            <View style={styles.dropdown}>
                                {staffTypes.map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.dropdownOption,
                                            staffType === type && styles.dropdownOptionSelected
                                        ]}
                                        onPress={() => {
                                            setStaffType(type);
                                            setShowStaffTypePicker(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.dropdownOptionText,
                                            staffType === type && styles.dropdownOptionTextSelected
                                        ]}>
                                            {type}
                                        </Text>
                                        {staffType === type && (
                                            <Ionicons name="checkmark" size={18} color={theme.colors.secondary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
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

                    <TouchableOpacity 
                        style={styles.addButton} 
                        onPress={() => navigation.navigate('QuestionText')}
                    >
                        <Text style={styles.addButtonText}>Add Question</Text>
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
                                        {question.category === 'OVERALL' && (
                                            <View style={styles.questionActions}>
                                                <TouchableOpacity style={styles.actionButton}>
                                                    <Ionicons name="pencil" size={16} color="#f97316" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.actionButton}
                                                    onPress={() => handleDeleteQuestion(question.id)}
                                                >
                                                    <Ionicons name="trash" size={16} color={theme.colors.textSecondary} />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </StyledCard>
                                ))}
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="chatbubble-outline" size={24} color="white" />
            </TouchableOpacity>
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
    dropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.xs,
        zIndex: 1000,
        ...theme.shadows.card,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 1000,
    },
    dropdownOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dropdownOptionSelected: {
        backgroundColor: '#fff7ed',
    },
    dropdownOptionText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    dropdownOptionTextSelected: {
        color: theme.colors.accent,
        fontWeight: '600',
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

