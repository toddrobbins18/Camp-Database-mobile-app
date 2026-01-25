import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

interface RainyDayScheduleScreenProps {
    navigation: any;
}

export const RainyDayScheduleScreen = ({ navigation }: RainyDayScheduleScreenProps) => {
    const [date, setDate] = useState('01/24/2026');
    const [fileName, setFileName] = useState('');
    
    // Date Picker State
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerMonth, setDatePickerMonth] = useState(new Date().getMonth());
    const [datePickerYear, setDatePickerYear] = useState(new Date().getFullYear());

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const formatDate = (d: Date) => {
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        return `${month}/${day}/${year}`;
    };

    const handleFileUpload = () => {
        // Mock file upload
        setFileName('schedule.pdf');
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
                animationType="fade"
                onRequestClose={() => setShowDatePicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowDatePicker(false)}
                >
                    <View style={styles.datePickerContainer} onStartShouldSetResponder={() => true}>
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
                                <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
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
                                <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
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
                                const dateStr = formatDate(d);
                                const isToday = formatDate(d) === formatDate(today);
                                const isSelected = date && formatDate(d) === date;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.dateCell,
                                            isToday && styles.todayCell,
                                            isSelected && styles.selectedDateCell,
                                        ]}
                                        onPress={() => {
                                            setDate(dateStr);
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
                                    setDate('');
                                    setShowDatePicker(false);
                                }}
                            >
                                <Text style={styles.datePickerActionText}>Clear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setDate(formatDate(today));
                                    setShowDatePicker(false);
                                }}
                            >
                                <Text style={styles.datePickerActionText}>Today</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
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
                            <Text style={styles.dateText}>{date || 'Select Date'}</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                <Ionicons name="calendar-outline" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>PDF File</Text>
                        <View style={styles.fileInputContainer}>
                            <TouchableOpacity style={styles.chooseFileButton} onPress={handleFileUpload}>
                                <Text style={styles.chooseFileText}>Choose File</Text>
                            </TouchableOpacity>
                            <Text style={styles.fileNameText}>
                                {fileName || 'No file chosen'}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.uploadButton}>
                        <Text style={styles.uploadButtonText}>Upload Schedule</Text>
                    </TouchableOpacity>
                </StyledCard>

                {/* Uploaded Schedules Section */}
                <View style={styles.uploadedSection}>
                    <View style={styles.uploadedHeader}>
                        <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.uploadedTitle}>Uploaded Schedules</Text>
                    </View>
                    
                    <StyledCard style={styles.emptyStateCard}>
                        <Text style={styles.emptyStateText}>No schedules uploaded yet</Text>
                    </StyledCard>
                </View>

                {/* Chat Bubble (Floating Action Button style placeholder) */}
                <TouchableOpacity style={styles.chatButton}>
                    <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
                </TouchableOpacity>

            </ScrollView>

            {renderDatePicker()}
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    datePickerContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        width: '90%',
        maxWidth: 400,
        ...theme.shadows.card,
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
    todayCell: {
        backgroundColor: theme.colors.background,
        borderRadius: 20,
    },
    selectedDateCell: {
        backgroundColor: theme.colors.secondary,
        borderRadius: 20,
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
});
