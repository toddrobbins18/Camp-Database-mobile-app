import React, { createElement } from 'react';
import {
    Modal,
    View,
    Pressable,
    TouchableOpacity,
    Text,
    Platform,
    StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../theme/theme';

export function formatDateYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseDateYmd(ymd: string): Date | null {
    const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const y = Number(match[1]);
    const m = Number(match[2]);
    const day = Number(match[3]);
    if (!y || !m || !day) return null;
    return new Date(y, m - 1, day);
}

type DatePickerModalProps = {
    visible: boolean;
    value: Date;
    onClose: () => void;
    onChange: (date: Date) => void;
    accentColor?: string;
};

/** Cross-platform date picker — `@react-native-community/datetimepicker` does not render on web. */
export function DatePickerModal({
    visible,
    value,
    onClose,
    onChange,
    accentColor = theme.colors.secondary,
}: DatePickerModalProps) {
    if (!visible) return null;

    if (Platform.OS === 'android') {
        return (
            <DateTimePicker
                value={value}
                mode="date"
                display="default"
                onChange={(event, date) => {
                    onClose();
                    if (event.type === 'dismissed' || !date) return;
                    onChange(date);
                }}
            />
        );
    }

    if (Platform.OS === 'web') {
        return (
            <Modal transparent visible animationType="fade" onRequestClose={onClose}>
                <Pressable style={styles.overlay} onPress={onClose}>
                    <Pressable style={styles.sheet} onPress={(e: any) => e.stopPropagation?.()}>
                        <Text style={styles.label}>Select date</Text>
                        {createElement('input', {
                            type: 'date',
                            value: formatDateYmd(value),
                            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                                const next = parseDateYmd(e.target.value);
                                if (next) onChange(next);
                            },
                            style: {
                                width: '100%',
                                fontSize: 18,
                                padding: 12,
                                border: '1px solid #e2e8f0',
                                borderRadius: 8,
                                boxSizing: 'border-box',
                                fontFamily: 'system-ui, sans-serif',
                            },
                        })}
                        <TouchableOpacity
                            style={[styles.doneBtn, { backgroundColor: accentColor }]}
                            onPress={onClose}
                        >
                            <Text style={styles.doneText}>Done</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        );
    }

    return (
        <Modal transparent visible animationType="slide" onRequestClose={onClose}>
            <View style={styles.iosWrap}>
                <Pressable style={{ flex: 1 }} onPress={onClose} />
                <View style={styles.iosInner}>
                    <DateTimePicker
                        value={value}
                        mode="date"
                        display="spinner"
                        themeVariant="light"
                        onChange={(_, date) => date && onChange(date)}
                    />
                    <TouchableOpacity
                        style={[styles.doneBtn, { backgroundColor: accentColor }]}
                        onPress={onClose}
                    >
                        <Text style={styles.doneText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    sheet: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '100%',
        maxWidth: 420,
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    iosWrap: { flex: 1, justifyContent: 'flex-end' },
    iosInner: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.lg,
        borderTopRightRadius: theme.borderRadius.lg,
        paddingBottom: theme.spacing.lg,
    },
    doneBtn: {
        marginTop: theme.spacing.sm,
        alignSelf: 'flex-end',
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    doneText: { color: '#fff', fontWeight: '600' },
});
