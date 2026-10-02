import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    Pressable,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { theme } from '../theme/theme';
import { StyledCard } from './StyledCard';
import { ModalPickerOverlay } from './ModalPickerOverlay';
import { formatIsoDateToUs, toIsoDateOrNull } from '../api/staffPayload';

export type ParentContactType = 'phone' | 'email' | 'text';

type ParentCommunicationEntry = {
    id: string;
    contact_date: string;
    contact_type: ParentContactType;
    notes: string;
    logged_by_name: string | null;
    created_at: string;
    updated_at: string;
};

const CONTACT_TYPE_OPTIONS: { value: ParentContactType; label: string }[] = [
    { value: 'phone', label: 'Phone call' },
    { value: 'email', label: 'Email' },
    { value: 'text', label: 'Text message' },
];

function contactTypeLabel(type: ParentContactType): string {
    return CONTACT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function contactTypeIcon(type: ParentContactType): keyof typeof Ionicons.glyphMap {
    if (type === 'email') return 'mail-outline';
    if (type === 'text') return 'chatbubble-outline';
    return 'call-outline';
}

async function resolveLoggedByName(userId: string | undefined): Promise<string | null> {
    if (!userId) return null;
    const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .maybeSingle();
    return data?.full_name?.trim() || data?.email?.trim() || null;
}

interface Props {
    childId: string;
    companyId: string | null;
    season: string | null;
}

export function CamperParentContactLogTab({ childId, companyId, season }: Props) {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<ParentCommunicationEntry | null>(null);
    const [contactDate, setContactDate] = useState(formatIsoDateToUs(new Date().toISOString().slice(0, 10)));
    const [contactType, setContactType] = useState<ParentContactType>('phone');
    const [notes, setNotes] = useState('');
    const [showTypePicker, setShowTypePicker] = useState(false);

    const queryKey = ['camper_parent_communications', childId, companyId, season];

    const { data: entries = [], isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!childId || !companyId || !season) return [];
            const { data, error } = await supabase
                .from('camper_parent_communications')
                .select('id, contact_date, contact_type, notes, logged_by_name, created_at, updated_at')
                .eq('child_id', childId)
                .eq('company_id', companyId)
                .eq('season', season)
                .order('contact_date', { ascending: false })
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data ?? []) as ParentCommunicationEntry[];
        },
        enabled: !!childId && !!companyId && !!season,
    });

    useFocusEffect(
        useCallback(() => {
            void queryClient.invalidateQueries({ queryKey });
        }, [queryClient, queryKey]),
    );

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!childId || !companyId || !season || !notes.trim()) {
                throw new Error('Enter notes for this contact');
            }
            const isoDate = toIsoDateOrNull(contactDate);
            if (!isoDate) throw new Error('Enter a valid date (MM/DD/YYYY)');

            const { data: userData } = await supabase.auth.getUser();
            const loggedByName = await resolveLoggedByName(userData.user?.id ?? undefined);
            const payload = {
                contact_date: isoDate,
                contact_type: contactType,
                notes: notes.trim(),
                logged_by: userData.user?.id ?? null,
                logged_by_name: loggedByName,
            };

            if (editingEntry) {
                const { error } = await supabase
                    .from('camper_parent_communications')
                    .update(payload)
                    .eq('id', editingEntry.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('camper_parent_communications').insert({
                    ...payload,
                    child_id: childId,
                    company_id: companyId,
                    season,
                });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey });
            closeModal();
            Alert.alert('Success', editingEntry ? 'Contact log updated' : 'Contact logged');
        },
        onError: (error: any) => {
            Alert.alert('Error', error?.message || 'Failed to save contact log');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('camper_parent_communications').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey });
        },
        onError: (error: any) => {
            Alert.alert('Error', error?.message || 'Failed to delete entry');
        },
    });

    const closeModal = () => {
        setModalOpen(false);
        setEditingEntry(null);
        setContactDate(formatIsoDateToUs(new Date().toISOString().slice(0, 10)));
        setContactType('phone');
        setNotes('');
        setShowTypePicker(false);
    };

    const openCreate = () => {
        setEditingEntry(null);
        setContactDate(formatIsoDateToUs(new Date().toISOString().slice(0, 10)));
        setContactType('phone');
        setNotes('');
        setModalOpen(true);
    };

    const openEdit = (entry: ParentCommunicationEntry) => {
        setEditingEntry(entry);
        setContactDate(formatIsoDateToUs(entry.contact_date));
        setContactType(entry.contact_type);
        setNotes(entry.notes);
        setModalOpen(true);
    };

    const confirmDelete = (entry: ParentCommunicationEntry) => {
        Alert.alert('Delete contact log entry?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteMutation.mutate(entry.id),
            },
        ]);
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.countText}>
                    {isLoading ? 'Loading...' : `${entries.length} logged ${entries.length === 1 ? 'contact' : 'contacts'}`}
                </Text>
                <TouchableOpacity style={styles.addButton} onPress={openCreate}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addButtonText}>Log contact</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="small" color={theme.colors.secondary} />
                </View>
            ) : entries.length === 0 ? (
                <StyledCard style={styles.emptyCard}>
                    <Text style={styles.emptyText}>
                        No parent contacts logged yet. Record phone calls, emails, or texts with notes.
                    </Text>
                </StyledCard>
            ) : (
                <View style={styles.list}>
                    {entries.map((entry) => (
                        <StyledCard key={entry.id} style={styles.entryCard}>
                            <View style={styles.entryRow}>
                                <View style={styles.iconWrap}>
                                    <Ionicons name={contactTypeIcon(entry.contact_type)} size={22} color="#2563eb" />
                                </View>
                                <View style={styles.entryBody}>
                                    <View style={styles.entryTop}>
                                        <View style={styles.entryMeta}>
                                            <View style={styles.typeBadge}>
                                                <Text style={styles.typeBadgeText}>{contactTypeLabel(entry.contact_type)}</Text>
                                            </View>
                                            <Text style={styles.dateText}>
                                                {new Date(`${entry.contact_date}T12:00:00`).toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </Text>
                                        </View>
                                        <View style={styles.actions}>
                                            <TouchableOpacity onPress={() => openEdit(entry)} style={styles.actionBtn}>
                                                <Ionicons name="pencil-outline" size={18} color="#6b7280" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => confirmDelete(entry)} style={styles.actionBtn}>
                                                <Ionicons name="trash-outline" size={18} color="#6b7280" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <Text style={styles.notesText}>{entry.notes}</Text>
                                    {entry.logged_by_name ? (
                                        <Text style={styles.loggedBy}>Logged by {entry.logged_by_name}</Text>
                                    ) : null}
                                </View>
                            </View>
                        </StyledCard>
                    ))}
                </View>
            )}

            <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={closeModal}>
                <Pressable style={styles.overlay} onPress={closeModal}>
                    <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.sheetTitle}>
                            {editingEntry ? 'Edit contact log' : 'Log parent contact'}
                        </Text>

                        <Text style={styles.label}>Date (MM/DD/YYYY)</Text>
                        <TextInput
                            style={styles.input}
                            value={contactDate}
                            onChangeText={setContactDate}
                            placeholder="MM/DD/YYYY"
                            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                        />

                        <Text style={styles.label}>Contact type</Text>
                        <TouchableOpacity style={styles.selectTrigger} onPress={() => setShowTypePicker(true)}>
                            <Text style={styles.selectText}>{contactTypeLabel(contactType)}</Text>
                            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <Text style={styles.label}>Notes</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Summary of the conversation, action items, etc."
                            multiline
                            textAlignVertical="top"
                        />

                        <View style={styles.sheetActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={closeModal} disabled={saveMutation.isPending}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveBtn, (!notes.trim() || saveMutation.isPending) && { opacity: 0.6 }]}
                                onPress={() => saveMutation.mutate()}
                                disabled={!notes.trim() || saveMutation.isPending}
                            >
                                {saveMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.saveBtnText}>
                                        {editingEntry ? 'Save changes' : 'Log contact'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            <ModalPickerOverlay
                visible={showTypePicker}
                onClose={() => setShowTypePicker(false)}
                title="Contact type"
            >
                {CONTACT_TYPE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                        key={opt.value}
                        style={styles.pickerOption}
                        onPress={() => {
                            setContactType(opt.value);
                            setShowTypePicker(false);
                        }}
                    >
                        <Text style={styles.pickerOptionText}>{opt.label}</Text>
                        {contactType === opt.value ? (
                            <Ionicons name="checkmark" size={18} color={theme.colors.secondary} />
                        ) : null}
                    </TouchableOpacity>
                ))}
            </ModalPickerOverlay>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: theme.spacing.lg,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    countText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.md,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    centered: {
        padding: 24,
        alignItems: 'center',
    },
    emptyCard: {
        padding: 20,
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    list: {
        gap: theme.spacing.md,
    },
    entryCard: {
        padding: 16,
    },
    entryRow: {
        flexDirection: 'row',
        gap: 12,
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    entryBody: {
        flex: 1,
        minWidth: 0,
    },
    entryTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 8,
    },
    entryMeta: {
        flex: 1,
        gap: 6,
    },
    typeBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    typeBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
    dateText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        gap: 4,
    },
    actionBtn: {
        padding: 4,
    },
    notesText: {
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 20,
    },
    loggedBy: {
        marginTop: 8,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 20,
        paddingBottom: 32,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 6,
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: theme.colors.text,
        backgroundColor: theme.colors.background,
    },
    textArea: {
        minHeight: 120,
    },
    selectTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: theme.colors.background,
    },
    selectText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    sheetActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 20,
    },
    cancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    cancelBtnText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    saveBtn: {
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.md,
        minWidth: 120,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    pickerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
    },
    pickerOptionText: {
        fontSize: 16,
        color: theme.colors.text,
    },
});
