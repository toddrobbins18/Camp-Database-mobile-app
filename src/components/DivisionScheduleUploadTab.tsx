import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    Pressable,
    TextInput,
    ActivityIndicator,
    Alert,
    Platform,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../theme/theme';
import { StyledCard } from './StyledCard';
import { supabase } from '../lib/supabase';
import {
    uploadDivisionSchedule,
    pathFromFileUrl,
    removeStorageFile,
    getSignedUrl,
    BUCKETS,
} from '../api/storage';

type Division = { id: string; name: string; gender: string };

type DivisionSchedule = {
    id: string;
    division_id: string;
    schedule_date: string;
    file_name: string;
    file_url: string;
    description: string | null;
    season: string;
    division?: Division;
};

function ymd(d: Date): string {
    return d.toISOString().split('T')[0];
}

function formatDisplayDate(iso: string): string {
    const [y, m, day] = iso.split('-').map(Number);
    const d = new Date(y, m - 1, day);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

type Props = {
    companyId: string | null;
    season: string;
};

export function DivisionScheduleUploadTab({ companyId, season }: Props) {
    const queryClient = useQueryClient();
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedDivision, setSelectedDivision] = useState('');
    const [uploadDate, setUploadDate] = useState(() => new Date());
    const [description, setDescription] = useState('');
    const [pickedName, setPickedName] = useState('');
    const [pickedUri, setPickedUri] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showDivisionModal, setShowDivisionModal] = useState(false);

    const { data: divisions = [] } = useQuery({
        queryKey: ['divisionScheduleUploadDivisions', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('divisions')
                .select('id, name, gender')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('sort_order');
            if (error) throw error;
            return (data || []) as Division[];
        },
        enabled: !!companyId,
    });

    const { data: schedules = [], isLoading } = useQuery({
        queryKey: ['division_schedules', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('division_schedules')
                .select(`*, division:divisions(id, name, gender)`)
                .eq('company_id', companyId)
                .eq('season', season)
                .order('schedule_date', { ascending: false });
            if (error) throw error;
            return (data || []) as DivisionSchedule[];
        },
        enabled: !!companyId && !!season,
    });

    const pickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: true,
                type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            });
            const asset = result.assets?.[0];
            if (asset) {
                setPickedName(asset.name);
                setPickedUri(asset.uri);
            }
        } catch (_) {}
    };

    const resetForm = () => {
        setSelectedDivision('');
        setUploadDate(new Date());
        setDescription('');
        setPickedName('');
        setPickedUri(null);
    };

    const handleUpload = async () => {
        if (!companyId || !season || !selectedDivision || !pickedUri || !pickedName) {
            Alert.alert('Missing info', 'Select a division and a file.');
            return;
        }
        setUploading(true);
        try {
            const response = await fetch(pickedUri);
            const arrayBuffer = await response.arrayBuffer();
            const ext = pickedName.includes('.') ? pickedName.split('.').pop() || 'pdf' : 'pdf';
            const dateStr = ymd(uploadDate);
            const storagePath = await uploadDivisionSchedule({
                companyId,
                divisionId: selectedDivision,
                scheduleDate: dateStr,
                file: arrayBuffer,
                fileExt: ext,
            });
            const { data: urlData } = supabase.storage.from(BUCKETS.divisionSchedules).getPublicUrl(storagePath);
            const { error } = await supabase.from('division_schedules').insert({
                company_id: companyId,
                division_id: selectedDivision,
                schedule_date: dateStr,
                file_name: pickedName,
                file_url: urlData.publicUrl,
                description: description.trim() || null,
                season,
            });
            if (error) throw error;
            Alert.alert('Success', 'Schedule uploaded successfully.');
            setShowUploadModal(false);
            resetForm();
            queryClient.invalidateQueries({ queryKey: ['division_schedules', companyId, season] });
        } catch (e: any) {
            Alert.alert('Upload failed', e?.message || 'Unknown error');
        } finally {
            setUploading(false);
        }
    };

    const openSchedule = useCallback(async (row: DivisionSchedule) => {
        try {
            const path = pathFromFileUrl(row.file_url, 'division-schedules');
            const url = path
                ? await getSignedUrl('divisionSchedules', path, 3600)
                : row.file_url;
            const can = await Linking.canOpenURL(url);
            if (can) await Linking.openURL(url);
            else Alert.alert('Cannot open', 'Unable to open this file.');
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not open file');
        }
    }, []);

    const deleteSchedule = (row: DivisionSchedule) => {
        Alert.alert('Delete schedule', `Remove "${row.file_name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const path = pathFromFileUrl(row.file_url, 'division-schedules');
                        if (path) await removeStorageFile('divisionSchedules', path);
                        const { error } = await supabase.from('division_schedules').delete().eq('id', row.id);
                        if (error) throw error;
                        queryClient.invalidateQueries({ queryKey: ['division_schedules', companyId, season] });
                    } catch (e: any) {
                        Alert.alert('Delete failed', e?.message || 'Unknown error');
                    }
                },
            },
        ]);
    };

    const divisionLabel = divisions.find((d) => d.id === selectedDivision)?.name ?? 'Select division';

    return (
        <View style={styles.wrap}>
            <StyledCard style={styles.heroCard}>
                <View style={styles.heroHeader}>
                    <View style={styles.heroTitles}>
                        <View style={styles.heroTitleRow}>
                            <Ionicons name="document-text-outline" size={22} color={theme.colors.text} />
                            <Text style={styles.heroTitle}>Division Schedules</Text>
                        </View>
                        <Text style={styles.heroDesc}>Upload and manage daily schedules for each division</Text>
                    </View>
                    <TouchableOpacity style={styles.uploadCta} onPress={() => setShowUploadModal(true)}>
                        <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                        <Text style={styles.uploadCtaText}>Upload Schedule</Text>
                    </TouchableOpacity>
                </View>
            </StyledCard>

            {isLoading ? (
                <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.secondary} />
            ) : schedules.length === 0 ? (
                <View style={styles.emptyUpload}>
                    <Ionicons name="document-outline" size={48} color={theme.colors.icon} />
                    <Text style={styles.emptyUploadTitle}>No uploaded schedules</Text>
                    <Text style={styles.emptyUploadSub}>PDFs and documents you upload appear here.</Text>
                </View>
            ) : (
                <View style={styles.scheduleList}>
                    {schedules.map((item) => (
                        <StyledCard key={item.id} style={styles.rowCard}>
                            <View style={styles.rowTop}>
                                <Text style={styles.rowTitle} numberOfLines={2}>
                                    {item.file_name}
                                </Text>
                                <View style={styles.rowActions}>
                                    <TouchableOpacity onPress={() => openSchedule(item)} hitSlop={8}>
                                        <Ionicons name="eye-outline" size={22} color={theme.colors.secondary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => deleteSchedule(item)} hitSlop={8}>
                                        <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <Text style={styles.rowMeta}>
                                {(item.division as Division)?.name ?? 'Division'} · {formatDisplayDate(item.schedule_date)}
                            </Text>
                            {item.description ? <Text style={styles.rowDesc}>{item.description}</Text> : null}
                        </StyledCard>
                    ))}
                </View>
            )}

            <Modal visible={showUploadModal} animationType="slide" transparent onRequestClose={() => setShowUploadModal(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setShowUploadModal(false)}>
                    <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.modalTitle}>Upload Division Schedule</Text>
                        <Text style={styles.fieldLabel}>Division *</Text>
                        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowDivisionModal(true)}>
                            <Text style={styles.selectBtnText}>{divisionLabel}</Text>
                            <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <Text style={styles.fieldLabel}>Schedule date *</Text>
                        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowDatePicker(true)}>
                            <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
                            <Text style={styles.selectBtnText}>
                                {uploadDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.fieldLabel}>Description (optional)</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Add a description..."
                            placeholderTextColor={theme.colors.icon}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                        />

                        <Text style={styles.fieldLabel}>File *</Text>
                        <TouchableOpacity style={styles.fileBtn} onPress={pickFile}>
                            <Ionicons name="attach-outline" size={20} color={theme.colors.secondary} />
                            <Text style={styles.fileBtnText}>{pickedName || 'Choose PDF or image…'}</Text>
                        </TouchableOpacity>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowUploadModal(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveBtn, uploading && { opacity: 0.7 }]}
                                disabled={uploading}
                                onPress={handleUpload}
                            >
                                {uploading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Upload</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={showDivisionModal} transparent animationType="fade">
                <Pressable style={styles.modalBackdrop} onPress={() => setShowDivisionModal(false)}>
                    <ScrollView style={styles.pickerSheet} keyboardShouldPersistTaps="handled">
                        {divisions.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.pickerRow}
                                onPress={() => {
                                    setSelectedDivision(item.id);
                                    setShowDivisionModal(false);
                                }}
                            >
                                <Text style={styles.pickerRowText}>
                                    {item.name} ({item.gender === 'male' ? 'Boys' : 'Girls'})
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Pressable>
            </Modal>

            {showDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                    value={uploadDate}
                    mode="date"
                    display="default"
                    onChange={(ev, d) => {
                        setShowDatePicker(false);
                        if (ev.type === 'dismissed') return;
                        if (d) setUploadDate(d);
                    }}
                />
            )}
            {showDatePicker && Platform.OS === 'ios' && (
                <Modal transparent visible={showDatePicker} animationType="slide">
                    <View style={styles.iosPickerWrap}>
                        <Pressable style={{ flex: 1 }} onPress={() => setShowDatePicker(false)} />
                        <View style={styles.iosPickerInner}>
                            <DateTimePicker
                                value={uploadDate}
                                mode="date"
                                display="spinner"
                                themeVariant="light"
                                onChange={(_, d) => d && setUploadDate(d)}
                            />
                            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDatePicker(false)}>
                                <Text style={styles.doneBtnText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: 16 },
    heroCard: { padding: 16 },
    heroHeader: { gap: 12 },
    heroTitles: { gap: 4 },
    heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    heroTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    heroDesc: { fontSize: 14, color: theme.colors.textSecondary },
    scheduleList: { gap: 0 },
    uploadCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.secondary,
        paddingVertical: 12,
        borderRadius: theme.borderRadius.md,
    },
    uploadCtaText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    emptyUpload: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyUploadTitle: { fontSize: 17, fontWeight: '600', color: theme.colors.text },
    emptyUploadSub: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
    rowCard: { padding: 14, marginBottom: 10 },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
    rowTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.colors.text },
    rowActions: { flexDirection: 'row', gap: 12 },
    rowMeta: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 6 },
    rowDesc: { fontSize: 13, color: theme.colors.text, marginTop: 6 },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 20,
        paddingBottom: 32,
        maxHeight: '90%',
    },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: theme.colors.text },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 10 },
    selectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 12,
        gap: 8,
    },
    selectBtnText: { flex: 1, fontSize: 15, color: theme.colors.text },
    textArea: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 12,
        minHeight: 72,
        textAlignVertical: 'top',
        fontSize: 15,
        color: theme.colors.text,
    },
    fileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 12,
    },
    fileBtnText: { fontSize: 14, color: theme.colors.secondary, flex: 1 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
    cancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
    cancelBtnText: { fontSize: 16, color: theme.colors.textSecondary, fontWeight: '600' },
    saveBtn: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: theme.borderRadius.md,
        minWidth: 100,
        alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    pickerSheet: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: 20,
        marginBottom: 40,
        borderRadius: 12,
        maxHeight: 360,
        overflow: 'hidden',
    },
    pickerRow: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    pickerRowText: { fontSize: 16, color: theme.colors.text },
    iosPickerWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    iosPickerInner: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        paddingBottom: 16,
    },
    doneBtn: { paddingVertical: 14, alignItems: 'center' },
    doneBtnText: { fontWeight: '600', fontSize: 16, color: theme.colors.secondary },
});
