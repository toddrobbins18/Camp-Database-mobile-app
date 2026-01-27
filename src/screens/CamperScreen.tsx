import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 600; // Mobile: full width cards
const isMediumScreen = SCREEN_WIDTH >= 600 && SCREEN_WIDTH < 1024; // Tablet: 2 columns
const isLargeScreen = SCREEN_WIDTH >= 1024; // Desktop: 3 columns

// Division options matching the screenshot
const DIVISIONS = [
    'All Divisions',
    'Freshmen A Girls',
    'Freshmen B Girls',
    'Cadet Girls',
    'Sophomore Girls',
    'Junior Girls',
    'Senior Girls',
    'Super Girls',
    'Teen Girls',
    'CIT Girls',
    'Freshmen A Boys',
    'Freshmen B Boys',
    'Cadet Boys',
    'Sophomore Boys',
    'Junior Boys',
    'Senior Boys',
    'Super Boys',
    'Teen Boys',
    'CIT Boys',
];

// Mock leaders data
const MOCK_LEADERS = [
    { name: 'Abel Hernandez Gallardo', role: 'Soccer / General Counselor' },
    { name: 'Abigail Sheridan', role: 'General Counselor - Freshmen Boys' },
    { name: 'Adrian Chamu Ochoa', role: 'Lead Counselor' },
    { name: 'Alanah Mutch', role: 'Tennis / General Counselor' },
    { name: 'ALEJO RODRÍGUEZ ALONSO', role: 'Climbing Wall / General' },
    { name: 'Aleksandra Makuch', role: 'Support Staff' },
    { name: 'Alex Devitt', role: 'General Counselor' },
    { name: 'Alex Weisenthal', role: 'General Counselor' },
    { name: 'Alexandra Forman', role: 'General Counselor' },
    { name: 'Alexandra Sproul', role: 'General Counselor' },
    { name: 'Alicia Ford', role: 'Climbing Wall / General Counselor' },
];

// Header Component (Resusable for sub-screens)
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

