import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '../contexts/CompanyContext';
import { useStaff } from '../api/staff';
import { isTylerHillCamp } from '../constants/camps';

interface StaffMember {
    id: string;
    name: string;
    bunk: string;
    isOut: boolean;
    isIn: boolean;
    isSleepingOut: boolean;
    /** Matches web: on duty = not marked day off */
    isDayOff: boolean;
    staffId: string;
    bunkId: string;
    dayOffId?: string;
}

interface BunkRow {
    id: string;
    bunk_number: number;
    bunk_name: string | null;
    division_id: string | null;
    divisions?: { id?: string; name?: string; gender?: string | null } | null;
}

interface BunkStaffRow {
    id: string;
    bunk_id: string;
    staff_id: string;
    staff?: {
        id: string;
        name: string;
    } | null;
}

type CsvUploadResult = {
    success: number;
    failed: number;
    errors: string[];
};

export const ODManagementScreen = ({ navigation }: any) => {
    const { companyId, season, companySlug } = useCompany();
    /** Same as web ODManagement.tsx — Free Play hidden for Tyler Hill */
    const showFreePlay = !isTylerHillCamp(companySlug);
    const queryClient = useQueryClient();
    const { width } = useWindowDimensions();
    const isCompactModal = width < 560;

    const [activeTab, setActiveTab] = useState<'OD' | 'OFF' | 'FREE_PLAY'>('OD');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    /** Matches web ODManagement.tsx `genderFilter` */
    const [genderFilter, setGenderFilter] = useState<'all' | 'girls' | 'boys'>('all');
    const [showManageBunksModal, setShowManageBunksModal] = useState(false);
    const [showNewModal, setShowNewModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [newBunkNumber, setNewBunkNumber] = useState('1');
    const [newBunkName, setNewBunkName] = useState('');
    const [newBunkDivision, setNewBunkDivision] = useState<string | null>(null);
    const [newEntryStaffId, setNewEntryStaffId] = useState<string | null>(null);
    const [newEntrySleepingOut, setNewEntrySleepingOut] = useState(false);
    const [selectedBunkForStaff, setSelectedBunkForStaff] = useState<string | null>(null);
    const [selectedStaffToAdd, setSelectedStaffToAdd] = useState<string>('');
    const [showDivisionPickerModal, setShowDivisionPickerModal] = useState(false);
    const [showStaffPickerForBunk, setShowStaffPickerForBunk] = useState<string | null>(null);
    const [bunkModalTab, setBunkModalTab] = useState<'manage' | 'upload'>('manage');
    const [csvUploading, setCsvUploading] = useState(false);
    const [csvUploadResult, setCsvUploadResult] = useState<CsvUploadResult | null>(null);
    const [lastCsvFileName, setLastCsvFileName] = useState('');
    const [showLateOverrideModal, setShowLateOverrideModal] = useState(false);
    const [lateOverrideReason, setLateOverrideReason] = useState('');
    const [lateOverrideStaffId, setLateOverrideStaffId] = useState<string | null>(null);

    const [scannerMode, setScannerMode] = useState(false);
    const [rfidInput, setRfidInput] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const rfidInputRef = useRef<TextInput>(null);

    const dateString = selectedDate.toISOString().split('T')[0];
    const { data: staffList = [] } = useStaff(companyId, season);

    // Fetch staff_days_off for the selected date (same schema as web)
    const { data: staffDaysOff = [], isLoading: isLoadingStaff } = useQuery({
        queryKey: ['staff_days_off', companyId, season, dateString],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('staff_days_off')
                .select('id, staff_id, date, is_day_off, is_night_off, is_sleeping_out, checked_out, checked_out_at, checked_out_by, checked_in, checked_in_at, checked_in_by, late_override, late_override_reason, staff:staff_id(id, name)')
                .eq('company_id', companyId)
                .eq('season', season)
                .eq('date', dateString);
            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId && !!season,
    });

    // Fetch bunks (web schema: bunk_number, bunk_name; no "name" column)
    const { data: bunksList = [] } = useQuery({
        queryKey: ['bunks', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('bunks')
                .select('id, bunk_number, bunk_name, division_id, divisions:division_id(id, name, gender)')
                .eq('company_id', companyId)
                .eq('season', season)
                .eq('is_active', true)
                .order('bunk_number', { ascending: true });
            if (error) throw error;
            return (data || []) as BunkRow[];
        },
        enabled: !!companyId && !!season,
    });

    const { data: bunkStaffList = [] } = useQuery({
        queryKey: ['bunk_staff', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('bunk_staff')
                .select('id, bunk_id, staff_id, staff:staff_id(id, name)')
                .eq('company_id', companyId)
                .eq('season', season);
            if (error) throw error;
            return (data || []) as BunkStaffRow[];
        },
        enabled: !!companyId && !!season,
    });

    const { data: divisionsList = [] } = useQuery({
        queryKey: ['divisions', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('divisions')
                .select('id, name, gender')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId,
    });

    // Add day-off record (staff_days_off table, same as web)
    const addDayOffMutation = useMutation({
        mutationFn: async (newRecord: any) => {
            const { error } = await supabase
                .from('staff_days_off')
                .insert([{
                    company_id: companyId,
                    staff_id: newRecord.staffId,
                    date: dateString,
                    season,
                    is_day_off: true,
                    is_night_off: newRecord.isNightOff ?? false,
                    is_sleeping_out: newRecord.isSleepingOut ?? false,
                }]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to add record');
        },
    });

    // Add bunk (web schema: bunk_number, bunk_name; season required)
    const addBunkMutation = useMutation({
        mutationFn: async ({ bunkNumber, bunkName }: { bunkNumber: number; bunkName: string }) => {
            const { error } = await supabase
                .from('bunks')
                .insert([{ company_id: companyId, season, bunk_number: bunkNumber, bunk_name: bunkName || null, division_id: newBunkDivision }]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bunks'] });
            setNewBunkName('');
            setNewBunkDivision(null);
        },
        onError: (error: any) => {
            if (error?.code === '23505') {
                Alert.alert('Duplicate bunk number', 'That bunk number already exists for this season.');
                return;
            }
            Alert.alert('Error', error.message || 'Failed to add bunk');
        },
    });

    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        console.log('[DELETE] Starting delete for:', itemToDelete.id);
        try {
            const { error, status, statusText } = await supabase.from('bunks').delete().eq('id', itemToDelete.id);
            console.log('[DELETE] Response:', { error, status, statusText });
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['bunks'] });
            queryClient.invalidateQueries({ queryKey: ['bunk_staff'] });
            queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });
            Alert.alert('Success', 'Bunk deleted');
        } catch (err: any) {
            console.error('[DELETE] Error:', err);
            Alert.alert('Delete failed', err.message || 'Unknown error');
        } finally {
            setIsDeleting(false);
            setIsDeleteConfirmVisible(false);
            setItemToDelete(null);
        }
    };

    const assignStaffToBunkMutation = useMutation({
        mutationFn: async ({ bunkId, staffId }: { bunkId: string; staffId: string }) => {
            const { error } = await supabase
                .from('bunk_staff')
                .insert([{ company_id: companyId, season, bunk_id: bunkId, staff_id: staffId, is_primary: false }]);
            if (error) throw error;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['bunk_staff'] });
            await queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });
            await queryClient.invalidateQueries({ queryKey: ['staff'] });
            setSelectedStaffToAdd('');
            setSelectedBunkForStaff(null);
            setShowStaffPickerForBunk(null);
            Alert.alert('Saved', 'Staff assigned to bunk');
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to assign staff');
        },
    });

    const removeStaffFromBunkMutation = useMutation({
        mutationFn: async (bunkStaffId: string) => {
            const { error } = await supabase.from('bunk_staff').delete().eq('id', bunkStaffId);
            if (error) throw error;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['bunk_staff'] });
            await queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to remove staff');
        },
    });

    const formatDate = (date: Date): string => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        if (direction === 'prev') {
            newDate.setDate(newDate.getDate() - 1);
        } else {
            newDate.setDate(newDate.getDate() + 1);
        }
        setSelectedDate(newDate);
    };

    const staffById = new Map((staffList || []).map((s: any) => [s.id, s]));
    const bunkById = new Map((bunksList || []).map((b: BunkRow) => [b.id, b]));
    const dayOffByStaffId = new Map((staffDaysOff || []).map((row: any) => [row.staff_id, row]));

    /** Same as web `getBunkGender` (ODManagement.tsx) */
    const getBunkGender = (bunk: BunkRow | undefined): string | null => {
        if (!bunk) return null;
        const d = bunk.divisions as { gender?: string | null } | { gender?: string | null }[] | null | undefined;
        if (Array.isArray(d)) return d[0]?.gender ?? null;
        return d?.gender ?? null;
    };

    const staffMembers: StaffMember[] = (bunkStaffList || [])
        .map((bs: BunkStaffRow) => {
            const staff = bs.staff || staffById.get(bs.staff_id);
            const bunk = bunkById.get(bs.bunk_id);
            const dayOff = dayOffByStaffId.get(bs.staff_id);
            if (!staff || !bunk) return null;
            return {
                id: bs.id,
                staffId: bs.staff_id,
                name: staff.name || 'Unknown',
                bunk: bunk.bunk_name || `Bunk ${bunk.bunk_number}`,
                bunkId: bunk.id,
                dayOffId: dayOff?.id,
                isOut: !!dayOff?.checked_out,
                isIn: !!dayOff?.checked_in,
                isSleepingOut: !!dayOff?.is_sleeping_out,
                isDayOff: !!dayOff?.is_day_off,
            };
        })
        .filter(Boolean) as StaffMember[];

    const filteredStaff = staffMembers.filter((staff) => {
        if (searchQuery && !staff.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !staff.bunk.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        const bunk = bunkById.get(staff.bunkId);
        const raw = getBunkGender(bunk);
        const bunkGender = raw ? String(raw).toLowerCase() : null;
        const matchesGender =
            genderFilter === 'all' ||
            (genderFilter === 'girls' && bunkGender === 'girls') ||
            (genderFilter === 'boys' && bunkGender === 'boys');
        if (!matchesGender) return false;
        if (activeTab === 'OD') return !staff.isDayOff;
        if (activeTab === 'OFF') return staff.isDayOff;
        if (activeTab === 'FREE_PLAY') return staff.isSleepingOut;
        return true;
    });

    useEffect(() => {
        if (!showFreePlay && activeTab === 'FREE_PLAY') setActiveTab('OD');
    }, [showFreePlay, activeTab]);

    const handleManageBunks = () => {
        setBunkModalTab('manage');
        setCsvUploadResult(null);
        setShowManageBunksModal(true);
    };

    const handleAddBunk = () => {
        if (!companyId || !season) {
            Alert.alert('Missing context', 'Company or season is not available yet.');
            return;
        }
        const bunkNumber = Number(newBunkNumber);
        if (!Number.isFinite(bunkNumber) || bunkNumber <= 0) {
            Alert.alert('Invalid bunk number', 'Please enter a valid bunk number.');
            return;
        }
        addBunkMutation.mutate({ bunkNumber, bunkName: newBunkName.trim() });
    };

    useEffect(() => {
        if (!showManageBunksModal) return;
        const nextBunkNumber = (bunksList.length ? Math.max(...bunksList.map((b) => b.bunk_number)) + 1 : 1).toString();
        setNewBunkNumber((prev) => {
            if (!prev || prev === '1') return nextBunkNumber;
            return prev;
        });
    }, [showManageBunksModal, bunksList]);

    const handleDeleteBunk = (bunkId: string, _displayName: string) => {
        setItemToDelete({ id: bunkId });
        setIsDeleteConfirmVisible(true);
    };

    const handleUploadBunkCsv = async () => {
        if (!companyId || !season) {
            Alert.alert('Missing context', 'Company or season is not available yet.');
            return;
        }
        try {
            const result = await DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: true,
                type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
            });
            const file = result.assets?.[0];
            if (!file) return;
            setLastCsvFileName(file.name || 'Selected CSV');

            setCsvUploading(true);
            setCsvUploadResult(null);
            const csvText = await (await fetch(file.uri)).text();
            const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
            if (lines.length < 2) {
                Alert.alert('Invalid file', 'CSV is empty or missing data rows.');
                return;
            }

            const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
            const personIdx = headers.findIndex((h) => h === 'person id' || h === 'person_id');
            const bunkIdx = headers.findIndex((h) => h === 'bunk number' || h === 'bunk_number');
            const primaryIdx = headers.findIndex((h) => h === 'is primary' || h === 'is_primary');
            if (personIdx === -1 || bunkIdx === -1) {
                Alert.alert('Invalid CSV format', 'Required columns: Person ID, Bunk Number');
                return;
            }

            const [{ data: staffRows, error: staffErr }, { data: bunkRows, error: bunkErr }] = await Promise.all([
                supabase.from('staff').select('id, person_id').eq('company_id', companyId).eq('season', season),
                supabase.from('bunks').select('id, bunk_number').eq('company_id', companyId).eq('season', season).eq('is_active', true),
            ]);
            if (staffErr) throw staffErr;
            if (bunkErr) throw bunkErr;

            const staffByPersonId = new Map<string, string>();
            (staffRows || []).forEach((s: any) => {
                if (s.person_id) staffByPersonId.set(String(s.person_id).toLowerCase().trim(), s.id);
            });
            const bunkByNumber = new Map<number, string>();
            (bunkRows || []).forEach((b: any) => bunkByNumber.set(Number(b.bunk_number), b.id));

            const summary: CsvUploadResult = { success: 0, failed: 0, errors: [] };
            for (let i = 1; i < lines.length; i += 1) {
                const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
                const personId = String(values[personIdx] || '').toLowerCase().trim();
                const bunkNumber = Number(values[bunkIdx] || '');
                const isPrimaryRaw = String(values[primaryIdx] || '').toLowerCase();
                const isPrimary = ['true', '1', 'yes', 'y'].includes(isPrimaryRaw);
                if (!personId || !Number.isFinite(bunkNumber)) {
                    summary.failed += 1;
                    summary.errors.push(`Row ${i + 1}: Invalid person id or bunk number`);
                    continue;
                }
                const staffId = staffByPersonId.get(personId);
                if (!staffId) {
                    summary.failed += 1;
                    summary.errors.push(`Row ${i + 1}: Staff with Person ID "${values[personIdx]}" not found`);
                    continue;
                }
                const bunkId = bunkByNumber.get(bunkNumber);
                if (!bunkId) {
                    summary.failed += 1;
                    summary.errors.push(`Row ${i + 1}: Bunk #${bunkNumber} not found`);
                    continue;
                }

                const { data: existing, error: existingErr } = await supabase
                    .from('bunk_staff')
                    .select('id')
                    .eq('company_id', companyId)
                    .eq('season', season)
                    .eq('staff_id', staffId)
                    .eq('bunk_id', bunkId)
                    .maybeSingle();
                if (existingErr) {
                    summary.failed += 1;
                    summary.errors.push(`Row ${i + 1}: ${existingErr.message}`);
                    continue;
                }

                if (existing?.id) {
                    const { error } = await supabase.from('bunk_staff').update({ is_primary: isPrimary }).eq('id', existing.id);
                    if (error) {
                        summary.failed += 1;
                        summary.errors.push(`Row ${i + 1}: ${error.message}`);
                        continue;
                    }
                } else {
                    const { error } = await supabase.from('bunk_staff').insert({
                        company_id: companyId,
                        season,
                        staff_id: staffId,
                        bunk_id: bunkId,
                        is_primary: isPrimary,
                    });
                    if (error) {
                        summary.failed += 1;
                        summary.errors.push(`Row ${i + 1}: ${error.message}`);
                        continue;
                    }
                }
                summary.success += 1;
            }

            setCsvUploadResult(summary);
            await queryClient.invalidateQueries({ queryKey: ['bunk_staff'] });
            await queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });
            if (summary.success > 0) Alert.alert('Upload complete', `Assigned ${summary.success} staff record(s) from CSV.`);
        } catch (error: any) {
            Alert.alert('Upload failed', error?.message || 'Failed to process CSV file');
        } finally {
            setCsvUploading(false);
        }
    };

    const handleRfidScan = async () => {
        const value = (rfidInput || '').trim();
        if (!value || !companyId) return;
        setIsScanning(true);
        try {
            const { data: staffMember, error: staffErr } = await supabase
                .from('staff')
                .select('id, name')
                .eq('rfid', value)
                .eq('company_id', companyId)
                .eq('season', season)
                .maybeSingle();
            if (staffErr || !staffMember) {
                Alert.alert('Not found', `Wristband not recognized (RFID: ${value.slice(0, 12)}...)`);
                setRfidInput('');
                return;
            }
            const existing = staffMembers.find((m: any) => m.staffId === staffMember.id);
            if (!existing) {
                Alert.alert('No bunk assignment', `${staffMember.name} is not assigned to a bunk. Add assignment in Manage Bunks.`);
                setRfidInput('');
                return;
            }
            const { data: row } = await supabase.from('staff_days_off').select('id, checked_out, checked_in').eq('staff_id', staffMember.id).eq('company_id', companyId).eq('date', dateString).maybeSingle();
            if (!row) {
                setLateOverrideStaffId(staffMember.id);
                setShowLateOverrideModal(true);
                setRfidInput('');
                return;
            }
            if (!row.checked_out) {
                await supabase.from('staff_days_off').update({ checked_out: true, checked_out_at: new Date().toISOString() }).eq('id', row.id);
                Alert.alert('Checked out', `${staffMember.name} signed out.`);
            } else if (!row.checked_in) {
                await supabase.from('staff_days_off').update({ checked_in: true, checked_in_at: new Date().toISOString() }).eq('id', row.id);
                Alert.alert('Checked in', `${staffMember.name} signed in.`);
            } else {
                Alert.alert('Done', `${staffMember.name} has already checked out and back in today.`);
            }
            queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });
            setRfidInput('');
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Scan failed');
        } finally {
            setIsScanning(false);
        }
    };

    /** Align with web `handleToggleDayOff` (ODManagement.tsx) */
    const handleToggleDayOff = async (staffId: string, field: 'is_day_off' | 'is_night_off' | 'is_sleeping_out') => {
        if (!companyId || !season) return;
        const existing = (staffDaysOff as any[]).find((d) => d.staff_id === staffId);
        try {
            if (existing) {
                const cur = !!existing[field];
                const newValue = !cur;
                const updates: Record<string, boolean> = { [field]: newValue };
                if (field === 'is_day_off') updates.is_night_off = newValue;
                const { error } = await supabase.from('staff_days_off').update(updates).eq('id', existing.id);
                if (error) throw error;
            } else {
                const newRecord = {
                    company_id: companyId,
                    staff_id: staffId,
                    date: dateString,
                    season,
                    is_day_off: field === 'is_day_off',
                    is_night_off: field === 'is_day_off' || field === 'is_night_off',
                    is_sleeping_out: field === 'is_sleeping_out',
                };
                const { error } = await supabase.from('staff_days_off').insert(newRecord);
                if (error) throw error;
            }
            await queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });
        } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not update');
        }
    };

    const handleApproveLateOverride = async () => {
        if (!lateOverrideStaffId || !companyId) return;
        if (!lateOverrideReason.trim()) {
            Alert.alert('Reason required', 'Please enter a reason for this late sign-out override.');
            return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('staff_days_off')
            .upsert({
                company_id: companyId,
                staff_id: lateOverrideStaffId,
                date: dateString,
                season,
                is_day_off: true,
                is_night_off: true,
                checked_out: true,
                checked_out_at: new Date().toISOString(),
                checked_out_by: user?.id ?? null,
                late_override: true,
                late_override_reason: lateOverrideReason.trim(),
                late_override_approved_by: user?.id ?? null,
                late_override_approved_at: new Date().toISOString(),
            }, { onConflict: 'company_id,staff_id,date,season' });
        if (error) {
            Alert.alert('Error', error.message || 'Failed to approve override');
            return;
        }
        setShowLateOverrideModal(false);
        setLateOverrideReason('');
        setLateOverrideStaffId(null);
        queryClient.invalidateQueries({ queryKey: ['staff_days_off'] });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Title Section */}
                <View style={styles.titleSection}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>OD Management</Text>
                        <Text style={styles.subtitle}>Manage staff days off and bunk coverage</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                        style={[styles.actionButton, scannerMode && { backgroundColor: theme.colors.primary }]}
                        onPress={() => setScannerMode(!scannerMode)}
                    >
                        <Ionicons name="barcode-outline" size={18} color={scannerMode ? theme.colors.surface : theme.colors.text} />
                        <Text style={[styles.actionButtonText, scannerMode && { color: theme.colors.surface }]}>
                            {scannerMode ? 'Scanner active' : 'Scan Wristband'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleManageBunks}
                    >
                        <Ionicons name="business-outline" size={18} color={theme.colors.text} />
                        <Text style={styles.actionButtonText}>Manage Bunks</Text>
                    </TouchableOpacity>
                </View>

                {scannerMode ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md, gap: 8 }}>
                        <TextInput
                            ref={rfidInputRef}
                            style={[styles.bankInput, { flex: 1 }]}
                            placeholder="Scan or enter RFID..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={rfidInput}
                            onChangeText={setRfidInput}
                            onSubmitEditing={handleRfidScan}
                            editable={!isScanning}
                            autoFocus
                        />
                        <TouchableOpacity
                            style={[styles.addBankButton, (!rfidInput.trim() || isScanning) && { opacity: 0.6 }]}
                            onPress={handleRfidScan}
                            disabled={!rfidInput.trim() || isScanning}
                        >
                            {isScanning ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark" size={24} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                ) : null}

                {/* Date Selector */}
                <View style={styles.dateSelector}>
                    <TouchableOpacity onPress={() => navigateDate('prev')}>
                        <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.dateDisplay}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigateDate('next')}>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Filter by Gender — matches web ODManagement.tsx */}
                <View style={styles.genderFilterBlock}>
                    <Text style={styles.genderFilterLabel}>Filter by Gender</Text>
                    <View style={styles.genderFilterRow}>
                        {(['all', 'girls', 'boys'] as const).map((key) => (
                            <TouchableOpacity
                                key={key}
                                style={[styles.genderChip, genderFilter === key && styles.genderChipActive]}
                                onPress={() => setGenderFilter(key)}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.genderChipText, genderFilter === key && styles.genderChipTextActive]}>
                                    {key === 'all' ? 'All' : key === 'girls' ? 'Girls' : 'Boys'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* OD / Off / Free Play — matches web ODManagement.tsx tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'OD' && styles.tabActive]}
                        onPress={() => setActiveTab('OD')}
                    >
                        <Text style={[styles.tabText, activeTab === 'OD' && styles.tabTextActive]} numberOfLines={1}>
                            OD
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'OFF' && styles.tabActive]}
                        onPress={() => setActiveTab('OFF')}
                    >
                        <Text style={[styles.tabText, activeTab === 'OFF' && styles.tabTextActive]} numberOfLines={1}>
                            Off
                        </Text>
                    </TouchableOpacity>
                    {showFreePlay ? (
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'FREE_PLAY' && styles.tabActiveFreePlay]}
                            onPress={() => setActiveTab('FREE_PLAY')}
                        >
                            <Text
                                style={[styles.tabText, activeTab === 'FREE_PLAY' && styles.tabTextActiveFreePlay]}
                                numberOfLines={1}
                            >
                                Free Play
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                <StyledCard style={styles.staffCard}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                            <Text style={[styles.cardTitle, { flex: 1, minWidth: 0 }]} numberOfLines={2}>
                                {activeTab === 'OD'
                                    ? 'On Duty Staff'
                                    : activeTab === 'OFF'
                                      ? 'Staff Off'
                                      : 'Free Play Shifts'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowNewModal(true)} hitSlop={8} style={styles.cardAddEntryBtn}>
                                <Text style={styles.cardAddEntryText}>Add entry</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.cardSubtitle}>
                            {activeTab === 'OD'
                                ? `Staff members on duty for ${formatDate(selectedDate)}`
                                : activeTab === 'OFF'
                                  ? `Staff members off for ${formatDate(selectedDate)}`
                                  : `Staff scheduled for Free Play for ${formatDate(selectedDate)}`}
                        </Text>
                    </View>

                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by name or bunk..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {bunksList.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                No bunks configured. Use Manage Bunks to set up bunks and assign staff.
                            </Text>
                        </View>
                    ) : filteredStaff.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                {activeTab === 'OD'
                                    ? 'No staff on duty found.'
                                    : activeTab === 'OFF'
                                      ? 'No staff off today.'
                                      : 'No staff scheduled for Free Play today.'}
                            </Text>
                        </View>
                    ) : activeTab === 'FREE_PLAY' ? (
                        <View style={styles.staffList}>
                            <View style={styles.tableHeaders}>
                                <Text style={[styles.tableHeader, { flex: 1.4 }]}>Bunk</Text>
                                <Text style={[styles.tableHeader, { flex: 1.8 }]}>Name</Text>
                                <Text style={[styles.tableHeader, { flex: 1.2 }]}>Status</Text>
                                <Text style={[styles.tableHeader, { flex: 1 }]}>Actions</Text>
                            </View>
                            {filteredStaff.map((staff) => (
                                <View key={staff.id} style={styles.staffRow}>
                                    <Text style={[styles.staffCell, { flex: 1.4 }]}>{staff.bunk}</Text>
                                    <Text style={[styles.staffCell, { flex: 1.8 }]}>{staff.name}</Text>
                                    <View style={{ flex: 1.2, justifyContent: 'center' }}>
                                        <View style={styles.freePlayBadge}>
                                            <Text style={styles.freePlayBadgeText}>Free Play</Text>
                                        </View>
                                    </View>
                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        <TouchableOpacity
                                            onPress={() => handleToggleDayOff(staff.staffId, 'is_sleeping_out')}
                                            hitSlop={8}
                                        >
                                            <Text style={styles.removeLink}>Remove</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : activeTab === 'OFF' ? (
                        <View style={styles.staffList}>
                            <View style={styles.tableHeaders}>
                                <Text style={[styles.tableHeader, { flex: 1.5 }]}>Bunk</Text>
                                <Text style={[styles.tableHeader, { flex: 2 }]}>Name</Text>
                                <Text style={[styles.tableHeader, { flex: 1 }]}>Actions</Text>
                            </View>
                            {filteredStaff.map((staff) => (
                                <View key={staff.id} style={styles.staffRow}>
                                    <Text style={[styles.staffCell, { flex: 1.5 }]}>{staff.bunk}</Text>
                                    <Text style={[styles.staffCell, { flex: 2 }]}>{staff.name}</Text>
                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        <TouchableOpacity
                                            onPress={() => handleToggleDayOff(staff.staffId, 'is_day_off')}
                                            hitSlop={8}
                                        >
                                            <Text style={styles.removeLink}>Remove</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.staffList}>
                            <View style={styles.tableHeaders}>
                                <Text style={[styles.tableHeader, { flex: 1.5 }]}>Bunk</Text>
                                <Text style={[styles.tableHeader, { flex: 2 }]}>Name</Text>
                                <Text style={[styles.tableHeader, { flex: 1 }]}>Out</Text>
                                <Text style={[styles.tableHeader, { flex: 1 }]}>In</Text>
                                <Text style={[styles.tableHeader, { flex: 1 }]}>Actions</Text>
                            </View>
                            {filteredStaff.map((staff) => (
                                <View key={staff.id} style={styles.staffRow}>
                                    <Text style={[styles.staffCell, { flex: 1.5 }]}>{staff.bunk}</Text>
                                    <Text style={[styles.staffCell, { flex: 2 }]}>{staff.name}</Text>
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        {staff.isOut ? (
                                            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                                        ) : (
                                            <Ionicons name="close-circle-outline" size={20} color={theme.colors.textSecondary} />
                                        )}
                                    </View>
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        {staff.isIn ? (
                                            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                                        ) : (
                                            <Ionicons name="close-circle-outline" size={20} color={theme.colors.textSecondary} />
                                        )}
                                    </View>
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        <TouchableOpacity
                                            style={[styles.markOffPill, { backgroundColor: theme.colors.secondary }]}
                                            onPress={() => handleToggleDayOff(staff.staffId, 'is_day_off')}
                                        >
                                            <Text style={styles.markOffPillText}>Mark Off</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </StyledCard>
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="chatbubble-ellipses" size={24} color="white" />
            </TouchableOpacity>

            {/* Manage Bunks Modal */}
            <Modal
                visible={showManageBunksModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowManageBunksModal(false)}
            >
                <Pressable style={styles.modalOverlayCenter} onPress={() => setShowManageBunksModal(false)}>
                    <Pressable style={styles.bunkModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Bunk Management</Text>
                            <TouchableOpacity onPress={() => setShowManageBunksModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalSubtitle}>Configure bunks and assign staff members to each bunk</Text>
                            <View style={[styles.bunkTabs, isCompactModal && styles.bunkTabsCompact]}>
                                <TouchableOpacity style={[styles.bunkTab, bunkModalTab === 'manage' && styles.bunkTabActive]} onPress={() => setBunkModalTab('manage')}>
                                    <Text style={[styles.bunkTabText, bunkModalTab === 'manage' && styles.bunkTabTextActive]}>Manage Bunks</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.bunkTab, bunkModalTab === 'upload' && styles.bunkTabActive]} onPress={() => setBunkModalTab('upload')}>
                                    <Text style={[styles.bunkTabText, bunkModalTab === 'upload' && styles.bunkTabTextActive]}>CSV Upload</Text>
                                </TouchableOpacity>
                            </View>
                            {bunkModalTab === 'manage' ? (
                            <>
                            <View style={styles.addBunkCard}>
                                <Text style={styles.addBunkTitle}>Add New Bunk</Text>
                                {isCompactModal ? (
                                    <View style={styles.addBunkRowCompact}>
                                        <View style={styles.addBunkFieldCompact}>
                                            <Text style={styles.formLabel}>Bunk Number</Text>
                                            <TextInput
                                                style={styles.bankInput}
                                                keyboardType="number-pad"
                                                value={newBunkNumber}
                                                onChangeText={setNewBunkNumber}
                                            />
                                        </View>
                                        <View style={styles.addBunkFieldCompact}>
                                            <Text style={styles.formLabel}>Bunk Name (optional)</Text>
                                            <TextInput
                                                style={styles.bankInput}
                                                placeholder="e.g., Bunk A, Senior Boys 1"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={newBunkName}
                                                onChangeText={setNewBunkName}
                                                onSubmitEditing={handleAddBunk}
                                            />
                                        </View>
                                        <View style={styles.addBunkFieldCompact}>
                                            <Text style={styles.formLabel}>Division (optional)</Text>
                                            <TouchableOpacity style={[styles.bankInput, styles.selectInput]} onPress={() => setShowDivisionPickerModal(true)}>
                                                <Text style={styles.selectInputText}>
                                                    {newBunkDivision ? ((divisionsList.find((d: any) => d.id === newBunkDivision)?.name) || 'None') : 'None'}
                                                </Text>
                                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.addBunkActionCompact}>
                                            <TouchableOpacity
                                                style={[styles.addBankButtonWide, addBunkMutation.isPending && { opacity: 0.65 }]}
                                                onPress={handleAddBunk}
                                                disabled={addBunkMutation.isPending}
                                            >
                                                <Ionicons name="add" size={18} color="white" />
                                                <Text style={styles.addBankButtonText}>{addBunkMutation.isPending ? 'Adding...' : 'Add Bunk'}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.addBunkRow}>
                                        <View style={[styles.addBunkField, { maxWidth: 130 }]}>
                                            <Text style={styles.formLabel}>Bunk Number</Text>
                                            <TextInput
                                                style={styles.bankInput}
                                                keyboardType="number-pad"
                                                value={newBunkNumber}
                                                onChangeText={setNewBunkNumber}
                                            />
                                        </View>
                                        <View style={styles.addBunkField}>
                                            <Text style={styles.formLabel}>Bunk Name (optional)</Text>
                                            <TextInput
                                                style={styles.bankInput}
                                                placeholder="e.g., Bunk A, Senior Boys 1"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                value={newBunkName}
                                                onChangeText={setNewBunkName}
                                                onSubmitEditing={handleAddBunk}
                                            />
                                        </View>
                                        <View style={styles.addBunkField}>
                                            <Text style={styles.formLabel}>Division (optional)</Text>
                                            <TouchableOpacity style={[styles.bankInput, styles.selectInput]} onPress={() => setShowDivisionPickerModal(true)}>
                                                <Text style={styles.selectInputText}>
                                                    {newBunkDivision ? ((divisionsList.find((d: any) => d.id === newBunkDivision)?.name) || 'None') : 'None'}
                                                </Text>
                                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.addBunkAction}>
                                            <TouchableOpacity
                                                style={[styles.addBankButtonWide, addBunkMutation.isPending && { opacity: 0.65 }]}
                                                onPress={handleAddBunk}
                                                disabled={addBunkMutation.isPending}
                                            >
                                                <Ionicons name="add" size={18} color="white" />
                                                <Text style={styles.addBankButtonText}>{addBunkMutation.isPending ? 'Adding...' : 'Add Bunk'}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>

                            <ScrollView
                                style={[styles.bunksScrollList, isCompactModal && styles.bunksScrollListCompact]}
                                contentContainerStyle={styles.bunksScrollContent}
                                showsVerticalScrollIndicator
                            >
                                {!isCompactModal ? (
                                    <View style={styles.bunkTableHeader}>
                                        <Text style={[styles.tableHeader, { flex: 0.6 }]}>Bunk #</Text>
                                        <Text style={[styles.tableHeader, { flex: 1.1 }]}>Name</Text>
                                        <Text style={[styles.tableHeader, { flex: 1 }]}>Division</Text>
                                        <Text style={[styles.tableHeader, { flex: 1.9 }]}>Assigned Staff</Text>
                                        <Text style={[styles.tableHeader, { flex: 0.6, textAlign: 'center' }]}>Actions</Text>
                                    </View>
                                ) : null}
                                {bunksList.map((b) => {
                                    const assigned = bunkStaffList.filter((bs) => bs.bunk_id === b.id);
                                    const divisionName = b.division_id ? ((divisionsList.find((d: any) => d.id === b.division_id)?.name) || '-') : '-';
                                    return (
                                        <View key={b.id} style={[styles.bunkTableRow, isCompactModal && styles.bunkCard]}>
                                            {isCompactModal ? (
                                                <View style={styles.bunkCardTop}>
                                                    <Text style={styles.bunkCardTitle}>Bunk #{b.bunk_number}</Text>
                                                    <TouchableOpacity onPress={() => handleDeleteBunk(b.id, b.bunk_name || `Bunk ${b.bunk_number}`)}>
                                                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <>
                                                    <Text style={[styles.staffCell, { flex: 0.6 }]}>{b.bunk_number}</Text>
                                                    <Text style={[styles.staffCell, { flex: 1.1 }]}>{b.bunk_name || '-'}</Text>
                                                    <Text style={[styles.staffCell, { flex: 1 }]}>{divisionName}</Text>
                                                </>
                                            )}
                                            <View style={isCompactModal ? { marginTop: 8 } : { flex: 1.9 }}>
                                                {isCompactModal && (
                                                    <View style={styles.bunkMetaBlock}>
                                                        <View style={styles.bunkMetaLine}>
                                                            <Text style={styles.bunkMetaLabel}>Name: </Text>
                                                            <Text style={styles.bunkMetaValue}>{b.bunk_name || '-'}</Text>
                                                        </View>
                                                        <View style={styles.bunkMetaLine}>
                                                            <Text style={styles.bunkMetaLabel}>Division: </Text>
                                                            <Text style={styles.bunkMetaValue}>{divisionName}</Text>
                                                        </View>
                                                    </View>
                                                )}
                                                <View style={styles.assignedStaffRow}>
                                                    {assigned.map((bs) => (
                                                        <View key={bs.id} style={styles.staffChip}>
                                                            <Text style={styles.staffChipText} numberOfLines={1}>{bs.staff?.name || 'Unknown'}</Text>
                                                            <TouchableOpacity onPress={() => removeStaffFromBunkMutation.mutate(bs.id)}>
                                                                <Ionicons name="close" size={14} color={theme.colors.textSecondary} />
                                                            </TouchableOpacity>
                                                        </View>
                                                    ))}
                                                    <TouchableOpacity
                                                        style={styles.iconAddStaffBtn}
                                                        onPress={() => {
                                                            setSelectedBunkForStaff(b.id);
                                                            setShowStaffPickerForBunk(b.id);
                                                        }}
                                                    >
                                                        <Ionicons name="person-add-outline" size={16} color={theme.colors.text} />
                                                        {isCompactModal ? <Text style={styles.iconAddStaffText}>Add Staff</Text> : null}
                                                    </TouchableOpacity>
                                                </View>
                                                {selectedBunkForStaff === b.id && (
                                                    <View style={[styles.assignStaffRow, isCompactModal && styles.assignStaffRowCompact]}>
                                                        <TouchableOpacity
                                                            style={[styles.bankInput, styles.selectInput, { flex: 1 }]}
                                                            onPress={() => setShowStaffPickerForBunk(b.id)}
                                                        >
                                                            <Text style={styles.selectInputText}>
                                                                {selectedStaffToAdd
                                                                    ? ((staffList || []).find((s: any) => s.id === selectedStaffToAdd)?.name || 'Select staff...')
                                                                    : 'Select staff...'}
                                                            </Text>
                                                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={[styles.smallActionBtn, !selectedStaffToAdd && { opacity: 0.6 }]}
                                                            disabled={!selectedStaffToAdd}
                                                            onPress={() => assignStaffToBunkMutation.mutate({ bunkId: b.id, staffId: selectedStaffToAdd })}
                                                        >
                                                            <Text style={styles.smallActionBtnText}>Add</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={[styles.smallActionBtn, { backgroundColor: '#e5e7eb' }]}
                                                            onPress={() => {
                                                                setSelectedBunkForStaff(null);
                                                                setSelectedStaffToAdd('');
                                                                setShowStaffPickerForBunk(null);
                                                            }}
                                                        >
                                                            <Text style={[styles.smallActionBtnText, { color: theme.colors.text }]}>X</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </View>
                                            {!isCompactModal && (
                                                <View style={{ flex: 0.6, alignItems: 'center' }}>
                                                    <TouchableOpacity onPress={() => handleDeleteBunk(b.id, b.bunk_name || `Bunk ${b.bunk_number}`)}>
                                                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                                {bunksList.length === 0 ? (
                                    <View style={styles.bunkEmptyRow}>
                                        <Text style={styles.bunkEmptyText}>No bunks configured yet. Add your first bunk above.</Text>
                                    </View>
                                ) : null}
                            </ScrollView>
                            </>
                            ) : (
                                <View style={styles.csvUploadCard}>
                                    <Text style={styles.csvUploadTitle}>Upload Bunk Assignments</Text>
                                    <Text style={styles.csvUploadSubtitle}>Upload a CSV with columns: Person ID, Bunk Number, Is Primary (optional)</Text>
                                    <View style={styles.csvFormatBox}>
                                        <Text style={styles.csvFormatTitle}>CSV Example</Text>
                                        <Text style={styles.csvFormatText}>Person ID,Bunk Number,Is Primary</Text>
                                        <Text style={styles.csvFormatText}>12345,1,true</Text>
                                        <Text style={styles.csvFormatText}>67890,2,false</Text>
                                    </View>
                                    <View style={styles.csvRulesBox}>
                                        <Text style={styles.csvRulesTitle}>CSV Format Rules</Text>
                                        <Text style={styles.csvRulesItem}>- Person ID: CampMinder Person ID (required)</Text>
                                        <Text style={styles.csvRulesItem}>- Bunk Number: Must already exist</Text>
                                        <Text style={styles.csvRulesItem}>- Is Primary: Optional true/false, yes/no, 1/0</Text>
                                    </View>
                                    {lastCsvFileName ? <Text style={styles.csvFileName} numberOfLines={1}>Selected: {lastCsvFileName}</Text> : null}
                                    <TouchableOpacity
                                        style={[styles.addBankButtonWide, csvUploading && { opacity: 0.7 }]}
                                        disabled={csvUploading}
                                        onPress={handleUploadBunkCsv}
                                    >
                                        {csvUploading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="cloud-upload-outline" size={18} color="#fff" />}
                                        <Text style={styles.addBankButtonText}>{csvUploading ? 'Uploading...' : 'Upload CSV'}</Text>
                                    </TouchableOpacity>
                                    {csvUploadResult ? (
                                        <View style={styles.csvResultBox}>
                                            <Text style={styles.csvResultSuccess}>Success: {csvUploadResult.success}</Text>
                                            <Text style={styles.csvResultFailed}>Failed: {csvUploadResult.failed}</Text>
                                            {csvUploadResult.errors.slice(0, 8).map((err, idx) => (
                                                <Text key={`${err}-${idx}`} style={styles.csvErrorLine}>- {err}</Text>
                                            ))}
                                        </View>
                                    ) : null}
                                </View>
                            )}
                            <View style={styles.bunkFooter}>
                                <TouchableOpacity style={styles.doneButton} onPress={() => setShowManageBunksModal(false)}>
                                    <Text style={styles.doneButtonText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Division Picker for new bunk */}
            <Modal
                visible={showDivisionPickerModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDivisionPickerModal(false)}
            >
                <Pressable style={styles.modalOverlayCenter} onPress={() => setShowDivisionPickerModal(false)}>
                    <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
                        <ScrollView>
                            <TouchableOpacity
                                style={styles.pickerOption}
                                onPress={() => {
                                    setNewBunkDivision(null);
                                    setShowDivisionPickerModal(false);
                                }}
                            >
                                <Text style={styles.pickerOptionText}>None</Text>
                            </TouchableOpacity>
                            {divisionsList.map((d: any) => (
                                <TouchableOpacity
                                    key={d.id}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        setNewBunkDivision(d.id);
                                        setShowDivisionPickerModal(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{d.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Staff picker for bunk assignment */}
            <Modal
                visible={!!showStaffPickerForBunk}
                transparent
                animationType="fade"
                onRequestClose={() => setShowStaffPickerForBunk(null)}
            >
                <Pressable style={styles.modalOverlayCenter} onPress={() => setShowStaffPickerForBunk(null)}>
                    <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
                        <ScrollView>
                            {(staffList || [])
                                .filter((s: any) => !bunkStaffList.some((bs) => bs.staff_id === s.id))
                                .map((s: any) => (
                                    <TouchableOpacity
                                        key={s.id}
                                        style={styles.pickerOption}
                                        onPress={() => {
                                            setSelectedStaffToAdd(s.id);
                                            setShowStaffPickerForBunk(null);
                                        }}
                                    >
                                        <Text style={styles.pickerOptionText}>{s.name}</Text>
                                    </TouchableOpacity>
                                ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Late Sign-Out Override Modal */}
            <Modal
                visible={showLateOverrideModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowLateOverrideModal(false)}
            >
                <Pressable style={styles.modalOverlayCenter} onPress={() => setShowLateOverrideModal(false)}>
                    <Pressable style={styles.centerModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Late Sign-Out Override</Text>
                            <TouchableOpacity onPress={() => setShowLateOverrideModal(false)}>
                                <Ionicons name="close" size={22} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalSubtitle}>This staff member is not scheduled off today. Provide a reason to approve their late sign-out.</Text>
                            <Text style={[styles.formLabel, { marginTop: 12, marginBottom: 6 }]}>Override Reason *</Text>
                            <TextInput
                                style={[styles.bankInput, { height: 90, textAlignVertical: 'top', paddingTop: 10 }]}
                                placeholder="Enter the reason for approving this late sign-out..."
                                placeholderTextColor={theme.colors.textSecondary}
                                value={lateOverrideReason}
                                onChangeText={setLateOverrideReason}
                                multiline
                            />
                            <Text style={[styles.modalSubtitle, { marginTop: 10 }]}>This override will be recorded with your user ID</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                                <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: '#e5e7eb' }]} onPress={() => setShowLateOverrideModal(false)}>
                                    <Text style={[styles.smallActionBtnText, { color: theme.colors.text }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: '#d4a64a' }]} onPress={handleApproveLateOverride}>
                                    <Text style={styles.smallActionBtnText}>Approve Override</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* New Modal */}
            <Modal
                visible={showNewModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowNewModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowNewModal(false)}>
                    <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Day Off Entry</Text>
                            <TouchableOpacity onPress={() => setShowNewModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalContent}>
                            <Text style={styles.modalSubtitle}>Add a staff member as off duty for {dateString}</Text>
                            <View style={{ marginBottom: theme.spacing.md }}>
                                <Text style={styles.formLabel}>Staff</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                                    {staffList.map((s: any) => (
                                        <TouchableOpacity
                                            key={s.id}
                                            style={[
                                                { paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
                                                newEntryStaffId === s.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                                            ]}
                                            onPress={() => setNewEntryStaffId(newEntryStaffId === s.id ? null : s.id)}
                                        >
                                            <Text style={[styles.formLabel, newEntryStaffId === s.id && { color: theme.colors.surface }]}>{s.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg }}
                                onPress={() => setNewEntrySleepingOut(!newEntrySleepingOut)}
                            >
                                <Ionicons name={newEntrySleepingOut ? 'checkbox' : 'square-outline'} size={24} color={theme.colors.primary} />
                                <Text style={[styles.modalSubtitle, { marginLeft: 8 }]}>Sleeping out</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.newButton, { alignSelf: 'center' }]}
                                onPress={() => {
                                    if (!newEntryStaffId) {
                                        Alert.alert('Required', 'Please select a staff member.');
                                        return;
                                    }
                                    addDayOffMutation.mutate(
                                        { staffId: newEntryStaffId, isSleepingOut: newEntrySleepingOut },
                                        {
                                            onSuccess: () => {
                                                setShowNewModal(false);
                                                setNewEntryStaffId(null);
                                                setNewEntrySleepingOut(false);
                                            },
                                            onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to add entry'),
                                        }
                                    );
                                }}
                                disabled={addDayOffMutation.isPending || !newEntryStaffId}
                            >
                                {addDayOffMutation.isPending ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.newButtonText}>Add Entry</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={isDeleteConfirmVisible}
                transparent
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
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    titleSection: {
        marginBottom: theme.spacing.lg,
    },
    titleContainer: {
        marginBottom: theme.spacing.sm,
    },
    title: {
        ...theme.typography.h1,
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
        flexWrap: 'wrap',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    actionButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.md,
    },
    dateDisplay: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
    },
    dateText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    genderFilterBlock: {
        marginBottom: theme.spacing.md,
    },
    genderFilterLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    genderFilterRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    genderChip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    genderChipActive: {
        borderColor: theme.colors.secondary,
        backgroundColor: `${theme.colors.secondary}18`,
    },
    genderChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    genderChipTextActive: {
        color: theme.colors.secondary,
    },
    newButton: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    newButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.md,
        padding: theme.spacing.xs,
    },
    tab: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
        borderRadius: theme.borderRadius.sm,
    },
    tabActive: {
        backgroundColor: theme.colors.secondary,
    },
    tabActiveFreePlay: {
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: '#16a34a',
    },
    tabText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    tabTextActive: {
        color: 'white',
    },
    tabTextActiveFreePlay: {
        color: '#15803d',
        fontWeight: '700',
    },
    freePlayBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#e5e7eb',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    freePlayBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
    removeLink: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.secondary,
    },
    markOffPill: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    markOffPillText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    staffCard: {
        marginBottom: theme.spacing.md,
    },
    cardHeader: {
        marginBottom: theme.spacing.md,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    cardAddEntryBtn: {
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    cardAddEntryText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.secondary,
    },
    cardTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: theme.spacing.xs,
    },
    cardSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
        marginBottom: theme.spacing.md,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        marginLeft: theme.spacing.xs,
    },
    tableHeaders: {
        flexDirection: 'row',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        marginBottom: theme.spacing.sm,
    },
    tableHeader: {
        ...theme.typography.body,
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
        minHeight: 200,
    },
    emptyText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    staffList: {
        gap: theme.spacing.xs,
    },
    staffRow: {
        flexDirection: 'row',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        alignItems: 'center',
    },
    staffCell: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '80%',
        paddingBottom: theme.spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
    },
    modalContent: {
        padding: 14,
    },
    modalSubtitle: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    formLabel: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    addBankSection: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    bankInput: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 40,
        fontSize: 14,
        color: theme.colors.text,
    },
    addBankButton: {
        backgroundColor: theme.colors.secondary,
        width: 44,
        height: 44,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    banksList: {
        gap: theme.spacing.sm,
    },
    bankItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: '#f9fafb',
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    bankName: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    modalOverlayCenter: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    bunkModal: {
        width: '100%',
        maxWidth: 960,
        maxHeight: '92%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    bunkTabs: {
        flexDirection: 'row',
        backgroundColor: '#eef2f7',
        borderRadius: theme.borderRadius.md,
        padding: 4,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    bunkTabsCompact: {
        marginTop: 8,
        marginBottom: 10,
    },
    bunkTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: theme.borderRadius.sm,
    },
    bunkTabActive: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    bunkTabText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    bunkTabTextActive: {
        color: theme.colors.text,
    },
    addBunkCard: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 12,
        marginBottom: 12,
        backgroundColor: '#fbfcfe',
    },
    addBunkTitle: {
        ...theme.typography.body,
        fontSize: 30,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 12,
    },
    addBunkRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        alignItems: 'flex-end',
    },
    addBunkRowCompact: {
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 10,
    },
    addBunkField: {
        flex: 1,
        marginBottom: 2,
    },
    addBunkAction: {
        width: 140,
    },
    addBunkActionCompact: {
        width: '100%',
    },
    selectInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectInputText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    addBankButtonWide: {
        height: 40,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    addBankButtonText: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    bunkTableHeader: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    bunksScrollList: {
        maxHeight: 320,
        minHeight: 180,
    },
    bunksScrollListCompact: {
        maxHeight: 300,
        minHeight: 140,
    },
    bunksScrollContent: {
        paddingBottom: 16,
    },
    bunkTableRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        gap: 6,
    },
    bunkCard: {
        flexDirection: 'column',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: '#fafbfd',
    },
    bunkCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bunkCardTitle: {
        ...theme.typography.body,
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.text,
    },
    bunkMetaBlock: {
        marginBottom: 8,
        gap: 2,
    },
    bunkMetaLine: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    bunkMetaLabel: {
        ...theme.typography.body,
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    bunkMetaValue: {
        ...theme.typography.body,
        fontSize: 12,
        color: theme.colors.text,
    },
    assignedStaffRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
        marginBottom: 2,
    },
    staffChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#eef2f7',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 10,
        maxWidth: '100%',
    },
    staffChipText: {
        ...theme.typography.body,
        fontSize: 12,
        color: theme.colors.text,
        maxWidth: 120,
    },
    iconAddStaffBtn: {
        minWidth: 28,
        minHeight: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 4,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: '#fff',
    },
    iconAddStaffText: {
        ...theme.typography.body,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
    assignStaffRow: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    assignStaffRowCompact: {
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 8,
    },
    smallActionBtn: {
        minWidth: 46,
        height: 34,
        borderRadius: 10,
        backgroundColor: theme.colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    smallActionBtnText: {
        ...theme.typography.body,
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
    },
    bunkFooter: {
        alignItems: 'flex-end',
        paddingTop: 12,
        paddingBottom: 4,
    },
    doneButton: {
        minWidth: 84,
        height: 42,
        borderRadius: 12,
        backgroundColor: theme.colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    doneButtonText: {
        ...theme.typography.body,
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    csvUploadCard: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 12,
        marginBottom: 12,
        backgroundColor: '#fbfcfe',
        gap: 10,
    },
    csvUploadTitle: {
        ...theme.typography.body,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    csvUploadSubtitle: {
        ...theme.typography.body,
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    csvFormatBox: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        padding: 10,
        gap: 2,
    },
    csvFormatTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 2,
    },
    csvFormatText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    csvRulesBox: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        backgroundColor: '#fff',
        padding: 10,
        gap: 2,
    },
    csvRulesTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 2,
    },
    csvRulesItem: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    csvFileName: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    csvResultBox: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        padding: 10,
        gap: 4,
        backgroundColor: '#fff',
    },
    csvResultSuccess: {
        fontSize: 13,
        fontWeight: '700',
        color: '#166534',
    },
    csvResultFailed: {
        fontSize: 13,
        fontWeight: '700',
        color: '#b91c1c',
    },
    csvErrorLine: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    bunkEmptyRow: {
        minHeight: 120,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingHorizontal: 12,
    },
    bunkEmptyText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    pickerSheet: {
        width: '100%',
        maxWidth: 420,
        maxHeight: '70%',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    pickerOption: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#edf0f4',
    },
    pickerOptionText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
    },
    deleteModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    deleteModalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    deleteModalTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 12,
    },
    deleteModalMessage: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: 24,
    },
    deleteModalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    deleteModalCancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    deleteModalCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    deleteModalConfirmBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.secondary,
        minWidth: 88,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteModalConfirmText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
});

