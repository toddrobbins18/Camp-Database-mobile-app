import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { useRolePermissions, useUpdateRolePermission } from '../api/permissions';

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

/** Stable fallback — default `[]` from `data ??` is a new array each render and breaks useEffect deps. */
const EMPTY_DB_PERMISSIONS: unknown[] = [];

const getCompanyMenuItems = (companySlug?: string | null): Permission[] => {
    // NOTE: These IDs MUST match the `menu_item` values stored in `public.role_permissions`
    // and used by the web app role-permissions page.
    const baseItems: Permission[] = [
        {
            id: 'sports-calendar',
            name: companySlug === 'timber-lake-west' ? 'Athletics' : 'Sports Calendar',
            icon: 'trophy-outline',
            iconColor: '#f59e0b',
        },
        { id: 'roster', name: 'Camper', icon: 'people-outline', iconColor: '#3b82f6' },
        { id: 'dashboard', name: 'Dashboard', icon: 'bar-chart-outline', iconColor: '#3b82f6' },
        { id: 'calendar', name: 'Master Calendar', icon: 'calendar-outline', iconColor: '#ef4444' },
        { id: 'menu', name: 'Menu', icon: 'restaurant-outline', iconColor: '#64748b' },
        { id: 'rainy-day', name: 'Rainy Day Schedule', icon: 'rainy-outline', iconColor: '#94a3b8' },
        {
            id: 'special-events',
            name: 'Special Events & Evening Activities',
            icon: 'sparkles-outline',
            iconColor: '#f97316',
        },
        { id: 'staff', name: 'Staff', icon: 'person-outline', iconColor: '#3b82f6' },
        { id: 'tutoring-therapy', name: 'Tutoring & Therapy', icon: 'book-outline', iconColor: '#64748b' },
        { id: 'activities', name: 'Activities & Field Trips', icon: 'leaf-outline', iconColor: '#10b981' },
        { id: 'messages', name: 'Messages', icon: 'chatbubble-outline', iconColor: '#3b82f6' },
        { id: 'transportation', name: 'Transportation', icon: 'car-outline', iconColor: '#64748b' },
        { id: 'od-management', name: 'OD Management', icon: 'clipboard-outline', iconColor: '#64748b' },
        { id: 'appointments', name: 'Appointments', icon: 'medical-outline', iconColor: '#ef4444' },
        { id: 'reports', name: 'Reports', icon: 'bar-chart-outline', iconColor: '#64748b' },
        { id: 'nurse', name: 'Nurse', icon: 'medical-outline', iconColor: '#ef4444' },
        { id: 'awards', name: 'Awards', icon: 'trophy-outline', iconColor: '#f59e0b' },
        { id: 'incidents', name: 'Incident Reports', icon: 'warning-outline', iconColor: '#f59e0b' },
        { id: 'sports-academy', name: 'Sports Academy', icon: 'football-outline', iconColor: '#1f2937' },
        { id: 'roster-templates', name: 'Roster Templates', icon: 'list-outline', iconColor: '#64748b' },
    ];

    // Daily Notes/News - all camps EXCEPT timber-lake-camp (matches web)
    if (companySlug !== 'timber-lake-camp') {
        baseItems.push({
            id: 'notes',
            name: companySlug === 'tyler-hill-camp' ? 'Daily News' : 'Daily Notes',
            icon: 'document-text-outline',
            iconColor: '#f97316',
        });
    }

    // Daily Wolf - ONLY for timber-lake-west (matches web)
    if (companySlug === 'timber-lake-west') {
        baseItems.push(
            {
                id: 'daily-wolf-printable',
                name: 'Daily Wolf Printable',
                icon: 'document-text-outline',
                iconColor: '#f97316',
            },
            {
                id: 'daily-wolf-management',
                name: 'Daily Wolf Management',
                icon: 'clipboard-outline',
                iconColor: '#f97316',
            }
        );
    }

    // Daily Schedule - ONLY for timber-lake-camp (matches web)
    if (companySlug === 'timber-lake-camp') {
        baseItems.push({
            id: 'daily-schedule',
            name: 'Daily Schedule',
            icon: 'calendar-outline',
            iconColor: '#ef4444',
        });
    }

    // Special Meals - ONLY for tyler-hill-camp (matches web)
    if (companySlug === 'tyler-hill-camp') {
        baseItems.push({
            id: 'special-meals',
            name: 'Special Meals',
            icon: 'restaurant-outline',
            iconColor: '#64748b',
        });
    }

    // Admin items (all companies)
    baseItems.push(
        { id: 'admin', name: 'Admin Panel', icon: 'shield-outline', iconColor: '#3b82f6' },
        { id: 'evaluation-questions', name: 'Evaluation Questions', icon: 'clipboard-outline', iconColor: '#8b4513' },
        { id: 'role-permissions', name: 'Role Permissions', icon: 'settings-outline', iconColor: '#f59e0b' },
        { id: 'division-permissions', name: 'Division Permissions', icon: 'lock-closed-outline', iconColor: '#f59e0b' },
        {
            id: 'specialist-sport-assignments',
            name: 'Specialist Sport Assignments',
            icon: 'trophy-outline',
            iconColor: '#f59e0b',
        },
        { id: 'user-approvals', name: 'User Approvals', icon: 'checkmark-circle-outline', iconColor: '#10b981' }
    );

    return baseItems.sort((a, b) => a.name.localeCompare(b.name));
};

