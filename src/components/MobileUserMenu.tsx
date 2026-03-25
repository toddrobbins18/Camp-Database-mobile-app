import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useRole } from '../hooks/useRole';
import { theme } from '../theme/theme';

export function MobileUserMenu({ navigation }: { navigation: any }) {
    const { data: roleData } = useRole();
    const [open, setOpen] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUserEmail(session?.user?.email ?? null);
        });
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserEmail(session?.user?.email ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);

    const isSuperAdmin = roleData?.isSuperAdmin ?? false;
    const isAdmin = roleData?.isAdmin ?? false;
    const roles = roleData?.roles ?? [];
    const showAdminBadge = roles.includes('admin') || roles.includes('super_admin');
    const showSuperAdminBadge = roles.includes('super_admin');

    const go = (routeName: string) => {
        setOpen(false);
        navigation?.navigate?.(routeName);
    };

    const handleLogout = async () => {
        setOpen(false);
        await supabase.auth.signOut();
        navigation?.navigate?.('Login');
    };

    return (
        <>
            <TouchableOpacity
                onPress={() => setOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="User menu"
            >
                <Ionicons name="person-circle-outline" size={28} color={theme.colors.text} />
            </TouchableOpacity>

            <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
                    <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.userSection}>
                            <Text style={styles.userEmail} numberOfLines={2}>
                                {userEmail ?? 'Signed in'}
                            </Text>
                            {(showAdminBadge || showSuperAdminBadge) ? (
                                <View style={styles.badgeRow}>
                                    {showAdminBadge ? (
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            disabled={!isAdmin}
                                            onPress={() => isAdmin && go('AdminPanel')}
                                            style={[styles.badge, styles.badgeAdmin]}
                                        >
                                            <Text style={styles.badgeText}>Admin</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                    {showSuperAdminBadge ? (
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            disabled={!isSuperAdmin}
                                            onPress={() => isSuperAdmin && go('AdminPanel')}
                                            style={[styles.badge, styles.badgeSuperAdmin]}
                                        >
                                            <Text style={styles.badgeText}>Super Admin</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            ) : null}
                        </View>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.menuRow}
                            disabled={false}
                            onPress={() => go('NotificationPreferences')}
                        >
                            <Ionicons name="notifications-outline" size={18} color={theme.colors.primary} />
                            <Text style={styles.menuRowText}>Notification Preferences</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuRow} onPress={handleLogout}>
                            <Ionicons name="exit-outline" size={18} color={theme.colors.primary} />
                            <Text style={styles.menuRowText}>Log out</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = {
    overlay: {
        flex: 1,
    },
    menu: {
        position: 'absolute' as const,
        top: 60,
        right: 16,
        minWidth: 260,
        maxWidth: 320,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 0,
    },
    userSection: {
        paddingBottom: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    userEmail: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.text,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        alignItems: 'center',
    },
    badge: {
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 999,
        alignSelf: 'flex-start',
    },
    badgeAdmin: {
        backgroundColor: '#0d9488',
    },
    badgeSuperAdmin: {
        backgroundColor: theme.colors.secondary,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginBottom: theme.spacing.sm,
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
    },
    menuRowText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
};