export const CamperScreen = ({ navigation }: any) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDivision, setSelectedDivision] = useState('All Divisions');
    const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
    const [divisionButtonLayout, setDivisionButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [sortBy, setSortBy] = useState<'division' | 'name'>('division');
    const [scannerMode, setScannerMode] = useState(false);
    const [rfidInput, setRfidInput] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const rfidInputRef = useRef<TextInput>(null);
    const [showAssignWristbandsModal, setShowAssignWristbandsModal] = useState(false);
    const [assignWristbandsTab, setAssignWristbandsTab] = useState<'individual' | 'bulk'>('individual');
    const [searchCamperName, setSearchCamperName] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedCamper, setSelectedCamper] = useState<any>(null);
    const [individualRfid, setIndividualRfid] = useState('');
    const [csvData, setCsvData] = useState('');
    const [showAddChildModal, setShowAddChildModal] = useState(false);
    const [showAddGenderDropdown, setShowAddGenderDropdown] = useState(false);
    const [addGenderButtonLayout, setAddGenderButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const addGenderButtonRef = useRef<any>(null);
    const [showAddDivisionDropdown, setShowAddDivisionDropdown] = useState(false);
    const [addDivisionButtonLayout, setAddDivisionButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const addDivisionButtonRef = useRef<any>(null);
    const [showAddLeaderDropdown, setShowAddLeaderDropdown] = useState(false);
    const [addLeaderButtonLayout, setAddLeaderButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const addLeaderButtonRef = useRef<any>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [camperToDelete, setCamperToDelete] = useState<any>(null);
    const [showEditChildModal, setShowEditChildModal] = useState(false);
    const [camperToEdit, setCamperToEdit] = useState<any>(null);
    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showEditGenderDropdown, setShowEditGenderDropdown] = useState(false);
    const [editGenderButtonLayout, setEditGenderButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const genderButtonRef = useRef<any>(null);
    const [showEditBunkDropdown, setShowEditBunkDropdown] = useState(false);
    const [editBunkButtonLayout, setEditBunkButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const bunkButtonRef = useRef<any>(null);
    const [showEditDivisionDropdown, setShowEditDivisionDropdown] = useState(false);
    const [editDivisionButtonLayout, setEditDivisionButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const divisionButtonRef = useRef<any>(null);
    const [showEditLeaderDropdown, setShowEditLeaderDropdown] = useState(false);
    const [editLeaderButtonLayout, setEditLeaderButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const leaderButtonRef = useRef<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        person_id: '',
        age: '',
        gender: '',
        division: '',
        grade: '',
        group: '',
        season: '2026',
        assignedLeader: '',
        guardianEmail: '',
        guardianPhone: '',
        emergencyContact: '',
        rfid: '',
        allergies: '',
        medicalNotes: '',
    });
    const [editFormData, setEditFormData] = useState({
        name: '',
        person_id: '',
        age: '',
        dateOfBirth: '',
        gender: '',
        division: '',
        bunk: '',
        grade: '',
        group: '',
        season: '2026',
        assignedLeader: '',
        guardianEmail: '',
        guardianPhone: '',
        emergencyContact: '',
        rfid: '',
        allergies: '',
        medicalNotes: '',
    });
    const campersPerPage = 50;
    const totalCampers = mockCampers.length;
    const totalPages = Math.ceil(totalCampers / campersPerPage);

    // Keep scanner input focused when in scanner mode
    useEffect(() => {
        if (scannerMode && rfidInputRef.current) {
            setTimeout(() => {
                rfidInputRef.current?.focus();
            }, 100);
        }
    }, [scannerMode]);

    const toggleScannerMode = () => {
        const newMode = !scannerMode;
        setScannerMode(newMode);
        if (!newMode) {
            setRfidInput('');
        }
    };

    const handleRfidScan = () => {
        if (!rfidInput.trim()) return;
        // TODO: Implement RFID scan logic
        console.log('Scanning RFID:', rfidInput);
        setIsScanning(true);
        setTimeout(() => {
            setIsScanning(false);
            setRfidInput('');
        }, 1000);
    };

    // Calculate pagination
    const startIndex = (currentPage - 1) * campersPerPage;
    const endIndex = startIndex + campersPerPage;
    const currentCampers = mockCampers.slice(startIndex, endIndex);
    const showingStart = totalCampers > 0 ? startIndex + 1 : 0;
    const showingEnd = Math.min(endIndex, totalCampers);

    // Generate page numbers with ellipsis
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            // Show all pages if total is less than max visible
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage <= 3) {
                // Near the beginning
                for (let i = 2; i <= 4; i++) {
                    pages.push(i);
                }
                pages.push('ellipsis');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                // Near the end
                pages.push('ellipsis');
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                // In the middle
                pages.push('ellipsis');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('ellipsis');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ScreenHeader title="Camper" navigation={navigation} />

                {/* Header Section */}
                <View style={styles.headerSection}>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.mainHeaderTitle}>Camper</Text>
                        <Text style={styles.headerSubtitle}>Manage and view all campers in your program</Text>
                    </View>
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.actionButton, scannerMode && styles.scannerActiveButton]}
                            onPress={toggleScannerMode}
                        >
                            <Ionicons
                                name={scannerMode ? "radio" : "scan-outline"}
                                size={18}
                                color={scannerMode ? theme.colors.surface : theme.colors.text}
                            />
                            <Text style={[styles.actionButtonText, scannerMode && styles.scannerActiveButtonText]}>
                                {scannerMode ? 'Scanner Active' : 'Scan Wristband'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => setShowAssignWristbandsModal(true)}
                        >
                            <Ionicons name="pricetag-outline" size={18} color={theme.colors.text} />
                            <Text style={styles.actionButtonText}>Assign Wristbands</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.text} />
                            <Text style={styles.actionButtonText}>Upload CSV</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.addChildButton}
                            onPress={() => setShowAddChildModal(true)}
                        >
                            <Ionicons name="add" size={20} color={theme.colors.surface} />
                            <Text style={styles.addChildButtonText}>Add Child</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* RFID Scanner Input */}
                {scannerMode && (
                    <View style={styles.scannerContainer}>
                        <View style={styles.scannerContent}>
                            <View style={styles.scannerInputContainer}>
                                <Text style={styles.scannerLabel}>
                                    Ready to scan wristband (ISO 14443 Type A)
                                </Text>
                                <View style={styles.scannerInputRow}>
                                    <TextInput
                                        ref={rfidInputRef}
                                        style={styles.scannerInput}
                                        value={rfidInput}
                                        onChangeText={setRfidInput}
                                        placeholder="Scan wristband or enter RFID..."
                                        placeholderTextColor={theme.colors.textSecondary}
                                        autoFocus
                                        editable={!isScanning}
                                        onSubmitEditing={handleRfidScan}
                                    />
                                    <TouchableOpacity
                                        style={[styles.findCamperButton, (!rfidInput.trim() || isScanning) && styles.findCamperButtonDisabled]}
                                        onPress={handleRfidScan}
                                        disabled={!rfidInput.trim() || isScanning}
                                    >
                                        <Text style={styles.findCamperButtonText}>
                                            {isScanning ? 'Searching...' : 'Find Camper'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                        <Text style={styles.scannerHelperText}>
                            Bluetooth scanner ready. Scans auto-submit. Tap input if focus is lost.
                        </Text>
                    </View>
                )}

                {/* Search and Filter Bar */}
                <View style={styles.filterRow}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
                        <TextInput
                            placeholder="Search by name, grade, or division..."
                            style={styles.searchInput}
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>
                </View>

                <View style={styles.filterRow2}>
                    <View style={styles.divisionFilterContainer}>
                        <TouchableOpacity
                            style={styles.divisionFilter}
                            onPress={() => setShowDivisionDropdown(!showDivisionDropdown)}
                            onLayout={(event) => {
                                const { x, y, width, height } = event.nativeEvent.layout;
                                setDivisionButtonLayout({ x, y, width, height });
                            }}
                        >
                            <Text style={styles.divisionFilterText}>{selectedDivision}</Text>
                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={styles.sortButton}
                        onPress={() => setSortBy(sortBy === 'division' ? 'name' : 'division')}
                    >
                        <Ionicons name="swap-vertical-outline" size={18} color={theme.colors.text} />
                        <Text style={styles.sortButtonText}>
                            {sortBy === 'division' ? 'Sort by Division' : 'Sort by Name'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Division Dropdown Modal */}
                <Modal
                    visible={showDivisionDropdown}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowDivisionDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheetOverlay}
                        onPress={() => setShowDivisionDropdown(false)}
                    >
                        <Pressable
                            style={styles.bottomSheet}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <View style={styles.bottomSheetHeader}>
                                <Text style={styles.bottomSheetTitle}>Select Division</Text>
                            </View>
                            <ScrollView
                                style={styles.bottomSheetScroll}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                            >
                                {DIVISIONS.map((division) => (
                                    <TouchableOpacity
                                        key={division}
                                        style={[
                                            styles.bottomSheetOption,
                                            selectedDivision === division && styles.bottomSheetOptionSelected
                                        ]}
                                        onPress={() => {
                                            setSelectedDivision(division);
                                            setShowDivisionDropdown(false);
                                        }}
                                    >
                                        <Ionicons
                                            name="people-outline"
                                            size={24}
                                            color={selectedDivision === division ? theme.colors.secondary : theme.colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            selectedDivision === division && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {division}
                                        </Text>
                                        {selectedDivision === division && (
                                            <Ionicons name="checkmark" size={20} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Assign Wristbands Modal */}
                <Modal
                    visible={showAssignWristbandsModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowAssignWristbandsModal(false)}
                >
                    <Pressable
                        style={styles.bottomSheetOverlay}
                        onPress={() => setShowAssignWristbandsModal(false)}
                    >
                        <Pressable
                            style={styles.largeBottomSheet}
                            onPress={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <View style={styles.assignWristbandsHeader}>
                                <View style={styles.assignWristbandsTitleRow}>
                                    <Ionicons name="radio" size={24} color={theme.colors.text} />
                                    <Text style={styles.assignWristbandsTitle}>Assign RFID Wristbands - Campers</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowAssignWristbandsModal(false)}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Tabs */}
                            <View style={styles.assignWristbandsTabs}>
                                <TouchableOpacity
                                    style={[
                                        styles.assignWristbandsTab,
                                        assignWristbandsTab === 'individual' && styles.assignWristbandsTabActive
                                    ]}
                                    onPress={() => setAssignWristbandsTab('individual')}
                                >
                                    <Ionicons name="person-outline" size={16} color={assignWristbandsTab === 'individual' ? theme.colors.secondary : theme.colors.textSecondary} />
                                    <Text style={[
                                        styles.assignWristbandsTabText,
                                        assignWristbandsTab === 'individual' && styles.assignWristbandsTabTextActive
                                    ]}>
                                        Individual
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.assignWristbandsTab,
                                        assignWristbandsTab === 'bulk' && styles.assignWristbandsTabActive
                                    ]}
                                    onPress={() => setAssignWristbandsTab('bulk')}
                                >
                                    <Ionicons name="cloud-upload-outline" size={16} color={assignWristbandsTab === 'bulk' ? theme.colors.secondary : theme.colors.textSecondary} />
                                    <Text style={[
                                        styles.assignWristbandsTabText,
                                        assignWristbandsTab === 'bulk' && styles.assignWristbandsTabTextActive
                                    ]}>
                                        Bulk CSV
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Tab Content */}
                            <ScrollView style={styles.assignWristbandsContent} showsVerticalScrollIndicator={true}>
                                {assignWristbandsTab === 'individual' ? (
                                    <View style={styles.individualTabContent}>
                                        {/* Search for Camper */}
                                        <View style={styles.searchCamperSection}>
                                            <Text style={styles.sectionLabel}>1. Search for Camper</Text>
                                            <View style={styles.searchCamperRow}>
                                                <TextInput
                                                    style={styles.searchCamperInput}
                                                    placeholder="Search camper by name..."
                                                    placeholderTextColor={theme.colors.textSecondary}
                                                    value={searchCamperName}
                                                    onChangeText={setSearchCamperName}
                                                    onSubmitEditing={() => {
                                                        // TODO: Implement search
                                                        const results = mockCampers.filter(c =>
                                                            c.name.toLowerCase().includes(searchCamperName.toLowerCase())
                                                        ).slice(0, 10);
                                                        setSearchResults(results);
                                                    }}
                                                />
                                                <TouchableOpacity
                                                    style={styles.searchButton}
                                                    onPress={() => {
                                                        const results = mockCampers.filter(c =>
                                                            c.name.toLowerCase().includes(searchCamperName.toLowerCase())
                                                        ).slice(0, 10);
                                                        setSearchResults(results);
                                                    }}
                                                >
                                                    <Text style={styles.searchButtonText}>Search</Text>
                                                </TouchableOpacity>
                                            </View>

                                            {/* Search Results */}
                                            {searchResults.length > 0 && (
                                                <View style={styles.searchResultsContainer}>
                                                    {searchResults.map((camper, index) => (
                                                        <TouchableOpacity
                                                            key={index}
                                                            style={styles.searchResultItem}
                                                            onPress={() => {
                                                                setSelectedCamper(camper);
                                                                setSearchResults([]);
                                                                setSearchCamperName('');
                                                            }}
                                                        >
                                                            <Text style={styles.searchResultText}>{camper.name}</Text>
                                                            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            )}
                                        </View>

                                        {/* Selected Camper + RFID Input */}
                                        {selectedCamper && (
                                            <View style={styles.selectedCamperSection}>
                                                <View style={styles.selectedCamperHeader}>
                                                    <View>
                                                        <Text style={styles.selectedCamperName}>{selectedCamper.name}</Text>
                                                        <Text style={styles.selectedCamperInfo}>{selectedCamper.grade} • {selectedCamper.division}</Text>
                                                    </View>
                                                    <TouchableOpacity onPress={() => setSelectedCamper(null)}>
                                                        <Ionicons name="close-circle" size={24} color={theme.colors.textSecondary} />
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={styles.rfidInputSection}>
                                                    <Text style={styles.sectionLabel}>2. Scan Wristband (ISO 14443 Type A)</Text>
                                                    <View style={styles.rfidInputRow}>
                                                        <TextInput
                                                            style={styles.rfidInputField}
                                                            placeholder="Scan wristband..."
                                                            placeholderTextColor={theme.colors.textSecondary}
                                                            value={individualRfid}
                                                            onChangeText={setIndividualRfid}
                                                            autoFocus
                                                        />
                                                        <TouchableOpacity
                                                            style={[styles.assignButton, !individualRfid.trim() && styles.assignButtonDisabled]}
                                                            disabled={!individualRfid.trim()}
                                                            onPress={() => {
                                                                // TODO: Implement assign
                                                                console.log('Assign RFID:', individualRfid, 'to', selectedCamper.name);
                                                                setIndividualRfid('');
                                                                setSelectedCamper(null);
                                                            }}
                                                        >
                                                            <Text style={styles.assignButtonText}>Assign</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <View style={styles.bulkTabContent}>
                                        <View style={styles.bulkSection}>
                                            <Text style={styles.sectionLabel}>Upload CSV or paste data</Text>
                                            <Text style={styles.bulkFormatText}>
                                                Format: name,rfid or person_id,rfid (one per line)
                                            </Text>
                                            <View style={styles.fileInputContainer}>
                                                <Text style={styles.fileInputText}>Choose file</Text>
                                                <Text style={styles.fileInputPlaceholder}>No file chosen</Text>
                                            </View>
                                            <TextInput
                                                style={styles.csvTextArea}
                                                placeholder="John Smith,ABC123DEF456&#10;Jane Doe,XYZ789GHI012&#10;..."
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={csvData}
                                                onChangeText={setCsvData}
                                                multiline
                                                textAlignVertical="top"
                                            />
                                            <TouchableOpacity
                                                style={[styles.bulkAssignButton, !csvData.trim() && styles.bulkAssignButtonDisabled]}
                                                disabled={!csvData.trim()}
                                                onPress={() => {
                                                    // TODO: Implement bulk assign
                                                    const rows = csvData.trim().split('\n').filter(l => l.trim()).length;
                                                    console.log('Bulk assign:', rows, 'rows');
                                                }}
                                            >
                                                <Text style={styles.bulkAssignButtonText}>
                                                    Assign Wristbands ({csvData.trim().split('\n').filter(l => l.trim()).length} rows)
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Add Child Modal */}
                <Modal
                    visible={showAddChildModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowAddChildModal(false)}
                >
                    <Pressable
                        style={styles.bottomSheetOverlay}
                        onPress={() => setShowAddChildModal(false)}
                    >
                        <Pressable
                            style={styles.largeBottomSheet}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <ScrollView
                                style={styles.addChildModalScroll}
                                showsVerticalScrollIndicator={true}
                                nestedScrollEnabled={true}
                            >
                                {/* Modal Header */}
                                <View style={styles.addChildModalHeader}>
                                    <Text style={styles.addChildModalTitle}>Add New Child</Text>
                                    <TouchableOpacity onPress={() => setShowAddChildModal(false)}>
                                        <Ionicons name="close" size={24} color={theme.colors.text} />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.requiredFieldsNote}>
                                    Fields marked with <Text style={styles.requiredStar}>*</Text> are required
                                </Text>

                                {/* Form Fields */}
                                <View style={styles.addChildForm}>
                                    {/* Row 1: Name and Person ID */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>
                                                Name <Text style={styles.requiredStar}>*</Text>
                                            </Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="First and Last Name"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={formData.name}
                                                onChangeText={(text) => setFormData({ ...formData, name: text })}
                                            />
                                        </View>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>
                                                Person ID <Text style={styles.requiredStar}>*</Text>
                                            </Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="e.g., TLW001"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={formData.person_id}
                                                onChangeText={(text) => setFormData({ ...formData, person_id: text })}
                                            />
                                            <Text style={styles.formDescription}>Unique identifier for this camper</Text>
                                        </View>
                                    </View>

                                    {/* Row 2: Age and Gender */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Age</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="Age"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={formData.age}
                                                onChangeText={(text) => setFormData({ ...formData, age: text })}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Gender</Text>
                                            <TouchableOpacity
                                                ref={addGenderButtonRef}
                                                style={styles.formSelect}
                                                onLayout={(event) => {
                                                    const { x, y, width, height } = event.nativeEvent.layout;
                                                    // Measure position relative to window for accurate positioning
                                                    if (addGenderButtonRef.current) {
                                                        (addGenderButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                            setAddGenderButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                        });
                                                    }
                                                }}
                                                onPress={() => {
                                                    // Re-measure on press to get current position
                                                    if (addGenderButtonRef.current) {
                                                        (addGenderButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                            setAddGenderButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                            setShowAddGenderDropdown(true);
                                                        });
                                                    }
                                                }}
                                            >
                                                <Text style={[styles.formSelectText, !formData.gender && styles.formSelectPlaceholder]}>
                                                    {formData.gender || 'Select gender'}
                                                </Text>
                                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Row 3: Division and Grade */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Division</Text>
                                            <TouchableOpacity
                                                ref={addDivisionButtonRef}
                                                style={styles.formSelect}
                                                onLayout={(event) => {
                                                    const { x, y, width, height } = event.nativeEvent.layout;
                                                    // Measure position relative to window for accurate positioning
                                                    if (addDivisionButtonRef.current) {
                                                        (addDivisionButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                            setAddDivisionButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                        });
                                                    }
                                                }}
                                                onPress={() => {
                                                    // Re-measure on press to get current position
                                                    if (addDivisionButtonRef.current) {
                                                        (addDivisionButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                            setAddDivisionButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                            setShowAddDivisionDropdown(true);
                                                        });
                                                    }
                                                }}
                                            >
                                                <Text style={[styles.formSelectText, !formData.division && styles.formSelectPlaceholder]}>
                                                    {formData.division || 'Select division'}
                                                </Text>
                                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Grade</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="Grade"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={formData.grade}
                                                onChangeText={(text) => setFormData({ ...formData, grade: text })}
                                            />
                                        </View>
                                    </View>

                                    {/* Row 4: Group and Season */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Group</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="Group"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={formData.group}
                                                onChangeText={(text) => setFormData({ ...formData, group: text })}
                                            />
                                        </View>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Season (Year)</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="2026"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={formData.season}
                                                onChangeText={(text) => setFormData({ ...formData, season: text })}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>

                                    {/* Row 5: Assigned Leader (Full Width) */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldFull}>
                                            <Text style={styles.formLabel}>Assigned Leader</Text>
                                            <TouchableOpacity
                                                ref={addLeaderButtonRef}
                                                style={styles.formSelect}
                                                onLayout={(event) => {
                                                    const { x, y, width, height } = event.nativeEvent.layout;
                                                    // Measure position relative to window for accurate positioning
                                                    if (addLeaderButtonRef.current) {
                                                        (addLeaderButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                            setAddLeaderButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                        });
                                                    }
                                                }}
                                                onPress={() => {
                                                    // Re-measure on press to get current position
                                                    if (addLeaderButtonRef.current) {
                                                        (addLeaderButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                            setAddLeaderButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                            setShowAddLeaderDropdown(true);
                                                        });
                                                    }
                                                }}
                                            >
                                                <Text style={[styles.formSelectText, !formData.assignedLeader && styles.formSelectPlaceholder]}>
                                                    {formData.assignedLeader || 'Select a leader'}
                                                </Text>
                                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Row 6: Guardian Email and Phone */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Guardian Email</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="Guardian Email"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={formData.guardianEmail}
                                                onChangeText={(text) => setFormData({ ...formData, guardianEmail: text })}
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                            />
                                        </View>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Guardian Phone</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="Guardian Phone"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={formData.guardianPhone}
                                                onChangeText={(text) => setFormData({ ...formData, guardianPhone: text })}
                                                keyboardType="phone-pad"
                                            />
                                        </View>
                                    </View>

                                    {/* Row 7: Emergency Contact (Full Width) */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldFull}>
                                            <Text style={styles.formLabel}>Emergency Contact</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="Emergency Contact"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={formData.emergencyContact}
                                                onChangeText={(text) => setFormData({ ...formData, emergencyContact: text })}
                                            />
                                        </View>
                                    </View>

                                    {/* Row 8: RFID Bracelet (Full Width) */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldFull}>
                                            <Text style={styles.formLabel}>RFID Bracelet</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="Scan or enter RFID"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={formData.rfid}
                                                onChangeText={(text) => setFormData({ ...formData, rfid: text })}
                                            />
                                            <Text style={styles.formDescription}>
                                                Scan the camper's RFID bracelet for quick medication check-in
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Row 9: Allergies (Full Width Textarea) */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldFull}>
                                            <Text style={styles.formLabel}>Allergies</Text>
                                            <TextInput
                                                style={styles.formTextArea}
                                                placeholder="Allergies"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={formData.allergies}
                                                onChangeText={(text) => setFormData({ ...formData, allergies: text })}
                                                multiline
                                                numberOfLines={4}
                                                textAlignVertical="top"
                                            />
                                        </View>
                                    </View>

                                    {/* Row 10: Medical Notes (Full Width Textarea) */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldFull}>
                                            <Text style={styles.formLabel}>Medical Notes</Text>
                                            <TextInput
                                                style={styles.formTextArea}
                                                placeholder="Medical Notes"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={formData.medicalNotes}
                                                onChangeText={(text) => setFormData({ ...formData, medicalNotes: text })}
                                                multiline
                                                numberOfLines={4}
                                                textAlignVertical="top"
                                            />
                                        </View>
                                    </View>

                                    {/* Form Buttons */}
                                    <View style={styles.formButtons}>
                                        <TouchableOpacity
                                            style={styles.cancelButton}
                                            onPress={() => {
                                                setShowAddChildModal(false);
                                                setFormData({
                                                    name: '',
                                                    person_id: '',
                                                    age: '',
                                                    gender: '',
                                                    division: '',
                                                    grade: '',
                                                    group: '',
                                                    season: '2026',
                                                    assignedLeader: '',
                                                    guardianEmail: '',
                                                    guardianPhone: '',
                                                    emergencyContact: '',
                                                    rfid: '',
                                                    allergies: '',
                                                    medicalNotes: '',
                                                });
                                            }}
                                        >
                                            <Text style={styles.cancelButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.submitButton}
                                            onPress={() => {
                                                // TODO: Implement submit logic
                                                console.log('Add child:', formData);
                                                setShowAddChildModal(false);
                                            }}
                                        >
                                            <Text style={styles.submitButtonText}>Add Child</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Gender Dropdown Modal for Add Child */}
                <Modal
                    visible={showAddGenderDropdown}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowAddGenderDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheetOverlay}
                        onPress={() => setShowAddGenderDropdown(false)}
                    >
                        <Pressable
                            style={styles.bottomSheet}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <View style={styles.bottomSheetHeader}>
                                <Text style={styles.bottomSheetTitle}>Select Gender</Text>
                            </View>
                            <ScrollView
                                style={styles.bottomSheetScroll}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={false}
                            >
                                {['Male', 'Female'].map((gender) => (
                                    <TouchableOpacity
                                        key={gender}
                                        style={[
                                            styles.bottomSheetOption,
                                            formData.gender === gender && styles.bottomSheetOptionSelected
                                        ]}
                                        onPress={() => {
                                            setFormData({ ...formData, gender: gender });
                                            setShowAddGenderDropdown(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            formData.gender === gender && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {gender}
                                        </Text>
                                        {formData.gender === gender && (
                                            <Ionicons name="checkmark" size={18} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Division Dropdown Modal for Add Child */}
                <Modal
                    visible={showAddDivisionDropdown}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowAddDivisionDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheetOverlay}
                        onPress={() => setShowAddDivisionDropdown(false)}
                    >
                        <Pressable
                            style={styles.bottomSheet}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <View style={styles.bottomSheetHeader}>
                                <Text style={styles.bottomSheetTitle}>Select Division</Text>
                            </View>
                            <ScrollView
                                style={styles.bottomSheetScroll}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                            >
                                {DIVISIONS.filter(div => div !== 'All Divisions').map((division) => (
                                    <TouchableOpacity
                                        key={division}
                                        style={[
                                            styles.bottomSheetOption,
                                            formData.division === division && styles.bottomSheetOptionSelected
                                        ]}
                                        onPress={() => {
                                            setFormData({ ...formData, division: division });
                                            setShowAddDivisionDropdown(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            formData.division === division && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {division}
                                        </Text>
                                        {formData.division === division && (
                                            <Ionicons name="checkmark" size={18} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Assigned Leader Dropdown Modal for Add Child */}
                <Modal
                    visible={showAddLeaderDropdown}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowAddLeaderDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheetOverlay}
                        onPress={() => setShowAddLeaderDropdown(false)}
                    >
                        <Pressable
                            style={styles.bottomSheet}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <View style={styles.bottomSheetHeader}>
                                <Text style={styles.bottomSheetTitle}>Select Assigned Leader</Text>
                            </View>
                            <ScrollView
                                style={styles.bottomSheetScroll}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                            >
                                {MOCK_LEADERS.map((leader) => {
                                    const leaderDisplay = `${leader.name} - ${leader.role}`;
                                    const isSelected = formData.assignedLeader === leaderDisplay;
                                    return (
                                        <TouchableOpacity
                                            key={leader.name}
                                            style={[
                                                styles.bottomSheetOption,
                                                isSelected && styles.bottomSheetOptionSelected
                                            ]}
                                            onPress={() => {
                                                setFormData({ ...formData, assignedLeader: leaderDisplay });
                                                setShowAddLeaderDropdown(false);
                                            }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={[
                                                    styles.bottomSheetOptionText,
                                                    isSelected && styles.bottomSheetOptionTextSelected
                                                ]}>
                                                    {leader.name}
                                                </Text>
                                                <Text style={[
                                                    styles.leaderRoleText,
                                                    isSelected && styles.leaderRoleTextSelected
                                                ]}>
                                                    {leader.role}
                                                </Text>
                                            </View>
                                            {isSelected && (
                                                <Ionicons name="checkmark" size={18} color={theme.colors.secondary} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal
                    visible={showDeleteModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => {
                        setShowDeleteModal(false);
                        setCamperToDelete(null);
                    }}
                >
                    <Pressable
                        style={styles.modalOverlay}
                        onPress={() => {
                            setShowDeleteModal(false);
                            setCamperToDelete(null);
                        }}
                    >
                        <Pressable
                            style={styles.deleteModalContainer}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <Text style={styles.deleteModalTitle}>Are you sure?</Text>
                            <Text style={styles.deleteModalMessage}>
                                This action cannot be undone. This will permanently delete the camper record.
                            </Text>
                            <View style={styles.deleteModalButtons}>
                                <TouchableOpacity
                                    style={styles.deleteCancelButton}
                                    onPress={() => {
                                        setShowDeleteModal(false);
                                        setCamperToDelete(null);
                                    }}
                                >
                                    <Text style={styles.deleteCancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.deleteConfirmButton}
                                    onPress={() => {
                                        // TODO: Implement delete functionality
                                        console.log('Delete camper:', camperToDelete?.name);
                                        setShowDeleteModal(false);
                                        setCamperToDelete(null);
                                    }}
                                >
                                    <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Edit Child Modal */}
                <Modal
                    visible={showEditChildModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => {
                        setShowEditChildModal(false);
                        setCamperToEdit(null);
                    }}
                >
                    <Pressable
                        style={styles.bottomSheetOverlay}
                        onPress={() => {
                            setShowEditChildModal(false);
                            setCamperToEdit(null);
                        }}
                    >
                        <Pressable
                            style={styles.largeBottomSheet}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <ScrollView
                                style={styles.addChildModalScroll}
                                showsVerticalScrollIndicator={true}
                                nestedScrollEnabled={true}
                            >
                                {/* Modal Header */}
                                <View style={styles.addChildModalHeader}>
                                    <Text style={styles.addChildModalTitle}>Edit Child</Text>
                                    <TouchableOpacity onPress={() => {
                                        setShowEditChildModal(false);
                                        setCamperToEdit(null);
                                    }}>
                                        <Ionicons name="close" size={24} color={theme.colors.text} />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.requiredFieldsNote}>
                                    Fields marked with <Text style={styles.requiredStar}>*</Text> are required
                                </Text>

                                {/* Form Fields */}
                                <View style={styles.addChildForm}>
                                    {/* Row 1: Name and Age */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>
                                                Name <Text style={styles.requiredStar}>*</Text>
                                            </Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="First and Last Name"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={editFormData.name}
                                                onChangeText={(text) => setEditFormData({ ...editFormData, name: text })}
                                            />
                                        </View>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Age</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="Age"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={editFormData.age}
                                                onChangeText={(text) => setEditFormData({ ...editFormData, age: text })}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>

                                    {/* Row 2: Date of Birth and Person ID */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Date of Birth</Text>
                                            <TouchableOpacity
                                                style={styles.dateInputContainer}
                                                onPress={() => {
                                                    if (editFormData.dateOfBirth) {
                                                        const dateParts = editFormData.dateOfBirth.split('/');
                                                        if (dateParts.length === 3) {
                                                            const month = parseInt(dateParts[0]) - 1;
                                                            const day = parseInt(dateParts[1]);
                                                            const year = parseInt(dateParts[2]);
                                                            setSelectedDate(new Date(year, month, day));
                                                        }
                                                    }
                                                    setIsDatePickerVisible(true);
                                                }}
                                            >
                                                <TextInput
                                                    style={styles.dateInput}
                                                    value={editFormData.dateOfBirth}
                                                    placeholder="MM/DD/YYYY"
                                                    placeholderTextColor={theme.colors.textSecondary}
                                                    editable={false}
                                                />
                                                <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>
                                                Person ID <Text style={styles.requiredStar}>*</Text>
                                            </Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="e.g., TLW001"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={editFormData.person_id}
                                                onChangeText={(text) => setEditFormData({ ...editFormData, person_id: text })}
                                            />
                                            <Text style={styles.formDescription}>Unique identifier for this camper</Text>
                                        </View>
                                    </View>

                                    {/* Row 3: Gender and Division */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Gender</Text>
                                            <TouchableOpacity
                                                ref={genderButtonRef}
                                                style={styles.formSelect}
                                                onLayout={(event) => {
                                                    const { x, y, width, height } = event.nativeEvent.layout;
                                                    // Measure position relative to window for accurate positioning
                                                    if (genderButtonRef.current) {
                                                        (genderButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                            setEditGenderButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                        });
                                                    }
                                                }}
                                                onPress={() => {
                                                    // Re-measure on press to get current position
                                                    if (genderButtonRef.current) {
                                                        (genderButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                            setEditGenderButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                            setShowEditGenderDropdown(true);
                                                        });
                                                    }
                                                }}
                                            >
                                                <Text style={[styles.formSelectText, !editFormData.gender && styles.formSelectPlaceholder]}>
                                                    {editFormData.gender || 'Select gender'}
                                                </Text>
                                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Division</Text>
                                            <TouchableOpacity
                                                ref={divisionButtonRef}
                                                style={styles.formSelect}
                                                onLayout={(event) => {
                                                    const { x, y, width, height } = event.nativeEvent.layout;
                                                    // Measure position relative to window for accurate positioning
                                                    if (divisionButtonRef.current) {
                                                        (divisionButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                            setEditDivisionButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                        });
                                                    }
                                                }}
                                                onPress={() => {
                                                    // Re-measure on press to get current position
                                                    if (divisionButtonRef.current) {
                                                        (divisionButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                            setEditDivisionButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                            setShowEditDivisionDropdown(true);
                                                        });
                                                    }
                                                }}
                                            >
                                                <Text style={[styles.formSelectText, !editFormData.division && styles.formSelectPlaceholder]}>
                                                    {editFormData.division || 'Select division'}
                                                </Text>
                                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Row 4: Bunk and Grade */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Bunk</Text>
                                            <TouchableOpacity
                                                ref={bunkButtonRef}
                                                style={styles.formSelect}
                                                onLayout={(event) => {
                                                    const { x, y, width, height } = event.nativeEvent.layout;
                                                    // Measure position relative to window for accurate positioning
                                                    if (bunkButtonRef.current) {
                                                        (bunkButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                            setEditBunkButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                        });
                                                    }
                                                }}
                                                onPress={() => {
                                                    // Re-measure on press to get current position
                                                    if (bunkButtonRef.current) {
                                                        (bunkButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                            setEditBunkButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                            setShowEditBunkDropdown(true);
                                                        });
                                                    }
                                                }}
                                            >
                                                <Text style={[styles.formSelectText, !editFormData.bunk && styles.formSelectPlaceholder]}>
                                                    {editFormData.bunk || 'Select bunk'}
                                                </Text>
                                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Grade</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="Grade"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={editFormData.grade}
                                                onChangeText={(text) => setEditFormData({ ...editFormData, grade: text })}
                                            />
                                        </View>
                                    </View>

                                    {/* Row 5: Group and Season */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Group</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="Group"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={editFormData.group}
                                                onChangeText={(text) => setEditFormData({ ...editFormData, group: text })}
                                            />
                                        </View>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Season (Year)</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="e.g., 2026"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={editFormData.season}
                                                onChangeText={(text) => setEditFormData({ ...editFormData, season: text })}
                                                maxLength={4}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>

                                    {/* Row 6: Assigned Leader (Full Width) */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldFull}>
                                            <Text style={styles.formLabel}>Assigned Leader</Text>
                                            <TouchableOpacity
                                                ref={leaderButtonRef}
                                                style={styles.formSelect}
                                                onLayout={(event) => {
                                                    const { x, y, width, height } = event.nativeEvent.layout;
                                                    // Measure position relative to window for accurate positioning
                                                    if (leaderButtonRef.current) {
                                                        (leaderButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                            setEditLeaderButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                        });
                                                    }
                                                }}
                                                onPress={() => {
                                                    // Re-measure on press to get current position
                                                    if (leaderButtonRef.current) {
                                                        (leaderButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                            setEditLeaderButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                            setShowEditLeaderDropdown(true);
                                                        });
                                                    }
                                                }}
                                            >
                                                <Text style={[styles.formSelectText, !editFormData.assignedLeader && styles.formSelectPlaceholder]}>
                                                    {editFormData.assignedLeader || 'Select a leader'}
                                                </Text>
                                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Row 7: Guardian Email and Phone */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Guardian Email</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="Guardian Email"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={editFormData.guardianEmail}
                                                onChangeText={(text) => setEditFormData({ ...editFormData, guardianEmail: text })}
                                                keyboardType="email-address"
                                            />
                                        </View>
                                        <View style={styles.formFieldHalf}>
                                            <Text style={styles.formLabel}>Guardian Phone</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="Guardian Phone"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={editFormData.guardianPhone}
                                                onChangeText={(text) => setEditFormData({ ...editFormData, guardianPhone: text })}
                                                keyboardType="phone-pad"
                                            />
                                        </View>
                                    </View>

                                    {/* Row 8: Emergency Contact (Full Width) */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldFull}>
                                            <Text style={styles.formLabel}>Emergency Contact</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="Emergency Contact"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={editFormData.emergencyContact}
                                                onChangeText={(text) => setEditFormData({ ...editFormData, emergencyContact: text })}
                                            />
                                        </View>
                                    </View>

                                    {/* RFID Wristband Section */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldFull}>
                                            <View style={styles.rfidSectionHeader}>
                                                <Ionicons name="radio" size={20} color={theme.colors.text} />
                                                <Text style={styles.rfidSectionTitle}>RFID Wristband</Text>
                                            </View>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="Scan wristband or enter RFID..."
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={editFormData.rfid}
                                                onChangeText={(text) => setEditFormData({ ...editFormData, rfid: text })}
                                            />
                                            <Text style={styles.formDescription}>
                                                Scan the camper's ISO 14443 Type A wristband for quick check-in across the portal
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Row 9: Allergies (Full Width Textarea) */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldFull}>
                                            <Text style={styles.formLabel}>Allergies</Text>
                                            <TextInput
                                                style={styles.formTextArea}
                                                placeholder="Allergies"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={editFormData.allergies}
                                                onChangeText={(text) => setEditFormData({ ...editFormData, allergies: text })}
                                                multiline
                                                numberOfLines={4}
                                                textAlignVertical="top"
                                            />
                                        </View>
                                    </View>

                                    {/* Row 10: Medical Notes (Full Width Textarea) */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldFull}>
                                            <Text style={styles.formLabel}>Medical Notes</Text>
                                            <TextInput
                                                style={styles.formTextArea}
                                                placeholder="Medical Notes"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={editFormData.medicalNotes}
                                                onChangeText={(text) => setEditFormData({ ...editFormData, medicalNotes: text })}
                                                multiline
                                                numberOfLines={4}
                                                textAlignVertical="top"
                                            />
                                        </View>
                                    </View>

                                    {/* Form Buttons */}
                                    <View style={styles.formButtons}>
                                        <TouchableOpacity
                                            style={styles.cancelButton}
                                            onPress={() => {
                                                setShowEditChildModal(false);
                                                setCamperToEdit(null);
                                            }}
                                        >
                                            <Text style={styles.cancelButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.submitButton}
                                            onPress={() => {
                                                // TODO: Implement Edit Child submission logic
                                                console.log('Edit Child Form Data:', editFormData);
                                                setShowEditChildModal(false);
                                                setCamperToEdit(null);
                                            }}
                                        >
                                            <Text style={styles.submitButtonText}>Save Changes</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Date Picker Modal for Edit Child */}
                <Modal
                    visible={isDatePickerVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setIsDatePickerVisible(false)}
                >
                    <Pressable style={styles.datePickerOverlay} onPress={() => setIsDatePickerVisible(false)}>
                        <View style={styles.datePickerContainer}>
                            {/* Header */}
                            <View style={styles.datePickerHeader}>
                                <Text style={styles.datePickerTitle}>Select Date</Text>
                                <TouchableOpacity onPress={() => setIsDatePickerVisible(false)}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Month Navigation */}
                            <View style={styles.datePickerMonthNav}>
                                <TouchableOpacity onPress={() => setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                                    <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                                <Text style={styles.datePickerMonthText}>
                                    {selectedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                                </Text>
                                <TouchableOpacity onPress={() => setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                                    <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Weekday Headers */}
                            <View style={styles.datePickerWeekdays}>
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <Text key={day} style={styles.datePickerWeekdayText}>{day}</Text>
                                ))}
                            </View>

                            {/* Day Grid */}
                            <View style={styles.datePickerDaysContainer}>
                                <ScrollView style={styles.datePickerDaysGrid} showsVerticalScrollIndicator={true}>
                                    {Array.from({ length: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay() }).map((_, i) => (
                                        <View key={`empty-${i}`} style={styles.datePickerDayEmpty} />
                                    ))}
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                                        const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
                                        const isSelected = selectedDate.getDate() === day;
                                        const isValid = day <= daysInMonth;
                                        return (
                                            <TouchableOpacity
                                                key={day}
                                                style={[
                                                    styles.datePickerDay,
                                                    isSelected && styles.datePickerDaySelected,
                                                    !isValid && styles.datePickerDayDisabled
                                                ]}
                                                onPress={() => {
                                                    if (isValid) {
                                                        const newDate = new Date(selectedDate);
                                                        newDate.setDate(day);
                                                        setSelectedDate(newDate);
                                                        setEditFormData({
                                                            ...editFormData,
                                                            dateOfBirth: newDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                                                        });
                                                        setIsDatePickerVisible(false);
                                                    }
                                                }}
                                                disabled={!isValid}
                                            >
                                                <Text style={[
                                                    styles.datePickerDayText,
                                                    isSelected && styles.datePickerDayTextSelected,
                                                    !isValid && styles.datePickerDayTextDisabled
                                                ]}>
                                                    {day}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        </View>
                    </Pressable>
                </Modal>

                {/* Gender Dropdown Modal for Edit Child */}
                <Modal
                    visible={showEditGenderDropdown}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowEditGenderDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheetOverlay}
                        onPress={() => setShowEditGenderDropdown(false)}
                    >
                        <Pressable
                            style={styles.bottomSheet}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <View style={styles.bottomSheetHeader}>
                                <Text style={styles.bottomSheetTitle}>Select Gender</Text>
                            </View>
                            <ScrollView
                                style={styles.bottomSheetScroll}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={false}
                            >
                                {['Male', 'Female'].map((gender) => (
                                    <TouchableOpacity
                                        key={gender}
                                        style={[
                                            styles.bottomSheetOption,
                                            editFormData.gender === gender && styles.bottomSheetOptionSelected
                                        ]}
                                        onPress={() => {
                                            setEditFormData({ ...editFormData, gender: gender });
                                            setShowEditGenderDropdown(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            editFormData.gender === gender && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {gender}
                                        </Text>
                                        {editFormData.gender === gender && (
                                            <Ionicons name="checkmark" size={18} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Bunk Dropdown Modal for Edit Child */}
                <Modal
                    visible={showEditBunkDropdown}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowEditBunkDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheetOverlay}
                        onPress={() => setShowEditBunkDropdown(false)}
                    >
                        <Pressable
                            style={styles.bottomSheet}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <View style={styles.bottomSheetHeader}>
                                <Text style={styles.bottomSheetTitle}>Select Bunk</Text>
                            </View>
                            <ScrollView
                                style={styles.bottomSheetScroll}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={false}
                            >
                                <TouchableOpacity
                                    style={[
                                        styles.bottomSheetOption,
                                        editFormData.bunk === 'No Bunk Assigned' && styles.bottomSheetOptionSelected
                                    ]}
                                    onPress={() => {
                                        setEditFormData({ ...editFormData, bunk: 'No Bunk Assigned' });
                                        setShowEditBunkDropdown(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.bottomSheetOptionText,
                                        editFormData.bunk === 'No Bunk Assigned' && styles.bottomSheetOptionTextSelected
                                    ]}>
                                        No Bunk Assigned
                                    </Text>
                                    {editFormData.bunk === 'No Bunk Assigned' && (
                                        <Ionicons name="checkmark" size={18} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Division Dropdown Modal for Edit Child */}
                <Modal
                    visible={showEditDivisionDropdown}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowEditDivisionDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheetOverlay}
                        onPress={() => setShowEditDivisionDropdown(false)}
                    >
                        <Pressable
                            style={styles.bottomSheet}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <View style={styles.bottomSheetHeader}>
                                <Text style={styles.bottomSheetTitle}>Select Division</Text>
                            </View>
                            <ScrollView
                                style={styles.bottomSheetScroll}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                            >
                                {DIVISIONS.filter(div => div !== 'All Divisions').map((division) => (
                                    <TouchableOpacity
                                        key={division}
                                        style={[
                                            styles.bottomSheetOption,
                                            editFormData.division === division && styles.bottomSheetOptionSelected
                                        ]}
                                        onPress={() => {
                                            setEditFormData({ ...editFormData, division: division });
                                            setShowEditDivisionDropdown(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            editFormData.division === division && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {division}
                                        </Text>
                                        {editFormData.division === division && (
                                            <Ionicons name="checkmark" size={18} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Assigned Leader Dropdown Modal for Edit Child */}
                <Modal
                    visible={showEditLeaderDropdown}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowEditLeaderDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheetOverlay}
                        onPress={() => setShowEditLeaderDropdown(false)}
                    >
                        <Pressable
                            style={styles.bottomSheet}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <View style={styles.bottomSheetHeader}>
                                <Text style={styles.bottomSheetTitle}>Select Assigned Leader</Text>
                            </View>
                            <ScrollView
                                style={styles.bottomSheetScroll}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                            >
                                {MOCK_LEADERS.map((leader) => {
                                    const leaderDisplay = `${leader.name} - ${leader.role}`;
                                    const isSelected = editFormData.assignedLeader === leaderDisplay;
                                    return (
                                        <TouchableOpacity
                                            key={leader.name}
                                            style={[
                                                styles.bottomSheetOption,
                                                isSelected && styles.bottomSheetOptionSelected
                                            ]}
                                            onPress={() => {
                                                setEditFormData({ ...editFormData, assignedLeader: leaderDisplay });
                                                setShowEditLeaderDropdown(false);
                                            }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={[
                                                    styles.bottomSheetOptionText,
                                                    isSelected && styles.bottomSheetOptionTextSelected
                                                ]}>
                                                    {leader.name}
                                                </Text>
                                                <Text style={[
                                                    styles.leaderRoleText,
                                                    isSelected && styles.leaderRoleTextSelected
                                                ]}>
                                                    {leader.role}
                                                </Text>
                                            </View>
                                            {isSelected && (
                                                <Ionicons name="checkmark" size={18} color={theme.colors.secondary} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>

                <Text style={styles.resultsText}>Showing {showingStart}-{showingEnd} of {totalCampers} campers</Text>

                {/* Camper Grid */}
                <View style={styles.grid}>
                    {currentCampers.map((camper, index) => (
                        <TouchableOpacity
                            key={startIndex + index}
                            activeOpacity={0.7}
                            onPress={() => {
                                navigation.navigate('CamperDetail', { camper });
                            }}
                        >
                            <StyledCard style={styles.camperCard}>
                                <View style={styles.cardTop}>
                                    <View style={styles.cardTopLeft}>
                                        <Text style={styles.camperName} numberOfLines={1} ellipsizeMode="tail">{camper.name}</Text>
                                        <Text style={styles.camperGrade}>{camper.grade || "N/A"}</Text>
                                    </View>
                                    <View style={styles.cardTopRight}>
                                        <TouchableOpacity
                                            style={styles.cardIconButton}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                setCamperToEdit(camper);
                                                // Pre-fill form with camper data
                                                setEditFormData({
                                                    name: (camper as any).name || '',
                                                    person_id: (camper as any).person_id || '12171924',
                                                    age: (camper as any).age || '',
                                                    dateOfBirth: (camper as any).dateOfBirth || '08/23/2010',
                                                    gender: (camper as any).gender || '',
                                                    division: (camper as any).division || camper.division || '',
                                                    bunk: (camper as any).bunk || '',
                                                    grade: (camper as any).grade || camper.grade || '',
                                                    group: (camper as any).group || '',
                                                    season: (camper as any).season || '2026',
                                                    assignedLeader: (camper as any).assignedLeader || '',
                                                    guardianEmail: (camper as any).guardianEmail || 'abbyw8135@icloud.com',
                                                    guardianPhone: (camper as any).guardianPhone || '5167880571',
                                                    emergencyContact: (camper as any).emergencyContact || '',
                                                    rfid: (camper as any).rfid || '',
                                                    allergies: (camper as any).allergies || '',
                                                    medicalNotes: (camper as any).medicalNotes || '',
                                                });
                                                setShowEditChildModal(true);
                                            }}
                                        >
                                            <Ionicons name="pencil-outline" size={18} color="#9ca3af" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.cardIconButton}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                setCamperToDelete(camper);
                                                setShowDeleteModal(true);
                                            }}
                                        >
                                            <Ionicons name="trash-outline" size={18} color="#9ca3af" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.cardFooter}>
                                    <Text style={styles.divisionText}>Division: {camper.division || "N/A"}</Text>
                                    <View style={styles.statusBadge}>
                                        <Text style={styles.statusText}>active</Text>
                                    </View>
                                </View>
                            </StyledCard>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Pagination */}
                {totalPages > 1 && (
                    <View style={styles.pagination}>
                        <TouchableOpacity
                            style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                            onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                        >
                            <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? theme.colors.textSecondary : theme.colors.text} />
                            <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
                                Previous
                            </Text>
                        </TouchableOpacity>

                        {getPageNumbers().map((page, idx) => {
                            if (page === 'ellipsis') {
                                return (
                                    <View key={`ellipsis-${idx}`} style={styles.paginationEllipsis}>
                                        <Text style={styles.paginationEllipsisText}>...</Text>
                                    </View>
                                );
                            }

                            const pageNum = page as number;
                            const isActive = currentPage === pageNum;

                            return (
                                <TouchableOpacity
                                    key={pageNum}
                                    style={[styles.paginationPageButton, isActive && styles.paginationPageButtonActive]}
                                    onPress={() => setCurrentPage(pageNum)}
                                >
                                    <Text style={[styles.paginationPageText, isActive && styles.paginationPageTextActive]}>
                                        {pageNum}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}

                        <TouchableOpacity
                            style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                            onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>
                                Next
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? theme.colors.textSecondary : theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView>
            {/* Floating Action Button (Chat) mock */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="chatbubble-ellipses" size={24} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

// Mock Data - matching screenshot (expanded to show pagination)
const mockCampers = [
    { name: 'Abby Weiss', grade: '11th', division: 'CIT Girls', guardianEmail: 'abbyw8135@icloud.com', guardianPhone: '5167880571', gender: 'Female' },
    { name: 'Adam Elliott', grade: '4th', division: 'Freshmen B Boys' },
    { name: 'Addison Brewer', grade: '6th', division: 'Sophomore Girls' },
    { name: 'Adrianna Gelb', grade: '11th', division: 'CIT Girls' },
    { name: 'Aiden Feld', grade: '4th', division: 'Freshmen B Boys' },
    { name: 'Aiden Leon', grade: '6th', division: 'Sophomore Boys' },
    { name: 'Aiden Weisz', grade: '4th', division: 'Freshmen B Boys' },
    { name: 'AJ Goldberg', grade: '4th', division: 'Freshmen B Boys' },
    { name: 'Alaia Khalili', grade: '4th', division: 'Freshmen B Girls' },
    { name: 'Alex Haboush', grade: '11th', division: 'CIT Boys' },
    { name: 'Alex Stumacher', grade: '5th', division: 'Cadet Boys' },
    { name: 'Alexa Alfred', grade: '9th', division: 'Super Senior Girls' },
    { name: 'Aloha Friedland', grade: '7th', division: 'Junior Girls' },
    { name: 'Alex Horowitz', grade: '8th', division: 'Senior Boys' },
    // Add more campers to demonstrate pagination (593 total as per screenshot)
    ...Array.from({ length: 579 }, (_, i) => ({
        name: `Camper ${i + 15}`,
        grade: `${(i % 12) + 1}th`,
        division: ['CIT Girls', 'Freshmen B Boys', 'Sophomore Girls', 'CIT Boys', 'Junior Girls', 'Senior Boys'][i % 6]
    }))
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: isSmallScreen ? 12 : theme.spacing.md, // Smaller padding on mobile
        paddingBottom: 80, // Space for FAB
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    headerTitle: {
        ...theme.typography.h2,
    },
    headerSection: {
        marginBottom: theme.spacing.lg,
    },
    headerTextContainer: {
        marginBottom: theme.spacing.md,
    },
    mainHeaderTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    headerSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.xs,
        minHeight: 40,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
    },
    scannerActiveButton: {
        backgroundColor: '#16a34a', // Green color
        borderColor: '#16a34a',
    },
    scannerActiveButtonText: {
        color: theme.colors.surface,
    },
    scannerContainer: {
        backgroundColor: '#dcfce7', // Light green background
        borderWidth: 1,
        borderColor: '#86efac', // Green border
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    scannerContent: {
        marginBottom: theme.spacing.sm,
    },
    scannerLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#166534', // Dark green text
        marginBottom: theme.spacing.xs,
    },
    scannerInputContainer: {
        flex: 1,
    },
    scannerInputRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        alignItems: 'center',
    },
    scannerInput: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: '#86efac',
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 16,
        color: theme.colors.text,
    },
    findCamperButton: {
        backgroundColor: '#16a34a',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    findCamperButtonDisabled: {
        backgroundColor: theme.colors.textSecondary,
        opacity: 0.5,
    },
    findCamperButtonText: {
        color: theme.colors.surface,
        fontSize: 14,
        fontWeight: '600',
    },
    scannerHelperText: {
        fontSize: 11,
        color: '#166534',
        marginTop: theme.spacing.xs,
    },
    addChildButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.xs,
        minHeight: 40,
    },
    addChildButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.surface,
    },
    filterRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    filterRow2: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 40,
    },
    searchInput: {
        flex: 1,
        marginLeft: theme.spacing.sm,
        outlineWidth: 0,
        outlineColor: 'transparent',
        fontSize: 14,
        color: theme.colors.text,
    },
    divisionFilterContainer: {
        flex: 1,
    },
    divisionFilter: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        height: 40,
        gap: theme.spacing.xs,
    },
    divisionFilterText: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    dropdownModalContainer: {
        position: 'absolute',
        alignSelf: 'flex-start',
    },
    dropdownModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxHeight: 400,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    dropdownScroll: {
        maxHeight: 400,
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dropdownItemSelected: {
        backgroundColor: theme.colors.secondary + '20',
    },
    dropdownItemText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    dropdownItemTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        height: 40,
        gap: theme.spacing.xs,
        flex: 1,
    },
    sortButtonText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    resultsText: {
        ...theme.typography.caption,
        marginBottom: theme.spacing.sm,
    },
    grid: {
        flexDirection: isSmallScreen ? 'column' : 'row', // Column on mobile, row on larger screens
        flexWrap: isSmallScreen ? 'nowrap' : 'wrap',
        width: '100%',
        gap: isSmallScreen ? 12 : 16,
    },
    camperCard: {
        width: isSmallScreen ? '100%' : (isMediumScreen ? '48%' : (isLargeScreen ? (SCREEN_WIDTH - 32 - 32) / 3 : '100%')), // Full width on mobile, responsive on larger screens
        padding: isSmallScreen ? 16 : 24, // Smaller padding on mobile
        marginBottom: 0, // Gap handles spacing
        backgroundColor: '#ffffff', // White background
        borderWidth: 1,
        borderColor: '#e5e7eb', // Light gray border
        borderRadius: 8, // Rounded corners
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: isSmallScreen ? 10 : 12, // Spacing between top and footer sections
    },
    cardTopLeft: {
        flex: 1,
        marginRight: isSmallScreen ? 6 : 8,
        paddingRight: isSmallScreen ? 6 : 8,
        minWidth: 0, // Allow text to shrink properly
    },
    cardTopRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: isSmallScreen ? 6 : 8,
        flexShrink: 0,
    },
    cardIconButton: {
        padding: isSmallScreen ? 3 : 4,
    },
    camperName: {
        fontWeight: '600', // font-semibold
        fontSize: isSmallScreen ? 16 : 18, // Slightly smaller on mobile
        color: '#374151', // dark gray
        marginBottom: 4, // space-y-1 equivalent (4px gap between name and grade)
        lineHeight: isSmallScreen ? 22 : 24,
    },
    camperGrade: {
        fontSize: isSmallScreen ? 13 : 14, // text-sm, slightly smaller on mobile
        color: '#6b7280', // text-muted-foreground
        marginBottom: 0,
        lineHeight: isSmallScreen ? 18 : 20,
    },
    divisionText: {
        fontSize: isSmallScreen ? 13 : 14, // text-sm, slightly smaller on mobile
        color: '#6b7280', // text-muted-foreground
        marginBottom: 0,
        lineHeight: isSmallScreen ? 18 : 20,
        flex: 1,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 0,
        flexWrap: 'wrap', // Allow wrapping on very small screens
    },
    leaderRoleText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    leaderRoleTextSelected: {
        color: theme.colors.secondary,
    },
    // Bottom Sheet Styles
    bottomSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        maxHeight: '50%',
        width: '100%',
    },
    largeBottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        maxHeight: '90%',
        width: '100%',
    },
    bottomSheetHeader: {
        marginBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingBottom: theme.spacing.sm,
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    bottomSheetScroll: {
        // No specific styles needed for now
    },
    bottomSheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    bottomSheetOptionText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    bottomSheetOptionTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    bottomSheetOptionSelected: {
        backgroundColor: theme.colors.secondary + '10',
    },

    statusBadge: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 0,
    },
    statusText: {
        color: '#166534',
        fontSize: 10,
        fontWeight: '700',
        lineHeight: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
    },
    pagination: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.md,
        gap: theme.spacing.xs,
    },
    paginationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    paginationButtonDisabled: {
        opacity: 0.5,
    },
    paginationButtonText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    paginationButtonTextDisabled: {
        color: theme.colors.textSecondary,
    },
    paginationPageButton: {
        minWidth: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.borderRadius.md,
        backgroundColor: 'transparent',
    },
    paginationPageButtonActive: {
        backgroundColor: theme.colors.secondary,
    },
    paginationPageText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    paginationPageTextActive: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    paginationEllipsis: {
        minWidth: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    paginationEllipsisText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    assignWristbandsModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '90%',
        maxWidth: 600,
        maxHeight: '80%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        alignSelf: 'center',
        marginTop: '10%',
    },
    assignWristbandsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    assignWristbandsTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    assignWristbandsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    assignWristbandsTabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    assignWristbandsTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xs,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    assignWristbandsTabActive: {
        borderBottomColor: theme.colors.secondary,
    },
    assignWristbandsTabText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    assignWristbandsTabTextActive: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    assignWristbandsContent: {
        maxHeight: 400,
    },
    individualTabContent: {
        padding: theme.spacing.lg,
        gap: theme.spacing.lg,
    },
    searchCamperSection: {
        gap: theme.spacing.sm,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    searchCamperRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    searchCamperInput: {
        flex: 1,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
    },
    searchButton: {
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
    },
    searchButtonText: {
        color: theme.colors.surface,
        fontSize: 14,
        fontWeight: '600',
    },
    searchResultsContainer: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.sm,
    },
    searchResultItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    searchResultText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    selectedCamperSection: {
        backgroundColor: '#dcfce7',
        borderWidth: 1,
        borderColor: '#86efac',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        gap: theme.spacing.md,
    },
    selectedCamperHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectedCamperName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    selectedCamperInfo: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    rfidInputSection: {
        gap: theme.spacing.sm,
    },
    rfidInputRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    rfidInputField: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: '#86efac',
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
    },
    assignButton: {
        backgroundColor: '#16a34a',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
    },
    assignButtonDisabled: {
        backgroundColor: theme.colors.textSecondary,
        opacity: 0.5,
    },
    assignButtonText: {
        color: theme.colors.surface,
        fontSize: 14,
        fontWeight: '600',
    },
    bulkTabContent: {
        padding: theme.spacing.lg,
    },
    bulkSection: {
        gap: theme.spacing.md,
    },
    bulkFormatText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    fileInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
    },
    fileInputText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    fileInputPlaceholder: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    csvTextArea: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        minHeight: 200,
        fontSize: 12,
        fontFamily: 'monospace',
        color: theme.colors.text,
    },
    bulkAssignButton: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    bulkAssignButtonDisabled: {
        backgroundColor: theme.colors.textSecondary,
        opacity: 0.5,
    },
    bulkAssignButtonText: {
        color: theme.colors.surface,
        fontSize: 14,
        fontWeight: '600',
    },
    addChildModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: isSmallScreen ? '95%' : '90%',
        maxWidth: 700,
        maxHeight: '90%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        alignSelf: 'center',
        marginTop: isSmallScreen ? '2%' : '5%',
    },
    addChildModalScroll: {
        maxHeight: '90%',
    },
    addChildModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    addChildModalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: theme.colors.text,
    },
    requiredFieldsNote: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        paddingHorizontal: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
    },
    requiredStar: {
        color: '#ef4444',
    },
    addChildForm: {
        padding: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
        gap: theme.spacing.md,
    },
    formRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    formFieldHalf: {
        flex: 1,
        minWidth: isSmallScreen ? '100%' : '45%',
    },
    formFieldFull: {
        width: '100%',
    },
    formLabel: {
        fontSize: isSmallScreen ? 13 : 14,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    formInput: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: isSmallScreen ? 13 : 14,
        color: theme.colors.text,
        minHeight: 40,
    },
    formSelect: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    formSelectText: {
        fontSize: isSmallScreen ? 13 : 14,
        color: theme.colors.text,
    },
    formSelectPlaceholder: {
        color: theme.colors.textSecondary,
    },
    formDescription: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    formTextArea: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: isSmallScreen ? 13 : 14,
        color: theme.colors.text,
        minHeight: 100,
    },
    formButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: isSmallScreen ? theme.spacing.sm : theme.spacing.md,
        marginTop: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        flexWrap: 'wrap',
    },
    cancelButton: {
        paddingHorizontal: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#fb923c', // Orange color
        minWidth: isSmallScreen ? '45%' : 'auto',
    },
    cancelButtonText: {
        color: theme.colors.surface,
        fontSize: isSmallScreen ? 13 : 14,
        fontWeight: '600',
    },
    submitButton: {
        paddingHorizontal: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
        minWidth: isSmallScreen ? '45%' : 'auto',
    },
    submitButtonText: {
        color: theme.colors.surface,
        fontSize: isSmallScreen ? 13 : 14,
        fontWeight: '600',
    },
    deleteModalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '85%',
        maxWidth: 400,
        padding: theme.spacing.xl,
        alignSelf: 'center',
        marginTop: '30%',
        ...theme.shadows.card,
        elevation: 10,
    },
    deleteModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    deleteModalMessage: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        lineHeight: 20,
    },
    deleteModalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.md,
    },
    deleteCancelButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minWidth: 80,
        alignItems: 'center',
    },
    deleteCancelButtonText: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    deleteConfirmButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
        minWidth: 80,
        alignItems: 'center',
    },
    deleteConfirmButtonText: {
        color: theme.colors.surface,
        fontSize: 14,
        fontWeight: '600',
    },
    datePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    datePickerContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '85%',
        maxWidth: 400,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    datePickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    datePickerMonthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    datePickerMonthText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    datePickerWeekdays: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    datePickerWeekdayText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        width: 40,
        textAlign: 'center',
    },
    datePickerDaysContainer: {
        maxHeight: 300,
    },
    datePickerDaysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: theme.spacing.sm,
    },
    datePickerDayEmpty: {
        width: 40,
        height: 40,
        margin: 2,
    },
    datePickerDay: {
        width: 40,
        height: 40,
        margin: 2,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    datePickerDaySelected: {
        backgroundColor: theme.colors.secondary,
    },
    datePickerDayDisabled: {
        opacity: 0.3,
    },
    datePickerDayText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    datePickerDayTextSelected: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    datePickerDayTextDisabled: {
        color: theme.colors.textSecondary,
    },
    dateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        minHeight: 40,
    },
    dateInput: {
        flex: 1,
        fontSize: isSmallScreen ? 13 : 14,
        color: theme.colors.text,
        paddingVertical: theme.spacing.sm,
    },
    rfidSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    rfidSectionTitle: {
        fontSize: isSmallScreen ? 13 : 14,
        fontWeight: '500',
        color: theme.colors.text,
    },
    genderDropdownItemSelected: {
        backgroundColor: '#fb923c', // Orange color
    },
    genderDropdownItemTextSelected: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    leaderItemContent: {
        flex: 1,
    },
    leaderRoleText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    leaderRoleTextSelected: {
        color: theme.colors.surface,
        opacity: 0.9,
    },
});
