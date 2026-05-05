import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useDivisionsLookup, useDivisionPermissions, useUpdateDivisionPermission } from '../api/permissions';
import { useCompany } from '../contexts/CompanyContext';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'viewer' | 'staff' | 'super_admin' | 'division_leader' | 'specialist' | 'health_center';
}

interface UserDivisionPermissions {
    [userId: string]: {
        [divisionId: string]: boolean;
    };
}

const EMPTY_ROWS: unknown[] = [];

export const DivisionPermissionsScreen = ({ navigation }: any) => {
    const { companyId } = useCompany();
    const { data: dbDivisionsData, isLoading: divLoading } = useDivisionsLookup(companyId);
    const dbDivisions = dbDivisionsData ?? EMPTY_ROWS;
    const divisions = useMemo(() => dbDivisions.map((d: any) => ({ id: d.id, name: d.name })), [dbDivisions]);

    // Fetch approved users in current company (match Lovable), then their roles from user_roles
    const { data: usersData, isLoading: usersLoading } = useQuery({
        queryKey: ['profiles_division_perms', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data: profilesData, error: profError } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('approved', true)
                .eq('company_id', companyId)
                .order('full_name', { ascending: true });
            if (profError) throw profError;
            const profiles = profilesData || [];
            if (profiles.length === 0) return [];

            const userIds = profiles.map((p: any) => p.id);
            const { data: rolesData, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id, role')
                .in('user_id', userIds)
                .eq('company_id', companyId);
            if (rolesError) throw rolesError;

            const roleByUser: Record<string, string> = {};
            (rolesData || []).forEach((r: any) => {
                const existing = roleByUser[r.user_id];
                const order = ['super_admin', 'admin', 'health_center', 'staff', 'division_leader', 'specialist', 'viewer'];
                const idx = (role: string) => order.indexOf(role);
                if (existing == null || idx(r.role) < idx(existing)) roleByUser[r.user_id] = r.role;
            });

            return profiles.map((p: any) => ({
                id: p.id,
                name: p.full_name || p.email || 'Unknown',
                email: p.email || '',
                role: (roleByUser[p.id] || 'viewer') as User['role'],
            }));
        },
        enabled: !!companyId,
    });
    const users = usersData ?? EMPTY_ROWS;

    // Fetch existing division permissions from Supabase
    const { data: dbPermsData, isLoading: permsLoading } = useDivisionPermissions(companyId);
    const dbPerms = dbPermsData ?? EMPTY_ROWS;
    const updateDivPermMutation = useUpdateDivisionPermission();

    const [userDivisionPermissions, setUserDivisionPermissions] = useState<UserDivisionPermissions>({});

    // Hydrate local state from Supabase division permissions
    useEffect(() => {
        if (!companyId) return;
        if (divLoading || usersLoading || permsLoading) return;

        const perms: UserDivisionPermissions = {};
        users.forEach((u: any) => {
            perms[u.id] = {};
            divisions.forEach((d: any) => {
                perms[u.id][d.id] = false;
            });
        });

        dbPerms.forEach((p: any) => {
            if (perms[p.user_id] && p.division_id) {
                perms[p.user_id][p.division_id] = !!p.can_access;
            }
        });

        setUserDivisionPermissions(perms);
    }, [companyId, dbPerms, users, divisions, divLoading, usersLoading, permsLoading]);

    const handleToggleDivision = async (userId: string, divisionId: string) => {
        if (!companyId) return;

        const previousValue = userDivisionPermissions[userId]?.[divisionId] ?? false;
        const newValue = !previousValue;

        setUserDivisionPermissions(prev => ({
            ...prev,
            [userId]: {
                ...(prev[userId] || {}),
                [divisionId]: newValue,
            }
        }));

        try {
            await updateDivPermMutation.mutateAsync({
                user_id: userId,
                division_id: divisionId,
                company_id: companyId,
                can_access: newValue,
            });
        } catch (e) {
            // Revert on failure
            setUserDivisionPermissions(prev => ({
                ...prev,
                [userId]: {
                    ...(prev[userId] || {}),
                    [divisionId]: previousValue,
                }
            }));
        }
    };

    const handleSetAllDivisionsForUser = async (userId: string, desiredValue: boolean) => {
        if (!companyId) return;
        const snapshot = { ...(userDivisionPermissions[userId] || {}) };

        const tasks = divisions
            .filter((d) => (snapshot[d.id] ?? false) !== desiredValue)
            .map((d) => updateDivPermMutation.mutateAsync({
                user_id: userId,
                division_id: d.id,
                company_id: companyId,
                can_access: desiredValue,
            }));

        // Optimistic update
        const nextForUser = divisions.reduce<Record<string, boolean>>((acc, d) => {
            acc[d.id] = desiredValue;
            return acc;
        }, {});

        setUserDivisionPermissions(prev => ({
            ...prev,
            [userId]: nextForUser,
        }));

        try {
            if (tasks.length) await Promise.all(tasks);
        } catch (e) {
            // Revert on failure
            setUserDivisionPermissions(prev => ({
                ...prev,
                [userId]: snapshot,
            }));
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'super_admin':
            case 'admin':
                return theme.colors.secondary;
            case 'division_leader':
            case 'specialist':
                return '#f59e0b';
            case 'health_center':
            case 'viewer':
            case 'staff':
                return '#3b82f6';
            default:
                return theme.colors.textSecondary;
        }
    };

    const formatRole = (role: string) => {
        switch (role) {
            case 'super_admin': return 'Super Admin';
            case 'admin': return 'Admin';
            case 'division_leader': return 'Division Leader';
            case 'specialist': return 'Specialist';
            case 'health_center': return 'Health Center';
            case 'viewer': return 'Viewer';
            case 'staff': return 'Staff';
            default: return role;
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
                    <Text style={styles.title}>Division Permissions</Text>
                    <Text style={styles.subtitle}>Control which divisions each user can access</Text>
                </View>

                {/* Users List */}
                {divLoading || usersLoading || permsLoading ? (
                    <View style={{ paddingVertical: theme.spacing.lg }}>
                        <ActivityIndicator size="large" color={theme.colors.textSecondary} />
                    </View>
                ) : null}
                {users.map((user) => (
                    <StyledCard key={user.id} style={styles.userCard}>
                        {/* User Info Header */}
                        <View style={styles.userHeader}>
                            <View style={styles.userInfo}>
                                <Ionicons name="shield-outline" size={24} color={getRoleColor(user.role)} />
                                <View style={styles.userDetails}>
                                    <Text style={styles.userName}>{user.name}</Text>
                                    <Text style={styles.userEmail}>{user.email}</Text>
                                    {user.role === 'super_admin' && (
                                        <Text style={styles.fullAccessNote}>Full access to entire app</Text>
                                    )}
                                </View>
                            </View>
                            <View style={styles.userHeaderRight}>
                                <View style={styles.userHeaderActions}>
                                    <TouchableOpacity
                                        style={[styles.userHeaderActionBtn, styles.userHeaderActionBtnPrimary]}
                                        disabled={updateDivPermMutation.isPending}
                                        onPress={() => handleSetAllDivisionsForUser(user.id, true)}
                                    >
                                        <Text style={[styles.userHeaderActionText, styles.userHeaderActionTextPrimary]}>Select All</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.userHeaderActionBtn, styles.userHeaderActionBtnMuted]}
                                        disabled={updateDivPermMutation.isPending}
                                        onPress={() => handleSetAllDivisionsForUser(user.id, false)}
                                    >
                                        <Text style={[styles.userHeaderActionText, styles.userHeaderActionTextMuted]}>Deselect All</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
                                    <Text style={styles.roleBadgeText}>{formatRole(user.role)}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Divisions List */}
                        <ScrollView
                            style={styles.divisionsListContainer}
                            nestedScrollEnabled={true}
                            showsVerticalScrollIndicator={true}
                        >
                            {divisions.map((division) => {
                                const isEnabled = userDivisionPermissions[user.id]?.[division.id] || false;
                                return (
                                    <View key={division.id} style={styles.divisionItem}>
                                        <View style={styles.divisionLeft}>
                                            <Ionicons
                                                name="people-outline"
                                                size={20}
                                                color={theme.colors.textSecondary}
                                            />
                                            <Text style={styles.divisionName}>{division.name}</Text>
                                        </View>
                                        <Switch
                                            key={`${division.id}-${isEnabled}`}
                                            value={isEnabled}
                                            onValueChange={() => handleToggleDivision(user.id, division.id)}
                                            trackColor={{ false: '#e2e8f0', true: theme.colors.secondary }}
                                            thumbColor="#ffffff"
                                            // @ts-ignore
                                            activeThumbColor="#ffffff"
                                            ios_backgroundColor="#e2e8f0"
                                            disabled={updateDivPermMutation.isPending}
                                        />
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </StyledCard>
                ))}
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
    headerRight: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: 100,
    },
    titleSection: {
        marginBottom: theme.spacing.lg,
        alignItems: 'center',
    },
    title: {
        ...theme.typography.h1,
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
        textAlign: 'center',
    },
    subtitle: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    userCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    userHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flex: 1,
    },
    userHeaderRight: {
        alignItems: 'flex-end',
        gap: theme.spacing.sm,
        marginLeft: theme.spacing.md,
    },
    userHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    userHeaderActionBtn: {
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    userHeaderActionText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        fontWeight: '700',
    },
    userHeaderActionBtnPrimary: {
        backgroundColor: theme.colors.secondary,
    },
    userHeaderActionTextPrimary: {
        color: '#ffffff',
    },
    userHeaderActionBtnMuted: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    userHeaderActionTextMuted: {
        color: theme.colors.textSecondary,
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        ...theme.typography.h2,
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    userEmail: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    fullAccessNote: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
        fontStyle: 'italic',
    },
    roleBadge: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
    },
    roleBadgeText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
    },
    divisionsListContainer: {
        maxHeight: 400,
    },
    divisionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    divisionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flex: 1,
    },
    divisionName: {
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

