import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

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
    const divisions = [
        { id: 'freshmenAGirls', name: 'Freshmen A Girls' },
        { id: 'freshmenBGirls', name: 'Freshmen B Girls' },
        { id: 'cadetGirls', name: 'Cadet Girls' },
        { id: 'sophomoreGirls', name: 'Sophomore Girls' },
        { id: 'juniorGirls', name: 'Junior Girls' },
        { id: 'seniorGirls', name: 'Senior Girls' },
        { id: 'superGirls', name: 'Super Girls' },
        { id: 'teenGirls', name: 'Teen Girls' },
        { id: 'citGirls', name: 'CIT Girls' },
        { id: 'freshmenABoys', name: 'Freshmen A Boys' },
        { id: 'freshmenBBoys', name: 'Freshmen B Boys' },
        { id: 'cadetBoys', name: 'Cadet Boys' },
        { id: 'sophomoreBoys', name: 'Sophomore Boys' },
        { id: 'juniorBoys', name: 'Junior Boys' },
        { id: 'seniorBoys', name: 'Senior Boys' },
        { id: 'superBoys', name: 'Super Boys' },
        { id: 'teenBoys', name: 'Teen Boys' },
        { id: 'citBoys', name: 'CIT Boys' },
    ];

    const users: User[] = [
        { id: '1', name: 'Todd Robbins', email: 'todd@camptic.com', role: 'super_admin' },
        { id: '2', name: 'Haley Thomas', email: 'haley@camptic.com', role: 'viewer' },
        { id: '3', name: 'todd', email: 'todd.robbins18@gmail.com', role: 'admin' },
        { id: '4', name: 'Athletics', email: 'athletics@tylerhillcamp.com', role: 'admin' },
        { id: '5', name: 'Nick Williams', email: 'nick@tylerhillcamp.com', role: 'admin' },
        { id: '6', name: 'Mike Davidowitz', email: 'mike@camptic.com', role: 'admin' },
        { id: '7', name: 'ansaralyh@gmail.com', email: 'ansaralyh@gmail.com', role: 'viewer' },
        { id: '8', name: 'Courtney Sloan Parker', email: 'courtney@tylerhillcamp.com', role: 'staff' },
        { id: '9', name: 'raeesajidal10', email: 'raeesajidal10@gmail.com', role: 'admin' },
    ];

    const [userDivisionPermissions, setUserDivisionPermissions] = useState<UserDivisionPermissions>({
        '1': {
            freshmenAGirls: true,
            freshmenBGirls: true,
            cadetGirls: true,
            sophomoreGirls: true,
            juniorGirls: true,
            seniorGirls: true,
            superGirls: true,
            teenGirls: false,
            citGirls: false,
            freshmenABoys: false,
            freshmenBBoys: false,
            cadetBoys: false,
            sophomoreBoys: false,
            juniorBoys: false,
            seniorBoys: false,
            superBoys: false,
            teenBoys: false,
            citBoys: false,
        },
        '2': {
            freshmenAGirls: false,
            freshmenBGirls: false,
            cadetGirls: false,
            sophomoreGirls: false,
            juniorGirls: false,
            seniorGirls: false,
            superGirls: false,
            teenGirls: false,
            citGirls: false,
            freshmenABoys: false,
            freshmenBBoys: false,
            cadetBoys: false,
            sophomoreBoys: false,
            juniorBoys: false,
            seniorBoys: false,
            superBoys: false,
            teenBoys: false,
            citBoys: false,
        },
        '3': {
            freshmenAGirls: false,
            freshmenBGirls: false,
            cadetGirls: false,
            sophomoreGirls: false,
            juniorGirls: false,
            seniorGirls: false,
            superGirls: false,
            teenGirls: false,
            citGirls: false,
            freshmenABoys: false,
            freshmenBBoys: false,
            cadetBoys: false,
            sophomoreBoys: false,
            juniorBoys: false,
            seniorBoys: false,
            superBoys: false,
            teenBoys: false,
            citBoys: false,
        },
        '4': {
            freshmenAGirls: false,
            freshmenBGirls: false,
            cadetGirls: false,
            sophomoreGirls: false,
            juniorGirls: false,
            seniorGirls: false,
            superGirls: false,
            teenGirls: false,
            citGirls: false,
            freshmenABoys: false,
            freshmenBBoys: false,
            cadetBoys: false,
            sophomoreBoys: false,
            juniorBoys: false,
            seniorBoys: false,
            superBoys: false,
            teenBoys: false,
            citBoys: false,
        },
        '5': {
            freshmenAGirls: false,
            freshmenBGirls: false,
            cadetGirls: false,
            sophomoreGirls: false,
            juniorGirls: false,
            seniorGirls: false,
            superGirls: false,
            teenGirls: false,
            citGirls: false,
            freshmenABoys: false,
            freshmenBBoys: false,
            cadetBoys: false,
            sophomoreBoys: false,
            juniorBoys: false,
            seniorBoys: false,
            superBoys: false,
            teenBoys: false,
            citBoys: false,
        },
        '6': {
            freshmenAGirls: false,
            freshmenBGirls: false,
            cadetGirls: false,
            sophomoreGirls: false,
            juniorGirls: false,
            seniorGirls: false,
            superGirls: false,
            teenGirls: false,
            citGirls: false,
            freshmenABoys: false,
            freshmenBBoys: false,
            cadetBoys: false,
            sophomoreBoys: false,
            juniorBoys: false,
            seniorBoys: false,
            superBoys: false,
            teenBoys: false,
            citBoys: false,
        },
        '7': {
            freshmenAGirls: false,
            freshmenBGirls: false,
            cadetGirls: false,
            sophomoreGirls: false,
            juniorGirls: false,
            seniorGirls: false,
            superGirls: false,
            teenGirls: false,
            citGirls: false,
            freshmenABoys: false,
            freshmenBBoys: false,
            cadetBoys: false,
            sophomoreBoys: false,
            juniorBoys: false,
            seniorBoys: false,
            superBoys: false,
            teenBoys: false,
            citBoys: false,
        },
        '8': {
            freshmenAGirls: false,
            freshmenBGirls: false,
            cadetGirls: false,
            sophomoreGirls: false,
            juniorGirls: false,
            seniorGirls: false,
            superGirls: false,
            teenGirls: false,
            citGirls: false,
            freshmenABoys: false,
            freshmenBBoys: false,
            cadetBoys: false,
            sophomoreBoys: false,
            juniorBoys: false,
            seniorBoys: false,
            superBoys: false,
            teenBoys: false,
            citBoys: false,
        },
        '9': {
            freshmenAGirls: false,
            freshmenBGirls: false,
            cadetGirls: false,
            sophomoreGirls: false,
            juniorGirls: false,
            seniorGirls: false,
            superGirls: false,
            teenGirls: false,
            citGirls: false,
            freshmenABoys: false,
            freshmenBBoys: false,
            cadetBoys: false,
            sophomoreBoys: false,
            juniorBoys: false,
            seniorBoys: false,
            superBoys: false,
            teenBoys: false,
            citBoys: false,
        },
    });

    const handleToggleDivision = (userId: string, divisionId: string) => {
        setUserDivisionPermissions(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [divisionId]: !prev[userId]?.[divisionId],
            }
        }));
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
                                            value={isEnabled}
                                            onValueChange={() => handleToggleDivision(user.id, division.id)}
                                            trackColor={{ false: '#e2e8f0', true: theme.colors.secondary }}
                                            thumbColor={isEnabled ? 'white' : '#f1f5f9'}
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

