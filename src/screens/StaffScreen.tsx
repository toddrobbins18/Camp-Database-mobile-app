import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

const ScreenHeader = ({ title, navigation }: { title: string, navigation: any }) => (
    <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Ionicons name="menu" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity>
            <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
    </View>
);

export const StaffScreen = ({ navigation }: any) => {
    const [isScannerActive, setIsScannerActive] = useState(false);
    const [scanInput, setScanInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    const [modalVisible, setModalVisible] = useState({
        addStaff: false,
        assignWristband: false,
        uploadCsv: false,
        formatGuide: false
    });

    const [assignTab, setAssignTab] = useState<'individual' | 'bulk'>('individual');

    const toggleModal = (key: keyof typeof modalVisible, value: boolean) => {
        setModalVisible(prev => ({ ...prev, [key]: value }));
    };

    const handleFileUpload = () => {
        Alert.alert("Choose File", "Opening document picker...");
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ScreenHeader title="Staff & Evaluations" navigation={navigation} />

                {/* Description */}
                <Text style={styles.description}>Manage team members and performance reviews</Text>

                {/* Action Bar - Horizontal Scroll for Mobile */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionScrollView} contentContainerStyle={styles.actionButtons}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, isScannerActive ? styles.activeScannerBtn : styles.secondaryBtn]}
                        onPress={() => setIsScannerActive(!isScannerActive)}
                    >
                        <Ionicons name={isScannerActive ? "radio" : "scan-outline"} size={18} color={isScannerActive ? "white" : theme.colors.text} />
                        <Text style={isScannerActive ? styles.activeScannerText : styles.btnText}>
                            {isScannerActive ? "Scanner Active" : "Scan Wristband"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryBtn} onPress={() => toggleModal('assignWristband', true)}>
                        <Ionicons name="pricetag-outline" size={18} color={theme.colors.text} />
                        <Text style={styles.btnText}>Assign Wristbands</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryBtn} onPress={() => toggleModal('uploadCsv', true)}>
                        <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.text} />
                        <Text style={styles.btnText}>Upload CSV</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.primaryBtn} onPress={() => toggleModal('addStaff', true)}>
                        <Ionicons name="add" size={18} color="white" />
                        <Text style={styles.primaryBtnText}>Add Staff Member</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Scanner Section */}
                {isScannerActive && (
                    <View style={styles.scannerSection}>
                        <View style={styles.scannerHeader}>
                            <Text style={styles.scannerTitle}>Ready to scan wristband (ISO 14443 Type A)</Text>
                            <View style={styles.liveIndicator} />
                        </View>
                        <View style={styles.scannerInputRow}>
                            <TextInput
                                style={styles.scannerInput}
                                placeholder="Scan wristband or enter RFID..."
                                value={scanInput}
                                onChangeText={setScanInput}
                                autoFocus
                            />
                            <TouchableOpacity style={styles.findBtn}>
                                <Text style={styles.findBtnText}>Find Staff</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.scannerHint}>Bluetooth scanner ready. Scans auto-submit. Tap input if focus is lost.</Text>
                    </View>
                )}

                {/* Search Bar */}
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search staff by name, role, or department..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <Text style={styles.resultsText}>Showing {mockStaff.length} of {mockStaff.length} staff members for 2026</Text>

                {/* Staff List Grid */}
                <View style={styles.grid}>
                    {mockStaff.map((staff, index) => (
                        <View key={index} style={styles.staffCardWrapper}>
                            <View style={styles.staffCard}>
                                <View style={styles.staffHeader}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{staff.initials}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.staffName} numberOfLines={2}>{staff.name}</Text>
                                        <Text style={styles.staffRole} numberOfLines={1}>{staff.role}</Text>
                                    </View>
                                </View>

                                <View style={styles.tagRow}>
                                    <View style={styles.redTag}>
                                        <Text style={styles.redTagText}>No Type Set</Text>
                                    </View>
                                    <View style={styles.greenTag}>
                                        <Text style={styles.greenTagText}>active</Text>
                                    </View>
                                </View>

                                <View style={styles.ratingBox}>
                                    <Ionicons name="star" size={16} color={theme.colors.warning} />
                                    <View style={{ marginLeft: 8 }}>
                                        <Text style={styles.ratingTitle}>0.0 Average Rating</Text>
                                        <Text style={styles.ratingSub}>0 evaluations</Text>
                                    </View>
                                </View>

                                <View style={styles.trendRow}>
                                    <Ionicons name="trending-up" size={16} color={theme.colors.success} />
                                    <Text style={styles.trendText}>Recent Evaluation</Text>
                                </View>
                                <Text style={styles.trendSub}>No evaluations yet</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* --- MODALS --- */}

            {/* 1. Assign Wristbands Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible.assignWristband}
                onRequestClose={() => toggleModal('assignWristband', false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Assign RFID Wristbands</Text>
                            <TouchableOpacity onPress={() => toggleModal('assignWristband', false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Tabs */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity 
                                style={[styles.tab, assignTab === 'individual' && styles.activeTab]}
                                onPress={() => setAssignTab('individual')}
                            >
                                <Ionicons name="person-outline" size={16} color={assignTab === 'individual' ? theme.colors.secondary : theme.colors.textSecondary} />
                                <Text style={[styles.tabText, assignTab === 'individual' && styles.activeTabText]}>Individual</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.tab, assignTab === 'bulk' && styles.activeTab]}
                                onPress={() => setAssignTab('bulk')}
                            >
                                <Ionicons name="cloud-upload-outline" size={16} color={assignTab === 'bulk' ? theme.colors.secondary : theme.colors.textSecondary} />
                                <Text style={[styles.tabText, assignTab === 'bulk' && styles.activeTabText]}>Bulk CSV</Text>
                            </TouchableOpacity>
                        </View>

                        {assignTab === 'individual' ? (
                            <View style={styles.modalBody}>
                                <Text style={styles.label}>Search for Staff</Text>
                                <View style={styles.searchBar}>
                                    <TextInput style={styles.searchInput} placeholder="Search staff by name..." />
                                    <TouchableOpacity style={styles.primaryBtnSmall}>
                                        <Text style={styles.primaryBtnText}>Search</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.modalBody}>
                                <Text style={styles.label}>Upload CSV or paste data</Text>
                                <Text style={styles.helperText}>Format: name,rfid or person_id,rfid (one per line)</Text>
                                
                                <TouchableOpacity style={styles.fileUploadBtn} onPress={handleFileUpload}>
                                    <Ionicons name="document-text-outline" size={24} color={theme.colors.textSecondary} />
                                    <Text style={styles.fileUploadText}>Choose File (CSV)</Text>
                                </TouchableOpacity>

                                <TextInput 
                                    style={styles.textArea} 
                                    multiline 
                                    placeholder="John Smith,ABC123DEF456..." 
                                    numberOfLines={6}
                                />
                                
                                <TouchableOpacity style={styles.primaryBtnBlock}>
                                    <Text style={styles.primaryBtnText}>Assign Wristbands</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* 2. Add Staff Member Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible.addStaff}
                onRequestClose={() => toggleModal('addStaff', false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalContentLarge}>
                        <ScrollView>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Add Staff Member</Text>
                                <TouchableOpacity onPress={() => toggleModal('addStaff', false)}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Full Name</Text>
                                <TextInput style={styles.input} placeholder="e.g. Jane Doe" />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Department</Text>
                                <TextInput style={styles.input} placeholder="e.g. Activities" />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Email</Text>
                                <TextInput style={styles.input} placeholder="jane@example.com" keyboardType="email-address" />
                            </View>
                            <View style={styles.formRow}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.label}>Phone</Text>
                                    <TextInput style={styles.input} placeholder="555-0123" keyboardType="phone-pad" />
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Hire Date</Text>
                                    <TextInput style={styles.input} placeholder="mm/dd/yyyy" />
                                </View>
                            </View>
                             <View style={styles.formGroup}>
                                <Text style={styles.label}>Season (Year)</Text>
                                <TextInput style={styles.input} defaultValue="2026" />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Allergies</Text>
                                <TextInput style={[styles.input, styles.textAreaSmall]} multiline placeholder="List any allergies (optional)" />
                            </View>

                            <TouchableOpacity style={styles.primaryBtnBlock}>
                                <Text style={styles.primaryBtnText}>Save Staff Member</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* 3. Upload CSV / Format Guide Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible.uploadCsv}
                onRequestClose={() => toggleModal('uploadCsv', false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContentLarge}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Staff Directory Upload</Text>
                            <TouchableOpacity onPress={() => toggleModal('uploadCsv', false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.sectionTitle}>Upload CSV</Text>
                            <TouchableOpacity style={styles.fileUploadBtnLarge} onPress={handleFileUpload}>
                                <View style={styles.uploadIconCircle}>
                                    <Ionicons name="cloud-upload" size={32} color={theme.colors.secondary} />
                                </View>
                                <Text style={styles.fileUploadTextPrimary}>Tap to Select CSV File</Text>
                                <Text style={styles.fileUploadSubText}>or drag and drop on desktop</Text>
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            <Text style={styles.sectionTitle}>Format Guide</Text>
                            
                            <View style={styles.guideBox}>
                                <Text style={styles.guideLabel}>Required Columns (first row):</Text>
                                <View style={styles.codeBlock}>
                                    <Text style={styles.codeText}>name, email, phone, role, department, hire_date, leader_id, status, season</Text>
                                </View>

                                <Text style={styles.guideLabel}>Example Data Row:</Text>
                                <View style={styles.codeBlock}>
                                    <Text style={styles.codeText}>Jane Smith, jane@thenest.com, 555-9876, Counselor, Activities, 2024-01-15, &lt;leader_id&gt;, active, Summer 2024</Text>
                                </View>
                            </View>

                            <View style={styles.infoBox}>
                                <Ionicons name="information-circle" size={20} color={theme.colors.secondary} style={{marginRight: 8}} />
                                <Text style={styles.infoText}>
                                    Important: leader_id must be a valid UUID. hire_date format: YYYY-MM-DD.
                                </Text>
                            </View>
                            
                            <View style={{height: 20}} />
                        </ScrollView>
                        
                        <View style={styles.modalFooter}>
                             <TouchableOpacity style={styles.primaryBtnBlock} onPress={() => toggleModal('uploadCsv', false)}>
                                <Text style={styles.primaryBtnText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const mockStaff = [
    { initials: 'AHG', name: 'Abel Hernandez Gallardo', role: 'Soccer / General Counselor' },
    { initials: 'AS', name: 'Abigail Sheridan', role: 'General Counselor - Freshmen Boys' },
    { initials: 'AZ', name: 'Addison Zucker', role: 'General Counselor' },
    { initials: 'ACO', name: 'Adrian Chamu Ochoa', role: 'Lead Counselor' },
    { initials: 'JD', name: 'John Doe', role: 'Activity Lead' },
    { initials: 'MS', name: 'Mary Smith', role: 'Nurse' },
];

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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    headerTitle: {
        ...theme.typography.h2,
        fontSize: 20,
    },
    description: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    actionScrollView: {
        marginBottom: theme.spacing.lg,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        paddingRight: theme.spacing.md,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: theme.borderRadius.full || 20,
        gap: 6,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    secondaryBtn: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 6,
    },
    primaryBtn: {
        backgroundColor: theme.colors.secondary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 6,
    },
    activeScannerBtn: {
        backgroundColor: theme.colors.success,
        borderColor: theme.colors.success,
    },
    btnText: { fontWeight: '600', color: theme.colors.text, fontSize: 13 },
    primaryBtnText: { fontWeight: '600', color: 'white', fontSize: 13 },
    activeScannerText: { fontWeight: '700', color: 'white', fontSize: 13 },
    
    // Scanner Section
    scannerSection: {
        backgroundColor: '#f0fdf4', // light green
        borderWidth: 1,
        borderColor: '#bbf7d0',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    scannerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    scannerTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#15803d',
    },
    liveIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22c55e',
    },
    scannerInputRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    scannerInput: {
        flex: 1,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#bbf7d0',
        borderRadius: theme.borderRadius.sm,
        paddingHorizontal: 12,
        height: 40,
    },
    findBtn: {
        backgroundColor: '#86efac',
        justifyContent: 'center',
        paddingHorizontal: 16,
        borderRadius: theme.borderRadius.sm,
    },
    findBtnText: { color: '#14532d', fontWeight: 'bold' },
    scannerHint: { fontSize: 10, color: '#15803d' },

    // Search Bar
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: theme.spacing.md,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: theme.colors.text,
    },
    resultsText: {
        ...theme.typography.caption,
        marginBottom: theme.spacing.md,
    },
    
    // Grid & Cards
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    staffCardWrapper: {
        width: '48%', // slightly less than 50% for spacing
        marginBottom: theme.spacing.md,
    },
    staffCard: {
        backgroundColor: 'white',
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.danger,
        padding: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    staffHeader: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e0e7ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#3730a3',
        fontWeight: 'bold',
        fontSize: 12,
    },
    staffName: {
        fontWeight: 'bold',
        fontSize: 13,
        color: theme.colors.text,
    },
    staffRole: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    tagRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    redTag: {
        backgroundColor: '#fee2e2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    redTagText: { color: theme.colors.danger, fontSize: 10, fontWeight: '500' },
    greenTag: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    greenTagText: { color: theme.colors.success, fontSize: 10, fontWeight: 'bold' },
    ratingBox: {
        backgroundColor: '#f9fafb',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 6,
        borderRadius: theme.borderRadius.sm,
        marginBottom: 10,
    },
    ratingTitle: { fontSize: 11, fontWeight: '600', color: theme.colors.text },
    ratingSub: { fontSize: 10, color: theme.colors.textSecondary },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    trendText: { fontSize: 11, fontWeight: '600', color: theme.colors.text },
    trendSub: { fontSize: 10, color: theme.colors.textSecondary, marginLeft: 20 },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: theme.borderRadius.lg,
        padding: 20,
        maxHeight: '80%',
    },
    modalContentLarge: {
        backgroundColor: 'white',
        borderRadius: theme.borderRadius.lg,
        padding: 20,
        height: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    modalBody: {
        flex: 1,
    },
    modalFooter: {
        marginTop: 20,
    },
    
    // Tab Styles
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: theme.borderRadius.md,
        padding: 4,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: theme.borderRadius.sm,
        gap: 6,
    },
    activeTab: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    tabText: {
        fontWeight: '600',
        color: theme.colors.textSecondary,
        fontSize: 13,
    },
    activeTabText: {
        color: theme.colors.text,
    },
    
    // Form Styles
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 10,
        fontSize: 14,
        marginBottom: 16,
    },
    formRow: {
        flexDirection: 'row',
    },
    formGroup: {
        marginBottom: 4,
    },
    textArea: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 10,
        fontSize: 12,
        marginBottom: 16,
        height: 100,
        textAlignVertical: 'top',
        backgroundColor: '#f9fafb',
    },
    textAreaSmall: {
        height: 80,
        textAlignVertical: 'top',
    },
    helperText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 12,
    },
    
    // Upload UI
    fileUploadBtn: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        borderRadius: theme.borderRadius.md,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        backgroundColor: '#f9fafb',
    },
    fileUploadBtnLarge: {
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        borderRadius: theme.borderRadius.lg,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        backgroundColor: '#f8fafc',
    },
    uploadIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#e0e7ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    fileUploadText: {
        color: theme.colors.textSecondary,
        marginTop: 8,
        fontSize: 13,
    },
    fileUploadTextPrimary: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    fileUploadSubText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    primaryBtnSmall: {
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: 16,
        justifyContent: 'center',
        borderRadius: theme.borderRadius.md,
        marginLeft: 8,
    },
    primaryBtnBlock: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: theme.borderRadius.md,
        marginTop: 8,
    },
    
    // Guide Styles
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 12,
        marginTop: 8,
    },
    guideBox: {
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: theme.borderRadius.md,
        marginBottom: 16,
    },
    guideLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
        marginTop: 8,
    },
    codeBlock: {
        backgroundColor: '#e2e8f0',
        padding: 8,
        borderRadius: 4,
    },
    codeText: {
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        fontSize: 11,
        color: '#334155',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#eff6ff',
        padding: 12,
        borderRadius: theme.borderRadius.md,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: '#1e40af',
        lineHeight: 18,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 20,
    }
});
