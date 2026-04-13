import React from 'react';
import {
    Modal,
    View,
    Text,
    Pressable,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { theme } from '../theme/theme';

export type ConfirmDeleteModalProps = {
    visible: boolean;
    /** Shown as the main heading (default matches web roster delete dialog). */
    title?: string;
    /** Body copy under the title. */
    message: string;
    onCancel: () => void;
    onConfirm: () => void;
    /** Disables actions and shows a spinner on the confirm button. */
    isLoading?: boolean;
    cancelLabel?: string;
    confirmLabel?: string;
};

/**
 * Custom delete confirmation — matches web “Are you sure?” dialog (not browser confirm/alert).
 */
export function ConfirmDeleteModal({
    visible,
    title = 'Are you sure?',
    message,
    onCancel,
    onConfirm,
    isLoading = false,
    cancelLabel = 'Cancel',
    confirmLabel = 'Delete',
}: ConfirmDeleteModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => {
                if (!isLoading) onCancel();
            }}
        >
            <Pressable
                style={styles.overlay}
                onPress={() => {
                    if (!isLoading) onCancel();
                }}
            >
                <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.cancelBtn, isLoading && styles.btnDisabled]}
                            onPress={onCancel}
                            disabled={isLoading}
                            accessibilityRole="button"
                            accessibilityLabel={cancelLabel}
                        >
                            <Text style={styles.cancelText}>{cancelLabel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmBtn, isLoading && styles.btnDisabled]}
                            onPress={onConfirm}
                            disabled={isLoading}
                            accessibilityRole="button"
                            accessibilityLabel={confirmLabel}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color={theme.colors.surface} />
                            ) : (
                                <Text style={styles.confirmText}>{confirmLabel}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    content: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '90%',
        maxWidth: 400,
        padding: theme.spacing.xl,
        ...theme.shadows.card,
        elevation: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    message: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.md,
    },
    cancelBtn: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minWidth: 88,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelText: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    confirmBtn: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
        minWidth: 88,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmText: {
        color: theme.colors.surface,
        fontSize: 14,
        fontWeight: '600',
    },
    btnDisabled: {
        opacity: 0.65,
    },
});
