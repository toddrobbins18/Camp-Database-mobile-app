import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

export const AdminPanelScreen = ({ navigation }: any) => {
    const adminModules = [
        {
            id: 'userApprovals',
            title: 'User Approvals',
            description: 'Approve or reject pending user registrations',
            icon: 'checkmark-circle-outline',
            screen: 'UserApprovals',
            color: '#10b981',
        },
        {
            id: 'rolePermissions',
            title: 'Role Permissions',
            description: 'Manage access permissions for different user roles',
            icon: 'lock-closed-outline',
            screen: 'RolePermissions',
            color: '#f59e0b',
        },
        {
            id: 'divisionPermissions',
            title: 'Division Permissions',
            description: 'Manage permissions specific to divisions',
            icon: 'people-outline',
            screen: 'DivisionPermissions',
            color: '#3b82f6',
        },
        {
            id: 'evaluationQuestions',
            title: 'Evaluation Questions',
            description: 'Manage questions for staff evaluations',
            icon: 'clipboard-outline',
            screen: 'EvaluationQuestions',
            color: '#8b4513',
        },
         {
            id: 'questionText',
            title: 'Question Text',
            description: 'Manage questions text settings',
            icon: 'text-outline',
            screen: 'QuestionText',
            color: '#6366f1',
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Bar */}
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Ionicons name="menu" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.topHeaderTitle}>Admin Panel</Text>
                <TouchableOpacity>
                    <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.sectionTitle}>Administration Modules</Text>
                
                <View style={styles.modulesGrid}>
                    {adminModules.map((module) => (
                        <TouchableOpacity 
                            key={module.id} 
                            onPress={() => navigation.navigate(module.screen)}
                            activeOpacity={0.7}
                        >
                            <StyledCard style={styles.moduleCard}>
                                <View style={[styles.iconContainer, { backgroundColor: `${module.color}20` }]}>
                                    <Ionicons name={module.icon as any} size={28} color={module.color} />
                                </View>
                                <View style={styles.moduleContent}>
                                    <Text style={styles.moduleTitle}>{module.title}</Text>
                                    <Text style={styles.moduleDescription}>{module.description}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                            </StyledCard>
                        </TouchableOpacity>
                    ))}
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
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    topHeaderTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: 100,
    },
    sectionTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    modulesGrid: {
        gap: theme.spacing.md,
    },
    moduleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
    },
    moduleContent: {
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    moduleTitle: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
    },
    moduleDescription: {
        ...theme.typography.bodySmall,
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
});
