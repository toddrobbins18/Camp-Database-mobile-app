import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Pressable,
    ActivityIndicator,
    Alert,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface RainyDayDocument {
    id: string;
    date: string;
    file_url: string;
    file_name: string;
    uploaded_by: string;
    created_at: string;
}

interface RainyDayScheduleScreenProps {
    navigation: any;
}

export const RainyDayScheduleScreen = ({ navigation }: RainyDayScheduleScreenProps) => {
    const queryClient = useQueryClient();
    const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
    const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
    const [uploading, setUploading] = useState(false);

    // Date Picker State
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerMonth, setDatePickerMonth] = useState(new Date().getMonth());
    const [datePickerYear, setDatePickerYear] = useState(new Date().getFullYear());

    // Delete Confirmation State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [docToDelete, setDocToDelete] = useState<{ id: string; url: string } | null>(null);

    // Fetch profile to get company_id
    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (error) throw error;
            return data;
        }
    });

    const companyId = profile?.company_id;
    const selectedSeason = new Date().getFullYear().toString();

    // Fetch documents
    const { data: documents = [], isLoading: isLoadingDocs } = useQuery({
        queryKey: ['rainy_day_documents', companyId, selectedSeason],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from("rainy_day_documents")
                .select("*")
                .eq("company_id", companyId)
                .eq("season", selectedSeason)
                .order("date", { ascending: false });

            if (error) throw error;
            return data as RainyDayDocument[];
        },
        enabled: !!companyId
    });

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const formatDateForUI = (dateString: string) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${month}/${day}/${year}`;
    };

    const handleFileSelect = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                setSelectedFile(result.assets[0]);
            }
        } catch (err) {
            console.error('Error picking document:', err);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !companyId) return;

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Prepare file for upload
            // In React Native, we need to fetch the file content from the URI
            const response = await fetch(selectedFile.uri);
            const blob = await response.blob();

            const timestamp = Date.now();
            const fileName = selectedFile.name;
            const filePath = `${companyId}/${selectedSeason}/${selectedDateStr}-${timestamp}-${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("rainy-day-documents")
                .upload(filePath, blob, {
                    contentType: "application/pdf",
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("rainy-day-documents")
                .getPublicUrl(filePath);

            const { error } = await supabase
                .from("rainy_day_documents")
                .insert({
                    company_id: companyId,
                    season: selectedSeason,
                    date: selectedDateStr,
                    file_name: fileName,
                    file_url: publicUrl,
                    uploaded_by: user.id,
                });

            if (error) throw error;

            Alert.alert("Success", "Rainy Day Schedule uploaded successfully");
            setSelectedFile(null);
            queryClient.invalidateQueries({ queryKey: ['rainy_day_documents'] });
        } catch (error) {
            console.error("Upload error:", error);
            Alert.alert("Error", "Failed to upload document");
        } finally {
            setUploading(false);
        }
    };

    const handleViewPDF = async (fileUrl: string) => {
        try {
            const canOpen = await Linking.canOpenURL(fileUrl);
            if (canOpen) {
                await Linking.openURL(fileUrl);
            } else {
                // Fallback for web if canOpenURL fails
                window.open(fileUrl, '_blank');
            }
        } catch (error) {
            console.error("Error opening PDF:", error);
            window.open(fileUrl, '_blank');
        }
    };

    const handleDelete = (id: string, fileUrl: string) => {
        setDocToDelete({ id, url: fileUrl });
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!docToDelete) return;
        const { id, url: fileUrl } = docToDelete;

        try {
            const urlParts = fileUrl.split('/rainy-day-documents/');
            if (urlParts.length > 1) {
                const filePath = urlParts[1].split('?')[0];
                const { error: storageError } = await supabase.storage
                    .from("rainy-day-documents")
                    .remove([filePath]);
                if (storageError) console.error("Storage delete error:", storageError);
            }

            const { error } = await supabase
                .from("rainy_day_documents")
                .delete()
                .eq("id", id);

            if (error) throw error;

            Alert.alert("Success", "Document deleted");
            queryClient.invalidateQueries({ queryKey: ['rainy_day_documents'] });
        } catch (error) {
            console.error("Delete error:", error);
            Alert.alert("Error", "Failed to delete document");
        } finally {
            setShowDeleteModal(false);
            setDocToDelete(null);
        }
    };

    const renderDatePicker = () => {
        const today = new Date();
        const firstDayOfMonth = new Date(datePickerYear, datePickerMonth, 1);
        const lastDayOfMonth = new Date(datePickerYear, datePickerMonth + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startingDayOfWeek = firstDayOfMonth.getDay();

        const monthDates = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            monthDates.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            monthDates.push(new Date(datePickerYear, datePickerMonth, i));
        }

        return (
            <Modal
                visible={showDatePicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDatePicker(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowDatePicker(false)}
                >
                    <Pressable
                        style={styles.datePickerContainer}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.dragger} />
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.datePickerHeader}>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (datePickerMonth === 0) {
                                            setDatePickerMonth(11);
                                            setDatePickerYear(datePickerYear - 1);
                                        } else {
                                            setDatePickerMonth(datePickerMonth - 1);
                                        }
                                    }}
                                >
                                    <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                                <Text style={styles.datePickerMonth}>
                                    {monthNames[datePickerMonth]} {datePickerYear}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (datePickerMonth === 11) {
                                            setDatePickerMonth(0);
                                            setDatePickerYear(datePickerYear + 1);
                                        } else {
                                            setDatePickerMonth(datePickerMonth + 1);
                                        }
                                    }}
                                >
                                    <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.datePickerWeekdays}>
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                                    <Text key={day} style={styles.weekdayText}>
                                        {day}
                                    </Text>
                                ))}
                            </View>
                            <View style={styles.datePickerGrid}>
                                {monthDates.map((d, index) => {
                                    if (!d) {
                                        return <View key={index} style={styles.dateCell} />;
                                    }
                                    const dateISO = d.toISOString().split('T')[0];
                                    const isSelected = selectedDateStr === dateISO;
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.dateCell,
                                                isSelected && styles.selectedDateCell,
                                            ]}
                                            onPress={() => {
                                                setSelectedDateStr(dateISO);
                                                setShowDatePicker(false);
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.dateCellText,
                                                    isSelected && styles.selectedDateText,
                                                ]}
                                            >
                                                {d.getDate()}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            <View style={styles.datePickerActions}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowDatePicker(false);
                                    }}
                                >
                                    <Text style={styles.datePickerActionText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setSelectedDateStr(new Date().toISOString().split('T')[0]);
                                        setShowDatePicker(false);
                                    }}
                                >
                                    <Text style={styles.datePickerActionText}>Today</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <View style={styles.titleRow}>
                            <Ionicons
                                name="rainy-outline"
                                size={24}
                                color={theme.colors.primary}
                                style={styles.titleIcon}
                            />
                            <Text style={styles.headerTitle}>Rainy Day Schedule</Text>
                        </View>
                        <Text style={styles.headerSubtitle}>Upload and view rainy day schedules</Text>
                    </View>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Upload Section */}
                <StyledCard style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="arrow-up-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.cardTitle}>Upload Rainy Day Schedule</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Date</Text>
                        <View style={styles.dateInputContainer}>
                            <Text style={styles.dateText}>{formatDateForUI(selectedDateStr) || 'Select Date'}</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                <Ionicons name="calendar-outline" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>PDF File</Text>
                        <View style={styles.fileInputContainer}>
                            <TouchableOpacity style={styles.chooseFileButton} onPress={handleFileSelect}>
                                <Text style={styles.chooseFileText}>Choose File</Text>
                            </TouchableOpacity>
                            <Text style={styles.fileNameText} numberOfLines={1}>
                                {selectedFile?.name || 'No file chosen'}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.uploadButton, (!selectedFile || uploading) && { opacity: 0.6 }]}
                        onPress={handleUpload}
                        disabled={!selectedFile || uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.uploadButtonText}>Upload Schedule</Text>
                        )}
                    </TouchableOpacity>
                </StyledCard>

                {/* Uploaded Schedules Section */}
                <View style={styles.uploadedSection}>
                    <View style={styles.uploadedHeader}>
                        <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.uploadedTitle}>Uploaded Schedules</Text>
                    </View>

                    {isLoadingDocs ? (
                        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
                    ) : documents.length === 0 ? (
                        <StyledCard style={styles.emptyStateCard}>
                            <Text style={styles.emptyStateText}>No schedules uploaded yet</Text>
                        </StyledCard>
                    ) : (
                        documents.map((doc) => (
                            <StyledCard key={doc.id} style={styles.docCard}>
                                <View style={styles.docInfo}>
                                    <View style={styles.docIconContainer}>
                                        <Ionicons name="rainy" size={24} color={theme.colors.primary} />
                                    </View>
                                    <View style={styles.docTextContainer}>
                                        <Text style={styles.docFileName} numberOfLines={1}>{doc.file_name}</Text>
                                        <Text style={styles.docSubText}>
                                            {formatDateForUI(doc.date)} • Uploaded {new Date(doc.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.docActions}>
                                    <TouchableOpacity
                                        style={styles.docButton}
                                        onPress={() => handleViewPDF(doc.file_url)}
                                    >
                                        <Ionicons name="eye-outline" size={18} color={theme.colors.text} />
                                        <Text style={styles.docButtonText}>View PDF</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => handleDelete(doc.id, doc.file_url)}
                                    >
                                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            </StyledCard>
                        ))
                    )}
                </View>

                {/* Chat Bubble (Floating Action Button style placeholder) */}
                <TouchableOpacity style={styles.chatButton}>
                    <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
                </TouchableOpacity>

            </ScrollView>

            {renderDatePicker()}

            {/* Custom Delete Confirmation Modal */}
            <Modal visible={showDeleteModal} transparent animationType="fade">
                <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
                    <View style={styles.confirmModalContent}>
                        <View style={styles.confirmIconContainer}>
                            <Ionicons name="trash-outline" size={32} color={theme.colors.danger} />
                        </View>
                        <Text style={styles.confirmTitle}>Confirm Delete</Text>
                        <Text style={styles.confirmText}>Are you sure you want to delete this document? This action cannot be undone.</Text>

                        <View style={styles.confirmActions}>
                            <TouchableOpacity
                                style={[styles.confirmBtn, styles.cancelBtn]}
                                onPress={() => setShowDeleteModal(false)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, styles.deleteBtn]}
                                onPress={confirmDelete}
                            >
                                <Text style={styles.deleteBtnText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: 80,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
    },
    headerContent: {
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    titleIcon: {
        marginRight: theme.spacing.xs,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    headerSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    card: {
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.xs,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    formGroup: {
        marginBottom: theme.spacing.lg,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    dateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        height: 44,
        backgroundColor: theme.colors.surface,
    },
    dateText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    fileInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 4,
        backgroundColor: theme.colors.surface,
        height: 44,
    },
    chooseFileButton: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        marginRight: theme.spacing.sm,
        height: '100%',
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
    },
    chooseFileText: {
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: '500',
    },
    fileNameText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    uploadButton: {
        backgroundColor: '#818cf8', // Indigo/Primary color approximation
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.sm,
        height: 48,
        justifyContent: 'center',
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    uploadedSection: {
        marginBottom: theme.spacing.xl,
    },
    uploadedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.xs,
    },
    uploadedTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    emptyStateCard: {
        padding: theme.spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 150,
    },
    emptyStateText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    docCard: {
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    docInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    docIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
    },
    docTextContainer: {
        flex: 1,
    },
    docFileName: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
    },
    docSubText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    docActions: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    docButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.sm,
        gap: 8,
    },
    docButtonText: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.text,
    },
    deleteButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    chatButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    // Date Picker Styles (Reused)
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        alignItems: 'center', // Center on large screens
    },
    datePickerContainer: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xl + 20, // Add extra padding for bottom safe area
        width: '100%',
        maxWidth: 600, // Max width for responsive design
        maxHeight: '80%', // Allow more height for calendar content
        ...theme.shadows.card,
    },
    dragger: {
        width: 40,
        height: 4,
        backgroundColor: theme.colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: theme.spacing.lg,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    datePickerMonth: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    datePickerWeekdays: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: theme.spacing.sm,
    },
    weekdayText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        width: 30,
        textAlign: 'center',
    },
    datePickerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        marginBottom: theme.spacing.md,
    },
    dateCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateCellText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    todayDateCell: {
        borderWidth: 1,
        borderColor: theme.colors.primary,
        borderRadius: 999,
    },
    todayDateText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    selectedDateCell: {
        backgroundColor: theme.colors.secondary,
        borderRadius: 999,
    },
    selectedDateText: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    datePickerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.md,
    },
    datePickerActionText: {
        color: theme.colors.secondary,
        fontWeight: '600',
        fontSize: 14,
    },
    // Confirm Modal Styles
    confirmModalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        width: '85%',
        maxWidth: 400,
        alignItems: 'center',
        ...theme.shadows.card,
    },
    confirmIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fee2e2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    confirmText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
        lineHeight: 20,
    },
    confirmActions: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        width: '100%',
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtn: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    cancelBtnText: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    deleteBtn: {
        backgroundColor: theme.colors.danger,
    },
    deleteBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
});
