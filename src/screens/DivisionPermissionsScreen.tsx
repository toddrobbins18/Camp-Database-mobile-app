import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import {
    useDivisionsLookup,
    useDivisionPermissions,
    useUpdateDivisionPermission,
    useBulkUpdateDivisionPermissions,
} from '../api/permissions';
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
const DIVISION_SCOPED_ROLES = new Set(['division_leader', 'viewer']);

export const DivisionPermissionsScreen = ({ navigation }: any) => {
    const { companyId } = useCompany();
    const { data: dbDivisionsData, isLoading: divLoading } = useDivisionsLookup(companyId);
    const dbDivisions = dbDivisionsData ?? EMPTY_ROWS;
    const divisions = useMemo(() => dbDivisions.map((d: any) => ({ id: d.id, name: d.name })), [dbDivisions]);

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

            const { data: rolesData, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id, role')
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

    const scopedUsers = useMemo(
        () => users.filter((user: User) => DIVISION_SCOPED_ROLES.has(user.role)),
        [users],
    );
    const otherUsers = useMemo(
        () => users.filter((user: User) => !DIVISION_SCOPED_ROLES.has(user.role)),
        [users],
    );

    const { data: dbPermsData, isLoading: permsLoading } = useDivisionPermissions(companyId);
    const dbPerms = dbPermsData ?? EMPTY_ROWS;
    const updateDivPermMutation = useUpdateDivisionPermission();
    const bulkUpdateMutation = useBulkUpdateDivisionPermissions();

    const [userDivisionPermissions, setUserDivisionPermissions] = useState<UserDivisionPermissions>({});
    const [busyUserId, setBusyUserId] = useState<string | null>(null);

    useEffect(() => {
        if (!companyId) return;
        if (divLoading || usersLoading || permsLoading) return;
        if (scopedUsers.length === 0 || divisions.length === 0) {
            setUserDivisionPermissions({});
            return;
        }

        const perms: UserDivisionPermissions = {};
        scopedUsers.forEach((u: User) => {
            perms[u.id] = {};
            divisions.forEach((d) => {
                perms[u.id][d.id] = false;
            });
        });

        dbPerms.forEach((p: any) => {
            if (p.can_access && perms[p.user_id] && p.division_id) {
                perms[p.user_id][p.division_id] = true;
            }
        });

        setUserDivisionPermissions(perms);
    }, [companyId, dbPerms, scopedUsers, divisions, divLoading, usersLoading, permsLoading]);

    const handleToggleDivision = async (userId: string, divisionId: string) => {
        if (!companyId || busyUserId) return;

        const previousValue = userDivisionPermissions[userId]?.[divisionId] ?? false;
        const newValue = !previousValue;

        setUserDivisionPermissions((prev) => ({
            ...prev,
            [userId]: {
                ...(prev[userId] || {}),
                [divisionId]: newValue,
            },
        }));

        try {
            await updateDivPermMutation.mutateAsync({
                user_id: userId,
                division_id: divisionId,
                company_id: companyId,
                can_access: newValue,
            });
        } catch {
            setUserDivisionPermissions((prev) => ({
                ...prev,
                [userId]: {
                    ...(prev[userId] || {}),
                    [divisionId]: previousValue,
                },
            }));
        }
    };

    const handleSetAllDivisionsForUser = async (userId: string, desiredValue: boolean) => {
        if (!companyId || busyUserId || divisions.length === 0) return;

        const snapshot = { ...(userDivisionPermissions[userId] || {}) };
        const nextForUser = Object.fromEntries(divisions.map((d) => [d.id, desiredValue]));

        setBusyUserId(userId);
        setUserDivisionPermissions((prev) => ({
            ...prev,
            [userId]: nextForUser,
        }));

        try {
            await bulkUpdateMutation.mutateAsync({
                company_id: companyId,
                user_id: userId,
                division_ids: divisions.map((d) => d.id),
                can_access: desiredValue,
            });
        } catch {
            setUserDivisionPermissions((prev) => ({
                ...prev,
                [userId]: snapshot,
            }));
        } finally {
            setBusyUserId(null);
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

    const isLoading = divLoading || usersLoading || permsLoading;

    return (
        <SafeAreaView style={styles.container}>
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
                <View style={styles.titleSection}>
                    <Text style={styles.title}>Division Permissions</Text>
                    <Text style={styles.subtitle}>Control which divisions each user can access</Text>
                </View>

                {isLoading ? (
                    <View style={{ paddingVertical: theme.spacing.lg }}>
                        <ActivityIndicator size="large" color={theme.colors.textSecondary} />
                    </View>
                ) : null}

                {scopedUsers.map((user: User) => {
                    const isBusy = busyUserId === user.id;
                    const selectedCount = divisions.filter(
                        (division) => userDivisionPermissions[user.id]?.[division.id],
                    ).length;

                    return (
                        <StyledCard key={user.id} style={styles.userCard}>
                            <View style={styles.userHeader}>
                                <View style={styles.userInfo}>
                                    <Ionicons name="shield-outline" size={24} color={getRoleColor(user.role)} />
                                    <View style={styles.userDetails}>
                                        <Text style={styles.userName}>{user.name}</Text>
                                        <Text style={styles.userEmail}>{user.email}</Text>
                                    </View>
                                </View>
                                <View style={styles.userHeaderRight}>
                                    <Text style={styles.selectionCount}>
                                        {selectedCount}/{divisions.length} selected
                                    </Text>
                                    <View style={styles.userHeaderActions}>
                                        <TouchableOpacity
                                            style={[
                                                styles.userHeaderActionBtn,
                                                styles.userHeaderActionBtnPrimary,
                                                (isBusy || selectedCount === divisions.length) && styles.actionDisabled,
                                            ]}
                                            disabled={isBusy || selectedCount === divisions.length}
                                            onPress={() => handleSetAllDivisionsForUser(user.id, true)}
                                        >
                                            <Text style={[styles.userHeaderActionText, styles.userHeaderActionTextPrimary]}>
                                                Select All
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.userHeaderActionBtn,
                                                styles.userHeaderActionBtnMuted,
                                                (isBusy || selectedCount === 0) && styles.actionDisabled,
                                            ]}
                                            disabled={isBusy || selectedCount === 0}
                                            onPress={() => handleSetAllDivisionsForUser(user.id, false)}
                                        >
                                            <Text style={[styles.userHeaderActionText, styles.userHeaderActionTextMuted]}>
                                                Deselect All
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
                                        <Text style={styles.roleBadgeText}>{formatRole(user.role)}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.divisionsListContainer}>
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
                                                value={isEnabled}
                                                onValueChange={() => handleToggleDivision(user.id, division.id)}
                                                trackColor={{ false: '#e2e8f0', true: theme.colors.secondary }}
                                                thumbColor="#ffffff"
                                                ios_backgroundColor="#e2e8f0"
                                                disabled={isBusy}
                                            />
                                        </View>
                                    );
                                })}
                            </View>
                        </StyledCard>
                    );
                })}

                {!isLoading && otherUsers.length > 0 && (
                    <StyledCard style={styles.userCard}>
                        <Text style={styles.otherRolesTitle}>Other roles</Text>
                        <Text style={styles.otherRolesSubtitle}>
                            Admins, staff, specialists, and health center users already have access to all divisions.
                        </Text>
                        {otherUsers.map((user: User) => (
                            <View key={user.id} style={styles.otherUserRow}>
                                <Text style={styles.otherUserName}>{user.name}</Text>
                                <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
                                    <Text style={styles.roleBadgeText}>{formatRole(user.role)}</Text>
                                </View>
                            </View>
                        ))}
                    </StyledCard>
                )}

                {!isLoading && scopedUsers.length === 0 && (
                    <StyledCard style={styles.userCard}>
                        <Text style={styles.emptyText}>No division leaders or viewers found for this camp.</Text>
                    </StyledCard>
                )}
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
    selectionCount: {
        fontSize: 12,
        color: theme.colors.textSecondary,
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
    actionDisabled: {
        opacity: 0.5,
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
        gap: 0,
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
    otherRolesTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    otherRolesSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    otherUserRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    otherUserName: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
});
