import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

export const QuestionTextScreen = ({ navigation, route }: any) => {
    const [questionText, setQuestionText] = useState('');
    const [staffType, setStaffType] = useState('Both');
    const [evaluatedBy, setEvaluatedBy] = useState('');
    const [guidanceText, setGuidanceText] = useState('');
    const [displayOrder, setDisplayOrder] = useState('0');
    const [options, setOptions] = useState('');
    const [showStaffTypePicker, setShowStaffTypePicker] = useState(false);

    const staffTypes = ['Both', 'General Counselor', 'Specialist'];

    const handleSave = () => {
        // Navigate back to Evaluation Questions screen
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={28} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Question</Text>
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
                        <Text style={styles.fieldLabel}>Staff type</Text>
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
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g., Excellent, Good, Fair, Poor"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={options}
                            onChangeText={setOptions}
                            outlineWidth={0}
                            outlineColor="transparent"
                        />
                    </View>

                    <TouchableOpacity style={styles.addButton} onPress={handleSave}>
                        <Text style={styles.addButtonText}>Add Question</Text>
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
});

