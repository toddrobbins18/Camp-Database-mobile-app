import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useRole } from '../hooks/useRole';
import { theme } from '../theme/theme';

export function MobileUserMenu({ navigation }: { navigation: any }) {
    const { data: roleData } = useRole();
    const [open, setOpen] = useState(false);

    const isSuperAdmin = roleData?.isSuperAdmin ?? false;
    const isAdmin = roleData?.isAdmin ?? false;

    const canGoToAdminPanel = !!isAdmin;

    const menuTitle = useMemo(() => {
        if (isSuperAdmin) return 'Super Admin';
        if (isAdmin) return 'Admin';
        return '';
    }, [isAdmin, isSuperAdmin]);

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
                        <View style={styles.roleRow}>
                            <TouchableOpacity
                                disabled={!canGoToAdminPanel}
                                onPress={() => go('AdminPanel')}
                                style={[
                                    styles.roleBtn,
                                    isAdmin && styles.roleBtnActive,
                                    !isAdmin && styles.roleBtnInactive,
                                ]}
                            >
                                <Text style={[styles.roleBtnText, isAdmin ? styles.roleBtnTextActive : styles.roleBtnTextInactive]}>
                                    Admin
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                disabled={!isSuperAdmin}
                                onPress={() => go('AdminPanel')}
                                style={[
                                    styles.roleBtn,
                                    isSuperAdmin && styles.roleBtnActive,
                                    !isSuperAdmin && styles.roleBtnInactive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.roleBtnText,
                                        isSuperAdmin ? styles.roleBtnTextActive : styles.roleBtnTextInactive,
                                    ]}
                                >
                                    Super Admin
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {menuTitle ? (
                            <Text style={styles.menuSubTitle}>{menuTitle}</Text>
                        ) : null}

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
        width: 240,
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
        gap: theme.spacing.sm,
    },
    roleRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    roleBtn: {
        flex: 1,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    roleBtnActive: {
        backgroundColor: theme.colors.primary,
    },
    roleBtnInactive: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    roleBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },
    roleBtnTextActive: {
        color: theme.colors.surface,
    },
    roleBtnTextInactive: {
        color: theme.colors.textSecondary,
    },
    menuSubTitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        textAlign: 'center',
        marginTop: -6,
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

