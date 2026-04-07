import React from 'react';
import { View, Text, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

/**
 * Bottom-sheet style overlay that renders **inside** a parent (e.g. one RN Modal).
 * Use this instead of opening a second `Modal` for pickers — stacked Modals break
 * touch handling on iOS and can leave the app unresponsive.
 */
type Props = {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
};

export function ModalPickerOverlay({ visible, onClose, title, children }: Props) {
    if (!visible) return null;
    return (
        <View style={styles.root} pointerEvents="box-none">
            <View style={styles.inner}>
                <Pressable
                    style={styles.backdrop}
                    onPress={onClose}
                    accessibilityRole="button"
                />
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                    {children}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
        elevation: 9999,
    },
    inner: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    /** flex:1 so touches resolve here; avoid stacked full-screen Modals on iOS */
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '85%',
        width: '100%',
        zIndex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
});
