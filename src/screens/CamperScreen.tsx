import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, Dimensions, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useCompany } from '../contexts/CompanyContext';
import { useCampers, useAddCamper, useEditCamper, useDivisions } from '../api/campers';
import { useRole } from '../hooks/useRole';
import { useStaff } from '../api/staff';
import { supabase } from '../lib/supabase';
import { showAppAlert } from '../utils/showAppAlert';

type BulkAssignRowResult = {
    name: string;
    rfid: string;
    status: 'success' | 'error' | 'not_found';
    message: string;
};

/** Normalize scanner / manual RFID input (trailing newlines from Bluetooth wedge). */
function normalizeRfidInput(raw: string): string {
    return raw.replace(/\u0000/g, '').trim().replace(/\r\n/g, '').replace(/\n/g, '').replace(/\r/g, '');
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 600; // Mobile: full width cards
const isMediumScreen = SCREEN_WIDTH >= 600 && SCREEN_WIDTH < 1024; // Tablet: 2 columns
const isLargeScreen = SCREEN_WIDTH >= 1024; // Desktop: 3 columns

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
    const { companyId, season } = useCompany();
    const queryClient = useQueryClient();
    const { data: campersData = [], isLoading, isError } = useCampers(companyId, season);
    const { data: roleData } = useRole();
    const isAdmin = roleData?.isAdmin || false;

    const { data: divisionsData = [] } = useDivisions(companyId);

    const addCamperMutation = useAddCamper();
    const editCamperMutation = useEditCamper();

    // Fetch staff for the "Assigned Leader" dropdown (replaces old MOCK_LEADERS)
    const { data: staffList = [] } = useStaff(companyId, season);

    const tshirtSizeOptions = [
        { label: 'Not Specified', value: '' },
        { label: 'Youth S', value: 'Youth S' },
        { label: 'Youth M', value: 'Youth M' },
        { label: 'Youth L', value: 'Youth L' },
        { label: 'Youth XL', value: 'Youth XL' },
        { label: 'Adult XS', value: 'Adult XS' },
        { label: 'Adult S', value: 'Adult S' },
        { label: 'Adult M', value: 'Adult M' },
        { label: 'Adult L', value: 'Adult L' },
        { label: 'Adult XL', value: 'Adult XL' },
        { label: 'Adult 2XL', value: 'Adult 2XL' },
        { label: 'Adult 3XL', value: 'Adult 3XL' },
    ];

    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDivisionId, setSelectedDivisionId] = useState<string>('all');
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
    const [assignSearchLoading, setAssignSearchLoading] = useState(false);
    const [assignIndividualLoading, setAssignIndividualLoading] = useState(false);
    const [bulkAssignLoading, setBulkAssignLoading] = useState(false);
    const [bulkAssignResults, setBulkAssignResults] = useState<BulkAssignRowResult[]>([]);
    const [pickedCsvLabel, setPickedCsvLabel] = useState('');
    const individualRfidInputRef = useRef<TextInput>(null);
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
    const [searchQuery, setSearchQuery] = useState('');
    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirmDelete = async () => {
        if (!itemToDelete?.id) return;
        setIsDeleting(true);
        console.log('[DELETE] Starting delete for:', itemToDelete.id);
        try {
            const { error, status, statusText } = await supabase.from('children').delete().eq('id', itemToDelete.id);
            console.log('[DELETE] Response:', { error, status, statusText });
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['campers'] });
            Alert.alert('Success', 'Camper deleted');
        } catch (err: any) {
            console.error('[DELETE] Error:', err);
            Alert.alert('Delete failed', err.message || 'Unknown error');
        } finally {
            setIsDeleting(false);
            setIsDeleteConfirmVisible(false);
            setItemToDelete(null);
        }
    };
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
    const [showEditTshirtSizeDropdown, setShowEditTshirtSizeDropdown] = useState(false);
    const closeAddChildTransientUi = () => {
        setShowAddGenderDropdown(false);
        setShowAddDivisionDropdown(false);
        setShowAddLeaderDropdown(false);
    };
    const closeEditChildTransientUi = () => {
        setShowEditGenderDropdown(false);
        setShowEditBunkDropdown(false);
        setShowEditDivisionDropdown(false);
        setShowEditLeaderDropdown(false);
        setShowEditTshirtSizeDropdown(false);
        setIsDatePickerVisible(false);
    };
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
        assignedLeaderId: '' as string,
        tshirtSize: '',
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
        assignedLeaderId: '' as string,
        tshirtSize: '',
        birthdayPartyType: '',
        birthdayPartyComments: '',
        birthdayCakeMeal: '',
        birthdayCakeType: '',
        birthdayFrostingColors: [] as string[],
        birthdayToppings: [] as string[],
        birthdayCakeAllergies: [] as string[],
        birthdayCakeMessage: '',
        guardianEmail: '',
        guardianPhone: '',
        emergencyContact: '',
        rfid: '',
        allergies: '',
        medicalNotes: '',
    });
    const campersPerPage = 50;

    const selectedDivisionLabel = useMemo(() => {
        if (selectedDivisionId === 'all') return 'All Divisions';
        const match = divisionsData.find((d: any) => String(d?.id) === String(selectedDivisionId));
        return match?.name ?? 'All Divisions';
    }, [divisionsData, selectedDivisionId]);

    const filteredCampers = useMemo(() => {
        const q = (searchQuery || '').trim().toLowerCase();
        return campersData.filter(camper => {
            if (selectedDivisionId !== 'all' && String((camper as any).division_id ?? (camper as any).division?.id ?? '') !== String(selectedDivisionId)) return false;
            if (q) {
                const name = (camper.name || '').toLowerCase();
                const grade = ((camper as any).grade ?? '').toString().toLowerCase();
                const divName = (((camper as any).division?.name ?? '') as string).toLowerCase();
                if (!name.includes(q) && !grade.includes(q) && !divName.includes(q)) return false;
            }
            return true;
        }).sort((a, b) => {
            if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
            return (((a as any).division?.name || '') as string).localeCompare(((b as any).division?.name || '') as string);
        });
    }, [campersData, selectedDivisionId, sortBy, searchQuery]);

    const totalCampers = filteredCampers.length;
    const totalPages = Math.ceil(totalCampers / campersPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedDivisionId, sortBy, season]);

    useEffect(() => {
        if (totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    // Keep scanner input focused when in scanner mode (matches web Roster “tap if focus lost”)
    useEffect(() => {
        if (scannerMode && rfidInputRef.current) {
            setTimeout(() => rfidInputRef.current?.focus(), 100);
        }
    }, [scannerMode]);

    useEffect(() => {
        if (!scannerMode || isScanning) return;
        const t = setInterval(() => {
            rfidInputRef.current?.focus();
        }, 500);
        return () => clearInterval(t);
    }, [scannerMode, isScanning]);

    useEffect(() => {
        if (!showAssignWristbandsModal) {
            setSearchCamperName('');
            setSearchResults([]);
            setSelectedCamper(null);
            setIndividualRfid('');
            setBulkAssignResults([]);
            setPickedCsvLabel('');
            setAssignSearchLoading(false);
            setAssignIndividualLoading(false);
            setBulkAssignLoading(false);
        }
    }, [showAssignWristbandsModal]);

    useEffect(() => {
        if (selectedCamper && showAssignWristbandsModal) {
            setTimeout(() => individualRfidInputRef.current?.focus(), 120);
        }
    }, [selectedCamper, showAssignWristbandsModal]);

    const toggleScannerMode = () => {
        const newMode = !scannerMode;
        setScannerMode(newMode);
        if (!newMode) {
            setRfidInput('');
        }
    };

    /** Find camper by wristband ID → open profile (same as lovable-web-app Roster.handleRfidScan). */
    const handleRfidScan = async () => {
        const valueToScan = normalizeRfidInput(rfidInput);
        if (!valueToScan) {
            showAppAlert('Wristband', 'Please scan a wristband or enter an RFID.');
            return;
        }
        if (!companyId || !season) {
            showAppAlert('Wristband', 'Company or season is not available.');
            return;
        }

        setIsScanning(true);
        try {
            const { data: rfidRows, error } = await supabase
                .from('children')
                .select('id, name, rfid')
                .eq('rfid', valueToScan)
                .eq('company_id', companyId)
                .eq('season', season)
                .limit(1);

            const child = rfidRows?.[0];

            if (error || !child) {
                const short = valueToScan.length > 18 ? `${valueToScan.slice(0, 18)}…` : valueToScan;
                showAppAlert(
                    'Wristband not found',
                    `No camper in this season is assigned wristband ID:\n${short}`
                );
                setRfidInput('');
                setTimeout(() => rfidInputRef.current?.focus(), 150);
                return;
            }

            setRfidInput('');
            navigation.navigate('CamperDetail', { camper: { id: child.id, name: child.name } });
        } catch (e: any) {
            showAppAlert('Error', e?.message || 'Could not look up wristband.');
        } finally {
            setIsScanning(false);
            setTimeout(() => rfidInputRef.current?.focus(), 150);
        }
    };

    /** Server-side search (matches BulkRfidAssignmentDialog.handleSearch). No division embed — avoids join/RLS errors. */
    const handleAssignModalSearch = async () => {
        const qRaw = searchCamperName.trim();
        if (!qRaw) {
            showAppAlert('Search', 'Enter a camper name.');
            return;
        }
        if (!companyId) {
            showAppAlert('Search', 'Company is not loaded. Try again in a moment.');
            return;
        }
        if (!season) {
            showAppAlert('Search', 'Season is not set.');
            return;
        }

        const qSafe = qRaw.replace(/[%_\\]/g, '').trim();
        if (!qSafe) {
            showAppAlert('Search', 'Use letters or numbers in the name search.');
            return;
        }

        setAssignSearchLoading(true);
        try {
            const { data, error } = await supabase
                .from('children')
                .select('id, name, rfid, division_id, company_id')
                .eq('company_id', companyId)
                .eq('season', season)
                .ilike('name', `%${qSafe}%`)
                .order('name')
                .limit(25);

            if (error) throw error;

            const serverRows = data || [];
            const seen = new Set(serverRows.map((r: any) => r.id));
            const qLower = qRaw.toLowerCase();
            const merged: any[] = [...serverRows];

            for (const c of campersData) {
                if (seen.has(c.id)) continue;
                if ((c.name || '').toLowerCase().includes(qLower)) {
                    merged.push({
                        id: c.id,
                        name: c.name,
                        rfid: (c as any).rfid ?? null,
                        division_id: (c as any).division_id ?? (c as any).division?.id ?? null,
                        company_id: (c as any).company_id,
                        division: (c as any).division,
                    });
                    seen.add(c.id);
                }
            }

            const enrich = (row: any) => {
                if (row.division) return row;
                const fromList = campersData.find((c: any) => c.id === row.id);
                return { ...row, division: fromList?.division ?? null };
            };

            setSearchResults(merged.slice(0, 25).map(enrich));
            if (!merged.length) {
                showAppAlert('Search', 'No campers match that name for this season.');
            }
        } catch (e: any) {
            showAppAlert('Search failed', e?.message || 'Unknown error');
            setSearchResults([]);
        } finally {
            setAssignSearchLoading(false);
        }
    };

    /** Assign RFID to selected camper; overwrites profile and clears same ID from others (safe move). */
    const handleAssignIndividualRfid = async () => {
        const rfid = normalizeRfidInput(individualRfid);
        if (!selectedCamper?.id || !rfid || !companyId || !season) {
            showAppAlert('Assign wristband', 'Select a camper and scan or enter a wristband ID.');
            return;
        }
        if (selectedCamper.company_id != null && selectedCamper.company_id !== companyId) {
            showAppAlert(
                'Assign wristband',
                'This camper does not belong to the current company. Close the modal, confirm the camp switcher, and search again.'
            );
            return;
        }

        setAssignIndividualLoading(true);
        try {
            const { error: clearErr } = await supabase
                .from('children')
                .update({ rfid: null })
                .eq('company_id', companyId)
                .eq('season', season)
                .eq('rfid', rfid)
                .neq('id', selectedCamper.id);
            if (clearErr) {
                console.warn('[RFID assign] clear duplicate:', clearErr.message);
            }

            // Do not use .single() here — PostgREST returns 406 if zero rows are returned (e.g. RLS hides RETURNING).
            const { data: updatedRows, error } = await supabase
                .from('children')
                .update({ rfid })
                .eq('id', selectedCamper.id)
                .select('id, rfid');

            if (error) throw error;
            let updated = updatedRows?.[0];
            // Some RLS setups allow UPDATE but return no rows from RETURNING; re-read to verify.
            if (!updated) {
                const { data: reread, error: readErr } = await supabase
                    .from('children')
                    .select('id, rfid')
                    .eq('id', selectedCamper.id)
                    .maybeSingle();
                if (!readErr && reread) {
                    updated = reread;
                }
            }
            if (!updated || normalizeRfidInput(String(updated.rfid ?? '')) !== rfid) {
                throw new Error(
                    'Update did not apply. Your role may need permission to edit campers — apply the latest Supabase migration (children UPDATE for can_access_child).'
                );
            }

            await queryClient.invalidateQueries({ queryKey: ['campers', companyId, season] });
            await queryClient.invalidateQueries({ queryKey: ['child', selectedCamper.id] });

            showAppAlert('Success', `Wristband assigned to ${selectedCamper.name}.`);
            setIndividualRfid('');
            setSelectedCamper(null);
            setShowAssignWristbandsModal(false);
        } catch (e: any) {
            showAppAlert('Assign failed', e?.message || 'Could not save wristband.');
        } finally {
            setAssignIndividualLoading(false);
        }
    };

    const pickCsvForBulk = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'text/plain', 'application/vnd.ms-excel'],
                copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets?.[0]) return;
            const asset = result.assets[0];
            setPickedCsvLabel(asset.name || 'File loaded');
            const res = await fetch(asset.uri);
            const text = await res.text();
            const lines = text.split(/\n/);
            const first = (lines[0] || '').toLowerCase();
            if (first.includes('name') || first.includes('rfid') || first.includes('person')) {
                setCsvData(lines.slice(1).join('\n'));
            } else {
                setCsvData(text);
            }
        } catch (_) {
            showAppAlert('File', 'Could not read the selected file.');
        }
    };

    /** Bulk assign (matches BulkRfidAssignmentDialog.handleBulkUpload). */
    const handleBulkAssignRfid = async () => {
        if (!csvData.trim() || !companyId || !season) {
            showAppAlert('Bulk assign', 'Paste CSV rows or choose a file.');
            return;
        }

        setBulkAssignLoading(true);
        setBulkAssignResults([]);
        const newResults: BulkAssignRowResult[] = [];

        try {
            const lines = csvData.trim().split('\n');
            for (const line of lines) {
                const parts = line.split(',').map((p) => p.trim());
                if (parts.length < 2) continue;
                const [identifier, rfidValRaw] = parts;
                if (!identifier || !rfidValRaw) continue;
                const rfidVal = normalizeRfidInput(rfidValRaw);
                if (!rfidVal) continue;

                let query = supabase
                    .from('children')
                    .select('id, name')
                    .eq('company_id', companyId)
                    .eq('season', season);

                const isPersonId = /^[0-9a-f-]+$/i.test(identifier) && identifier.length > 5;
                if (isPersonId) {
                    query = query.eq('person_id', identifier);
                } else {
                    query = query.ilike('name', identifier);
                }

                const { data: foundRows, error } = await query.limit(1);
                const data = foundRows?.[0];

                if (error || !data) {
                    newResults.push({
                        name: identifier,
                        rfid: rfidVal,
                        status: 'not_found',
                        message: 'Camper not found',
                    });
                    continue;
                }

                await supabase
                    .from('children')
                    .update({ rfid: null })
                    .eq('company_id', companyId)
                    .eq('season', season)
                    .eq('rfid', rfidVal)
                    .neq('id', data.id);

                const { data: updatedRows, error: updateError } = await supabase
                    .from('children')
                    .update({ rfid: rfidVal })
                    .eq('id', data.id)
                    .select('id, rfid');

                const updatedRow = updatedRows?.[0];
                if (updateError || !updatedRow || normalizeRfidInput(String(updatedRow.rfid ?? '')) !== rfidVal) {
                    newResults.push({
                        name: data.name,
                        rfid: rfidVal,
                        status: 'error',
                        message: updateError?.message || 'Update blocked or did not apply',
                    });
                } else {
                    newResults.push({
                        name: data.name,
                        rfid: rfidVal,
                        status: 'success',
                        message: 'Wristband assigned',
                    });
                }
            }

            setBulkAssignResults(newResults);
            const ok = newResults.filter((r) => r.status === 'success').length;
            const bad = newResults.length - ok;
            await queryClient.invalidateQueries({ queryKey: ['campers', companyId, season] });

            if (ok > 0) {
                showAppAlert(
                    'Bulk assign',
                    bad > 0 ? `Assigned ${ok} wristband(s). ${bad} row(s) failed or were not found.` : `Assigned ${ok} wristband(s).`
                );
            } else if (newResults.length > 0) {
                showAppAlert('Bulk assign', 'No wristbands were assigned. Check names, person IDs, and format.');
            }
        } catch (e: any) {
            showAppAlert('Bulk assign failed', e?.message || 'Unknown error');
        } finally {
            setBulkAssignLoading(false);
        }
    };

    // Calculate pagination
    const startIndex = (currentPage - 1) * campersPerPage;
    const endIndex = startIndex + campersPerPage;
    const currentCampers = filteredCampers.slice(startIndex, endIndex);
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
                            onPress={() => {
                                closeAddChildTransientUi();
                                setShowAddChildModal(true);
                            }}
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
                                        blurOnSubmit={false}
                                        returnKeyType="search"
                                        onSubmitEditing={() => {
                                            void handleRfidScan();
                                        }}
                                    />
                                    <TouchableOpacity
                                        style={[styles.findCamperButton, (!rfidInput.trim() || isScanning) && styles.findCamperButtonDisabled]}
                                        onPress={() => {
                                            void handleRfidScan();
                                        }}
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
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.loadingText}>Loading campers...</Text>
                    </View>
                ) : isError ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.danger} />
                        <Text style={styles.errorText}>Failed to load campers. Pull to retry or check connection.</Text>
                    </View>
                ) : null}

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
                            <Text style={styles.divisionFilterText}>{selectedDivisionLabel}</Text>
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
                    presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
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
                                {[{ id: 'all', name: 'All Divisions' }, ...divisionsData].map((division: any) => (
                                    <TouchableOpacity
                                        key={division.id}
                                        style={[
                                            styles.bottomSheetOption,
                                            selectedDivisionId === division.id && styles.bottomSheetOptionSelected
                                        ]}
                                        onPress={() => {
                                            setSelectedDivisionId(division.id);
                                            setShowDivisionDropdown(false);
                                        }}
                                    >
                                        <Ionicons
                                            name="people-outline"
                                            size={24}
                                            color={selectedDivisionId === division.id ? theme.colors.secondary : theme.colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            selectedDivisionId === division.id && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {division.name}
                                        </Text>
                                        {selectedDivisionId === division.id && (
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
                            onPress={(e) => {
                                e.stopPropagation();
                                (e as any).nativeEvent?.stopImmediatePropagation?.();
                            }}
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
                                                    returnKeyType="search"
                                                    onSubmitEditing={() => {
                                                        void handleAssignModalSearch();
                                                    }}
                                                />
                                                <TouchableOpacity
                                                    style={[styles.searchButton, assignSearchLoading && { opacity: 0.7 }]}
                                                    onPress={() => {
                                                        void handleAssignModalSearch();
                                                    }}
                                                    disabled={assignSearchLoading}
                                                >
                                                    {assignSearchLoading ? (
                                                        <ActivityIndicator color="#fff" size="small" />
                                                    ) : (
                                                        <Text style={styles.searchButtonText}>Search</Text>
                                                    )}
                                                </TouchableOpacity>
                                            </View>

                                            {/* Search Results */}
                                            {searchResults.length > 0 && (
                                                <View style={styles.searchResultsContainer}>
                                                    {searchResults.map((camper: any) => (
                                                        <TouchableOpacity
                                                            key={camper.id}
                                                            style={styles.searchResultItem}
                                                            onPress={() => {
                                                                setSelectedCamper(camper);
                                                                setSearchResults([]);
                                                                setSearchCamperName('');
                                                            }}
                                                        >
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.searchResultText}>{camper.name}</Text>
                                                                <Text style={styles.searchResultSubtext}>
                                                                    {(camper.division as any)?.name || 'No division'}
                                                                </Text>
                                                            </View>
                                                            <View
                                                                style={[
                                                                    styles.rfidStatusPill,
                                                                    camper.rfid ? styles.rfidStatusPillHas : styles.rfidStatusPillNone,
                                                                ]}
                                                            >
                                                                <Text
                                                                    style={[
                                                                        styles.rfidStatusPillText,
                                                                        camper.rfid ? styles.rfidStatusPillTextHas : styles.rfidStatusPillTextNone,
                                                                    ]}
                                                                >
                                                                    {camper.rfid ? 'Has RFID' : 'No RFID'}
                                                                </Text>
                                                            </View>
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
                                                        <Text style={styles.selectedCamperInfo}>
                                                            {selectedCamper.division?.name || 'No Division'}
                                                        </Text>
                                                        {selectedCamper.rfid ? (
                                                            <Text style={styles.currentRfidHint}>
                                                                Current RFID: {selectedCamper.rfid}
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                    <TouchableOpacity onPress={() => setSelectedCamper(null)}>
                                                        <Ionicons name="close-circle" size={24} color={theme.colors.textSecondary} />
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={styles.rfidInputSection}>
                                                    <Text style={styles.sectionLabel}>2. Scan Wristband (ISO 14443 Type A)</Text>
                                                    <View style={styles.rfidInputRow}>
                                                        <TextInput
                                                            ref={individualRfidInputRef}
                                                            style={styles.rfidInputField}
                                                            placeholder="Scan wristband..."
                                                            placeholderTextColor={theme.colors.textSecondary}
                                                            value={individualRfid}
                                                            onChangeText={setIndividualRfid}
                                                            blurOnSubmit={false}
                                                            returnKeyType="done"
                                                            onSubmitEditing={() => {
                                                                void handleAssignIndividualRfid();
                                                            }}
                                                        />
                                                        <Pressable
                                                            style={({ pressed }) => [
                                                                styles.assignButton,
                                                                (!individualRfid.trim() || assignIndividualLoading) && styles.assignButtonDisabled,
                                                                pressed && !assignIndividualLoading && individualRfid.trim() ? { opacity: 0.88 } : null,
                                                            ]}
                                                            disabled={!individualRfid.trim() || assignIndividualLoading}
                                                            onPress={(e) => {
                                                                e.stopPropagation();
                                                                void handleAssignIndividualRfid();
                                                            }}
                                                        >
                                                            {assignIndividualLoading ? (
                                                                <ActivityIndicator color="#fff" size="small" />
                                                            ) : (
                                                                <Text style={styles.assignButtonText}>Assign</Text>
                                                            )}
                                                        </Pressable>
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
                                            <TouchableOpacity style={styles.fileInputContainer} onPress={() => void pickCsvForBulk()}>
                                                <Text style={styles.fileInputText}>Choose file</Text>
                                                <Text style={styles.fileInputPlaceholder} numberOfLines={1}>
                                                    {pickedCsvLabel || 'No file chosen'}
                                                </Text>
                                            </TouchableOpacity>
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
                                                style={[
                                                    styles.bulkAssignButton,
                                                    (!csvData.trim() || bulkAssignLoading) && styles.bulkAssignButtonDisabled,
                                                ]}
                                                disabled={!csvData.trim() || bulkAssignLoading}
                                                onPress={() => {
                                                    void handleBulkAssignRfid();
                                                }}
                                            >
                                                {bulkAssignLoading ? (
                                                    <ActivityIndicator color="#fff" />
                                                ) : (
                                                    <Text style={styles.bulkAssignButtonText}>
                                                        Assign Wristbands ({csvData.trim().split('\n').filter((l) => l.trim()).length} rows)
                                                    </Text>
                                                )}
                                            </TouchableOpacity>

                                            {bulkAssignResults.length > 0 && (
                                                <View style={styles.bulkResultsBox}>
                                                    <Text style={styles.bulkResultsTitle}>Results</Text>
                                                    <ScrollView style={styles.bulkResultsScroll} nestedScrollEnabled>
                                                        {bulkAssignResults.map((row, idx) => (
                                                            <View key={`${row.name}-${idx}`} style={styles.bulkResultRow}>
                                                                <Ionicons
                                                                    name={
                                                                        row.status === 'success'
                                                                            ? 'checkmark-circle'
                                                                            : row.status === 'not_found'
                                                                              ? 'alert-circle-outline'
                                                                              : 'close-circle'
                                                                    }
                                                                    size={18}
                                                                    color={
                                                                        row.status === 'success'
                                                                            ? theme.colors.success
                                                                            : row.status === 'not_found'
                                                                              ? theme.colors.warning
                                                                              : theme.colors.danger
                                                                    }
                                                                />
                                                                <Text style={styles.bulkResultName} numberOfLines={1}>
                                                                    {row.name}
                                                                </Text>
                                                                <Text style={styles.bulkResultMsg} numberOfLines={1}>
                                                                    {row.message}
                                                                </Text>
                                                            </View>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            )}
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
                    presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => {
                        closeAddChildTransientUi();
                        setShowAddChildModal(false);
                    }}
                >
                    <Pressable
                        style={styles.centeredOverlay}
                        onPress={() => {
                            closeAddChildTransientUi();
                            setShowAddChildModal(false);
                        }}
                    >
                        <Pressable
                            style={styles.addChildModal}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <ScrollView
                                style={styles.addChildModalScroll}
                                showsVerticalScrollIndicator={true}
                                nestedScrollEnabled={true}
                                keyboardShouldPersistTaps="always"
                            >
                                {/* Modal Header */}
                                <View style={styles.addChildModalHeader}>
                                    <Text style={styles.addChildModalTitle}>Add New Child</Text>
                                    <TouchableOpacity onPress={() => {
                                        closeAddChildTransientUi();
                                        setShowAddChildModal(false);
                                    }}>
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
                                                    setShowAddGenderDropdown(true);
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
                                                    setShowAddDivisionDropdown(true);
                                                }}
                                            >
                                                <Text style={[styles.formSelectText, !formData.division && styles.formSelectPlaceholder]}>
                                                    {divisionsData.find(d => d.id === formData.division)?.name || 'Select division'}
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
                                                    setShowAddLeaderDropdown(true);
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
                                                maxLength={15}
                                                autoCorrect={false}
                                                autoCapitalize="none"
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
                                                closeAddChildTransientUi();
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
                                                    assignedLeaderId: '',
                                                    guardianEmail: '',
                                                    guardianPhone: '',
                                                    emergencyContact: '',
                                                    rfid: '',
                                                    tshirtSize: '',
                                                    allergies: '',
                                                    medicalNotes: '',
                                                });
                                            }}
                                        >
                                            <Text style={styles.cancelButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.submitButton}
                                            onPress={async () => {
                                                // Basic client-side validation
                                                if (!formData.name.trim() || !formData.person_id.trim()) {
                                                    showAppAlert('Missing required fields', 'Please enter both Name and Person ID.');
                                                    return;
                                                }
                                                if (!companyId || !season) {
                                                    showAppAlert('Missing company info', 'Company or season is not set. Please try again.');
                                                    return;
                                                }

                                                try {
                                                    const payload = {
                                                        company_id: companyId as string,
                                                        season: formData.season || season,
                                                        name: formData.name.trim(),
                                                        age: Number(formData.age) || null,
                                                        gender: formData.gender || null,
                                                        division_id: formData.division || null,
                                                        grade: formData.grade || null,
                                                        group_name: formData.group || null,
                                                        person_id: formData.person_id.trim(),
                                                        emergency_contact: formData.emergencyContact || null,
                                                        rfid: formData.rfid || null,
                                                        allergies: formData.allergies || null,
                                                        medical_notes: formData.medicalNotes || null,
                                                        guardian_email: formData.guardianEmail || null,
                                                        guardian_phone: formData.guardianPhone || null,
                                                        leader_id: formData.assignedLeaderId || null,
                                                    };

                                                    // Use mutateAsync so we can await and catch errors reliably
                                                    await addCamperMutation.mutateAsync(payload as any);

                                                    showAppAlert('Child created', 'The camper has been added successfully.');
                                                    closeAddChildTransientUi();
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
                                                        assignedLeaderId: '',
                                                        guardianEmail: '',
                                                        guardianPhone: '',
                                                        emergencyContact: '',
                                                        rfid: '',
                                                        tshirtSize: '',
                                                        allergies: '',
                                                        medicalNotes: '',
                                                    });
                                                } catch (error: any) {
                                                    const message = error?.message || 'Could not add child.';
                                                    showAppAlert('Add child failed', message);
                                                }
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

                {/* Gender Dropdown Overlay for Add Child (inline to avoid nested modal issues on iOS) */}
                {showAddGenderDropdown && (
                    <View style={styles.modalAbsoluteOverlay} pointerEvents="box-none">
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
                    </View>
                )}

                {/* Division Dropdown Overlay for Add Child (inline to avoid nested modal issues on iOS) */}
                {showAddDivisionDropdown && (
                    <View style={styles.modalAbsoluteOverlay} pointerEvents="box-none">
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
                                {divisionsData.map((division: any) => (
                                    <TouchableOpacity
                                        key={division.id}
                                        style={[
                                            styles.bottomSheetOption,
                                            formData.division === division.id && styles.bottomSheetOptionSelected
                                        ]}
                                        onPress={() => {
                                            setFormData({ ...formData, division: division.id });
                                            setShowAddDivisionDropdown(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            formData.division === division.id && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {division.name}
                                        </Text>
                                        {formData.division === division.id && (
                                            <Ionicons name="checkmark" size={18} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                    </View>
                )}

                {/* Assigned Leader Dropdown Overlay for Add Child (inline to avoid nested modal issues on iOS) */}
                {showAddLeaderDropdown && (
                    <View style={styles.modalAbsoluteOverlay} pointerEvents="box-none">
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
                                {staffList.map((leader: any) => {
                                    const leaderDisplay = `${leader.name} - ${leader.role}`;
                                    const isSelected = formData.assignedLeaderId === leader.id || formData.assignedLeader === leaderDisplay;
                                    return (
                                        <TouchableOpacity
                                            key={leader.id || leader.name}
                                            style={[
                                                styles.bottomSheetOption,
                                                isSelected && styles.bottomSheetOptionSelected
                                            ]}
                                            onPress={() => {
                                                setFormData({ ...formData, assignedLeader: leaderDisplay, assignedLeaderId: (leader as any).id ?? '' });
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
                    </View>
                )}

                {/* Delete Confirmation Modal */}
                <Modal
                    visible={isDeleteConfirmVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => {
                        if (!isDeleting) {
                            setIsDeleteConfirmVisible(false);
                            setItemToDelete(null);
                        }
                    }}
                >
                    <Pressable
                        style={styles.deleteModalOverlay}
                        onPress={() => {
                            if (!isDeleting) {
                                setIsDeleteConfirmVisible(false);
                                setItemToDelete(null);
                            }
                        }}
                    >
                        <Pressable style={styles.deleteModalContent} onPress={(e) => e.stopPropagation()}>
                            <Text style={styles.deleteModalTitle}>Confirm Delete</Text>
                            <Text style={styles.deleteModalMessage}>Are you sure? This cannot be undone.</Text>
                            <View style={styles.deleteModalActions}>
                                <TouchableOpacity
                                    style={styles.deleteModalCancelBtn}
                                    onPress={() => {
                                        if (!isDeleting) {
                                            setIsDeleteConfirmVisible(false);
                                            setItemToDelete(null);
                                        }
                                    }}
                                    disabled={isDeleting}
                                >
                                    <Text style={styles.deleteModalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.deleteModalConfirmBtn, isDeleting && { opacity: 0.6 }]}
                                    onPress={handleConfirmDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.deleteModalConfirmText}>Delete</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Edit Child Modal */}
                <Modal
                    visible={showEditChildModal}
                    presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => {
                        closeEditChildTransientUi();
                        setShowEditChildModal(false);
                        setCamperToEdit(null);
                    }}
                >
                    <Pressable
                        style={styles.centeredOverlay}
                        onPress={() => {
                            closeEditChildTransientUi();
                            setShowEditChildModal(false);
                            setCamperToEdit(null);
                        }}
                    >
                        <Pressable
                            style={styles.addChildModal}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <ScrollView
                                style={styles.addChildModalScroll}
                                showsVerticalScrollIndicator={true}
                                nestedScrollEnabled={true}
                                keyboardShouldPersistTaps="always"
                            >
                                {/* Modal Header */}
                                <View style={styles.addChildModalHeader}>
                                    <Text style={styles.addChildModalTitle}>Edit Child</Text>
                                    <TouchableOpacity onPress={() => {
                                        closeEditChildTransientUi();
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
                                                    {divisionsData.find(d => d.id === editFormData.division)?.name || 'Select division'}
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

                                    {/* Row 6: T-Shirt Size (Full Width) */}
                                    <View style={styles.formRow}>
                                        <View style={styles.formFieldFull}>
                                            <Text style={styles.formLabel}>T-Shirt Size</Text>
                                            <TouchableOpacity
                                                style={styles.formSelect}
                                                onPress={() => setShowEditTshirtSizeDropdown(true)}
                                            >
                                                <Text style={[styles.formSelectText, !editFormData.tshirtSize && styles.formSelectPlaceholder]}>
                                                    {editFormData.tshirtSize || 'Not Specified'}
                                                </Text>
                                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
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
                                                maxLength={15}
                                                autoCorrect={false}
                                                autoCapitalize="none"
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

                                    {/* Birthday Party Preferences (in same modal) */}
                                    <View style={styles.birthdaySection}>
                                        <View style={styles.sectionDivider} />
                                        <Text style={styles.sectionTitle}>Birthday Party Preferences</Text>

                                        <Text style={styles.sectionSubTitle}>Birthday Celebration Choice</Text>
                                        <View style={styles.radioGroup}>
                                            {[
                                                { value: '', label: 'None' },
                                                { value: 'pizza_soda', label: 'Pizza & Soda Party at Rec Hall' },
                                                { value: 'ice_cream', label: 'Ice Cream Party in the Canteen' },
                                                { value: 'cookies_movie', label: 'Reggies Cookies and Bunk Movie' },
                                                { value: 'campfire_smores', label: 'Campfire and S\'mores' },
                                            ].map((opt) => (
                                                <TouchableOpacity
                                                    key={opt.value}
                                                    style={styles.radioOption}
                                                    onPress={() => setEditFormData({ ...editFormData, birthdayPartyType: opt.value })}
                                                >
                                                    <View style={styles.radioButton}>
                                                        {editFormData.birthdayPartyType === opt.value && (
                                                            <View style={styles.radioButtonInner} />
                                                        )}
                                                    </View>
                                                    <Text style={styles.radioLabel}>{opt.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        <Text style={styles.sectionSubTitle}>Additional Comments</Text>
                                        <TextInput
                                            style={styles.formTextArea}
                                            placeholder="Any special requests (e.g., campfire location, timing, number of people in bunk)"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editFormData.birthdayPartyComments}
                                            onChangeText={(text) => setEditFormData({ ...editFormData, birthdayPartyComments: text })}
                                            multiline
                                            numberOfLines={3}
                                            textAlignVertical="top"
                                        />

                                        <Text style={styles.sectionSubTitle}>When do you want the cake served?</Text>
                                        <View style={styles.radioGroup}>
                                            {[
                                                { value: '', label: 'None' },
                                                { value: 'lunch', label: 'Lunch' },
                                                { value: 'dinner', label: 'Dinner' },
                                            ].map((opt) => (
                                                <TouchableOpacity
                                                    key={opt.value || 'none'}
                                                    style={styles.radioOption}
                                                    onPress={() => setEditFormData({ ...editFormData, birthdayCakeMeal: opt.value })}
                                                >
                                                    <View style={styles.radioButton}>
                                                        {editFormData.birthdayCakeMeal === opt.value && (
                                                            <View style={styles.radioButtonInner} />
                                                        )}
                                                    </View>
                                                    <Text style={styles.radioLabel}>{opt.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        <Text style={styles.sectionSubTitle}>Cake Customization</Text>

                                        <Text style={[styles.sectionSubTitle, { marginTop: theme.spacing.sm }]}>Cake Type</Text>
                                        <View style={styles.radioGroup}>
                                            {[
                                                { value: 'rice_krispy', label: 'Rice Krispy Sheet Cake' },
                                                { value: 'vanilla', label: 'Vanilla Frosted Cake' },
                                                { value: 'chocolate', label: 'Chocolate Frosted Cake' },
                                            ].map((opt) => (
                                                <TouchableOpacity
                                                    key={opt.value}
                                                    style={styles.radioOption}
                                                    onPress={() => setEditFormData({ ...editFormData, birthdayCakeType: opt.value })}
                                                >
                                                    <View style={styles.radioButton}>
                                                        {editFormData.birthdayCakeType === opt.value && (
                                                            <View style={styles.radioButtonInner} />
                                                        )}
                                                    </View>
                                                    <Text style={styles.radioLabel}>{opt.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        <Text style={[styles.sectionSubTitle, { marginTop: theme.spacing.sm }]}>Frosting Color (select all that apply)</Text>
                                        <View style={styles.checkboxGrid}>
                                            {['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink', 'No Color'].map((color) => {
                                                const value = color.toLowerCase().replace(' ', '_');
                                                const isChecked = editFormData.birthdayFrostingColors.includes(value);
                                                return (
                                                    <TouchableOpacity
                                                        key={color}
                                                        style={styles.checkboxOption}
                                                        onPress={() => {
                                                            const next = isChecked
                                                                ? editFormData.birthdayFrostingColors.filter((c) => c !== value)
                                                                : [...editFormData.birthdayFrostingColors, value];
                                                            setEditFormData({ ...editFormData, birthdayFrostingColors: next });
                                                        }}
                                                    >
                                                        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                                            {isChecked && <Ionicons name="checkmark" size={16} color={theme.colors.surface} />}
                                                        </View>
                                                        <Text style={styles.checkboxLabel}>{color}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        <Text style={[styles.sectionSubTitle, { marginTop: theme.spacing.sm }]}>Toppings (select all that apply)</Text>
                                        <View style={styles.checkboxGrid}>
                                            {['Rainbow Sprinkles', 'Chocolate Sprinkles', 'Crushed Oreos', 'Sour Patch', 'Marshmallows', 'Graham Crackers', 'Pretzels', "M&M's", 'Strawberries', 'Blueberries', 'Cookies', 'Cherries', 'Chocolate Syrup', 'Caramel Syrup', 'No Toppings'].map((topping) => {
                                                const value = topping.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                                const isChecked = editFormData.birthdayToppings.includes(value);
                                                return (
                                                    <TouchableOpacity
                                                        key={topping}
                                                        style={styles.checkboxOption}
                                                        onPress={() => {
                                                            const next = isChecked
                                                                ? editFormData.birthdayToppings.filter((t) => t !== value)
                                                                : [...editFormData.birthdayToppings, value];
                                                            setEditFormData({ ...editFormData, birthdayToppings: next });
                                                        }}
                                                    >
                                                        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                                            {isChecked && <Ionicons name="checkmark" size={16} color={theme.colors.surface} />}
                                                        </View>
                                                        <Text style={styles.checkboxLabel}>{topping}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        <Text style={[styles.sectionSubTitle, { marginTop: theme.spacing.sm }]}>Any Allergies? (select all that apply)</Text>
                                        <View style={styles.checkboxGrid}>
                                            {['Gluten', 'Dairy', 'Sesame', 'Egg', 'Soy', 'Vegan'].map((allergy) => {
                                                const value = allergy.toLowerCase();
                                                const isChecked = editFormData.birthdayCakeAllergies.includes(value);
                                                return (
                                                    <TouchableOpacity
                                                        key={allergy}
                                                        style={styles.checkboxOption}
                                                        onPress={() => {
                                                            const next = isChecked
                                                                ? editFormData.birthdayCakeAllergies.filter((a) => a !== value)
                                                                : [...editFormData.birthdayCakeAllergies, value];
                                                            setEditFormData({ ...editFormData, birthdayCakeAllergies: next });
                                                        }}
                                                    >
                                                        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                                            {isChecked && <Ionicons name="checkmark" size={16} color={theme.colors.surface} />}
                                                        </View>
                                                        <Text style={styles.checkboxLabel}>{allergy}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        <Text style={[styles.sectionSubTitle, { marginTop: theme.spacing.sm }]}>What do you want written on the cake?</Text>
                                        <TextInput
                                            style={styles.formTextArea}
                                            placeholder="Enter custom message for the cake"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editFormData.birthdayCakeMessage}
                                            onChangeText={(text) => setEditFormData({ ...editFormData, birthdayCakeMessage: text })}
                                            multiline
                                            numberOfLines={3}
                                            textAlignVertical="top"
                                        />
                                    </View>

                                    {/* Form Buttons */}
                                    <View style={styles.formButtons}>
                                        <TouchableOpacity
                                            style={styles.cancelButton}
                                            onPress={() => {
                                                closeEditChildTransientUi();
                                                setShowEditChildModal(false);
                                                setCamperToEdit(null);
                                            }}
                                        >
                                            <Text style={styles.cancelButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.submitButton}
                                            onPress={() => {
                                                if (camperToEdit?.id) {
                                                    editCamperMutation.mutate({
                                                        id: camperToEdit.id,
                                                        company_id: companyId as string,
                                                        season: editFormData.season || season,
                                                        name: editFormData.name,
                                                        age: Number(editFormData.age) || null,
                                                        gender: editFormData.gender,
                                                        division_id: editFormData.division || null,
                                                        bunk_id: editFormData.bunk && /^[0-9a-f-]{36}$/i.test(editFormData.bunk) ? editFormData.bunk : null,
                                                        person_id: editFormData.person_id,
                                                        emergency_contact: editFormData.emergencyContact,
                                                        rfid: editFormData.rfid,
                                                        allergies: editFormData.allergies,
                                                        medical_notes: editFormData.medicalNotes,
                                                        guardian_email: editFormData.guardianEmail || null,
                                                        guardian_phone: editFormData.guardianPhone || null,
                                                        leader_id: editFormData.assignedLeaderId || null,
                                                        tshirt_size: editFormData.tshirtSize || null,
                                                        birthday_party_type: editFormData.birthdayPartyType || null,
                                                        birthday_party_comments: editFormData.birthdayPartyComments || null,
                                                        birthday_cake_meal: editFormData.birthdayCakeMeal || null,
                                                        birthday_cake_type: editFormData.birthdayCakeType || null,
                                                        birthday_frosting_colors:
                                                            editFormData.birthdayFrostingColors.length > 0
                                                                ? editFormData.birthdayFrostingColors
                                                                : null,
                                                        birthday_toppings:
                                                            editFormData.birthdayToppings.length > 0
                                                                ? editFormData.birthdayToppings
                                                                : null,
                                                        birthday_cake_allergies:
                                                            editFormData.birthdayCakeAllergies.length > 0
                                                                ? editFormData.birthdayCakeAllergies
                                                                : null,
                                                        birthday_cake_message: editFormData.birthdayCakeMessage || null,
                                                        date_of_birth: editFormData.dateOfBirth
                                                    } as any);
                                                }
                                                closeEditChildTransientUi();
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
                    animationType="slide"
                    onRequestClose={() => setIsDatePickerVisible(false)}
                >
                    <Pressable style={styles.bottomSheetOverlay} onPress={() => setIsDatePickerVisible(false)}>
                        <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
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
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* Gender Dropdown Modal for Edit Child */}
                <Modal
                    visible={showEditGenderDropdown}
                    presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
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
                    presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
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
                    presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
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
                                {divisionsData.map((division: any) => (
                                    <TouchableOpacity
                                        key={division.id}
                                        style={[
                                            styles.bottomSheetOption,
                                            editFormData.division === division.id && styles.bottomSheetOptionSelected
                                        ]}
                                        onPress={() => {
                                            setEditFormData({ ...editFormData, division: division.id });
                                            setShowEditDivisionDropdown(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            editFormData.division === division.id && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {division.name}
                                        </Text>
                                        {editFormData.division === division.id && (
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
                    presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
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
                                {staffList.map((leader: any) => {
                                    const leaderDisplay = `${leader.name} - ${leader.role}`;
                                    const isSelected = editFormData.assignedLeaderId === (leader as any).id || editFormData.assignedLeader === leaderDisplay;
                                    return (
                                        <TouchableOpacity
                                            key={(leader as any).id || (leader as any).name}
                                            style={[
                                                styles.bottomSheetOption,
                                                isSelected && styles.bottomSheetOptionSelected
                                            ]}
                                            onPress={() => {
                                                setEditFormData({ ...editFormData, assignedLeader: leaderDisplay, assignedLeaderId: (leader as any).id ?? '' });
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

                {/* T-Shirt Size Dropdown Modal for Edit Child */}
                <Modal
                    visible={showEditTshirtSizeDropdown}
                    presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowEditTshirtSizeDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheetOverlay}
                        onPress={() => setShowEditTshirtSizeDropdown(false)}
                    >
                        <Pressable
                            style={styles.bottomSheet}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <View style={styles.bottomSheetHeader}>
                                <Text style={styles.bottomSheetTitle}>Select T-Shirt Size</Text>
                            </View>
                            <ScrollView
                                style={styles.bottomSheetScroll}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                            >
                                {tshirtSizeOptions.map((opt) => {
                                    const isSelected = (editFormData.tshirtSize || '') === opt.value;
                                    return (
                                        <TouchableOpacity
                                            key={opt.value || 'none'}
                                            style={[
                                                styles.bottomSheetOption,
                                                isSelected && styles.bottomSheetOptionSelected
                                            ]}
                                            onPress={() => {
                                                setEditFormData({ ...editFormData, tshirtSize: opt.value });
                                                setShowEditTshirtSizeDropdown(false);
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.bottomSheetOptionText,
                                                    isSelected && styles.bottomSheetOptionTextSelected
                                                ]}
                                            >
                                                {opt.label}
                                            </Text>
                                            {isSelected && (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={18}
                                                    color={theme.colors.secondary}
                                                    style={{ marginLeft: 'auto' }}
                                                />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>

                {!isLoading && !isError && (
                <>
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
                                        <Text style={styles.camperGrade}>{(camper as any).division?.name || "N/A"}</Text>
                                    </View>
                                    <View style={styles.cardTopRight}>
                                        <TouchableOpacity
                                            style={styles.cardIconButton}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                setCamperToEdit(camper);
                                                // Pre-fill form with camper data
                                                const camperAny = camper as any;
                                                const leaderId = camperAny.leader_id ?? '';
                                                const staffForLeader = staffList.find((s: any) => s.id === leaderId);
                                                const leaderDisplay = staffForLeader ? `${staffForLeader.name} - ${staffForLeader.role}` : '';
                                                setEditFormData({
                                                    name: camperAny.name || '',
                                                    person_id: camperAny.person_id || '',
                                                    age: camperAny.age !== undefined && camperAny.age !== null ? String(camperAny.age) : '',
                                                    dateOfBirth: camperAny.date_of_birth || camperAny.dateOfBirth || '',
                                                    gender: camperAny.gender || '',
                                                    division: camperAny.division_id || camperAny.division?.id || '',
                                                    bunk: camperAny.bunk_id || camperAny.bunk || '',
                                                    grade: camperAny.grade || '',
                                                    group: camperAny.group || '',
                                                    season: camperAny.season || '2026',
                                                    assignedLeader: leaderDisplay,
                                                    assignedLeaderId: leaderId,
                                                    tshirtSize: camperAny.tshirt_size || camperAny.tshirtSize || '',
                                                    birthdayPartyType: camperAny.birthday_party_type || camperAny.birthdayPartyType || '',
                                                    birthdayPartyComments: camperAny.birthday_party_comments || camperAny.birthdayPartyComments || '',
                                                    birthdayCakeMeal: camperAny.birthday_cake_meal || camperAny.birthdayCakeMeal || '',
                                                    birthdayCakeType: camperAny.birthday_cake_type || camperAny.birthdayCakeType || '',
                                                    birthdayFrostingColors: camperAny.birthday_frosting_colors || camperAny.birthdayFrostingColors || [],
                                                    birthdayToppings: camperAny.birthday_toppings || camperAny.birthdayToppings || [],
                                                    birthdayCakeAllergies: camperAny.birthday_cake_allergies || camperAny.birthdayCakeAllergies || [],
                                                    birthdayCakeMessage: camperAny.birthday_cake_message || camperAny.birthdayCakeMessage || '',
                                                    guardianEmail: camperAny.guardian_email || camperAny.guardianEmail || '',
                                                    guardianPhone: camperAny.guardian_phone || camperAny.guardianPhone || '',
                                                    emergencyContact: camperAny.emergency_contact || '',
                                                    rfid: camperAny.rfid || '',
                                                    allergies: camperAny.allergies || '',
                                                    medicalNotes: camperAny.medical_notes || '',
                                                });
                                                closeEditChildTransientUi();
                                                setShowEditChildModal(true);
                                            }}
                                        >
                                            <Ionicons name="pencil-outline" size={18} color="#9ca3af" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.cardIconButton}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                setItemToDelete(camper);
                                                setIsDeleteConfirmVisible(true);
                                            }}
                                        >
                                            <Ionicons name="trash-outline" size={18} color="#9ca3af" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.cardFooter}>
                                    <Text style={styles.divisionText}>Division: {(camper as any).division?.name || "N/A"}</Text>
                                    {(() => {
                                        const raw = (camper as any)?.status;
                                        const trimmed = typeof raw === 'string' ? raw.trim() : '';
                                        const normalized =
                                            trimmed.length === 0 ? 'active' : trimmed.toLowerCase();
                                        const label = trimmed.length === 0 ? 'Active' : trimmed;
                                        const isActive = normalized === 'active';

                                        return (
                                            <View
                                                style={[
                                                    styles.statusBadge,
                                                    isActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.statusText,
                                                        isActive ? styles.statusTextActive : styles.statusTextInactive,
                                                    ]}
                                                >
                                                    {label}
                                                </Text>
                                            </View>
                                        );
                                    })()}
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
                </>
                )}

            </ScrollView>
            {/* Floating Action Button (Chat) mock */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="chatbubble-ellipses" size={24} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

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
    centeredOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.md,
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

    // Bottom Sheet Styles
    modalAbsoluteOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 2000,
        elevation: 24,
    },
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
        zIndex: 2,
        elevation: 24,
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
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 0,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        lineHeight: 16,
    },
    statusBadgeActive: {
        backgroundColor: '#dcfce7',
    },
    statusBadgeInactive: {
        backgroundColor: '#fee2e2',
    },
    statusTextActive: {
        color: '#166534',
    },
    statusTextInactive: {
        color: '#991b1b',
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
        maxHeight: 520,
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
    searchResultSubtext: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    rfidStatusPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        marginRight: theme.spacing.xs,
    },
    rfidStatusPillHas: {
        borderColor: '#86efac',
        backgroundColor: '#f0fdf4',
    },
    rfidStatusPillNone: {
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
    },
    rfidStatusPillText: {
        fontSize: 11,
        fontWeight: '600',
    },
    rfidStatusPillTextHas: {
        color: '#15803d',
    },
    rfidStatusPillTextNone: {
        color: theme.colors.textSecondary,
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
    currentRfidHint: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 6,
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
        alignItems: 'center',
        minHeight: 44,
        cursor: 'pointer' as any,
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
    bulkResultsBox: {
        marginTop: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        maxHeight: 200,
    },
    bulkResultsTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        padding: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    bulkResultsScroll: {
        maxHeight: 160,
    },
    bulkResultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    bulkResultName: {
        flex: 1,
        fontSize: 12,
        color: theme.colors.text,
    },
    bulkResultMsg: {
        maxWidth: 120,
        fontSize: 11,
        color: theme.colors.textSecondary,
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
        flexBasis: isSmallScreen ? '100%' : '48%',
        maxWidth: isSmallScreen ? '100%' : '48%',
        flexGrow: 0,
        flexShrink: 1,
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
        width: '100%',
        flexGrow: 1,
        overflow: 'hidden',
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
    birthdaySection: {
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    sectionDivider: {
        height: 0,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    sectionSubTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    radioGroup: {
        flexDirection: 'column',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
    },
    radioButton: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.secondary,
    },
    radioLabel: {
        flex: 1,
        flexWrap: 'wrap',
        fontSize: 13,
        color: theme.colors.text,
    },
    checkboxGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
    },
    checkboxOption: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '48%',
        gap: theme.spacing.xs,
        paddingVertical: theme.spacing.xs,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    checkboxChecked: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    checkboxLabel: {
        fontSize: 13,
        color: theme.colors.text,
        flexShrink: 1,
    },
    deleteModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    deleteModalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '90%',
        maxWidth: 400,
        padding: theme.spacing.xl,
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
    deleteModalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.md,
    },
    deleteModalCancelBtn: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minWidth: 80,
        alignItems: 'center',
    },
    deleteModalCancelText: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    deleteModalConfirmBtn: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
        minWidth: 88,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteModalConfirmText: {
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
    loadingContainer: {
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: theme.spacing.sm,
        color: theme.colors.textSecondary,
    },
    errorContainer: {
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    errorText: {
        marginTop: theme.spacing.sm,
        color: theme.colors.danger || '#dc2626',
        textAlign: 'center',
    },
});
