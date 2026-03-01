import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useDivisionsLookup, useDivisionPermissions, useUpdateDivisionPermission } from '../api/permissions';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'viewer' | 'staff' | 'super_admin';
}

interface UserDivisionPermissions {
    [userId: string]: {
        [divisionId: string]: boolean;
    };
}

export const DivisionPermissionsScreen = ({ navigation }: any) => {
    // Fetch divisions from Supabase
    const { data: dbDivisions = [], isLoading: divLoading } = useDivisionsLookup();
    const divisions = dbDivisions.map((d: any) => ({ id: d.id, name: d.name }));

    // Fetch users from Supabase profiles
    const { data: users = [], isLoading: usersLoading } = useQuery({
        queryKey: ['profiles_division_perms'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .order('full_name', { ascending: true });
            if (error) throw error;
            return (data || []).map((p: any) => ({
                id: p.id,
                name: p.full_name || p.email || 'Unknown',
                email: p.email || '',
                role: 'staff' as const,
            }));
        },
    });

    // Fetch existing division permissions from Supabase
    const { data: dbPerms = [] } = useDivisionPermissions();
    const updateDivPermMutation = useUpdateDivisionPermission();

    const [userDivisionPermissions, setUserDivisionPermissions] = useState<UserDivisionPermissions>({});

    // Hydrate local state from Supabase division permissions
    useEffect(() => {
        if (dbPerms.length > 0 && users.length > 0) {
            const perms: UserDivisionPermissions = {};
            users.forEach((u: any) => {
                perms[u.id] = {};
                divisions.forEach((d: any) => {
                    perms[u.id][d.id] = false;
                });
            });
            dbPerms.forEach((p: any) => {
                if (perms[p.user_id]) {
                    perms[p.user_id][p.division_id] = p.can_access;
                }
            });
            setUserDivisionPermissions(perms);
        }
    }, [dbPerms, users, divisions]);

    const handleToggleDivision = (userId: string, divisionId: string) => {
        const newValue = !userDivisionPermissions[userId]?.[divisionId];
        setUserDivisionPermissions(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [divisionId]: newValue,
            }
        }));
        // Persist to Supabase
        updateDivPermMutation.mutate({ user_id: userId, division_id: divisionId, can_access: newValue });
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'super_admin':
            case 'admin':
                return theme.colors.secondary;
            case 'viewer':
                return '#3b82f6';
            case 'staff':
                return '#3b82f6';
            default:
                return theme.colors.textSecondary;
        }
    };

    const formatRole = (role: string) => {
        switch (role) {
            case 'super_admin':
                return 'super_admin';
            case 'admin':
                return 'admin';
            case 'viewer':
                return 'viewer';
            case 'staff':
                return 'staff';
            default:
                return role;
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
                {users.map((user) => (
                    <StyledCard key={user.id} style={styles.userCard}>
                        {/* User Info Header */}
                        <View style={styles.userHeader}>
                            <View style={styles.userInfo}>
                                <Ionicons name="shield-outline" size={24} color={getRoleColor(user.role)} />
                                <View style={styles.userDetails}>
                                    <Text style={styles.userName}>{user.name}</Text>
                                    <Text style={styles.userEmail}>{user.email}</Text>
                                </View>
                            </View>
                            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
                                <Text style={styles.roleBadgeText}>{formatRole(user.role)}</Text>
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
                                        />
                                    </View>
                                );
                            })}
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
        textTransform: 'lowercase',
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