export const RolePermissionsScreen = ({ navigation }: any) => {
    const { companyId, companySlug, isSuperAdmin } = useCompany();

    type AppRole = 'admin' | 'staff' | 'division_leader' | 'specialist' | 'health_center' | 'viewer';
    const roleDefs: Array<{
        id: AppRole;
        name: string;
        icon: string;
        iconColor: string;
        subtitle: string;
    }> = useMemo(
        () => [
            { id: 'admin', name: 'Administrator', icon: 'shield-outline', iconColor: '#3b82f6', subtitle: 'Full system access' },
            { id: 'staff', name: 'Staff', icon: 'people-outline', iconColor: '#3b82f6', subtitle: 'Standard staff access' },
            { id: 'division_leader', name: 'Division Leader', icon: 'people-outline', iconColor: '#3b82f6', subtitle: 'Full access to assigned division(s)' },
            { id: 'specialist', name: 'Specialist', icon: 'trophy-outline', iconColor: '#f59e0b', subtitle: 'Cross-division access to specialized features (e.g. sports)' },
            { id: 'health_center', name: 'Health Center', icon: 'heart-outline', iconColor: '#3b82f6', subtitle: 'Access to health, medical, and incident reports' },
            { id: 'viewer', name: 'Viewer', icon: 'eye-outline', iconColor: '#3b82f6', subtitle: 'Read-only access' },
        ],
        []
    );

    const menuItems = useMemo(() => getCompanyMenuItems(companySlug), [companySlug]);

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

    // Fetch role permissions from Supabase (company-scoped, like web)
    const { data: dbPermissionsData, isLoading: permLoading } = useRolePermissions(companyId);
    const dbPermissions = dbPermissionsData ?? EMPTY_DB_PERMISSIONS;
    const updatePermMutation = useUpdateRolePermission();

    const [rolePermissions, setRolePermissions] = useState<RolePermissions>(() => {
        return roleDefs.reduce((acc, role) => {
            acc[role.id] = {};
            return acc;
        }, {} as RolePermissions);
    });

    // Hydrate local state from Supabase data (company + role + menu_item)
    useEffect(() => {
        if (permLoading) return;

        const next = roleDefs.reduce((acc, role) => {
            acc[role.id] = {};
            return acc;
        }, {} as RolePermissions);

        dbPermissions.forEach((p: any) => {
            const roleKey = p.role as AppRole;
            if (next[roleKey]) {
                next[roleKey][p.menu_item] = p.can_access;
            }
        });

        setRolePermissions(next);
    }, [dbPermissions, companyId, roleDefs, permLoading]);

    const handleTogglePermission = async (roleId: AppRole, menuItemId: string) => {
        if (!companyId) return;

        const currentValue = rolePermissions[roleId]?.[menuItemId] ?? false;
        const newValue = !currentValue;

        setRolePermissions(prev => ({
            ...prev,
            [roleId]: {
                ...prev[roleId],
                [menuItemId]: newValue,
            }
        }));

        try {
            await updatePermMutation.mutateAsync({
                companyId,
                role: roleId,
                menu_item: menuItemId,
                can_access: newValue,
            });
        } catch (e) {
            // Revert optimistic update on failure
            setRolePermissions(prev => ({
                ...prev,
                [roleId]: {
                    ...prev[roleId],
                    [menuItemId]: currentValue,
                }
            }));
        }
    };

    const handleSetAllPermissions = async (roleId: AppRole, desiredValue: boolean) => {
        if (!companyId) return;

        const updates = menuItems.map((item) => {
            const currentValue = rolePermissions[roleId]?.[item.id] ?? false;
            if (currentValue === desiredValue) return Promise.resolve();
            return updatePermMutation.mutateAsync({
                companyId,
                role: roleId,
                menu_item: item.id,
                can_access: desiredValue,
            });
        });

        // Optimistic update to match web UX
        setRolePermissions(prev => ({
            ...prev,
            [roleId]: menuItems.reduce((acc, item) => {
                acc[item.id] = desiredValue;
                return acc;
            }, { ...(prev[roleId] || {}) }),
        }));

        try {
            await Promise.all(updates);
        } catch (e) {
            // If bulk update fails, re-hydrate from DB on next query invalidation
        }
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
                {permLoading || !companyId ? (
                    <View style={{ paddingVertical: theme.spacing.lg }}>
                        <ActivityIndicator size="large" color={theme.colors.textSecondary} />
                    </View>
                ) : (
                    roleDefs.map((role) => (
                    <StyledCard key={role.id} style={styles.roleCard}>
                        <View style={styles.roleHeader}>
                            <View style={styles.roleTitleContainer}>
                                <Ionicons name={role.icon as any} size={24} color={role.iconColor} />
                                <View style={styles.roleTitleText}>
                                    <Text style={styles.roleName}>{role.name}</Text>
                                    <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
                                </View>
                                <View style={styles.roleHeaderActions}>
                                    <TouchableOpacity
                                        style={[styles.roleHeaderActionBtn, styles.roleHeaderActionBtnPrimary]}
                                        disabled={updatePermMutation.isPending}
                                        onPress={() => handleSetAllPermissions(role.id, true)}
                                    >
                                        <Text style={[styles.roleHeaderActionText, styles.roleHeaderActionTextPrimary]}>Select All</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.roleHeaderActionBtn, styles.roleHeaderActionBtnMuted]}
                                        disabled={updatePermMutation.isPending}
                                        onPress={() => handleSetAllPermissions(role.id, false)}
                                    >
                                        <Text style={[styles.roleHeaderActionText, styles.roleHeaderActionTextMuted]}>Deselect All</Text>
                                    </TouchableOpacity>
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
                                {menuItems.map((permission) => {
                                    const isEnabled = rolePermissions[role.id]?.[permission.id] ?? false;
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
                                                key={`${permission.id}-${isEnabled}`}
                                                value={isEnabled}
                                                onValueChange={() => handleTogglePermission(role.id, permission.id)}
                                                trackColor={{ false: '#e2e8f0', true: theme.colors.secondary }}
                                                thumbColor="#ffffff"
                                                // @ts-ignore
                                                activeThumbColor="#ffffff"
                                                ios_backgroundColor="#e2e8f0"
                                                disabled={updatePermMutation.isPending}
                                            />
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </StyledCard>
                    ))
                )}
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
    roleHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    roleHeaderActionBtn: {
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    roleHeaderActionText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        fontWeight: '700',
    },
    roleHeaderActionBtnPrimary: {
        backgroundColor: theme.colors.secondary,
    },
    roleHeaderActionTextPrimary: {
        color: '#ffffff',
    },
    roleHeaderActionBtnMuted: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    roleHeaderActionTextMuted: {
        color: theme.colors.textSecondary,
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

