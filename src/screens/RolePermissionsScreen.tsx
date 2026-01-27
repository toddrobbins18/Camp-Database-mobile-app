import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

interface Permission {
    id: string;
    name: string;
    icon: string;
    iconColor: string;
}

interface RolePermissions {
    [roleId: string]: {
        [permissionId: string]: boolean;
    };
}

export const RolePermissionsScreen = ({ navigation }: any) => {
    const permissions: Permission[] = [
        { id: 'activities', name: 'Activities & Field Trips', icon: 'leaf-outline', iconColor: '#10b981' },
        { id: 'adminPanel', name: 'Admin Panel', icon: 'settings-outline', iconColor: '#64748b' },
        { id: 'awards', name: 'Awards', icon: 'trophy-outline', iconColor: '#f59e0b' },
        { id: 'camper', name: 'Camper', icon: 'people-outline', iconColor: '#3b82f6' },
        { id: 'dailyNews', name: 'Daily News', icon: 'document-text-outline', iconColor: '#f97316' },
        { id: 'dashboard', name: 'Dashboard', icon: 'bar-chart-outline', iconColor: '#3b82f6' },
        { id: 'divisionPermissions', name: 'Division Permissions', icon: 'lock-closed-outline', iconColor: '#f59e0b' },
        { id: 'evaluationQuestions', name: 'Evaluation Questions', icon: 'clipboard-outline', iconColor: '#8b4513' },
        { id: 'incidentReports', name: 'Incident Reports', icon: 'warning-outline', iconColor: '#f59e0b' },
        { id: 'masterCalendar', name: 'Master Calendar', icon: 'calendar-outline', iconColor: '#ef4444' },
        { id: 'menu', name: 'Menu', icon: 'restaurant-outline', iconColor: '#64748b' },
        { id: 'messages', name: 'Messages', icon: 'chatbubble-outline', iconColor: '#3b82f6' },
        { id: 'nurseDashboard', name: 'Nurse Dashboard', icon: 'medical-outline', iconColor: '#ef4444' },
        { id: 'rainyDaySchedule', name: 'Rainy Day Schedule', icon: 'rainy-outline', iconColor: '#94a3b8' },
        { id: 'rolePermissions', name: 'Role Permissions', icon: 'lock-closed-outline', iconColor: '#f59e0b' },
        { id: 'specialEvents', name: 'Special Events & Evening Activities', icon: 'sparkles-outline', iconColor: '#f97316' },
        { id: 'specialMeals', name: 'Special Meals', icon: 'restaurant-outline', iconColor: '#64748b' },
        { id: 'sportsAcademy', name: 'Sports Academy', icon: 'football-outline', iconColor: '#1f2937' },
        { id: 'sportsCalendar', name: 'Sports Calendar', icon: 'trophy-outline', iconColor: '#f59e0b' },
        { id: 'staff', name: 'Staff', icon: 'person-outline', iconColor: '#3b82f6' },
        { id: 'transportation', name: 'Transportation', icon: 'car-outline', iconColor: '#64748b' },
        { id: 'tutoringTherapy', name: 'Tutoring & Therapy', icon: 'book-outline', iconColor: '#64748b' },
        { id: 'userApprovals', name: 'User Approvals', icon: 'checkmark-circle-outline', iconColor: '#10b981' },
    ];

    const roles = [
        {
            id: 'administrator',
            name: 'Administrator',
            icon: 'shield-outline',
            iconColor: '#3b82f6',
            subtitle: 'Full system access',
            permissions: {
                activities: true,
                adminPanel: true,
                awards: true,
                camper: true,
                dailyNews: true,
                dashboard: true,
                divisionPermissions: true,
                evaluationQuestions: true,
                incidentReports: true,
                masterCalendar: true,
                menu: true,
                messages: true,
                nurseDashboard: true,
                rainyDaySchedule: true,
                rolePermissions: true,
                specialEvents: true,
                specialMeals: true,
                sportsAcademy: true,
                sportsCalendar: true,
                staff: true,
                transportation: true,
                tutoringTherapy: true,
                userApprovals: true,
            }
        },
        {
            id: 'staff',
            name: 'Staff',
            icon: 'people-outline',
            iconColor: '#3b82f6',
            subtitle: 'Standard staff access',
            permissions: {
                activities: true,
                adminPanel: false,
                awards: true,
                camper: true,
                dailyNews: true,
                dashboard: true,
                divisionPermissions: false,
                evaluationQuestions: false,
                incidentReports: true,
                masterCalendar: true,
                menu: true,
                messages: true,
                nurseDashboard: false,
                rainyDaySchedule: false,
                rolePermissions: false,
                specialEvents: false,
                specialMeals: false,
                sportsAcademy: false,
                sportsCalendar: false,
                staff: false,
                transportation: false,
                tutoringTherapy: false,
                userApprovals: false,
            }
        },
        {
            id: 'divisionLeader',
            name: 'Division Leader',
            icon: 'people-outline',
            iconColor: '#3b82f6',
            subtitle: 'Full access to assigned division(s)',
            permissions: {
                activities: true,
                adminPanel: false,
                awards: true,
                camper: true,
                dailyNews: true,
                dashboard: true,
                divisionPermissions: false,
                evaluationQuestions: false,
                incidentReports: true,
                masterCalendar: true,
                menu: false,
                messages: false,
                nurseDashboard: false,
                rainyDaySchedule: false,
                rolePermissions: false,
                specialEvents: false,
                specialMeals: false,
                sportsAcademy: false,
                sportsCalendar: false,
                staff: false,
                transportation: false,
                tutoringTherapy: false,
                userApprovals: false,
            }
        },
        {
            id: 'viewer',
            name: 'Viewer',
            icon: 'eye-outline',
            iconColor: '#3b82f6',
            subtitle: 'Read-only access',
            permissions: {
                activities: true,
                adminPanel: false,
                awards: true,
                camper: true,
                dailyNews: true,
                dashboard: true,
                divisionPermissions: false,
                evaluationQuestions: false,
                incidentReports: false,
                masterCalendar: true,
                menu: true,
                messages: true,
                nurseDashboard: false,
                rainyDaySchedule: false,
                rolePermissions: false,
                specialEvents: false,
                specialMeals: false,
                sportsAcademy: false,
                sportsCalendar: false,
                staff: false,
                transportation: false,
                tutoringTherapy: false,
                userApprovals: false,
            }
        },
        {
            id: 'healthCenter',
            name: 'Health Center',
            icon: 'heart-outline',
            iconColor: '#3b82f6',
            subtitle: 'Access to health, medical, and incident reports',
            permissions: {
                activities: false,
                adminPanel: false,
                awards: false,
                camper: true,
                dailyNews: true,
                dashboard: true,
                divisionPermissions: false,
                evaluationQuestions: false,
                incidentReports: true,
                masterCalendar: false,
                menu: false,
                messages: true,
                nurseDashboard: false,
                rainyDaySchedule: false,
                rolePermissions: false,
                specialEvents: false,
                specialMeals: false,
                sportsAcademy: false,
                sportsCalendar: false,
                staff: false,
                transportation: false,
                tutoringTherapy: false,
                userApprovals: false,
            }
        },
        {
            id: 'specialist',
            name: 'Specialist',
            icon: 'trophy-outline',
            iconColor: '#f59e0b',
            subtitle: 'Cross-division access to specialized features (e.g. sports)',
            permissions: {
                activities: true,
                adminPanel: false,
                awards: true,
                camper: false,
                dailyNews: false,
                dashboard: false,
                divisionPermissions: false,
                evaluationQuestions: false,
                incidentReports: false,
                masterCalendar: false,
                menu: false,
                messages: false,
                nurseDashboard: false,
                rainyDaySchedule: false,
                rolePermissions: false,
                specialEvents: true,
                specialMeals: true,
                sportsAcademy: true,
                sportsCalendar: true,
                staff: false,
                transportation: true,
                tutoringTherapy: true,
                userApprovals: false,
            }
        },
    ];

    const [rolePermissions, setRolePermissions] = useState<RolePermissions>(
        roles.reduce((acc, role) => {
            acc[role.id] = role.permissions;
            return acc;
        }, {} as RolePermissions)
    );

    const handleTogglePermission = (roleId: string, permissionId: string) => {
        setRolePermissions(prev => ({
            ...prev,
            [roleId]: {
                ...prev[roleId],
                [permissionId]: !prev[roleId][permissionId],
            }
        }));
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Ionicons name="menu" size={28} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.headerRight} />
                <TouchableOpacity>
                    <Ionicons name="person-circle-outline" size={28} color={theme.colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Title Section */}
                <View style={styles.titleSection}>
                    <Text style={styles.title}>Role Permissions</Text>
                    <Text style={styles.subtitle}>Manage access permissions for different user roles</Text>
                </View>

                {/* Roles List */}
                {roles.map((role) => (
                    <StyledCard key={role.id} style={styles.roleCard}>
                        <View style={styles.roleHeader}>
                            <View style={styles.roleTitleContainer}>
                                <Ionicons name={role.icon as any} size={24} color={role.iconColor} />
                                <View style={styles.roleTitleText}>
                                    <Text style={styles.roleName}>{role.name}</Text>
                                    <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Permissions List */}
                        <ScrollView
                            style={styles.permissionsListContainer}
                            nestedScrollEnabled={true}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.permissionsList}>
                                {permissions.map((permission) => {
                                    const isEnabled = rolePermissions[role.id]?.[permission.id] || false;
                                    return (
                                        <View key={permission.id} style={styles.permissionItem}>
                                            <View style={styles.permissionLeft}>
                                                <Ionicons
                                                    name={permission.icon as any}
                                                    size={20}
                                                    color={permission.iconColor}
                                                />
                                                <Text style={styles.permissionName}>{permission.name}</Text>
                                            </View>
                                            <Switch
                                                value={isEnabled}
                                                onValueChange={() => handleTogglePermission(role.id, permission.id)}
                                                trackColor={{ false: '#e2e8f0', true: theme.colors.secondary }}
                                                thumbColor={isEnabled ? 'white' : '#f1f5f9'}
                                                ios_backgroundColor="#e2e8f0"
                                            />
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </StyledCard>
                ))}
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
    headerRight: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: 100,
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
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    roleCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    roleHeader: {
        marginBottom: theme.spacing.md,
    },
    roleTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    roleTitleText: {
        flex: 1,
    },
    roleName: {
        ...theme.typography.h2,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    roleSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    permissionsListContainer: {
        maxHeight: 400,
    },
    permissionsList: {
        gap: theme.spacing.sm,
    },
    permissionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    permissionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flex: 1,
    },
    permissionName: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
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

