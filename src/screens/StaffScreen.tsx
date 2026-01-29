import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Alert, Pressable, Keyboard } from 'react-native';
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
        editStaff: false,
        assignWristband: false,
        uploadCsv: false,
        formatGuide: false
    });

    const [assignTab, setAssignTab] = useState<'individual' | 'bulk'>('individual');

    // Add Staff Form State
    const [addStaffData, setAddStaffData] = useState({
        name: '',
        role: '',
        department: '',
        email: '',
        phone: '',
        hireDate: '',
        dob: '',
        season: '2026',
        staffType: '',
        allergies: '',
        reportsTo: '',
        rfid: ''
    });

    // Edit Staff Form State
    const [editStaffData, setEditStaffData] = useState({
        name: '',
        role: '',
        department: '',
        email: '',
        phone: '',
        hireDate: '',
        dob: '',
        season: '2026',
        staffType: '',
        allergies: '',
        reportsTo: '',
        rfid: ''
    });

    // Date Picker State
    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
    const [isDOBPickerVisible, setIsDOBPickerVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Season Picker State
    const [isSeasonPickerVisible, setIsSeasonPickerVisible] = useState(false);
    const SEASONS = ['2023', '2024', '2025', '2026', '2027', '2028'];

    // Staff Type Picker State
    const [isStaffTypePickerVisible, setIsStaffTypePickerVisible] = useState(false);
    const STAFF_TYPES = ['Not Specified', 'General Counselor', 'Specialist', 'Support', 'Leadership', 'Both'];

    // Reports To Picker State
    const [isReportsToPickerVisible, setIsReportsToPickerVisible] = useState(false);
    const SUPERVISORS = ['No Supervisor', 'Wendy Siegel - Director'];

    // Delete Modal State
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState<any>(null);

    // Eval Error State
    const [isEvalErrorVisible, setIsEvalErrorVisible] = useState(false);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    };

    const confirmDateSelection = () => {
        if (isDatePickerVisible) {
            if (modalVisible.editStaff) {
                setEditStaffData(prev => ({ ...prev, hireDate: formatDate(selectedDate) }));
            } else {
                setAddStaffData(prev => ({ ...prev, hireDate: formatDate(selectedDate) }));
            }
            setIsDatePickerVisible(false);
        } else if (isDOBPickerVisible) {
            if (modalVisible.editStaff) {
                setEditStaffData(prev => ({ ...prev, dob: formatDate(selectedDate) }));
            } else {
                setAddStaffData(prev => ({ ...prev, dob: formatDate(selectedDate) }));
            }
            setIsDOBPickerVisible(false);
        }
    };

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

                    <TouchableOpacity style={styles.iconBtn} onPress={() => toggleModal('formatGuide', true)}>
                        <Ionicons name="help-circle-outline" size={24} color={theme.colors.textSecondary} />
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
                                    <View style={styles.cardActions}>
                                        <TouchableOpacity
                                            style={styles.evalIconBtn}
                                            onPress={() => setIsEvalErrorVisible(true)}
                                        >
                                            <Ionicons name="clipboard-outline" size={14} color="white" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.cardActionBtn}
                                            onPress={() => {
                                                setEditStaffData({
                                                    ...staff,
                                                    department: (staff as any).department || '',
                                                    email: (staff as any).email || '',
                                                    phone: (staff as any).phone || '',
                                                    hireDate: (staff as any).hireDate || '',
                                                    dob: (staff as any).dob || '',
                                                    season: (staff as any).season || '2026',
                                                    staffType: (staff as any).staffType || '',
                                                    allergies: (staff as any).allergies || '',
                                                    reportsTo: (staff as any).reportsTo || '',
                                                    rfid: (staff as any).rfid || ''
                                                });
                                                toggleModal('editStaff', true);
                                            }}
                                        >
                                            <Ionicons name="pencil-outline" size={14} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.cardActionBtn}
                                            onPress={() => {
                                                setStaffToDelete(staff);
                                                setIsDeleteModalVisible(true);
                                            }}
                                        >
                                            <Ionicons name="trash-outline" size={14} color="#ef4444" />
                                        </TouchableOpacity>
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
                            <TouchableOpacity onPress={() => toggleModal('assignWristband', false)} style={styles.closeButton}>
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
                                <TouchableOpacity onPress={() => toggleModal('addStaff', false)} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Full Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Jane Doe"
                                    value={addStaffData.name}
                                    onChangeText={(text) => setAddStaffData(prev => ({ ...prev, name: text }))}
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Department</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Activities"
                                    value={addStaffData.department}
                                    onChangeText={(text) => setAddStaffData(prev => ({ ...prev, department: text }))}
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Email</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="jane@example.com"
                                    keyboardType="email-address"
                                    value={addStaffData.email}
                                    onChangeText={(text) => setAddStaffData(prev => ({ ...prev, email: text }))}
                                />
                            </View>
                            <View style={styles.formRow}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.label}>Phone</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="555-0123"
                                        keyboardType="phone-pad"
                                        value={addStaffData.phone}
                                        onChangeText={(text) => setAddStaffData(prev => ({ ...prev, phone: text }))}
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Hire Date</Text>
                                    <TouchableOpacity
                                        style={styles.inputContainer}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            setIsDatePickerVisible(true);
                                        }}
                                    >
                                        <TextInput
                                            style={[styles.input, { marginBottom: 0 }]}
                                            placeholder="mm/dd/yyyy"
                                            value={addStaffData.hireDate}
                                            editable={false}
                                            pointerEvents="none"
                                        />
                                        <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Season (Year)</Text>
                                <TouchableOpacity
                                    style={styles.inputContainer}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setIsSeasonPickerVisible(true);
                                    }}
                                >
                                    <TextInput
                                        style={[styles.input, { marginBottom: 0 }]}
                                        placeholder="Select Year"
                                        value={addStaffData.season}
                                        editable={false}
                                        pointerEvents="none"
                                    />
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Staff Type</Text>
                                <TouchableOpacity
                                    style={styles.inputContainer}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setIsStaffTypePickerVisible(true);
                                    }}
                                >
                                    <TextInput
                                        style={[styles.input, { marginBottom: 0 }]}
                                        placeholder="Not Specified"
                                        value={addStaffData.staffType}
                                        editable={false}
                                        pointerEvents="none"
                                    />
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Allergies</Text>
                                <TextInput
                                    style={[styles.input, styles.textAreaSmall]}
                                    multiline
                                    placeholder="List any allergies (optional)"
                                    value={addStaffData.allergies}
                                    onChangeText={(text) => setAddStaffData(prev => ({ ...prev, allergies: text }))}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Reports To (Supervisor)</Text>
                                <TouchableOpacity
                                    style={styles.inputContainer}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setIsReportsToPickerVisible(true);
                                    }}
                                >
                                    <TextInput
                                        style={[styles.input, { marginBottom: 0 }]}
                                        placeholder="No Supervisor"
                                        value={addStaffData.reportsTo}
                                        editable={false}
                                        pointerEvents="none"
                                    />
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.primaryBtnBlock}
                                onPress={() => {
                                    console.log('Saving staff member:', addStaffData);
                                    toggleModal('addStaff', false);
                                }}
                            >
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
                            <TouchableOpacity onPress={() => toggleModal('uploadCsv', false)} style={styles.closeButton}>
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
                                <Ionicons name="information-circle" size={20} color={theme.colors.secondary} style={{ marginRight: 8 }} />
                                <Text style={styles.infoText}>
                                    Important: leader_id must be a valid UUID. hire_date format: YYYY-MM-DD.
                                </Text>
                            </View>

                            <View style={{ height: 20 }} />
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.primaryBtnBlock} onPress={() => toggleModal('uploadCsv', false)}>
                                <Text style={styles.primaryBtnText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* 4. Format Guide Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible.formatGuide}
                onRequestClose={() => toggleModal('formatGuide', false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContentLarge}>
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="document-text-outline" size={20} color={theme.colors.text} />
                                <Text style={styles.modalTitle}>CSV Upload Format Guide</Text>
                            </View>
                            <TouchableOpacity onPress={() => toggleModal('formatGuide', false)} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Tabs for Guide */}
                        <View style={{ marginBottom: 16 }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {['Children', 'Staff', 'Medications', 'Trips', 'Menu', 'Awards', 'Daily Notes', 'Incidents', 'Calendar', 'Sports'].map((tab) => (
                                    <TouchableOpacity
                                        key={tab}
                                        style={[
                                            styles.guideTab,
                                            tab === 'Staff' && styles.activeGuideTab
                                        ]}
                                    >
                                        <Text style={[
                                            styles.guideTabText,
                                            tab === 'Staff' && styles.activeGuideTabText
                                        ]}>{tab}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.guideCard}>
                                <Text style={styles.guideCardTitle}>Staff Directory</Text>
                                <Text style={styles.guideCardSubtitle}>CSV format for staff directory upload</Text>

                                <Text style={styles.guideLabel}>Required Columns (first row):</Text>
                                <View style={styles.codeBlock}>
                                    <Text style={styles.codeText}>name, email, phone, role, department, hire_date, leader_id, status, season</Text>
                                </View>

                                <Text style={styles.guideLabel}>Example Data Row:</Text>
                                <View style={styles.codeBlock}>
                                    <Text style={styles.codeText}>Jane Smith, jane@thenest.com, 555-9876, Counselor, Activities, 2024-01-15, &lt;leader_id&gt;, active, Summer 2024</Text>
                                </View>

                                <View style={[styles.infoBox, { marginTop: 16 }]}>
                                    <Text style={styles.infoText}>
                                        <Text style={{ fontWeight: 'bold' }}>Important Notes: </Text>
                                        leader_id must be a valid UUID from staff table. hire_date format: YYYY-MM-DD
                                    </Text>
                                </View>

                                <View style={styles.tipsBox}>
                                    <Text style={styles.tipsTitle}>General Tips:</Text>
                                    <Text style={styles.tipsText}>• First row must contain column names exactly as shown</Text>
                                    <Text style={styles.tipsText}>• Use commas to separate values</Text>
                                    <Text style={styles.tipsText}>• Use backslash before commas within text fields (e.g., "Item 1\, Item 2")</Text>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>


            {/* 9. Edit Staff Member Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible.editStaff}
                onRequestClose={() => toggleModal('editStaff', false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalContentLarge}>
                        <ScrollView>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Edit Staff Member</Text>
                                <TouchableOpacity onPress={() => toggleModal('editStaff', false)} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Abel Hernandez Gallardo"
                                    value={editStaffData.name}
                                    onChangeText={(text) => setEditStaffData(prev => ({ ...prev, name: text }))}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Role *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Soccer / General Counselor"
                                    value={editStaffData.role}
                                    onChangeText={(text) => setEditStaffData(prev => ({ ...prev, role: text }))}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Department</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Activities"
                                    value={editStaffData.department}
                                    onChangeText={(text) => setEditStaffData(prev => ({ ...prev, department: text }))}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Email</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="abel_hdez09@hotmail.com"
                                    keyboardType="email-address"
                                    value={editStaffData.email}
                                    onChangeText={(text) => setEditStaffData(prev => ({ ...prev, email: text }))}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Phone</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="7442040788"
                                    keyboardType="phone-pad"
                                    value={editStaffData.phone}
                                    onChangeText={(text) => setEditStaffData(prev => ({ ...prev, phone: text }))}
                                />
                            </View>

                            <View style={styles.formRow}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.label}>Hire Date</Text>
                                    <TouchableOpacity
                                        style={styles.inputContainer}
                                        onPress={() => setIsDatePickerVisible(true)}
                                    >
                                        <TextInput
                                            style={[styles.input, { marginBottom: 0 }]}
                                            placeholder="mm/dd/yyyy"
                                            value={editStaffData.hireDate}
                                            editable={false}
                                            pointerEvents="none"
                                        />
                                        <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                    </TouchableOpacity>
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Date of Birth</Text>
                                    <TouchableOpacity
                                        style={styles.inputContainer}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            setIsDOBPickerVisible(true);
                                        }}
                                    >
                                        <TextInput
                                            style={[styles.input, { marginBottom: 0 }]}
                                            placeholder="10/05/1997"
                                            value={editStaffData.dob}
                                            editable={false}
                                            pointerEvents="none"
                                        />
                                        <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Season (Year)</Text>
                                <TouchableOpacity
                                    style={styles.inputContainer}
                                    onPress={() => setIsSeasonPickerVisible(true)}
                                >
                                    <TextInput
                                        style={[styles.input, { marginBottom: 0 }]}
                                        placeholder="2026"
                                        value={editStaffData.season}
                                        editable={false}
                                        pointerEvents="none"
                                    />
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Staff Type</Text>
                                <TouchableOpacity
                                    style={styles.inputContainer}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setIsStaffTypePickerVisible(true);
                                    }}
                                >
                                    <TextInput
                                        style={[styles.input, { marginBottom: 0 }]}
                                        placeholder="Not Specified"
                                        value={editStaffData.staffType}
                                        editable={false}
                                        pointerEvents="none"
                                    />
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Allergies</Text>
                                <TextInput
                                    style={[styles.input, styles.textAreaSmall]}
                                    multiline
                                    placeholder="List any allergies (optional)"
                                    value={editStaffData.allergies}
                                    onChangeText={(text) => setEditStaffData(prev => ({ ...prev, allergies: text }))}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Reports To (Supervisor)</Text>
                                <TouchableOpacity
                                    style={styles.inputContainer}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setIsReportsToPickerVisible(true);
                                    }}
                                >
                                    <TextInput
                                        style={[styles.input, { marginBottom: 0 }]}
                                        placeholder="No Supervisor"
                                        value={editStaffData.reportsTo}
                                        editable={false}
                                        pointerEvents="none"
                                    />
                                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    <Ionicons name="radio" size={14} color={theme.colors.textSecondary} /> RFID Wristband
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Scan wristband or enter RFID..."
                                    value={editStaffData.rfid}
                                    onChangeText={(text) => setEditStaffData(prev => ({ ...prev, rfid: text }))}
                                />
                                <Text style={styles.helperText}>Scan the staff member's ISO 14443 Type A wristband</Text>
                            </View>

                            <View style={styles.confirmActions}>
                                <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => toggleModal('editStaff', false)}>
                                    <Text style={styles.confirmCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.confirmDeleteBtn, { backgroundColor: theme.colors.primary }]}
                                    onPress={() => {
                                        console.log('Saving Edit:', editStaffData);
                                        toggleModal('editStaff', false);
                                    }}
                                >
                                    <Text style={styles.confirmDeleteText}>Save Changes</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* 5. Date Picker Modal */}
            <Modal
                visible={isDatePickerVisible || isDOBPickerVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    setIsDatePickerVisible(false);
                    setIsDOBPickerVisible(false);
                }}
            >
                <Pressable style={styles.modalOverlay} onPress={() => {
                    setIsDatePickerVisible(false);
                    setIsDOBPickerVisible(false);
                }}>
                    <Pressable style={styles.modalContent} onPress={(e: any) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select {isDOBPickerVisible ? 'Date of Birth' : 'Hire Date'}</Text>
                            <TouchableOpacity onPress={() => {
                                setIsDatePickerVisible(false);
                                setIsDOBPickerVisible(false);
                            }}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.pickerView}>
                            <View style={styles.pickerHeader}>
                                <TouchableOpacity onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}>
                                    <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                                <Text style={styles.pickerMonthText}>
                                    {selectedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                                </Text>
                                <TouchableOpacity onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}>
                                    <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.weekdaysRow}>
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                    <Text key={i} style={styles.weekdayText}>{day}</Text>
                                ))}
                            </View>

                            <View style={styles.daysGrid}>
                                {Array.from({ length: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay() }).map((_, i) => (
                                    <View key={`empty-${i}`} style={styles.dayCell} />
                                ))}
                                {Array.from({ length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                                    const day = i + 1;
                                    const isSelected = selectedDate.getDate() === day;
                                    return (
                                        <TouchableOpacity
                                            key={day}
                                            style={[styles.dayCell, isSelected && styles.selectedDayCell]}
                                            onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
                                        >
                                            <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>{day}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <TouchableOpacity style={styles.primaryBtnBlock} onPress={confirmDateSelection}>
                            <Text style={styles.primaryBtnText}>Confirm Date</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* 6. Season Picker Modal */}
            <Modal
                visible={isSeasonPickerVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsSeasonPickerVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setIsSeasonPickerVisible(false)}>
                    <Pressable style={styles.modalContent} onPress={(e: any) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Season</Text>
                            <TouchableOpacity onPress={() => setIsSeasonPickerVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 300 }}>
                            {SEASONS.map((year) => (
                                <TouchableOpacity
                                    key={year}
                                    style={[styles.pickerItem, (modalVisible.editStaff ? editStaffData.season : addStaffData.season) === year && styles.selectedPickerItem]}
                                    onPress={() => {
                                        if (modalVisible.editStaff) {
                                            setEditStaffData(prev => ({ ...prev, season: year }));
                                        } else {
                                            setAddStaffData(prev => ({ ...prev, season: year }));
                                        }
                                        setIsSeasonPickerVisible(false);
                                    }}
                                >
                                    <Text style={[styles.pickerItemText, (modalVisible.editStaff ? editStaffData.season : addStaffData.season) === year && styles.selectedPickerItemText]}>
                                        {year}
                                    </Text>
                                    {(modalVisible.editStaff ? editStaffData.season : addStaffData.season) === year && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* 7. Delete Confirmation Modal */}
            <Modal
                visible={isDeleteModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsDeleteModalVisible(false)}
            >
                <Pressable style={styles.confirmOverlay} onPress={() => setIsDeleteModalVisible(false)}>
                    <Pressable style={styles.confirmContent} onPress={(e: any) => e.stopPropagation()}>
                        <Text style={styles.confirmTitle}>Are you sure?</Text>
                        <Text style={styles.confirmMessage}>
                            This action cannot be undone. This will permanently delete the staff member record.
                        </Text>
                        <View style={styles.confirmActions}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => setIsDeleteModalVisible(false)}
                            >
                                <Text style={styles.confirmCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmDeleteBtn}
                                onPress={() => {
                                    console.log('Deleting staff:', staffToDelete?.name);
                                    setIsDeleteModalVisible(false);
                                }}
                            >
                                <Text style={styles.confirmDeleteText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* 8. Cannot Evaluate Popup */}
            <Modal
                visible={isEvalErrorVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsEvalErrorVisible(false)}
            >
                <Pressable style={styles.errorOverlay} onPress={() => setIsEvalErrorVisible(false)}>
                    <Pressable style={styles.errorContent} onPress={(e: any) => e.stopPropagation()}>
                        <View style={styles.errorHeader}>
                            <Text style={styles.errorTitle}>Cannot Evaluate</Text>
                            <TouchableOpacity onPress={() => setIsEvalErrorVisible(false)}>
                                <Ionicons name="close-circle-outline" size={24} color={theme.colors.secondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.errorMessage}>
                            This staff member needs a staff type assigned before they can be evaluated. Please edit their profile and set their staff type.
                        </Text>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* 10. Staff Type Picker Modal */}
            <Modal
                visible={isStaffTypePickerVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsStaffTypePickerVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setIsStaffTypePickerVisible(false)}>
                    <Pressable style={styles.modalContent} onPress={(e: any) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Staff Type</Text>
                            <TouchableOpacity onPress={() => setIsStaffTypePickerVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 350 }}>
                            {STAFF_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.pickerItem, (modalVisible.editStaff ? editStaffData.staffType : addStaffData.staffType) === type && styles.selectedPickerItem]}
                                    onPress={() => {
                                        if (modalVisible.editStaff) {
                                            setEditStaffData(prev => ({ ...prev, staffType: type }));
                                        } else {
                                            setAddStaffData(prev => ({ ...prev, staffType: type }));
                                        }
                                        setIsStaffTypePickerVisible(false);
                                    }}
                                >
                                    <Text style={[styles.pickerItemText, (modalVisible.editStaff ? editStaffData.staffType : addStaffData.staffType) === type && styles.selectedPickerItemText]}>
                                        {type}
                                    </Text>
                                    {(modalVisible.editStaff ? editStaffData.staffType : addStaffData.staffType) === type && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* 11. Reports To Picker Modal */}
            <Modal
                visible={isReportsToPickerVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsReportsToPickerVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setIsReportsToPickerVisible(false)}>
                    <Pressable style={styles.modalContent} onPress={(e: any) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Supervisor</Text>
                            <TouchableOpacity onPress={() => setIsReportsToPickerVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 350 }}>
                            {SUPERVISORS.map((supervisor) => (
                                <TouchableOpacity
                                    key={supervisor}
                                    style={[styles.pickerItem, (modalVisible.editStaff ? editStaffData.reportsTo : addStaffData.reportsTo) === supervisor && styles.selectedPickerItem]}
                                    onPress={() => {
                                        if (modalVisible.editStaff) {
                                            setEditStaffData(prev => ({ ...prev, reportsTo: supervisor }));
                                        } else {
                                            setAddStaffData(prev => ({ ...prev, reportsTo: supervisor }));
                                        }
                                        setIsReportsToPickerVisible(false);
                                    }}
                                >
                                    <Text style={[styles.pickerItemText, (modalVisible.editStaff ? editStaffData.reportsTo : addStaffData.reportsTo) === supervisor && styles.selectedPickerItemText]}>
                                        {supervisor}
                                    </Text>
                                    {(modalVisible.editStaff ? editStaffData.reportsTo : addStaffData.reportsTo) === supervisor && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
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
        borderRadius: 20, // theme.borderRadius.full doesn't exist
        gap: 6,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
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
        width: '100%',
        marginBottom: theme.spacing.md,
    },
    staffCard: {
        backgroundColor: 'white',
        borderRadius: theme.borderRadius.md,
        borderWidth: 1.5,
        borderColor: '#ef4444', // Red border as requested
        padding: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    staffHeader: {
        flexDirection: 'row',
        marginBottom: 10,
        alignItems: 'flex-start',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    evalIconBtn: {
        backgroundColor: '#f97316', // Orange
        width: 24,
        height: 24,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardActionBtn: {
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
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
        justifyContent: 'flex-end',
        width: '100%',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 30,
        width: '100%',
        maxWidth: 600,
        maxHeight: '85%',
        alignSelf: 'center',
    },
    modalContentLarge: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 30,
        width: '100%',
        maxWidth: 600,
        height: '90%',
        alignSelf: 'center',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    closeButton: {
        padding: 4,
    },
    modalBody: {
        flex: 1,
    },
    modalFooter: {
        marginTop: 20,
        paddingBottom: 10,
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
    },
    // New Guide Modal Styles
    guideTab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        marginRight: 8,
    },
    activeGuideTab: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: theme.colors.secondary,
    },
    guideTabText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    activeGuideTabText: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    guideCard: {
        backgroundColor: 'white',
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 16,
    },
    guideCardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    guideCardSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 16,
    },
    tipsBox: {
        marginTop: 20,
        backgroundColor: '#fffbeb', // light yellow
        padding: 12,
        borderRadius: theme.borderRadius.md,
    },
    tipsTitle: {
        fontWeight: 'bold',
        color: '#92400e', // dark yellow/orange
        fontSize: 13,
        marginBottom: 8,
    },
    tipsText: {
        fontSize: 12,
        color: '#92400e',
        marginBottom: 4,
        lineHeight: 18,
    },
    inputContainer: {
        position: 'relative',
        justifyContent: 'center',
    },
    inputIcon: {
        position: 'absolute',
        right: 12,
        top: 10,
    },
    // Picker Styles
    pickerView: {
        paddingVertical: 10,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    pickerMonthText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    weekdaysRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    weekdayText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        width: 40,
        textAlign: 'center',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    dayCell: {
        width: '14.28%',
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 2,
    },
    selectedDayCell: {
        backgroundColor: theme.colors.secondary,
        borderRadius: 20,
    },
    dayText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    selectedDayText: {
        color: 'white',
        fontWeight: 'bold',
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    selectedPickerItem: {
        backgroundColor: '#f0f9ff',
    },
    pickerItemText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    selectedPickerItemText: {
        color: theme.colors.secondary,
        fontWeight: 'bold',
    },
    // Confirm Modal Styles
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 12,
    },
    confirmMessage: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: 24,
    },
    confirmActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    confirmCancelBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    confirmCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    confirmDeleteBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#2563eb', // Matches blue in screenshot
    },
    confirmDeleteText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    // Error Modal Styles
    errorOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    errorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    errorMessage: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 22,
    },
});
